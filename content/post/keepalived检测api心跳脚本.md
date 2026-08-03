---
title: keepalived检测api心跳脚本
date: 2023-04-10 14:38:51
type: categories
tags: 
    - Linux
keywords: Linux
categories: 
    - Linux
    - containerd
---

## 形式一

```bash
#!/bin/bash

err=0
for k in $(seq 1 3)
do
    check_code=$(pgrep haproxy)
    if [[ $check_code == "" ]]; then
        err=$(expr $err + 1)
        sleep 1
        continue
    else
        err=0
        break
    fi
done

if [[ $err != "0" ]]; then
    echo "systemctl stop keepalived"
    /usr/bin/systemctl stop keepalived
    exit 1
else
    exit 0
fi
```

## 形式二

```bash
#!/bin/sh

errorExit() {
 echo "*** $*" 1>&2
 exit 1
}

curl --silent --max-time 2 --insecure https://localhost:${APISERVER_DEST_PORT}/ -o /dev/null || errorExit "Error GET https://localhost:${APISERVER_DEST_PORT}/"
if ip addr | grep -q ${APISERVER_VIP}; then
 curl --silent --max-time 2 --insecure https://${APISERVER_VIP}:${APISERVER_DEST_PORT}/ -o /dev/null || errorExit "Error GET https://${APISERVER_VIP}:${APISERVER_DEST_PORT}/"
fi
<!-- 它也有一些基础变量需要填充:
• ${APISERVER_VIP} 是 keepalive 集群主机之间协商的虚拟IP地址。
• ${APISERVER_DEST_PORT} 是Kubernetes与API Server通信的端口。 -->
```
