---
title: Docker与Containerd的区别
date: 2023-09-07 09:38:51
type: categories
tags: 
    - Docker
keywords: Docker
categories: 
    - Docker
---

## 容器运行时

容器运行时（Container Runtime）是一种负责在操作系统层面创建和管理容器的软件工具或组件。它是容器化技术的核心组件之一，用于在容器内部运行应用程序，并提供隔离、资源管理和安全等功能。 在Kubernetes中，容器运行时是负责管理和运行容器的组件。在过去，Docker是最常用的容器运行时，但随着时间的推移，containerd成为Kubernetes的另一个受欢迎的容器运行时选择。

> 说明：自 kubernetes 1.24 版起，Dockershim 已从 Kubernetes 项目中移除。

容器运行时的主要任务包括：

容器创建和启动：容器运行时负责根据预定义的容器配置信息（如镜像、命令、环境变量等），创建并启动容器实例。
容器文件系统管理：容器运行时处理容器的文件系统，负责将镜像的内容挂载到容器的文件系统，并在容器之间提供隔离。
资源限制和管理：容器运行时可以根据用户或管理员定义的资源限制，管理容器对CPU、内存、磁盘等资源的使用。
容器网络：容器运行时协助配置容器的网络，使得容器可以与其他容器或外部网络进行通信。
安全性：容器运行时实施安全机制，确保容器之间和宿主机之间的隔离，并防止容器中的恶意行为影响其他容器或宿主机。
在当今云原生技术的潮流中，容器化技术已经成为现代应用部署的主流选择。Kubernetes (K8s) 作为一种流行的容器编排系统，广泛应用于大规模的容器集群管理。而在K8s中，容器运行时的选择对于性能、可靠性和安全性都起着至关重要的作用。本文将对比两种常见的K8s容器运行时：Containerd和Docker，并探讨它们的异同点。

## Docker：原先的翘楚

Docker作为一种早期的容器技术，它的出现颠覆了传统虚拟化方式，通过轻量级容器化的方式实现了应用的打包、交付和运行。Docker在容器技术的普及过程中发挥了关键作用，其用户友好的命令行工具和图形化界面让容器技术对广大开发者变得更加友好和易用。一度，Docker几乎成为容器化的代名词。 然而，随着Kubernetes的兴起，Docker在K8s中的地位逐渐受到挑战。一方面，Docker作为一个完整的容器平台，包含了许多K8s并不需要的功能，导致资源浪费。另一方面，K8s本身提供了容器编排和调度的功能，与Docker重叠，造成了一定程度上的冲突。 为了防止docker一家独大，docker当年的实现被拆分出了几个标准化的模块，标准化的目的是模块是可被其他实现替换的，不由任何一个厂商控制。 Docker 由

docker-client
dockerd
containerd
docker-shim
runc
组成，所以containerd是docker的基础组件之一，docker 对容器的管理和操作基本都是通过 containerd 完成的。 那么，containerd 是什么呢？

## Containerd：K8s生态系统的标配

Containerd是由Docker团队开源的容器运行时，它专注于提供轻量级、高性能的容器运行环境。作为一个纯粹的容器运行时，Containerd被设计为更加符合K8s的架构和需求。它具有更小的资源占用，更快的启动时间，以及更好的性能表现。 K8s社区认可了Containerd的优势，并将其作为K8s生态系统的标配容器运行时。 Containerd 可以在宿主机中管理完整的容器生命周期：容器镜像的传输和存储、容器的执行和管理、存储和网络等。详细点说，Containerd 负责干下面这些事情：

管理容器的生命周期(从创建容器到销毁容器)
拉取/推送容器镜像
存储管理(管理镜像及容器数据的存储)
调用 runC 运行容器(与 runC 等容器运行时交互)
管理容器网络接口及网络

## 容器运行时接口（CRI）

容器运行时接口（Container Runtime Interface），简称 CRI。 CRI 是一个插件接口，它使 kubelet 能够使用各种容器运行时，无需重新编译集群组件。 你需要在集群中的每个节点上都有一个可以正常工作的容器运行时， 这样 kubelet 能启动 Pod 及其容器。 容器运行时接口（CRI）是 kubelet 和容器运行时之间通信的主要协议。

## Kubernetes 与 dockershim

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202309071458890.png)

从Kubernetes的架构图中，可以看到 Kubelet 下面还有一层Contianer runtime （容器运行时）是作为真正和OS去交互的，这个容器运行时是真正地管理容器的整个生命周期的以及拉取镜像等操作的。

## 当前支持的 CRI 后端

我们最初在使用 Kubernetes 时通常会默认使用 Docker 作为容器运行时，其实从 Kubernetes 1.5 开始已经支持 CRI，通过 CRI 接口可以指定使用其它容器运行时作为 Pod 的后端，目前支持 CRI 的后端有：

- cri-o：cri-o 是 Kubernetes 的 CRI 标准的实现，并且允许 Kubernetes 间接使用 OCI 兼容的容器运行时，可以把 cri-o 看成 Kubernetes 使用 OCI 兼容的容器运行时的中间层。
- cri-containerd：基于 Containerd 的 Kubernetes CRI 实现，Containerd是一个进程,是CRI-Containerd的实现
- rkt：由 CoreOS 主推的用来跟 docker 抗衡的容器运行时
- frakti：基于 hypervisor 的 CRI
- docker：Kuberentes 最初就开始支持的容器运行时，目前还没完全从 kubelet 中解耦，Docker 公司同时推广了 OCI 标准

## Dockershim

在 Kubernetes 提出 CRI 操作规范时，Docker刚拆出 containerd，并不支持 CRI 标准。由于当时Docker是容器技术最主流也是最权威的存在，Kuberentes虽然提出了CRI接口规范，但仍然需要去适配CRI与Docker的对接，因此它需要一个中间层或 shim 来对接 Kubelet 和 Docker 的 contianer runtime。 于是 kubelet 中加入了 Dockershim （shim为临时、兼容的意思）。使用 docker 作为 runtime 时，实际启动一个容器的过程是：

![a72b6584a30bc595704f66284d299028](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202309071459102.png)

在这个阶段 dockershim组件在Kubelet 的代码中，这也就意味着Dockershim是由K8S组织进行开发和维护！由于Docker公司的版本发布K8S组织是无法控制和管理，所以每次Docker发布新的Release，K8S组织都要集中精力去快速地更新维护Dockershim。 Kubernetes1.24版本正式删除和弃用dockershim。这件事情的本质是废弃了内置的 dockershim 功能，直接对接Containerd（后续已经支持 CRI）。这种方式更加标准，调用的链路更加的简洁。

![2a1e5ed388e8f44d78c7728c332fd38c](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202309071459165.png)

## 调用关系对比

runtime 是 docker 时的调用链：调用关系为：kubelet --> dockershim （在 kubelet 进程中） --> dockerd --> containerd runtime 是 containerd 时的调用链：调用关系为：kubelet --> cri plugin（在 containerd 进程中） --> containerd 总结：从k8s的角度看，选择 Containerd 作为运行时组件更胜一筹，因为 Containerd 调用链更短，组件更少，更稳定，占用节点资源更少调用链

## 常用命令

ctr 是 containerd 的一个客户端工具。 crictl 是 CRI 兼容的容器运行时命令行接口，可以使用它来检查和调试 k8s 节点上的容器运行时和应用程序。 ctr -v 输出的是 containerd 的版本，crictl -v 输出的是当前 k8s 的版本，从结果显而易见你可以认为 crictl 是用于 k8s 的。

|                     | docker            | ctr（containerd）            | crictl（kubernetes） |
| :------------------ | :---------------- | :--------------------------- | :------------------- |
| 查看运行的容器      | docker ps         | ctr task ls/ctr container ls | crictl ps            |
| 查看镜像            | docker images     | ctr image ls                 | crictl images        |
| 查看容器日志        | docker logs       | 无                           | crictl logs          |
| 查看容器数据信息    | docker inspect    | ctr container info           | crictl inspect       |
| 查看容器资源        | docker stats      | 无                           | crictl stats         |
| 启动/关闭已有的容器 | docker start/stop | ctr task start/kill          | crictl start/stop    |
| 运行一个新的容器    | docker run        | ctr run                      | 无（最小单元为 pod） |
| 修改镜像标签        | docker tag        | ctr image tag                | 无                   |
| 创建一个新的容器    | docker create     | ctr container create         | crictl create        |
| 导入镜像            | docker load       | ctr image import             | 无                   |
| 导出镜像            | docker save       | ctr image export             | 无                   |
| 删除容器            | docker rm         | ctr container rm             | crictl rm            |
| 删除镜像            | docker rmi        | ctr image rm                 | crictl rmi           |
| 拉取镜像            | docker pull       | ctr image pull               | ctictl pull          |
| 推送镜像            | docker push       | ctr image push               | 无                   |
| 在容器内部执行命令  | docker exec       | 无                           | crictl exec          |
