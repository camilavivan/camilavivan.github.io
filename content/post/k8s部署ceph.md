---
title: 用 Ansible 简化 K8S 部署
date: 2023-01-12  15:43:05
type: categories
tags: 
    - Ceph
    - kubernetes
keywords: 
    - Ceph
    - kubernetes
categories: 
    - kubernetes
    - Ceph
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301101629307.png
---
## 一、概述

> *Ceph 在 k8s 中用做共享存储还是非常方便的，Ceph 是比较老牌的分布式存储系统，非常成熟，功能也强大，支持三种模式（快存储、文件系统存储、对象存储），所以接下来就详细讲解如何在 k8s 使用 ceph，关于 ceph 的介绍可以参考以下几篇文章：*

- [*分布式存储系统 Ceph 环境部署*](https://blog.kkun.site/2023/01/05/Ceph 环境部署)
- [*分布式存储系统 Ceph操作*](https://blog.kkun.site/2023/01/09/分布式存储系统 Ceph操作)

前提是需要一个 k8s 环境，

## 二、Ceph Rook 介绍

> *`Rook`是一个开源的**云原生存储编排工具**，**提供平台、框架和对各种存储解决方案的支持，以和云原生环境进行本地集成。*

- Rook 将存储软件转变成自我管理、自我扩展和自我修复的存储服务，通过自动化部署、启动、配置、供应、扩展、升级、迁移、灾难恢复、监控和资源管理来实现。Rook 底层使用云原生容器管理、调度和编排平台提供的能力来提供这些功能。
- Rook 利用扩展功能将其深度地集成到云原生环境中，并为调度、生命周期管理、资源管理、安全性、监控等提供了无缝的体验。有关 Rook 当前支持的存储解决方案的状态相关的更多详细信息，可以参考 Rook 仓库 的项目介绍。Rook 目前支持 Ceph、NFS、Minio Object Store 和 CockroachDB。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301121532495.png)

> *官网: <https://rook.io/>*
> *项目地址: <https://github.com/rook>**

## 三、通过 Rook 在 k8s 中部署 Ceph

> *官方文档: <https://rook.io/docs/rook/v1.10/Getting-Started/quickstart/>*
> *【温馨提示】k8s 节点各挂载一块（或者多块）20GB 的未使用的磁盘。*

### 1）下载部署包

```bash
git clone --single-branch --branch v1.10.8 https://github.com/rook/rook.git
```

部署所用到的镜像如下：
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301121530144.png)

由于镜像源在国外，国内无法下载，这里需要修改一些镜像或者提前下载 tag，操作如下：

```bash
cd rook/deploy/examples/

#(registry.aliyuncs.com/google_containers/<image>:<tag>)，后四个镜像我FQ下
docker pull registry.aliyuncs.com/google_containers/csi-node-driver-registrar:v2.5.1

docker tag registry.aliyuncs.com/google_containers/csi-node-driver-registrar:v2.5.1 registry.k8s.io/sig-storage/csi-node-driver-registrar:v2.5.1

docker pull registry.aliyuncs.com/google_containers/csi-snapshotter:v6.1.0
docker tag registry.aliyuncs.com/google_containers/csi-snapshotter:v6.1.0 registry.k8s.io/sig-storage/csi-snapshotter:v6.1.0

docker pull registry.aliyuncs.com/google_containers/csi-attacher:v4.0.0
docker tag registry.aliyuncs.com/google_containers/csi-attacher:v4.0.0 registry.k8s.io/sig-storage/csi-attacher:v4.0.0

docker pull registry.aliyuncs.com/google_containers/csi-resizer:v1.6.0
docker tag registry.aliyuncs.com/google_containers/csi-resizer:v1.6.0 registry.k8s.io/sig-storage/csi-resizer:v1.6.0

docker pull registry.aliyuncs.com/google_containers/csi-resizer:v1.6.0
docker tag registry.aliyuncs.com/google_containers/csi-resizer:v1.6.0 registry.k8s.io/sig-storage/csi-resizer:v1.6.0

docker pull registry.aliyuncs.com/google_containers/csi-provisioner:v3.3.0
docker tag registry.aliyuncs.com/google_containers/csi-provisioner:v3.3.0 registry.k8s.io/sig-storage/csi-provisioner:v3.3.0
```

### 2）部署 Rook Operator

```bash
cd rook/deploy/examples
kubectl create -f crds.yaml -f common.yaml -f operator.yaml
# 检查
kubectl -n rook-ceph get pod
```

也可以通过 helm 部署

```bash
helm repo add rook-release https://charts.rook.io/release
helm install --create-namespace --namespace rook-ceph rook-ceph rook-release/rook-ceph -f values.yaml
```

### 3）创建 Rook Ceph 集群

现在 Rook Operator 处于 Running 状态，接下来我们就可以创建 Ceph 集群了。为了使集群在重启后不受影响，请确保设置的 dataDirHostPath 属性值为有效得主机路径。

```bash
cd rook/deploy/examples
kubectl apply -f cluster.yaml
```

### 4）部署 Rook Ceph 工具

```bash
cd rook/deploy/examples
kubectl create -f toolbox.yaml
```

### 5）部署 Ceph Dashboard

```bash
cd rook/deploy/examples
kubectl apply -f dashboard-external-https.yaml

# 获取 dashboard admin密码
kubectl -n rook-ceph get secret rook-ceph-dashboard-password -o jsonpath="{['data']['password']}" | base64 -d
```

通过 Ceph Dashboard 查看 Ceph 集群状态

```bash
# 查看对外端口
kubectl get svc -n rook-ceph
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301121530398.png)

```bash
https://<nodeip>:nodePort/
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301121531344.png)

### 6）检查

```bash
kubectl get pods,svc -n rook-ceph
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301121531115.png)

### 7）通过 ceph-tool 工具 pod 查看 ceph 集群状态

```bash
kubectl exec -it `kubectl get pods -n rook-ceph|grep rook-ceph-tools|awk '{print $1}'` -n rook-ceph -- bash

ceph -s
```

![图片](https://mmbiz.qpic.cn/mmbiz_png/gIkzzLe4eUWDPp5oPW5DIbib8ibhSZRiauNEZEXV5x4peuFYynqfvaWMNZWSeCZH790CRuaUMqyiaia4xTvS5Gbk85g/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

## 四、 测试验证

### 1） 块存储（RBD）测试

#### 1、创建 StorageClass

```bash
cd rook/deploy/examples
# 创建一个名为replicapool的rbd pool
kubectl apply -f csi/rbd/storageclass.yaml
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301121531747.png)

#### 2、部署 WordPress

```bash
kubectl apply -f mysql.yaml
kubectl apply -f wordpress.yaml
```

### 2）文件系统 （CephFS） 测试

#### 1、创建 StorageClass

```bash
kubectl apply -f csi/cephfs/storageclass.yaml
```

#### 2、部署应用

```bash
kubectl apply -f filesystem.yaml
```

### 3）对象存储 （RGW） 测试

#### 1、创建对象存储

```bash
kubectl create -f object.yaml

# 验证rgw pod正常运行
kubectl -n rook-ceph get pod -l app=rook-ceph-rgw
```

#### 2、创建对象存储 user

```bash
kubectl create -f object-user.yaml
```

#### 3、获取 accesskey secretkey

```bash
# 获取AccessKey
kubectl -n rook-ceph get secret rook-ceph-object-user-my-store-my-user -o yaml | grep AccessKey | awk '{print $2}' | base64 --decode

# 获取 SecretKey
kubectl -n rook-ceph get secret rook-ceph-object-user-my-store-my-user -o yaml | grep SecretKey | awk '{print $2}' | base64 --decode
```

#### 4、部署 rgw nodeport

```bash
kubectl apply -f rgw-external.yaml

kubectl -n rook-ceph get service rook-ceph-rgw-my-store rook-ceph-rgw-my-store-external
```

#### 5、通过 api 接口使用 Ceph 对象存储

```bash
#首先，我们需要安装 python-boto 包，用于测试连接 S3。：
yum install python-boto -y

# 然后，编写 python 测试脚本。
# cat s3.py
#!/usr/bin/python

import boto
import boto.s3.connection
access_key = 'C7492VVSL8O11NZBK3GT'
secret_key = 'lo8IIwMfmow4fjkSOMbjebmgjzTRBQSO7w83SvBd'
conn = boto.connect_s3(
    aws_access_key_id = access_key,
    aws_secret_access_key = secret_key,
    host = '192.168.182.110', port=30369,
    is_secure=False,
    calling_format = boto.s3.connection.OrdinaryCallingFormat(),
)
bucket = conn.create_bucket('my-first-s3-bucket')
for bucket in conn.get_all_buckets():
        print "{name}\t{created}".format(
                name = bucket.name,
                created = bucket.creation_date,
)
```

具体测试过程在之前的文章中有很详细的介绍
