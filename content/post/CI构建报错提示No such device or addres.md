---
title: CI构建报错提示No such device or addres
date: 2023-01-04 10:18:51
type: categories
tags: 
    - kubernetes
    - CICD
    - Gitlab
keywords: 
    - kubernetes 
    - CICD
    - Gitlab
categories: 
    - kubernetes
    - CICD
---

## 问题

CI构建报错，报错内容如下

```bash
fatal: could not read Username for 'https://gitee.com': No such device or address
```

## 原因

这是因为git config文件中没有用户身份信息。

## 解决方法

在请求串中加入身份信息即可： 格式

```bash
https://[username]:[password]@gitee.com/[username]/project.git
```

操作如下：

```bash
##修改.git/config
cd .git
vim config
​
[init]
        defaultBranch = none
[fetch]
        recurseSubmodules = false
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
[lfs]
        repositoryformatversion = 0
[remote "origin"]
        url = http://gitlab.zjwsd.com/zzh/dataoffice.git    ###此处修改为带用户身份信息的地址
        fetch = +refs/heads/*:refs/remotes/origin/*
​
​
url=https://choudalao:12345@gitee.com/choudalao/test.git
###CI的yaml直接sed替换
 - export nurl="url = http://gitlab:wsd12345@gitlab.zjwsd.com/zzh/dataoffice.git"
 - sed -i -e "s%url = http://gitlab.zjwsd.com/zzh/dataoffice.git%$nurl%g " .git/config
```
