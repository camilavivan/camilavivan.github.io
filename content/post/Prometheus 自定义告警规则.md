---
title: Prometheus 自定义告警规则
date: 2023-01-04 09:52:51
type: categories
tags: 
    - kubernetes
    - Prometheus
keywords: 
    - kubernetes 
    - Prometheus
categories: 
    - kubernetes
    - Prometheus
---

## 一、概述

> 通过创建 Prometheus 监控告警规则，您可以制定针对特定 Prometheus 实例的告警规则。当告警规则设置的条件满足后，系统会产生对应的告警事件。如果想要收到通知，需要进一步配置对应的通知策略以生成告警并且以短信、邮件、电话、钉群机器人、企业微信机器人或者 Webhook 等方式发送通知。

从 Prometheus server 端接收到 alerts 后，会基于 PromQL 的告警规则 分析数据，如果满足 PromQL 定义的规则，则会产生一条告警，并发送告警信息到 Alertmanager，Alertmanager 则是根据配置处理告警信息并发送。所以 Prometheus 的告警配置依赖于`PromQL`与`AlertManager`，关于这两个介绍可以参考以下文章：

- **Prometheus AlertManager 实战**[1]
- **Prometheus PromQL 实战**[2]
- **Prometheus Pushgetway 实战**[3]
- [官方文档](https://prometheus.io/docs/alerting/latest/overview/)

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212220942871.png)

## 二、告警实现流程

设置警报和通知的主要步骤是：

1. 在 Prometheus 中配置告警规则。
2. 配置 Prometheus 与 AlertManager 关联。
3. 配置 AlertManager 告警通道。

## 三、告警规则

[官方文档](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)

### 1）告警规则配置

在 Prometheus 配置（`prometheus.yml`）中添加报警规则配置，配置文件中 `rule_files` 就是用来指定报警规则文件的，如下配置即指定存放报警规则的目录为/etc/prometheus，规则文件为 rules.yml：

```yaml
rule_files:
- /etc/prometheus/rules.yml
```

**设置报警规则：**

警报规则允许基于 Prometheus 表达式语言的表达式来定义报警报条件的，并在触发警报时发送通知给外部的接收者（Alertmanager），一条警报规则主要由以下几部分组成：

- `alert`——告警规则的名称。
- `expr`——是用于进行报警规则 PromQL 查询语句。
- `for`——评估告警的等待时间（Pending Duration）。
- `labels`——自定义标签，允许用户指定额外的标签列表，把它们附加在告警上。
- `annotations`——用于存储一些额外的信息，用于报警信息的展示之类的。

rules.yml 示例如下：

```yaml
groups:
- name: example
  rules:
  - alert: high_memory
    # 当内存占有率超过10%，持续1min,则触发告警
    expr: 100 - ((node_memory_MemAvailable_bytes{instance="192.168.182.110:9100",job="node_exporter"} * 100) / node_memory_MemTotal_bytes{instance="192.168.182.110:9100",job="node_exporter"}) > 90
    for: 1m
    labels:
      severity: page
    annotations:
      summary: spike memeory
```

### 1）监控服务器是否在线

对于被 Prometheus 监控的服务器，我们都有一个 up 指标，可以知道该服务是否在线。

```yaml
up == 0  #服务下线了。
up == 1 #服务在线。
```

【示例】

```yaml
groups:
- name: Test-Group-001 # 组的名字，在这个文件中必须要唯一
  rules:
  - alert: InstanceDown # 告警的名字，在组中需要唯一
    expr: up == 0 # 表达式, 执行结果为true: 表示需要告警
    for: 1m # 超过多少时间才认为需要告警(即up==0需要持续的时间)
    labels:
      severity: warning # 定义标签
    annotations:
      summary: "服务 {{ $labels.instance }} 下线了"
      description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 1 minutes."
```

注意：

- `for` 指定达到告警阈值之后，一致要持续多长时间，才发送告警数据。
- `labels` 中可以指定自定义的标签，如果定义的标签已经存在，则会被覆盖。可以使用模板。
- `annotations` 中的数据，可以使用模板，`$labels`表示告警**数据的标签**，`{{$value}}`表示**时间序列的值**。

### 3）告警数据的状态

- `Inactive`——表示没有达到告警的阈值，即 expr 表达式不成立。
- `Pending`——表示达到了告警的阈值，即 expr 表达式成立了，但是未满足告警的持续时间，即 for 的值。
- `Firing`——已经达到阈值，且满足了告警的持续时间。

> *【温馨提示】经测试发现，如果同一个告警数据达到了 Firing，那么不会再次产生一个告警数据，除非该告警解决了。*

## 四、实战操作

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212220941947.png)

### 1）下载 node_exporter

> *node-exporter 用于采集 node 的运行指标，包括 node 的 cpu、load、filesystem、meminfo、network 等基础监控指标，类似于 zabbix 监控系统的的 zabbix-agent。*

[下载地址](https://github.com/prometheus/node_exporter/releases/)

```bash
wget https://github.com/prometheus/node_exporter/releases/download/v1.5.0/node_exporter-1.5.0.linux-amd64.tar.gz
tar -xzf node_exporter-1.5.0.linux-amd64.tar.gz
```

### 2）启动 node_exporter

```bash
ln -s /opt/prometheus/exporter/node_exporter/node_exporter-1.5.0.linux-amd64/node_exporter  /usr/local/bin/node_exporter
# 指定端口启动，默认端口：9100
node_exporter --web.listen-address=":9100"
```

配置`node_exporter.service`启动

```bash
# 默认端口9100
cat >/usr/lib/systemd/system/node_exporter.service<<EOF
[Unit]
Description=node_exporter
After=network.target
 #可以创建相应的用户和组 启动
#User=prometheus
#Group=prometheus

[Service]
ExecStart=/opt/prometheus/exporter/node_exporter/node_exporter-1.5.0.linux-amd64/node_exporter --web.listen-address=:9100
[Install]
WantedBy=multi-user.target
EOF
```

启动服务

```bash
systemctl daemon-reload
systemctl start node_exporter
systemctl status node_exporter
systemctl enable node_exporter
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212220941957.png)检查

```bash
curl http://localhost:9100/metrics
```

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212220941163.png)

### 3）配置 Prometheus 加载 node_exporter

添加或修改配置 `prometheus.yml`
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212220943146.png)

重启加载配置

```bash
systemctl restart prometheus
# 1、 kill方式
#kill -HUP pid
# 2、curl方式（推荐）
#curl -X POST http://IP/-/reload
# 【注意】需要在启动的命令行增加参数： --web.enable-lifecycle
curl -X POST http://192.168.182.110:9090/-/reload
# 3、重启（不推荐，重启会导致所有的连接短暂性中断）
systemctl restart prometheus
```

检查
web：`http://ip:9090/targets`
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212220941014.png)

### 4）告警规则配置

在 Prometheus 配置文件`rometheus.yml` 中配置如下：
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212220943663.png)
在`/etc/prometheus/rule.yml`配置如下：

```yaml
groups:
- name: Test-Group-001 # 组的名字，在这个文件中必须要唯一
  rules:
  - alert: InstanceDown # 告警的名字，在组中需要唯一
    expr: up == 0 # 表达式, 执行结果为true: 表示需要告警
    for: 1m # 超过多少时间才认为需要告警(即up==0需要持续的时间)
    labels:
      severity: warning # 定义标签
    annotations:
      summary: "服务 {{ $labels.instance }} 下线了"
      description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 1 minutes."
```

重新加载

```bash
curl -X POST http://localhost:9090/-/reload
```

在 web 上就可以看到一个告警规则。
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212220941350.png)

### 5）模拟告警

手动关机

```bash
sudo shutdown -h now
```

过了一段时间告警状态就变成`Pending`
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212220943160.png)
再过一段时间告警就变成了`Firing`
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212220941009.png)

### 6）配置告警通道

这里以有邮件告警为示例，其它的也差不多。修改配置之前最好先备份一下之前的配置

```bash
cp alertmanager.yml alertmanager.bak
```

【1】配置 `alertmanager.yml`

```yaml
global:
  resolve_timeout: 5m
  ## 这里为qq邮箱 SMTP 服务地址，官方地址为 smtp.qq.com 端口为 465 或 587，同时要设置开启 POP3/SMTP 服务。
  smtp_smarthost: 'smtp.qq.com:465'
  smtp_from: 'xxxxxxxx@qq.com'
  smtp_auth_username: 'xxxxxxxx@qq.com'
  #授权码，不是密码,在 QQ 邮箱服务端设置开启 POP3/SMTP 服务时会提示
  smtp_auth_password: 'xxxxxxxx'
  smtp_require_tls: false

#1、模板
templates:
  - '/opt/prometheus/alertmanager/alertmanager-0.24.0.linux-amd64/templates/email.tmpl'

#2、路由
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  #邮箱
  receiver: 'email'

receivers:
- name: 'email'
  email_configs:
  ## 接收警报的email（这里是引用模板文件中定义的变量）
  - to: '{{ template "email.to"}}'
    ## 发送邮件的内容（调用模板文件中的）
    html: '{{ template "email.to.html" .}}'
    send_resolved: true

# 抑制器配置
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    #确保这个配置下的标签内容相同才会抑制，也就是说警报中必须有这三个标签值才会被抑制。
    equal: ['alertname', 'dev', 'instance']
```

【2】模板 `alert.tmpl`

模板文件配置了`email.from`、`email.to`、`email.to.html` 三种模板变量，可以在 `alertmanager.yml` 文件中直接配置引用。这里 `email.to.html` 就是要发送的邮件内容，**支持 Html 和 Text 格式**，这里为了显示好看，采用 Html 格式简单显示信息。下边 {{ range .Alerts }} 是个循环语法，用于循环获取匹配的 Alerts 的信息。

```json
{{ define "email.from" }}xxxxxxxx@qq.com{{ end }}
{{ define "email.to" }}xxxxxxxx@163.com{{ end }}
{{ define "email.to.html" }}
{{ range .Alerts }}
=========start==========<br>
告警程序: prometheus_alert <br>
告警级别: {{ .Labels.severity }} 级 <br>
告警类型: {{ .Labels.alertname }} <br>
故障主机: {{ .Labels.instance }} <br>
告警主题: {{ .Annotations.summary }} <br>
告警详情: {{ .Annotations.description }} <br>
触发时间: {{ .StartsAt.Format "2019-08-04 16:58:15" }} <br>
=========end==========<br>
{{ end }}
{{ end }}
```

> *【温馨提示】这里记得换成自己的邮箱地址！！！*

重启 alertmanager

```bash
systemctl restart alertmanager
```

在 web 上就可以看到对应的告警信息了。
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212220944402.png)
接下来就静待告警了。
![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202212220941740.png)
一整套流程到这里就全部跑通了，告警规则、告警指标、告警通道根据自己的场景来定

### 参考资料

> [1] [Prometheus AlertManager 实战](https://www.cnblogs.com/liugp/p/16974615.htmla)
> [2] [Prometheus PromQL 实战](https://www.cnblogs.com/liugp/p/16977340.html)
> [3] [Prometheus Pushgetway 实战](https://www.cnblogs.com/liugp/p/16973756.html)
