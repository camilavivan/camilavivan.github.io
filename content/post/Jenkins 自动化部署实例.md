---
title: Jenkins 自动化部署实例
date: 2023-03-03 10:43:13
type: categories
tags: 
    - Linux
    - Jenkins
keywords: 
    - Linux
    - Jenkins
categories: 
    - Linux
    - Jenkins
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031041689.png
---

## 前言

你平常在做自己的项目时，是否有过部署项目太麻烦的想法？如果你是单体项目，可能没什么感触，但如果你是微服务项目，相信你应该是有过这种感触的。

这种情况下，我一般会劝你了解一下 Jenkins 这个玩意。

本文分为两部分：

- 第一部分为 Jenkins 安装教程，会教你如何在 Linux 上安装 Jenkins。
- 第二部分为一个简单的 Jenkins 自动化构建部署实例讲解。

你可以根据自己的意愿，选择性的跳过第一部分，因为第二部分才是重点。（通过目录可以快速翻到第二部分）

------

## Jenkins 安装

### 当前环境

- CentOS 7.8
- Java 11（注意当前 jenkins 支持的 Java 版本最低为 Java11）
- FinalShell 3.9（操作环境）

### 安装 Jenkins

> PS：不建议使用 Docker 安装 Jenkins，因为使用 Jenkins 的时候一般会调用外部程序，比如 Maven、Docker、JDK、Nodejs 等，所以我们最好直接安装在本机上，以避免不必要的麻烦。

#### 1. 添加 Jenkins 源

执行下面两条命令：

```bash
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo --no-check-certificate
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031028625.jpeg)

#### 2. 通过 yum 安装 Jenkins

- yum -y install jenkins

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031028693.jpeg)

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031028674.jpeg)

#### 3. 修改 Jenkins 端口号

1. Jenkins 默认端口号为 8080，输入`vim /etc/sysconfig/jenkins`进行编辑，将 JENKINS_PORT 修改为自己想要的端口号，前提得保证修改后的这个端口没有被其他的进程占用。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031028499.jpeg)

1. 这里修改了可能还不能生效，还需要修改另一个地方，输入以下指令进行编辑

```bash
vim /usr/lib/systemd/system/jenkins.service
# 找到下面的文字
Environment="JENKINS_PORT=8080" # 修改为自己想要的端口号
# :wq退出
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031028761.jpeg)

1. 修改完成后，重新加载配置文件，随后再重启 Jenkins，此时的启动端口应该已经变成你修改的端口号了。

```bash
# 重新加载配置文件
systemctl daemon-reload
# 重启jenkins
systemctl restart jenkins
```

### 启动 Jenkins

> Jenkins 可以单独指定 Java 路径，在`/etc/init.d/jenkins`文件内大概一百行左右的位置，在最上面加上你的 java 路径即可：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031028223.jpeg)

> PS：当前 Jenkins 支持的最低 Java 版本为 11，如果机器上只有 Java8 的朋友需要先安装 Java11 或以上版本。Linux 下多版本 Java 建议通过系统自带的 *alternatives* 来管理，参考这篇文章外加自己琢磨搞定：
> linux alternatives 命令详解：
> <https://www.cnblogs.com/lpfuture/p/4638425.html>

1. 输入`service jenkins start`，会弹出提示：Starting jenkins (via systemctl):，意思是正在启动，第一次启动比较耗时，此时耐心等待。如果提示超时失败，没关系，jenkins 仍然在启动，只是第一次启动比较耗时。

   如果提示内容不是超时失败，那大概率是你的 Java 没安装好或者版本不对。

2. 放行刚刚配置的端口

```bash
# 放行15369端口
firewall-cmd --zone=public --add-port=15369/tcp --permanent
# 重新加载防火墙
firewall-cmd --reload
# 查看是否已经开启
firewall-cmd --list-ports
```

如果你是在阿里云腾讯云等类似服务器上的话，那你还需要去控制台防火墙或者安全组开放这个端口，像这样：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031029726.jpeg)

开放端口时记得设置授权 ip，建议你直接给自家 ip 地址授权全部端口号。

1. 在浏览器输入 ip+port，可以进入到 Jenkins 的初始化界面，第一次启动要等的比较久：

> 进入这个界面，说明你的 Jenkins 已经在启动中了。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031029332.jpeg)

### 初始化配置 Jenkins

1. 系统启动完毕后，系统会提示你查看并输入管理员密码，根据中显示的密码位置，打开该文件并将密码复制粘贴即可：

```bash
# 在服务器查看密码文件
cat /var/lib/jenkins/secrets/initialAdminPassword
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031029360.jpeg)

1. 密码输入成功后，进入插件安装界面，如果你是新手，直接使用推荐安装的插件即可：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031029450.jpeg)

1. 系统开始安装插件，需要等待系统安装完毕，这一步可能要比较久，耐心等待：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031029651.jpeg)

安装过程中可能会出现部分插件安装失败的情况，没关系，全部处理完毕后可以选择重试。

1. 安装完毕后，系统会提示你创建第一个管理员账户：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031029232.jpeg)

1. 配置 Jenkins 访问地址，便于一些插件使用，一般会有默认值：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031029681.jpeg)

1. 配置完成，点击开始使用 Jenkins：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031031641.jpeg)

随后就进入到 Jenkins 的管理界面了，不同版本的 Jenkins 界面可能会不一样：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031031749.jpeg)

**至此，Jenkins 安装完毕。**

### 扩展

如果你是使用 Jenkins 来对 Java 服务做持续集成的话，那么你还需要安装下面的插件：

- Maven Integration：Maven 集成管理插件。
- Docker plugin：Docker 集成插件。
- Publish Over SSH：远程文件发布插件。
- SSH: 远程脚本执行插件。
- GitLab：拉取远程仓库代码插件。

安装插件在`系统管理 -> 插件管理`里面

------

## 实例讲解

接下来，我会拿出我的用户微服务构建任务的实际配置来向你进行解读，当你了解了 Jenkins 自动化构建部署的工作原理后，你便可以很快的上手这个玩意，因为你会发现它是如此的简单。

> 此实例是基于我的开源项目校园博客的 Jenkins 部分进行讲解的，如果你对我的项目感兴趣，欢迎访问项目的 GitHub 地址：stick-i/scblogs: 🎉 校园博客，基于微服务架构且前后端分离的博客社区系统。项目后端技术栈：SpringBoot + SpringCloud + Mybatis-Plus + Nacos + MySQL + Redis + MQ + ElasticSearch + Docker。前端主要是基于 Vue2 和 ElementUI 进行开发的
>
> <https://github.com/stick-i/scblogs>

### 基本环境

在此之前，我需要介绍一下我的基本环境：

- 我的操作环境为 Windows，但是我要把微服务部署到一台 Linux 服务器上去，包括 Jenkins 也是安装在这个上面的。
- 服务器上安装了 Jenkins、Git、Docker、JDK、Maven、NodeJs，都是些拿来构建的东西，都是单独安装的，而不是跑在 Docker 上。
- 而项目服务都是跑在 Docker 上的，还有 Redis 这种轻量的中间件也跑在 Docker 上。
- 我的项目已经在 Git 仓库里放好了，放 github 或者 gitee 或者 gitlab 都行。

### 全局工具配置

在 Jenkins 上，我已经配置好了这些构建工具的路径，以便于 Jenkins 可以直接调用到他们，在`系统管理 -> 全局工具配置` 这个页面下，这张图有点长：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031031757.jpeg)

在这张图上，你可以看到其中有一部分的配置是有路径的，还有一部分配置是没有路径的，这是因为我把他们的命令路径加到了系统路径上，即使不添加完整路径，Jenkins 也可以调用到它们。

### 创建任务

好，现在我们已经准备好环境了，可以创建一个任务来试试水了，输入任务名称，然后选择`构建一个自由风格的软件项目`：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031031532.jpeg)

别问我在哪新建任务，请你返回首页好好看看：

![图片](https://mmbiz.qpic.cn/mmbiz/gIkzzLe4eUWiaLHC4ol02yOIIwfedd2qDHDxZWqkQ4UMaZZibkZmT7o2CeGEHvtLaNcVQKEjMW7AKibZgJibI5d3cg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

### 任务配置

#### 源码管理

现在我们已经进入到任务配置界面了，往下划到源码管理的地方，选择 Git，然后填写仓库地址等信息：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031031960.jpeg)

添加 Credentials 的时候，如果你会使用 SSH 密钥的话，建议还是用这个，但你得在机器上进行格外的配置，这里我就不多说了，不会的话直接用账号密码也是可以的：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031031743.jpeg)

#### 构建步骤（Build Steps）

##### 第一步：调用 Maven

点击增加构建步骤，由于我们是 Maven 管理的项目，需要先使用 Maven 构建，所以第一步就用`调用顶层Maven目标`：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031031887.jpeg)

选择 maven 版本，然后 target 根据项目的实际情况编写，我的命令是这样的：

1. 先构建 jar 包，执行 install 的过程中会先执行 package 的，所以我直接 install。我的项目中单元测试是没怎么梳理的，所以我使用参数`-Dmaven.test.skip=true`跳过单元测试。
2. 然后我得打包成 docker 镜像，我使用的是`dockerfile-maven-plugin`这个 Maven 插件，所以打包 docker 镜像的步骤就也放在 maven 里面了，构建 docker 镜像的信息都在项目的 pom 文件里面。

```bash
install -Dmaven.test.skip=true
dockerfile:build -f user-service/user-server/pom.xml
```

构建完镜像了，接下来我们直接使用这个镜像创建容器然后运行就完事了。

##### 第二步：执行 shell 启动容器

再添加一个构建步骤，正常情况下我们调用 docker 通过命令行调用就可以了，所以我们现在也添加一个`执行shell`的步骤即可。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031032697.jpeg)

具体的命令也很简单，就这么几步：

1. 清理之前的旧镜像。由于我们刚刚构建了一个新的镜像，新镜像和旧镜像的名称和版本我们是没有改的，所以旧的镜像就会自动变成`<none>`，使用命令`docker image prune -f` 就可以清理掉这部分镜像。
2. 停止旧容器运行并删除旧容器。当然我们得先判断一下是否存在旧容器，使用容器名称来进行判断，这部分指令涉及到`shell`和`docker`的命令知识，看不懂没关系，可以直接 cv，注意修改容器名称就好。
3. 调用 docker 启动容器，根据项目实际情况来设定不同的参数，我这里设置了网络模式为 host，并且映射了一个容器卷，用于读取 nacos 的地址，再指定容器名称为`user-service`，最后指定使用的镜像名称。

大功告成！具体命令如下：

```bash
 # 清理镜像
docker image prune -f

# 清理容器
if [ -n  "$(docker ps -a -f  name=user-service  --format '{{.ID}}' )" ] then
 #停止容器运行
 docker stop $(docker ps -a -f  name=user-service  --format '{{.ID}}' )
 #删除之前的容器
 docker rm $(docker ps -a -f  name=user-service  --format '{{.ID}}' )
fi

# 启动容器
docker run -d  --net=host  -v scblogs-config:/config -e PARAMS="$params"  --name  user-service  scblogs/user-server
```

最后别忘了点击保存！

------

## 后记

经过上面这些步骤，我不仅安装好了 Jenkins，还完成了一个基本的自动化构建脚本，这个脚本会调用 maven 把我的项目打包，然后构建成一个 docker 镜像，再通过一段 shell 命令去启动这个程序。

如果你想尝试启动这个构建任务的话，你可以回到主页点击右边的绿色符号。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031032116.jpeg)

当然，你大概率是会构建失败的 😯。因为我的这份实例讲解并没有完全的讲清楚，甚至里面有很多步骤你都看不懂，是不是？

其实我并没有想写一份手把手的 Jenkins 使用教程，因为这要写的内容实在是太多了，我甚至可以因此写一本小册了！

还记得我在实例讲解的最开始写的吗？写这个构建案例的目的是让你了解 Jenkins 自动化构建的原理，如果你看到这里已经发现了，**这自动化构建，其实就跟我们手动构建部署差不多！只不过是把手动操作的东西设定成了脚本**，那你就已经有能力去自己摸索它了。

用用插件、写写脚本，就可以搞定自己项目的自动化部署啦。

实际情况是，我有一台服务器专门用于 Jenkins 自动化部署，还有一台服务器专门用于生产环境，这两台服务器都可以连接到外网，也可以互相访问到彼此。这是由于 Jenkins 构建时是会比较吃 CPU 的，为了不影响生产环境，所以我把它们分开了。当然，这种情况下，脚本也会稍微复杂一点，具体流程大概是下面这样的：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303031032080.jpeg)
