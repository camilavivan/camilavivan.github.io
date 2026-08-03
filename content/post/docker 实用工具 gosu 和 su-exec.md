---
title: Docker 实用工具 gosu 和 su-exec
date: 2023-02-20 09:38:51
type: categories
tags: 
    - Docker
keywords: Docker
categories: 
    - Docker
---

## volume 的权限问题

在 Docker 中，需要把 host 的目录挂载到 container 中作为 volume 使用时，往往会发生文件权限问题。常见的现象是，container 对该路径并无写权限，以致其中服务的各种千奇百怪的问题。

导致这类问题的原因，是 container 内外的 UID 不同。比如，host 当前使用 docker 的用户 UID 是 1000（这是默认第一个用户的 UID）。如果 container 内的 UID 是 2000，那么 host 创建的目录对 container 来说就并非 owner，默认情况下不可写入。

此外还有一种情况，那就是挂载前，host 上不存在被挂载的目录。Docker 会以 root 权限，先创建该目录，再挂载。这就导致，即使 host 与 container 的 UID 都是 1000，也会出现无写权限的情况。这种现象，只会在初始化时出现，但也足够令新手困惑，令老手厌烦。

为什么在 Dockerfile 中不能把 volume 的权限配置好？因为 Dockerfile 是对 image 的描述，而 volume 则是 container 的内容。Dockerfile 中做出的权限配置，对非 volume 来说是可以生效的，而对 volume 则不然。本质上，host 挂载到 volume 上的目录，是属于 host 的。Dockerfile 是在`docker build`期间执行，而 volume 则是在`docker run`的时候产生。

其实，Docker 在自动创建 volume 路径时，应该再自动地把它修改为 container 内前台进程的 user:group。然而 Docker 目前并无此类机制，俺们这些用户就只能另谋出路。

一般的临时方案，都是去手动修改权限。要么通过 chown，把 owner 改成 container 内用户的 UID；要么通过 chmod 777，搞成所有用户通用。这些当然不是什么好的长期方案，也违背了 Docker 方便部署的初衷。

目前看来，最好的方案，还是定制 Dockerfile 的 ENTRYPOINT。

## ENTRYPOINT

ENTRYPOINT 有以下几个重点：

- ENTRYPOINT 指定镜像的默认入口命令，该入口命令会在启动容器时作为根命令执行，所有其他传入值作为该命令的参数。
- ENTRYPOINT 的值可以通过`docker run --entrypoint`来覆盖掉。
- 只有 Dockerfile 中的最后一条 ENTRYPOINT 指令会起作用。

当指定了 ENTRYPOINT 后，CMD 的含义就发生了改变，不再是直接的运行其命令，而是将 CMD 的内容作为参数传给 ENTRYPOINT 指令。换句话说实际执行时，会变成`<ENTRYPOINT> "<CMD>"`。

所以在 dockerfile 中 ENTRYPOINT 里编写一个入口脚本`entrypoint.sh`或`docker-entrypoint.sh`。在容器运行的时候通过 ENTRYPOINT 来做一些操作，比如把 volume 挂载的目录权限给改正确，然后再切换普通用户运行正常的程序进程。

## gosu 和 su-exec

gosu 的 github 仓库地址：

> <https://github.com/tianon/gosu>

用法：

```bash
$ gosu
Usage: ./gosu user-spec command [args]
   eg: ./gosu tianon bash
       ./gosu nobody:root bash -c 'whoami && id'
       ./gosu 1000:1 id

./gosu version: 1.1 (go1.3.1 on linux/amd64; gc)
```

文档中的简单例子：

```bash
$ docker run -it --rm ubuntu:trusty su -c 'exec ps aux'
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.0  46636  2688 ?        Ss+  02:22   0:00 su -c exec ps a
root         6  0.0  0.0  15576  2220 ?        Rs   02:22   0:00 ps aux
$ docker run -it --rm ubuntu:trusty sudo ps aux
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  3.0  0.0  46020  3144 ?        Ss+  02:22   0:00 sudo ps aux
root         7  0.0  0.0  15576  2172 ?        R+   02:22   0:00 ps aux
$ docker run -it --rm -v $PWD/gosu-amd64:/usr/local/bin/gosu:ro ubuntu:trusty gosu root ps aux
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.0   7140   768 ?        Rs+  02:22   0:00 ps aux
```

不管是`su`还是`sudo`，他们在执行`ps aux`命令的 PID 编号都不为 1。在容器中虽然可以，但是这不是一个好的方案，容器里面 PID=1 的进程就是应用本身。因此可以使用`gosu`命令来切换用户执行命令。

对于 debian 安装方法如下：

### Debian 9（“Debian Stretch”）或更新的版本

```bash
RUN set -eux; \
 apt-get update; \
 apt-get install -y gosu; \
 rm -rf /var/lib/apt/lists/*; \
# verify that the binary works
 gosu nobody true
```

### 较旧的 Debian 版本（或较新的 gosu 版本）

```bash
ENV GOSU_VERSION 1.16
RUN set -eux; \
# save list of currently installed packages for later so we can clean up
 savedAptMark="$(apt-mark showmanual)"; \
 apt-get update; \
 apt-get install -y --no-install-recommends ca-certificates wget; \
 if ! command -v gpg; then \
  apt-get install -y --no-install-recommends gnupg2 dirmngr; \
 elif gpg --version | grep -q '^gpg (GnuPG) 1\.'; then \
# "This package provides support for HKPS keyservers." (GnuPG 1.x only)
  apt-get install -y --no-install-recommends gnupg-curl; \
 fi; \
 rm -rf /var/lib/apt/lists/*; \
 \
 dpkgArch="$(dpkg --print-architecture | awk -F- '{ print $NF }')"; \
 wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch"; \
 wget -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch.asc"; \
 \
# verify the signature
 export GNUPGHOME="$(mktemp -d)"; \
 gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4; \
 gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu; \
 command -v gpgconf && gpgconf --kill all || :; \
 rm -rf "$GNUPGHOME" /usr/local/bin/gosu.asc; \
 \
# clean up fetch dependencies
 apt-mark auto '.*' > /dev/null; \
 [ -z "$savedAptMark" ] || apt-mark manual $savedAptMark; \
 apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
 \
 chmod +x /usr/local/bin/gosu; \
# verify that the binary works
 gosu --version; \
 gosu nobody true
```

### 对于 alpine (3.7+)

当使用 Alpine 时，可能也值得检查一下`su-exec`（`apk add --no-cache su-exec`），自从 0.2 版以来，它完全与`gosu`兼容，文件大小只有几分之一。

```bash
ENV GOSU_VERSION 1.16
RUN set -eux; \
 \
 apk add --no-cache --virtual .gosu-deps \
  ca-certificates \
  dpkg \
  gnupg \
 ; \
 \
 dpkgArch="$(dpkg --print-architecture | awk -F- '{ print $NF }')"; \
 wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch"; \
 wget -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch.asc"; \
 \
# verify the signature
 export GNUPGHOME="$(mktemp -d)"; \
 gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4; \
 gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu; \
 command -v gpgconf && gpgconf --kill all || :; \
 rm -rf "$GNUPGHOME" /usr/local/bin/gosu.asc; \
 \
# clean up fetch dependencies
 apk del --no-network .gosu-deps; \
 \
 chmod +x /usr/local/bin/gosu; \
# verify that the binary works
 gosu --version; \
 gosu nobody true
```

### entrypoint 脚本文件

脚本例 1：

```bash
#!/bin/sh
set -e
ls ${LOG_PATH} > /dev/null 2>&1 || mkdir -p ${LOG_PATH}
chown -R www-data ${LOG_PATH}
if [ $# -gt 0 ];then
    #su ${USERNAME} -c "exec $@"
    exec su-exec www-data $@
else
    #su ${USERNAME} -c "exec uwsgi --ini uwsgi.ini --http=0.0.0.0:${DJANGO_PORT}"
    exec su-exec www-data uwsgi --ini uwsgi.ini --http=0.0.0.0:${DJANGO_PORT}
fi
```

脚本说明：

- `set -e`：如果出现命令执行失败，那么就应该退出脚本不继续往下执行，避免失败对后续有影响。可以避免操作失败还继续往下执行的问题。
- `exec`：系统调用`exec`是以新的进程去代替原来的进程，但进程的 PID 保持不变，可以保证容器的主程序 PID=1。

脚本例 2：

```bash
#!/bin/sh
set -e
if [ "$1" = 'uwsgi' -a "$(id -u)" = '0' ]
then
    ls ${LOG_PATH} > /dev/null 2>&1 || mkdir -p ${LOG_PATH}
    chown -R www-data ${LOG_PATH}
    exec su-exec www-data "$0" "$@"
fi
exec "$@"
```

脚本说明：

- 当前用户是 root 的话, 那么创建和修改 LOG_PATH 目录权限，并切换到 www-data 的身份，带上剩余的参数，再次运行 docker-entrypoint.sh 文件（`"$0"`表示 docker-entrypoint.sh 本身，`"$@"`表示剩余的参数）。如果此脚本其他位置还有需要由 www-data 用户执行的代码，则可以一并执行。
- 当再次执行该脚本时由于已经不是 root 用户了, 会直接执行`exec "$@"`, 于是直接执行带的参数,即 CMD 定义的脚本。

在 Dockerfile 中添加 docker-entrypoint.sh 脚本，并且需要注意`x`执行权限，否则将无权限执行。

```bash
COPY docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]
```

通过此 docker-entrypoint.sh 脚本，可以在容器运行时强制把目录权限修改成需要的权限，即使 docker 通过 root 用户初始化创建的 volume 挂载目录。如此一来，就可以通过容器中的普通用户来运行程序，并在这个普通的权限的目录中写入文件。
