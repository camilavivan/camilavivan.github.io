---
title: k8s常见的问题处理
date: 2022-12-28 17:04:33
type: categories
tags: 
  - kubernetes
keywords: kubernetes
categories: 
  - kubernetes
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301101650972.png
---
## Coredns容器或local-dns容器重启

集群中的coredns组件发生重启(重新创建)，一般是由于coredns组件压力较大导致oom，请检查业务是否异常，是否存在应用容器无法解析域名的异常。

如果是local-dns重启，说明local-dns的性能也不够了，需要优化

## Pod was OOM killed

云应用容器实例发生OOM，请检查云应用是否正常。一般地，如果云应用配置了健康检查，当进程OOM了，健康检查如果失败，集群会自动重启容器。

OOM问题排查步骤：

检查应用进程内存配置，如Java的jvm参数，对比应用监控-基础监控中的内存指标，判断是否是参数设置低导致进程内存不够用，适当进行参数优化

## Out of memory: Kill process

### 原因描述

一般是操作系统把容器内进程Kill而导致的系统内核事件。比如一个java应用，当实际占用内存超过堆内存配置大小时，就会出现OOM错误。发生进程被Kill之后，容器依旧是存活状态，容器的健康检查还会继续进行。所以后面通常会伴随出现健康检查失败的错误。

### 解决方案

要具体分析进程被Kill的原因，适当的调整进程内存的限制值。可以结合应用监控来参考进程内存的变化趋势。

## Memory cgroup out of memory: Kill process

### 原因描述

一般是由于容器的内存实际使用量超过了容器内存限制值而导致的事件。比如容器的内存限制值配置了1Gi，而容器的内存随着容器内进程内存使用量的增加超过了1Gi，就会导致容器被操作系统Cgroup Kill。发生容器被Kill之后，容器已经被停止，所以后续会出现应用实例被重启的情况。

### 解决方案

检查容器内进程是否有内存泄漏问题，同时适当调整容器内存的限制值大小。可以结合应用监控来看变化趋势。需要注意的是，容器内存限制值大小不应该过大，否则可能导致极端资源争抢情况下，容器被迫驱逐的问题。

## System OOM encountered

### 原因描述

上述两种OOM（进程OOM，容器OOM）发生后，都可能会伴随一个系统OOM事件，该事件的原因是由上述OOM事件伴随导致。

### 解决方案

需要解决上面进程OOM或者容器CgroupOOM的问题。

## failed to garbage collect required amount of images

### 原因描述

当容器集群中的节点（宿主机）磁盘使用率达到85%之后，会触发自动的容器镜像回收策略，以便于释放足够的宿主机磁盘。该事件发生于当触发镜像回收策略之后，磁盘空间仍然不足以达到健康阈值（默认为80%）。通常该错误是由于宿主机磁盘被占用太多导致。当磁盘空间占用率持续增长（超过90%），会导致该节点上的所有容器被驱逐，也就是当前节点由于磁盘压力不再对外提供服务，直到磁盘空间释放。

### 解决方案：
检查节点的磁盘分配情况，通常有以下一些常见情况导致磁盘占用率过高：

有大量日志在磁盘上没有清理；请清理日志。
有进程在宿主机不停的写文件；请控制文件大小，将文件存储至OSS或者NAS。
下载的或者是其他的静态资源文件占用空间过大；静态资源请存储至OSS或CDN。

## Attempting to xxxx

节点资源不足(EvictionThresholdMet)，一般是节点资源将要达到阈值，可能会触发Pod驱逐。如 Attempting to reclaim ephemeral-storage

### 原因描述

ephemeral storage是临时存储空间，当磁盘空间使用率达到阈值，会触发临时存储空间的回收任务。回收任务会尝试回收系统日志，以及没有正在使用的镜像缓存等数据。当磁盘空间占用率持续增长（超过90%），会导致该节点上的所有容器被驱逐，也就是当前节点由于磁盘压力不再对外提供服务，直到磁盘空间释放。

### 解决方案

请注意磁盘空间的使用：

避免使用“空目录”类型的挂载方式；使用NAS或者其他类似方式替代。
尽量避免使用“宿主机目录”类型的挂载方式，以便于保证容器是无状态的，可以迁移的。
要注意避免在容器内大量写文件，而导致容器运行时可写数据层过大（imagefs）。

## NTP service is not running

### 原因描述

NTP service是系统时间校准服务，由操作系统systemd管理的服务。可以通过 systemctl status chronyd 查看对应服务的状态。

### 解决方案
使用命令systemctl start chronyd尝试重新启动。也可以通过命令 journalctl -u chronyd 查看服务的日志。

## 节点PLEG异常

### 原因描述

PLEG是pod生命周期事件生成器，会记录Pod生命周期中的各种事件，如容器的启动、终止等。一般是由于节点上的daemon进程异常或者节点systemd版本bug导致。出现该问题会导致集群节点不可用

### 解决方案

可以尝试重启kubelet；再尝试重启Docker进程。重启这两个进程过程中，不会对已运行容器造成影响

```bash
//重启kubelet
systemctl restart kubelet

//重启docker
systemctl restart docker

//查看docker日志
journalctl -xeu docker > docker.log
如果是由于systemd版本问题导致，重启节点可短暂修复，彻底解决的话需要升级节点的systemd

systemd: (rpm -qa | grep systemd, 版本<219-67.el7需要升级)
升级systemd指令: 
yum update -y systemd && systemctl daemon-reexec && killall runc
```

## 节点PID不足

### 问题原因

通常是节点上的容器占用PID过多导致节点的PID不足
### 问题现象

当节点的可用PID低于pid.available配置项时，则节点状态中NodePIDPressure为True，同时该节点上的容器被驱逐。关于节点驱逐，请参见节点压力驱逐。
若集群配置了集群节点异常报警，则节点PID不足时可收到相关报警。关于配置报警，请参见容器服务报警管理。
### 解决方案

执行如下命令，查看节点的最大PID数和节点当前的最大PID。

```bash
sysctl kernel.pid_max  #查看最大PID数。
  ps -eLf|awk '{print $2}' | sort -rn| head -n 1   #查看当前的最大PID。
执行如下命令，查看占用PID最多的前5个进程。
ps -elT | awk '{print $4}' | sort | uniq -c | sort -k1 -g | tail -5
预期输出：

#第一列为进程占用的PID数，第二列为当前进程号。
73 9743
75 9316
76 2812
77 5726
93 5691
```

根据进程号找到对应进程和所属的Pod，分析占用PID过多的原因并优化对应代码。
降低节点的负载。具体操作，请参见节点调度资源不足。
如需重启节点，可尝试重启异常节点。具体操作，请参见重启实例。

## 节点FD不足

### 原因描述：

节点文件句柄使用数量超过80%，具体原因与节点上进程使用情况相关打开文件未释放打开管道未释放建立网络连接未释放（pipe,eventpoll多出现在 NIO 网络编程未释放资源 —— selector.close()）创建进程调用命令未释放（Runtime.exe(…) 得到的 Process, InputStream, OutputStream 未关闭，这也会导致 pipe,eventpoll 未释放）

## 解决方案：

删除不需要的文件，调整应用代码，文件流等操作结束后记得关闭。或者尝试先排空再重启主机

## 节点Docker Hung

### 原因描述：

节点docker daemon异常，导致集群无法与之通信，伴随有docker ps、docker exec等命令hung住或异常失败

### 解决方案：

尝试重启docker服务，重启过程不会影响已存在容器的运行

```bash
//重启节点上的docker daemon，对运行中容器没有影响
systemctl restart docker

//查看docker日志
journalctl -xeu docker > docker.log
```

如果docker服务重启后依然无法解决，可以尝试重启主机。主机重启过程会对容器有影响，谨慎操作。

## 节点磁盘资源不足

InvalidDiskCapacity

### 原因描述

节点磁盘不足，无法分配空间给容器镜像

### 解决方案

检查节点的磁盘分配情况，通常有以下一些常见情况导致磁盘占用率过高：

有大量日志在磁盘上没有清理；请清理日志。
有进程在宿主机不停的写文件；请控制文件大小，将文件存储至OSS或者NAS。
下载的或者是其他的静态资源文件占用空间过大；静态资源请存储至OSS或CDN。

## 应用相关

### Container Restart

#### 原因描述：

该事件表示应用实例(重启)重启，一般是由于配置了健康检查且健康检查失败导致，会伴随有Readiness probe failed和Liveness probe failed等事件。健康检查失败的原因有很多，通常情况下，比如进程OOM被Kill、比如高负载情况下应用无法正常响应(例如RDS瓶颈导致应用线程全部hang住)，都可能会导致健康检查失败

#### 解决方案：

需要结合临近的相关事件定位具体的Pod重启原因。如伴随有集群相关的Out of memory事件，参考此文档上面Out of memory事件的解决方案；其他情况下，结合应用监控或者云产品自身监控来定位问题

### The node had condition: [XXX]

#### 原因描述：

该事件表示Pod由于节点上的异常情况被驱逐，比如*The node had condition: [DiskPressure]，*表示节点磁盘使用率比较高，通常会伴随有 failed to garbage collect required amount of images 和 Attempting to reclaim ephemeral-storage 等集群维度(节点)的异常事件

#### 解决方案：

需要结合临近的相关事件定位具体的驱逐原因。对于已经被驱逐的Pod实例，可以通过kubectl get po 进行查看和手动清理

### K8S Pod Pending

#### 原因描述：

该事件表示集群调度Pod被挂起，一般是由于节点资源不足以调度容器或者Volume挂载失败（比如持久化存储卷找不到）或者其他原因导致。

#### 解决方案：

需要结合临近的相关事件定位具体的Pod挂起原因

### Readiness probe failed

#### 原因描述

由于应用就绪探针失败而引发的异常事件。应用就绪探针失败会导致相应容器的流量被摘除，例如被动从SLB摘掉该容器的流量入口。

#### 解决方案

需要结合应用就绪探针的配置，定位应用就绪探针失败的原因。

### Liveness probe failed

#### 原因描述：

由于应用存活探针失败而引发的异常事件。该事件可能会导致后续达到一定阈值之后，容器被动重启。具体要看应用就绪探针的配置。

#### 解决方案：

需要结合应用存活探针的配置，定位探针检查失败的原因。

### Container runtime did not kill the pod within specified grace period.

#### 原因描述：

此事件表示容器没有在优雅下线的时间段内正常退出。比如如果配置了优雅下线脚本，脚本执行时长需要60s，而优雅下线时间（默认为30s）配置为30s。就会在容器下线期间触发这个事件。

#### 解决方案：

调整优雅下线探针的配置，或者优雅下线时间的配置。

### Back-off restarting failed container

#### 原因描述：

此事件表示容器启动失败，而被再次拉起尝试启动。通常常见与应用发布过程中的容器启动失败。具体的原因常见为镜像拉取失败，或者容器启动失败（容器没有打到running状态）。

#### 解决方案：

需要在发布页查看容器启动日志或者调度日志，进一步定位容器启动失败的原因。

### The node was low on resource: xxxx

#### 示例

```bash
2020-07-21 10:24:43.000 [Event] Type: Warning, Reason: Evicted, Message: The node was low on resource: ephemeral-storage. 
```

#### 原因描述：

该事件表示Pod由于节点上的异常情况(资源不足)被驱逐

#### 解决方案

需要看具体哪类资源不足，例如示例中的ephemeral-storage，表示集群节点临时存储空间不足，一般是由于磁盘使用量较大导致。请参考文档上方解决方案

检查节点的磁盘分配情况，通常有以下一些常见情况导致磁盘占用率过高：

有大量日志在磁盘上没有清理；请清理日志。
有进程在宿主机不停的写文件；请控制文件大小，将文件存储至OSS或者NAS。
下载的或者是其他的静态资源文件占用空间过大；静态资源请存储至OSS或CDN。
可以对系统盘进行扩容，扩大磁盘空间。

### 集群DNS性能瓶颈

#### 背景

集群中的容器实例，DNS解析均依赖集群内的DNS组件，应用中业务请求的地址都需要经过集群DNS组件。例如，代码中访问RDS、REDIS、TOP api等。如果集群dns性能不足，会出现业务请求失败的问题。

集群DNS组件：

默认已安装的集群组件为coredns，副本数为2
可选的高性能组件为localdns

#### 是否有性能瓶颈

应用有大量DNS请求的场景(比如连接rds，凡是涉及到域名地址解析的)
PHP等语言自身没有连接池特性的，或者应用自身没有DNS缓存的
偶尔出现域名地址无法解析错误的

#### 解决方案

一、集群默认已安装的coredns组件，进行扩容。扩容比例为1/5的节点数(如15台ecs，那么coredns数量为3)

二、为集群安装更高性能的localdns组件(该组件为daemonset，会在每个ECS节点起一个本地缓存)

一般来说，如果业务量小，扩容下coredns就足够了；如果业务量大(域名地址解析QPS高，比如访问RDS)，特别是php等不带连接池的开发语言，建议直接上localdns。如果是java等配置了连接池的应用，可以先扩容coredns观察，如果仍然有解析问题，再上localdns。

### localdns缓存原理

NodeLocalDNS 是一个 DaemonSet，会在Kubernetes集群的每个节点上运行一个专门处理 DNS 查询请求的 Pod，该 Pod 会将集群内部域名查询请求发往 CoreDNS；将集群外部请求直接发往外部域名解析服务器。同时能够Cache所有请求。可以被看作是节点级别的高效DNS 缓存，能够大幅提高集群整体 DNS 查询的 QPS。NodeLocalDNS 会在集群的每个节点上创建一个专用的虚拟接口（接口绑定的 IP 需要通过 local_dns_ip 这个值来指定），节点上所有发往该 IP 的 DNS 查询请求都会被拦截到 NodeLocalDNS Pod 内进行处理；通过集群原有的 kube-dns 服务（该服务的 clusterIP 值需要通过kube_dns_ip来指定）来与CoreDNS进行通信。
![image](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/image.png)