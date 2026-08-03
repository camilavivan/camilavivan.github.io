---
title: （Docker）Alpine apk设置国内源
date: 2022-12-29 15:13:51
type: categories
tags: 
    - Docker
keywords: Docker
categories: 
    - Docker
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302141438966.jpg
---

## 运行容器xxx，示例

```bash
docker run -d  \
--name jk -u root \
-p 9090:8080  \
-v /var/jenkins_home:/var/jenkins_home  \
jenkinsci/blueocean
```

## 进入容器

```bash
docker exec -it jk bash #这里的“jk”是指你创建的镜像容器
```

修改源

```bash
sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
```

更新设置

```bash
apk update
```

然后你就可以愉快的使用apk了：apk add maven

附录

```bash
#apk命令

apk update #更新最新本地镜像源
apk upgrade #升级软件
apk add --upgrade busybox #指定升级部分软件包
apk search #查找所以可用软件包
apk search -v #查找所有可用软件包及其描述内容
apk search -v 'acf*' #通过软件包名称查找软件包
apk search -v -d 'docker' #通过描述文件查找特定的软件包
apk info #列出所有已安装的软件包
apk info -a zlib #显示完整的软件包信息
apk info --who-owns /sbin/lbu #显示指定文件属于的包
apk add --allow-untrusted /path/to/file.apk  #本地安装
```

添加镜像地址

```bash
a. 编辑/etc/apk/repositories，在文件内添加对应的镜像源
b. 使用sed命令，如：sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
```

常用apk镜像站
清华TUNA镜像源：`https://mirror.tuna.tsinghua.edu.cn/alpine/`
中科大镜像源：`http://mirrors.ustc.edu.cn/alpine/`
阿里云镜像源：`http://mirrors.aliyun.com/alpine/`

```html
http://dl-cdn.alpinelinux.org/alpine/
http://nl.alpinelinux.org/alpine/
http://uk.alpinelinux.org/alpine/
http://dl-2.alpinelinux.org/alpine/
http://dl-3.alpinelinux.org/alpine/
http://dl-4.alpinelinux.org/alpine/
http://dl-5.alpinelinux.org/alpine/
http://dl-8.alpinelinux.org/alpine/
http://mirror.yandex.ru/mirrors/alpine/
http://mirrors.gigenet.com/alpinelinux/
http://mirror1.hs-esslingen.de/pub/Mirrors/alpine/
http://mirror.leaseweb.com/alpine/
http://repository.fit.cvut.cz/mirrors/alpine/
http://alpine.mirror.far.fi/
http://alpine.mirror.wearetriple.com/
http://mirror.clarkson.edu/alpine/
http://linorg.usp.br/AlpineLinux/
http://ftp.yzu.edu.tw/Linux/alpine/
http://mirror.aarnet.edu.au/pub/alpine
http://mirror.csclub.uwaterloo.ca/alpine
http://ftp.acc.umu.se/mirror/alpinelinux.org
http://ftp.halifax.rwth-aachen.de/alpine
http://speglar.siminn.is/alpine
http://mirrors.dotsrc.org/alpine
http://ftp.tsukuba.wide.ad.jp/Linux/alpine
http://mirror.rise.ph/alpine
http://mirror.neostrada.nl/alpine/
```
