---
title: 解决ArgoCD Ingress资源一直处于Progressing状态
date: 2023-01-12  13:22:05
type: categories
tags: 
    - ArgoCD
    - kubernetes
    - CICD
keywords: 
    - kubernetes
    - ArgoCD
categories: 
    - kubernetes
    - CICD
    - ArgoCD
---

## 解决ArgoCD Ingress资源一直处于Progressing状态

这个问题，其实需要分版本做不同的处理。
主要是通过ArgoCD健康检查的自定义的资源检查来排除对Ingress的检查，主要请参考这两篇文章：
<https://argo-cd.readthedocs.io/en/stable/operator-manual/health/#ingress>
<https://github.com/argoproj/argo-cd/issues/1704>

我这里是使用的Ngnix Ingress，并且版本为v1.20.0所以进行如下设置：

```bash
kubectl edit cm -n argocd argocd-cm
```

```yaml
data:ba
  resource.customizations: |
    networking.k8s.io/Ingress:
        health.lua: |
          hs = {}
          hs.status = "Healthy"
          return hs
```

如果是v1.20.0版本以下的集群。

```yaml
data:
  resource.customizations.health.extensions_Ingress: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "SoulChild"
    return hs
  resource.customizations.useOpenLibs.extensions_Ingress: "true"
```

最后同步。

```bash
argocd app sync <Your APP> --force
```
