---
title: 在 K8s 中部署主从结构的 MySQL 服务
date: 2023-02-20 09:22:04
type: categories
tags: 
    - kubernetes
    - Mysql
keywords: 
    - kubernetes
    - Mysql
categories: 
    - kubernetes
    - Mysql
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302200920475.jpeg
---


StatefulSet 旨在与有状态的应用及分布式系统一起使用。然而在 Kubernetes 上管理有状态应用和分布式系统是一个宽泛而复杂的话题。为了演示 StatefulSet 的基本特性，并且不使前后的主题混淆。本文使用 StatefulSet 控制器运行一个有状态的应用程序，主从结构的mysql8数据库。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302200920475.jpeg)

## 介绍

RC、Deployment、DaemonSet都是面向无状态的服务，它们所管理的Pod的IP、名字、启停顺序等都是随机分配的，而StatefulSet，管理所有有状态的服务。

StatefulSet为了解决有状态服务的问题，它所管理的Pod拥有固定的Pod名称，一定的启停顺序，在StatefulSet中，Pod名字称为网络标识(hostname)，还必须要用到共享存储。

在Deployment中，与之对应的服务是service，而在StatefulSet中与之对应的headless service。headless service，即无头服务，与service的区别就是它没有Cluster IP，解析它的名称时将返回该Headless Service对应的全部Pod的节点列表。

除此之外，StatefulSet在Headless Service的基础上又为StatefulSet控制的每个Pod副本创建了一个DNS域名，这个域名的格式为：

(podname).(headless server name).namespace.svc.cluster.local

## 部署mysql

MySQL 示例部署包含一个ConfigMap、两个存储挂载pv和pvc、两个 Service 与一个 StatefulSet。

### **创建一个ConfigMap**

使用以下的 YAML 配置文件创建 ConfigMap ：

```yaml
#master--my.cnf
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-master-cnf
  namespace: bc-cnp
data:
  my.cnf: |-
    [client]
    default-character-set=utf8
    [mysql]
    default-character-set=utf8
    [mysqld]
    init_connect='SET collation_connection = utf8_unicode_ci'
    init_connect='SET NAMES utf8'
    character-set-server=utf8
    collation-server=utf8_unicode_ci
    skip-character-set-client-handshake
    skip-name-resolve
    server_id=1
    log-bin=mysql-bin
    read-only=0
    replicate-ignore-db=mysql
    replicate-ignore-db=sys
    replicate-ignore-db=information_schema
    replicate-ignore-db=performance_schema
```

```bash
kubectl apply -f mysql-master-cnf.yaml
```

这个 ConfigMap 提供 my.cnf 覆盖设置，可以独立控制 MySQL 主服务器配置。ConfigMap 本身没有什么特别之处，因而也不会出现不同部分应用于不同的 Pod 的情况。每个 Pod 都会在初始化时基于 StatefulSet 控制器提供的信息决定要查看的部分。slave从服务器配置和主服务器配置基本相同，需要修改metadata.name= mysql-slave-cnf,server_id=2,read-only=0。

获取mysql-master-0和mysql-slave-0的ConfigMap ：

```bash
kubectl get cm -nbc-cnp
```

输出类似于：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302200920566.png)

### **创建pv和pvc，写入稳定存储**

使用以下 YAML 配置文件创建服务：

```yaml
---
#master--pv
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mysql-pv-master
spec:
  accessModes:
    - ReadWriteOnce
  capacity:
    storage: 10Gi
  local:
    path: /home/k8s/master/data
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - paas-cnp-k8s-kce-01  
---
#master--pvc
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc-master
  namespace: bc-cnp
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  volumeName: mysql-pv-master
```

slave采用同样的方式创建pv及pvc，只名字修改为slave即可。

获取master和slave的PersistentVolumeClaims：

```bash
kubectl get pvc -nbc-cnp
```

输出类似于：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302200920858.png)

为StatefulSet 控制器创建了两个 PersistentVolumeClaims， 绑定到两个 PersistentVolumes。

Mysql 服务器默认会加载位于 /var/lib/mysql-files 的文件。StatefulSet spec 中的 volumeMounts 字段保证了/var/lib/mysql-files 文件夹由一个 PersistentVolume 卷支持。

### **创建 Service**

使用以下 YAML 配置文件创建服务：

```yaml
#master--headless service
apiVersion: v1
kind: Service
metadata:
  namespace: bc-cnp
  labels:
    app: mysql-master
  annotations:
    kubesphere.io/serviceType: statefulservice
    kubesphere.io/alias-name: mysql主节点
  name: mysql-master
spec:
  sessionAffinity: ClientIP
  selector:
    app: mysql-master
  ports:
    - name: tcp-3306
      protocol: TCP
      port: 3306
      targetPort: 3306
    - name: tcp-33060
      protocol: TCP
      port: 33060
      targetPort: 33060
  clusterIP: None
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800

---
#master--nodePort service
apiVersion: v1
kind: Service
metadata:
  name: mysql-master-front
  labels:
    app: mysql-master
  namespace: bc-cnp
spec:
  selector:
    app: mysql-master
  type: NodePort
  ports:
    - name: ''
      port: 3306
      protocol: TCP
      targetPort: 3306
      nodePort: 30001  
  sessionAffinity: None
```

执行YAML：

```bash
kubectl apply -f mysql-master-services.yaml 
```

slave同样执行类似yaml，名字需要修改为mysql-slave相关，暴露nodeport改为：30002。

输出类似于：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302200920347.png)

headless service 的 CNAME 指向 SRV 记录（记录每个 Running 和 Ready 状态的 Pod）。SRV 记录指向一个包含 Pod IP 地址的记录表项。

headless service给 StatefulSet 控制器 为集合中每个 Pod 创建的 DNS 条目提供了一个宿主。因为无头服务名为 mysql-master，所以可以通过在同一 Kubernetes 集群和命名空间中的任何其他 Pod 内解析 `Pod 名称`.mysql-master 来访问 Pod。

mysql-master-front是一种常规 Service，具有其自己的集群 IP。该集群 IP 在报告就绪的所有 MySQL Pod 之间分配连接。可能的端点集合包括 MySQL 主节点和从节点。

请注意，只有读查询才能使用负载平衡的客户端 Service。因为只有一个 MySQL 主服务器，所以客户端应直接连接到 MySQL 主服务器 Pod （通过其在headless service 中的 DNS 条目）以执行写入操作。

### **创建 StatefulSet**

最后，使用以下 YAML 配置文件创建 StatefulSet：

```yaml
#master--statefulset
apiVersion: apps/v1
kind: StatefulSet
metadata:
  namespace: bc-cnp
  labels:
    app: mysql-master
  name: mysql-master
  annotations:
    kubesphere.io/alias-name: mysql master
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql-master
  template:
    metadata:
      labels:
        app: mysql-master
    spec:
      containers:
        - name: master-container
         # type: worker
          imagePullPolicy: IfNotPresent
          resources:
            requests:
              cpu: '2'
              memory: 8Gi
            limits:
              cpu: '4'
              memory: 16Gi
          image: nexus.cmss.com:8086/cnp/mysql:8.0.18
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: MYSQL_ROOT_PASSWORD
          volumeMounts:
            - name: master-cnf-volume
              readOnly: false
              mountPath: /etc/mysql
            - name: master-data-volume
              readOnly: false
              mountPath: /var/lib/mysql-files
      serviceAccount: default
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: mysql-master
                topologyKey: kubernetes.io/hostname
      volumes:
        - name: master-cnf-volume
          configMap:
            name: mysql-master-cnf
            items:
              - key: my.cnf
                path: my.cnf
        - name: master-data-volume
          persistentVolumeClaim:
            claimName: mysql-pvc-master
  serviceName: mysql-master
```

slave节点同样是替换yaml中名字跟slave相关，执行apply操作。

```bash
kubectl apply -f mysql-master-statefulset.yaml
```

通过运行以下命令查看启动进度：

```bash
kubectl get pods -nbc-cnp
```

可以看到所有 2 个 Pod 进入 Running 状态：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302200920175.png)

StatefulSet 中的每个 Pod 拥有一个唯一的顺序索引和稳定的网络身份标识。这个标志基于 StatefulSet 控制器分配给每个 Pod 的唯一顺序索引。Pod 名称的格式为 `<statefulset 名称>-<序号索引>`。

## 主从同步

进入mysql-master容器内部

```mysql
# 1.进入mysql内部
>  mysql -uroot -pdsjbi@Min1a
#切换到 mysql DB
mysql> USE mysql;   
# 查看root用户是否具备远程访问权限
mysql> select Host,User,authentication_string,password_expired,password_last_changed from user; 
# 2.授权 root可以远程访问（主从无关，如root没有访问权限，执行以下命令，方便我们远程连接MySQL）
mysql> create user 'root'@'%' identified by 'dsjbi@Min1a';
Query OK, 0 rows affected, 1 warning (0.00 sec)

mysql> grant all privileges on *.* to 'root'@'%';
Query OK, 0 rows affected, 1 warning (0.00 sec)

mysql> flush privileges;
Query OK, 0 rows affected (0.00 sec)
# 3.添加用来同步的用户
mysql> GRANT REPLICATION SLAVE ON *.* to 'backup'@'%' identified by 'dsjbi@Min1a';
Query OK, 0 rows affected, 1 warning (0.01 sec)
# 4.查看master状态
mysql> show master status\G;
*************************** 1. row ***************************
             File: mysql-bin.000003
         Position: 2688
     Binlog_Do_DB:
 Binlog_Ignore_DB:
Executed_Gtid_Set:
1 row in set (0.00 sec)
```

然后进入到mysql-slave内部

```mysql
# 进入mysql内部
mysql -uroot -pdsjbi@Min1a
# 设置主库连接  主库 dns: mysql-master.default.svc.cluster.local
change master to master_host='mysql-master.bc-cnp.svc.cluster.local',master_user='backup',master_password='dsjbi@Min1a',master_log_file='mysql_bin.000003',master_log_pos=0,master_port=3306;
# 启动从库同步
start slave;
# 查看从从库状态
show slave status\G;
```

只有当以下两项都是yes，才意味着同步成功。

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302200920429.png)

如果同步不成功，尝试执行以下命令，再次查看。

```mysql
stop slave;
reset slave;
start slave;
```

## 结果验证

最终验证结果，在master mysql创建一个database及table，插入数据，在slave中依然能够查看相关数据，确认主从同步成功。

进入主的mysql-master容器内部，执行创建操作，如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302200920880.png)

进入从的mysql-slave容器内部，执行创建操作，如下：

![图片](https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202302200920489.png)

至此，确认从库中已有主库中数据，同步成功。

## 总结

StatefulSet 中每个 Pod 都拥有一个基于其顺序索引的稳定的主机名，如果pod发生故障，StatefulSet 重启他们，Pod 的序号、主机名、SRV 条目和记录名称没有改变，但和 Pod 相关联的 IP 地址可能发生了改变。这就是为什么不要在其他应用中使用 StatefulSet 中 Pod 的 IP 地址进行连接，这点很重要。

StatefulSet 的活动成员是和 CNAME 相关联的 SRV 记录，其中只会包含 StatefulSet 中处于 Running 和 Ready 状态的 Pod。

如果我们的应用已经实现了用于测试是否已存活（liveness）并就绪（readiness）的连接逻辑，我们可以使用 Pod 的 SRV 记录（mysql-master.default.svc.cluster.local）。并且当里面的 Pod 的状态变为 Running 和 Ready 时，我们的应用就能够发现各个pod的地址。

虽然 mysql-master-0 和 mysql-slave-0 有时候会被重新调度，但它们仍然继续监听各自的主机名，因为和它们的 PersistentVolumeClaim 相关联的 PersistentVolume 卷被重新挂载到了各自的 volumeMount 上。不管mysql-master-0 和 mysql-slave-0 被调度到了哪个节点上，它们的 PersistentVolume 卷将会被挂载到合适的挂载点上。
