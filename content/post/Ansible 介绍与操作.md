---
title: Ansible 介绍与操作
date: 2023-01-29  08:56:55
type: categories
tags: 
    - Ansible
keywords: 
    - Ansible
categories: 
    - Ansible
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290855399.png
---

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290845980.png)

## 一、概述

> *`Ansible`是新出现的自动化运维工具，**基于 Python 开发**，集合了众多运维工具（puppet、cfengine、chef、func、fabric）的优点，实现了批量系统配置、批量程序部署、批量运行命令等功能。*

Ansible 特点：

- 部署简单，只需要在主控端部署 Ansible 环境，被控端无需作任何操作
- 默认使用**SSH 协议**对设备进行管理
- 主从集中化管理
- 配置简单、功能强大、扩展性强
- 支持 API 及自定义模块、可以通过 Python 轻松扩展
- 通过 Playbooks 来定制强大的配置、状态管理
- 对云计算平台、大数据都有很好的支持

> 官方文档：<https://docs.ansible.com/ansible/latest/>
> GitHub 地址：<https://github.com/ansible/ansible>

## 二、Ansible 架构

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290846771.png)

上图为 ansible 的基本架构，从上图可以了解到其由以下部分组成：

- **核心**：ansible
- **核心模块（Core Modules）**：这些都是 ansible 自带的模块
- **扩展模块（Custom Modules）**：如果核心模块不足以完成某种功能，可以添加扩展模块
- **插件（Plugins）**：完成模块功能的补充
- **剧本（Playbooks）**：ansible 的任务配置文件，将多个任务定义在剧本中，由 ansible 自动执行
- **连接插件（Connectior Plugins）**：ansible 基于连接插件连接到各个主机上，虽然 ansible 是使用 ssh 连接到各个主机的，但是它还支持其他的连接方法，所以需要有连接插件
- **主机清单（Host Inventory）**：定义 ansible 管理的主机

## 三、Ansible 工作原理

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290846951.png)
从上面的图上可以了解到：

- 管理端支持`local 、ssh、zeromq` 三种方式连接被管理端，默认使用基于 ssh 的连接，这部分对应上面架构图中的连接模块；
- 可以按应用类型等方式进行`Host Inventory（主机清单）`分类，管理节点通过各类模块实现相应的操作，单个模块，单条命令的批量执行，我们可以称之为 ad-hoc；
- 管理节点可以通过 playbooks 实现多个 task 的集合实现一类功能，如 web 服务的安装部署、数据库服务器的批量备份等。playbooks 我们可以简单的理解为，系统通过组合多条 ad-hoc 操作的配置文件 。

## 四、Ansible 安装与基础配置

```bash
yum install epel-release
yum -y install ansible
ansible --version
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290846464.png)

### 1）开启记录日志

配置文件：`/etc/ansible/ansible.cfg`

```bash
# 去掉前面的'#'号
#log_path = /var/log/ansible.log ==> log_path = /var/log/ansible.log
```

### 2）去掉第一次连接 ssh ask 确认

```bash
# 第一种（推荐）
vi /etc/ansible/ansible.cfg
# 其实就是把#去掉
# host_key_checking = False  ==> host_key_checking = False

# 第二种
vi /etc/ssh/ssh_config
StrictHostKeyChecking ask  ==> StrictHostKeyChecking no
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290847884.png)

## 五、Ansible 的七个命令

> 安装完 ansible 后，发现 ansible 一共为我们提供了七个指令：`ansible`、`ansible-doc`、`ansible-galaxy`、`ansible-lint`、`ansible-playbook`、`ansible-pull`、`ansible-vault`。这里我们只查看 usage 部分，详细部分可以通过 "指令 -h" 的方式获取。

### 1）ansible

ansible 是指令核心部分，其主要用于执行 ad-hoc 命令，即单条命令。默认后面需要跟主机和选项部分，**默认不指定模块时**，使用的是`command`模块。不过默认使用的模块是可以在`/etc/ansible/ansible.cfg` 中进行修改的`#module_name = command`。

```bash
ansible 192.168.182.130 -a 'date'
```

### 2）ansible-doc

该指令用于查看模块信息，常用参数有两个-l 和 -s

```bash
#列出所有已安装的模块ansible-doc  -l
ansible-doc  -l
#查看具体某模块的用法，这里如查看command模块
ansible-doc  -s command
```

### 3）ansible-playbook

`ansible-playbook` 命令是使用最多的指令，其通过读取 playbook 文件后，执行相应的动作，这个后面会做为一个重点来讲。

### 4）ansible-galaxy

`ansible-galaxy` 指令用于方便的从<https://galaxy.ansible.com/> 站点下载第三方扩展模块，我们可以形象的理解其类似于 centos 下的 yum、python 下的 pip 或 easy_install 。如下示例：

```bash
ansible-galaxy install aeriscloud.docker
```

### 5）ansible-lint

ansible-lint 是对 playbook 的语法进行检查的一个工具。用法如下：

```bash
ansible-lint playbook.yml
```

### 6）ansible-pull

该指令使用需要谈到 ansible 的另一种模式，**pull 模式**，这和我们平常经常用的 push 模式刚好相反，其适用于以下场景：你有数量巨大的机器需要配置，即使使用非常高的线程还是要花费很多时间；你要在一个没有网络连接的机器上运行 Anisble，比如在启动之后安装。

### 7）ansible-vault

- `ansible-vault` 主要应用于配置文件中含有敏感信息，又不希望他能被人看到，**vault 可以帮你加密/解密这个配置文件**，属高级用法。
- 主要对于 playbooks 里比如涉及到配置密码或其他变量时，可以通过该指令加密，这样我们通过 cat 看到的会是一个密码串类的文件，编辑的时候需要输入事先设定的密码才能打开。
- 这种 playbook 文件在执行时，需要加上 `--ask-vault-pass`参数，同样需要输入密码后才能正常执行。

## 六、Ansible 主要组成部分

### 1）ansible 命令执行来源

- USER，普通用户，即 system administrator
- USER -> ansile playbook -> ansible
- CMDB，（配置管理数据库）API 调用
- PUBLIC / PRIVATE CLOUD API 调用

### 2）ansible 管理方式

- `Ad-Hoc`，即 ansible 命令，主要用于临时命令使用场景

- `Ansible-playbook`，主要用于长期规划好的，大型项目的场景，需要有前提的规划
  ansible-playbook（剧本）执行过程：

  - 将已有编排好的任务集写入 ansible-playbook
  - 通过 ansible-playbook 命令分拆任务集至逐条 ansible 命令，按预定规则逐条执行

### 3）ansible 主要操作对象

- HOSTS：主机
- NETWORKING：网络设备

注意事项：

- 执行 ansible 的主机一般称为主控端，中控，master 或堡垒机
- 主控端 python 版本需要在 2.6 或以上
- 被控端 python 版本小于 2.4 需要安装 python-simplejson
- 被控端如开启 SELinux 需要安装 libselinux-python
- windows 不能作为主控端

## 七、Ansible 连接被控端方式

### 1）ssh 密钥

```bash
# 生成秘钥
ssh-keygen
# 将秘钥拷贝到被管理服务器上
ssh-copy-id  -i ~/.ssh/id_rsa.pub -p 22 root@192.168.182.130
```

### 2）账号密码

#### 1、命令行配置

```bash
# -k：交互式
ansible -uroot -k 192.168.182.130 -m ping
```

#### 2、配置文件中配置

```bash
# 默认主机配置文件：/etc/ansible/hosts
192.168.182.130 ansible_ssh_user=root ansible_ssh_pass=123456

[web]
192.168.182.130 ansible_ssh_user=root ansible_ssh_pass=123456
```

常用的配置参数如下：
![图片](https://mmbiz.qpic.cn/mmbiz_png/gIkzzLe4eUXn9wDTKicHfxSoX1q2FKE9icQOPGuiaXocOSG2sobUAzuVNv7yo9qWDnktjFvuvBER4A0KebLwibPavA/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

## 八、Host Inventory（主机清单）

主机清单配置（默认配置文件：`/etc/ansible/hosts`）

### 1）添加被管控节点

```bash
192.168.182.110
```

示例：

```bash
# -m：指定模块
# -a：指定参数
ansible 192.168.182.110 -m ping
ansible 192.168.182.110 -m shell -a "df -h"
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290847753.png)

### 2）配置主机组

```bash
# 定义webservers组
[webservers]
192.168.182.110
192.168.182.112
```

示例：

```bash
# -m：指定模块
# -a：指定参数
ansible webservers -m ping
ansible webservers -m shell -a "df -h"
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290847217.png)

### 3）配置连接用户名和密码

```bash
[webservers]
192.168.182.130 ansible_ssh_user=root ansible_ssh_pass=123456
```

常用配置参数如下：
![图片](https://mmbiz.qpic.cn/mmbiz_png/gIkzzLe4eUXn9wDTKicHfxSoX1q2FKE9icQOPGuiaXocOSG2sobUAzuVNv7yo9qWDnktjFvuvBER4A0KebLwibPavA/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)
示例：

```bash
ansible 192.168.182.130 -m ping
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290847374.png)

### 4）子分组

```bash
[web]
192.168.182.130
192.168.182.110
[mysql]
192.168.182.111
# 子分组
[nfs:children]
web
mysql
# 对分组统一定义变量
[nfs:vars]
ansible_ssh_user=root
ansible_ssh_pass=123456
ansible_ssh_port=22
```

示例：

```bash
ansible nfs -m ping
# -o：一行显示
ansible nfs -m ping -o
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290847056.png)

### 5）自定义主机列表文件

```bash
cat>hostlist<<EOF
[web]
192.168.182.130
192.168.182.110
[mysql]
192.168.182.111
# 子分组
[nfs:children]
web
mysql
# 对分组统一定义变量
[nfs:vars]
ansible_ssh_user=root
ansible_ssh_pass=123456
ansible_ssh_port=22
EOF
```

示例：

```bash
# -i：指定主机列表文件
ansible -i hostlist nfs -m ping
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290847589.png)

## 九、Ad-Hoc（点对点模式）

> 官方文档：<https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html>

### 1）简介

> `ad-hoc` 命令是一种可以快速输入的命令，而且不需要保存起来的命令，一般测试调试时用的多，ad-hoc 简而言之，就是"**临时命令**"。

### 2）常用模块

#### 1、command 模块（默认模块）

> 默认模块，没有 shell 强大，基本上 shell 模块都可以支持 command 模块的功能。

【1】帮助

```bash
ansible-doc command
# 推荐使用下面这个
ansible-doc command -s
```

【2】参数解释

- `free_form`——必须参数，指定需要远程执行的命令。需要说明一点，free_form 参数与其他参数（如果想要使用一个参数，那么则需要为这个参数赋值，也就是 name=value 模式）并不相同。比如，当我们想要在远程主机上执行 ls 命令时，我们并不需要写成”free_form=ls” ，这样写反而是错误的，因为并没有任何参数的名字是 free_form，当我们想要在远程主机中执行 ls 命令时，直接写成 ls 即可。因为 command 模块的作用是执行命令，所以，任何一个可以在远程主机上执行的命令都可以被称为 free_form。
- `chdir`——此参数的作用就是指定一个目录，在执行对应的命令之前，会先进入到 chdir 参数指定的目录中。
- `creates`——看到 creates，你可能会从字面上理解这个参数，但是使用这个参数并不会帮助我们创建文件，它的作用是当指定的文件存在时，就不执行对应命令，比如，如果 /testdir/test 文件存在，就不执行我们指定的命令。
- `removes`——与 creates 参数的作用正好相反，它的作用是当指定的文件不存在时，就不执行对应命令，比如，如果 /testdir/tests 文件不存在，就不执行我们指定的命令，此参数并不会帮助我们删除文件。

【3】示例演示

```bash
# 上面命令表示在 web 主机上执行 ls 命令，因为使用的是 root 用户，所以默认情况下，ls 出的结果是 web 主机中 root 用户家目录中的文件列表。
ansible web -m command -a "ls"

# chdir 参数表示执行命令之前，会先进入到指定的目录中，所以上面命令表示查看 web 主机上 /testdir 目录中的文件列表，返回显示有2个文件。
ansible web -m command -a "chdir=/testdir ls"

# 下面命令表示 /testdir/testfile1 文件存在于远程主机中，则不执行对应命令。/testdir/testfile3 不存在，才执行”echo test”命令。
ansible web -m command -a "creates=/testdir/testfile1 echo test"

# 下面命令表示 /testdir/testfile3 文件不存在于远程主机中，则不执行对应命令。/testdir/testfile1 存在，才执行”echo test”命令。
ansible web -m command -a "removes=/testdir/testfile1 echo test"
```

#### 2、shell 模块

> shell 模块 [执行远程主机的 shell/python 等脚本]。

【1】查看帮助

```bash
ansible-doc shell -s
```

【2】示例演示

```bash
# -o：一行显示
# 安装httpd
ansible web -m shell -a 'yum -y install httpd' -o

# 查看时间
ansible web -m shell -a 'uptime' -o
```

#### 3、script 模块

> script 模块 [在远程主机执行主控端的 shell/python 等脚本 ]。

【1】查看帮助

```bash
ansible-doc script -s
```

【2】参数解释

- `free_form`——必须参数，指定需要执行的脚本，脚本位于 ansible 管理主机本地，并没有具体的一个参数名叫 free_form，具体解释请参考 command 模块。
- `chdir`——此参数的作用就是指定一个远程主机中的目录，在执行对应的脚本之前，会先进入到 chdir 参数指定的目录中。
- `creates`——使用此参数指定一个远程主机中的文件，当指定的文件存在时，就不执行对应脚本，可参考 command 模块中的解释。
- `removes`——使用此参数指定一个远程主机中的文件，当指定的文件不存在时，就不执行对应脚本，可参考 command 模块中的解释。

【3】示例演示

```bash
# 下面命令表示 ansible 主机中的 /testdir/testscript.sh 脚本将在 web 主机中执行，执行此脚本之前，会先进入到 web 主机中的 /opt 目录
ansible web -m script -a "chdir=/opt /testdir/testscript.sh"

# 下面命令表示，web主机中的 /testdir/testfile1文件已经存在，ansible 主机中的 /testdir/testscript.sh 脚本将不会在 web 主机中执行。
ansible web -m script -a "creates=/testdir/testfile1 /testdir/testscript.sh"

# 下面命令表示，web 主机中的 /testdir/testfile1 文件存在，ansible 主机中的 /testdir/testscript.sh 脚本则会在 web 主机中执行。
ansible ansible-demo3 -m script -a "removes=/testdir/testfile1 /testdir/testscript.sh"
```

#### 4、raw 模块

> raw 模块 [类似于 command 模块、支持管道传递]。

【1】查看帮助

```bash
ansible-doc raw -s
```

【2】示例演示

```bash
ansible web -m raw -a "ifconfig eth0 |sed -n 2p |awk '{print \$2}' |awk -F: '{print \$2}'"
```

#### 5、copy 模块

> copy 模块 从主控端复制文件到被控端。

【1】查看帮助

```bash
ansible-doc copy -s
```

【2】示例演示

```bash
# -a,--args：后面接参数
ansible web -m copy -a 'src=/etc/ansible/hosts dest=/tmp/hosts owner=root group=bin mode=777'

# backup=yes/no：文件存在且文件内容不一样是否备份，默认不备份
ansible web -m copy -a 'src=/etc/ansible/hosts dest=/tmp/hosts owner=root group=bin mode=777 backup=yes'
```

#### 6、fetch 模块

> copy 模块从被控端复制文件到主控端，正好跟 copy 相反。

【1】查看帮助

```bash
ansible-doc fetch -s
```

【2】示例演示

```bash
# 跟copy支持的参数差不多，src：远端主机的目录，dest：主控端目录，其实真正存放的目录在：/tmp/192.168.182.129/tmp/up.sh，会按每台主机分组存放
#  This `must' be a file, not a directory：只支持单个文件获取
ansible 192.168.182.129 -m fetch -a "src=/etc/fstab dest=/testdir/ansible/"
```

#### 7、unarchive 模块（解包模块）

> unarchive 模块是解包模块。

【1】查看帮助

```bash
ansible-doc unarchive -s
```

【2】参数解释

- `copy`——默认为 yes，当 copy=yes，那么拷贝的文件是从 ansible 主机复制到远程主机上的，如果设置为 copy=no，那么会在远程主机上寻找 src 源文件。
- `src`——源路径，可以是 ansible 主机上的路径，也可以是远程主机上的路径，如果是远程主机上的路径，则需要设置 copy=no。
- `dest`——远程主机上的目标路径。
- `mode`——设置解压缩后的文件权限。

【3】示例演示

```bash
ansible 192.168.182.129 -m unarchive -a 'src=/testdir/ansible/data.tar.gz dest=/tmp/tmp/'
```

#### 8、archive 模块（打包模块）

> unarchive 模块是打包模块。

【1】查看帮助

```bash
ansible-doc archive -s
```

【2】示例演示

```bash
# path：主控端目录，format：压缩格式，dest：被控端目录文件'
ansible 192.168.182.129 -m archive -a 'path=/tmp/ format=gz dest=/tmp/tmp/t.tar.gz'
```

#### 9、user 模块

【1】查看帮助

```bash
ansible-doc user -s
```

【2】示例演示

```bash
# 创建用户（present：默认，可以不写）
ansible web -m user -a 'name=test state=present'

# 删除用户（absent）
ansible web -m user -a 'name=test state=absent'

# 修改密码
# 步骤一、生成加密密码
echo '777777'|openssl passwd -1 -stdin

# 步骤二、修改秘密
ansible web -m user -a 'name=test password="$1$Jo5FD9Jr$2QB.BuybbtR35ga4O5o8N."'

# 修改shell
ansible web -m user -a 'name=test shell=/sbin/noglogin append=yes'
```

#### 10、group 模块

【1】查看帮助

```bash
ansible-doc group -s
```

【2】示例演示

```bash
# 创建
ansible 192.168.182.129 -m group -a 'name=testgroup system=yes'
# 删除
ansible 192.168.182.129 -m group -a 'name=testgroup state=absent'
```

#### 11、yum 模块

【1】查看帮助

```bash
ansible-doc yum -s
```

【2】示例演示

```bash
# 升级所有包
ansible web -m yum -a 'name="*" state=latest'

# 安装apache
ansible web -m yum -a 'name="httpd" state=latest'
```

#### 12、service 模块

【1】查看帮助

```bash
ansible-doc service -s
```

【2】示例演示

```bash
ansible web -m service -a 'name=httpd state=started'

ansible web -m service -a 'name=httpd state=started enabled=yes'

ansible web -m service -a 'name=httpd state=stopped'

ansible web -m service -a 'name=httpd state=restarted'

ansible web -m service -a 'name=httpd state=started enabled=no'
```

#### 13、file 模块

【1】查看帮助

```bash
ansible-doc file -s
```

【2】示例演示

```bash
# 创建文件
ansible web -m file -a 'path=/tmp/88.txt mode=777 state=touch'

# 创建目录
ansible web -m file -a 'path=/tmp/99 mode=777 state=directory'

# 删除
ansible web -m file -a 'path=/tmp/99 state=absent'
```

#### 14、setup 模块

【1】查看帮助

```bash
ansible-doc setup -s
```

【2】示例演示

```bash
ansible web -m setup

ansible web -m setup -a 'filter=ansible_all_ipv4_addresses'
```

#### 15、cron 模块

【1】查看帮助

```bash
ansible-doc cron -s
```

【2】示例演示

```bash
# 创建定时任务
ansible 192.168.182.129 -m cron -a 'minute=* weekday=1,3,5,6,7 job="/usr/bin/wall FBI warning" name=warningcron'

# 关闭定时任务
ansible 192.168.182.129 -m cron -a 'disabled=true job="/usr/bin/wall FBI warning" name=warningcron'

# 删除定时任务
ansible 192.168.182.129 -m cron -a ' job="/usr/bin/wall FBI warning" name=warningcron state=absent'
```

#### 16、hostname 模块

【1】查看帮助

```bash
ansible-doc hostname -s
```

【2】示例演示

```bash
ansible 192.168.182.129 -m hostname -a 'name=192.168.182.129'
```

Ansible 的介绍和简单使用就先到这里了，还有一个 ansible-playbook 是非常重要，
