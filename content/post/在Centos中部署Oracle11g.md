---
title: 在Centos中静默部署Oracle11g
date: 2025-12-29 15:13:51
type: categories
tags: 
    - Centos
    - Oracle
keywords: Docker
categories: 
    - Centos
    - Oracle
cover: 
---


此版本源自叶师傅，针对部署的报错进行了稍微修改，文档的操作系统基于centos 6.X，其他Linux操作系统命令有些小区别，自行修改

## 一、基础配置

### 1.1修改网络参数

`echo "NOZEROCONF=yes"  >> /etc/sysconfig/network`

修改主机名

`hostnamectl set-hostname $hostname`

`bash`生效

### 1.2安装基础包

```bash
[root@primary dev]# mount  /dev/cdrom /mnt
[root@primary dev]# cd /etc/yum.repos.d/
[root@primary yum.repos.d]# rm -rf *.repo
echo "[local]"  >> local.repo
echo "name=localyum"  >> local.repo
echo "baseurl=file:///mnt/"  >> local.repo
echo "enabled=1"  >> local.repo
echo "gpgcheck=1"  >> local.repo
echo "gpgkey=file:///mnt/RPM-GPG-KEY-redhat-release"  >> local.repo
```

```bash
yum install -y ksh* binutils* compat-libcap* compat-libstdc++-* gcc gcc-c++* glibc* glibc-devel* ksh* libgcc* libstdc++* libstdc++-devel* libaio libaio-devel* libXext* libXtst* libX11* libXau* libxcb* libXi* make* sysstat* unixODBC* unixODBC-devel* readline* libtermcap-devel* pdksh*
yum install –y device-mapper-multipath
yum install -y *vnc*
yum groupinstall "GNOME Desktop" "Graphical Administration Tools"
```

### 1.3修改hosts文件

```bash
[root@primary yum.repos.d]# vim /etc/hosts
192.168.190.60 primary
```

### 1.4新建用户和用户组

```bash
/usr/sbin/groupadd -g 501 oinstall
/usr/sbin/groupadd -g 502 dba
/usr/sbin/groupadd -g 503 oper
/usr/sbin/groupadd -g 504 asmdba
/usr/sbin/useradd -g oinstall -G dba,asmdba,oper oracle
passwd oracle
```

### 1.5新建目录

```bash
mkdir -p /oracle/app/oraInventory
mkdir -p /oracle/app/oracle
chown -R oracle:oinstall /oracle/
chmod -R 775 /oracle
```

### 1.6修改系统资源限制

```bash
echo "oracle           soft    nproc           4096"   >> /etc/security/limits.conf 
echo "oracle           hard    nproc           16384"  >> /etc/security/limits.conf
echo "oracle           soft    nofile          1024"   >> /etc/security/limits.conf
echo "oracle           hard    nofile          65536"  >> /etc/security/limits.conf
echo "oracle           soft    stack           10240"  >> /etc/security/limits.conf
echo "oracle           hard    stack           32768"  >> /etc/security/limits.conf
```

```bash
[root@primary yum.repos.d]#vim /etc/security/limits.d/90-nproc.conf
#*          soft    nproc     1024
root       soft    nproc     unlimited
*         -          nproc     16384
```

```bash
echo "session    required     pam_limits.so" >> /etc/pam.d/login
```

### 1.7关闭selinux和防火墙

```bash
[root@primary yum.repos.d]# vim /etc/sysconfig/selinux
SELINUX=disabled
[root@primary yum.repos.d]# setenforce 0
```

```bash
[root@primary yum.repos.d]# service iptables stop
[root@primary yum.repos.d]# chkconfig iptables off
```

### 1.8修改系统内核参数

```bash
echo "fs.aio-max-nr = 1048576"                       >>  /etc/sysctl.conf
echo "fs.file-max = 6815744"                         >>  /etc/sysctl.conf
echo "kernel.shmmni = 4096"                          >>  /etc/sysctl.conf
echo "kernel.sem = 250 32000 100 128"                >>  /etc/sysctl.conf
echo "net.ipv4.ip_local_port_range = 9000 65000"     >>  /etc/sysctl.conf
echo "net.core.rmem_default=4194304"                 >>  /etc/sysctl.conf
echo "net.core.rmem_max=4194304"                     >>  /etc/sysctl.conf
echo "net.core.wmem_default=262144"                  >>  /etc/sysctl.conf
echo "net.core.wmem_max=1048586"                     >>  /etc/sysctl.conf
echo "kernel.shmall = 262144"                        >>  /etc/sysctl.conf
echo "kernel.shmmax = 1073741824"                    >>  /etc/sysctl.conf
```

```bash
[root@primary yum.repos.d]# sysctl -p
```

### 1.9关闭ntp服务

```bash
[root@primary yum.repos.d]# service ntpd stop
[root@primary yum.repos.d]# chkconfig ntpd off
[root@primary yum.repos.d]# mv /etc/ntp.conf  /etc/ntp.conf.orig
[root@primary yum.repos.d]# rm /var/rum/ntpd.pid
```

### 1.10关闭透明大页

```bash
[root@primary yum.repos.d]# more /etc/rc.local
if test -f /sys/kernel/mm/transparent_hugepage/enabled; then
echo never > /sys/kernel/mm/transparent_hugepage/enabled
fi
if test -f /sys/kernel/mm/transparent_hugepage/defrag; then
echo never > /sys/kernel/mm/transparent_hugepage/defrag
fi
```

### 1.11 修改环境变量

```bash
[root@primary ~]$ su - oracle
[oracle@primary ~]$ vim ~/.bash_profile
export TMP=/tmp
export LANG=en_US
export TMPDIR=$TMP
export ORACLE_HOSTNAME=primary
export ORACLE_UNQNAME=primary
ORACLE_BASE=/oracle/app/oracle; export ORACLE_BASE
ORACLE_HOME=$ORACLE_BASE/product/11.2.0/db_1; export ORACLE_HOME
ORACLE_SID=primary; export ORACLE_SID
ORACLE_TERM=xterm; export ORACLE_TERM
NLS_DATA_FORMAT="yyyy-mm-dd HH24:MI:SS";export NLS_DATA_FORMAT
NLS_LANG=AMERICAN_AMERICA.ZHS16GBK; export NLS_LANG
PATH=.:$PATH:$HOME/bin:$ORCLE_BASE/product/11.2.0/db_1/bin:$ORACLE_HOME/bin;export PATH
THREADS_FLAG=native; export THREADS_FLAG
if [ $USER = "oracle" ]||[ $USER = "grid" ];then
  if [ $SHELL = "/bin/ksh" ];then
   ulimit = 16384
      ulimit -n 65536
 else
  ulimit -u 16384 -n 65536
 fi
umask 022
fi
```

这段配置执行完，在切换用户的时候可能会出现`operation not permitted`提示
可以尝试把profile这段配置写在`/etc/profile`

```bash
[oracle@primary yum.repos.d]# source ~/.bash_profile
[oracle@primary ~]$ env| grep ORACLE
ORACLE_UNQNAME=primary
ORACLE_SID=primary
ORACLE_BASE=/oracle/app/oracle
ORACLE_HOSTNAME=primary
ORACLE_TERM=xterm
ORACLE_HOME=/oracle/app/oracle/product/11.2.0/db_1
```

## 二、安装Oracle

### 2.1上传安装包,解压安装包

```bash
[root@primary soft]# mkdir /soft
[root@primary soft]# ll
-rwxrwxrwx  1 root   root   1395582860 Jun 10 14:08 p13390677_112040_Linux-x86-64_1of7.zip
-rwxrwxrwx  1 root   root   1151304589 Jun 10 14:07 p13390677_112040_Linux-x86-64_2of7.zip
```

```bash
[root@primary soft]# unzip p13390677_112040_Linux-x86-64_1of7.zip
[root@primary soft]# unzip p13390677_112040_Linux-x86-64_2of7.zip
chown -R oracle:oinstall /soft
chmod -R 777 /soft
```

### 2.2 安装Oracle软件

```bash
[root@primary soft]# su - oracle
[oracle@primary ~]$ cd /soft/database/response/
[oracle@primary response]$ cp db_install.rsp db_install.rsp.bak
[oracle@primary response]$ vim db_install.rsp
oracle.install.responseFileVersion=/oracle/install/rspfmt_dbinstall_response_schema_v11_2_0
oracle.install.option=INSTALL_DB_SWONLY
ORACLE_HOSTNAME=primary
UNIX_GROUP_NAME=oinstall
INVENTORY_LOCATION=/oracle/app/oraInventory
SELECTED_LANGUAGES=en,zh_CN,zh_TW
ORACLE_HOME=/oracle/app/oracle/product/11.2.0/db_1
ORACLE_BASE=/oracle/app/oracle
oracle.install.db.InstallEdition=EE
oracle.install.db.optionalComponents=oracle.rdbms.partitioning:11.2.0.4.0,oracle.oraolap:11.2.0.4.0,oracle.rdbms.dm:1.2.0.4.0,oracle.rdbms.dv:11.2.0.4.0,oracle.rdbms.lbac:11.2.0.4.0,oracle.
rdbms.rat:11.2.0.4.0
oracle.install.db.DBA_GROUP=dba
oracle.install.db.OPER_GROUP=oinstall
DECLINE_SECURITY_UPDATES=true 
#这段参数在原配置未找到
#oracle.install.db.isCustomInstall=true
```

```bash
[oracle@primary database]$ ./runInstaller -silent -force -noconfig -responseFile /soft/database/response/db_install.rsp
```

```bash
##各参数含义如下:

-silent 表示以静默方式安装,不会有任何提示

-force 允许安装到一个非空目录

-noconfig 表示不运行配置助手netca

-responseFile 表示使用哪个响应文件,必需使用绝对路径

oracle.install.responseFileVersion 响应文件模板的版本,该参数不要更改

oracle.install.option 安装选项,本例只安装oracle软件,该参数不要更改

DECLINE_SECURITY_UPDATES 是否需要在线安全更新,设置为false,该参数不要更改

ORACLE_HOSTNAME 安装主机名

UNIX_GROUP_NAME oracle用户用于安装软件的组名

INVENTORY_LOCATION oracle产品清单目录

SELECTED_LANGUAGES oracle运行语言环境,一般包括引文和简繁体中文

ORACLE_HOME Oracle安装目录

ORACLE_BASE oracle基础目录

oracle.install.db.InstallEdition 安装版本类型,一般是企业版

oracle.install.db.isCustomInstall 是否定制安装,默认Partitioning,OLAP,RAT都选上了

oracle.install.db.customComponents 定制安装组件列表:除了以上默认的,可加上Label Security和Database Vault

oracle.install.db.DBA_GROUP oracle用户用于授予OSDBA权限的组名

oracle.install.db.OPER_GROUP oracle用户用于授予OSOPER权限的组名
```

### 2.3 安装监听

```bash
[oracle@primary database]$ $ORACLE_HOME/bin/netca /silent /responsefile /soft/database/response/netca.rsp

Parsing command line arguments:
    Parameter "silent" = true
    Parameter "responsefile" = /soft/database/response/netca.rsp
Done parsing command line arguments.
Oracle Net Services Configuration:
Profile configuration complete.
Oracle Net Listener Startup:
    Running Listener Control: 
      /oracle/app/oracle/product/11.2.0/db_1/bin/lsnrctl start LISTENER
    Listener Control complete.
    Listener started successfully.
Listener configuration complete.
Oracle Net Services configuration successful. The exit code is 0
```

### 2.4 安装Oracle实例

```bash
[oracle@primary database]$ cd /soft/database/response/
[oracle@primary response]$ cp dbca.rsp dbca.rsp.bak 
[oracle@primary response]$ vim dbca.rsp
RESPONSEFILE_VERSION = "11.2.0"
OPERATION_TYPE = "createDatabase"
GDBNAME = primary
SID = primary
TEMPLATENAME = "General_Purpose.dbc"
CHARACTERSET = AL16UTF16
TOTALMEMORY = "800"
```

```bash
[oracle@primary response]$ $ORACLE_HOME/bin/dbca -silent -responseFile /soft/database/response/dbca.rsp
Enter SYS user password: 

Enter SYSTEM user password: 

Copying database files
1% complete
3% complete
11% complete
18% complete
26% complete
37% complete
Creating and starting Oracle instance
40% complete
45% complete
50% complete
55% complete
56% complete
57% complete
60% complete
62% complete
Completing Database Creation
66% complete
70% complete
73% complete
85% complete
96% complete
100% complete
Look at the log file "/oracle/app/oracle/cfgtoollogs/dbca/primary/primary.log" for further details.
```

### 2.5 测试数据库及监听

```bash
[oracle@primary response]$ sqlplus "/as sysdba"
[oracle@primary response]$ lsnrctl status
```

## 问题一：minssing commond fuser

解决方法：yum install -y psmisc

## 修改SID或者字符集

```bash
# 2. 删除数据库（会清除所有数据！）
dbca -silent -deleteDatabase -sourceDB orcl -sysDBAUserName sys -sysDBAPassword 你的sys密码

# dbca.rsp，需要修改的地方如下（已按你的要求把 SID 改成 xtd，并加上 ZHS16GBK 字符集）
[CREATEDATABASE]
GDBNAME = xtd                          # ← 原来是 primary，已改
SID = xtd                              # ← 原来是 primary，已改
TEMPLATENAME = "General_Purpose.dbc"
CHARACTERSET = "ZHS16GBK"              # ← 原来是 AL16UTF16，已改
NATIONALCHARACTERSET = "AL16UTF16"     # ← 建议新增这一行
TOTALMEMORY = "800"

```

修改之后就可以重新创建

|参数|含义|你应该填什么|
|--|--|--|
|-sourceDB orcl|要删除的数据库的 SID（实例名）|改成你实际的数据库 SID。你之前创建的如果是 orcl，就保持 orcl；如果是别的名字（比如 primary），就改成那个名字
|-sysDBAUserName sys|用哪个用户以 SYSDBA 权限去删除数据库|一般固定写 sys，不用改|
|-sysDBAPassword 你的sys密码|sys 用户的密码|改成你安装/创建数据库时给 sys 用户设置的真实密码|
