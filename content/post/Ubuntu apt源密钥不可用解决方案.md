---
title: Ubuntu apt源密钥不可用解决方案
date: 2023-08-24 08:03:51
type: categories
tags: 
    - Linux
    - Ubuntu
keywords: 
    - Linux
    - Ubuntu
categories: 
    - Linux
    - Ubuntu
---

## 现象

- 报错如下

```bash
The following signatures couldn't be verified because the public key is not available: NO_PUBKEY D8FF8E1F7DF8B07E
```

- apt update报错

```bash
W: GPG error: https://repos.influxdata.com/ubuntu focal InRelease: The following signatures couldn't be verified because the public key is not available: NO_PUBKEY D8FF8E1F7DF8B07E
E: The repository 'https://repos.influxdata.com/ubuntu focal InRelease' is not signed.
N: Updating from such a repository can't be done securely, and is therefore disabled by default.
N: See apt-secure(8) manpage for repository creation and user configuration details.
```

## 解决方案

### 重新获取公钥

```bash
sudo gpg --keyserver keyserver.ubuntu.com --recv-keys D8FF8E1F7DF8B07E
```

### 导出公钥并加入apt信任密钥

```bash
sudo gpg --export --armor 467B942D3A79BD29 | sudo apt-key add -
```

`apt update` 不再报错
