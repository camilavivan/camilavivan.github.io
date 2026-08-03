---
title: kubectl的多样用法
date: 2023-02-14 13:31:33
type: 
    - kubernetes
    - kubectl
tags: 
    - kubernetes
    - kubectl
keywords: 
    - kubernetes
    - kubectl
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301101650972.png
---
## 简述

kubectl是K8s官方附带的命令行工具, 可以方便的操作K8s集群. 这篇文章主要介绍一些kubectl的别样用法, 希望读者有基础的K8s使用经验.

## 打印当前使用的API

```bash
# kubectl 的主要作用就是与ApiServer进行交互, 而交互的过程, 我们可以通过下面的方式来打印, 
# 这个命令尤其适合调试自己的api接口时使用.
kubectl get ns -v=9
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302141434405.png)

## 按状态筛选容器以及删除

```bash
kubectl get pods --all-namespaces --field-selector status.phase=Pending -o json | \
  jq '.items[] | "kubectl delete pods \(.metadata.name) -n \(.metadata.namespace)"' | \
  xargs -n 1 bash -c


# 这个命令要拆开来看
# 首先, 获取所有ns中状态为Pending的pods, 并以json形式输出
# 这个语句其实由很多变体, 比如,我想查找Failed的状态, 或是某个deployment
kubectl get pods --all-namespaces --field-selector status.phase=Pending -o json 

# 针对json变量进行处理, 生成可用的脚本
# 这里是我想介绍的重点, 利用jq以及kubectl的输出, 构建出可用的命令
jq '.items[] | "kubectl delete pods \(.metadata.name) -n \(.metadata.namespace)"'

# 执行每一条命令
# 注意, 这种命令一定要好好调试, 删掉预期之外的pod就不好了.
xargs -n 1 bash -c


# 例如, 下面的语句可以找到所有的Pods并打印可以执行的语句
kubectl get pods --all-namespaces --field-selector status.phase=Running -o json | \
  jq '.items[] | "kubectl get pods \(.metadata.name) -o wide -n \(.metadata.namespace)"'

"kubectl get pods metrics-server-6d684c7b5-gtd6q -o wide -n kube-system"
"kubectl get pods local-path-provisioner-58fb86bdfd-98frc -o wide -n kube-system"
"kubectl get pods nginx-deployment-574b87c764-xppmx -o wide -n default"

# 当然, 如果只是删除单个NS下面的一些pods, 我会选择下面的方法, 但是它操作多个NS就很不方便了.
kubectl -n default get pods  | grep Completed | awk '{print $1}' | xargs kubectl -n default delete pods
```

## 统计具体某台机器上运行的所有pod

> kubectl可以使用两种选择器, 一种是label, 一种是field, 可以看官网的介绍: Labels and Selectors Field Selectors

```bash
# 它是一种选择器, 可以与上面的awk或者xargs配合使用.
# 我个人平时都不喜欢用这个, 直接get全部pods, 然后grep查找感觉更快
kubectl get pods --all-namespaces -o wide --field-selector spec.nodeName=pve-node1
```

## 统计Pod在不同机器的具体数量分布

不知道有读者看过我的这篇文章: 基于kubernetes的PaaS平台中细力度控制pods方案的实现. 均衡分布的工作前提是得知pod在各个机器的分布情况. 最好的办法就是我们得到pod信息之后进行简单的统计, 这个工作可以使用awk实现.

```bash
kubectl -n default get pods -o wide -l app="nginx" | awk '{print $7}'|\
 awk '{ count[$0]++  } 
 END { 
   printf("%-35s: %s\n","Word","Count");
   for(ind in count){
    printf("%-35s: %d\n",ind,count[ind]);
   }
 }'

# 执行结果如下
Word                               : Count
NODE                               : 1
pve-node1                          : 1
pve-node2                          : 1


# awk的语法我没深入了解, 有兴趣的读者可以研究看看, 这里我就不求甚解了.
```

## kubectl proxy的使用

你可以理解为这个命令为K8s的ApiServer做了一层代理, 使用该代理, 你可以直接调用API而不需要经过鉴权. 启动之后, 甚至可以实现kubectl套娃, 下面是一个例子:

```bash
# 当你没有设置kubeconfig而直接调用kubectl时
kubectl get ns -v=9
# 可以打印出下面类似的错误
curl -k -v -XGET  -H "Accept: application/json, */*" -H "User-Agent: kubectl/v1.21.3 (linux/amd64) kubernetes/ca643a4" 'http://localhost:8080/api?timeout=32s'
skipped caching discovery info due to Get "http://localhost:8080/api?timeout=32s": dial tcp 127.0.0.1:8080: connect: connection refused                     
# 也就是说当你不指定kubeconfig文件时, kubectl会默认访问本机的8080端口
# 那么我们先启动一个kubectl proxy, 然后指定监听8080, 再使用kubectl直接访问, 是不是就可行了呢, 
# 事实证明, 安全与预想一致.
KUBECONFIG=~/.kube/config-symv3 kubectl proxy  -p 8080
kubectl get ns
NAME                           STATUS   AGE
default                        Active   127d
```

> 默认启动的proxy是屏蔽了某些api的, 并且有一些限制, 例如无法使用exec进入pod之中 可以使用kubectl proxy --help来看, 例如

```bash
# 仅允许本机访问
--accept-hosts='^localhost$,^127\.0\.0\.1$,^\[::1\]$': Regular expression for hosts that the proxy should accept.
# 不允许访问下面的api, 也就是说默认没法exec进入容器
--reject-paths='^/api/.*/pods/.*/exec,^/api/.*/pods/.*/attach': Regular expression for paths that the proxy should reject. Paths specified here will be rejected even accepted by --accept-paths.

# 想跳过exec的限制也很简单, 把reject-paths去掉就可以了
kubectl proxy -p 8080 --keepalive 3600s --reject-paths='' -v=9 
```

有人说这个kubectl proxy可能没什么作用, 那可能仅仅是你还没有实际的应用场景. 例如当我想要调试K8s dashboard代码的时候. 如果直接使用kubeconfig文件, 我没法看到具体的请求过程, 如果你加上一层proxy转发, 并且设置-v=9的时候, 你就自动获得了一个日志记录工具, 在调试时相当有用.
