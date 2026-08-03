---
title: 盘点Linux的几种配置代理方式
date: 2023-01-04 09:42:51
type: categories
tags: 
    - Linux
    - Docker
    - Containerd
keywords: Linux
categories: 
    - Linux
---



## 编译环境代理

### 1、linux设置代理

```bash

export http_proxy=http://10.67.11.138:7890
export https_proxy=http://10.67.11.138:7890
```

### 2、Container设置代理（container内部服务代理）

```bash
cat /root/.docker/config.json 
```

```toml
{
    "proxies": {
 "default": {
  "httpProxy": "http://10.67.11.138:7890",
  "httpsProxy": "http://10.67.11.138:7890"
 }

    }
}
```

### 3、dockerd代理（docker pull）

```bash
systemctl cat docker
# /usr/lib/systemd/system/docker.service
...

[Service]
...
Environment="HTTP_PROXY=http://10.67.11.138:7890/"
Environment="HTTPS_PROXY=http://10.67.11.138:7890/"
...
```
