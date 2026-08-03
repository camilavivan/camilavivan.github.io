---
title: 优化Kubernetes VPA的反应
date: 2023-07-28 10:40:33
type: categories
tags: 
    - kubernetes
keywords: 
    - kubernetes
categories: 
    - kubernetes
---

这里是[**日文版**](*https://www.miraxia.com/engineers-blog/optimizing-kubernetes-vertical-pod-autoscaler-responsiveness/*)。

几周前，我在苦战优化[**VPA**](*https://github.com/kubernetes/autoscaler/tree/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler*)（Vertical Pod Autoscaler）的性能。我们在公司计划做一个演示，应该有 5 到 10 分钟长，所以默认的 VPA 行为对我们来说太慢了。最终，不得不修改它的源代码，以便在几分钟内动态地改变 pod 的资源请求。

在本文中，我描述了 VPA 的工作原理，以及优化其性能的方法，包括代码修改。

## VPA 是什么？

VPA，Vertical Pod Autoscaler（垂直 Pod 自动缩放器），使我们能够动态定义[**资源请求**](*https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/*)。它观察 pod 的 cpu 和内存利用率，并在运行时更新这些资源请求。

## VPA 是如何工作？

VPA 由以下三部分组成。

- [**admission-controller**](https://github.com/kubernetes/autoscaler/tree/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/admission-controller)（准入控制器）
- [**recommender**](*https://github.com/kubernetes/autoscaler/tree/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/recommender*)（推荐器）
- [**updater**](*https://github.com/kubernetes/autoscaler/tree/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/updater*)（更新器）

准入控制器注册[**许可网络挂钩**](*https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/*)以修改 pod 的创建请求。

推荐器检查目标 pod 的资源使用情况，并估计推荐的资源请求，然后更新与目标 pod 相关联的 VPA 对象。这个过程定期执行。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307201404070.png)

更新器检查记录在 VPA 对象中的推荐资源请求，如果目标 pod 的当前资源请求与推荐不匹配，它将删除该 pod。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307201404147.png)

当部署（deployment）或副本集（replica set）的 pod 被更新器删除时，副本集控制器将检测到 pod 的数量不足，并将尝试创建新的 pod。pod 创建请求被发送到 api-server，api-server 调用由准入控制器注册的 webhook。准入控制器根据推荐的资源请求值修改 pod 创建请求。最后，使用适当的资源请求创建新的 pod。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307201405183.png)

## 更改定期任务频率

当发出 pod 创建请求时，准入控制器同步工作，因此在本文中我们可以忽略准入控制器。这绝不会影响 VPA 的反应。

因为推荐器和更新器周期性地工作，所以它们的频率很重要。这些可以通过[**--recommender-interval**](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/recommender/main.go#L39)和[**--updater-interval**](*https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/updater/main.go#L43*)选项来修改。

你可以通过修改 recommender-deployment.yaml 和 updater-deployment.yaml 来更改这些选项，如下所示：

```yaml
Patch license: Apache-2.0 (same as original autoscaler)
https://github.com/kubernetes/autoscaler

diff --git a/vertical-pod-autoscaler/deploy/recommender-deployment.yaml b/vertical-pod-autoscaler/deploy/recommender-deployment.yaml
index f45d87127..739c35da6 100644
--- a/vertical-pod-autoscaler/deploy/recommender-deployment.yaml
+++ b/vertical-pod-autoscaler/deploy/recommender-deployment.yaml
@@ -38,3 +38,9 @@ spec:
         ports:
         - name: prometheus
           containerPort: 8942
+        command:
+        - /recommender
+        - --v=4
+        - --stderrthreshold=info
+        - --prometheus-address=http://prometheus.monitoring.svc
+        - --recommender-interval=10s
diff --git a/vertical-pod-autoscaler/deploy/updater-deployment.yaml b/vertical-pod-autoscaler/deploy/updater-deployment.yaml
index a97478a8e..b367f1a04 100644
--- a/vertical-pod-autoscaler/deploy/updater-deployment.yaml
+++ b/vertical-pod-autoscaler/deploy/updater-deployment.yaml
@@ -43,3 +43,7 @@ spec:
           ports:
             - name: prometheus
               containerPort: 8943
+          args:
+          - --v=4
+          - --stderrthreshold=info
+          - --updater-interval=10s
```

其他选项-v、--stderrthreshold 和--recommender-interval 是在[**recommender/Dockerfile**](*https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/recommender/Dockerfile#L22*)和[**updater/Dockerfile**](*https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/updater/Dockerfile#L23*)中定义的默认选项。

警告：--recommender-interval=10s 和--updater-interval=10s 对于正常用例来说过于频繁。不要将它复制并粘贴到你的真实集群中！

## 推荐算法

尽管更新器的反应由--updater-interval 来控制，但是对于推荐器，我们需要更多的修改。为了提高推荐器的响应能力，我们必须了解推荐算法。

推荐器定义 pod 的资源请求的下限和上限，而更新器检查 pod 的当前资源请求是否在推荐的范围内。所以问题是，如果 pod 的资源利用率变化很快，推荐器被设计成使这些限制更宽。这种设计对于真实世界的用例来说是合理的，但是对于我们的演示，我希望它们反应更快。

推荐器记录目标 pod 的资源使用历史，如果其波动性太高，则使推荐范围更宽。你可以使用[**--cpu-histogram-decay-half-life**](*https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/recommender/main.go#L68*)选项来降低波动性的影响。

```yaml
Patch license: Apache-2.0 (same as original autoscaler)
https://github.com/kubernetes/autoscaler

diff --git a/vertical-pod-autoscaler/deploy/recommender-deployment.yaml b/vertical-pod-autoscaler/deploy/recommender-deployment.yaml
index 739c35da6..09113a02e 100644
--- a/vertical-pod-autoscaler/deploy/recommender-deployment.yaml
+++ b/vertical-pod-autoscaler/deploy/recommender-deployment.yaml
@@ -44,3 +44,4 @@ spec:
         - --stderrthreshold=info
         - --prometheus-address=http://prometheus.monitoring.svc
         - --recommender-interval=10s
+        - --cpu-histogram-decay-half-life=10
```

警告：--cpu-histogram-decay-half-life=10s 对于正常使用情况来说太快了。不要将它复制并粘贴到你的真实集群中！

使推荐范围更广的另一个因素是资源利用历史的长度。

根据[**CreatePodResourceRecommender**](*https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/recommender/logic/recommender.go#L101-L149*)实现，它结合了以下[**估计器**](*https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/recommender/logic/estimator.go*)（estimator）。

- [**percentileEstimator**](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/recommender/logic/estimator.go#L97-L104)：返回实际的资源利用率
- [**marginEstimator**](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/recommender/logic/estimator.go#L138-L146)：为建议增加[**安全余量**](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/recommender/logic/recommender.go#L26)
- [**confidenceMultiplier**](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/recommender/logic/estimator.go#L127-L136)：使关于资源利用历史长度的推荐范围更宽

confidenceMultiplier 通过以下公式使推荐范围更广。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307201409011.png)

如果我们只有 3 分钟长的历史，并且 MeasuredResourceUtilization = 0.6 cpu，confidenceMultiplier 计算如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307201409252.png)

在这种情况下，当 pod 的 resources.requests.cpu 在范围[0.27 cpu，289 cpu]内时，什么都不会发生。换句话说，更新程序确定“啊，pod 的请求资源在建议的范围内，所以我目前没有什么要做的”。

由于这个建议范围按照一天的顺序变化，只要我使用默认实现，在我们 5 到 10 分钟长的演示中，我不会看到 VPA 的任何反应。

注意，本节的描述有点不准确，因为我没有解释[**资源利用率直方图**](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/recommender/model/aggregate_container_state.go)，但我认为结论几乎是正确的。

## 修改推荐算法

不幸的是，[**决定推荐范围的参数是硬编码的**](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-0.11.0/vertical-pod-autoscaler/pkg/recommender/logic/recommender.go#L118-L143)。所以我决定修改代码。

我们演示的要求是…

- 推荐限值不应受历史长度的影响
- 建议应反映测量的资源利用率
- 我们应该能够在几分钟内将实际的资源使用量控制在建议的范围之外

我创建了反映这些需求的新设计，如下所示。手动操作越简单越好。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307201410369.png)

这种新设计可以如下实现。

```yaml
Patch license: Apache-2.0 (same as original autoscaler)
https://github.com/kubernetes/autoscaler

diff --git a/vertical-pod-autoscaler/pkg/recommender/logic/recommender.go b/vertical-pod-autoscaler/pkg/recommender/logic/recommender.go
index bc2320cca..cdce617fd 100644
--- a/vertical-pod-autoscaler/pkg/recommender/logic/recommender.go
+++ b/vertical-pod-autoscaler/pkg/recommender/logic/recommender.go
@@ -111,9 +111,9 @@ func CreatePodResourceRecommender() PodResourceRecommender {
        lowerBoundEstimator := NewPercentileEstimator(lowerBoundCPUPercentile, lowerBoundMemoryPeaksPercentile)
        upperBoundEstimator := NewPercentileEstimator(upperBoundCPUPercentile, upperBoundMemoryPeaksPercentile)

-       targetEstimator = WithMargin(*safetyMarginFraction, targetEstimator)
-       lowerBoundEstimator = WithMargin(*safetyMarginFraction, lowerBoundEstimator)
-       upperBoundEstimator = WithMargin(*safetyMarginFraction, upperBoundEstimator)
+       targetEstimator = WithMargin(0, targetEstimator)
+       lowerBoundEstimator = WithMargin(-0.3, lowerBoundEstimator)
+       upperBoundEstimator = WithMargin(0.3, upperBoundEstimator)

        // Apply confidence multiplier to the upper bound estimator. This means
        // that the updater will be less eager to evict pods with short history
@@ -126,7 +126,7 @@ func CreatePodResourceRecommender() PodResourceRecommender {
        // 12h history    : *3    (force pod eviction if the request is > 3 * upper bound)
        // 24h history    : *2
        // 1 week history : *1.14
-       upperBoundEstimator = WithConfidenceMultiplier(1.0, 1.0, upperBoundEstimator)
+       // upperBoundEstimator = WithConfidenceMultiplier(1.0, 1.0, upperBoundEstimator)

        // Apply confidence multiplier to the lower bound estimator. This means
        // that the updater will be less eager to evict pods with short history
@@ -140,7 +140,7 @@ func CreatePodResourceRecommender() PodResourceRecommender {
        // 5m history   : *0.6 (force pod eviction if the request is < 0.6 * lower bound)
        // 30m history  : *0.9
        // 60m history  : *0.95
-       lowerBoundEstimator = WithConfidenceMultiplier(0.001, -2.0, lowerBoundEstimator)
+       // lowerBoundEstimator = WithConfidenceMultiplier(0.001, -2.0, lowerBoundEstimator)

        return &podResourceRecommender{
                targetEstimator,
```

## 总结

- VPA 被设计为不会过于频繁地修改资源请求
- 不幸的是，决定修改频率的参数是硬编码的
- 为了在一分钟内对资源利用率的变化做出反应，你必须修改源代码
