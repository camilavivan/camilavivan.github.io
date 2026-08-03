---
title: 用Loki来绘制Ingress Nginx监控大屏
date: 2023-03-22 10:52:55
type: categories
tags: 
    - kubernetes
    - Grafana
    - Loki
keywords: 
    - kubernetes 
    - Grafana
    - Loki
categories: 
    - kubernetes
    - Grafana
    - Loki
---

最近无意间发现Grafana官网的Dashboard页面首推了一个用Loki分析Nginx日志的页面，大体也就是Loki2.0后产品主推的LogQL V2语法的典型应用。也许是最近感受到大家愈发对新语法的不熟悉，社区也特地做了一个quick demo来简单说明其新语法的使用。

在视频里，我们看到基于LogQL V2语法为Nginx日志分析提供了一个新的思路。这个demo我们可以通过官网的Dashboard中找到。不过今天小白想写的是如何在Ingress-Nginx中也能用上如视频般丝滑的界面。

## 1. Ingress-Nginx日志

日志是Loki之源，在ingress-nginx中，对于日志格式的定义是配置在`nginx-configuration`这个configMap当中。再次我们需要添加两项配置来声明ingress-nginx的全局日志格式。

```yaml
apiVersion: v1
data:
  log-format-escape-json: "true"
  log-format-upstream: '{"timestamp": "$time_iso8601", "requestID": "$req_id", "proxyUpstreamName":
    "$proxy_upstream_name","host": "$host","proxyAlternativeUpstreamName": "$proxy_alternative_upstream_name","upstreamStatus":
    "$upstream_status", "geoip_country_code": "$geoip_country_code","upstreamAddr": "$upstream_addr","request_time":
    "$request_time","httpRequest":{"requestMethod": "$request_method", "requestUrl":
    "$request_uri", "status": $status,"requestSize": "$request_length", "responseSize":
    "$upstream_response_length", "userAgent": "$http_user_agent", "remoteIp": "$remote_addr",
    "referer": "$http_referer", "latency": "$upstream_response_time", "protocol":"$server_protocol"}}'
kind: ConfigMap
metadata:
  labels:
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
  name: nginx-configuration
  namespace: ingress-nginx
```

> 注意：ingress-nginx默认开启了[geoip模块](<http://nginx.org/en/docs/http/ngx_http_geoip_module.html>)，日志格式中变量`$geoip_country_code`打印的实为国家编码

## 2. 日志采集

`工欲善其事必先利其器`，ingress-nginx在kubernetes中的日志采集方式，你可以通过promtail、fluentd或者其它三方客户端工具来完成。小白在这里不过多介绍。或者你可以参考我之前的文章《loki和fluentd的那点事儿》来思考fluentd是如何通过kubernetes元数据来定义日志label并发送给Loki的。

## 3. Grafana

### 安装worldmap-panel

Grafana提供了一个worldmap-panel用来实现一个世界地图的数据可视化，常用来分析不同的地区不同的值。在Nginx的日志中，我们主要以检索`国家编码`来可视化日志请求的大致分布。

插件安装比较简单，在grafana服务所在的实例中执行以下命令后重启服务即可：

```bash
grafana-cli plugins install grafana-worldmap-panel
```

### 导入Loki v2 Web Analytics Dashboard

在Grafana官网中下载[Loki v2 Web Analytics Dashboard](<https://grafana.com/grafana/dashboards/12559>)的json文件，并导入到自己的grafana中

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303221722390.png)

> 注意：小白在上述Ingress-Nginx中的日志格式与官方提供的有较大差异，这里导入官方的dashboard是为了节省自己绘图的时间。`你也完全可以按照官方提供的日志json格式来配置ingress-nginx`

### 调整LogQL V2查询语句

编辑一个Panel，将原本LogQL语句中的`filename=/var/log/nginx/json_access.log`调整为你自己Loki中对应的ingress-nginx日志标签即可，这样你就可以得到如下的大屏了。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303221722005.jpeg)

## 总结

如果你对LogQL V2语法不太了解的情况下，建议开始前先仔细阅读官网文档[logql](<https://grafana.com/docs/loki/latest/logql/>)，它会非常帮助你理解其精髓之处，或者你也可以参考我之前的一篇文章**《Loki迎来2.0重大更新，LogQL语法大幅增强！》**总之，LogQL查询语句给当下Loki系统带来了非常灵活的运用，不过用`Loki日志来做度量并不是社区本意`，大家切勿本末倒置
