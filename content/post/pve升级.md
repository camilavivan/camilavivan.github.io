---
title: PVE升级
date: 2023-04-10 10:35:51
type: categories
tags: 
    - PVE
keywords: PVE
categories: 
    - PVE
---

### 简介

想着升级下家里的pve，因为最新的版本貌似支持暗黑模式了

### 操作

首先要备份原来的企业源

```bash
mv /etc/apt/sources.list.d/pve-enterprise.list /etc/apt/sources.list.d/pve-enterprise.list.bak
```

之后备份下原来debian的源

```bash
cp /etc/apt/sources.list /etc/apt/sources.list.bak
```

之后替换原来的源为ustc的源

```bash
sed -i 's|^deb http://ftp.debian.org|deb https://mirrors.ustc.edu.cn|g' /etc/apt/sources.list
sed -i 's|^deb http://security.debian.org|deb https://mirrors.ustc.edu.cn/debian-security|g' /etc/apt/sources.list
```

添加pve-no-subscription源

```bash
source /etc/os-release
echo "deb https://mirrors.ustc.edu.cn/proxmox/debian/pve $VERSION_CODENAME pve-no-subscription" > /etc/apt/sources.list.d/pve-no-subscription.list
```

最后更新系统

```bash
apt update
apt dist-upgrade
```

更新完成之后重启下系统

```bash
reboot
```
