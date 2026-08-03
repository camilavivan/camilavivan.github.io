---
title: K8s 增强版工作负载 OpenKruise 之 CloneSet
date: 2023-07-12 14:46:51
type: categories
tags: 
    - kubernetes
    - OpenKruise
keywords: 
    - kubernetes 
    - OpenKruise
categories: 
    - kubernetes
    - OpenKruise
---

OpenKruise(`https://openkruise.io`) 是一个基于 Kubernetes 的**扩展套件**，主要聚焦于云原生应用的自动化，比如部署、发布、运维以及可用性防护。OpenKruise 提供的绝大部分能力都是基于 CRD 扩展来定义的，它们不存在于任何外部依赖，可以运行在任意纯净的 Kubernetes 集群中。Kubernetes 自身提供的一些应用部署管理功能，对于大规模应用与集群的场景这些功能是远远不够的，OpenKruise 弥补了 Kubernetes 在应用部署、升级、防护、运维等领域的不足。

OpenKruise 提供了以下的一些核心能力：

- **增强版本的 Workloads**：OpenKruise 包含了一系列增强版本的工作负载，比如 CloneSet、Advanced StatefulSet、Advanced DaemonSet、BroadcastJob 等。它们不仅支持类似于 Kubernetes 原生 Workloads 的基础功能，还提供了如原地升级、可配置的扩缩容/发布策略、并发操作等。其中，原地升级是一种升级应用容器镜像甚至环境变量的全新方式，它只会用新的镜像重建 Pod 中的特定容器，整个 Pod 以及其中的其他容器都不会被影响。因此它带来了更快的发布速度，以及避免了对其他 Scheduler、CNI、CSI 等组件的负面影响。
- **应用的旁路管理**：OpenKruise 提供了多种通过旁路管理应用 sidecar 容器、多区域部署的方式，**旁路**意味着你可以不需要修改应用的 Workloads 来实现它们。比如，SidecarSet 能帮助你在所有匹配的 Pod 创建的时候都注入特定的 sidecar 容器，甚至可以原地升级已经注入的 sidecar 容器镜像、并且对 Pod 中其他容器不造成影响。而 WorkloadSpread 可以约束无状态 Workload 扩容出来 Pod 的区域分布，赋予单一 workload 的多区域和弹性部署的能力。
- **高可用性防护**：OpenKruise 可以保护你的 Kubernetes 资源不受级联删除机制的干扰，包括 CRD、Namespace、以及几乎全部的 Workloads 类型资源。相比于 Kubernetes 原生的 PDB 只提供针对 Pod Eviction 的防护，PodUnavailableBudget 能够防护 Pod Deletion、Eviction、Update 等许多种 voluntary disruption 场景。
- **高级的应用运维能力**：OpenKruise 也提供了很多高级的运维能力来帮助你更好地管理应用，比如可以通过 ImagePullJob 来在任意范围的节点上预先拉取某些镜像，或者指定某个 Pod 中的一个或多个容器被原地重启。

## 架构

下图是 OpenKruise 的整体架构：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202304131434879.jpeg)

架构

所有 OpenKruise 的功能都是通过 Kubernetes CRD 来提供的。其中 `Kruise-manager` 是一个运行控制器和 webhook 的中心组件，它通过 Deployment 部署在 `kruise-system` 命名空间中。 从逻辑上来看，如 `cloneset-controller`、`sidecarset-controller` 这些的控制器都是独立运行的，不过为了减少复杂度，它们都被打包在一个独立的二进制文件、并运行在 `kruise-controller-manager-xxx` 这个 Pod 中。除了控制器之外，`kruise-controller-manager-xxx` 中还包含了针对 Kruise CRD 以及 Pod 资源的 admission webhook。`Kruise-manager` 会创建一些 webhook configurations 来配置哪些资源需要感知处理、以及提供一个 Service 来给 kube-apiserver 调用。

从 v0.8.0 版本开始提供了一个新的 `Kruise-daemon` 组件，它通过 DaemonSet 部署到每个节点上，提供镜像预热、容器重启等功能。

## 安装

这里我们同样还是使用 Helm 方式来进行安装，需要注意从 v1.0.0 开始，OpenKruise 要求在 Kubernetes >= 1.16 以上版本的集群中安装和使用。

首先添加 charts 仓库：

```bash
➜ helm repo add openkruise https://openkruise.github.io/charts/
➜ helm repo update
```

然后执行下面的命令安装最新版本的应用：

```bash
➜ helm upgrade --install kruise openkruise/kruise --version 1.3.0
```

该 charts 在模板中默认定义了命名空间为 `kruise-system`，所以在安装的时候可以不用指定，如果你的环境访问 DockerHub 官方镜像较慢，则可以使用下面的命令将镜像替换成阿里云的镜像：

```bash
➜ helm upgrade --install kruise openkruise/kruise --set manager.image.repository=openkruise-registry.cn-shanghai.cr.aliyuncs.com/openkruise/kruise-manager --version 1.3.0
```

应用部署完成后会在 `kruise-system` 命名空间下面运行 2 个 `kruise-manager` 的 Pod，同样它们之间采用 leader-election 的方式选主，同一时间只有一个提供服务，达到高可用的目的，此外还会以 DaemonSet 的形式启动 `kruise-daemon` 组件：

```bash
➜ kubectl get pods -n kruise-system
NAME                                         READY   STATUS    RESTARTS   AGE
kruise-controller-manager-7d78fc5c97-d6mbb   1/1     Running   0          52s
kruise-controller-manager-7d78fc5c97-wccbn   1/1     Running   0          52s
kruise-daemon-9f94k                          1/1     Running   0          52s
kruise-daemon-bqj69                          1/1     Running   0          52s
kruise-daemon-h95pf                          1/1     Running   0          52s
```

如果不想使用默认的参数进行安装，也可以自定义配置，可配置的 values 值可以参考 charts 文档 <https://github.com/openkruise/charts> 进行定制。

## CloneSet

`CloneSet` 控制器是 OpenKruise 提供的对原生 Deployment 的增强控制器，在使用方式上和 Deployment 几乎一致，如下所示是我们声明的一个 CloneSet 资源对象：

```yaml
# cloneset-demo.yaml
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  name: cs-demo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cs
  template:
    metadata:
      labels:
        app: cs
    spec:
      containers:
        - name: nginx
          image: nginx:alpine
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
```

直接创建上面的这个 CloneSet 对象：

```bash
➜ kubectl apply -f cloneset-demo.yaml
➜ kubectl get cloneset cs-demo
NAME      DESIRED   UPDATED   UPDATED_READY   READY   TOTAL   AGE
cs-demo   3         3         0               0       3       8s
➜ kubectl describe cloneset cs-demo
Name:         cs-demo
Namespace:    default
Labels:       <none>
Annotations:  <none>
API Version:  apps.kruise.io/v1alpha1
Kind:         CloneSet
# ......
Events:
  Type    Reason            Age   From                 Message
  ----    ------            ----  ----                 -------
  Normal  SuccessfulCreate  21s   cloneset-controller  succeed to create pod cs-demo-jfx5s
  Normal  SuccessfulCreate  21s   cloneset-controller  succeed to create pod cs-demo-kg9p2
  Normal  SuccessfulCreate  21s   cloneset-controller  succeed to create pod cs-demo-n72fr
```

该对象创建完成后我们可以通过 `kubectl describe` 命令查看对应的 Events 信息，可以发现 `cloneset-controller` 是直接创建的 Pod，这个和原生的 Deployment 就有一些区别了，Deployment 是通过 ReplicaSet 去创建的 Pod，所以从这里也可以看出来 CloneSet 是直接管理 Pod 的，3 个副本的 Pod 此时也创建成功了：

```bash
➜ kubectl get pods -l app=cs
NAME            READY   STATUS    RESTARTS   AGE
cs-demo-jfx5s   1/1     Running   0          58s
cs-demo-kg9p2   1/1     Running   0          58s
cs-demo-n72fr   1/1     Running   0          58s
```

CloneSet 虽然在使用上和 Deployment 比较类似，但还是有非常多比 Deployment 更高级的功能，下面我们来详细介绍下。

### 扩缩容

#### **流式扩容**

CloneSet 在扩容的时候可以通过 `ScaleStrategy.MaxUnavailable` 来限制扩容的步长，这样可以对服务应用的影响最小，可以设置一个绝对值或百分比，如果不设置该值，则表示不限制。

比如我们在上面的资源清单中添加如下所示数据：

```yaml
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  name: cs-demo
spec:
  minReadySeconds: 60
  scaleStrategy:
    maxUnavailable: 1
  replicas: 5
  ......
```

上面我们配置 `scaleStrategy.maxUnavailable` 为 1，结合 `minReadySeconds` 参数，表示在扩容时，只有当上一个扩容出的 Pod 已经 Ready 超过一分钟后，CloneSet 才会执行创建下一个 Pod，比如这里我们扩容成 5 个副本，更新上面对象后查看 CloneSet 的事件：

```bash
➜ kubectl describe cloneset cs-demo
......
Events:
  Type     Reason            Age                From                 Message
  ----     ------            ----               ----                 -------
  Normal   SuccessfulCreate  4m25s              cloneset-controller  succeed to create pod cs-demo-jfx5s
  Normal   SuccessfulCreate  4m25s              cloneset-controller  succeed to create pod cs-demo-kg9p2
  Normal   SuccessfulCreate  4m25s              cloneset-controller  succeed to create pod cs-demo-n72fr
  Warning  ScaleUpLimited    66s                cloneset-controller  scaleUp is limited because of scaleStrategy.maxUnavailable, limit: 1
  Normal   SuccessfulCreate  66s                cloneset-controller  succeed to create pod cs-demo-x8ndf
  Warning  ScaleUpLimited    64s (x6 over 66s)  cloneset-controller  scaleUp is limited because of scaleStrategy.maxUnavailable, limit: 0
  Normal   SuccessfulCreate  5s                 cloneset-controller  succeed to create pod cs-demo-2sfzz
```

可以看到第一时间扩容了一个 Pod，由于我们配置了 `minReadySeconds: 60`，也就是新扩容的 Pod 创建成功超过 1 分钟后才会扩容另外一个 Pod，上面的 Events 信息也能表现出来，查看 Pod 的 `AGE` 也能看出来扩容的 2 个 Pod 之间间隔了 1 分钟左右：

```bash
➜ kubectl get pods -l app=cs
NAME            READY   STATUS    RESTARTS   AGE
cs-demo-2sfzz   1/1     Running   0          22s
cs-demo-jfx5s   1/1     Running   0          4m42s
cs-demo-kg9p2   1/1     Running   0          4m42s
cs-demo-n72fr   1/1     Running   0          4m42s
cs-demo-x8ndf   1/1     Running   0          83s
```

当 CloneSet 被缩容时，我们还可以指定一些 Pod 来删除，这对于 StatefulSet 或者 Deployment 来说是无法实现的， StatefulSet 是根据序号来删除 Pod，而 Deployment/ReplicaSet 目前只能根据控制器里定义的排序来删除。而 CloneSet 允许用户在缩小 replicas 数量的同时，指定想要删除的 Pod 名字，如下所示：

```yaml
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  name: cs-demo
spec:
  minReadySeconds: 60
  scaleStrategy:
    maxUnavailable: 1
    podsToDelete:
    - cs-demo-n72fr
  replicas: 4
  ......
```

更新上面的资源对象后，会将应用缩到 4 个 Pod，如果在 `podsToDelete` 列表中指定了 Pod 名字，则控制器会优先删除这些 Pod，对于已经被删除的 Pod，控制器会自动从 `podsToDelete` 列表中清理掉。比如我们更新上面的资源对象后 `cs-demo-n72fr` 这个 Pod 会被移除，其余会保留下来：

```bash
➜ kubectl get pods -l app=cs
NAME            READY   STATUS    RESTARTS   AGE
cs-demo-2sfzz   1/1     Running   0          61s
cs-demo-jfx5s   1/1     Running   0          5m21s
cs-demo-kg9p2   1/1     Running   0          5m21s
cs-demo-x8ndf   1/1     Running   0          2m2s
```

如果你只把 Pod 名字加到 `podsToDelete`，但没有修改 replicas 数量，那么控制器会先把指定的 Pod 删掉，然后再扩一个新的 Pod，另一种直接删除 Pod 的方式是在要删除的 Pod 上打 `apps.kruise.io/specified-delete: true` 标签。

相比于手动直接删除 Pod，使用 `podsToDelete` 或 `apps.kruise.io/specified-delete: true` 方式会有 CloneSet 的 `maxUnavailable/maxSurge` 来保护删除， 并且会触发 `PreparingDelete` 生命周期的钩子。

#### **PVC 模板**

一个比较奇特的特性，CloneSet 允许用户配置 PVC 模板 `volumeClaimTemplates`，用来给每个 Pod 生成独享的 PVC，这是 Deployment 所不支持的，因为往往有状态的应用才需要单独设置 PVC，在使用 CloneSet 的 PVC 模板的时候需要注意下面的这些事项：

- 每个被自动创建的 PVC 会有一个 `ownerReference` 指向 CloneSet，因此 CloneSet 被删除时，它创建的所有 Pod 和 PVC 都会被删除。
- 每个被 CloneSet 创建的 Pod 和 PVC，都会带一个 `apps.kruise.io/cloneset-instance-id: xxx` 的 label。关联的 Pod 和 PVC 会有相同的 `instance-id`，且它们的名字后缀都是这个 `instance-id`。
- 如果一个 Pod 被 CloneSet controller 缩容删除时，这个 Pod 关联的 PVC 都会被一起删掉。
- 如果一个 Pod 被外部直接调用删除或驱逐时，这个 Pod 关联的 PVC 还都存在；并且 CloneSet controller 发现数量不足重新扩容时，新扩出来的 Pod 会复用原 Pod 的 `instance-id` 并关联原来的 PVC。
- 当 Pod 被重建升级时，关联的 PVC 会跟随 Pod 一起被删除、新建。
- 当 Pod 被原地升级时，关联的 PVC 会持续使用。

以下是一个带有 PVC 模板的例子：

```yaml
# cloneset-pvc.yaml
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  labels:
    app: sample
  name: sample-data
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sample
  template:
    metadata:
      labels:
        app: sample
    spec:
      containers:
        - name: nginx
          image: nginx:alpine
          volumeMounts:
            - name: data-vol
              mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
    - metadata:
        name: data-vol
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi
```

比如应用上面的资源对象后会自动创建 3 个 Pod 和 3 个 PVC，每个 Pod 都会挂载一个 PVC：

```bash
➜ kubectl get pods -l app=sample
NAME                READY   STATUS    RESTARTS   AGE
sample-data-t4vq6   0/1     Pending   0          2m13s
sample-data-vcjnl   0/1     Pending   0          2m13s
sample-data-znwjd   0/1     Pending   0          2m13s
➜ kubectl get pvc -l app=sample
NAME                         STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
data-vol-sample-data-t4vq6   Pending                                                     2m46s
data-vol-sample-data-vcjnl   Pending                                                     2m46s
data-vol-sample-data-znwjd   Pending                                                     2m46s
```

### 升级

CloneSet 一共提供了 3 种升级方式：

- `ReCreate`: 删除旧 Pod 和它的 PVC，然后用新版本重新创建出来，这是默认的方式
- `InPlaceIfPossible`: 会优先尝试原地升级 Pod，如果不行再采用重建升级
- `InPlaceOnly`: 只允许采用原地升级，因此，用户只能修改上一条中的限制字段，如果尝试修改其他字段会被拒绝

这里有一个重要概念：**原地升级**，这也是 OpenKruise 提供的核心功能之一，当我们要升级一个 Pod 中镜像的时候，下图展示了**重建升级**和**原地升级**的区别：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202304131438910.png)原地升级

**重建升级**时我们需要删除旧 Pod、创建新 Pod：

- Pod 名字和 uid 发生变化，因为它们是完全不同的两个 Pod 对象（比如 Deployment 升级）
- Pod 名字可能不变、但 uid 变化，因为它们是不同的 Pod 对象，只是复用了同一个名字（比如 StatefulSet 升级）
- Pod 所在 Node 名字可能发生变化，因为新 Pod 很可能不会调度到之前所在的 Node 节点
- Pod IP 发生变化，因为新 Pod 很大可能性是不会被分配到之前的 IP 地址

但是对于**原地升级**，我们仍然复用同一个 Pod 对象，只是修改它里面的字段：

- 可以避免如调度、分配 IP、挂载 volume 等额外的操作和代价
- 更快的镜像拉取，因为会复用已有旧镜像的大部分 layer 层，只需要拉取新镜像变化的一些 layer
- 当一个容器在原地升级时，Pod 中的其他容器不会受到影响，仍然维持运行

所以显然如果能用**原地升级**方式来升级我们的工作负载，对在线应用的影响是最小的。上面我们提到 CloneSet 升级类型支持 `InPlaceIfPossible`，这意味着 Kruise 会尽量对 Pod 采取原地升级，如果不能则退化到重建升级，以下的改动会被允许执行原地升级：

- 更新 workload 中的 `spec.template.metadata.*`，比如 labels/annotations，Kruise 只会将 metadata 中的改动更新到存量 Pod 上。
- 更新 workload 中的 `spec.template.spec.containers[x].image`，Kruise 会原地升级 Pod 中这些容器的镜像，而不会重建整个 Pod。
- 从 Kruise v1.0 版本开始，更新 `spec.template.metadata.labels/annotations` 并且 container 中有配置 env from 这些改动的 `labels/anntations`，Kruise 会原地升级这些容器来生效新的 env 值。

否则，其他字段的改动，比如 `spec.template.spec.containers[x].env` 或 `spec.template.spec.containers[x].resources`，都是会回退为重建升级。

比如我们将上面的应用升级方式设置为 `InPlaceIfPossible`，只需要在资源清单中添加 `spec.updateStrategy.type: InPlaceIfPossible` 即可：

```yaml
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  name: cs-demo
spec:
  updateStrategy:
    type: InPlaceIfPossible
  ......
  # image: nginx:1.7.9
```

更新后可以发现 Pod 的状态并没有发生什么大的变化，名称、IP 都一样，唯一变化的是镜像 tag：

```bash
➜ kubectl get pods -l app=cs
NAME            READY   STATUS    RESTARTS      AGE
cs-demo-2sfzz   1/1     Running   1 (18s ago)   36m
cs-demo-jfx5s   1/1     Running   0             40m
cs-demo-kg9p2   1/1     Running   0             40m
cs-demo-x8ndf   1/1     Running   0             37m
➜ kubectl describe cloneset cs-demo
Name:         cs-demo
Namespace:    default
Labels:       <none>
Annotations:  <none>
API Version:  apps.kruise.io/v1alpha1
Kind:         CloneSet
......
Events:
  Type    Reason                      Age    From                 Message
  ----    ------                      ----   ----                 -------
  #  ......
  Normal   SuccessfulUpdatePodInPlace  6m58s              cloneset-controller  successfully update pod cs-demo-2sfzz in-place(revision cs-demo-7cb9c88699)
  Normal   SuccessfulUpdatePodInPlace  5m46s              cloneset-controller  successfully update pod cs-demo-x8ndf in-place(revision cs-demo-7cb9c88699)
  Normal   SuccessfulUpdatePodInPlace  4m43s              cloneset-controller  successfully update pod cs-demo-kg9p2 in-place(revision cs-demo-7cb9c88699)
  Normal   SuccessfulUpdatePodInPlace  3m40s              cloneset-controller  successfully update pod cs-demo-jfx5s in-place(revision cs-demo-7cb9c88699)
➜ kubectl describe pod cs-demo-2sfzz
......
Events:
  Type    Reason     Age                  From               Message
  ----    ------     ----                 ----               -------
  Normal  Scheduled  44m                  default-scheduler  Successfully assigned default/cs-demo-2sfzz to node2
  Normal  Pulled     44m                  kubelet            Container image "nginx:alpine" already present on machine
  Normal  Killing    8m8s                 kubelet            Container nginx definition changed, will be restarted
  Normal  Pulling    8m8s                 kubelet            Pulling image "nginx:1.7.9"
  Normal  Created    7m58s (x2 over 44m)  kubelet            Created container nginx
  Normal  Started    7m58s (x2 over 44m)  kubelet            Started container nginx
  Normal  Pulled     7m58s                kubelet            Successfully pulled image "nginx:1.7.9" in 9.720841233s (9.720847295s including waiting)
```

这就是原地升级的效果，原地升级整体工作流程如下图所示：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202304131440768.png)原地升级流程

如果你在安装或升级 Kruise 的时候启用了 `PreDownloadImageForInPlaceUpdate` 这个 feature-gate，CloneSet 控制器会自动在所有旧版本 pod 所在节点上预热你正在灰度发布的新版本镜像，这对于应用发布加速很有帮助。

默认情况下 CloneSet 每个新镜像预热时的并发度都是 1，也就是一个个节点拉镜像，如果需要调整，你可以在 CloneSet 通过 `apps.kruise.io/image-predownload-parallelism` 这个 annotation 来设置并发度。

另外从 Kruise v1.1.0 开始，还可以使用 `apps.kruise.io/image-predownload-min-updated-ready-pods` 来控制在少量新版本 Pod 已经升级成功之后再执行镜像预热。它的值可能是绝对值数字或是百分比。

```yaml
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  annotations:
    apps.kruise.io/image-predownload-parallelism: "5"
    apps.kruise.io/image-predownload-min-updated-ready-pods: "2"
```

> 注意，为了避免大部分不必要的镜像拉取，目前只针对 `replicas > 3` 的 CloneSet 做自动预热。

此外 CloneSet 还支持分批进行灰度，在 `updateStrategy` 属性中可以配置 `partition` 参数，该参数可以用来**保留旧版本 Pod 的数量或百分比**，默认为 0：

- 如果是数字，控制器会将 `(replicas - partition)` 数量的 Pod 更新到最新版本
- 如果是百分比，控制器会将 `(replicas * (100% - partition))` 数量的 Pod 更新到最新版本

比如，我们将上面示例中的的 image 更新为 `nginx:latest` 并且设置 `partition=2`，更新后，过一会查看可以发现只升级了 2 个 Pod：

```bash
➜ kubectl get pods -l app=cs -L controller-revision-hash
NAME            READY   STATUS    RESTARTS      AGE   CONTROLLER-REVISION-HASH
cs-demo-2sfzz   1/1     Running   1 (11m ago)   47m   cs-demo-7cb9c88699
cs-demo-jfx5s   1/1     Running   2 (99s ago)   52m   cs-demo-7c4d79f5bc
cs-demo-kg9p2   1/1     Running   2 (27s ago)   52m   cs-demo-7c4d79f5bc
cs-demo-x8ndf   1/1     Running   1 (10m ago)   48m   cs-demo-7cb9c88699
➜ kubectl get pods -o custom-columns='DATA:metadata.name,CONTAINERS:spec.containers[*].name,IMAGES:spec.containers[*].image' -l app=cs
DATA            CONTAINERS   IMAGES
cs-demo-2sfzz   nginx        nginx:1.7.9
cs-demo-jfx5s   nginx        nginx:latest
cs-demo-kg9p2   nginx        nginx:latest
cs-demo-x8ndf   nginx        nginx:1.7.9
```

此外 CloneSet 还支持一些更高级的用法，比如可以定义优先级策略来控制 Pod 发布的优先级规则，还可以定义策略来将一类 Pod 打散到整个发布过程中，也可以暂停 Pod 发布等操作。

### 生命周期钩子

每个 CloneSet 管理的 Pod 会有明确所处的状态，在 Pod label 中的 `lifecycle.apps.kruise.io/state` 标记：

- `Normal`：正常状态
- `PreparingUpdate`：准备原地升级
- `Updating`：原地升级中
- `Updated`：原地升级完成
- `PreparingDelete`：准备删除

而生命周期钩子，则是通过在上述状态流转中卡点，来实现原地升级前后、删除前的自定义操作（比如开关流量、告警等）。CloneSet 的 `lifecycle` 下面主要支持 `preDelete` 和 `inPlaceUpdate` 两个属性。

```yaml
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
spec:

  # 通过 finalizer 定义 hook
  lifecycle:
    preDelete:  # PreDelete 是 Pod 被删除之前的 hook
      finalizersHandler:
      - example.io/unready-blocker
    inPlaceUpdate: # InPlaceUpdate 是 Pod 更新之前和更新后的 hook
      finalizersHandler:
      - example.io/unready-blocker

  # 或者也可以通过 label 定义
  lifecycle:
    inPlaceUpdate:
      labelsHandler:
        example.io/block-unready: "true"
```

#### **升级/删除 Pod 前将其置为 NotReady**

```yaml
lifecycle:
  preDelete:
    markPodNotReady: true
    finalizersHandler:
      - example.io/unready-blocker
  inPlaceUpdate:
    markPodNotReady: true
    finalizersHandler:
      - example.io/unready-blocker
```

- 如果设置 `preDelete.markPodNotReady=true`:

- Kruise 将会在 Pod 进入 `PreparingDelete` 状态时，将 `KruisePodReady` 这个 Pod Condition 设置为 False, Pod 将变为 NotReady。

- 如果设置 `inPlaceUpdate.markPodNotReady=true`:

- Kruise 将会在 Pod 进入 `PreparingUpdate` 状态时，将 KruisePodReady 这个 Pod Condition 设置为 False, Pod 将变为 NotReady。
- Kruise 将会尝试将 KruisePodReady 这个 Pod Condition 设置回 True。

我们可以利用这一特性，在容器真正被停止之前将 Pod 上的流量先行排除，防止流量损失。

#### **流转示意图**

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202304131441590.jpeg)生命周期示意图

- 当 CloneSet 删除一个 Pod（包括正常缩容和重建升级）时：

- 如果没有定义 lifecycle hook 或者 Pod 不符合 preDelete 条件，则直接删除
- 否则，先只将 Pod 状态改为 `PreparingDelete`。等用户 controller 完成任务去掉 label/finalizer、Pod 不符合 preDelete 条件后，kruise 才执行 Pod 删除
- 需要注意的是 `PreparingDelete` 状态的 Pod 处于删除阶段，不会被升级

- 当 CloneSet 原地升级一个 Pod 时：

- 升级之前，如果定义了 lifecycle hook 且 Pod 符合 `inPlaceUpdate` 条件，则将 Pod 状态改为 `PreparingUpdate`
- 等用户 controller 完成任务去掉 label/finalizer、Pod 不符合 `inPlaceUpdate` 条件后，kruise 将 Pod 状态改为 `Updating` 并开始升级
- 升级完成后，如果定义了 lifecycle hook 且 Pod 不符合 `inPlaceUpdate` 条件，将 Pod 状态改为 Updated
- 等用户 controller 完成任务加上 label/finalizer、Pod 符合 `inPlaceUpdate` 条件后，kruise 将 Pod 状态改为 Normal 并判断为升级成功

关于从 PreparingDelete 回到 Normal 状态，从设计上是支持的（通过撤销指定删除），但我们一般不建议这种用法。由于 PreparingDelete 状态的 Pod 不会被升级，当回到 Normal 状态后可能立即再进入发布阶段，对于用户处理 hook 是一个难题。

#### **用户 controller 逻辑示例**

按上述例子，可以定义：

- `example.io/unready-blocker finalizer` 作为 hook
- `example.io/initialing` annotation 作为初始化标记

在 CloneSet template 模板里带上这个字段：

```yaml
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
spec:
  template:
    metadata:
      annotations:
        example.io/initialing: "true"
      finalizers:
        - example.io/unready-blocker
  # ...
  lifecycle:
    preDelete:
      finalizersHandler:
        - example.io/unready-blocker
    inPlaceUpdate:
      finalizersHandler:
        - example.io/unready-blocker
```

而后用户 controller 的逻辑如下：

- 对于 Normal 状态的 Pod，如果 annotation 中有 `example.io/initialing: true` 并且 Pod status 中的 ready condition 为 True，则接入流量、去除这个 annotation
- 对于 `PreparingDelete` 和 `PreparingUpdate` 状态的 Pod，切走流量，并去除 `example.io/unready-blocker` finalizer
- 对于 Updated 状态的 Pod，接入流量，并打上 `example.io/unready-blocker finalizer`

#### **使用场景**

因为各种各样的历史原因和客观因素，有些用户可能无法将自己公司的整套体系架构 Kubernetes 化，比如有些用户暂时无法使用 Kubernetes 本身提供的 Service 服务发现机制，而是使用了独立于 Kubernetes 之外的另外一套服务注册和发现体系。在这种架构下，如果用户对服务进行 Kubernetes 化改造，可能会遇到诸多问题。例如，每当 Kubernetes 成功创建出一个 Pod，都需要自行将该 Pod 注册到服务发现中心，以便能够对内对外提供服务；相应的，想要下线一个 Pod，也通常先要将其在服务发现中心删除，才能将 Pod 优雅下线，否则就可能导致流量损失。但是在原生的 Kubernetes 体系中， Pod 的生命周期由 Workload 管理（例如 Deployment），当这些 Workload 的 Replicas 字段发生变化后，相应的 Controller 会立即添加或删除掉 Pod，用户很难定制化地去管理 Pod 的生命周期。

面对这类问题，一般来说有两种解决思路：一是约束 Kubernetes 的弹性能力，例如规定只能由特定的链路对 Workload 进行扩缩容，以保证在删除 Pod 前先把 Pod IP 在服务注册中心摘除，但这样一来会制约 Kubernetes 本身的弹性能力, 并且也增加了链路管控的难度和风险。 二是在根本上改造现有的服务发现体系，显然这是一个更加漫长和高风险的事情。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202304131442224.jpeg)CloneSet生命周期改造

那么有没有一种既能够充分利用 Kubernetes 弹性能力，又避免对既有服务发现体系进行改造，快速弥补两个系统之间的间隙的方法呢？

OpenKruise CloneSet 就提供了这样一组高度可定制化的扩展能力来专门应对此类场景，让用户能够对 Pod 生命周期做更精细化、定制化的管理。CloneSet 在 Pod 生命周期中几个重要的时间节点预留了 Hook，使得用户可以在这些时间节点插入一些定制化的扩展动作。比如，在 Pod 升级前，将 Pod IP 在服务发现中心删除，升级完成后再将 Pod IP 注册到服务发现中心，或者做一些特殊的嗅探和监控动作。

我们假设现在有这样一个场景：

- 用户不使用 Kubernetes Service 作为服务发现机制，服务发现体系完全独立于 Kubernetes；
- 使用 CloneSet 作为 Kubernetes 工作负载。

并且对具体的需求做如下合理假设：

- 当 Kubernetes Pod 被创建时：

- 在创建成功，且 Pod Ready 之后，将 Pod IP 注册到服务发现中心；

- 当 Kubernetes Pod 原地升级时：

- 在升级之前，需要将 Pod IP 从服务发现中心删除（或主动 FailOver）；
- 在升级完成，且 Pod Ready 之后，将 Pod IP 再次注册到服务发现中心；

- 当 Kubernetes Pod 被删除时：

- 在删除之前，需要先将 Pod IP 从服务发现中心删除；

基于以上假设，其实我们就可以利用 CloneSet LifeCycle 来编写一个简单的 Operator 实现用户定义的 Pod 生命周期管理机制。

前面我们提到了 CloneSet LifeCycle 将 Pod 的生命周期定义为了 5 种状态，5 种状态之间的转换逻辑由一个状态机所控制。我们可以只选择自己所关心的一种或多种，编写一个独立的 Operator 来实现这些状态的转换，控制 Pod 的生命周期，并在所关心的时间节点插入自己的定制化逻辑。

```yaml
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  namespace: demo
  name: cloneset-lifecycle-demo
spec:
  replicas: 2
  ##########################################################################
  ## 生命周期配置
  lifecycle:
    inPlaceUpdate:
      labelsHandler:
        ## 定义标签:
        ##    1. 为 cloneset 控制器阻止原地更新 Pod 操作
        ##    2. 通知 operator 执行 inPlace update 钩子
        example.com/unready-blocker-inplace: "true"
    preDelete:
      labelsHandler:
        ## 定义标签:
        ##    1. 为 cloneset 控制器阻止删除 pod 操作
        ##    2. 通知 operator 执行 preDelete 钩子
        example.com/unready-blocker-delete: "true"
  ##########################################################################
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
        ## 这个标签可以用来判断此 Pod 是否是新创建的
        example.com/newly-create: "true"
        ## 对应于 spec.lifecycle.inPlaceUpdate.labelsHandler.example.com/unready-blocker-inplace
        example.com/unready-blocker-inplace: "true"
        ## 对应 spec.lifecycle.preDelete.labelsHandler.example.com/unready-blocker-inplace
        example.com/unready-blocker-delete: "true"
      containers:
        - name: main
          image: nginx:latest
          imagePullPolicy: Always
  updateStrategy:
    maxUnavailable: 20%
    type: InPlaceIfPossible
```

在前面的 CRD 章节和大家讲解过如何开发一个 Operator，这里过程我们就不在赘述了，这里直接给出控制器的核心代码：

```go
const (
    deleteHookLabel  = "example.com/unready-blocker-delete"
    inPlaceHookLabel = "example.com/unready-blocker-inplace"
    newlyCreateLabel = "example.com/newly-create"
)

func (r *SampleReconciler) Reconcile(req ctrl.Request) (ctrl.Result, error) {
    ... ...

    switchLabel := func(pod *v1.Pod, key, value string) error {
        body := fmt.Sprintf(`{"metadata":{"labels":{"%s":"%s"}}}`, key, value)
        if err := r.Patch(context.TODO(), pod, client.RawPatch(types.StrategicMergePatchType, []byte(body))); err != nil {
            return err
        }
        return nil
    }

    /*
        Pod LifeCycle Hook 逻辑
    */
    switch {
    // 处理新创建的 Pod
    case IsNewlyCreateHooked(pod):
        // 将此 Pod 注册到你的服务发现中心
        if err := postRegistry(pod); err != nil {
            return reconcile.Result{}, err
        }
        if err := switchLabel(pod, newlyCreateLabel, "false"); err != nil {
            return reconcile.Result{}, err
        }

    // 处理准备进行原地升级的 Pod
    case IsPreUpdateHooked(pod):
        // 让服务发现中心将此 Pod fail over
        if err := postFailOver(pod); err != nil {
            return reconcile.Result{}, err
        }
        if err := switchLabel(pod, inPlaceHookLabel, "false"); err != nil {
            return reconcile.Result{}, err
        }

    // 处理更新完成后的 Pod
    case IsUpdatedHooked(pod):
        // 让服务发现中心重新注册 Pod
        if err := postRegistry(pod); err != nil {
            return reconcile.Result{}, err
        }
        if err := switchLabel(pod, inPlaceHookLabel, "true"); err != nil {
            return reconcile.Result{}, err
        }

    // 处理准备删除的 Pod
    case IsPreDeleteHooked(pod):
        // 从你的服务发现中心取消该Pod的注册
        if err := postUnregister(pod); err != nil {
            return reconcile.Result{}, err
        }
        if err := switchLabel(pod, deleteHookLabel, "false"); err != nil {
            return reconcile.Result{}, err
        }
    }

    return ctrl.Result{}, nil
}

func IsNewlyCreateHooked(pod *v1.Pod) bool {
    return kruiseappspub.LifecycleStateType(pod.Labels[kruiseappspub.LifecycleStateKey]) == kruiseappspub.LifecycleStateNormal && pod.Labels[newlyCreateLabel] == "true" && IsPodReady(pod)
}

func IsPreUpdateHooked(pod *v1.Pod) bool {
    return kruiseappspub.LifecycleStateType(pod.Labels[kruiseappspub.LifecycleStateKey]) == kruiseappspub.LifecycleStatePreparingUpdate && pod.Labels[inPlaceHookLabel] == "true"
}

func IsUpdatedHooked(pod *v1.Pod) bool {
    return kruiseappspub.LifecycleStateType(pod.Labels[kruiseappspub.LifecycleStateKey]) == kruiseappspub.LifecycleStateUpdated && pod.Labels[inPlaceHookLabel] == "false" && IsPodReady(pod)
}

func IsPreDeleteHooked(pod *v1.Pod) bool {
    return kruiseappspub.LifecycleStateType(pod.Labels[kruiseappspub.LifecycleStateKey]) == kruiseappspub.LifecycleStatePreparingDelete && pod.Labels[DeleteHookLabel] == "true"
}
```

上述代码中四个分支分别从上到下对应 Pod 的创建后、升级前、升级后、删除前等四个重要声明周期节点，我们可以根据自己的实际需求来完善相应的 Hook，我们这里上述几个 Hook 的行为具体为：

- `postRegistry(pod *v1.Pod)`: 发送请求通知服务发现中心注册该 Pod 服务；
- `postFailOver(pod *v1.Pod)`: 发送请求通知服务发现中心 Fail Over 该 Pod 服务；
- `postUnregiste(pod *v1.Pod)`: 发送请求通知服务发现中心将该 Pod 服务注销。

这就是 CloneSet Lifecycle 的强大之处，我们完全可以根据需求在 Pod 生命周期管理中插入定制化逻辑。
