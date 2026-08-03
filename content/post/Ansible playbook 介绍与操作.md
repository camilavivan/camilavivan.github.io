---
title: Ansible playbook 介绍与操作
date: 2023-01-29  08:56:55
type: categories
tags: 
    - Ansible
    - playbook
keywords: 
    - Ansible
    - playbook
categories: 
    - Ansible
    - playbook
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290855399.png
---

## 一、概述

- `playbook` 与 `ad-hoc` 相比,是一种完全不同的运用 ansible 的方式，类似与 saltstack 的 state 状态文件。ad-hoc 无法持久使用，playbook 可以持久使用。
- `playbook` 是由一个或多个 play 组成的列表，play 的主要功能在于将事先归并为一组的主机装扮成事先通过 ansible 中的 task 定义好的角色。
- 从根本上来讲，所谓的 task 无非是调用 ansible 的一个 module。将多个 play 组织在一个 playbook 中，即可以让它们联合起来按事先编排的机制完成某一任务。

参考文档：<https://ansible-tran.readthedocs.io/en/latest/docs/playbooks.html>

Ansible 的基础介绍和环境部署可以参考这篇文章：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290902810.png)

## 二、playbook 核心元素

- `Hosts` 执行的远程主机列表
- `Tasks` 任务集
- `Varniables` 内置变量或自定义变量在 playbook 中调用
- `Templates` 模板，即使用模板语法的文件，比如配置文件等
- `Handlers` 和 notity 结合使用，由特定条件触发的操作，满足条件方才执行，否则不执行
- `Tags` 标签，指定某条任务执行，用于选择运行 playbook 中的部分代码。

## 三、playbook 语法（yaml）

- playbook 使用`yaml`语法格式，后缀可以是`yaml`,也可以是`yml`。
- YAML( /ˈjæməl/ )参考了其他多种语言，包括：XML、C 语言、Python、Perl 以及电子邮件格式 RFC2822，Clark Evans 在 2001 年 5 月在首次发表了这种语言，另外 Ingy döt Net 与 OrenBen-Kiki 也是这语言的共同设计者。
- YAML 格式是类似 JSON 的文件格式。YAML 用于文件的配置编写，JSON 多用于开发设计。

### 1）YAML 介绍

#### 1、YAML 格式如下

- 文件的第一行应该以“---”（三个连字符）开始，表明 YAML 文件的开始。
- 在同一行中，#之后的内容表示注释，类似于 shell，python 和 ruby。
- YAML 中的列表元素以“-”开头并且跟着一个空格。后面为元素内容。
- 同一个列表之中的元素应该保持相同的缩进，否则会被当做错误处理。
- play 中 hosts、variables、roles、tasks 等对象的表示方法都是以键值中间以“：”分隔表示，并且“：”之后要加一个空格。

#### 2、playbooks yaml 配置文件解释

```yaml
Hosts：运行指定任务的目标主机
remoute_user:在远程主机上执行任务的用户；
sudo_user:
tasks:任务列表

tasks的具体格式：

tasks:
  - name: TASK_NAME
    module: arguments
    notify: HANDLER_NAME
    handlers:
  - name: HANDLER_NAME
    module: arguments

##模块，模块参数：
格式如下：
    （1）action: module arguments
     (2) module: arguments
注意：shell和command模块后直接加命令，而不是key=value类的参数列表


handlers：任务，在特定条件下触发；接受到其他任务的通知时被触发；
```

#### 3、示例

```yaml
---
- hosts: web
  remote_user: root
  tasks:
    - name: install nginx        ##安装模块，需要在被控主机里加上nginx的源
      yum: name=nginx state=present
    - name: copy nginx.conf    ##复制nginx的配置文件过去，需要在本机的/tmp目录下编辑nginx.conf
      copy: src=/tmp/nginx.conf dest=/etc/nginx/nginx.conf backup=yes
      notify: reload    #当nginx.conf发生改变时，通知给相应的handlers
      tags: reloadnginx    #打标签
    - name: start nginx service    #服务启动模块
      service: name=nginx state=started
      tags: startnginx    #打标签

  handlers:
    - name: reload
      service: name=nginx state=restarted
```

### 2）variables 变量

variables 变量有四种定义方法。如下：

#### 1、facts:可以直接调用

ansible 中有 setup 模块，这个模块就是通过 facts 组件来实现的，主要是节点本身的一个系统信息，bios 信息,网络，硬盘等等信息。这里的 variables 也可以直接调用 facts 组件的 facters 我们可以使用`setup`模块来获取，然后直接放入我们的剧本之中调用即可。

```bash
ansible web -m setup
```

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

常用的几个参数：

```bash
ansible_all_ipv4_addresses # ipv4的所有地址
ansible_all_ipv6_addresses # ipv6的所有地址
ansible_date_time # 获取到控制节点时间
ansible_default_ipv4 # 默认的ipv4地址
ansible_distribution # 系统
ansible_distribution_major_version # 系统的大版本
ansible_distribution_version # 系统的版本号
ansible_domain #系统所在的域
ansible_env #系统的环境变量
ansible_hostname #系统的主机名
ansible_fqdn #系统的全名
ansible_machine #系统的架构
ansible_memory_mb #系统的内存信息
ansible_os_family # 系统的家族
ansible_pkg_mgr # 系统的包管理工具
ansible_processor_cores #系统的cpu的核数(每颗)
ansible_processor_count #系统cpu的颗数
ansible_processor_vcpus #系统cpu的总个数=cpu的颗数*CPU的核数
ansible_python # 系统上的python
```

搜索

```bash
ansible web -m setup -a 'filter=*processor*'
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290902770.png)

#### 2、用户自定义变量

自定义变量有两种方式

- 通过命令行传入

```bash
ansible-playbook命令行中的 -e VARS，--extra-vars VARS，这样就可以直接把自定义的变量传入
```

使用 playbook 定义变量，实例如下：

```yaml
---
- hosts: web
  remote_user: root
  tasks:

    - name: install {{ rpmname }}
      yum: name={{ rpmname }} state=present
    - name: copy {{ rpmname }}.conf
      copy: src=/tmp/{{ rpmname }}.conf dest=/etc/{{ rpmname }}/{{ rpmname }}.conf backup=yes
      notify: reload
      tags: reload{{ rpmname }}
    - name: start {{ rpmname }} service
      service: name={{ rpmname }} state=started
      tags: start{{ rpmname }}

  handlers:
    - name: reload
      service: name={{ rpmname }} state=restarted
```

使用：

```bash
ansible-playbook nginx.yml -e rpmname=keepalived
ansible-playbook nginx.yml --extra-vars rpmname=keepalived
```

- 在 playbook 中定义变量

```yaml
##在playbook中定义变量如下：
vars：
  - var1: value1
  - var2: value2
```

使用：

```yaml
---
- hosts: web
  remote_user: root
  vars:
    - rpmname: keepalived
  tasks:
    - name: install {{ rpmname }}
      yum: name={{ rpmname }} state=present
    - name: copy {{ rpmname }}.conf
      copy: src=/tmp/{{ rpmname }}.conf dest=/etc/{{ rpmname }}/{{ rpmname }}.conf backup=yes
      notify: reload
      tags: reload{{ rpmname }}
    - name: start {{ rpmname }} service
      service: name={{ rpmname }} state=started
      tags: start{{ rpmname }}

  handlers:
    - name: reload
      service: name={{ rpmname }} state=restarted
```

#### 3、通过 roles 传递变量

下面介绍 roles 会使用 roles 传递变量，小伙伴可以翻到下面看详解讲解。

#### 4、 Host Inventory

可以在主机清单中定义，方法如下：

```yaml
#向不同的主机传递不同的变量
IP/HOSTNAME varaiable=value var2=value2

#向组中的主机传递相同的变量
[groupname:vars]
variable=value
```

### 3）流程控制

#### 1、用 when 来表示的条件判断

```yaml
- hosts: web
  remote_user: root#代表用root用户执行，默认是root，可以省略
  tasks:
  - name: createfile
    copy: content="test3" dest=/opt/p1.yml
    when: a=='3'
  - name: createfile
    copy: content="test4" dest=/opt/p1.yml
    when: a=='4'
```

> 如果 a"3"，就将“test3”，写入到 web 组下被管控机的/opt/p1.yml 中，
> 如果 a"4"，就将“test4”，写入到 web 组下被管控机的/opt/p1.yml 中。

执行

```bash
# 语法校验
ansible-playbook  --syntax-check p1.yml

#执行
ansible-playbook -e 'a="3"' p1.yml
```

#### 2、标签（只执行配置文件中的一个任务）

```yaml
- hosts: web
  tasks:
  - name: installnginx
    yum: name=nginx
  - name: copyfile
    copy: src=/etc/nginx/nginx.conf dest=/etc/nginx/nginx.conf
    tags: copyfile
  - name: start
    service: name=nginx static=restarted
```

执行

```bash
# 语法校验
ansible-playbook  --syntax-check p2.yml

#执行
ansible-playbook -t copyfile p2.yml
```

#### 3、循环 with_items

创建三个用户

```yaml
- hosts: web
  tasks:
  - name: createruser
    user: name={{ item }}
    with_items:
    - shy1
    - shy2
    - shy3
  - name: creategroup
    group: name={{ item }}
    with_items:
    - group1
    - group2
    - group3
```

执行

```bash
#语法校验
ansible-playbook  --syntax-check p3.yml

#执行
ansible-playbook p3.yml
```

#### 4、循环嵌套（字典）

用户 shy1 的属组是 group1,用户 shy2 的属组是 group2，用户 shy3 的属组是 group3

```yaml
- hosts: web
  tasks:
  - name: creategroup
    group: name={{item}}
    with_items:
    - group3
    - group4
    - group5
  - name: createuser
    user: name={{item.user}} group={{item.group}}
    with_items:
    - {'user': shy3,'group': group3}
    - {'user': shy4,'group': group4}
    - {'user': shy5,'group': group5}
```

执行

```bash
#语法校验
ansible-playbook  --syntax-check p4.yml

#执行
ansible-playbook p4.yml
```

### 4）模板 templates

- 模板是一个文本文件，嵌套有脚本（使用模板编程语言编写）
- Jinja2 是 python 的一种模板语言，以 Django 的模板语言为原本

该模板支持：

```yaml
字符串：使用单引号或双引号；
  数字：整数，浮点数；
  列表：[item1, item2, ...]
  元组：(item1, item2, ...)
  字典：{key1:value1, key2:value2, ...}
  布尔型：true/false
  算术运算：
    +, -, *, /, //, %, **
  比较操作：
    ==, !=, >, >=, <, <=
  逻辑运算：
    and, or, not
```

- 通常模板都是通过引用变量来运用的

【示例】

1、定义模板

```bash
user  nginx; #设置nginx服务的系统使用用户
worker_processes  {{ ansible_processor_vcpus }}; #工作进程数

error_log  /var/log/nginx/error.log warn; #nginx的错误日志
pid        /var/run/nginx.pid; #nginx启动时候的pid

events {
    worker_connections  1024; #每个进程允许的最大连接数
}

http { #http请求配置，一个http可以包含多个server

    #定义 Content-Type
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    #日志格式 此处main与access_log中的main对应
    #$remote_addr：客户端地址
    #$remote_user：http客户端请求nginx认证的用户名，默认不开启认证模块，不会记录
    #$timelocal：nginx的时间
    #$request：请求method + 路由 + http协议版本
    #status：http reponse 状态码
    #body_bytes_sent：response body的大小
    #$http_referer：referer头信息参数，表示上级页面
    #$http_user_agent：user-agent头信息参数，客户端信息
    #$http_x_forwarded_for：x-forwarded-for头信息参数
    log_format  main  '$http_user_agent' '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    #访问日志，后面的main表示使用log_format中的main格式记录到access.log中
    access_log  /var/log/nginx/access.log  main;

    #nginx的一大优势，高效率文件传输
    sendfile        on;
    #tcp_nopush     on;

    #客户端与服务端的超时时间，单位秒
    keepalive_timeout  65;

    #gzip  on;
    server { #http服务，一个server可以配置多个location
        listen       {{ nginxport }}; #服务监听端口
        server_name  localhost; #主机名、域名

        #charset koi8-r;
        #access_log  /var/log/nginx/host.access.log  main;

        location / {
            root   /usr/share/nginx/html; #页面存放目录
            index  index.html index.htm; #默认页面
        }

        #error_page  404              /404.html;

        # 将500 502 503 504的错误页面重定向到 /50x.html
        error_page   500 502 503 504  /50x.html;
        location = /50x.html { #匹配error_page指定的页面路径
            root   /usr/share/nginx/html; #页面存放的目录
        }

        # proxy the PHP scripts to Apache listening on 127.0.0.1:80
        #
        #location ~ \.php$ {
        #    proxy_pass   http://127.0.0.1;
        #}

        # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
        #
        #location ~ \.php$ {
        #    root           html;
        #    fastcgi_pass   127.0.0.1:9000;
        #    fastcgi_index  index.php;
        #    fastcgi_param  SCRIPT_FILENAME  /scripts$fastcgi_script_name;
        #    include        fastcgi_params;
        #}

        # deny access to .htaccess files, if Apache's document root
        # concurs with nginx's one
        #
        #location ~ /\.ht {
        #    deny  all;
        #}
    }
    include /etc/nginx/conf.d/*.conf;
}
```

2、定义 yaml 编排

```yaml
---
- hosts: web
  remote_user: root
  vars:
    - rpmname: nginx
    - nginxport: 8088
  tasks:
    - name: install {{ rpmname }}
      yum: name={{ rpmname }} state=present
    - name: copy {{ rpmname }}.conf
      copy: src=/tmp/{{ rpmname }}.conf dest=/etc/{{ rpmname }}/{{ rpmname }}.conf backup=yes
      notify: reload
      tags: reload{{ rpmname }}
    - name: start {{ rpmname }} service
      service: name={{ rpmname }} state=started
      tags: start{{ rpmname }}

  handlers:
    - name: reload
      service: name={{ rpmname }} state=restarted
```

使用

```bash
##使用reloadnginx标签，重新加载剧本
ansible-playbook nginx.yml -t reloadnginx
```

> copy 与 template 的区别

- copy 模块不替代参数，template 模块替代参数
- template 的参数几乎与 copy 的参数完全相同

### 5）handlers（触发事件）

```yaml
notify:触发
handlers：触发的动作
```

使用上场景：修改配置文件时

【示例】 正常情况时 handlers 是不会执行的

```yaml
- hosts: web
  tasks:
  - name: installredis
    yum: name=redis
  - name: copyfile
    template: src=redis.conf dest=/etc/redis.conf
    tags: copyfile
    notify: restart
  - name: start
    service: name=redis state=started
  handlers:
  - name: restart
    service: name=redis
```

执行

```bash
ansible-playbook -t copyfile p6.yml
```

### 6）roles

#### 1、roles 介绍与优势

一般情况下将 roles 写在**/etc/ansible/roles**中，也可以写在其他任意位置（写在其他位置要自己手动建立一个 roles 文件夹）

- 对于以上所有方式有个缺点就是无法实现同时部署 web、database、keepalived 等不同服务或者不同服务器组合不同的应用就需要写多个 yaml 文件，很难实现灵活的调用
- roles 用于层次性，结构化地组织 playbook。roles 能够根据层次结果自动装载变量文件、tasks 以及 handlers 等。
- 要使用 roles 只需要在 playbook 中使用 include 指令即可。
- 简单来讲，roles 就是通过分别将变量（vars）、文件（files）、任务（tasks）、模块（modules）以及处理器（handlers）放置于单独的目录中，并且可以便捷的 include 它们地一种机制。
- 角色一般用于基于主机构建服务的场景中，但是也可以用于构建守护进程等场景中。

#### 2、目录结构

创建目录

```bash
mkdir -pv ./{nginx,mysql,httpd}/{files,templates,vars,tasks,handlers,meta,default}
```

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

- roles/
- mysql/：mysql 服务的 yml 文件
- httpd/：apached 服务的 yml 文件
- nginx/：nginx 服务的 yml 文件
- `files/`：存储由 copy 或者 script 等模块调用的文件或者脚本；
- `tasks/`：此目录中至少应该有一个名为**main.yml**的文件，用于定义各个 task；其他文件需要由**main.yml**进行包含调用；
- `handlers/`：此目录中至少应该有一个名为**main.yml**的文件，用于定义各个 handler；其他文件需要由 main.yml 进行包含调用；
- `vars/`：此目录至少应该有一个名为**main,yml**的文件，用于定义各个 variable；其他的文件需要由**main.yml**进行包含调用；
- `templates/`：存储由 templates 模块调用的模板文件；
- `meta/`：此目录中至少应该有一个名为**main.yml**的文件，定义当前角色的特殊设定以及依赖关系，其他文件需要由**main.yml**进行包含调用；
- `default/`：此目录至少应该有一个名为**main.yml**的文件，用于设定默认变量；

#### 3、实战操作

【1】创建目录

```bash
mkdir -pv ./{nginx,mysql,httpd}/{files,templates,vars,tasks,handlers,meta,default}
```

【2】定义配置文件

先下载 nginx rpm 部署包

```bash
# 下载地址：http://nginx.org/packages/centos/7/x86_64/RPMS/
 wget http://nginx.org/packages/centos/7/x86_64/RPMS/nginx-1.18.0-1.el7.ngx.x86_64.rpm -O nginx/files/nginx-1.18.0-1.el7.ngx.x86_64.rpm
```

- **nginx/tasks/main.yml**

```bash
- name: cp
  copy: src=nginx-1.18.0-1.el7.ngx.x86_64.rpm dest=/tmp/nginx-1.18.0-1.el7.ngx.x86_64.rpm
- name: install
  yum: name=/tmp/nginx-1.18.0-1.el7.ngx.x86_64.rpm state=latest
- name: conf
  template: src=nginx.conf.j2 dest=/etc/nginx/nginx.conf
  tags: nginxconf
  notify: new conf to reload
- name: start service
  service: name=nginx state=started enabled=true
```

- **nginx/templates/nginx.conf.j2**

```bash
user  nginx; #设置nginx服务的系统使用用户
worker_processes  {{ ansible_processor_vcpus }}; #工作进程数

error_log  /var/log/nginx/error.log warn; #nginx的错误日志
pid        /var/run/nginx.pid; #nginx启动时候的pid

events {
    worker_connections  1024; #每个进程允许的最大连接数
}

http { #http请求配置，一个http可以包含多个server

    #定义 Content-Type
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    #日志格式 此处main与access_log中的main对应
    #$remote_addr：客户端地址
    #$remote_user：http客户端请求nginx认证的用户名，默认不开启认证模块，不会记录
    #$timelocal：nginx的时间
    #$request：请求method + 路由 + http协议版本
    #status：http reponse 状态码
    #body_bytes_sent：response body的大小
    #$http_referer：referer头信息参数，表示上级页面
    #$http_user_agent：user-agent头信息参数，客户端信息
    #$http_x_forwarded_for：x-forwarded-for头信息参数
    log_format  main  '$http_user_agent' '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    #访问日志，后面的main表示使用log_format中的main格式记录到access.log中
    access_log  /var/log/nginx/access.log  main;

    #nginx的一大优势，高效率文件传输
    sendfile        on;
    #tcp_nopush     on;

    #客户端与服务端的超时时间，单位秒
    keepalive_timeout  65;

    #gzip  on;
    server { #http服务，一个server可以配置多个location
        listen       {{ nginxport }}; #服务监听端口
        server_name  localhost; #主机名、域名

        #charset koi8-r;
        #access_log  /var/log/nginx/host.access.log  main;

        location / {
            root   /usr/share/nginx/html; #页面存放目录
            index  index.html index.htm; #默认页面
        }

        #error_page  404              /404.html;

        # 将500 502 503 504的错误页面重定向到 /50x.html
        error_page   500 502 503 504  /50x.html;
        location = /50x.html { #匹配error_page指定的页面路径
            root   /usr/share/nginx/html; #页面存放的目录
        }

        # proxy the PHP scripts to Apache listening on 127.0.0.1:80
        #
        #location ~ \.php$ {
        #    proxy_pass   http://127.0.0.1;
        #}

        # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
        #
        #location ~ \.php$ {
        #    root           html;
        #    fastcgi_pass   127.0.0.1:9000;
        #    fastcgi_index  index.php;
        #    fastcgi_param  SCRIPT_FILENAME  /scripts$fastcgi_script_name;
        #    include        fastcgi_params;
        #}

        # deny access to .htaccess files, if Apache's document root
        # concurs with nginx's one
        #
        #location ~ /\.ht {
        #    deny  all;
        #}
    }
    include /etc/nginx/conf.d/*.conf;
}
```

- **nginx/vars/main.yml**

```bash
nginxport: 9999
```

- **nginx/handlers/main.yml**

```yaml
- name: new conf to reload
  service: name=nginx state=restarted
```

- 定义剧本文件（**roles.yml**）

```yaml
- hosts: web
  remote_user: root
  roles:
    - nginx
```

最后的目录结构如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290902190.png)

执行

```bash
ansible-playbook roles.yml
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301290903092.png)

到这里一个完整版的 roles 演示示例就完成了，接下来也会真正使用 ansible playbook roles 应用到真实场景中
