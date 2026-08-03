---
title: Ceph 环境部署
date: 2023-01-05  08:54:38
type: categories
tags: 
    - Ceph
keywords: 
    - Ceph
categories: 
    - Ceph
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301101629307.png
---

## 一、概述

> Ceph 是当前非常流行的开源分布式存储系统，具有高扩展性、高性能、高可靠性等优点，同时提供**块存储服务**(`rbd`)、**对象存储服务**(`rgw`)以及**文件系统存储服务**(`cephfs`)，Ceph 在存储的时候充分利用存储节点的计算能力，在存储每一个数据时都会通过计算得出该数据的位置，尽量的分布均衡。目前也是 OpenStack 的主流后端存储。

特点：

- **高性能**

  - 摒弃了传统的集中式存储元数据寻址的方案，采用 CRUSH 算法，数据分布均衡，并行度高。
  - 考虑了容灾域的隔离，能够实现各类负载的副本放置规则，例如跨机房、机架感知等。
  - 能够支持上千个存储节点的规模，支持 TB 到 PB 级的数据。

- **高可用性**

  - 副本数可以灵活控制。
  - 支持故障域分隔，数据强一致性
  - 多种故障场景自动进行修复自愈。
  - 没有单点故障，自动管理。

- **高可扩展性**

  - 去中心化。
  - 扩展灵活。
  - 随着节点增加而线性增长。

- **特性丰富**

  - 支持三种存储接口：块存储、文件存储、对象存储。
  - 支持自定义接口，支持多种语言驱动。

> [**Ceph GitHub 地址**](https://github.com/ceph/ceph)
> [**官方文档**](https://docs.ceph.com/en/latest/start/intro)

## 二、Ceph 架构

支持三种接口：

- `Object`：有原生的 API，而且也兼容 Swift 和 S3 的 API。
- `Block`：支持精简配置、快照、克隆。
- `File`：Posix 接口，支持快照。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301060831168.png)

- `RADOS`——全称 Reliable Autonomic Distributed Object Store，即可靠的、自动化的、分布式对象存储系统。RADOS 是 Ceph 集群的精华，用户实现数据分配、Failover 等集群操作。
- `Librados`——Rados 提供库，因为 RADOS 是协议很难直接访问，因此上层的 RBD、RGW 和 CephFS 都是通过 librados 访问的，目前提供 PHP、Ruby、Java、Python、C 和 C++支持。
- `MDS`——存储 Ceph 文件系统的元数据。

## 三、Ceph 核心组件介绍

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301060830107.png)

- `OSD`——OSD 是负责物理存储的进程，一般配置成和磁盘一一对应，一块磁盘启动一个 OSD 进程。主要功能是存储数据、复制数据、平衡数据、恢复数据，以及与其它 OSD 间进行心跳检查，负责响应客户端请求返回具体数据的进程等。

> OSD 是 Ceph 集群中存储实际用户数据的惟一组件，通常，一个 OSD 守护进程绑定到集群中的一个物理磁盘。因此，通常来说，Ceph 集群中物理磁盘的总数与在每个物理磁盘上存储用户数据的 OSD 守护进程的总数相同。

- `PG`——ceph 中引入了 PG（placement group)的概念，PG 是一个虚拟的概念而已，并不对应什么实体。ceph 先将 object 映射成 PG，然后从 PG 映射成 OSD。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301060831010.png)

- `Pool`——Pool 是存储对象的逻辑分区，它规定了数据冗余的类型和对应的副本分布策略，支持两种类型：副本（replicated）和 纠删码（ Erasure Code）。

Pool、PG 和 OSD 的关系：

```bash
一个Pool里有很多PG；
一个PG里包含一堆对象，一个对象只能属于一个PG；
PG有主从之分，一个PG分布在不同的OSD上（针对三副本类型）;
```

- `Monitor监控`——一个 Ceph 集群需要多个 Monitor 组成的小集群，它们通过 Paxos 同步数据，用来保存 OSD 的元数据。负责监控整个 Ceph 集群运行的 Map 视图（如 OSD Map、Monitor Map、PG Map 和 CRUSH Map），维护集群的健康状态，维护展示集群状态的各种图表，管理集群客户端认证与授权。
- `MDS`——MDS 全称 Ceph Metadata Server，是 CephFS 服务依赖的元数据服务。负责保存文件系统的元数据，管理目录结构。对象存储和块设备存储不需要元数据服务；如果不使用 CephFS 可以不安装。
- `Mgr`——ceph 官方开发了 ceph-mgr，主要目标实现 ceph 集群的管理，为外界提供统一的入口。例如 cephmetrics、zabbix、calamari、prometheus。

Ceph manager 守护进程(Ceph -mgr)是在 Kraken 版本中引入的，它与 monitor 守护进程一起运行，为外部监视和管理系统提供额外的监视和接口。

- `RGW`——RGW 全称 RADOS gateway，是 Ceph 对外提供的对象存储服务，接口与 S3 和 Swift 兼容。
- `CephFS`——ceph 文件系统提供了一个符合 posix 标准的文件系统，它使用 Ceph 存储集群在文件系统上存储用户数据。与 RBD（块存储）和 RGW（对象存储）一样，CephFS 服务也作为 librados 的本机接口实现。

## 四、Ceph 三种存储类型

### 1）块存储服务(RBD)

> 块是一个字节序列（通常为 512）。基于块的存储接口是一种成熟且常见的数据存储方式 介质包括硬盘、固态硬盘、CD、软盘，甚至磁带。块设备接口的无处不在非常适合交互 具有包括 Ceph 在内的海量数据存储。Ceph 数据块设备可精简配置、可调整大小，并按条带方式存储数据在多个 OSD。

**优点：**

- 通过 Raid 与 LVM 等手段，对数据提供了保护；
- 多块廉价的硬盘组合起来，提高容量；
- 多块磁盘组合出来的逻辑盘，提升读写效率；

**缺点：**

- 采用 SAN 架构组网时，光纤交换机，造价成本高；
- 主机之间无法共享数据；

**使用场景：**

- docker 容器、虚拟机磁盘存储分配；
- 日志存储；
- 文件存储；

> 总结：一个 Linux 内核级的块设备，允许用户像任何其他 Linux 块设备一样访问 Ceph。

### 2）文件系统存储服务(CephFS)

> Ceph 文件系统（CephFS），是建立在 Ceph 分布式对象存储的顶部， CephFS 提供了最先进的、多用途、高度可用且高性能的文件存储在各种场景应用，包括共享 home 目录、FTP 和 NFS 共享存储等等。

Ceph 有了块存储，为什么还需要文件系统接口呢？

> 主要是因为应用场景的不同,Ceph 的块设备具有优异的读写性能,但不能多处挂载同时读写,目前主要用在 OpenStack 上作为虚拟磁盘,而 Ceph 的文件系统接口读写性能较块设备接口差,但具有优异的 共享性。

**优点：**

- 造价低，随便一台机器就可以了。
- 方便文件共享。

**缺点：**

- 读写速率低。
- 传输速率慢。

**使用场景：**

- 日志存储。
- 有目录结构的文件存储。

### 3）对象存储服务(RGW)

> Ceph 对象网关 是构建在 librados.它在应用程序和 Ceph 之间提供了一个 RESTful 网关。存储集群。Ceph 对象存储 支持两种接口：

- S3 兼容：通过接口提供对象存储功能 与 Amazon S3 RESTful API 的大部分子集兼容。
- 快速兼容：通过接口提供对象存储功能 与 OpenStack Swift API 的一大块子集兼容。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301060831541.png)

**优点：**

- 具备块存储的读写高速。
- 具备文件存储的共享等特性。

**使用场景：**

- 图片存储。
- 视频存储。

## 五、Ceph 版本发行生命周期

Ceph 从`Nautilus`版本（14.2.0）开始，每年都会有一个新的稳定版发行，预计是每年的 3 月份发布，每年的新版本都会起一个新的名称（例如，“Mimic”）和一个主版本号（例如，13 代表 `Mimic`，因为“M”是字母表的第 13 个字母）。

版本号的格式为`x.y.z`，x 表示发布周期（例如，13 代表 Mimic，17 代表 Quincy），y 表示发布版本类型，即

- x.0.z - y 等于 0，表示开发版本
- x.1.z - y 等于 1，表示发布候选版本（用于测试集群）
- x.2.z - y 等于 2，表示稳定/错误修复版本（针对用户）

在`Octopus`版本后使用 cephadm 来部署 ceph 集群，如果使用 cephadm 部署，在后期新的版本升级时，可以做到完全自动化，并可以通过 ceph -W cephadm 查看升级进度，升级完成后，无法降级，升级时请不要跨版本升级，例如：当前使用 Octopus 升级到 Quincy，要先把 Octopus 升级到 Pacific，然后在升级至 Quincy，这是最稳妥的方式。

稳定版本的生命周期在第一个发布月份后，大约 2 年时间将停止该版本的更新维护，具体版本发布时间见下表。

## 六、Ceph 集群部署

Ceph 的部署工具：

- `ceph-deploy`：官方的部署工具，不再积极维护 ceph-deploy。它不支持 RHEL8，CentOS 8 或更新的操作系统。
- `ceph-ansible`：红帽的部署工具
- `ceph-chef`：利用 chef 进行自动部署 Ceph 的工具
- `puppet-ceph`：puppet 的 ceph 模块
- `cephadm`——cephadm 仅支援 Octopus 及更新版本（推荐）。

### 1）集群部署规划

|       IP        |     hostname      |          角色           | 磁盘  | 操作系统 |
| :-------------: | :---------------: | :---------------------: | :---: | :------: |
| 192.168.182.130 | local-168-182-130 | monitor,mgr,rgw,mds,osd | 2*20G | centos7  |
| 192.168.182.131 | local-168-182-131 | monitor,mgr,rgw,mds,osd | 2*20G | centos7  |
| 192.168.182.132 | local-168-182-132 | monitor,mgr,rgw,mds,osd | 2*20G | centos7  |

- `monitor`：Ceph 监视管理节点，承担 Ceph 集群重要的管理任务，一般需要 3 或 5 个节点。
- `mgr`：Ceph 集群管理节点（manager），为外界提供统一的入口。
- `rgw`: Ceph 对象网关，是一种服务，使客户端能够利用标准对象存储 API 来访问 Ceph 集群。
- `mds`：Ceph 元数据服务器，MetaData Server，主要保存的文件系统服务的元数据，使用文件存储时才需要该组件。
- `osd`：Ceph 存储节点 Object Storage Daemon，实际负责数据存储的节点。

### 2）前期准备

#### 1、关闭 filewalld 服务

```bash
systemctl stop firewalld.service
systemctl disable firewalld.service
```

#### 2、关闭并禁用 SELinux

```bash
sed -i 's/^SELINUX=enforcing$/SELINUX=disabled/' /etc/selinux/config
setenforce 0
```

#### 3、配置 hosts

```bash
192.168.182.130 local-168-182-130
192.168.182.131 local-168-182-131
192.168.182.132 local-168-182-132
```

#### 4、ssh 免密配置

```bash
ssh-keygen
# ...一路Enter
ssh-copy-id root@local-168-182-130  //会有一次密码输入
ssh-copy-id root@local-168-182-131
ssh-copy-id root@local-168-182-132
```

#### 4、配置时间同步

```bash
yum install -y chrony
systemctl enable --now chronyd
```

### 3）添加磁盘

如果添加完磁盘，看不到，可以执行以下命令：

```bash
# 重新扫描SCSI总线添加设备
echo "- - -" > /sys/class/scsi_host/host0/scan
echo "- - -" > /sys/class/scsi_host/host1/scan
echo "- - -" > /sys/class/scsi_host/host2/scan
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301060832769.png)

### 4）安装 docker :（所有节点操作，包括新增）

```bash
# centos7
wget -O /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-7.repo

# 安装yum-config-manager配置工具
yum -y install yum-utils
# 设置yum源
yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
# 安装docker-ce版本
yum install -y docker-ce

#启动docker服务并开机自启
systemctl enable --now docker

# 查看版本号
docker --version
# 查看版本具体信息
docker version

# Docker镜像源设置
# 修改文件 /etc/docker/daemon.json，没有这个文件就创建
# 添加以下内容后，重启docker服务：
cat >/etc/docker/daemon.json<<EOF
{
   "registry-mirrors": ["http://hub-mirror.c.163.com"]
}
EOF

systemctl restart docker
```

### 5）安装 cephadm

下载 cephadm 脚本：（只在主节点操作）

```bash
mkdir -p /opt/ceph/my-cluster ; cd /opt/ceph/my-cluster
curl --silent --remote-name --location https://github.com/ceph/ceph/raw/octopus/src/cephadm/cephadm  -o cephadm
chmod +x cephadm
# 或者：
#curl https://raw.githubusercontent.com/ceph/ceph/v15.2.1/src/cephadm/cephadm -o cephadm
#chmod +x cephadm
#//**//下载出错：配置/etc/hosts 文件--—> 199.232.28.133 raw.githubusercontent.com

# 安装python3:（所有节点执行）
yum install python3 -y

# 配置ceph存储库  ：（或指定版本）
./cephadm add-repo --release octopus
#或
#./cephadm add-repo --version 15.2.1

# 开始安装ceph-common，ceph工具
./cephadm install ceph-common ceph
# 安装cephadm工具
./cephadm install
which cephadm
which ceph
```

### 6）初始化 ceph 集群

当前节点安装 mon、 mgr 角色,部署 prometheus、 grafana、 alertmanager、 node-exporter 等服务。

```bash
#先安装一个节点，其它节点通过后面的命令添加到集群中即可
#您需要知道用于集群的第一个监视器守护程序的IP地址。
#如果有多个网络和接口，要确保选择任何可供访问Ceph群集的主机访问的网络和接口。

cephadm bootstrap --mon-ip 192.168.182.130

##### 命令特点：

#在本地主机上为新集群创建监视和管理器守护程序。
#为Ceph集群生成一个新的SSH密钥，并将其添加到root用户的/root/.ssh/authorized_keys文件中。
#将与新集群进行通信所需的最小配置文件编写为/etc/ceph/ceph.conf。
#将client.admin管理密钥的副本写入/etc/ceph/ceph.client.admin.keyring。
#将公用密钥的副本写入 /etc/ceph/ceph.pub。

# 查看部署的服务
docker ps

#=======输出信息=======
Ceph Dashboard is now available at:

             URL: https://local-168-182-130:8443/
            User: admin
        Password: 0ard2l57ji

You can access the Ceph CLI with:

        sudo /usr/sbin/cephadm shell --fsid d1e9b986-89b8-11ed-bec2-000c29ca76a9 -c /etc/ceph/ceph.conf -k /etc/ceph/ceph.client.admin.keyring

Please consider enabling telemetry to help improve Ceph:

        ceph telemetry on

For more information see:

        https://docs.ceph.com/docs/master/mgr/telemetry/
```

根据提示可知，有个 web 地址：`https://ip:8443/`，这里的截图是部署完之后的截图。
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301060832172.png)

通过 ceph 命令查看集群状态

```bash
ceph -s
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301060832202.png)

### 7）添加新节点

在新主机的根用户 authorized_keys 文件中安装群集的公共 SSH 密钥 ：

```bash
ssh-copy-id -f -i /etc/ceph/ceph.pub root@local-168-182-131
ssh-copy-id -f -i /etc/ceph/ceph.pub root@local-168-182-132
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301060832101.png)

配置新节点

```bash
ceph orch host add local-168-182-131
ceph orch host add local-168-182-132

#第一次部署新节点时直接用上边的命令即可：
#但是之后的节点新增有可能上述命令出错：
ceph orch host add local-168-182-131 192.168.182.133  #后边跟上对应的IP

# 查看节点
ceph orch host ls
```

### 8）部署监视器（monitor）

```bash
# ceph orch apply mon *<number-of-monitors>*
# 确保在此列表中包括第一台（引导）主机。
ceph orch apply mon local-168-182-130,local-168-182-131,local-168-182-132
```

### 9）部署 osd

存储设备清单可以显示为：

```bash
ceph orch device ls
```

可用存储设备的条件：

- 设备必须没有分区。
- 设备不得具有任何 LVM 状态。
- 不得安装设备。
- 该设备不得包含文件系统。
- 该设备不得包含 Ceph BlueStore OSD。
- 设备必须大于 5 GB。

#### 创建 osd 的方式

```bash
# 【第一种方式】告诉Ceph使用任何可用和未使用的存储设备：
ceph orch apply osd --all-available-devices

# 【第二种方式】或者使用下面命令指定使用的磁盘（推荐使用这种方式吧）
#1. ceph orch daemon add osd *<host>*:*<device-path>*
#例如：
#从特定主机上的特定设备创建OSD：
ceph orch daemon add osd local-168-182-130:/dev/sdb
ceph orch daemon add osd local-168-182-130:/dev/sdc

ceph orch daemon add osd local-168-182-131:/dev/sdb
ceph orch daemon add osd local-168-182-131:/dev/sdc

ceph orch daemon add osd local-168-182-132:/dev/sdb
ceph orch daemon add osd local-168-182-132:/dev/sdc
```

#### 删除 OSD 节点:(安全)

```bash
#1.停止osd进程
ceph osd stop x  //(x 可以通过ceph osd ls 查看)
#停止osd的进程，这个是通知集群这个osd进程不在了，不提供服务了，因为本身没权重，就不会影响到整体的分布，也就没有迁移
#2.将节点状态标记为out
ceph osd out osd.x
#停止到osd的进程，这个是通知集群这个osd不再映射数据了，不提供服务了，因为本身没权重，就不会影响到整体的分布，也就没有迁移
#3. 从crush中移除节点
ceph osd crush remove osd.x
这个是从crush中删除，
#4. 删除节点
ceph osd rm osd.x
这个是从集群里面删除这个节点的记录ls
#5. 删除节点认证（不删除编号会占住）
ceph auth del osd.x
这个是从认证当中去删除这个节点的信息
```

### 10）部署 mds(cephFS 元数据守护程序)

```bash
# ceph orch apply mds *<fs-name>* --placement="*<num-daemons>* [*<host1>* ...]"

ceph orch apply mds myfs --placement="3 local-168-182-130 local-168-182-131 local-168-182-132"
```

### 11）部署 RGW

```bash
# 为特定领域和区域部署一组radosgw守护程序：
# ceph orch apply rgw *<realm-name>* *<zone-name>* --placement="*<num-daemons>* [*<host1>* ...]"

ceph orch apply rgw myorg us-east-1 --placement="3 local-168-182-130 local-168-182-131 local-168-182-132"

###说明：
#myorg : 领域名  （realm-name）
#us-east-1: 区域名 （zone-name）myrgw

#Cephadm将等待运行正常的群集，并在部署rgw守护程序之前自动创建所提供的领域和区域（realm-name和zone-name不存在的情况）
```

查看集群状态

```bash
ceph -s
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301060832983.png)

### 12）添加专用的 ceph-mgr 节点

```bash
# ceph-mgr节点默认会挑选一主一备
# 添加新节点
ceph orch host add local-168-182-131 192.168.182.133

# 部署ceph-mgr
ceph orch apply mgr local-168-182-130,local-168-182-131,local-168-182-132

# ceph orch apply mgr local-168-182-130,local-168-182-131,local-168-182-132,local-168-182-133
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301060832949.png)
