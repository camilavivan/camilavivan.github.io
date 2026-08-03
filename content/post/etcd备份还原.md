---
title: etcd 备份还原
date: 2022-12-29 10:52:33
type: categories
tags: 
    - etcd
    - kubernetes
keywords: kubernetes
categories: 
    - kubernetes
    - etcd
---
## containerd

### etcd 备份还原

#### 还原

每台的master节点 IP 和主机名需要修改
停止集群
mv   /etc/kubernetes/manifests.bak

## 备份原有etcd数据

mv /u01/local/kube-system/etcd /u01/local/kube-system/etcd-`date '+%Y%m%d-%H:%M:%S'`
​

### 还原第一台master

```bash
nerdctl  -n k8s.io run --rm \
-v '/tmp\:/tmp' \
-v '/u01/local/kube-system:/u01/local/kube-system' \
-v '/etc/kubernetes/pki/etcd:/etc/kubernetes/pki/etcd' \
--env ETCDCTL\_API=3 \
'docker.kedacom.com:15000/etcd:3.5.0-0' \
/bin/sh -c "etcdctl snapshot restore \
/tmp/etcd-snapshot-.db \
--name node-9xct \
--endpoints=10.165.124.13:2379 \
--cert=/etc/kubernetes/pki/etcd/server.crt \
--key=/etc/kubernetes/pki/etcd/server.key \
--cacert=/etc/kubernetes/pki/etcd/ca.crt \
--initial-advertise-peer-urls=<https://10.165.124.13:2380> \
--initial-cluster=node-9xct=<https://10.165.124.13:2380,node-dfkb=https://10.165.124.14:2380,node-24ge=https://10.165.124.15:2380> \
--data-dir=/u01/local/kube-system/etcd \
--skip-hash-check=true"
```

```bash
nerdctl  -n k8s.io run --rm \
-v '/tmp\:/tmp' \
-v '/u01/local/kube-system:/u01/local/kube-system' \
-v '/etc/kubernetes/pki/etcd:/etc/kubernetes/pki/etcd' \
--env ETCDCTL\_API=3 \
'docker.kedacom.com:15000/etcd:3.5.0-0' \
/bin/sh -c "etcdctl snapshot restore \
/tmp/etcd-snapshot-.db \
--name node-dfkb \
--endpoints=10.165.124.14:2379 \
--cert=/etc/kubernetes/pki/etcd/server.crt \
--key=/etc/kubernetes/pki/etcd/server.key \
--cacert=/etc/kubernetes/pki/etcd/ca.crt \
--initial-advertise-peer-urls=<https://10.165.124.14:2380> \
--initial-cluster=node-9xct=<https://10.165.124.13:2380,node-dfkb=https://10.165.124.14:2380,node-24ge=https://10.165.124.15:2380> \
--data-dir=/u01/local/kube-system/etcd \
--skip-hash-check=true"
```

​

```bash
nerdctl  -n k8s.io run --rm \
-v '/tmp\:/tmp' \
-v '/u01/local/kube-system:/u01/local/kube-system' \
-v '/etc/kubernetes/pki/etcd:/etc/kubernetes/pki/etcd' \
--env ETCDCTL\_API=3 \
'docker.kedacom.com:15000/etcd:3.5.0-0' \
/bin/sh -c "etcdctl snapshot restore \
/tmp/etcd-snapshot-.db \
--name node-24ge \
--endpoints=10.165.124.15:2379 \
--cert=/etc/kubernetes/pki/etcd/server.crt \
--key=/etc/kubernetes/pki/etcd/server.key \
--cacert=/etc/kubernetes/pki/etcd/ca.crt \
--initial-advertise-peer-urls=<https://10.165.124.15:2380> \
--initial-cluster=node-9xct=<https://10.165.124.13:2380,node-dfkb=https://10.165.124.14:2380,node-24ge=https://10.165.124.15:2380> \
--data-dir=/u01/local/kube-system/etcd \
--skip-hash-check=true"
```

### 恢复集群

```bash
mv /etc/kubernetes/manifests.bak /etc/kubernetes/manifests
```

#### 备份

```bash
nerdctl  -n k8s.io run --rm \
\-v '/tmp\:/tmp' \
\-v '/etc/kubernetes/pki/etcd:/etc/kubernetes/pki/etcd' \
\--env ETCDCTL\_API=3 \
'docker.kedacom.com:15000/etcd:3.5.0-0' \
/bin/sh -c "etcdctl snapshot save \
/tmp/etcd-snapshot-134.db \
\--endpoints=10.165.24.181:2379 \
\--cert=/etc/kubernetes/pki/etcd/server.crt \
\--key=/etc/kubernetes/pki/etcd/server.key \
\--cacert=/etc/kubernetes/pki/etcd/ca.crt"
```

docker
备份

```bash
docker run --rm -e ETCDCTL\_API=3 -v /etc/kubernetes/pki/etcd:/etc/kubernetes/pki/etcd -v /data/etcd\_backup\:/data/etcd\_backup registry.cn-hangzhou.aliyuncs.com/google\_containers/etcd:3.4.13-0 sh -c "etcdctl --endpoints=<https://11.1.100.194:2379> --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt --key=/etc/kubernetes/pki/etcd/healthcheck-client.key snapshot save /data/etcd\_backup/etcd-snapshot-\$(date +%Y-%m-%d\_%H:%M:%S\_%Z).db"
```

还原

```bash
docker run --rm \
-v '/tmp:/tmp' \
-v '/var/lib:/var/lib' \
-v '/etc/kubernetes/pki/etcd:/etc/kubernetes/pki/etcd' \
--env ETCDCTL_API=3 \
'k8s.gcr.io/etcd:3.2.24' \
/bin/sh -c "etcdctl snapshot restore \
        /tmp/etcd-snapshot-2021-01-05_00:01:03_UTC.db \
        --name k8s-59.1.100.217 \
        --endpoints=59.1.100.217:2379 \
        --cert=/etc/kubernetes/pki/etcd/server.crt \
        --key=/etc/kubernetes/pki/etcd/server.key \
        --cacert=/etc/kubernetes/pki/etcd/ca.crt \
        --initial-advertise-peer-urls=https://59.1.100.217:2380 \
        --initial-cluster=k8s-59.1.100.217=https://59.1.100.217:2380,k8s-59.1.100.218=https://59.1.100.218:2380,k8s-59.1.100.220=https://59.1.100.220:2380 \
        --data-dir=/var/lib/etcd \
        --skip-hash-check=true"
```
