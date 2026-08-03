---
title: CGroups 以及在 K8s 中的应用 - IO
date: 2023-07-28 09:40:33
type: categories
tags: 
    - kubernetes
    - CGroups
keywords: 
    - kubernetes
    - CGroups
categories: 
    - kubernetes
---

cgroups（control groups，控制组群） 是 Linux 内核的一个功能，用来限制、控制与分离一个进程组的资源（如CPU、内存、磁盘输入输出等）。cgroups到目前为止，有两个大版本， 即 v1 和 v2 。本文针对cgroups对IO的限制能力做简单介绍。

cgroups v1介绍
我们当前的测试环境为centos 7.9 ，内核为 5.4版本，如下所示：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241654935.png)

## **cgoups资源限制测试**

### **网络IO资源限制**

#### **tc**(Traffic Control)命令

tc(Traffic Control) 是linux系统中常用的来控制传输速率、模拟网络延时丢包等场景的工具，tc命令有三个主要的概念，是qdisc、class和filter，qdisc又分为classless qdisc和classful qdisc，在控制传输速度的方面大致有两种用法

（1）对于classless qdisc，可以直接给网络接口直接添加，作为限流的工具

（2）对于classful qdisc，然后class和filter以这个classful qdisc为父节点，其中filter作为过滤器把流量分到具体的class，然后在最后的subclass挂一个classless qdisc作为流量输出

下面我们开始测试，首先创建一个网络命名空间，并在空间内增加一个IP 10.42.1.1

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241655379.png)

参考如下命令，使用tbf令牌桶过滤队列限制出口和入口的流量，其中ingress的流量限制要借助ifb设备：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241655240.png)

首先进行egress（出口，从当前进程到网卡）限制流量测试，打开一个会话，使用iperf创建一个server

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241655985.png)

再打开一个会话，创建一个client测试，结果如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241656571.png)

然后进行ingress（入口，从网卡到当前进程）限制流量测试，打开一个会话，使用iperf创建一个server

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241656710.png)

再打开一个会话，创建一个client测试，结果如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241656946.png)

可以看到流量进出网络命名空间 ns0 的时候流量大致被限制在了1Mbits/s。注意，测试时间要长一点，不然结果可能会看上去大于1Mbits，这是因为我们配置的tbf队列的burst值为21474835 bytes（约20Mbytes），在一开始会提供较为充足的缓冲，

#### **网络IO限速cgroups：****net_cls**

net_cls子资源能够给网络报文打上一个标记（classid），即通过将等级识别符（classid）配置到net_cls.classid文件中，这样内核的 tc模块就识别来自特定 cgroups任务的数据包，并进行网络限制。。

net_cls.classid从文件中读取是的十进制，写入的时候需要是十六进制。比如，0x100001写入到文件中，读取的将是 1048577， ip 命令操作的形式为 10:1。这个值的格式为 0xAAAABBBB，一共 32 位，分成前后两个部分，前置的 0 可以忽略，因此 0x10001 和 0x00010001 一样，表示为 1:1。

我们清理掉添加的上面创建的队列，参考如下命令重新创建队列：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241657751.png)

将classid配置到cgroups中

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241657631.png)

打开一个会话，使用iperf创建一个server

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241657146.png)

再打开一个会话，创建一个client测试，结果如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241657181.png)

可以看到egress流量被限制在了10M。

我们尝试按照类似的方式把限制加载ifb0设备上，企图以此实现限制egress流量，遗憾的是没有成功，对于cgroups的方式，暂时没找到很好的限制ingress流量的方案。感觉cgroups在流量限制上的设计有些多余，可以完全被tc命令取代。

### **磁盘IO资源限制**

#### **软限制：适用于bfq磁盘调度算法**

调整磁盘调度算法为bfq，并清理缓存

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241658396.png)

打开一个会话，分别创建cgroups test01，设置test01对于磁盘/dev/sda的权重为100，

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241658885.png)

新建一个会话，创建cgroups test02，设置test02对于磁盘/dev/sda的权重为500，

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307241658144.png)

上面的 8:0 是设备的major和minor（不同机器设备号不同，需根据实际情况测试），如下图标红内容所示：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250823805.png)

这两个会话的的进程号不同，且分别设置的cgroups，下面开始测试磁盘读写速度。

使用dd命令在两个会话同时测试读写速度，第一个会话测试写入600M，第二个会话测试写入3000M，会话一测试结果如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250823121.png)

会话二测试结果如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250824882.png)

可以看到两个会话几乎同时开始、完成写文件测试，在两个会话同时写入时，会话1写入速度约为14M/s，会话2写入速度约为70M/s，1：5的比例基本和我们的权重规划保持一致。

测试读，会话1结果如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250824831.png)

会话2测试结果如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250824493.png)

读也基本符合1：5的权重设置。

现在我们尝试修改磁盘调度算法为 mq-deadline

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250824759.png)

修改后，会话1和会话2再次测试读写，数据大小都为600M，会发现两个会话读写速度一致，检查权重配置，发现配置已消失，而且也无法修改，如下所示：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250824607.png)

可知，这种限制方式类似于前面介绍过CPU的share的概念，而且只能运行在bfq磁盘调度算法下，而对于对数据库友好的deadline磁盘调度算法下就无法使用了。

#### **硬限制：限制iops和读写速度**

限制读写速度为10M，参考如下命令

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250825495.png)

使用dd命令测试读写，测试结果如下所示

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250825671.png)

可以看到读写速度差不多限制在了10M。

使用fio命令测试IOPS，需要先安装fio，

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250825652.png)

设置cgroups的iops的限制

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250826038.png)

使用如下命令测试

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250826828.png)

测试结果大致如下

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250826541.png)

可以看到fio测试的结果，磁盘的读写IOPS被限制在了20以下。其中cgroup设备号不能是分区，可以是物理磁盘和lvm卷。

回退命令参考下面，把对应的值置零即可：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250827581.png)

## **K****u****bernetes****中的资源限制**

当前我们测试基于cgroup v1进行测试测试，截至 v1.26，Kubernetes 还不支持 IO 隔离，可能有些CSI插件能做到对PVC的IO限制，笔者没有对此进行充分的调研，因此暂时不做介绍。本文在Kubernetes中的测试都是使用sealos部署的v1.25.9版本的Kubernetes。

### **网络IO限制**

在前面的分析中，我们看到，我们可以使用tc命令限制网络IO，这样的限制方案要直接对容器相关的veth pair进行操作，可以想到这样的限制依赖于网络插件，这里我们使用的calico作为网络插件进行测试，启动一个iperf的pod，yaml大致如下

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250827016.png)

此时，pod的IP为 100.76.78.195 ，使用iperf测试流量

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250827132.png)

可以看到网络流量被限制在了1Mbit/s。

查看pod运行在主机上的进程的cgoups配置，

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250828544.png)

可以看到，calico的网络限制方案是直接作用在了网卡上，没有使用cgroups。

再使用tc命令查看是如何对网卡的流量进行限制，如下所示

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250828411.png)

这样的限制和我们前面在介绍tc命令时基本一致，给 caliaf855cec203 设备增加一个tbf 队列，限制egress流量，对于ingress流量则转发到设备bwp67c498bee652上，并给该设备增加一个tbf队列，以限制ingress流量。

当前我们仅测试了calico，不同CNI插件限制网络流量的方式可能有所区别，calico的流量限制方案并没有借助cgroups。

## cgroupsv****2****介绍**

cgroups v2 在 Linux Kernel 4.5中被引入，并且考虑到其它已有程序的依赖，V2 会和 V1 并存几年。当前很多的操作系统版本中，默认的cgroups仍是v1版本，下面我们进行切换，并进行测试。

### **磁盘****IO资源隔离**

需要注意的，cgroups v1 的 blkio 控制子系统，可以用来限制容器中进程的读写的 IOPS 和吞吐量（Throughput），但是它**只能对于 Direct I/O 的读写文件做磁盘限速，对** **Buffer** **I/O 的文件读写，它无法进行磁盘限速。**

Linux 有两种文件 I/O 模式：Direct I/O 和 Buffer I/O。Direct I/O 模式，进程如果要写磁盘文件，就会通过 Linux 内核的文件系统层 (filesystem) 、块设备层 (block layer) 、磁盘驱动最后写入磁盘硬件。

而Buffer I/O 模式，进程只是把文件数据写到内存中（Page Cache）就返回了，而 Linux 内核的线程会把内存中的数据刷到到磁盘中。考虑到性能问题，很多应用都会使用 Buffer I/O 模式。

我们可以把 fio 命令中的 “-direct=1” 或者dd命令中的oflag=direct给去掉，就可以测试 Buffer I/O 模式下的写入效果。同时可以运行一些常见的性能监控空命令（iostat/dstat等），查看实际的磁盘写入速度，会发现这个时候 blkio cgroups已经不能限制磁盘的吞吐量了。这是主要是因为它被 cgroups v1 的架构限制了。cgroups v1 中，它的每一个子系统都是独立的，资源限制只能在子系统中发生。针对上述例子来说，Buffer I/O 会把数据先写入到内存 Page Cache 中，然后由内核线程把数据写入磁盘，**但是 cgroup****s****v1 blkio 的子系统独立于 memory 子系统，无法统计到由 Page Cache 刷入到磁盘的数据量。**

cgroups v2从架构上允许一个控制组里有多个子系统协同运行。这样，如果一个控制组里同时设置了 io 和 Memory 子系统，那么就可以对 Buffer I/O 作磁盘读写的限速。

#### **Page Cache****简述**

Linux 的各个模块都需要内存，比如内核需要分配内存给页表，内核栈，还有 slab，也就是内核各种数据结构的 Cache Pool；用户态进程里的堆内存和栈的内存，共享库的内存，还有文件读写的页缓存（Page Cache）。

在 Linux 系统里只要有空闲的内存，系统就会自动地把读写过的磁盘文件页面放入到 Page Cache 里。Page Cache 的主要作用是提高磁盘文件的读写性能，因为系统调用 read() 和 write() 的缺省行为都会把读过或者写过的页面存放在 Page Cache 里。为避免内存都被 Page Cache 占用了，Linux 的内存管理有一种内存页面回收机制（page frame reclaim），会根据系统里空闲物理内存是否低于某个阈值，来决定是否启动内存的回收。

对于 Buffer I/O，用户的数据是先写入到 Page Cache 里的。而这些写入了数据的内存页面，在它们没有被写入到磁盘文件之前，就被叫作 dirty pages。Linux 内核会有专门的内核线程（每个磁盘设备对应的 kworker/flush 线程）把 dirty pages 写入到磁盘中。这个过程收到如下系统参数影响：

l参数 vm.dirty_background_bytes 和 vm.dirty_background_ratio ，用来定义的是 dirty pages 内存的临界值，超过这个临界值，内核 flush 线程就会把 dirty pages 刷到磁盘里。两个参数只需要设置一个那么另一个会被自动置零，用来定义的是 dirty pages 内存的临界值。

l参数 vm.dirty_bytes 和 vm.dirty_ratio ，用来定义一个阈值，超过这个阈值之后，正在执行 Buffer I/O 写文件的进程就会被阻塞住，直到它写的数据页面都写到磁盘为止。两个参数只需要设置一个那么另一个会被自动置零，用来定义的是 dirty pages 内存的临界值。

lvm.dirty_writeback_centisecs 这个参数的值是个时间值，以百分之一秒为单位，缺省值是 500，也就是 5 秒钟。它表示每 5 秒钟会唤醒内核的 flush 线程来处理 dirty pages。

lvm.dirty_expire_centisecs，这个参数也是以百分之一秒为单位，缺省值是 3000，也就是 30 秒钟。它定义了 dirty page 在内存中存放的最长时间，如果一个 dirty page 超过这里定义的时间那么内核的 flush 线程也会把这个页面写入磁盘。

下面我们开始测试。

#### **测试IO写入：仅限制IO**

对于cgroups v2版本，使用文件io.max进行IO的限制，其中：wbps，写速率限制；rbps，读速率限制；riops，读iops限制；wiops，写iops限制。在一条命令中可以写多个限制，比如：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250828960.png)

首先创建cgroups组，并限制写入速度，253:2 是笔者本地的设备号，，如下所示：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250829971.png)

进入设备（上面的253:2）挂载的目录，执行如下命令进行测试：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250829598.png)

同时打开一个新的会话，执行如下脚本监控IO数据

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250829519.png)

我们会发现，这时dd很快就把数据写到了缓存里。如下所示：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250829644.png)

要看到限速效果，则需查看监控脚本的结果大致如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250830711.png)

可以看到，大概是每隔一段时间，增加一次IO，平均下来大致是8M/s的速度，写入速度基本符合我们的预期，即进程产生的Buffer I/O在落盘的时候，受到blkio cgroups的限制。现在让我困惑的是，为什么虽然缓存写入磁盘的速度是受限的，但是却可以一次写入几十M？

经过查阅资源，笔者看到有些文档里有如此解释：“***在异步写的场景中，当脏页达到一定比例，就需要通过通用块层把页缓存里的数据回刷到磁盘中。bio层记录了磁盘块与内存页之间的关系，在request层把多个物理块连续的bio合并成一个request，然后根据特定的IO调度算法对系统内所有进程产生的IO请求进行合并、排序。\******”\*** 这也许能解释一次IO写入几十M的原因，由于能力和时间所限，笔者对此没有做进一步的研究和确认。

对比测试cgroups v1版本，执行如下命令进行写入速度限制：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250830221.png)

执行如下命令测试

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250830383.png)

同时，打开一个新的窗口使用dstat命令监控写入速度，命令参考下面（磁盘根据实际情况）：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250830625.png)

会话1结果如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250830938.png)

会话2结果如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250831224.png)

容易看到对于Buffer I/O的写入，cgroups v1没有做到有效的限制。

#### **测试IO写入：限制内存和IO**

重启机器，重新创建cgroups组，限制写入速度和内存（2M）如下所示：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250831217.png)

进入设备（253:2）挂载的目录，执行如下命令进行测试：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250831709.png)

同时打开一个新的会话，执行上面监控IO的脚本

dd命令执行的会话，结果如下所示：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250831061.png)

另一个监控test01这个cgroups的io状态的会话，结果大致如下所示：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250831033.png)

可以看到每秒写入的数据量大概是2M，符合我们的预期。

除此之外，标记了direct的io事件限速效果根之前一样，如下所示：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250832307.png)

再次对比测试cgroups v1版本，执行如下命令进行资源限制：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250832463.png)

执行dd令进行测试，进程会出现类似OOM的报错，不同内核、系统版本、系统参数下报错可能有所区别。大致在/var/log/message里能看到如下类似信息

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202307250832826.png)

综上，在对容器限制内存大小的时候，不仅要考虑容器中进程实际使用的内存量，还要考虑容器中程序 IO 的量，合理预留足够的内存作为 Buffer I/O 的 Page Cache。如果内存设置得比较小，而容器中的进程又有很大量的 I/O，这样申请新的 Page Cache 内存的时候，又会不断释放老的内存页面，可能也会带来额外的系统开销。对于cgroup v1版本，大量的Buffer I/O可能会导致OOM。

## **总结**

本文对cgroups v1和v2版本对IO的限制能力做了简单的介绍，但对其在kubernetes中的应用没有做深入的调研，个人学习到了一些东西的同时也有了更多的困惑。最后，由于笔者能力和时间所限，难免存在一些错漏，也缺乏对一些功能的源码级分析，对于不同系统和内核版本在不同硬件和参数配置下对不同资源类型的测试也存在不充分的地方，还请谅解。

## **参考**

1)一篇搞懂容器技术的基石： cgroup,<https://zhuanlan.zhihu.com/p/434731896>

2)Linux cgroups：深入理解cgroups v1版本, <https://www.testerfans.com/archives/linux-cgroups-learn-more>

3)Linux CFS and task group, <https://mechpen.github.io/posts/2020-04-27-cfs-group/index.html>

4)深入理解 Kubernetes 资源限制：CPU, <https://icloudnative.io/posts/understanding-resource-limits-in-kubernetes-cpu-time/>

5)CFS Bandwidth Control，<https://www.kernel.org/doc/html/v5.4/scheduler/sched-bwc.html?highlight=cpu%20cfs_quota_us>

6)Cgroup详解，<https://juejin.cn/post/6921299245685276686>

7)Cgroup限制内存与节点的删除，<https://chaochaogege.com/2019/09/11/6/>

8)容器内存分析，<https://blog.csdn.net/u012986012/article/details/105291831>

9)控制组详解，<https://blog.gmem.cc/cgroup-illustrated>

10)Cgroup V2 and writeback support，<http://hustcat.github.io/cgroup-v2-and-writeback-support/>

11)Linux CGroup 基础，<https://wudaijun.com/2018/10/linux-cgroup/>

12)详解Cgroup V2，<https://zorrozou.github.io/docs/%E8%AF%A6%E8%A7%A3Cgroup%20V2.html>

13)centos 7 升级 systemd，<https://lqingcloud.cn/post/systemd-01/>

14)容器-cgroup-blkio-cgroup，<http://119.23.219.145/posts/%E5%AE%B9%E5%99%A8-cgroup-blkio-cgroup/>

15)打通IO栈：一次编译服务器性能优化实战, <https://mp.weixin.qq.com/s?__biz=Mzg2OTc0ODAzMw==&mid=2247502495&idx=1&sn=26950b22cba383b14052b441cd356516&source=41#wechat_redirect>

16)pod资源限制和QoS探索, <https://www.zerchin.xyz/2021/01/31/pod%E8%B5%84%E6%BA%90%E9%99%90%E5%88%B6%E5%92%8CQoS%E6%8E%A2%E7%B4%A2/>
