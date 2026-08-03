---
title: K8S OOM 和 CPU 节流
date: 2023-02-07 16:38:33
type: categories
tags: 
  - kubernetes
keywords: kubernetes
categories: 
  - kubernetes
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301101650972.png
---
## 介绍

使用 Kubernetes 时，内存不足 (OOM) 错误和 CPU 节流是云应用程序中资源处理的主要难题。

这是为什么？

云应用程序中的 CPU 和内存要求变得越来越重要，因为它们与您的云成本直接相关。

通过 limits 和 requests ，您可以配置 pod 应如何分配内存和 CPU 资源，以防止资源匮乏并调整云成本。

如果节点没有足够的资源， Pod 可能会通过抢占或节点压力被驱逐。

当一个进程运行内存不足 (OOM) 时，它会被终止，因为它没有所需的资源。

如果 CPU 消耗高于实际限制，进程将开始节流。

但是，如何主动监控 Kubernetes Pod 到达 OOM 和 CPU 节流的距离有多近？

## Kubernetes OOM

Pod 中的每个容器都需要内存才能运行。

Kubernetes limits 是在 Pod 定义或 Deployment 定义中为每个容器设置的。

所有现代 Unix 系统都有一种方法来终止进程，以防它们需要回收内存。这将被标记为错误 137 或`OOMKilled.`

```yaml
   State:          Running
      Started:      Thu, 10 Oct 2019 11:14:13 +0200
    Last State:     Terminated
      Reason:       OOMKilled
      Exit Code:    137
      Started:      Thu, 10 Oct 2019 11:04:03 +0200
      Finished:     Thu, 10 Oct 2019 11:14:11 +0200
```

此退出代码 137 表示该进程使用的内存超过允许的数量，必须终止。

这是 Linux 中存在的一个特性，内核`oom_score`为系统中运行的进程设置一个值。此外，它允许设置一个名为 `oom_score_adj` 的值，Kubernetes 使用该值来允许服务质量。它还具有一个 `OOM Killer`功能，它将审查进程并终止那些使用比他们应该使用上限更多的内存的进程。

请注意，在 Kubernetes 中，进程可以达到以下任何限制：

- 在容器上设置的 Kubernetes Limit。
- 在命名空间上设置的 Kubernetes ResourceQuota。
- 节点的实际内存大小。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302071636097.png)

### 内存过量使用

Limits 可以高于 requests，因此所有限制的总和可以高于节点容量。这称为过度使用，这很常见。实际上，如果所有容器使用的内存都比请求的多，它可能会耗尽节点中的内存。这通常会导致一些 pod 被杀死以释放一些内存。

### 监控 Kubernetes OOM

在 Prometheus 中使用 node exporter 时，有一个指标称为`node_vmstat_oom_kill`. 跟踪 OOM 终止发生的时间很重要，但您可能希望在此类事件发生之前提前了解此类事件。

相反，您可以检查进程与 Kubernetes 限制的接近程度：

```sql
(sum by (namespace,pod,container)
(rate(container_cpu_usage_seconds_total{container!=""}[5m])) / sum by
(namespace,pod,container)
(kube_pod_container_resource_limits{resource="cpu"})) > 0.8
```

## Kubernetes CPU 节流

**CPU 节流** 是一种行为，当进程即将达到某些资源限制时，进程会变慢。

与内存情况类似，这些限制可能是：

- 在容器上设置的 Kubernetes Limit。
- 在命名空间上设置的 Kubernetes ResourceQuota。
- 节点的实际内存大小。

想想下面的类比。我们有一条有一些交通的高速公路，其中：

- CPU 就是路。
- 车辆代表进程，每个车辆都有不同的大小。
- 多条通道代表有多个核心。
- 一个 request 将是一条专用道路，如自行车道。

这里的节流表现为交通堵塞：最终，所有进程都会运行，但一切都会变慢。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302071636818.gif)

### Kubernetes 中的 CPU 进程

CPU 在 Kubernetes 中使用 **shares** 处理。每个 CPU 核心被分成 1024 份，然后使用 Linux 内核的 cgroups（控制组）功能在所有运行的进程之间分配。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302071636504.png)

如果 CPU 可以处理所有当前进程，则不需要任何操作。如果进程使用超过 100% 的 CPU，那么份额就会到位。与任何 Linux Kernel 一样，Kubernetes 使用 CFS（Completely Fair Scheduler）机制，因此拥有更多份额的进程将获得更多的 CPU 时间。

与内存不同，Kubernetes 不会因为节流而杀死 Pod。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302071636919.png)

> 可以在 /sys/fs/cgroup/cpu/cpu.stat 中查看 CPU 统计信息

### CPU 过度使用

正如我们在 限制和请求一文 中看到的，当我们想要限制进程的资源消耗时，设置限制或请求很重要。然而，请注意不要将请求总数设置为大于实际 CPU 大小，因为这意味着每个容器都应该有一定数量的 CPU。

### 监控 Kubernetes CPU 节流

您可以检查进程与 Kubernetes 限制的接近程度：

```sql
(sum by (namespace,pod,container)(rate(container_cpu_usage_seconds_total
{container!=""}[5m])) / sum by (namespace,pod,container)
(kube_pod_container_resource_limits{resource="cpu"})) > 0.8
```

如果我们想跟踪集群中发生的节流量，cadvisor 提供`container_cpu_cfs_throttled_periods_total`和`container_cpu_cfs_periods_total`. 有了这两个，你就可以轻松计算出所有 CPU 周期的 throttling 百分比。

## 最佳实践

### 注意 limits 和 requests

限制是在节点中设置最大资源上限的一种方法，但需要谨慎对待这些限制，因为您可能最终会遇到一个进程被限制或终止的情况。

### 做好被驱逐的准备

通过设置非常低的请求，您可能认为这会为您的进程授予最少的 CPU 或内存。但是`kubelet`会首先驱逐那些使用率高于请求的 Pod，因此您将它们标记为第一个被杀死！

如果您需要保护特定 Pod 免遭抢占（当`kube-scheduler`需要分配新 Pod 时），请为最重要的进程分配优先级。

### 节流是无声的敌人

通过设置不切实际的限制或过度使用，您可能没有意识到您的进程正在受到限制，并且性能受到影响。主动监控您的 CPU 使用率并了解您在容器和命名空间中的实际限制。

## 总结

这是 CPU 和内存的 Kubernetes 资源管理备忘单

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302071636134.png)
