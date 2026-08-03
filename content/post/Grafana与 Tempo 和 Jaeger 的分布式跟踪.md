---
title: Grafana与 Tempo 和 Jaeger 的分布式跟踪
date: 2023-03-24 08:52:55
type: categories
tags: 
    - kubernetes
    - Grafana
    - Tempo
keywords: 
    - kubernetes 
    - Grafana
    - Tempo
categories: 
    - kubernetes
    - Grafana
    - Tempo
---


## 如果我有一个好的日志记录和监控框架，为什么还需要跟踪？

如果某些事情没有按预期工作（失败、错误、不正确的配置等），应用程序日志有利于显示重要事件。 尽管它是应用程序设计中非常重要的元素，但还是应该节俭地记录日志。 这是因为日志收集、转换和存储的成本很高。

与事件触发和离散的日志记录不同，跟踪提供了更广泛和连续的应用程序视图。 跟踪帮助我们了解流程/事务/实体的路径，同时遍历应用程序堆栈并识别各个阶段的瓶颈。 这有助于优化应用程序并提高性能。

在本文中，我们将了解如何在日志中引入跟踪并使用 `Grafana Tempo` 和 `Jaeger` 轻松地将其可视化。 在这个例子中，我们将使用 `Prometheus`、`Grafana Loki`、`Jaeger` 和 `Grafana Tempo` 作为数据源，分别在 `Grafana` 中监控指标、日志和跟踪。

## 什么是分布式跟踪？

在微服务架构中，了解应用程序行为可能是一项有趣的任务。 这是因为传入请求可能跨越多个服务，并且每个间歇性服务可能对该请求有一个或多个操作。 导致复杂性增加，并在解决问题时花费更多时间。

分布式跟踪有助于深入了解单个操作并查明性能不佳导致的故障区域。

## 什么是开放跟踪？

[`OpenTracing`](https://opentracing.io/) 包含 API 规范、框架和库，可在任何应用程序中启用分布式跟踪。`OpenTracing API` 是非常通用的，可以防止供应商/产品锁定。最近，`OpenTracing` 和 `OpenCensus` 合并为[OpenTelemetry](https://opentelemetry.io/)（缩写为 OTel）。它的目标是通过一组 `API`、`SDK`、工具和集成来创建和管理遥测数据，例如跟踪、指标和日志。 注意：[OpenCensus](https://opencensus.io/) 由一组用于各种语言的库组成，用于从应用程序中收集指标和跟踪，在本地可视化它们并远程发送它们以进行**存储**和**分析**。

## OpenTracing的基本要素是什么？

**Span**：它是分布式跟踪的主要构建基块。它包括名称、开始时间和持续时间。

**Trace**：它是请求/事务在分布式系统中的可视化。

**Tags**：是标识一个span的key-value信息。 它有助于查询、过滤和分析跟踪数据。

**Logs**：日志是键值对，可用于捕获特定于跨度的日志记录消息以及应用程序本身的其他调试或信息输出。

**Span-context**：它是某些数据与传入请求相关联的过程。此上下文可在同一进程中应用程序的所有其他层中访问。

## 哪些可用的工具与开放跟踪兼容？

**[Zipkin](https://zipkin.io/)**：它是 Twitter 受 Google Dapper 论文启发开发的首批分布式跟踪工具之一。 Zipkin 使用 Java 编码并支持 Cassandra 和 ElasticSearch 以实现后端可扩展性。

它包括用于收集跟踪数据的客户端或报告器、用于索引和存储数据的收集器、用于提取和检索跟踪数据的查询服务以及用于可视化跟踪的 UI。 Zipkin 与 OpenTracing 标准兼容，因此这些实现也应该与其他分布式跟踪系统一起工作。

[**Jaeger**](https://www.jaegertracing.io/)：Jaeger是Uber Technologies用Go编写的另一个OpenTracing兼容项目。Jaeger还支持Cassandra和ElasticSearch作为可扩展的后端解决方案。尽管它的架构类似于 Zipkin，但它在每个主机上包含一个额外的代理，用于在将数据发送到收集器之前批量聚合数据。

[**Appdash**](https://github.com/sourcegraph/appdash)：Appdash 由 Sourcegraph 创建，是另一个用 Go 编写的分布式跟踪系统。 它还支持 OpenTracing 标准。

**[Grafana Tempo](https://grafana.com/oss/tempo/)** ：Tempo 是一个开源的、高度可扩展的分布式跟踪后端选项。 我们可以轻松地将其与 Grafana、Loki 和 Prometheus 集成。 它只需要对象存储，并且与 Jaeger、Zipkin 和 OpenTelemetry 等其他开放式跟踪协议兼容。

## 使用 Grafana Tempo 启用和可视化轨迹

有许多可用的实践教程/演示，但它们适用于 docker-compose 环境。 在这篇文章中，我们将在 Kubernetes 环境中运行一个跟踪示例。 我们将采用 Jaeger 提供的经典示例，即 HOTROD。 虽然 Jaeger 有自己的 UI 来可视化痕迹，但我们将以 Jaeger 作为数据源在 Grafana 中进行可视化。 同样，我们还将看到 Grafana Tempo 如何有助于可视化轨迹。

为了开始启用和可视化跟踪，我们将克隆 Jaeger GitHub 存储库：

```bash
git clone https://github.com/jaegertracing/jaeger.git
```

### 在微服务应用程序中启用分布式跟踪

您可以通过浏览存储库来检查如何启用 OpenTracing，如下所示。

```bash
cd jaeger/examples/hotrod
cat pkg/log/factory.go
```

```go
if span := opentracing.SpanFromContext(ctx); span != nil {
        logger := spanLogger{span: span, logger: b.logger}

        if jaegerCtx, ok := span.Context().(jaeger.SpanContext); ok {
           logger.spanFields = []zapcore.Field{
                zap.String("trace_id", jaegerCtx.TraceID().String()),
                zap.String("span_id", jaegerCtx.SpanID().String()),
            }
        }
```

### 将 docker-compose manifest 转换为 Kubernetes manifest

在 hotrod 目录中，检查现有的 Docker 清单。

您将看到docker-compose.yml文件部署Jaeger和HOTROD等服务。我们将使用 [kompose](https://kompose.io/) 将 `docker-compose` 清单转换为 Kubernetes 清单。

```bash
kompose convert
```

您将看到正在创建一些文件， 我们特别感兴趣 ,  为简单起见，我们将在 `hotrod-deployment manifest.hotrod-deployment.yamlhotrod-service.yaml` `jaeger-deployment.yamljaeger-service.yaml` 中添加以下标签

```yaml
metadata:
  annotations:
    kompose.cmd: kompose convert
    kompose.version: 1.21.0 (992df58d8)
  creationTimestamp: null
  labels:
    app: hotrod
  name: hotrod
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hotrod
```

### 在deployment manifest中启用 Jaeger 跟踪

现在我们需要在 中添加以下环境变量。`hotrod-deployment.yaml`

```yaml
spec:
  containers:
  - args:
    - all
    env:
    - name: JAEGER_AGENT_HOST
      value: tempo
    - name: JAEGER_AGENT_PORT
      value: "6831"
    - name: JAEGER_SAMPLER_TYPE
      value: const
    - name: JAEGER_SAMPLER_PARAM
      value: "1"
    - name: JAEGER_TAGS
      value: app=hotrod
    image: jaegertracing/example-hotrod:latest
    imagePullPolicy: ""
    name: hotrod
    ports:
    - containerPort: 8080
    resources: {}
```

`JAEGER_AGENT_HOST`：这是与代理通信的主机名（默认为 localhost）。

`JAEGER_AGENT_PORT`：与代理通信的端口（默认为6831）。

`JAEGER_SAMPLER_TYPE`：四种类型可用remote、const、probabilistic、ratelimiting（默认为remote）。 例如，const 类型是指对每条迹线的采样决策。

`JAEGER_SAMPLER_PARAM`：它是介于 0 到 1 之间的值（1 表示对每条迹线进行采样，0 表示不对任何迹线进行采样）。

`JAEGER_TAGS`：这是一个以逗号分隔的名称=值跟踪器级标签列表，它被添加到所有报告的跨度中。

现在我们将应用这些清单。 请注意，这需要一个正在运行的 Kubernetes 集群作为先决条件。

### 安装Prometheus和Loki

接下来，我们安装**Prometheus**、**Loki**和**Grafana**。Prometheus操作员掌舵图（[`kube-prometheus-stack`](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)）将安装Prometheus和Grafana。Loki头盔图表（[`loki-stack`](https://github.com/grafana/helm-charts/tree/main/charts/loki-stack)）将安装Loki和Promtail。我写了另一篇文章，其中更多地讨论了[Loki的日志监控](https://www.infracloud.io/blogs/grafana-loki-log-monitoring-alerting/)。

```bash
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack
helm upgrade --install loki grafana/loki-stack
```

我们需要在Grafana中添加Jaeger和Loki数据源。您可以通过手动添加它或将其包含在代码中来实现此目的。我们将通过创建自定义值文件来获得后者，如下所示。`prom-oper-values.yaml`

```yaml
grafana:
  additionalDataSources:
    - name: loki
      type: loki
      uid: my-loki
      access: proxy
      orgId: 1
      url: http://loki:3100
      basicAuth: false
      isDefault: false
      version: 1
      editable: true
    - name: jaeger
      type: jaeger
      uid: my-jaeger
      access: browser
      url: http://jaeger:16686
      isDefault: false
      version: 1
      editable: true
      basicAuth: false
```

`uid`：它是唯一的用户定义 ID。

`access`：它说明访问是代理还是直接（服务器或浏览器）。

`isDefault`：将数据源设置为默认值。

`version`：它有助于配置文件的版本控制。

`editable`：它允许从UI更新数据源。

我们现在将使用自定义值升级 kube-prometheus-stack Helm 图表。

```bash
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack --values=prom-oper-values.yaml
```

如果你去数据源，你可以看到Jaeger和loki被添加到这里。是时候查看日志消息中记录跟踪的方式了。为此，我们将转到 HOTROD UI 并从那里触发请求。

注意：在我们的配置中，我们分别给出了 Loki 和 Jaeger 数据源的名称和。`loki` `jaeger`

![hotrod_query](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303231120872.png)

注意：`Grafana` 和 `HOTROD` 服务正在使用 `ClusterIP`，我们将使用端口转发来访问 UI。

转到“浏览”，选择 `loki` 作为数据源，然后选择“日志标签”以可视化日志。可以看到 `span` 上下文包含 `JSON` 中的跟踪和跨度 ID 等信息。复制跟踪 ID。复制窗口并转到浏览，然后选择 `Jaeger` 作为数据源。粘贴跟踪 ID 并运行查询以可视化请求的所有跟踪。`{app="hotrod"}`

![visualize_trace_initial](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303231107265.png)

### 配置 Loki 派生字段

此技术在分析突发请求时无效。我们需要更高效、更易于操作的东西。为此，我们将使用Loki派生场的概念。派生字段允许我们从日志消息中添加解析的字段。我们可以添加一个包含解析字段值的 URL。让我们看看这是如何解决问题的，但首先，在 ：`prom-oper-values.yaml`

```yaml
- name: loki
  type: loki
  access: proxy
  orgId: 1
  url: http://loki:3100
  basicAuth: false
  isDefault: false
  version: 1
  editable: true
  jsonData:
    derivedFields:
    - datasourceUid: my-jaeger
      matcherRegex: ((\d+|[a-z]+)(\d+|[a-z]+)(\d+|[a-z]+)(\d+|[a-z]+)(\d+|[a-z]+)(\d+|[a-z]+)(\d+|[a-z]+)(\d+|[a-z]+)(\d+|[a-z]+)(\d+|[a-z]+)(\d+|[a-z]+))
      url: '$${__value.raw}'
      name: TraceID
```

请注意，具有积家的值。这将有助于在创建内部链接时识别数据源。 具有用于解析日志消息中的跟踪 ID 的正则表达式模式。 如果指向外部源，则包含完整链接。如果是内部链接，则此值用作目标数据源的查询。 宏将字段的值插入到内部链接中。`datasourceUid``uid``matcherRegex``URL``$${__value.raw}`

### 使用 Promtail 管道添加新的日志标签

为了便于操作，我们将再添加一个更改。如前所述，Loki 日志上没有跟踪 ID 标签。要添加特定标签，我们将使用日志消息形成标签。创建一个文件并向其中添加以下代码。`pipelineStages``loki-stack-values.yaml`

```yaml
promtail:
    serviceMonitor:
      enabled: true
      additionalLabels:
        app: prometheus-operator
        release: prometheus
  
    pipelineStages:
    - docker: {}
    - match:
        selector: '{app="hotrod"}'
        stages:
        - regex:
            expression: ".*(?P<trace>trace_id\"\\S)\\s\"(?P<traceID>[a-zA-Z\\d]+).*"
            traceID: traceID
        - labels:
            traceID:
```

这里用于声明一个管道以添加跟踪 ID 标签。可以[在此处找到有关管道参数的更多详细信息](https://grafana.com/docs/loki/latest/clients/promtail/pipelines/)。现在我们将使用更新的值升级 kube-prometheus-stack 和 loki-stack Helm 图表。`pipelineStages`

```bash
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack --values=prom-oper-values.yaml
helm upgrade --install loki grafana/loki-stack --values=loki-stack-values.yaml
```

### 如何使用Jaeger和Tempo在Grafana中可视化分布式跟踪？

我们将再次访问 `HOTROD UI` 并从那里触发请求。在 `Grafana` 仪表板中，单击“浏览”并选择 loki 作为数据源。添加日志标签。现在，您将看到一个名为 `TraceID` 的派生字段，其中包含自动生成的指向 `Jaeger` 的内部链接。您还将看到一个名为 `traceID` 的额外标签。单击派生字段 `TraceID`，它将直接将您带到 `Jaeger` 数据源并显示特定跟踪 ID 的所有跟踪。这使得在日志和跟踪之间切换变得更加容易。此外，这还明确了如何根据要求解析日志消息。`{app="hotrod"}`

![derived_fields](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303231127669.png)

接下来，我们将添加 Grafana Tempo 作为数据源，并在相同的设置下以最小的更改可视化跟踪。要启用此功能，请在 Helm 图表中添加以下行并升级 Helm 图表：`prom-oper-values.yaml`

```yaml
- name: tempo
  type: tempo
  uid: my-tempo
  access: browser
  url: http://tempo:16686
  isDefault: false
  version: 1
  editable: true
  basicAuth: false
```

例如 将 loki 配置中的数据源更改为 中的速度。Tempo 使用 Jaeger 客户端库来接收所有与跟踪相关的信息。因此，我们将删除 Jaeger 部署及其服务。要在单个二进制模式下安装 Tempo，我们将使用 Grafana 提供的标准 Helm [图表](https://github.com/grafana/helm-charts/tree/main/charts/tempo)。`uid``uid``datasourceUid: my-tempo``prom-oper-values.yaml`

```bash
helm upgrade --install tempo grafana/tempo
```

我们还需要将 HOTROD （） 中的变量更改为正确识别迹线。值不正确或缺失可能会导致以下错误：`JAEGER_AGENT_HOST``hotrod-deployment.yaml``tempo`

![tempo_error](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303231107131.png)

重新应用热棒hotrod-deployment以合并所做的更改。再次访问 HOTROD UI 并从那里触发请求。现在检查Loki中的 HOTROD 日志。您注意到派生字段中的链接更改为速度。单击它，您可以像以前一样可视化所有跟踪信息。

![tempo_derived_fields](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202303231127177.png)

## 结论

总结这篇文章，我们触及了以下几点：

- 如何在微服务应用程序中启用分布式跟踪。
- 如何将 docker-compose 清单转换为 Kubernetes 清单。
- 如何在应用程序的deployment manifest中启用 Jaeger 跟踪。
- 如何配置 Loki 派生字段。
- 如何使用 Promtail 管道概念分析日志消息以添加新标签。
- 如何使用 Jaeger 和 Tempo 数据源在 Grafana 中可视化分布式跟踪。

## 引用

- [What is Distributed Tracing?](https://opentracing.io/docs/overview/what-is-tracing/)
- [tempo-otel-example](https://github.com/joe-elliott/tracing-example)
- [A Comprehensive Tutorial to Implementing OpenTracing With Jaeger](https://medium.com/velotio-perspectives/a-comprehensive-tutorial-to-implementing-opentracing-with-jaeger-a01752e1a8ce)
- [Using Loki in Grafana](https://grafana.com/docs/grafana/latest/datasources/loki/)
- [Explore InfraCloud’s Grafana consulting capabilities](https://www.infracloud.io/grafana-consulting/)
- [Explore our Prometheus 3rd party support capabilities](https://www.infracloud.io/prometheus-monitoring-support/)
