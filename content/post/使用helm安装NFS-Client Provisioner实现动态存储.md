---
title: 使用helm安装NFS-Client Provisioner实现动态存储
date: 2023-08-23 14:22:51
type: categories
tags: 
    - kubernetes
    - NFS
keywords: 
    - kubernetes 
    - NFS
categories: 
    - kubernetes
    - NFS
---

本文介绍使用helm安装NFS-Client Provisioner实现动态存储，主要包括使用helm安装NFS-Client Provisioner实现动态存储使用实例、应用技巧、基本知识点总结和需要注意事项，具有一定的参考价值，需要的朋友可以参考一下。

1. **准备**

   1.1 搭建好NFS服务

   1.2 安装好helm
   > [helm安装地址](https://github.com/helm/helm/tags)

2. **安装**

```yaml
#添加helm源
helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner

#直接安装(10.1.129.86为NFS地址，/data/nfs-ops为共享的目录)
helm install nfs-subdir-external-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
    --set nfs.server=10.1.129.86 \
    --set nfs.path=/data/nfs-ops \
    -n kube-ops (可以选择安装的namespace)

#查看创建的sc
kubectl get sc -n kube-ops
```

如果想改的参数更多些，可以下载chart改values.yaml

```yaml
#下载chart
helm pull nfs-subdir-external-provisioner/nfs-subdir-external-provisioner

#解压后可以看到values.yaml
cat values.yaml | egrep -v '#|^$'

#####
replicaCount: 1
strategyType: Recreate
image:
  repository: k8s.gcr.io/sig-storage/nfs-subdir-external-provisioner
  tag: v4.0.2
  pullPolicy: IfNotPresent
imagePullSecrets: []
nfs:
  server: 10.1.129.86  #修改为NFS服务地址
  path: /data/nfs-ops  #修改共享目录地址
  mountOptions:
  volumeName: nfs-subdir-external-provisioner-root
  reclaimPolicy: Retain
storageClass:
  create: true
  defaultClass: false
  name: sc-nfs-ops  #修改sc的名字
  allowVolumeExpansion: true
  reclaimPolicy: Delete
  archiveOnDelete: true
  onDelete:
  pathPattern:
  accessModes: ReadWriteOnce
  annotations: {}
leaderElection:
  enabled: true
rbac:
  create: true
podSecurityPolicy:
  enabled: false
podAnnotations: {}
podSecurityContext: {}
securityContext: {}
serviceAccount:
  create: true
  annotations: {}
  name:
resources: {}
nodeSelector: {}
tolerations: []
affinity: {}
labels: {}

#####
#就修改了上面3处参数后安装
helm install sc-nfs-ops nfs-subdir-external-provisioner/nfs-subdir-external-provisioner -f values.yaml -n kube-ops
```
