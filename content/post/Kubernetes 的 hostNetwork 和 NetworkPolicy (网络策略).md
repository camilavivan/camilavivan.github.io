---
title: Kubernetes 的 hostNetwork 和 NetworkPolicy (网络策略)
date: 2022-12-29 08:40:33
type: categories
tags: 
    - kubernetes
keywords: 
    - kubernetes
categories: 
    - kubernetes
---

## 1. hostNetwork 介绍

> 在 k8s 中，若 **pod 使用主机网络**，也就是`hostNetwork=true`。则该pod会使用主机的dns以及所有网络配置，**默认情况下是无法使用 k8s 自带的 dns 解析服务**，但是可以修改 DNS 策略或者修改主机上的域名解析（`/etc/resolv.conf`），使主机可以用 k8s 自身的 dns 服务。一般通过 DNS 策略（`ClusterFirstWithHostNet`）来使用 k8s DNS 内部域名解析，k8s DNS 策略如下：

- `Default`：继承 Pod 所在宿主机的 DNS 设置，hostNetwork 的默认策略。
- `ClusterFirst（默认DNS策略）`：优先使用 kubernetes 环境的 dns 服务，将无法解析的域名转发到从宿主机继承的 dns 服务器。
- `ClusterFirstWithHostNet`：和 ClusterFirst 类似，对于以 `hostNetwork` 模式运行的 Pod 应明确知道使用该策略。也是可以同时解析内部和外部的域名。
- `None`：忽略 kubernetes 环境的 dns 配置，通过 spec.dnsConfig 自定义 DNS 配置。

一般使用主机网络就增加如下几行即可：

```yaml
hostNetwork: true
dnsPolicy: "ClusterFirstWithHostNet"
```

**『示例』：`hostNetwork.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      # 使用主机网络
      hostNetwork: true
      # 该设置是使POD使用k8s的dns，dns配置在/etc/resolv.conf文件中
      # 如果不加，pod默认使用所在宿主主机使用的DNS，这样会导致容器
      # 内不能通过service name访问k8s集群中其他POD
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: nginx
        image: nginx:1.7.9
        ports:
        - name: metrics
          # 如果hostNetwork: true，hostPort必须跟containerPort一样，所以hostPort一般不写，端口也是占用宿主机上的端口。
          hostPort: 80
          containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  selector:
    app: nginx
  type: NodePort
  ports:
    - name: http
      port: 80
      targetPort: 80
      protocol: TCP
      nodePort: 31280
```

**hostPort 和 NodePort的区别：**

> `hostPort` 只会在运行机器上开启端口， `NodePort` 是所有 Node 上都会开启端口。

- hostPort 是由 portmap 这个 cni 提供 portMapping 能力，同时如果想使用这个能力，在配置文件中一定需要开启 portmap。
- 使用 hostPort 后，会在 iptables 的 nat 链中插入相应的规则，而且这些规则是在 KUBE-SERVICES 规则之前插入的，也就是说会优先匹配 hostPort 的规则，我们常用的 NodePort 规则其实是在 KUBE-SERVICES 之中，也排在其后。
- hostport 可以通过 iptables 命令查看到， 但是无法在 ipvsadm 中查看到。
- 使用 lsof/netstat 也查看不到这个端口,这是因为 hostport 是通过 iptables 对请求中的目的端口进行转发的，并不是在主机上通过端口监听。
- **在生产环境中不建议使用 hostPort**。

## 2. K8s 网络策略 NetworkPolicy

![p](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212290837401.png)

> 如果你希望在 IP 地址或端口层面（OSI 第 3 层或第 4 层）控制网络流量， 则你可以考虑为集群中特定应用使用 Kubernetes 网络策略（`NetworkPolicy`）。**`NetworkPolicy` 是一种以应用为中心的结构，允许你设置如何允许 Pod 与网络上的各类网络“实体”** 通信。官方文档

网络策略是通过**网络插件**来实现，常用的网络插件`Flannel`和`Calico`：

- `Flannel`：只能提供网络通讯，**不提供网络策略**，如果需要使用网络策略，建议使用下面的 Calico，关于 Flannel 更详细的介绍和安装可以参考我这篇文章：Kubernetes（k8s）CNI（flannel）网络模型原理。
- `Calico`：**支持丰富的网络策略**，Calico以其性能、灵活性而闻名。后面也会出相关文章详细介绍 Calico。

更多了解更多的网络策略，可以参考[官方文档](https://kubernetes.io/docs/concepts/cluster-administration/addons/)

Pod 可以通信的 Pod 是通过如下三个标识符的组合来辩识的：

- 其他被允许的 Pods（例外：Pod 无法阻塞对自身的访问）
- 被允许的名字空间
- IP 组块（例外：与 Pod 运行所在的节点的通信总是被允许的， 无论 Pod 或节点的 IP 地址）

## 3. Pod 隔离的两种类型

Pod 有两种隔离: **出口的隔离**和**入口的隔离**。默认情况下，出口和入口都是非隔离的。

- **网络策略是相加的**，所以不会产生冲突。如果策略适用于 Pod 某一特定方向的流量， Pod 在对应方向所允许的连接是适用的网络策略所允许的集合。因此，评估的顺序不影响策略的结果。
- 要允许从源 Pod 到目的 Pod 的连接，源 Pod 的出口策略和目的 Pod 的入口策略都需要允许连接。如果任何一方不允许连接，建立连接将会失败。

## 4. NetworkPolicy 资源

### 4.1 NetworkPolicy 示例演示

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-network-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      role: db
  policyTypes:
 - Ingress
 - Egress
  ingress:
 - from:
    - ipBlock:
        cidr: 172.17.0.0/16
        except:
        - 172.17.1.0/24
    - namespaceSelector:
        matchLabels:
          project: myproject
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 6379
  egress:
 - to:
    - ipBlock:
        cidr: 10.0.0.0/24
    ports:
    - protocol: TCP
      port: 5978
```

必需字段：与所有其他的 Kubernetes 配置一样，NetworkPolicy 需要 apiVersion、 kind 和 metadata 字段。关于配置文件操作的一般信息， 请参考配置 Pod 以使用 ConfigMap 和对象管理。

- `spec`：NetworkPolicy 规约 中包含了在一个名字空间中定义特定网络策略所需的所有信息。
- `podSelector`：每个 NetworkPolicy 都包括一个 podSelector， 它对该策略所适用的一组 Pod 进行选择。示例中的策略选择带有 "role=db" 标签的 Pod。空的 podSelector 选择名字空间下的所有 Pod。
- `policyTypes`：每个 NetworkPolicy 都包含一个 policyTypes 列表，其中包含 Ingress 或 Egress 或两者兼具。policyTypes 字段表示给定的策略是应用于进入所选 Pod 的入站流量还是来自所选 Pod 的出站流量，或两者兼有。如果 NetworkPolicy 未指定 policyTypes 则默认情况下始终设置 Ingress；如果 NetworkPolicy 有任何出口规则的话则设置 Egress。
- `ingress`：每个 NetworkPolicy 可包含一个 ingress 规则的白名单列表。每个规则都允许同时匹配 from 和 ports 部分的流量。示例策略中包含一条简单的规则：它匹配某个特定端口，来自三个来源中的一个，第一个通过 ipBlock 指定，第二个通过 namespaceSelector 指定，第三个通过 podSelector 指定。
- `egress`：每个 NetworkPolicy 可包含一个 egress 规则的白名单列表。每个规则都允许匹配 to 和 port 部分的流量。该示例策略包含一条规则， 该规则将指定端口上的流量匹配到 10.0.0.0/24 中的任何目的地。

所以，该网络策略示例:

- 隔离 "default" 名字空间下 "role=db" 的 Pod （如果它们不是已经被隔离的话）。

- （Ingress 规则）允许以下 Pod 连接到 "default" 名字空间下的带有 "role=db" 标签的所有 Pod 的 6379 TCP 端口：

  - "default" 名字空间下带有 "role=frontend" 标签的所有 Pod
  - 带有 "project=myproject" 标签的所有名字空间中的 Pod
  - IP 地址范围为 172.17.0.0–172.17.0.255 和 172.17.2.0–172.17.255.255 （即，除了 172.17.1.0/24 之外的所有 172.17.0.0/16）

- （Egress 规则）允许 “default” 命名空间中任何带有标签 “role=db” 的 Pod 到 CIDR 10.0.0.0/24 下 5978 TCP 端口的连接。

### 4.2 选择器 to 和 from 的行为

可以在 ingress 的 from 部分或 egress 的 to 部分中指定四种选择器：

- `podSelector`：此选择器将在与 NetworkPolicy 相同的名字空间中选择特定的 Pod，应将其允许作为入站流量来源或出站流量目的地。
- `namespaceSelector`：此选择器将选择特定的名字空间，应将所有 Pod 用作其入站流量来源或出站流量目的地。
- `namespaceSelector` 和 `podSelector`：一个指定 namespaceSelector 和 podSelector 的 to/from 条目选择特定名字空间中的特定 Pod。注意使用正确的 YAML 语法；下面的策略：

```yaml
  ...
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          user: alice
      podSelector:
        matchLabels:
          role: client
  ...
```

在 from 数组中仅包含一个元素，只允许来自标有 role=client 的 Pod 且该 Pod 所在的名字空间中标有 user=alice 的连接。但是 这项 策略：

```yaml
 ...
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          user: alice
    - podSelector:
        matchLabels:
          role: client
  ...
```

这里只是把官网的摘了一部分，官网介绍的比较清楚，这里就不粘贴复制了，可以参考[官方文档](https://kubernetes.io/zh-cn/docs/concepts/services-networking/network-policies/)

## 5.总结

- 在 k8s 上网络策略是**白名单机制**，所谓白名单机制是指，只有明确定义的策略才会被允许放行，默认没有指定的规则就是拒绝的，即条件不匹配的都会被拒绝。
- 其次对于 ingress 或 egress 来说，对应的 `from` 或 `to` 都是用来指定访问端或被访问端的信息。
- 如果我们在对应的字段中**没有定义 namespaceSelector 字段**，**默认 ingress 或 egrss 会匹配当前 netpol 所在名称空间**，即在没有明确指定 namespaceSelector 字段时，对应的其他条件都是针对当前 netpol 所在名称空间。
- **多个条件组合**使用，如果多个条件都在一个列表中，则表示多个条件间是与关系，即指定的条件需要同时满足对应策略才会放行。
- 如果**多个条件不再同一个列表中**，则多个条件之间是或关系，即满足其中一个条件都会被对应策略放行。
