---
title: k8s集群修改cidr
date: 2022-12-30 09:00:32
type: categories
tags: 
  - kubernetes
keywords: kubernetes
categories: 
  - kubernetes
---

当集群的pod地址和本地网络冲突时，会导致集群无法访问本地资源，这种情况可以使用防火墙的DNAT做映射来规避，但不是一劳永逸的方法，要想一劳永逸，则需更改其中一个环境的`cidr`，对于一个公司来说，更改集群的cidr比较实际，下面以集群的`10.244.0.0/16`更改为`10.245.0.0/16`为例

## kubeadm-config

```bash
[root@master1 ~]# kubectl -n kube-system edit cm kubeadm-config
```

```yaml
# Please edit the object below. Lines beginning with a '#' will be ignored,
# and an empty file will abort the edit. If an error occurs while saving this file will be
# reopened with the relevant failures.
#
apiVersion: v1
data:
  ClusterConfiguration: |
    apiServer:
      certSANs:
      - kubernetes
      - kubernetes.default
      - kubernetes.default.svc
      - kubernetes.default.svc.cluster.local
      - localhost
      - 127.0.0.1
      - lb.kubesphere.local
      - 11.1.100.131
      - master1
      - master1.cluster.local
      - master2
      - master2.cluster.local
      - 11.1.100.132
      - master3
      - master3.cluster.local
      - 11.1.100.133
      - 10.96.0.1
      extraArgs:
        audit-log-maxage: "30"
        audit-log-maxbackup: "10"
        audit-log-maxsize: "100"
        authorization-mode: Node,RBAC
        bind-address: 0.0.0.0
        feature-gates: TTLAfterFinished=true,ExpandCSIVolumes=true,CSIStorageCapacity=true,RotateKubeletServerCertificate=true
      timeoutForControlPlane: 4m0s
    apiVersion: kubeadm.k8s.io/v1beta3
    certificatesDir: /etc/kubernetes/pki
    clusterName: test
    controlPlaneEndpoint: lb.kubesphere.local:6443
    controllerManager:
      extraArgs:
        bind-address: 0.0.0.0
        cluster-signing-duration: 87600h
        feature-gates: TTLAfterFinished=true,ExpandCSIVolumes=true,CSIStorageCapacity=true,RotateKubeletServerCertificate=true
        node-cidr-mask-size: "24"
      extraVolumes:
      - hostPath: /etc/localtime
        mountPath: /etc/localtime
        name: host-time
        readOnly: true
    dns:
      imageRepository: coredns
      imageTag: 1.8.6
    etcd:
      external:
        caFile: /etc/ssl/etcd/ssl/ca.pem
        certFile: /etc/ssl/etcd/ssl/node-master1.pem
        endpoints:
        - https://11.1.100.131:2379
        - https://11.1.100.132:2379
        - https://11.1.100.133:2379
        keyFile: /etc/ssl/etcd/ssl/node-master1-key.pem
    imageRepository: kubesphere
    kind: ClusterConfiguration
    kubernetesVersion: v1.23.10
    networking:
      dnsDomain: cluster.local
      # pod网段
      podSubnet: 10.244.0.0/16
      #svc网段
      serviceSubnet: 10.96.0.0/16
    scheduler:
      extraArgs:
        bind-address: 0.0.0.0
        feature-gates: TTLAfterFinished=true,ExpandCSIVolumes=true,CSIStorageCapacity=true,RotateKubeletServerCertificate=true
kind: ConfigMap
metadata:
  creationTimestamp: "2022-12-01T15:04:55Z"
  name: kubeadm-config
  namespace: kube-system
  resourceVersion: "211"
  uid: 005ee25b-2121-4b53-8478-4e1eb28cfdef

```

## [kube-controller-manager](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/)

```yaml
#是否应在云提供商上分配和设置 Pod 的 CIDR。
--allocate-node-cidrs
#集群中 Pod 的 CIDR 范围。 要求 --allocate-node-cidrs 为true
--cluster-cidr string
#集群中svc的 CIDR 范围。 要求 --allocate-node-cidrs 为true
--service-cluster-ip-range string
```

## calico

```yaml
#[root@master1 ~]# kubectl edit daemonset -n kube-system   calico-node
    ···
    - env:
        - name: DATASTORE_TYPE
          value: kubernetes
        - name: WAIT_FOR_DATASTORE
          value: "true"
        - name: NODENAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: CALICO_NETWORKING_BACKEND
          valueFrom:
            configMapKeyRef:
              key: calico_backend
              name: calico-config
        - name: CLUSTER_TYPE
          value: k8s,bgp
        - name: NODEIP
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: status.hostIP
        - name: IP_AUTODETECTION_METHOD
          value: can-reach=$(NODEIP)
        - name: IP
          value: autodetect
        - name: CALICO_IPV4POOL_IPIP
          value: Always
        - name: CALICO_IPV4POOL_VXLAN
          value: Never
        - name: CALICO_IPV6POOL_VXLAN
          value: Never
        - name: FELIX_IPINIPMTU
          valueFrom:
            configMapKeyRef:
              key: veth_mtu
              name: calico-config
        - name: FELIX_VXLANMTU
          valueFrom:
            configMapKeyRef:
              key: veth_mtu
              name: calico-config
        - name: FELIX_WIREGUARDMTU
          valueFrom:
            configMapKeyRef:
              key: veth_mtu
              name: calico-config
         #calicoipv4range
        - name: CALICO_IPV4POOL_CIDR
          value: 10.244.0.0/16
        - name: CALICO_IPV4POOL_BLOCK_SIZE
          value: "24"
        - name: CALICO_DISABLE_FILE_LOGGING
          value: "true"
        - name: FELIX_DEFAULTENDPOINTTOHOSTACTION
          value: ACCEPT
        - name: FELIX_IPV6SUPPORT
          value: "false"
```

## calico的ippool

```yaml
#旧ippool
[root@master1 ~]# kubectl get ippool -oyaml
apiVersion: v1
items:
- apiVersion: crd.projectcalico.org/v1
  kind: IPPool
  metadata:
    annotations:
      projectcalico.org/metadata: '{"uid":"4af9f499-8333-4995-90d7-fbbb639a7f74","creationTimestamp":"2022-12-01T15:05:17Z"}'
    creationTimestamp: "2022-12-01T15:08:12Z"
    generation: 1
    name: default-ipv4-ippool
    resourceVersion: "916"
    uid: 5fc88ba0-86e0-4d68-82d4-412537d2d1d2
  spec:
    allowedUses:
    - Workload
    - Tunnel
    blockSize: 24
    cidr: 10.244.0.0/16
    ipipMode: Always
    natOutgoing: true
    nodeSelector: all()
    vxlanMode: Never
kind: List
metadata:
  resourceVersion: ""
  selfLink: ""

#新ippool
# Please edit the object below. Lines beginning with a '#' will be ignored,
# and an empty file will abort the edit. If an error occurs while saving this file will be
# reopened with the relevant failures.
#
apiVersion: crd.projectcalico.org/v1
kind: IPPool
metadata:
  annotations:
    projectcalico.org/metadata: '{"uid":"4af9f499-8333-4995-90d7-fbbb639a7f74","creationTimestamp":"2022-12-01T15:05:17Z"}'
  creationTimestamp: "2022-12-01T15:08:12Z"
  generation: 2
  name: default-ipv4-ippool
  resourceVersion: "3977007"
  uid: 5fc88ba0-86e0-4d68-82d4-412537d2d1d2
spec:
  allowedUses:
  - Workload
  - Tunnel
  blockSize: 24
  cidr: 10.245.0.0/16
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
  vxlanMode: Never
```

刚改完重启节点 使用`route -n`查看节点分配的`IP range`

```bash
#重启后route -n 查看节点状态
[root@master1 ~]# route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         11.1.100.254    0.0.0.0         UG    100    0        0 ens192
10.244.32.0     11.1.100.133    255.255.255.0   UG    0      0        0 ens192
10.244.161.0    0.0.0.0         255.255.255.0   U     0      0        0 *
10.244.161.11   0.0.0.0         255.255.255.255 UH    0      0        0 calicadba4a333e
10.244.208.0    11.1.100.132    255.255.255.0   UG    0      0        0 ens192
10.245.32.0     11.1.100.133    255.255.255.0   UG    0      0        0 tunl0
10.245.161.0    0.0.0.0         255.255.255.0   U     0      0        0 *
10.245.161.1    0.0.0.0         255.255.255.255 UH    0      0        0 calicadba4a333e
10.245.208.0    11.1.100.132    255.255.255.0   UG    0      0        0 tunl0
11.1.100.0      0.0.0.0         255.255.255.0   U     100    0        0 ens192
172.17.0.0      0.0.0.0         255.255.0.0     U     0      0        0 docker0
192.168.192.0   0.0.0.0         255.255.255.0   U     0      0        0 zt5u4rkdlr

```
