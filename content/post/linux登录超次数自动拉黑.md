---
title:  Linux SSH 登录错误超时次数自动加入ip黑名单
date: 2023-01-29 15:36:53
type: categories
tags: 
    - Linux
keywords: Linux
categories: 
    - Linux
---

Linux 系统SSH 登录失败的内容会记录到/var/log/secure文件，通过查找关键字 Failed，可以定位到这些异常的IP地址，比如：

```bash
[root@ghost ~]# cat /var/log/secure |grep Failed               #查看所有的异常IP
[root@ghost ~]# cat /var/log/secure |grep 181.204.166.58       #查看指定的异常IP
```

相关文件 ：/etc/hosts.deny 禁止哪些IP访问主机:

```bash
[root@ghost ~]# cat /etc/hosts.deny
```

因此，我们只需要从/var/log/secure文件中提取IP地址，如果次数达到10次则将该IP写到 /etc/hosts.deny中，禁止这些IP访问主机。

脚本如下secure_ssh.sh：

```bash
[root@ghost tmp]# vim secure_ssh.sh #创建脚本文件
#! /bin/bash
cat /var/log/secure|awk '/Failed/{print $(NF-3)}'|sort|uniq -c|awk '{print $2"="$1;}' > /tmp/black.list
for i in `cat  /tmp/black.list`
do
  IP=`echo $i |awk -F= '{print $1}'`
  NUM=`echo $i|awk -F= '{print $2}'`
  echo $IP=$NUM
  if [ $NUM -gt 10 ]; then
    grep $IP /etc/hosts.deny > /dev/null
    if [ $? -gt 0 ];then
      echo "sshd:$IP:deny" >> /etc/hosts.deny
    fi
  fi
done
```

```bash
[root@ghost tmp]# chmod +x secure_ssh.sh   #给文件添加执行权限
```

将secure_ssh.sh脚本放入cron计划任务，每1小时执行一次。

```bash
[root@ghost tmp]# crontab -e
0 */1 * * *  sh /sjd/secure_ssh.sh
```
