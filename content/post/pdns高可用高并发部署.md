---
title: pdns高可用高并发部署
date: 2023-01-04 10:14:51
type: categories
tags: 
    - Linux
    - PDNS
keywords: 
    - DNS 
categories: 
    - Linux
    - DNS
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202210131012603.png
---

## 企业DNS系列一PowerDNS Authoritative和Recursor搭建

![img](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202210131012603.png)在企业私有云和公有云环境中，DNS服务的重要性不言而喻，企业往往需要搭建一套稳定可靠的DNS系统，本系列Blog将通过开源的PowerDNS全家桶搭建基于Linux平台的、具备高性能、高可靠性的企业DNS系统。

2022年月8月12日更新：在企业使用GSLB（全局负载均衡）进行应用保护时，PowerDNS权威服务器CNAME和NS解析正常，但PowerDNS递归服务器无法正常工作，这是由于递归服务器默认不对私有IP地址进行二次解析，需要修改PowerDNS递归服务器的“dont-query=127.0.0.1/8”

## 基于PowerDNS构建的企业DNS架构概述

PowerDNS全家桶中包含PowerDNS Authoritative、Recursor、DNSList（暂不使用）三个组件。

* PowerDNS Authoritative：DNS权威服务器，用于提供企业私有域名的管理和解析；
* PowerDNS Recursor：DNS递归服务器，用于接受客户端DNS查询请求，并根据目标域转发配置转发到不同的上游DNS服务器进行解析，并对DNS解析记录进行缓存；
* PowerDNS-Admin：DNS权威服务器的Web管理页面；
* PowerDNS-Monitor：使用Grafana提供权威服务器和递归服务器的监控页面

PowerDNS权威服务器支持多种复制模式，本架构采用MySQL作为后端存储，并通过MySQL复制实现主备数据同步。

本系列文章一共包含四部分：

* [企业DNS系列一]PowerDNS Authoritative和Recursor搭建
* [企业DNS系列二]通过Grafana监控PowerDNS
* [企业DNS系列三]通过Anycast技术实现DNS高可用
* [企业DNS系列四]通过Terraform管理PowerDNS

## 服务器规划

| 服务器名称        | IP地址         | 硬件配置      | 用途           | 备注              |
| ------------ | ------------ | --------- | ------------ | --------------- |
| pdns-auth01  | 10.208.0.101 | 2C/4G/80G | 权威服务器        | 主服务器，用于管理企业私有域名 |
| pdns-auth02  | 10.208.0.102 | 2C/4G/80G | 权威服务器        | 备服务器，用于管理企业私有域名 |
| pdns-rec01   | 10.208.0.111 | 4C/8G/80G | 递归服务器        | 用于DNS解析转发、缓存    |
| pdns-rec02   | 10.208.0.112 | 4C/8G/80G | 递归服务器        | 用于DNS解析转发、缓存    |
| pdns-admin   | 10.208.0.100 | 2C/4G/80G | Web管理服务器     | 用于提供权威服务器的Web管理 |
| pdns-monitor | 10.208.0.99  | 4C/8G/80G | Grafana监控服务器 | 用于监控DNS服务器状态    |

## 部署步骤概述

1. pdns-auth01和pdns-auth02部署MySQL数据库，并配置主从复制；
2. pdns-auth01和pdns-auth02创建powerdns数据库，并初始化数据库表；
3. pdns-auth01和pdns-auth02部署Pdns和Pdns-backend-mysql软件；
4. pdns-auth01和pdns-auth02准备pdns配置文件，并启动服务；
5. pdns-admin安装Docker环境，并启动PowerDNS-Admin；
6. pdns-admin修改连接配置、默认配置、创建Domain和解析记录；
7. pdns-rec01和pdns-sec02部署pdns-recursor；
8. pdns-rec01和pdns-sec02准备pdns-recursor配置文件，并启动服务；
9. DNS解析测试。

## MySQL数据库部署

安装MySQL5.7源，并安装MySQL最新的社区版本。

```bash
wget https://dev.mysql.com/get/mysql57-community-release-el7-11.noarch.rpm
rpm -Uvh mysql57-community-release-el7-11.noarch.rpm

yum makecache

yum install -y mysql-community-server

systemctl enable mysqld
systemctl start mysqld
```

```bash
##安装失败报错如下
Retrieving key from file:///etc/pki/rpm-gpg/RPM-GPG-KEY-mys
Importing GPG key 0x5072E1F5:
 Userid     : "MySQL Release Engineering <mysql-build@oss.o
 Fingerprint: a4a9 4068 76fc bd3c 4567 70c8 8c71 8d3b 5072
 Package    : mysql57-community-release-el7-11.noarch (inst
 From       : /etc/pki/rpm-gpg/RPM-GPG-KEY-mysql

Public key for mysql-community-server-5.7.40-1.el7.x86_64.r

 Failing package is: mysql-community-server-5.7.40-1.el7.x8
 GPG Keys are configured as: file:///etc/pki/rpm-gpg/RPM-GP

##此为密钥过期，升级密钥即可，执行以下命令
rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2022
```

通过日志获取mysql root\@localhost密码，并设置新密码。

```mysql
grep 'temporary password' /var/log/mysqld.log

mysql -uroot -p

ALTER USER 'root'@'localhost' IDENTIFIED BY '新密码';
```

修改pdns-auth01（主）服务器的MySQL配置文件。

```bash
vi /etc/my.cnf 
在[mysqld]之前添加 
[client] 
default-character-set=utf8 
在[mysqld]之后添加 
character-set-server=utf8
log-bin=mysql-bin
server-id=1
binlog-do-db=powerdns
```

修改pdns-auth02（从）服务器的MySQL配置文件。

```bash
vi /etc/my.cnf 
在[mysqld]之前添加 
[client] 
default-character-set=utf8 
在[mysqld]之后添加 
character-set-server=utf8
server-id=2
```

重新启动MySQL数据库服务。

```bash
systemctl restart mysql
```

配置数据库允许root远程访问，root账户同时用于主从复制。

```mysql
use mysql;
update user set host = '%' where user = 'root';
Grant all on *.* to 'root'@'%' identified by 'root用户的密码' with grant option;
flush privileges;
```

再次重启MySQL数据库服务。

```bash
systemctl restart mysql
```

登录到pdns-auth01（主）MySQL数据库，记录binlog文件名和position，稍后再MySQL从复制配置中使用。

```mysql
mysql -uroot -p
show master status;
```

登录到pdns-auth02（从）MySQL数据库，配置并启动主从复制。

> 注意1：master\_port不用加引号； 注意2：master\_log\_file和master\_log\_pos需要从主数据库获取；

```mysql
mysql -uroot -p
change master to
master_host='10.208.0.101',
master_port=3306,
master_user='root',
master_password='root用户的密码',
master_log_file='主binlog名称',
master_log_pos=154;

start slave;
show slave status \G
```

登录到pdns-auth01（主）创建**powerdns**数据库(需要在主从配置完成后创建)。

```mysql
mysql -uroot -p
CREATE DATABASE powerdns;
GRANT ALL ON powerdns.* TO 'powerdns'@'localhost' IDENTIFIED BY 'VMware1!';
FLUSH PRIVILEGES;
```

创建pdns数据库表。

```mysql
CREATE TABLE domains (
  id                    INT AUTO_INCREMENT,
  name                  VARCHAR(255) NOT NULL,
  master                VARCHAR(128) DEFAULT NULL,
  last_check            INT DEFAULT NULL,
  type                  VARCHAR(6) NOT NULL,
  notified_serial       INT UNSIGNED DEFAULT NULL,
  account               VARCHAR(40) CHARACTER SET 'utf8' DEFAULT NULL,
  PRIMARY KEY (id)
) Engine=InnoDB CHARACTER SET 'latin1';

CREATE UNIQUE INDEX name_index ON domains(name);

CREATE TABLE records (
  id                    BIGINT AUTO_INCREMENT,
  domain_id             INT DEFAULT NULL,
  name                  VARCHAR(255) DEFAULT NULL,
  type                  VARCHAR(10) DEFAULT NULL,
  content               VARCHAR(64000) DEFAULT NULL,
  ttl                   INT DEFAULT NULL,
  prio                  INT DEFAULT NULL,
  disabled              TINYINT(1) DEFAULT 0,
  ordername             VARCHAR(255) BINARY DEFAULT NULL,
  auth                  TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id)
) Engine=InnoDB CHARACTER SET 'latin1';

CREATE INDEX nametype_index ON records(name,type);
CREATE INDEX domain_id ON records(domain_id);
CREATE INDEX ordername ON records (ordername);

CREATE TABLE supermasters (
  ip                    VARCHAR(64) NOT NULL,
  nameserver            VARCHAR(255) NOT NULL,
  account               VARCHAR(40) CHARACTER SET 'utf8' NOT NULL,
  PRIMARY KEY (ip, nameserver)
) Engine=InnoDB CHARACTER SET 'latin1';

CREATE TABLE comments (
  id                    INT AUTO_INCREMENT,
  domain_id             INT NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  type                  VARCHAR(10) NOT NULL,
  modified_at           INT NOT NULL,
  account               VARCHAR(40) CHARACTER SET 'utf8' DEFAULT NULL,
  comment               TEXT CHARACTER SET 'utf8' NOT NULL,
  PRIMARY KEY (id)
) Engine=InnoDB CHARACTER SET 'latin1';

CREATE INDEX comments_name_type_idx ON comments (name, type);
CREATE INDEX comments_order_idx ON comments (domain_id, modified_at);

CREATE TABLE domainmetadata (
  id                    INT AUTO_INCREMENT,
  domain_id             INT NOT NULL,
  kind                  VARCHAR(32),
  content               TEXT,
  PRIMARY KEY (id)
) Engine=InnoDB CHARACTER SET 'latin1';

CREATE INDEX domainmetadata_idx ON domainmetadata (domain_id, kind);

CREATE TABLE cryptokeys (
  id                    INT AUTO_INCREMENT,
  domain_id             INT NOT NULL,
  flags                 INT NOT NULL,
  active                BOOL,
  published             BOOL DEFAULT 1,
  content               TEXT,
  PRIMARY KEY(id)
) Engine=InnoDB CHARACTER SET 'latin1';

CREATE INDEX domainidindex ON cryptokeys(domain_id);

CREATE TABLE tsigkeys (
  id                    INT AUTO_INCREMENT,
  name                  VARCHAR(255),
  algorithm             VARCHAR(50),
  secret                VARCHAR(255),
  PRIMARY KEY (id)
) Engine=InnoDB CHARACTER SET 'latin1';

CREATE UNIQUE INDEX namealgoindex ON tsigkeys(name, algorithm);
```

此步骤完成了MySQL数据库的主从复制环境和powerdns数据库的置备，您可以查看powerdns数据库是否复制成功。

## 安装PowerDNS权威服务器

安装PowerDNS Authoritative源和安装PowerDNS Authoritative。

```bash
yum install epel-release yum-plugin-priorities &&
curl -o /etc/yum.repos.d/powerdns-auth-45.repo https://repo.powerdns.com/repo-files/centos-auth-45.repo &&
yum install pdns pdns-backend-mysql
```

生成权威服务器配置（采用Native复制模式（基于后端MySQL复制），两台权威服务器配置相同）

```bash
mv /etc/pdns/pdns.conf /etc/pdns/pdns.conf.bak
vm /etc/pdns/pdns.conf

# backend
launch=gmysql
gmysql-host=localhost
gmysql-port=3306
gmysql-dbname=powerdns
gmysql-user=powerdns
gmysql-password=powerdns用户密码

# pdns API
webserver=yes
webserver-address=0.0.0.0
webserver-allow-from=0.0.0.0/0
webserver-port=8081
api=yes
api-key=vmware

# pdns config
daemon=yes
guardian=yes
local-address=0.0.0.0
```

更改配置文件权限

```bash
chown pdns. /etc/pdns/pdns.conf
```

启动两台权威服务器

```bash
systemctl enable pdns
systemctl start pdns
```

## 部署PowerDNS-Admin管理控制台

参考上面部署安装MySQL数据库（无需主从复制），此数据库仅用于PowerDNS-Admin自己使用。

安装Docker和Docker-Compose环境。

```bash
yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo

yum list docker-ce --showduplicates |sort -r

yum install -y docker-ce-20.10.8 docker-compose

systemctl enable docker
systemctl start docker
```

准备PowerDNS-Admin的docker-compse文件。

> 注意：IP地址不能是Localhost或者127.0.0.1

```bash
vi /usr/local/powerdns-admin/docker-compose.yml

version: "3"

services:
  app:
    image: ngoduykhanh/powerdns-admin:latest
    container_name: powerdns_admin
    ports:
      - "80:80"
    logging:
      driver: json-file
      options:
        max-size: 50m
    environment:
      - SQLALCHEMY_DATABASE_URI=mysql://root:VMware1!@10.208.0.100/pda
      - GUNICORN_TIMEOUT=60
      - GUNICORN_WORKERS=2
      - GUNICORN_LOGLEVEL=DEBUG
      - OFFLINE_MODE=False # True for offline, False for external resources
```

在本地MySQL数据库中创建powerdns-admin数据库

```mysql
mysql -uroot -p
CREATE DATABASE pda CHARACTER SET utf8 COLLATE utf8_general_ci;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'VMware1!';
FLUSH PRIVILEGES;
exit
```

启动powerdns-admin

```bash
cd /usr/local/powerdns-admin
docker-compose up -d
```

访问管理页面，创建新用户，第一次创建的新用户默认为管理员，使用此用户登录，登录成功后，进行如下初始化配置：

1. Settings->PDNS：PDNS API URL=[http://10.208.0.101:8081](http://10.208.0.101:8081/) PDNS API KEY=vmware PDNS VERSION=4.5.1
2. Settings->Records：选中Forward Zone列的SOA选项，Update保存。
3. Settings->Basic：修改auto\_ptr为ON。
4. Settings->Authentication：取消选中Allow users to sign up。

新建权威域，输入域名后，其他保持默认，并提交。![img](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202210131011384.png)

点击域名，进行解析记录管理。![img](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202210131011360.png)首先修改默认SOA配置，主Name Server为Pdns-auth01的域名。![img](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202210131013326.png)再创建相应的A记录和NS记录。![img](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202210131013220.png)

## 部署PowerDNS递归服务器

PowerDNS权威服务器（Authoritative）不应该直接响应客户的DNS解析请求，因为PowerDNS中递归（Recursor）服务器能够提供DNS缓存、高并发、转发等能力。

> 注意：如果为了节约服务器数量和满足小环境需求，PowerDNS Recursor也可以部署到PowerDNS Authoritative中，只需要修改使用不同的监听端口即可（例如：pdns监听5353，pdns-recursor监听53）。

安装PowerDNS Recursor源和pdns-recursor

```bash
# yum install epel-release yum-plugin-priorities 
# curl -o /etc/yum.repos.d/powerdns-rec-42.repo https://repo.powerdns.com/repo-files/centos-rec-42.repo 
# yum install pdns-recursor
# systemctl restart pdns-recursor.service
# systemctl enable pdns.service

curl -o /etc/yum.repos.d/powerdns-rec-45.repo https://repo.powerdns.com/repo-files/centos-rec-45.repo &&
yum install pdns-recursor
```

（可选）进行操作系统内核参数优化

```bash
echo "root soft nofile 65535" >> /etc/security/limits.conf
echo "root hard nofile 65535" >> /etc/security/limits.conf
echo "root soft nproc 65535"  >> /etc/security/limits.conf
echo "root hard nproc 65535"  >> /etc/security/limits.conf
echo "root soft  memlock  unlimited"  >> /etc/security/limits.conf
echo "root hard memlock  unlimited"  >> /etc/security/limits.conf
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf
echo "* soft nproc 65535"  >> /etc/security/limits.conf
echo "* hard nproc 65535"  >> /etc/security/limits.conf
echo "* soft memlock unlimited"  >> /etc/security/limits.conf
echo "* hard memlock  unlimited"  >> /etc/security/limits.conf

cp /etc/sysctl.conf /etc/sysctl.conf.bak
cat > /etc/sysctl.conf << EOF
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.ip_forward = 1
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
net.ipv6.conf.all.router_solicitations = 0
net.ipv6.conf.default.router_solicitations = 0
net.ipv6.conf.all.dad_transmits = 0
net.ipv6.conf.default.dad_transmits = 0
net.ipv6.conf.all.max_addresses = 1
net.ipv6.conf.default.max_addresses = 1
kernel.panic_on_oops = 1
kernel.panic = 10
vm.overcommit_memory = 1
net.core.somaxconn= 65535
fs.file-max= 1048576
fs.nr_open = 10000000
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.default.accept_source_route = 0
kernel.sysrq = 0
kernel.core_uses_pid = 1
net.ipv4.tcp_syncookies = 1
kernel.msgmnb = 65536
kernel.msgmax = 65536
kernel.shmmax = 68719476736
kernel.shmall = 4294967296
net.ipv4.tcp_max_tw_buckets = 6000
net.ipv4.tcp_sack = 1
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_rmem = 10240 87380 12582912
net.ipv4.tcp_wmem = 10240 87380 12582912
net.core.wmem_default = 8388608
net.core.rmem_default = 8388608
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.netdev_max_backlog = 262144
net.ipv4.tcp_max_orphans = 3276800
net.ipv4.tcp_max_syn_backlog = 262144
net.ipv4.tcp_timestamps = 0
net.ipv4.tcp_synack_retries = 1
net.ipv4.tcp_syn_retries = 1
net.ipv4.tcp_tw_recycle = 1
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_mem = 94500000 915000000 927000000
net.ipv4.tcp_fin_timeout = 1
net.ipv4.tcp_keepalive_time = 30
net.ipv4.ip_local_port_range = 35000 65000
EOF
```

（可选）Ulimit优化。

```bash
vi /etc/systemd/system.conf
DefaultLimitNOFILE=65535
DefaultLimitNPROC=65535
```

重启服务器，生效内核参数配置。

```bash
reboot
```

pdns-rec01生成配置文件 /etc/pdns-recursor/recursor.conf

> 注意1：Loacl-address为pdns-recursor监听地址，请根据实际情况修改。 注意2：forward-zones-recurse选项，用于转发所有未匹配域名的解析。 注意3：mac-negative-ttl参数用于缩短无应答域名的缓存时间，例如：a.test.local解析记录尚未创建时，如果请求该记录解析，pdns-recursor会缓存空解析记录（时间默认为1小时），再缓存未被清除前，1小时内的解析都是空。配置此参数后，空解析记录默认缓存10秒钟。

```bash
daemon=yes
local-address=10.208.0.112,127.0.0.1
allow-from=0.0.0.0/0
local-port=53
etc-hosts-file=/etc/pdns-recursor/dns-hosts.local
export-etc-hosts=on
forward-zones-file=/etc/pdns-recursor/zones
forward-zones-recurse=.=114.114.114.114;115.115.115.115
#hint-file=/etc/pdns-recursor/named.ca
pdns-distributes-queries=no
reuseport=yes
max-cache-entries=2000000
#When the record does not return results, the maximum cache time is 10 seconds
max-negative-ttl=10

dnssec=off

webserver=yes
webserver-address=10.208.0.112
webserver-port=8081
webserver-allow-from=0.0.0.0/0
api-key=vmware

# Fix CNAME and NS reslution issues.
dont-query=172.0.0.1/8
```

生成相关zone文件。

> dns-hosts.local：用于通过本地文件解析域名；例如，业务系统同时对内和对外提供服务，公网域名为www\.guoqiangli.com（11.11.11.11），内网服务器地址为10.208.0.66，最佳方法是内网请求www\.guoqiangli.com解析到内网IP地址（10.208.0.66），此场景下就可以通过此文件声明解析记录。 zones：用于声明指定域名解析转发，例如：企业内部域名为test.local，权威服务器为10.208.0.101和10.208.0.102.

```bash
touch /etc/pdns-recursor/dns-hosts.local
touch /etc/pdns-recursor/zones
```

配置本地转发配置文件。

> 注意：反向解析记录必须按IP地址段添加后才能实现反向解析。

```bash
vi /etc/pdns-recursor/zones
# for test.local
+test.local=10.208.0.101;10.208.0.102
+0.208.10.in-addr.arpa=10.208.0.101;10.208.0.102
```

配置本地Host解析记录。

> 注意：此配置用于强制解析非权威域名；

```bash
vi /etc/pdns-recursor/dns-hosts.local
10.208.0.66 www.guoqiangli.com
```

启动pdns-recursor服务。

```bash
systemctl enable pdns-recursor
systemctl start pdns-recursor
```

最后，执行DNS解析测试：

```bash
dig -t a www.test.local @10.208.0.111
dig -x 10.208.0.98 @10.208.0.111
dig -t a www.guoqiangli.com @10.208.0.111
```

## 使用QueryPerf工具进行压力测试

下载queryperf源码，并编译；

```bash
cd /usr/local/src
wget http://ftp.isc.org/isc/bind9/9.7.3/bind-9.7.3.tar.gz
tar xf bind-9.7.3.tar.gz

yum install gcc

cd /usr/local/src/bind-9.7.3/contrib/queryperf
./configure
make

cp queryperf /usr/local/bin

queryperf -h
```

按如下格式准备测试文件，尽量多的记录（10万条），可以重复是重复记录。

```bash
cat /root/querytest.txt

www.vmware.com  A
www.toutiao.com A
www.baidu.com   A
www.sohu.com    A
www.test.local  A
ns1.test.local  A
ns2.test.local  A
www.guoqiangli.com  A
…………
```

执行压力测试，结果会直接显示

```bash
queryperf -d querytest.txt -s 10.208.0.111

queryperf -d querytest.txt -s 10.208.0.112
```

登录Powerdns Recursor监控页面，查看服务器负载情况。

```bash
http://10.208.0.111:8081
http://10.208.0.112:8081
```

至此，我们完成了企业DNS的高可用架构搭建，本文章中的配置参数仅供参考，实际生产环境中根据需要进行优化。
