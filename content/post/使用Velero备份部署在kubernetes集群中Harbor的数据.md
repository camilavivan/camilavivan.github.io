---
title: 使用Velero备份部署在kubernetes集群中Harbor的数据
date: 2023-04-11 08:40:51
type: categories
tags: 
    - kubernetes
    - Harbor
    - Minio
    - NFS
keywords: 
    - kubernetes 
    - Harbor
    - Minio
    - NFS
categories: 
    - kubernetes
    - Harbor
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640.png
---

  那么，部署在kubernetes集群中的Harbor服务，如何对Harbor的数据进行备份和恢复呢？

  以下教程展示了如何使用 Velero 备份和恢复已使用 Harbor helm 图表部署在 Kubernetes 集群中的 Harbor 实例。

> - 本教程仅备份 Harbor 资源和数据的一个子集，包括所有与 Harbor 相关的 Kubernetes 资源（部署、StatefulSets、Services、ConfigMap 等）以及 Harbor 内部数据库、注册表、chartmuseum、jobservice 和 Trivy 的 PersistentVolumes 中的数据。
> - Harbor 的 Redis 数据未备份，请参阅限制部分，了解有关对 Harbor 实例的潜在影响的更多详细信息。
> - 本教程中执行的备份是崩溃一致的，而不是应用程序一致的。这意味着恢复后某些数据将丢失，有关详细信息，请参阅限制部分。

------

## 一、Velero简介

项目地址：<https://github.com/vmware-tanzu/velero>

Velero 是Heptio公司（已被VMware收购）采用Go语言开发的开源工具，用于云原生安全地备份和恢复、执行灾难恢复以及迁移 Kubernetes 集群资源和持久卷。

### Velero组件

Velero 组件一共分两部分，分别是服务端和客户端。

- 服务端：部署在Kubernetes集群中；
- 客户端：是一些运行在本地的命令行的工具，需要已配置好 kubectl 及集群 kubeconfig 的机器上

### Velero工作流程

![641](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202304110901203.png)

（1）本地 Velero 客户端发送备份指令。
（2）Kubernetes 集群内就会创建一个 Backup 对象。
（3）BackupController 监测 Backup 对象并开始备份过程。
（4）BackupController 会向 API Server 查询相关数据。
（5）BackupController 将查询到的数据备份到远端的对象存储。

### Velero特性

Velero 目前包含以下特性：

- 支持 Kubernetes 集群数据备份和恢复;
- 支持复制当前 Kubernetes 集群的资源到其它 Kubernetes 集群;
- 支持复制生产环境到开发以及测试环境;
- `备份过程中创建的对象是不会备份的`;

## 二、安装Minio存储

使用MinIO存储备份的数据，本处以二进制方式部署单节点的MinIO服务来进行演示。

### 2.1 下载二进制文件

```bash
$ wget -c -k https://dl.min.io/server/minio/release/linux-amd64/minio
$ chmod +x minio
$ mv minio /usr/local/bin/
$ minio  --version
minio version RELEASE.2022-09-22T18-57-27Z (commit-id=20c89ebbb30f44bbd0eba4e462846a89ab3a56fa)
Runtime: go1.18.6 linux/amd64
License: GNU AGPLv3 <https://www.gnu.org/licenses/agpl-3.0.html>
Copyright: 2015-2022 MinIO, Inc.
```

### 2.2 设置环境变量

以环境变量的方式定义MinIO的用户名和密码。

```bash
 export MINIO_ROOT_USER=admin
 export MINIO_ROOT_PASSWORD=minio123456
```

### 2.3 创建数据目录

创建一个目录来存放数据。

```bash
 mkdir -p /data/minio/data
```

### 2.4 启动服务

```bash
$ minio server --console-address ":8000" /data/minio/data
MinIO Object Storage Server
Copyright: 2015-2023 MinIO, Inc.
License: GNU AGPLv3 <https://www.gnu.org/licenses/agpl-3.0.html>
Version: RELEASE.2023-04-07T05-28-58Z (go1.20.3 linux/amd64)

Status:         1 Online, 0 Offline. 
API: http://192.168.2.3:9000  http://127.0.0.1:9000     
RootUser: admin 
RootPass: minio123456 
Console: http://192.168.2.3:8000 http://127.0.0.1:8000   
RootUser: admin 
RootPass: minio123456 

Command-line: https://min.io/docs/minio/linux/reference/minio-mc.html#quickstart
   $ mc alias set myminio http://192.168.2.3:9000 admin minio123456

Documentation: https://min.io/docs/minio/linux/index.html
Warning: The standard parity is set to 0. This can lead to data loss.
```

默认启动的API端口是9000（第三方应用通过该API实现数据的读取），还有一个Web Console的端口，并且Console监听的是一个动态的端口, 可以通过 `--console-address ":port"` 指定静态端口

### 2.5 登录MinIO UI

在启动服务时会输出登录的地址、用户名、密码，根据其输出信息在浏览器登录管理界面：

![642](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202304110901445.png)

### 2.6 创建桶（Buckets）

登录管理界面后，可以在Buckets处点击”Create Bucket“创建一个名称为veleroback的存储桶，名称可以自行更改为其他，后面在安装Velero时需要提供该存储桶的名称。

![643](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202304110901652.png)

------

## 三、安装Velero

### 3.1 安装 Velero CLI

```bash
$ wget https://github.com/vmware-tanzu/velero/releases/download/v1.10.2/velero-v1.10.2-linux-amd64.tar.gz
$ tar -zxvf velero-v1.10.2-linux-amd64.tar.gz 
velero-v1.10.2-linux-amd64/LICENSE
velero-v1.10.2-linux-amd64/examples/.DS_Store
velero-v1.10.2-linux-amd64/examples/README.md
velero-v1.10.2-linux-amd64/examples/minio
velero-v1.10.2-linux-amd64/examples/minio/00-minio-deployment.yaml
velero-v1.10.2-linux-amd64/examples/nginx-app
velero-v1.10.2-linux-amd64/examples/nginx-app/README.md
velero-v1.10.2-linux-amd64/examples/nginx-app/base.yaml
velero-v1.10.2-linux-amd64/examples/nginx-app/with-pv.yaml
velero-v1.10.2-linux-amd64/velero
$ cp velero-v1.10.2-linux-amd64/velero   /usr/local/bin/
$ velero --help
```

### 3.2 创建S3访问凭证

创建访问凭证，使Velero可以有权访问Minion存储。

```bash
$ cat credentials-velero
[default]
aws_access_key_id = admin    #minio的用户
aws_secret_access_key = minio123456    #minio的密码
```

### 3.3 安装Velero服务端

要求Kubernetes v1.16+，因为Helm使用了 CustomResourceDefinition。此 API 版本在 Kubernetes v1.16 中引入apiextensions.k8s.io/v1

首先需要在kubernetes集群中安装Velero。可以使用以下命令来安装：

```bash
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.2.0 \
    --bucket <your-bucket-name> \
    --secret-file ./credentials-velero \
    --backup-location-config  region=minio,s3ForcePathStyle="true",s3Url=<minio-url> \
    --image velero/velero:v1.5.3 \
    --namespace velero
```

- `--provider aws`: 指定Velero使用AWS S3作为备份数据存储的提供者。如果需要使用其他对象存储提供者，可以修改该参数的值。
- `--plugins velero/velero-plugin-for-aws:v1.2.0`: 指定Velero需要使用的插件。在这里，指定了使用Velero插件for AWS v1.2.0版本来支持AWS S3的备份存储。
- `--bucket veleroback`: 指定Velero备份数据存储的S3存储桶名称。需要提前创建该存储桶，并确保Velero具有足够的权限来访问该存储桶。
- `--secret-file ./credentials-velero`: 指定访问S3存储桶所需的凭证文件。该文件应该包含AWS访问密钥和密钥ID等信息。
- `--backup-location-config region=minio,s3ForcePathStyle=`: 指定备份数据存储的配置选项。在这里，指定备份数据存储在Minio对象存储中，并设置存储桶的区域为"minio"，同时启用S3路径样式访问。Minio的地址需要在前面添加协议，即<http://xxx:9000>。

```bash
# 我的命令：
velero install \
--provider aws --plugins velero/velero-plugin-for-aws:v1.2.0 \
--bucket veleroback --secret-file ./credentials-velero \
--backup-location-config  region=minio,s3ForcePathStyle="true",s3Url=http://192.168.2.3:9000  \
--image velero/velero:v1.10.2  --namespace velero-system
```

![644](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202304110902362.png)

### 3.4 检查服务状态

- 查看Pod状态

```bash
kubectl -n velero-system get pod
NAME                      READY   STATUS    RESTARTS   AGE
velero-7d6fdd754c-nnwbv   1/1     Running   0          91s
```

- 查看Velero服务日志

```bash
kubectl logs deployment/velero -n velero-system
```

- 查看Velero在kubernetes集群中创建的CRD

```bash
kubectl -n velero-system get crds -l component=velero
NAME                                CREATED AT
backuprepositories.velero.io        2023-04-09T11:58:38Z
backups.velero.io                   2023-04-09T11:58:38Z
backupstoragelocations.velero.io    2023-04-09T11:58:38Z
deletebackuprequests.velero.io      2023-04-09T11:58:38Z
downloadrequests.velero.io          2023-04-09T11:58:39Z
podvolumebackups.velero.io          2023-04-09T11:58:39Z
podvolumerestores.velero.io         2023-04-09T11:58:39Z
restores.velero.io                  2023-04-09T11:58:39Z
schedules.velero.io                 2023-04-09T11:58:39Z
serverstatusrequests.velero.io      2023-04-09T11:58:39Z
volumesnapshotlocations.velero.io   2023-04-09T11:58:39Z
```

### 3.5 卸载Velero（补充）

可以通过以下命令卸载Velero服务。

> 注意：卸载 Velero 服务器时，所有备份保持不变。

```bash
$ velero  uninstall --namespace velero-system
You are about to uninstall Velero.
Are you sure you want to continue (Y/N)? y     #输入y确认卸载
Waiting for velero namespace "velero-system" to be deleted
.............................................................
Velero namespace "velero-system" deleted
Velero uninstalled ⛵
```

## 四、备份Harbor

### 4.1 设置Harbor为“只读”

使用具有 Harbor 系统管理员权限的帐户登录到 Harbor 门户。 展开管理，然后选择配置。 选择“系统设置”选项卡。

选中“存储库只读”复选框，然后单击“保存”按钮以保存配置。

### 4.2 备份Harbor

使用以下命令创建Velero备份：

```bash
#将命名空间和备份名称替换为您的
$ velero backup create harbor-backup --include-namespaces harbor --snapshot-volumes --wait
```

其中，`harbor-backup`是备份名称，`harbor`是要备份的命名空间。 velero存在不同版本备份的命令不一样的问题，可以使用--help查看详细的命令和参数。 --namespace指定Velero服务所在的命名空间（不指定则默认为velero)

### 4.3 查看已有备份资源

```bash
velero backup get  --namespace velero-system
```

------

## 五、恢复数据

使用以下命令恢复数据： velero restore create --from-backup harbor-backup 其中，`harbor-backup`是要恢复的备份名称。

### 验证数据

使用以下命令验证数据是否已成功恢复：

```bash
kubectl -n harborget pods 
kubectl -n harborget pvc
kubectl -n harborget configmaps
kubectl -n harborget secrets
```

以上命令将返回Harbor中的所有Pod、PVC、ConfigMap和Secret。如果这些对象已成功恢复，则表示备份和恢复过程已经完成。

参考文档：

- <https://velero.io/docs/v1.11/basic-install/>
- <https://goharbor.io/docs/2.7.0/administration/backup-restore/>
