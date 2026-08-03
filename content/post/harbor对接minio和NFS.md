---
title: harbor对接minio和NFS
date: 2023-01-04 14:22:51
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

## **一、前言**

Harbor 的部署可以使用 NFS 存储，虽然可以使用 rsync+inotify 做数据同步做解决单点问题，但是 NFS 效率/性能有限，没有对象存储那么强大，所以一般使用对象存储居多，这里选用 `MinIO` 对象存储软件，当然也可以使用`Ceph`或者其它对象存储。都部署在 k8s 集群上，k8s 基础环境部署可以参考文章：[二进制部署一套完整的企业级K8s集群](https://blog.kkun.site/2022/12/29/%E4%BA%8C%E8%BF%9B%E5%88%B6%E9%83%A8%E7%BD%B2%E4%B8%80%E5%A5%97%E5%AE%8C%E6%95%B4%E7%9A%84%E4%BC%81%E4%B8%9A%E7%BA%A7K8s%E9%9B%86%E7%BE%A4/)

## **二、MinIO on K8S 部署**

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640.png)

MinIO 的介绍可以参考这篇文章：高性能分布式对象存储 MinIO 部署

这里使用 Helm 部署 MinIO ，关于 Helm 的介绍可以参考官方文档

> 官方文档：<https://helm.sh/zh/docs/>

部署步骤如下：

### **1）下载安装 MinIO 包**

```bash
    mkdir -p /opt/k8s/bigdata/minio;cd /opt/k8s/bigdata/minio
    # 添加数据源
    helm repo add bitnami https://charts.bitnami.com/bitnami
    # 下载
    helm pull bitnami/minio
    # 解压部署包
    tar -xf minio-11.9.2.tgz
```

### **2）修改配置**

添加文件`minio/templates/storage-class.yaml`，内容如下：

```yaml
    kind: StorageClass
    apiVersion: storage.k8s.io/v1
    metadata:
      name: minio-local-storage
    provisioner: kubernetes.io/no-provisioner
    volumeBindingMode: WaitForFirstConsumer
```

添加 pv 配置 `minio/templates/pv.yaml`

```yaml
    {{- range .Values.persistence.local }}
    ---
    apiVersion: v1
    kind: PersistentVolume
    metadata:
      name: {{ .name }}
    spec:
      capacity:
        storage: {{ .size }}
      accessModes:
      - ReadWriteOnce
      persistentVolumeReclaimPolicy: Retain
      storageClassName: minio-local-storage
      local:
        path: {{ .path }}
      nodeAffinity:
        required:
          nodeSelectorTerms:
          - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
              - {{ .host }}
     ---
    {{- end }}
```

修改配置`minio/values.yaml`

```yaml
    service:
      type: NodePort
      nodePorts:
        api: "30900"
        console: "30901"

    # ---
    # 这里先部署单节点，后面会详细讲在k8s中部署分布式minio，这里的重点是Harbor对接minio
    mode: standalone

    # ---
    statefulset:
      replicaCount: 4

    # ---
    persistence
      enabled: true
      storageClass: minio-local-storage
      size: 1Gi
      local:
        - name: minio-pv-0
          size: 1Gi
          path: /opt/k8s/bigdata/minio/data
          host: local-168-182-110
```

> 【温馨提示】需要提前在对应的节点上创建对应的目录。

### **3）开始部署**

```bash
    cd /opt/k8s/bigdata/minio
    helm install minio ./minio \
      --namespace=minio \
      --create-namespace
```

回显如下：

```bash
    NAME: minio
    LAST DEPLOYED: Sun Aug 28 09:13:06 2022
    NAMESPACE: minio
    STATUS: deployed
    REVISION: 1
    TEST SUITE: None
    NOTES:
    CHART NAME: minio
    CHART VERSION: 11.9.2
    APP VERSION: 2022.8.22

    ** Please be patient while the chart is being deployed **

    MinIO&reg; can be accessed via port  on the following DNS name from within your cluster:

       minio.minio.svc.cluster.local

    To get your credentials run:

       export ROOT_USER=$(kubectl get secret --namespace minio minio -o jsonpath="{.data.root-user}" | base64 -d)
       export ROOT_PASSWORD=$(kubectl get secret --namespace minio minio -o jsonpath="{.data.root-password}" | base64 -d)

    To connect to your MinIO&reg; server using a client:

    - Run a MinIO&reg; Client pod and append the desired command (e.g. 'admin info'):

       kubectl run --namespace minio minio-client \
         --rm --tty -i --restart='Never' \
         --env MINIO_SERVER_ROOT_USER=$ROOT_USER \
         --env MINIO_SERVER_ROOT_PASSWORD=$ROOT_PASSWORD \
         --env MINIO_SERVER_HOST=minio \
         --image docker.io/bitnami/minio-client:2022.8.11-debian-11-r3 -- admin info minio

    To access the MinIO&reg; web UI:

    - Get the MinIO&reg; URL:

       export NODE_PORT=$(kubectl get --namespace minio -o jsonpath="{.spec.ports[0].nodePort}" services minio)
       export NODE_IP=$(kubectl get nodes --namespace minio -o jsonpath="{.items[0].status.addresses[0].address}")
       echo "MinIO&reg; web URL: http://$NODE_IP:$NODE_PORT/minio"
```

查看

```bash
    kubectl get pods,svc -n minio -owide
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102456926.png)

webUI 登录：
<http://local-168-182-110:30901>
账号密码通过以下方式查询：

```bash
    export ROOT_USER=$(kubectl get secret --namespace minio minio -o jsonpath="{.data.root-user}" | base64 -d)
    echo $ROOT_USER
    export ROOT_PASSWORD=$(kubectl get secret --namespace minio minio -o jsonpath="{.data.root-password}" | base64 -d)
    echo $ROOT_PASSWORD
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102506506.png)
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102630617.png)

### **4）安装 mc 测试**

```bash
    cd /opt/k8s/bigdata/minio
    wget https://dl.min.io/client/mc/release/linux-amd64/mc
    chmod +x mc
    ln -s /opt/k8s/bigdata/minio/mc /usr/bin/mc
    mc --help
```

添加 MinIO 存储服务

```bash
    mc config host add minio http://local-168-182-110:30900 admin Kgb4zZT1cU
    mc admin info minio
    # 并创建bucket harbor
    mc mb minio/harbor
    mc ls minio
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102432573.png)

常用命令参数：

```bash
    ls       列出文件和文件夹。
    mb       创建一个存储桶或一个文件夹。
    cat      显示文件和对象内容。
    pipe     将一个STDIN重定向到一个对象或者文件或者STDOUT。
    share    生成用于共享的URL。
    cp       拷贝文件和对象。
    mirror   给存储桶和文件夹做镜像。
    find     基于参数查找文件。
    diff     对两个文件夹或者存储桶比较差异。
    rm       删除文件和对象。
    events   管理对象通知。
    watch    监听文件和对象的事件。
    policy   管理访问策略。
    session  为cp命令管理保存的会话。
    config   管理mc配置文件。
    update   检查软件更新。
    version  输出版本信息。
```

### **5）卸载**

```bash
    helm uninstall minio -n minio
    kubectl delete ns minio --force
```

## **三、Harbor on K8S 部署**

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102432588.png)

### **1）创建 stl 证书**

```bash
    mkdir /opt/k8s/bigdata/harbor/stl && cd /opt/k8s/bigdata/harbor/stl
    # 生成 CA 证书私钥
    openssl genrsa -out ca.key 4096
    # 生成 CA 证书
    openssl req -x509 -new -nodes -sha512 -days 3650 \
     -subj "/C=CN/ST=Guangdong/L=Shenzhen/O=harbor/OU=harbor/CN=myharbor-minio.com" \
     -key ca.key \
     -out ca.crt
    # 创建域名证书，生成私钥
    openssl genrsa -out myharbor-minio.com.key 4096
    # 生成证书签名请求 CSR
    openssl req -sha512 -new \
        -subj "/C=CN/ST=Guangdong/L=Shenzhen/O=harbor/OU=harbor/CN=myharbor-minio.com" \
        -key myharbor-minio.com.key \
        -out myharbor-minio.com.csr
    # 生成 x509 v3 扩展
    cat > v3.ext <<-EOF
    authorityKeyIdentifier=keyid,issuer
    basicConstraints=CA:FALSE
    keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
    extendedKeyUsage = serverAuth
    subjectAltName = @alt_names

    [alt_names]
    DNS.1=myharbor-minio.com
    DNS.2=*.myharbor-minio.com
    DNS.3=hostname
    EOF
    #创建 Harbor 访问证书
    openssl x509 -req -sha512 -days 3650 \
        -extfile v3.ext \
        -CA ca.crt -CAkey ca.key -CAcreateserial \
        -in myharbor-minio.com.csr \
        -out myharbor-minio.com.crt
```

### **2）创建 secret**

```bash
    kubectl create ns harbor-minio
    kubectl create secret tls myharbor-minio.com --key myharbor-minio.com.key --cert myharbor-minio.com.crt -n harbor-minio
    kubectl get secret myharbor-minio.com -n harbor-minio
```

### **3）下载 harbor 安装包**

```bash
    cd /opt/k8s/bigdata/harbor
    helm repo add harbor https://helm.goharbor.io
    helm pull harbor/harbor
    tar -xf harbor-1.9.3.tgz
```

### **4）配置 minio 存储**

这里存储镜像和 Chart 使用`minio`。

> persistence 是默认 enabled 的，StorageClass 是默认的 在 k8s 集群中需要使用，来动态地提供卷。在"StorageClass"中指定另一个 StorageClass 或设置"existingClaim" ，如果您已经使用了现有的持久卷。
> 对于存储镜像和 Chart，你也可以使用“azure”，“gcs”，“s3”，“swift”或“oss”。在“imageChartStorage”部分设置它。
> 即 registry 和 chartmuseum 使用 minio 存储。

具体参考：<https://github.com/goharbor/harbor-helm>

```yaml
    persistence:
      enabled: true
      imageChartStorage:
        disableredirect: true
        type: s3
        filesystem:
          rootdirectory: /storage
          #maxthreads: 100
        s3:
          # region描述的是服务器的物理位置，默认是us-east-1(美国东区1),这也是亚马逊S3的默认区域
          region: us-west-1
          bucket: harbor
          # 账号，密码
          accesskey: admin
          secretkey: Kgb4zZT1cU
          # 这里minio.minion是<service-name>.<namespace-name>
          regionendpoint: http://minio.minio:9000
          encrypt: false
          secure: false
          v4auth: true
          chunksize: "5242880"
          rootdirectory: /
          redirect:
            disabled: false
        maintenance:
          uploadpurging:
            enabled: false
        delete:
          enabled: true
```

### **6）安装 nfs （harbor 本身服务存储）**

harbor 本身服务的存储这里使用 nfs。

> 即 Redis、Postgresql 数据库、JobService 和 trivy 使用 nfs。

#### 1、所有节点安装 nfs

```bash
    yum -y install  nfs-utils rpcbind
```

#### 2、在 master 节点创建共享目录并授权

```bash
    mkdir /opt/nfsdata
    # 授权共享目录
    chmod 666 /opt/nfsdata
```

#### 3、配置 exports 文件

```bash
    cat > /etc/exports<<EOF
    /opt/nfsdata *(rw,no_root_squash,no_all_squash,sync)
    EOF
    # 配置生效
    exportfs -r
```

#### 4、启动 rpc 和 nfs（客户端只需要启动 rpc 服务）（注意顺序）

```bash
    systemctl start rpcbind
    systemctl start nfs-server
    systemctl enable rpcbind
    systemctl enable nfs-server
    # 查看
    showmount -e
    showmount -e 192.168.182.110
```

#### 5、客户端

```bash
    # 安装
    yum -y install  nfs-utils rpcbind
    # 启动rpc服务
    systemctl start rpcbind
    systemctl enable rpcbind
    # 创建挂载目录
    mkdir /mnt/nfsdata
    # 挂载
    echo "192.168.182.110:/opt/nfsdata /mnt/nfsdata     nfs    defaults  0 1">> /etc/fstab
    mount -a
```

#### 6、创建 nfs provisioner 和持久化存储 SC

```bash
    # 添加数据源
    helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/

    # 开始安装
    helm install nfs-subdir-external-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
      --namespace=nfs-provisioner \
      --create-namespace \
      --set image.repository=willdockerhub/nfs-subdir-external-provisioner \
      --set image.tag=v4.0.2 \
      --set replicaCount=2 \
      --set storageClass.name=nfs-client \
      --set storageClass.defaultClass=true \
      --set nfs.server=192.168.182.110 \
      --set nfs.path=/opt/nfsdata

    # 查看
    kubectl get pods,deploy,sc -n nfs-provisioner
```

### **7）开始安装**

```bash
    cd /opt/k8s/bigdata/harbor
    helm install myharbor-minio --namespace harbor-minio ./harbor \
      --set expose.ingress.hosts.core=myharbor-minio.com \
      --set expose.ingress.hosts.notary=notary.myharbor-minio.com \
      --set-string expose.ingress.annotations.'nginx\.org/client-max-body-size'="1024m" \
      --set persistence.persistentVolumeClaim.registry.storageClass=nfs-client
      --set persistence.persistentVolumeClaim.jobservice.storageClass=nfs-client \
      --set persistence.persistentVolumeClaim.database.storageClass=nfs-client \
      --set persistence.persistentVolumeClaim.redis.storageClass=nfs-client \
      --set persistence.persistentVolumeClaim.trivy.storageClass=nfs-client \
      --set persistence.persistentVolumeClaim.chartmuseum.storageClass=nfs-client \
      --set persistence.enabled=true \
      --set expose.tls.secretName=myharbor-minio.com \
      --set externalURL=https://myharbor-minio.com \
      --set harborAdminPassword=xxxxxxxxx
```

> 这里虽然给 chartmuseum 和 registry 指定了 storageClass 为 nfs-client，但最终不会创建 pvc，因为只要`persistence.imageChartStorage.type`设置为`filesystem`，就不会创建 pvc，具体可以查看 `templates/registry/registry-pvc.yaml` 和 `templates/chartmuseum/chartmuseum-pvc.yaml` 查看创建 pvc 的条件。
> 即 registry 和 chartmuseum 还是使用上面指定的 minio 存储。

回显如下：

```yaml
    NAME: myharbor
    LAST DEPLOYED: Sun Aug 28 11:27:47 2022
    NAMESPACE: harbor-minio
    STATUS: deployed
    REVISION: 1
    TEST SUITE: None
    NOTES:
    Please wait for several minutes for Harbor deployment to complete.
    Then you should be able to visit the Harbor portal at https://myharbor-minio.com
    For more details, please visit https://github.com/goharbor/harbor
```

查看

```yaml
    kubectl get pods,svc,ingress -n  harbor-minio
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102432612.png)
配置`/etc/hosts`，如果有域名解析就可忽略

```bash
    192.168.182.110 myharbor-minio.com
    192.168.182.111 myharbor-minio.com
    192.168.182.112 myharbor-minio.com
```

Harbor web：<https://myharbor-minio.com>
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102730348.png)
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102432648.png)

### **8）Containerd 配置 Harbor**

以前使用 docker-engine 的时候，只需要修改/etc/docker/daemon.json 就行，但是新版的 k8s 已经使用 containerd 了，所以这里需要做相关配置，要不然 containerd 会失败。证书（ca.crt）可以在页面上下载：
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102725115.png)
创建域名目录

```bash
    mkdir /etc/containerd/myharbor-minio.com
    cp ca.crt /etc/containerd/myharbor-minio.com/
```

配置文件：`/etc/containerd/config.toml`

```json
    [plugins."io.containerd.grpc.v1.cri".registry]
          config_path = ""

          [plugins."io.containerd.grpc.v1.cri".registry.auths]

          [plugins."io.containerd.grpc.v1.cri".registry.configs]
            [plugins."io.containerd.grpc.v1.cri".registry.configs."myharbor-minio.com".tls]
              insecure_skip_verify = true  #跳过认证
              ca_file = "/etc/containerd/myharbor-minio.com/ca.crt"
            [plugins."io.containerd.grpc.v1.cri".registry.configs."myharbor-minio.com".auth]
              username = "admin"
              password(删掉这里) = "xxxxxxxxx"

          [plugins."io.containerd.grpc.v1.cri".registry.headers]

          [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
            [plugins."io.containerd.grpc.v1.cri".registry.mirrors."myharbor-minio.com"]
              endpoint = ["https://myharbor-minio.com"]
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102432680.png)

重启 containerd

```bash
#重新加载配置
systemctl daemon-reload
#重启containerd
systemctl restart containerd
```

### **9）测试验证**

```bash
    # tag
    # ctr 有命名空间 namespace 来指定类似于工作空间的隔离区域。使用方法 ctr -n default images ls 来查看 default 命名空间的镜像，不加 -n 参数，默认也是使用default的命名空间。i：images
    ctr -n k8s.io i tag docker.io/bitnami/minio:2022.8.22-debian-11-r0 myharbor-minio.com/bigdata/minio:2022.8.22-debian-11-r0

    # 推送镜像到harbor
    ctr --namespace=k8s.io images push myharbor-minio.com/bigdata/minio:2022.8.22-debian-11-r0 --skip-verify --user admin:xxxxxxxxx

    # --namespace=k8s.io 指定命名空间，不是必须，根据环境而定
    # --skip-verify 跳过认证
    # --user 指定harbor用户名及密码
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102432694.png)
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102716000.png)

查看 minio ：
<http://local-168-182-110:30901/>

> 查看 minio 中 harbor bucket 是否存在 docker 目录。如果存在说明成功。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102432733.png)
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/640-20220901102432749.png)

### **10）卸载**

```bash
helm uninstall myharbor-minio -n harbor-minio
```

镜像仓库 `Harbor` 对接 `MinIO` 对象存储就到了，有疑问的小伙伴欢迎留言哦
