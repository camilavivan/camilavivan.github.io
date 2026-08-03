---
title: Kubernetes Pod 中容器的启动优先级
date: 2023-07-28 17:54:33
type: categories
tags: 
    - kubernetes
keywords: kubernetes
categories: 
    - kubernetes
---

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307281146482.png)

今天分享的主题是：怎么控制 `Kubernetes` 单个 `Pod` 中容器的启动顺序。

在前面讲容器设计模式时，我曾提到过 `Kubernetes Pod` 內有两种容器，分别是

1. `Init Container（初始化容器）`：在 `spec.initContainers` 结构体內
2. `Application Container（应用容器）`：在 `spec.containers` 结构体內

## `Init Container`

`Init Container` 执行优先于 `Application Container`，且会按照顺序逐一执行，每个 `Init Container` 成功终止退出后，下一个 `Init Container` 才开始执行。

## `Application Container`

但是 `Application Container` 则是完全不一样的，数组內的容器之间是平等无序的。什么意思呢？就是说它们会并行运行，所以我们部署服务时绝不能对容器的顺序做出假设。

我们先来看一个完整的 `Pod` 的 `YMAL` 结构，如下所示，全部使用一样的镜像地址：

```bash
cat <<EOF | kubectl create -f -
apiVersion: v1
kind: Pod
metadata:
  name: multi-containers-example
spec:
  containers:
  - name: 1st-container
    image: lqshow/busybox-curl:1.28
    command: ['sh', '-c']
    args:
      - whiletrue; do
          echo first-container;
          sleep 1;
        done
  - name: 2nd-container
    image: lqshow/busybox-curl:1.28
    command: ['sh', '-c']
    args:
      - whiletrue; do
          echo second-container;
          sleep 1;
        done
  - name: app-container
    image: lqshow/busybox-curl:1.28
    command: ['sh', '-c', 'echo The app is running! && sleep 3600']
EOF
```

我们通过查看 `Pod` 的详细信息，发现三个容器都是在同一个时间点启动的，且从 `Events` 信息里可以看到三个容器其实是按照 `spec.containers` 中定义的顺序进行创建启动的。

```bash
➜ kubectl describe pod multi-containers-example

Name:         multi-containers-example
Start Time:   Sun, 24 Oct 2021 21:56:23 +0800
Status:       Running
[...]
Containers:
  1st-container:
    State:          Running
      Started:      Sun, 24 Oct 2021 21:56:25 +0800
    Ready:          True
    [...]
  2nd-container:
    State:          Running
      Started:      Sun, 24 Oct 2021 21:56:25 +0800
    Ready:          True
    [...]
  app-container:
    State:          Running
      Started:      Sun, 24 Oct 2021 21:56:25 +0800
    Ready:          True
    [...]
[...]
Events:
  Type    Reason     Age        From                Message
  ----    ------     ----       ----                -------
  Normal  Scheduled  <unknown>                      Successfully assigned default/multi-containers-example to kind-dev-1
  Normal  Pulled     104s       kubelet, kind-dev-1  Container image "lqshow/busybox-curl:1.28" already present on machine
  Normal  Created    104s       kubelet, kind-dev-1  Created container 1st-container
  Normal  Started    103s       kubelet, kind-dev-1  Started container 1st-container
  Normal  Pulled     103s       kubelet, kind-dev-1  Container image "lqshow/busybox-curl:1.28" already present on machine
  Normal  Created    103s       kubelet, kind-dev-1  Created container 2nd-container
  Normal  Started    103s       kubelet, kind-dev-1  Started container 2nd-container
  Normal  Pulled     103s       kubelet, kind-dev-1  Container image "lqshow/busybox-curl:1.28" already present on machine
  Normal  Created    103s       kubelet, kind-dev-1  Created container app-container
  Normal  Started    103s       kubelet, kind-dev-1  Started container app-container
```

这里虽然是顺序启动，但是其实我们并不能保证当 `app-container` 依赖于 `2nd-container` 时，在依赖的 `2nd-container` 启动完成准备就绪后再进行启动。

## Problem

那么问题来了，如果我们部署的服务因为某些特殊场景需要有多个容器应用，且主应用容器执行的先决条件，必须是 `Sidecar` 容器先准备好，这个时候我们该怎么办呢？

我相信这个问题肯定是多数 `Kubernetes` 的 `Paas` 平台开发者的疑问，且这问题通常也出现在 `Service mesh` 中，大家在初次使用 `Istio` 或 `Linkerd` 都会碰到这种情况。

这其实是容器同时启动后，`Kubernetes` 又不提供任何关于容器启动顺序的保证， 导致容器之间出现了启动竞争状态(`startup race conditions`)。

> 我从网络上翻到一些旧文，发现社区在 `2019` 年的时候提出过一个 `Kubernetes Enhancement Proposal`，但是最终没有被落地采用。
>
> **Sidecar Containers**[1]
> 比较有意思的是，也有另外一篇文章对这个 `KEP` 做了解读，里面有两个动图很有趣，非常的生动，推荐大家也看下。
>
> **Sidecar container lifecycle changes in Kubernetes 1.18**[2]

## Approach

### 01-Probe

> 第一个方法，发现其实没啥用，是一个失败的尝试

我最开始的想法是，既然依赖的 `Sidecar` 容器初始化要花一些时间，我们能不能设置一些参数，让主应用容器多等一会，待确认初始化容器完成后，再启动主应用容器呢？

我第一个想到的是使用 `Kubernetes` 提供的 `Startup Probes(启动探针)`，我们来先看一下下面这个 `YMAL` 结构

> 以下例子是通过 `Kubernetes` 官方文档修改
> **Configure Liveness, Readiness and Startup Probes**[3]

```bash
cat <<EOF | kubectl create -f -
apiVersion: v1
kind: Pod
metadata:
  name: sidecar-startup-example
spec:
  containers:
  - name: sidecar-container
    image: lqshow/busybox-curl:1.28

    args:
    - /bin/sh
    - -c
    - sleep 10; touch /tmp/healthy; sleep 600

    startupProbe:
      exec:
        command:
        - cat
        - /tmp/healthy
      failureThreshold: 5
      periodSeconds: 5

  - name: app-container
    image: lqshow/busybox-curl:1.28
    command: ['sh', '-c', 'date; echo The app is running! && sleep 3600']
EOF
```

我们来看下结果，发现其实并没有啥效果，Pod 还是处于 Running 状态了，只是一个 `Container` 的 `Ready` 是 `false` 而已，两个 `Container` 其实还是同时启动的。

```bash
➜ kubectl get pod sidecar-startup-example
NAME                      READY   STATUS    RESTARTS   AGE
sidecar-startup-example   1/2     Running   0          23s
```

我们可以通过查看 `Pod` 的详细信息看下两个 `Container` 的实际启动情况。`app-container` 几乎是和 `sidecar-container` 是在同一个时间点启动的，但是从 `sidecar-container` 的状态来看，其实并没有准备好。

```bash
➜ kubectl describe pod sidecar-startup-example

Name:         sidecar-startup-example
Start Time:   Wed, 27 Oct 2021 23:46:29 +0800
Status:       Running
[...]
Containers:
  sidecar-container:
    [...]
    State:          Running
      Started:      Wed, 27 Oct 2021 23:46:30 +0800
    Ready:          False
    [...]
  app-container:
    [...]
    State:          Running
      Started:      Wed, 27 Oct 2021 23:46:31 +0800
    Ready:          True
    [...]
Conditions:
  Type              Status
  Initialized       True
  Ready             False
  ContainersReady   False
  PodScheduled      True
```

所以说不管是 `Liveness`、`Readiness` 还是 `Startup`，这几个探针其实都是对容器的健康状态做检查，并不能 `hook` 容器的启动。

### 02-lifecycle

> `Kubernetes` 官方文档对 `lifecycle.postStart` 做了以下说明，看来我们可以从这里搞点文章。
>
> **Kubernetes sends the postStart event immediately after a Container is started**, and it sends the preStop event immediately before the Container is terminated. **A Container may specify one handler per event**.
>
> 参考: **Attach Handlers to Container Lifecycle Events**[4]
> 以下这个完整的 `Pod` 也是通过 `Kubernetes` 官方文档例子做出的进一步修改

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sidecar-startup-example
spec:
  containers:
  - name: sidecar-container
    image: lqshow/busybox-curl:1.28

    args:
    - /bin/sh
    - -c
    - date; sleep 2; touch /tmp/healthy; sleep 600

    lifecycle:
      postStart:
        exec:
          command:
          - /bin/sh
          - -c
          - sleep 8; echo Hello from the postStart handler > /tmp/message;

  - name: app-container
    image: lqshow/busybox-curl:1.28
    command: ['sh', '-c', 'date; echo The app is running! && sleep 3600']
```

将脚本放在 `Kubernetes` 集群內执行，观察 `Pod` 內两个 `Container` 的日志。

我们从容器打印的时间点发现，它是符合我们预期的，`app-container` 确实是在 `sidecar-container` 启动 `8秒` 后才启动的。

```bash
# 首先看 `sidecar container` 的日志
➜ kubectl logs -f sidecar-startup-example sidecar-container

Tue Oct 26 14:46:09 UTC 2021
```

```bash
# 再看 `app container` 的日志
➜ kubectl logs -f sidecar-startup-example app-container

Tue Oct 26 14:46:17 UTC 2021
The app is running!
```

现在我们再次通过查看 `Pod` 的详细信息做下确认，两个 `Container` 的 `Started` 确实也是相差 `8秒`。

```bash
➜ kubectl describe pod sidecar-startup-example

Name:         sidecar-startup-example
[...]
Start Time:   Tue, 26 Oct 2021 22:46:08 +0800
Status:       Running
Containers:
  sidecar-container:
    [...]
    Args:
      /bin/sh
      -c
      date; sleep 2; touch /tmp/healthy; sleep 600
    State:          Running
      Started:      Tue, 26 Oct 2021 22:46:09 +0800
    Ready:          True
    [...]
  app-container:
    [...]
    Command:
      sh
      -c
      date; echo The app is running! && sleep 3600
    State:          Running
      Started:      Tue, 26 Oct 2021 22:46:17 +0800
    Ready:          True
    [...]
```

> 下面有个很形象的图片，描述了容器加入 `lifecycle.postStart` 后，`Pod` 启动的整个过程。
> 图片来自：**Delaying application start until sidecar is ready**[5]

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307281152006.png)

有兴趣的同学，可以直接查看 `Kubernetes` 中 `kubelet` 的源码，看一下这部分是如何实现的。

<https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/kuberuntime/kuberuntime_manager.go#L928>

## Summary

`Kubernetes` 在启动 `Pod` 时，启动应用容器的顺序会按照 `spec.containers` 结构体內事先声明的顺序来启动，但是容器启动了，并不代表容器它本身可以对外提供服务了。

从以上 `2个` 实验做下来，大家心里其实已有了答案，可以通过 `lifecycle.postStart` 来处理 `Pod` 內容器的启动顺序。

当然以上举的例子比较粗糙，但是目的达到了就行。我们在实际开发的项目中，如果有依赖的特定场景，首先是做好容器顺序的规划，然后可以给依赖的 `Sidecar` 容器的 `postStart` 事件指定一个健壮的处理程序。

此时我们心里会有另外一个疑问，既然 `Pod` 內容器的启动顺序因为在一些特定场景下必须要约束顺序，那么某些场景对容器关闭动作会不会也有顺序要求呢？又比如 `Job` 如果也加入了 `Mesh` 存在两个 `container` ，如何运行完毕后退出呢？

### 参考资料

[1] Sidecar Containers: *<https://github.com/kubernetes/enhancements/issues/753#issuecomment-713471597>*

[2] Sidecar container lifecycle changes in Kubernetes 1.18: *<https://banzaicloud.com/blog/k8s-sidecars/>*

[3] Configure Liveness, Readiness and Startup Probes: *<https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/>*

[4] Attach Handlers to Container Lifecycle Events: *<https://kubernetes.io/docs/tasks/configure-pod-container/attach-handler-lifecycle-event/>*

[5] Delaying application start until sidecar is ready: *<https://medium.com/@marko.luksa/delaying-application-start-until-sidecar-is-ready-2ec2d21a7b74/>*
