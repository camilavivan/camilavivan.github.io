---
title: 在kubernetes中部署rookCeph
date: 2023-08-15  08:54:38
type: categories
tags: 
    - Ceph
keywords: 
    - Ceph
categories: 
    - Ceph
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301101629307.png
---

## 安装CRD资源

```yaml
##############################################################################
# 在创建 Rook 集群之前创建所需的 CRD。
# 这些资源*必须*在 cluster.yaml 或其变体之前创建。
##############################################################################
---
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephblockpoolradosnamespaces.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephBlockPoolRadosNamespace
    listKind: CephBlockPoolRadosNamespaceList
    plural: cephblockpoolradosnamespaces
    singular: cephblockpoolradosnamespace
  scope: Namespaced
  versions:
    - name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                blockPoolName:
                  type: string
              required:
                - blockPoolName
              type: object
            status:
              properties:
                info:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                phase:
                  type: string
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephblockpools.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephBlockPool
    listKind: CephBlockPoolList
    plural: cephblockpools
    singular: cephblockpool
  scope: Namespaced
  versions:
    - additionalPrinterColumns:
        - jsonPath: .status.phase
          name: Phase
          type: string
      name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                compressionMode:
                  enum:
                    - none
                    - passive
                    - aggressive
                    - force
                    - ""
                  nullable: true
                  type: string
                crushRoot:
                  nullable: true
                  type: string
                deviceClass:
                  nullable: true
                  type: string
                enableRBDStats:
                  type: boolean
                erasureCoded:
                  properties:
                    algorithm:
                      type: string
                    codingChunks:
                      minimum: 0
                      type: integer
                    dataChunks:
                      minimum: 0
                      type: integer
                  required:
                    - codingChunks
                    - dataChunks
                  type: object
                failureDomain:
                  type: string
                mirroring:
                  properties:
                    enabled:
                      type: boolean
                    mode:
                      type: string
                    peers:
                      nullable: true
                      properties:
                        secretNames:
                          items:
                            type: string
                          type: array
                      type: object
                    snapshotSchedules:
                      items:
                        properties:
                          interval:
                            type: string
                          path:
                            type: string
                          startTime:
                            type: string
                        type: object
                      type: array
                  type: object
                name:
                  enum:
                    - device_health_metrics
                    - .nfs
                    - .mgr
                  type: string
                parameters:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                quotas:
                  nullable: true
                  properties:
                    maxBytes:
                      format: int64
                      type: integer
                    maxObjects:
                      format: int64
                      type: integer
                    maxSize:
                      pattern: ^[0-9]+[\.]?[0-9]*([KMGTPE]i|[kMGTPE])?$
                      type: string
                  type: object
                replicated:
                  properties:
                    hybridStorage:
                      nullable: true
                      properties:
                        primaryDeviceClass:
                          minLength: 1
                          type: string
                        secondaryDeviceClass:
                          minLength: 1
                          type: string
                      required:
                        - primaryDeviceClass
                        - secondaryDeviceClass
                      type: object
                    replicasPerFailureDomain:
                      minimum: 1
                      type: integer
                    requireSafeReplicaSize:
                      type: boolean
                    size:
                      minimum: 0
                      type: integer
                    subFailureDomain:
                      type: string
                    targetSizeRatio:
                      type: number
                  required:
                    - size
                  type: object
                statusCheck:
                  properties:
                    mirror:
                      nullable: true
                      properties:
                        disabled:
                          type: boolean
                        interval:
                          type: string
                        timeout:
                          type: string
                      type: object
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
              type: object
            status:
              properties:
                conditions:
                  items:
                    properties:
                      lastHeartbeatTime:
                        format: date-time
                        type: string
                      lastTransitionTime:
                        format: date-time
                        type: string
                      message:
                        type: string
                      reason:
                        type: string
                      status:
                        type: string
                      type:
                        type: string
                    type: object
                  type: array
                info:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                mirroringInfo:
                  properties:
                    details:
                      type: string
                    lastChanged:
                      type: string
                    lastChecked:
                      type: string
                    mode:
                      type: string
                    peers:
                      items:
                        properties:
                          client_name:
                            type: string
                          direction:
                            type: string
                          mirror_uuid:
                            type: string
                          site_name:
                            type: string
                          uuid:
                            type: string
                        type: object
                      type: array
                    site_name:
                      type: string
                  type: object
                mirroringStatus:
                  properties:
                    details:
                      type: string
                    lastChanged:
                      type: string
                    lastChecked:
                      type: string
                    summary:
                      properties:
                        daemon_health:
                          type: string
                        health:
                          type: string
                        image_health:
                          type: string
                        states:
                          nullable: true
                          properties:
                            error:
                              type: integer
                            replaying:
                              type: integer
                            starting_replay:
                              type: integer
                            stopped:
                              type: integer
                            stopping_replay:
                              type: integer
                            syncing:
                              type: integer
                            unknown:
                              type: integer
                          type: object
                      type: object
                  type: object
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
                snapshotScheduleStatus:
                  properties:
                    details:
                      type: string
                    lastChanged:
                      type: string
                    lastChecked:
                      type: string
                    snapshotSchedules:
                      items:
                        properties:
                          image:
                            type: string
                          items:
                            items:
                              properties:
                                interval:
                                  type: string
                                start_time:
                                  type: string
                              type: object
                            type: array
                          namespace:
                            type: string
                          pool:
                            type: string
                        type: object
                      nullable: true
                      type: array
                  type: object
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephbucketnotifications.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephBucketNotification
    listKind: CephBucketNotificationList
    plural: cephbucketnotifications
    singular: cephbucketnotification
  scope: Namespaced
  versions:
    - name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                events:
                  items:
                    enum:
                      - s3:ObjectCreated:*
                      - s3:ObjectCreated:Put
                      - s3:ObjectCreated:Post
                      - s3:ObjectCreated:Copy
                      - s3:ObjectCreated:CompleteMultipartUpload
                      - s3:ObjectRemoved:*
                      - s3:ObjectRemoved:Delete
                      - s3:ObjectRemoved:DeleteMarkerCreated
                    type: string
                  type: array
                filter:
                  properties:
                    keyFilters:
                      items:
                        properties:
                          name:
                            enum:
                              - prefix
                              - suffix
                              - regex
                            type: string
                          value:
                            type: string
                        required:
                          - name
                          - value
                        type: object
                      type: array
                    metadataFilters:
                      items:
                        properties:
                          name:
                            minLength: 1
                            type: string
                          value:
                            type: string
                        required:
                          - name
                          - value
                        type: object
                      type: array
                    tagFilters:
                      items:
                        properties:
                          name:
                            minLength: 1
                            type: string
                          value:
                            type: string
                        required:
                          - name
                          - value
                        type: object
                      type: array
                  type: object
                topic:
                  minLength: 1
                  type: string
              required:
                - topic
              type: object
            status:
              properties:
                conditions:
                  items:
                    properties:
                      lastHeartbeatTime:
                        format: date-time
                        type: string
                      lastTransitionTime:
                        format: date-time
                        type: string
                      message:
                        type: string
                      reason:
                        type: string
                      status:
                        type: string
                      type:
                        type: string
                    type: object
                  type: array
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephbuckettopics.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephBucketTopic
    listKind: CephBucketTopicList
    plural: cephbuckettopics
    singular: cephbuckettopic
  scope: Namespaced
  versions:
    - additionalPrinterColumns:
        - jsonPath: .status.phase
          name: Phase
          type: string
      name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                endpoint:
                  properties:
                    amqp:
                      properties:
                        ackLevel:
                          default: broker
                          enum:
                            - none
                            - broker
                            - routeable
                          type: string
                        disableVerifySSL:
                          type: boolean
                        exchange:
                          minLength: 1
                          type: string
                        uri:
                          minLength: 1
                          type: string
                      required:
                        - exchange
                        - uri
                      type: object
                    http:
                      properties:
                        disableVerifySSL:
                          type: boolean
                        sendCloudEvents:
                          type: boolean
                        uri:
                          minLength: 1
                          type: string
                      required:
                        - uri
                      type: object
                    kafka:
                      properties:
                        ackLevel:
                          default: broker
                          enum:
                            - none
                            - broker
                          type: string
                        disableVerifySSL:
                          type: boolean
                        uri:
                          minLength: 1
                          type: string
                        useSSL:
                          type: boolean
                      required:
                        - uri
                      type: object
                  type: object
                objectStoreName:
                  minLength: 1
                  type: string
                objectStoreNamespace:
                  minLength: 1
                  type: string
                opaqueData:
                  type: string
                persistent:
                  type: boolean
              required:
                - endpoint
                - objectStoreName
                - objectStoreNamespace
              type: object
            status:
              properties:
                ARN:
                  nullable: true
                  type: string
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephclients.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephClient
    listKind: CephClientList
    plural: cephclients
    singular: cephclient
  scope: Namespaced
  versions:
    - additionalPrinterColumns:
        - jsonPath: .status.phase
          name: Phase
          type: string
      name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                caps:
                  additionalProperties:
                    type: string
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                name:
                  type: string
              required:
                - caps
              type: object
            status:
              properties:
                info:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephclusters.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephCluster
    listKind: CephClusterList
    plural: cephclusters
    singular: cephcluster
  scope: Namespaced
  versions:
    - additionalPrinterColumns:
          jsonPath: .spec.dataDirHostPath
          name: DataDirHostPath
          type: string
          jsonPath: .spec.mon.count
          name: MonCount
          type: string
        - jsonPath: .metadata.creationTimestamp
          name: Age
          type: date
        - jsonPath: .status.phase
          name: Phase
          type: string
          jsonPath: .status.message
          name: Message
          type: string
          jsonPath: .status.ceph.health
          name: Health
          type: string
        - jsonPath: .spec.external.enable
          name: External
          type: boolean
          jsonPath: .status.ceph.fsid
          name: FSID
          type: string
      name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                annotations:
                  additionalProperties:
                    additionalProperties:
                      type: string
                    type: object
                  nullable: true
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                cephVersion:
                  nullable: true
                  properties:
                    allowUnsupported:
                      type: boolean
                    image:
                      type: string
                    imagePullPolicy:
                      enum:
                        - IfNotPresent
                        - Always
                        - Never
                        - ""
                      type: string
                  type: object
                cleanupPolicy:
                  nullable: true
                  properties:
                    allowUninstallWithVolumes:
                      type: boolean
                    confirmation:
                      nullable: true
                      pattern: ^$|^yes-really-destroy-data$
                      type: string
                    sanitizeDisks:
                      nullable: true
                      properties:
                        dataSource:
                          enum:
                            - zero
                            - random
                          type: string
                        iteration:
                          format: int32
                          type: integer
                        method:
                          enum:
                            - complete
                            - quick
                          type: string
                      type: object
                  type: object
                continueUpgradeAfterChecksEvenIfNotHealthy:
                  type: boolean
                crashCollector:
                  nullable: true
                  properties:
                    daysToRetain:
                      type: integer
                    disable:
                      type: boolean
                  type: object
                dashboard:
                  nullable: true
                  properties:
                    enabled:
                      type: boolean
                    port:
                      maximum: 65535
                      minimum: 0
                      type: integer
                    ssl:
                      type: boolean
                    urlPrefix:
                      type: string
                  type: object
                dataDirHostPath:
                  pattern: ^/(\S+)
                  type: string
                disruptionManagement:
                  nullable: true
                  properties:
                    machineDisruptionBudgetNamespace:
                      type: string
                    manageMachineDisruptionBudgets:
                      type: boolean
                    managePodBudgets:
                      type: boolean
                    osdMaintenanceTimeout:
                      format: int64
                      type: integer
                    pgHealthCheckTimeout:
                      format: int64
                      type: integer
                  type: object
                external:
                  nullable: true
                  properties:
                    enable:
                      type: boolean
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                healthCheck:
                  nullable: true
                  properties:
                    daemonHealth:
                      nullable: true
                      properties:
                        mon:
                          nullable: true
                          properties:
                            disabled:
                              type: boolean
                            interval:
                              type: string
                            timeout:
                              type: string
                          type: object
                        osd:
                          nullable: true
                          properties:
                            disabled:
                              type: boolean
                            interval:
                              type: string
                            timeout:
                              type: string
                          type: object
                        status:
                          nullable: true
                          properties:
                            disabled:
                              type: boolean
                            interval:
                              type: string
                            timeout:
                              type: string
                          type: object
                      type: object
                    livenessProbe:
                      additionalProperties:
                        properties:
                          disabled:
                            type: boolean
                          probe:
                            properties:
                              exec:
                                properties:
                                  command:
                                    items:
                                      type: string
                                    type: array
                                type: object
                              failureThreshold:
                                format: int32
                                type: integer
                              grpc:
                                properties:
                                  port:
                                    format: int32
                                    type: integer
                                  service:
                                    type: string
                                required:
                                  - port
                                type: object
                              httpGet:
                                properties:
                                  host:
                                    type: string
                                  httpHeaders:
                                    items:
                                      properties:
                                        name:
                                          type: string
                                        value:
                                          type: string
                                      required:
                                        - name
                                        - value
                                      type: object
                                    type: array
                                  path:
                                    type: string
                                  port:
                                    anyOf:
                                      - type: integer
                                      - type: string
                                    x-kubernetes-int-or-string: true
                                  scheme:
                                    type: string
                                required:
                                  - port
                                type: object
                              initialDelaySeconds:
                                format: int32
                                type: integer
                              periodSeconds:
                                format: int32
                                type: integer
                              successThreshold:
                                format: int32
                                type: integer
                              tcpSocket:
                                properties:
                                  host:
                                    type: string
                                  port:
                                    anyOf:
                                      - type: integer
                                      - type: string
                                    x-kubernetes-int-or-string: true
                                required:
                                  - port
                                type: object
                              terminationGracePeriodSeconds:
                                format: int64
                                type: integer
                              timeoutSeconds:
                                format: int32
                                type: integer
                            type: object
                        type: object
                      type: object
                    startupProbe:
                      additionalProperties:
                        properties:
                          disabled:
                            type: boolean
                          probe:
                            properties:
                              exec:
                                properties:
                                  command:
                                    items:
                                      type: string
                                    type: array
                                type: object
                              failureThreshold:
                                format: int32
                                type: integer
                              grpc:
                                properties:
                                  port:
                                    format: int32
                                    type: integer
                                  service:
                                    type: string
                                required:
                                  - port
                                type: object
                              httpGet:
                                properties:
                                  host:
                                    type: string
                                  httpHeaders:
                                    items:
                                      properties:
                                        name:
                                          type: string
                                        value:
                                          type: string
                                      required:
                                        - name
                                        - value
                                      type: object
                                    type: array
                                  path:
                                    type: string
                                  port:
                                    anyOf:
                                      - type: integer
                                      - type: string
                                    x-kubernetes-int-or-string: true
                                  scheme:
                                    type: string
                                required:
                                  - port
                                type: object
                              initialDelaySeconds:
                                format: int32
                                type: integer
                              periodSeconds:
                                format: int32
                                type: integer
                              successThreshold:
                                format: int32
                                type: integer
                              tcpSocket:
                                properties:
                                  host:
                                    type: string
                                  port:
                                    anyOf:
                                      - type: integer
                                      - type: string
                                    x-kubernetes-int-or-string: true
                                required:
                                  - port
                                type: object
                              terminationGracePeriodSeconds:
                                format: int64
                                type: integer
                              timeoutSeconds:
                                format: int32
                                type: integer
                            type: object
                        type: object
                      type: object
                  type: object
                labels:
                  additionalProperties:
                    additionalProperties:
                      type: string
                    type: object
                  nullable: true
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                logCollector:
                  nullable: true
                  properties:
                    enabled:
                      type: boolean
                    maxLogSize:
                      anyOf:
                        - type: integer
                        - type: string
                      pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                      x-kubernetes-int-or-string: true
                    periodicity:
                      pattern: ^$|^(hourly|daily|weekly|monthly|1h|24h|1d)$
                      type: string
                  type: object
                mgr:
                  nullable: true
                  properties:
                    allowMultiplePerNode:
                      type: boolean
                    count:
                      maximum: 2
                      minimum: 0
                      type: integer
                    modules:
                      items:
                        properties:
                          enabled:
                            type: boolean
                          name:
                            type: string
                        type: object
                      nullable: true
                      type: array
                  type: object
                mon:
                  nullable: true
                  properties:
                    allowMultiplePerNode:
                      type: boolean
                    count:
                      maximum: 9
                      minimum: 0
                      type: integer
                    stretchCluster:
                      properties:
                        failureDomainLabel:
                          type: string
                        subFailureDomain:
                          type: string
                        zones:
                          items:
                            properties:
                              arbiter:
                                type: boolean
                              name:
                                type: string
                              volumeClaimTemplate:
                                properties:
                                  apiVersion:
                                    type: string
                                  kind:
                                    type: string
                                  metadata:
                                    properties:
                                      annotations:
                                        additionalProperties:
                                          type: string
                                        type: object
                                      finalizers:
                                        items:
                                          type: string
                                        type: array
                                      labels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                      name:
                                        type: string
                                      namespace:
                                        type: string
                                    type: object
                                  spec:
                                    properties:
                                      accessModes:
                                        items:
                                          type: string
                                        type: array
                                      dataSource:
                                        properties:
                                          apiGroup:
                                            type: string
                                          kind:
                                            type: string
                                          name:
                                            type: string
                                        required:
                                          - kind
                                          - name
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      dataSourceRef:
                                        properties:
                                          apiGroup:
                                            type: string
                                          kind:
                                            type: string
                                          name:
                                            type: string
                                          namespace:
                                            type: string
                                        required:
                                          - kind
                                          - name
                                        type: object
                                      resources:
                                        properties:
                                          claims:
                                            items:
                                              properties:
                                                name:
                                                  type: string
                                              required:
                                                - name
                                              type: object
                                            type: array
                                            x-kubernetes-list-map-keys:
                                              - name
                                            x-kubernetes-list-type: map
                                          limits:
                                            additionalProperties:
                                              anyOf:
                                                - type: integer
                                                - type: string
                                              pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                              x-kubernetes-int-or-string: true
                                            type: object
                                          requests:
                                            additionalProperties:
                                              anyOf:
                                                - type: integer
                                                - type: string
                                              pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                              x-kubernetes-int-or-string: true
                                            type: object
                                        type: object
                                      selector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      storageClassName:
                                        type: string
                                      volumeMode:
                                        type: string
                                      volumeName:
                                        type: string
                                    type: object
                                  status:
                                    properties:
                                      accessModes:
                                        items:
                                          type: string
                                        type: array
                                      allocatedResources:
                                        additionalProperties:
                                          anyOf:
                                            - type: integer
                                            - type: string
                                          pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                          x-kubernetes-int-or-string: true
                                        type: object
                                      capacity:
                                        additionalProperties:
                                          anyOf:
                                            - type: integer
                                            - type: string
                                          pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                          x-kubernetes-int-or-string: true
                                        type: object
                                      conditions:
                                        items:
                                          properties:
                                            lastProbeTime:
                                              format: date-time
                                              type: string
                                            lastTransitionTime:
                                              format: date-time
                                              type: string
                                            message:
                                              type: string
                                            reason:
                                              type: string
                                            status:
                                              type: string
                                            type:
                                              type: string
                                          required:
                                            - status
                                            - type
                                          type: object
                                        type: array
                                      phase:
                                        type: string
                                      resizeStatus:
                                        type: string
                                    type: object
                                type: object
                                x-kubernetes-preserve-unknown-fields: true
                            type: object
                          nullable: true
                          type: array
                      type: object
                    volumeClaimTemplate:
                      properties:
                        apiVersion:
                          type: string
                        kind:
                          type: string
                        metadata:
                          properties:
                            annotations:
                              additionalProperties:
                                type: string
                              type: object
                            finalizers:
                              items:
                                type: string
                              type: array
                            labels:
                              additionalProperties:
                                type: string
                              type: object
                            name:
                              type: string
                            namespace:
                              type: string
                          type: object
                        spec:
                          properties:
                            accessModes:
                              items:
                                type: string
                              type: array
                            dataSource:
                              properties:
                                apiGroup:
                                  type: string
                                kind:
                                  type: string
                                name:
                                  type: string
                              required:
                                - kind
                                - name
                              type: object
                              x-kubernetes-map-type: atomic
                            dataSourceRef:
                              properties:
                                apiGroup:
                                  type: string
                                kind:
                                  type: string
                                name:
                                  type: string
                                namespace:
                                  type: string
                              required:
                                - kind
                                - name
                              type: object
                            resources:
                              properties:
                                claims:
                                  items:
                                    properties:
                                      name:
                                        type: string
                                    required:
                                      - name
                                    type: object
                                  type: array
                                  x-kubernetes-list-map-keys:
                                    - name
                                  x-kubernetes-list-type: map
                                limits:
                                  additionalProperties:
                                    anyOf:
                                      - type: integer
                                      - type: string
                                    pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                    x-kubernetes-int-or-string: true
                                  type: object
                                requests:
                                  additionalProperties:
                                    anyOf:
                                      - type: integer
                                      - type: string
                                    pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                    x-kubernetes-int-or-string: true
                                  type: object
                              type: object
                            selector:
                              properties:
                                matchExpressions:
                                  items:
                                    properties:
                                      key:
                                        type: string
                                      operator:
                                        type: string
                                      values:
                                        items:
                                          type: string
                                        type: array
                                    required:
                                      - key
                                      - operator
                                    type: object
                                  type: array
                                matchLabels:
                                  additionalProperties:
                                    type: string
                                  type: object
                              type: object
                              x-kubernetes-map-type: atomic
                            storageClassName:
                              type: string
                            volumeMode:
                              type: string
                            volumeName:
                              type: string
                          type: object
                        status:
                          properties:
                            accessModes:
                              items:
                                type: string
                              type: array
                            allocatedResources:
                              additionalProperties:
                                anyOf:
                                  - type: integer
                                  - type: string
                                pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                x-kubernetes-int-or-string: true
                              type: object
                            capacity:
                              additionalProperties:
                                anyOf:
                                  - type: integer
                                  - type: string
                                pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                x-kubernetes-int-or-string: true
                              type: object
                            conditions:
                              items:
                                properties:
                                  lastProbeTime:
                                    format: date-time
                                    type: string
                                  lastTransitionTime:
                                    format: date-time
                                    type: string
                                  message:
                                    type: string
                                  reason:
                                    type: string
                                  status:
                                    type: string
                                  type:
                                    type: string
                                required:
                                  - status
                                  - type
                                type: object
                              type: array
                            phase:
                              type: string
                            resizeStatus:
                              type: string
                          type: object
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                  type: object
                monitoring:
                  nullable: true
                  properties:
                    enabled:
                      type: boolean
                    externalMgrEndpoints:
                      items:
                        properties:
                          hostname:
                            type: string
                          ip:
                            type: string
                          nodeName:
                            type: string
                          targetRef:
                            properties:
                              apiVersion:
                                type: string
                              fieldPath:
                                type: string
                              kind:
                                type: string
                              name:
                                type: string
                              namespace:
                                type: string
                              resourceVersion:
                                type: string
                              uid:
                                type: string
                            type: object
                            x-kubernetes-map-type: atomic
                        required:
                          - ip
                        type: object
                        x-kubernetes-map-type: atomic
                      nullable: true
                      type: array
                    externalMgrPrometheusPort:
                      maximum: 65535
                      minimum: 0
                      type: integer
                    interval:
                      type: string
                    metricsDisabled:
                      type: boolean
                    port:
                      maximum: 65535
                      minimum: 0
                      type: integer
                  type: object
                network:
                  nullable: true
                  properties:
                    connections:
                      nullable: true
                      properties:
                        compression:
                          nullable: true
                          properties:
                            enabled:
                              type: boolean
                          type: object
                        encryption:
                          nullable: true
                          properties:
                            enabled:
                              type: boolean
                          type: object
                        requireMsgr2:
                          type: boolean
                      type: object
                    dualStack:
                      type: boolean
                    hostNetwork:
                      type: boolean
                    ipFamily:
                      enum:
                        - IPv4
                        - IPv6
                      nullable: true
                      type: string
                    multiClusterService:
                      properties:
                        clusterID:
                          type: string
                        enabled:
                          type: boolean
                      type: object
                    provider:
                      nullable: true
                      type: string
                    selectors:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                placement:
                  additionalProperties:
                    properties:
                      nodeAffinity:
                        properties:
                          preferredDuringSchedulingIgnoredDuringExecution:
                            items:
                              properties:
                                preference:
                                  properties:
                                    matchExpressions:
                                      items:
                                        properties:
                                          key:
                                            type: string
                                          operator:
                                            type: string
                                          values:
                                            items:
                                              type: string
                                            type: array
                                        required:
                                          - key
                                          - operator
                                        type: object
                                      type: array
                                    matchFields:
                                      items:
                                        properties:
                                          key:
                                            type: string
                                          operator:
                                            type: string
                                          values:
                                            items:
                                              type: string
                                            type: array
                                        required:
                                          - key
                                          - operator
                                        type: object
                                      type: array
                                  type: object
                                  x-kubernetes-map-type: atomic
                                weight:
                                  format: int32
                                  type: integer
                              required:
                                - preference
                                - weight
                              type: object
                            type: array
                          requiredDuringSchedulingIgnoredDuringExecution:
                            properties:
                              nodeSelectorTerms:
                                items:
                                  properties:
                                    matchExpressions:
                                      items:
                                        properties:
                                          key:
                                            type: string
                                          operator:
                                            type: string
                                          values:
                                            items:
                                              type: string
                                            type: array
                                        required:
                                          - key
                                          - operator
                                        type: object
                                      type: array
                                    matchFields:
                                      items:
                                        properties:
                                          key:
                                            type: string
                                          operator:
                                            type: string
                                          values:
                                            items:
                                              type: string
                                            type: array
                                        required:
                                          - key
                                          - operator
                                        type: object
                                      type: array
                                  type: object
                                  x-kubernetes-map-type: atomic
                                type: array
                            required:
                              - nodeSelectorTerms
                            type: object
                            x-kubernetes-map-type: atomic
                        type: object
                      podAffinity:
                        properties:
                          preferredDuringSchedulingIgnoredDuringExecution:
                            items:
                              properties:
                                podAffinityTerm:
                                  properties:
                                    labelSelector:
                                      properties:
                                        matchExpressions:
                                          items:
                                            properties:
                                              key:
                                                type: string
                                              operator:
                                                type: string
                                              values:
                                                items:
                                                  type: string
                                                type: array
                                            required:
                                              - key
                                              - operator
                                            type: object
                                          type: array
                                        matchLabels:
                                          additionalProperties:
                                            type: string
                                          type: object
                                      type: object
                                      x-kubernetes-map-type: atomic
                                    namespaceSelector:
                                      properties:
                                        matchExpressions:
                                          items:
                                            properties:
                                              key:
                                                type: string
                                              operator:
                                                type: string
                                              values:
                                                items:
                                                  type: string
                                                type: array
                                            required:
                                              - key
                                              - operator
                                            type: object
                                          type: array
                                        matchLabels:
                                          additionalProperties:
                                            type: string
                                          type: object
                                      type: object
                                      x-kubernetes-map-type: atomic
                                    namespaces:
                                      items:
                                        type: string
                                      type: array
                                    topologyKey:
                                      type: string
                                  required:
                                    - topologyKey
                                  type: object
                                weight:
                                  format: int32
                                  type: integer
                              required:
                                - podAffinityTerm
                                - weight
                              type: object
                            type: array
                          requiredDuringSchedulingIgnoredDuringExecution:
                            items:
                              properties:
                                labelSelector:
                                  properties:
                                    matchExpressions:
                                      items:
                                        properties:
                                          key:
                                            type: string
                                          operator:
                                            type: string
                                          values:
                                            items:
                                              type: string
                                            type: array
                                        required:
                                          - key
                                          - operator
                                        type: object
                                      type: array
                                    matchLabels:
                                      additionalProperties:
                                        type: string
                                      type: object
                                  type: object
                                  x-kubernetes-map-type: atomic
                                namespaceSelector:
                                  properties:
                                    matchExpressions:
                                      items:
                                        properties:
                                          key:
                                            type: string
                                          operator:
                                            type: string
                                          values:
                                            items:
                                              type: string
                                            type: array
                                        required:
                                          - key
                                          - operator
                                        type: object
                                      type: array
                                    matchLabels:
                                      additionalProperties:
                                        type: string
                                      type: object
                                  type: object
                                  x-kubernetes-map-type: atomic
                                namespaces:
                                  items:
                                    type: string
                                  type: array
                                topologyKey:
                                  type: string
                              required:
                                - topologyKey
                              type: object
                            type: array
                        type: object
                      podAntiAffinity:
                        properties:
                          preferredDuringSchedulingIgnoredDuringExecution:
                            items:
                              properties:
                                podAffinityTerm:
                                  properties:
                                    labelSelector:
                                      properties:
                                        matchExpressions:
                                          items:
                                            properties:
                                              key:
                                                type: string
                                              operator:
                                                type: string
                                              values:
                                                items:
                                                  type: string
                                                type: array
                                            required:
                                              - key
                                              - operator
                                            type: object
                                          type: array
                                        matchLabels:
                                          additionalProperties:
                                            type: string
                                          type: object
                                      type: object
                                      x-kubernetes-map-type: atomic
                                    namespaceSelector:
                                      properties:
                                        matchExpressions:
                                          items:
                                            properties:
                                              key:
                                                type: string
                                              operator:
                                                type: string
                                              values:
                                                items:
                                                  type: string
                                                type: array
                                            required:
                                              - key
                                              - operator
                                            type: object
                                          type: array
                                        matchLabels:
                                          additionalProperties:
                                            type: string
                                          type: object
                                      type: object
                                      x-kubernetes-map-type: atomic
                                    namespaces:
                                      items:
                                        type: string
                                      type: array
                                    topologyKey:
                                      type: string
                                  required:
                                    - topologyKey
                                  type: object
                                weight:
                                  format: int32
                                  type: integer
                              required:
                                - podAffinityTerm
                                - weight
                              type: object
                            type: array
                          requiredDuringSchedulingIgnoredDuringExecution:
                            items:
                              properties:
                                labelSelector:
                                  properties:
                                    matchExpressions:
                                      items:
                                        properties:
                                          key:
                                            type: string
                                          operator:
                                            type: string
                                          values:
                                            items:
                                              type: string
                                            type: array
                                        required:
                                          - key
                                          - operator
                                        type: object
                                      type: array
                                    matchLabels:
                                      additionalProperties:
                                        type: string
                                      type: object
                                  type: object
                                  x-kubernetes-map-type: atomic
                                namespaceSelector:
                                  properties:
                                    matchExpressions:
                                      items:
                                        properties:
                                          key:
                                            type: string
                                          operator:
                                            type: string
                                          values:
                                            items:
                                              type: string
                                            type: array
                                        required:
                                          - key
                                          - operator
                                        type: object
                                      type: array
                                    matchLabels:
                                      additionalProperties:
                                        type: string
                                      type: object
                                  type: object
                                  x-kubernetes-map-type: atomic
                                namespaces:
                                  items:
                                    type: string
                                  type: array
                                topologyKey:
                                  type: string
                              required:
                                - topologyKey
                              type: object
                            type: array
                        type: object
                      tolerations:
                        items:
                          properties:
                            effect:
                              type: string
                            key:
                              type: string
                            operator:
                              type: string
                            tolerationSeconds:
                              format: int64
                              type: integer
                            value:
                              type: string
                          type: object
                        type: array
                      topologySpreadConstraints:
                        items:
                          properties:
                            labelSelector:
                              properties:
                                matchExpressions:
                                  items:
                                    properties:
                                      key:
                                        type: string
                                      operator:
                                        type: string
                                      values:
                                        items:
                                          type: string
                                        type: array
                                    required:
                                      - key
                                      - operator
                                    type: object
                                  type: array
                                matchLabels:
                                  additionalProperties:
                                    type: string
                                  type: object
                              type: object
                              x-kubernetes-map-type: atomic
                            matchLabelKeys:
                              items:
                                type: string
                              type: array
                              x-kubernetes-list-type: atomic
                            maxSkew:
                              format: int32
                              type: integer
                            minDomains:
                              format: int32
                              type: integer
                            nodeAffinityPolicy:
                              type: string
                            nodeTaintsPolicy:
                              type: string
                            topologyKey:
                              type: string
                            whenUnsatisfiable:
                              type: string
                          required:
                            - maxSkew
                            - topologyKey
                            - whenUnsatisfiable
                          type: object
                        type: array
                    type: object
                  nullable: true
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                priorityClassNames:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                removeOSDsIfOutAndSafeToRemove:
                  type: boolean
                resources:
                  additionalProperties:
                    properties:
                      claims:
                        items:
                          properties:
                            name:
                              type: string
                          required:
                            - name
                          type: object
                        type: array
                        x-kubernetes-list-map-keys:
                          - name
                        x-kubernetes-list-type: map
                      limits:
                        additionalProperties:
                          anyOf:
                            - type: integer
                            - type: string
                          pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                          x-kubernetes-int-or-string: true
                        type: object
                      requests:
                        additionalProperties:
                          anyOf:
                            - type: integer
                            - type: string
                          pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                          x-kubernetes-int-or-string: true
                        type: object
                    type: object
                  nullable: true
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                security:
                  nullable: true
                  properties:
                    keyRotation:
                      nullable: true
                      properties:
                        enabled:
                          default: false
                          type: boolean
                        schedule:
                          type: string
                      type: object
                    kms:
                      nullable: true
                      properties:
                        connectionDetails:
                          additionalProperties:
                            type: string
                          nullable: true
                          type: object
                          x-kubernetes-preserve-unknown-fields: true
                        tokenSecretName:
                          type: string
                      type: object
                  type: object
                skipUpgradeChecks:
                  type: boolean
                storage:
                  nullable: true
                  properties:
                    config:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    deviceFilter:
                      type: string
                    devicePathFilter:
                      type: string
                    devices:
                      items:
                        properties:
                          config:
                            additionalProperties:
                              type: string
                            nullable: true
                            type: object
                            x-kubernetes-preserve-unknown-fields: true
                          fullpath:
                            type: string
                          name:
                            type: string
                        type: object
                      nullable: true
                      type: array
                      x-kubernetes-preserve-unknown-fields: true
                    nodes:
                      items:
                        properties:
                          config:
                            additionalProperties:
                              type: string
                            nullable: true
                            type: object
                            x-kubernetes-preserve-unknown-fields: true
                          deviceFilter:
                            type: string
                          devicePathFilter:
                            type: string
                          devices:
                            items:
                              properties:
                                config:
                                  additionalProperties:
                                    type: string
                                  nullable: true
                                  type: object
                                  x-kubernetes-preserve-unknown-fields: true
                                fullpath:
                                  type: string
                                name:
                                  type: string
                              type: object
                            nullable: true
                            type: array
                            x-kubernetes-preserve-unknown-fields: true
                          name:
                            type: string
                          resources:
                            nullable: true
                            properties:
                              claims:
                                items:
                                  properties:
                                    name:
                                      type: string
                                  required:
                                    - name
                                  type: object
                                type: array
                                x-kubernetes-list-map-keys:
                                  - name
                                x-kubernetes-list-type: map
                              limits:
                                additionalProperties:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                  x-kubernetes-int-or-string: true
                                type: object
                              requests:
                                additionalProperties:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                  x-kubernetes-int-or-string: true
                                type: object
                            type: object
                            x-kubernetes-preserve-unknown-fields: true
                          useAllDevices:
                            type: boolean
                          volumeClaimTemplates:
                            items:
                              properties:
                                apiVersion:
                                  type: string
                                kind:
                                  type: string
                                metadata:
                                  properties:
                                    annotations:
                                      additionalProperties:
                                        type: string
                                      type: object
                                    finalizers:
                                      items:
                                        type: string
                                      type: array
                                    labels:
                                      additionalProperties:
                                        type: string
                                      type: object
                                    name:
                                      type: string
                                    namespace:
                                      type: string
                                  type: object
                                spec:
                                  properties:
                                    accessModes:
                                      items:
                                        type: string
                                      type: array
                                    dataSource:
                                      properties:
                                        apiGroup:
                                          type: string
                                        kind:
                                          type: string
                                        name:
                                          type: string
                                      required:
                                        - kind
                                        - name
                                      type: object
                                      x-kubernetes-map-type: atomic
                                    dataSourceRef:
                                      properties:
                                        apiGroup:
                                          type: string
                                        kind:
                                          type: string
                                        name:
                                          type: string
                                        namespace:
                                          type: string
                                      required:
                                        - kind
                                        - name
                                      type: object
                                    resources:
                                      properties:
                                        claims:
                                          items:
                                            properties:
                                              name:
                                                type: string
                                            required:
                                              - name
                                            type: object
                                          type: array
                                          x-kubernetes-list-map-keys:
                                            - name
                                          x-kubernetes-list-type: map
                                        limits:
                                          additionalProperties:
                                            anyOf:
                                              - type: integer
                                              - type: string
                                            pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                            x-kubernetes-int-or-string: true
                                          type: object
                                        requests:
                                          additionalProperties:
                                            anyOf:
                                              - type: integer
                                              - type: string
                                            pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                            x-kubernetes-int-or-string: true
                                          type: object
                                      type: object
                                    selector:
                                      properties:
                                        matchExpressions:
                                          items:
                                            properties:
                                              key:
                                                type: string
                                              operator:
                                                type: string
                                              values:
                                                items:
                                                  type: string
                                                type: array
                                            required:
                                              - key
                                              - operator
                                            type: object
                                          type: array
                                        matchLabels:
                                          additionalProperties:
                                            type: string
                                          type: object
                                      type: object
                                      x-kubernetes-map-type: atomic
                                    storageClassName:
                                      type: string
                                    volumeMode:
                                      type: string
                                    volumeName:
                                      type: string
                                  type: object
                                status:
                                  properties:
                                    accessModes:
                                      items:
                                        type: string
                                      type: array
                                    allocatedResources:
                                      additionalProperties:
                                        anyOf:
                                          - type: integer
                                          - type: string
                                        pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                        x-kubernetes-int-or-string: true
                                      type: object
                                    capacity:
                                      additionalProperties:
                                        anyOf:
                                          - type: integer
                                          - type: string
                                        pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                        x-kubernetes-int-or-string: true
                                      type: object
                                    conditions:
                                      items:
                                        properties:
                                          lastProbeTime:
                                            format: date-time
                                            type: string
                                          lastTransitionTime:
                                            format: date-time
                                            type: string
                                          message:
                                            type: string
                                          reason:
                                            type: string
                                          status:
                                            type: string
                                          type:
                                            type: string
                                        required:
                                          - status
                                          - type
                                        type: object
                                      type: array
                                    phase:
                                      type: string
                                    resizeStatus:
                                      type: string
                                  type: object
                              type: object
                            type: array
                        type: object
                      nullable: true
                      type: array
                    onlyApplyOSDPlacement:
                      type: boolean
                    storageClassDeviceSets:
                      items:
                        properties:
                          config:
                            additionalProperties:
                              type: string
                            nullable: true
                            type: object
                            x-kubernetes-preserve-unknown-fields: true
                          count:
                            minimum: 1
                            type: integer
                          encrypted:
                            type: boolean
                          name:
                            type: string
                          placement:
                            nullable: true
                            properties:
                              nodeAffinity:
                                properties:
                                  preferredDuringSchedulingIgnoredDuringExecution:
                                    items:
                                      properties:
                                        preference:
                                          properties:
                                            matchExpressions:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                            matchFields:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                          type: object
                                          x-kubernetes-map-type: atomic
                                        weight:
                                          format: int32
                                          type: integer
                                      required:
                                        - preference
                                        - weight
                                      type: object
                                    type: array
                                  requiredDuringSchedulingIgnoredDuringExecution:
                                    properties:
                                      nodeSelectorTerms:
                                        items:
                                          properties:
                                            matchExpressions:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                            matchFields:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                          type: object
                                          x-kubernetes-map-type: atomic
                                        type: array
                                    required:
                                      - nodeSelectorTerms
                                    type: object
                                    x-kubernetes-map-type: atomic
                                type: object
                              podAffinity:
                                properties:
                                  preferredDuringSchedulingIgnoredDuringExecution:
                                    items:
                                      properties:
                                        podAffinityTerm:
                                          properties:
                                            labelSelector:
                                              properties:
                                                matchExpressions:
                                                  items:
                                                    properties:
                                                      key:
                                                        type: string
                                                      operator:
                                                        type: string
                                                      values:
                                                        items:
                                                          type: string
                                                        type: array
                                                    required:
                                                      - key
                                                      - operator
                                                    type: object
                                                  type: array
                                                matchLabels:
                                                  additionalProperties:
                                                    type: string
                                                  type: object
                                              type: object
                                              x-kubernetes-map-type: atomic
                                            namespaceSelector:
                                              properties:
                                                matchExpressions:
                                                  items:
                                                    properties:
                                                      key:
                                                        type: string
                                                      operator:
                                                        type: string
                                                      values:
                                                        items:
                                                          type: string
                                                        type: array
                                                    required:
                                                      - key
                                                      - operator
                                                    type: object
                                                  type: array
                                                matchLabels:
                                                  additionalProperties:
                                                    type: string
                                                  type: object
                                              type: object
                                              x-kubernetes-map-type: atomic
                                            namespaces:
                                              items:
                                                type: string
                                              type: array
                                            topologyKey:
                                              type: string
                                          required:
                                            - topologyKey
                                          type: object
                                        weight:
                                          format: int32
                                          type: integer
                                      required:
                                        - podAffinityTerm
                                        - weight
                                      type: object
                                    type: array
                                  requiredDuringSchedulingIgnoredDuringExecution:
                                    items:
                                      properties:
                                        labelSelector:
                                          properties:
                                            matchExpressions:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                            matchLabels:
                                              additionalProperties:
                                                type: string
                                              type: object
                                          type: object
                                          x-kubernetes-map-type: atomic
                                        namespaceSelector:
                                          properties:
                                            matchExpressions:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                            matchLabels:
                                              additionalProperties:
                                                type: string
                                              type: object
                                          type: object
                                          x-kubernetes-map-type: atomic
                                        namespaces:
                                          items:
                                            type: string
                                          type: array
                                        topologyKey:
                                          type: string
                                      required:
                                        - topologyKey
                                      type: object
                                    type: array
                                type: object
                              podAntiAffinity:
                                properties:
                                  preferredDuringSchedulingIgnoredDuringExecution:
                                    items:
                                      properties:
                                        podAffinityTerm:
                                          properties:
                                            labelSelector:
                                              properties:
                                                matchExpressions:
                                                  items:
                                                    properties:
                                                      key:
                                                        type: string
                                                      operator:
                                                        type: string
                                                      values:
                                                        items:
                                                          type: string
                                                        type: array
                                                    required:
                                                      - key
                                                      - operator
                                                    type: object
                                                  type: array
                                                matchLabels:
                                                  additionalProperties:
                                                    type: string
                                                  type: object
                                              type: object
                                              x-kubernetes-map-type: atomic
                                            namespaceSelector:
                                              properties:
                                                matchExpressions:
                                                  items:
                                                    properties:
                                                      key:
                                                        type: string
                                                      operator:
                                                        type: string
                                                      values:
                                                        items:
                                                          type: string
                                                        type: array
                                                    required:
                                                      - key
                                                      - operator
                                                    type: object
                                                  type: array
                                                matchLabels:
                                                  additionalProperties:
                                                    type: string
                                                  type: object
                                              type: object
                                              x-kubernetes-map-type: atomic
                                            namespaces:
                                              items:
                                                type: string
                                              type: array
                                            topologyKey:
                                              type: string
                                          required:
                                            - topologyKey
                                          type: object
                                        weight:
                                          format: int32
                                          type: integer
                                      required:
                                        - podAffinityTerm
                                        - weight
                                      type: object
                                    type: array
                                  requiredDuringSchedulingIgnoredDuringExecution:
                                    items:
                                      properties:
                                        labelSelector:
                                          properties:
                                            matchExpressions:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                            matchLabels:
                                              additionalProperties:
                                                type: string
                                              type: object
                                          type: object
                                          x-kubernetes-map-type: atomic
                                        namespaceSelector:
                                          properties:
                                            matchExpressions:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                            matchLabels:
                                              additionalProperties:
                                                type: string
                                              type: object
                                          type: object
                                          x-kubernetes-map-type: atomic
                                        namespaces:
                                          items:
                                            type: string
                                          type: array
                                        topologyKey:
                                          type: string
                                      required:
                                        - topologyKey
                                      type: object
                                    type: array
                                type: object
                              tolerations:
                                items:
                                  properties:
                                    effect:
                                      type: string
                                    key:
                                      type: string
                                    operator:
                                      type: string
                                    tolerationSeconds:
                                      format: int64
                                      type: integer
                                    value:
                                      type: string
                                  type: object
                                type: array
                              topologySpreadConstraints:
                                items:
                                  properties:
                                    labelSelector:
                                      properties:
                                        matchExpressions:
                                          items:
                                            properties:
                                              key:
                                                type: string
                                              operator:
                                                type: string
                                              values:
                                                items:
                                                  type: string
                                                type: array
                                            required:
                                              - key
                                              - operator
                                            type: object
                                          type: array
                                        matchLabels:
                                          additionalProperties:
                                            type: string
                                          type: object
                                      type: object
                                      x-kubernetes-map-type: atomic
                                    matchLabelKeys:
                                      items:
                                        type: string
                                      type: array
                                      x-kubernetes-list-type: atomic
                                    maxSkew:
                                      format: int32
                                      type: integer
                                    minDomains:
                                      format: int32
                                      type: integer
                                    nodeAffinityPolicy:
                                      type: string
                                    nodeTaintsPolicy:
                                      type: string
                                    topologyKey:
                                      type: string
                                    whenUnsatisfiable:
                                      type: string
                                  required:
                                    - maxSkew
                                    - topologyKey
                                    - whenUnsatisfiable
                                  type: object
                                type: array
                            type: object
                            x-kubernetes-preserve-unknown-fields: true
                          portable:
                            type: boolean
                          preparePlacement:
                            nullable: true
                            properties:
                              nodeAffinity:
                                properties:
                                  preferredDuringSchedulingIgnoredDuringExecution:
                                    items:
                                      properties:
                                        preference:
                                          properties:
                                            matchExpressions:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                            matchFields:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                          type: object
                                          x-kubernetes-map-type: atomic
                                        weight:
                                          format: int32
                                          type: integer
                                      required:
                                        - preference
                                        - weight
                                      type: object
                                    type: array
                                  requiredDuringSchedulingIgnoredDuringExecution:
                                    properties:
                                      nodeSelectorTerms:
                                        items:
                                          properties:
                                            matchExpressions:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                            matchFields:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                          type: object
                                          x-kubernetes-map-type: atomic
                                        type: array
                                    required:
                                      - nodeSelectorTerms
                                    type: object
                                    x-kubernetes-map-type: atomic
                                type: object
                              podAffinity:
                                properties:
                                  preferredDuringSchedulingIgnoredDuringExecution:
                                    items:
                                      properties:
                                        podAffinityTerm:
                                          properties:
                                            labelSelector:
                                              properties:
                                                matchExpressions:
                                                  items:
                                                    properties:
                                                      key:
                                                        type: string
                                                      operator:
                                                        type: string
                                                      values:
                                                        items:
                                                          type: string
                                                        type: array
                                                    required:
                                                      - key
                                                      - operator
                                                    type: object
                                                  type: array
                                                matchLabels:
                                                  additionalProperties:
                                                    type: string
                                                  type: object
                                              type: object
                                              x-kubernetes-map-type: atomic
                                            namespaceSelector:
                                              properties:
                                                matchExpressions:
                                                  items:
                                                    properties:
                                                      key:
                                                        type: string
                                                      operator:
                                                        type: string
                                                      values:
                                                        items:
                                                          type: string
                                                        type: array
                                                    required:
                                                      - key
                                                      - operator
                                                    type: object
                                                  type: array
                                                matchLabels:
                                                  additionalProperties:
                                                    type: string
                                                  type: object
                                              type: object
                                              x-kubernetes-map-type: atomic
                                            namespaces:
                                              items:
                                                type: string
                                              type: array
                                            topologyKey:
                                              type: string
                                          required:
                                            - topologyKey
                                          type: object
                                        weight:
                                          format: int32
                                          type: integer
                                      required:
                                        - podAffinityTerm
                                        - weight
                                      type: object
                                    type: array
                                  requiredDuringSchedulingIgnoredDuringExecution:
                                    items:
                                      properties:
                                        labelSelector:
                                          properties:
                                            matchExpressions:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                            matchLabels:
                                              additionalProperties:
                                                type: string
                                              type: object
                                          type: object
                                          x-kubernetes-map-type: atomic
                                        namespaceSelector:
                                          properties:
                                            matchExpressions:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                            matchLabels:
                                              additionalProperties:
                                                type: string
                                              type: object
                                          type: object
                                          x-kubernetes-map-type: atomic
                                        namespaces:
                                          items:
                                            type: string
                                          type: array
                                        topologyKey:
                                          type: string
                                      required:
                                        - topologyKey
                                      type: object
                                    type: array
                                type: object
                              podAntiAffinity:
                                properties:
                                  preferredDuringSchedulingIgnoredDuringExecution:
                                    items:
                                      properties:
                                        podAffinityTerm:
                                          properties:
                                            labelSelector:
                                              properties:
                                                matchExpressions:
                                                  items:
                                                    properties:
                                                      key:
                                                        type: string
                                                      operator:
                                                        type: string
                                                      values:
                                                        items:
                                                          type: string
                                                        type: array
                                                    required:
                                                      - key
                                                      - operator
                                                    type: object
                                                  type: array
                                                matchLabels:
                                                  additionalProperties:
                                                    type: string
                                                  type: object
                                              type: object
                                              x-kubernetes-map-type: atomic
                                            namespaceSelector:
                                              properties:
                                                matchExpressions:
                                                  items:
                                                    properties:
                                                      key:
                                                        type: string
                                                      operator:
                                                        type: string
                                                      values:
                                                        items:
                                                          type: string
                                                        type: array
                                                    required:
                                                      - key
                                                      - operator
                                                    type: object
                                                  type: array
                                                matchLabels:
                                                  additionalProperties:
                                                    type: string
                                                  type: object
                                              type: object
                                              x-kubernetes-map-type: atomic
                                            namespaces:
                                              items:
                                                type: string
                                              type: array
                                            topologyKey:
                                              type: string
                                          required:
                                            - topologyKey
                                          type: object
                                        weight:
                                          format: int32
                                          type: integer
                                      required:
                                        - podAffinityTerm
                                        - weight
                                      type: object
                                    type: array
                                  requiredDuringSchedulingIgnoredDuringExecution:
                                    items:
                                      properties:
                                        labelSelector:
                                          properties:
                                            matchExpressions:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                            matchLabels:
                                              additionalProperties:
                                                type: string
                                              type: object
                                          type: object
                                          x-kubernetes-map-type: atomic
                                        namespaceSelector:
                                          properties:
                                            matchExpressions:
                                              items:
                                                properties:
                                                  key:
                                                    type: string
                                                  operator:
                                                    type: string
                                                  values:
                                                    items:
                                                      type: string
                                                    type: array
                                                required:
                                                  - key
                                                  - operator
                                                type: object
                                              type: array
                                            matchLabels:
                                              additionalProperties:
                                                type: string
                                              type: object
                                          type: object
                                          x-kubernetes-map-type: atomic
                                        namespaces:
                                          items:
                                            type: string
                                          type: array
                                        topologyKey:
                                          type: string
                                      required:
                                        - topologyKey
                                      type: object
                                    type: array
                                type: object
                              tolerations:
                                items:
                                  properties:
                                    effect:
                                      type: string
                                    key:
                                      type: string
                                    operator:
                                      type: string
                                    tolerationSeconds:
                                      format: int64
                                      type: integer
                                    value:
                                      type: string
                                  type: object
                                type: array
                              topologySpreadConstraints:
                                items:
                                  properties:
                                    labelSelector:
                                      properties:
                                        matchExpressions:
                                          items:
                                            properties:
                                              key:
                                                type: string
                                              operator:
                                                type: string
                                              values:
                                                items:
                                                  type: string
                                                type: array
                                            required:
                                              - key
                                              - operator
                                            type: object
                                          type: array
                                        matchLabels:
                                          additionalProperties:
                                            type: string
                                          type: object
                                      type: object
                                      x-kubernetes-map-type: atomic
                                    matchLabelKeys:
                                      items:
                                        type: string
                                      type: array
                                      x-kubernetes-list-type: atomic
                                    maxSkew:
                                      format: int32
                                      type: integer
                                    minDomains:
                                      format: int32
                                      type: integer
                                    nodeAffinityPolicy:
                                      type: string
                                    nodeTaintsPolicy:
                                      type: string
                                    topologyKey:
                                      type: string
                                    whenUnsatisfiable:
                                      type: string
                                  required:
                                    - maxSkew
                                    - topologyKey
                                    - whenUnsatisfiable
                                  type: object
                                type: array
                            type: object
                            x-kubernetes-preserve-unknown-fields: true
                          resources:
                            nullable: true
                            properties:
                              claims:
                                items:
                                  properties:
                                    name:
                                      type: string
                                  required:
                                    - name
                                  type: object
                                type: array
                                x-kubernetes-list-map-keys:
                                  - name
                                x-kubernetes-list-type: map
                              limits:
                                additionalProperties:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                  x-kubernetes-int-or-string: true
                                type: object
                              requests:
                                additionalProperties:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                  x-kubernetes-int-or-string: true
                                type: object
                            type: object
                            x-kubernetes-preserve-unknown-fields: true
                          schedulerName:
                            type: string
                          tuneDeviceClass:
                            type: boolean
                          tuneFastDeviceClass:
                            type: boolean
                          volumeClaimTemplates:
                            items:
                              properties:
                                apiVersion:
                                  type: string
                                kind:
                                  type: string
                                metadata:
                                  properties:
                                    annotations:
                                      additionalProperties:
                                        type: string
                                      type: object
                                      x-kubernetes-preserve-unknown-fields: true
                                    finalizers:
                                      items:
                                        type: string
                                      type: array
                                    labels:
                                      additionalProperties:
                                        type: string
                                      type: object
                                    name:
                                      type: string
                                    namespace:
                                      type: string
                                  type: object
                                spec:
                                  properties:
                                    accessModes:
                                      items:
                                        type: string
                                      type: array
                                    dataSource:
                                      properties:
                                        apiGroup:
                                          type: string
                                        kind:
                                          type: string
                                        name:
                                          type: string
                                      required:
                                        - kind
                                        - name
                                      type: object
                                      x-kubernetes-map-type: atomic
                                    dataSourceRef:
                                      properties:
                                        apiGroup:
                                          type: string
                                        kind:
                                          type: string
                                        name:
                                          type: string
                                        namespace:
                                          type: string
                                      required:
                                        - kind
                                        - name
                                      type: object
                                    resources:
                                      properties:
                                        claims:
                                          items:
                                            properties:
                                              name:
                                                type: string
                                            required:
                                              - name
                                            type: object
                                          type: array
                                          x-kubernetes-list-map-keys:
                                            - name
                                          x-kubernetes-list-type: map
                                        limits:
                                          additionalProperties:
                                            anyOf:
                                              - type: integer
                                              - type: string
                                            pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                            x-kubernetes-int-or-string: true
                                          type: object
                                        requests:
                                          additionalProperties:
                                            anyOf:
                                              - type: integer
                                              - type: string
                                            pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                            x-kubernetes-int-or-string: true
                                          type: object
                                      type: object
                                    selector:
                                      properties:
                                        matchExpressions:
                                          items:
                                            properties:
                                              key:
                                                type: string
                                              operator:
                                                type: string
                                              values:
                                                items:
                                                  type: string
                                                type: array
                                            required:
                                              - key
                                              - operator
                                            type: object
                                          type: array
                                        matchLabels:
                                          additionalProperties:
                                            type: string
                                          type: object
                                      type: object
                                      x-kubernetes-map-type: atomic
                                    storageClassName:
                                      type: string
                                    volumeMode:
                                      type: string
                                    volumeName:
                                      type: string
                                  type: object
                                status:
                                  properties:
                                    accessModes:
                                      items:
                                        type: string
                                      type: array
                                    allocatedResources:
                                      additionalProperties:
                                        anyOf:
                                          - type: integer
                                          - type: string
                                        pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                        x-kubernetes-int-or-string: true
                                      type: object
                                    capacity:
                                      additionalProperties:
                                        anyOf:
                                          - type: integer
                                          - type: string
                                        pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                        x-kubernetes-int-or-string: true
                                      type: object
                                    conditions:
                                      items:
                                        properties:
                                          lastProbeTime:
                                            format: date-time
                                            type: string
                                          lastTransitionTime:
                                            format: date-time
                                            type: string
                                          message:
                                            type: string
                                          reason:
                                            type: string
                                          status:
                                            type: string
                                          type:
                                            type: string
                                        required:
                                          - status
                                          - type
                                        type: object
                                      type: array
                                    phase:
                                      type: string
                                    resizeStatus:
                                      type: string
                                  type: object
                              type: object
                            type: array
                        required:
                          - count
                          - name
                          - volumeClaimTemplates
                        type: object
                      nullable: true
                      type: array
                    useAllDevices:
                      type: boolean
                    useAllNodes:
                      type: boolean
                    volumeClaimTemplates:
                      items:
                        properties:
                          apiVersion:
                            type: string
                          kind:
                            type: string
                          metadata:
                            properties:
                              annotations:
                                additionalProperties:
                                  type: string
                                type: object
                              finalizers:
                                items:
                                  type: string
                                type: array
                              labels:
                                additionalProperties:
                                  type: string
                                type: object
                              name:
                                type: string
                              namespace:
                                type: string
                            type: object
                          spec:
                            properties:
                              accessModes:
                                items:
                                  type: string
                                type: array
                              dataSource:
                                properties:
                                  apiGroup:
                                    type: string
                                  kind:
                                    type: string
                                  name:
                                    type: string
                                required:
                                  - kind
                                  - name
                                type: object
                                x-kubernetes-map-type: atomic
                              dataSourceRef:
                                properties:
                                  apiGroup:
                                    type: string
                                  kind:
                                    type: string
                                  name:
                                    type: string
                                  namespace:
                                    type: string
                                required:
                                  - kind
                                  - name
                                type: object
                              resources:
                                properties:
                                  claims:
                                    items:
                                      properties:
                                        name:
                                          type: string
                                      required:
                                        - name
                                      type: object
                                    type: array
                                    x-kubernetes-list-map-keys:
                                      - name
                                    x-kubernetes-list-type: map
                                  limits:
                                    additionalProperties:
                                      anyOf:
                                        - type: integer
                                        - type: string
                                      pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                      x-kubernetes-int-or-string: true
                                    type: object
                                  requests:
                                    additionalProperties:
                                      anyOf:
                                        - type: integer
                                        - type: string
                                      pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                      x-kubernetes-int-or-string: true
                                    type: object
                                type: object
                              selector:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchLabels:
                                    additionalProperties:
                                      type: string
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                              storageClassName:
                                type: string
                              volumeMode:
                                type: string
                              volumeName:
                                type: string
                            type: object
                          status:
                            properties:
                              accessModes:
                                items:
                                  type: string
                                type: array
                              allocatedResources:
                                additionalProperties:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                  x-kubernetes-int-or-string: true
                                type: object
                              capacity:
                                additionalProperties:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                  x-kubernetes-int-or-string: true
                                type: object
                              conditions:
                                items:
                                  properties:
                                    lastProbeTime:
                                      format: date-time
                                      type: string
                                    lastTransitionTime:
                                      format: date-time
                                      type: string
                                    message:
                                      type: string
                                    reason:
                                      type: string
                                    status:
                                      type: string
                                    type:
                                      type: string
                                  required:
                                    - status
                                    - type
                                  type: object
                                type: array
                              phase:
                                type: string
                              resizeStatus:
                                type: string
                            type: object
                        type: object
                      type: array
                  type: object
                waitTimeoutForHealthyOSDInMinutes:
                  format: int64
                  type: integer
              type: object
            status:
              nullable: true
              properties:
                ceph:
                  properties:
                    capacity:
                      properties:
                        bytesAvailable:
                          format: int64
                          type: integer
                        bytesTotal:
                          format: int64
                          type: integer
                        bytesUsed:
                          format: int64
                          type: integer
                        lastUpdated:
                          type: string
                      type: object
                    details:
                      additionalProperties:
                        properties:
                          message:
                            type: string
                          severity:
                            type: string
                        required:
                          - message
                          - severity
                        type: object
                      type: object
                    fsid:
                      type: string
                    health:
                      type: string
                    lastChanged:
                      type: string
                    lastChecked:
                      type: string
                    previousHealth:
                      type: string
                    versions:
                      properties:
                        cephfs-mirror:
                          additionalProperties:
                            type: integer
                          type: object
                        mds:
                          additionalProperties:
                            type: integer
                          type: object
                        mgr:
                          additionalProperties:
                            type: integer
                          type: object
                        mon:
                          additionalProperties:
                            type: integer
                          type: object
                        osd:
                          additionalProperties:
                            type: integer
                          type: object
                        overall:
                          additionalProperties:
                            type: integer
                          type: object
                        rbd-mirror:
                          additionalProperties:
                            type: integer
                          type: object
                        rgw:
                          additionalProperties:
                            type: integer
                          type: object
                      type: object
                  type: object
                conditions:
                  items:
                    properties:
                      lastHeartbeatTime:
                        format: date-time
                        type: string
                      lastTransitionTime:
                        format: date-time
                        type: string
                      message:
                        type: string
                      reason:
                        type: string
                      status:
                        type: string
                      type:
                        type: string
                    type: object
                  type: array
                message:
                  type: string
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
                state:
                  type: string
                storage:
                  properties:
                    deviceClasses:
                      items:
                        properties:
                          name:
                            type: string
                        type: object
                      type: array
                  type: object
                version:
                  properties:
                    image:
                      type: string
                    version:
                      type: string
                  type: object
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephfilesystemmirrors.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephFilesystemMirror
    listKind: CephFilesystemMirrorList
    plural: cephfilesystemmirrors
    singular: cephfilesystemmirror
  scope: Namespaced
  versions:
    - additionalPrinterColumns:
        - jsonPath: .status.phase
          name: Phase
          type: string
      name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                annotations:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                labels:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                placement:
                  nullable: true
                  properties:
                    nodeAffinity:
                      properties:
                        preferredDuringSchedulingIgnoredDuringExecution:
                          items:
                            properties:
                              preference:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchFields:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                type: object
                                x-kubernetes-map-type: atomic
                              weight:
                                format: int32
                                type: integer
                            required:
                              - preference
                              - weight
                            type: object
                          type: array
                        requiredDuringSchedulingIgnoredDuringExecution:
                          properties:
                            nodeSelectorTerms:
                              items:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchFields:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                type: object
                                x-kubernetes-map-type: atomic
                              type: array
                          required:
                            - nodeSelectorTerms
                          type: object
                          x-kubernetes-map-type: atomic
                      type: object
                    podAffinity:
                      properties:
                        preferredDuringSchedulingIgnoredDuringExecution:
                          items:
                            properties:
                              podAffinityTerm:
                                properties:
                                  labelSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaceSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaces:
                                    items:
                                      type: string
                                    type: array
                                  topologyKey:
                                    type: string
                                required:
                                  - topologyKey
                                type: object
                              weight:
                                format: int32
                                type: integer
                            required:
                              - podAffinityTerm
                              - weight
                            type: object
                          type: array
                        requiredDuringSchedulingIgnoredDuringExecution:
                          items:
                            properties:
                              labelSelector:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchLabels:
                                    additionalProperties:
                                      type: string
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                              namespaceSelector:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchLabels:
                                    additionalProperties:
                                      type: string
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                              namespaces:
                                items:
                                  type: string
                                type: array
                              topologyKey:
                                type: string
                            required:
                              - topologyKey
                            type: object
                          type: array
                      type: object
                    podAntiAffinity:
                      properties:
                        preferredDuringSchedulingIgnoredDuringExecution:
                          items:
                            properties:
                              podAffinityTerm:
                                properties:
                                  labelSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaceSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaces:
                                    items:
                                      type: string
                                    type: array
                                  topologyKey:
                                    type: string
                                required:
                                  - topologyKey
                                type: object
                              weight:
                                format: int32
                                type: integer
                            required:
                              - podAffinityTerm
                              - weight
                            type: object
                          type: array
                        requiredDuringSchedulingIgnoredDuringExecution:
                          items:
                            properties:
                              labelSelector:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchLabels:
                                    additionalProperties:
                                      type: string
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                              namespaceSelector:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchLabels:
                                    additionalProperties:
                                      type: string
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                              namespaces:
                                items:
                                  type: string
                                type: array
                              topologyKey:
                                type: string
                            required:
                              - topologyKey
                            type: object
                          type: array
                      type: object
                    tolerations:
                      items:
                        properties:
                          effect:
                            type: string
                          key:
                            type: string
                          operator:
                            type: string
                          tolerationSeconds:
                            format: int64
                            type: integer
                          value:
                            type: string
                        type: object
                      type: array
                    topologySpreadConstraints:
                      items:
                        properties:
                          labelSelector:
                            properties:
                              matchExpressions:
                                items:
                                  properties:
                                    key:
                                      type: string
                                    operator:
                                      type: string
                                    values:
                                      items:
                                        type: string
                                      type: array
                                  required:
                                    - key
                                    - operator
                                  type: object
                                type: array
                              matchLabels:
                                additionalProperties:
                                  type: string
                                type: object
                            type: object
                            x-kubernetes-map-type: atomic
                          matchLabelKeys:
                            items:
                              type: string
                            type: array
                            x-kubernetes-list-type: atomic
                          maxSkew:
                            format: int32
                            type: integer
                          minDomains:
                            format: int32
                            type: integer
                          nodeAffinityPolicy:
                            type: string
                          nodeTaintsPolicy:
                            type: string
                          topologyKey:
                            type: string
                          whenUnsatisfiable:
                            type: string
                        required:
                          - maxSkew
                          - topologyKey
                          - whenUnsatisfiable
                        type: object
                      type: array
                  type: object
                priorityClassName:
                  type: string
                resources:
                  nullable: true
                  properties:
                    claims:
                      items:
                        properties:
                          name:
                            type: string
                        required:
                          - name
                        type: object
                      type: array
                      x-kubernetes-list-map-keys:
                        - name
                      x-kubernetes-list-type: map
                    limits:
                      additionalProperties:
                        anyOf:
                          - type: integer
                          - type: string
                        pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                        x-kubernetes-int-or-string: true
                      type: object
                    requests:
                      additionalProperties:
                        anyOf:
                          - type: integer
                          - type: string
                        pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                        x-kubernetes-int-or-string: true
                      type: object
                  type: object
              type: object
            status:
              properties:
                conditions:
                  items:
                    properties:
                      lastHeartbeatTime:
                        format: date-time
                        type: string
                      lastTransitionTime:
                        format: date-time
                        type: string
                      message:
                        type: string
                      reason:
                        type: string
                      status:
                        type: string
                      type:
                        type: string
                    type: object
                  type: array
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
              type: object
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephfilesystems.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephFilesystem
    listKind: CephFilesystemList
    plural: cephfilesystems
    singular: cephfilesystem
  scope: Namespaced
  versions:
    - additionalPrinterColumns:
          jsonPath: .spec.metadataServer.activeCount
          name: ActiveMDS
          type: string
        - jsonPath: .metadata.creationTimestamp
          name: Age
          type: date
        - jsonPath: .status.phase
          name: Phase
          type: string
      name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                dataPools:
                  items:
                    properties:
                      compressionMode:
                        enum:
                          - none
                          - passive
                          - aggressive
                          - force
                          - ""
                        nullable: true
                        type: string
                      crushRoot:
                        nullable: true
                        type: string
                      deviceClass:
                        nullable: true
                        type: string
                      enableRBDStats:
                        type: boolean
                      erasureCoded:
                        properties:
                          algorithm:
                            type: string
                          codingChunks:
                            minimum: 0
                            type: integer
                          dataChunks:
                            minimum: 0
                            type: integer
                        required:
                          - codingChunks
                          - dataChunks
                        type: object
                      failureDomain:
                        type: string
                      mirroring:
                        properties:
                          enabled:
                            type: boolean
                          mode:
                            type: string
                          peers:
                            nullable: true
                            properties:
                              secretNames:
                                items:
                                  type: string
                                type: array
                            type: object
                          snapshotSchedules:
                            items:
                              properties:
                                interval:
                                  type: string
                                path:
                                  type: string
                                startTime:
                                  type: string
                              type: object
                            type: array
                        type: object
                      name:
                        type: string
                      parameters:
                        additionalProperties:
                          type: string
                        nullable: true
                        type: object
                        x-kubernetes-preserve-unknown-fields: true
                      quotas:
                        nullable: true
                        properties:
                          maxBytes:
                            format: int64
                            type: integer
                          maxObjects:
                            format: int64
                            type: integer
                          maxSize:
                            pattern: ^[0-9]+[\.]?[0-9]*([KMGTPE]i|[kMGTPE])?$
                            type: string
                        type: object
                      replicated:
                        properties:
                          hybridStorage:
                            nullable: true
                            properties:
                              primaryDeviceClass:
                                minLength: 1
                                type: string
                              secondaryDeviceClass:
                                minLength: 1
                                type: string
                            required:
                              - primaryDeviceClass
                              - secondaryDeviceClass
                            type: object
                          replicasPerFailureDomain:
                            minimum: 1
                            type: integer
                          requireSafeReplicaSize:
                            type: boolean
                          size:
                            minimum: 0
                            type: integer
                          subFailureDomain:
                            type: string
                          targetSizeRatio:
                            type: number
                        required:
                          - size
                        type: object
                      statusCheck:
                        properties:
                          mirror:
                            nullable: true
                            properties:
                              disabled:
                                type: boolean
                              interval:
                                type: string
                              timeout:
                                type: string
                            type: object
                        type: object
                        x-kubernetes-preserve-unknown-fields: true
                    type: object
                  nullable: true
                  type: array
                metadataPool:
                  nullable: true
                  properties:
                    compressionMode:
                      enum:
                        - none
                        - passive
                        - aggressive
                        - force
                        - ""
                      nullable: true
                      type: string
                    crushRoot:
                      nullable: true
                      type: string
                    deviceClass:
                      nullable: true
                      type: string
                    enableRBDStats:
                      type: boolean
                    erasureCoded:
                      properties:
                        algorithm:
                          type: string
                        codingChunks:
                          minimum: 0
                          type: integer
                        dataChunks:
                          minimum: 0
                          type: integer
                      required:
                        - codingChunks
                        - dataChunks
                      type: object
                    failureDomain:
                      type: string
                    mirroring:
                      properties:
                        enabled:
                          type: boolean
                        mode:
                          type: string
                        peers:
                          nullable: true
                          properties:
                            secretNames:
                              items:
                                type: string
                              type: array
                          type: object
                        snapshotSchedules:
                          items:
                            properties:
                              interval:
                                type: string
                              path:
                                type: string
                              startTime:
                                type: string
                            type: object
                          type: array
                      type: object
                    parameters:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    quotas:
                      nullable: true
                      properties:
                        maxBytes:
                          format: int64
                          type: integer
                        maxObjects:
                          format: int64
                          type: integer
                        maxSize:
                          pattern: ^[0-9]+[\.]?[0-9]*([KMGTPE]i|[kMGTPE])?$
                          type: string
                      type: object
                    replicated:
                      properties:
                        hybridStorage:
                          nullable: true
                          properties:
                            primaryDeviceClass:
                              minLength: 1
                              type: string
                            secondaryDeviceClass:
                              minLength: 1
                              type: string
                          required:
                            - primaryDeviceClass
                            - secondaryDeviceClass
                          type: object
                        replicasPerFailureDomain:
                          minimum: 1
                          type: integer
                        requireSafeReplicaSize:
                          type: boolean
                        size:
                          minimum: 0
                          type: integer
                        subFailureDomain:
                          type: string
                        targetSizeRatio:
                          type: number
                      required:
                        - size
                      type: object
                    statusCheck:
                      properties:
                        mirror:
                          nullable: true
                          properties:
                            disabled:
                              type: boolean
                            interval:
                              type: string
                            timeout:
                              type: string
                          type: object
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                  type: object
                metadataServer:
                  properties:
                    activeCount:
                      format: int32
                      maximum: 10
                      minimum: 1
                      type: integer
                    activeStandby:
                      type: boolean
                    annotations:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    labels:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    livenessProbe:
                      properties:
                        disabled:
                          type: boolean
                        probe:
                          properties:
                            exec:
                              properties:
                                command:
                                  items:
                                    type: string
                                  type: array
                              type: object
                            failureThreshold:
                              format: int32
                              type: integer
                            grpc:
                              properties:
                                port:
                                  format: int32
                                  type: integer
                                service:
                                  type: string
                              required:
                                - port
                              type: object
                            httpGet:
                              properties:
                                host:
                                  type: string
                                httpHeaders:
                                  items:
                                    properties:
                                      name:
                                        type: string
                                      value:
                                        type: string
                                    required:
                                      - name
                                      - value
                                    type: object
                                  type: array
                                path:
                                  type: string
                                port:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  x-kubernetes-int-or-string: true
                                scheme:
                                  type: string
                              required:
                                - port
                              type: object
                            initialDelaySeconds:
                              format: int32
                              type: integer
                            periodSeconds:
                              format: int32
                              type: integer
                            successThreshold:
                              format: int32
                              type: integer
                            tcpSocket:
                              properties:
                                host:
                                  type: string
                                port:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  x-kubernetes-int-or-string: true
                              required:
                                - port
                              type: object
                            terminationGracePeriodSeconds:
                              format: int64
                              type: integer
                            timeoutSeconds:
                              format: int32
                              type: integer
                          type: object
                      type: object
                    placement:
                      nullable: true
                      properties:
                        nodeAffinity:
                          properties:
                            preferredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  preference:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchFields:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  weight:
                                    format: int32
                                    type: integer
                                required:
                                  - preference
                                  - weight
                                type: object
                              type: array
                            requiredDuringSchedulingIgnoredDuringExecution:
                              properties:
                                nodeSelectorTerms:
                                  items:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchFields:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  type: array
                              required:
                                - nodeSelectorTerms
                              type: object
                              x-kubernetes-map-type: atomic
                          type: object
                        podAffinity:
                          properties:
                            preferredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  podAffinityTerm:
                                    properties:
                                      labelSelector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      namespaceSelector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      namespaces:
                                        items:
                                          type: string
                                        type: array
                                      topologyKey:
                                        type: string
                                    required:
                                      - topologyKey
                                    type: object
                                  weight:
                                    format: int32
                                    type: integer
                                required:
                                  - podAffinityTerm
                                  - weight
                                type: object
                              type: array
                            requiredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  labelSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaceSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaces:
                                    items:
                                      type: string
                                    type: array
                                  topologyKey:
                                    type: string
                                required:
                                  - topologyKey
                                type: object
                              type: array
                          type: object
                        podAntiAffinity:
                          properties:
                            preferredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  podAffinityTerm:
                                    properties:
                                      labelSelector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      namespaceSelector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      namespaces:
                                        items:
                                          type: string
                                        type: array
                                      topologyKey:
                                        type: string
                                    required:
                                      - topologyKey
                                    type: object
                                  weight:
                                    format: int32
                                    type: integer
                                required:
                                  - podAffinityTerm
                                  - weight
                                type: object
                              type: array
                            requiredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  labelSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaceSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaces:
                                    items:
                                      type: string
                                    type: array
                                  topologyKey:
                                    type: string
                                required:
                                  - topologyKey
                                type: object
                              type: array
                          type: object
                        tolerations:
                          items:
                            properties:
                              effect:
                                type: string
                              key:
                                type: string
                              operator:
                                type: string
                              tolerationSeconds:
                                format: int64
                                type: integer
                              value:
                                type: string
                            type: object
                          type: array
                        topologySpreadConstraints:
                          items:
                            properties:
                              labelSelector:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchLabels:
                                    additionalProperties:
                                      type: string
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                              matchLabelKeys:
                                items:
                                  type: string
                                type: array
                                x-kubernetes-list-type: atomic
                              maxSkew:
                                format: int32
                                type: integer
                              minDomains:
                                format: int32
                                type: integer
                              nodeAffinityPolicy:
                                type: string
                              nodeTaintsPolicy:
                                type: string
                              topologyKey:
                                type: string
                              whenUnsatisfiable:
                                type: string
                            required:
                              - maxSkew
                              - topologyKey
                              - whenUnsatisfiable
                            type: object
                          type: array
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    priorityClassName:
                      type: string
                    resources:
                      nullable: true
                      properties:
                        claims:
                          items:
                            properties:
                              name:
                                type: string
                            required:
                              - name
                            type: object
                          type: array
                          x-kubernetes-list-map-keys:
                            - name
                          x-kubernetes-list-type: map
                        limits:
                          additionalProperties:
                            anyOf:
                              - type: integer
                              - type: string
                            pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                            x-kubernetes-int-or-string: true
                          type: object
                        requests:
                          additionalProperties:
                            anyOf:
                              - type: integer
                              - type: string
                            pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                            x-kubernetes-int-or-string: true
                          type: object
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    startupProbe:
                      properties:
                        disabled:
                          type: boolean
                        probe:
                          properties:
                            exec:
                              properties:
                                command:
                                  items:
                                    type: string
                                  type: array
                              type: object
                            failureThreshold:
                              format: int32
                              type: integer
                            grpc:
                              properties:
                                port:
                                  format: int32
                                  type: integer
                                service:
                                  type: string
                              required:
                                - port
                              type: object
                            httpGet:
                              properties:
                                host:
                                  type: string
                                httpHeaders:
                                  items:
                                    properties:
                                      name:
                                        type: string
                                      value:
                                        type: string
                                    required:
                                      - name
                                      - value
                                    type: object
                                  type: array
                                path:
                                  type: string
                                port:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  x-kubernetes-int-or-string: true
                                scheme:
                                  type: string
                              required:
                                - port
                              type: object
                            initialDelaySeconds:
                              format: int32
                              type: integer
                            periodSeconds:
                              format: int32
                              type: integer
                            successThreshold:
                              format: int32
                              type: integer
                            tcpSocket:
                              properties:
                                host:
                                  type: string
                                port:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  x-kubernetes-int-or-string: true
                              required:
                                - port
                              type: object
                            terminationGracePeriodSeconds:
                              format: int64
                              type: integer
                            timeoutSeconds:
                              format: int32
                              type: integer
                          type: object
                      type: object
                  required:
                    - activeCount
                  type: object
                mirroring:
                  nullable: true
                  properties:
                    enabled:
                      type: boolean
                    peers:
                      nullable: true
                      properties:
                        secretNames:
                          items:
                            type: string
                          type: array
                      type: object
                    snapshotRetention:
                      items:
                        properties:
                          duration:
                            type: string
                          path:
                            type: string
                        type: object
                      type: array
                    snapshotSchedules:
                      items:
                        properties:
                          interval:
                            type: string
                          path:
                            type: string
                          startTime:
                            type: string
                        type: object
                      type: array
                  type: object
                preserveFilesystemOnDelete:
                  type: boolean
                preservePoolsOnDelete:
                  type: boolean
                statusCheck:
                  properties:
                    mirror:
                      nullable: true
                      properties:
                        disabled:
                          type: boolean
                        interval:
                          type: string
                        timeout:
                          type: string
                      type: object
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
              required:
                - dataPools
                - metadataPool
                - metadataServer
              type: object
            status:
              properties:
                conditions:
                  items:
                    properties:
                      lastHeartbeatTime:
                        format: date-time
                        type: string
                      lastTransitionTime:
                        format: date-time
                        type: string
                      message:
                        type: string
                      reason:
                        type: string
                      status:
                        type: string
                      type:
                        type: string
                    type: object
                  type: array
                info:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                mirroringStatus:
                  properties:
                    daemonsStatus:
                      items:
                        properties:
                          daemon_id:
                            type: integer
                          filesystems:
                            items:
                              properties:
                                directory_count:
                                  type: integer
                                filesystem_id:
                                  type: integer
                                name:
                                  type: string
                                peers:
                                  items:
                                    properties:
                                      remote:
                                        properties:
                                          client_name:
                                            type: string
                                          cluster_name:
                                            type: string
                                          fs_name:
                                            type: string
                                        type: object
                                      stats:
                                        properties:
                                          failure_count:
                                            type: integer
                                          recovery_count:
                                            type: integer
                                        type: object
                                      uuid:
                                        type: string
                                    type: object
                                  type: array
                              type: object
                            type: array
                        type: object
                      nullable: true
                      type: array
                    details:
                      type: string
                    lastChanged:
                      type: string
                    lastChecked:
                      type: string
                  type: object
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
                snapshotScheduleStatus:
                  properties:
                    details:
                      type: string
                    lastChanged:
                      type: string
                    lastChecked:
                      type: string
                    snapshotSchedules:
                      items:
                        properties:
                          fs:
                            type: string
                          path:
                            type: string
                          rel_path:
                            type: string
                          retention:
                            properties:
                              active:
                                type: boolean
                              created:
                                type: string
                              created_count:
                                type: integer
                              first:
                                type: string
                              last:
                                type: string
                              last_pruned:
                                type: string
                              pruned_count:
                                type: integer
                              start:
                                type: string
                            type: object
                          schedule:
                            type: string
                          subvol:
                            type: string
                        type: object
                      nullable: true
                      type: array
                  type: object
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephfilesystemsubvolumegroups.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephFilesystemSubVolumeGroup
    listKind: CephFilesystemSubVolumeGroupList
    plural: cephfilesystemsubvolumegroups
    singular: cephfilesystemsubvolumegroup
  scope: Namespaced
  versions:
    - additionalPrinterColumns:
        - jsonPath: .status.phase
          name: Phase
          type: string
      name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                filesystemName:
                  type: string
              required:
                - filesystemName
              type: object
            status:
              properties:
                info:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephnfses.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephNFS
    listKind: CephNFSList
    plural: cephnfses
    shortNames:
      - nfs
    singular: cephnfs
  scope: Namespaced
  versions:
    - name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                rados:
                  nullable: true
                  properties:
                    namespace:
                      type: string
                    pool:
                      type: string
                  type: object
                security:
                  nullable: true
                  properties:
                    kerberos:
                      nullable: true
                      properties:
                        configFiles:
                          properties:
                            volumeSource:
                              properties:
                                configMap:
                                  properties:
                                    defaultMode:
                                      format: int32
                                      type: integer
                                    items:
                                      items:
                                        properties:
                                          key:
                                            type: string
                                          mode:
                                            format: int32
                                            type: integer
                                          path:
                                            type: string
                                        required:
                                          - key
                                          - path
                                        type: object
                                      type: array
                                    name:
                                      type: string
                                    optional:
                                      type: boolean
                                  type: object
                                  x-kubernetes-map-type: atomic
                                emptyDir:
                                  properties:
                                    medium:
                                      type: string
                                    sizeLimit:
                                      anyOf:
                                        - type: integer
                                        - type: string
                                      pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                      x-kubernetes-int-or-string: true
                                  type: object
                                hostPath:
                                  properties:
                                    path:
                                      type: string
                                    type:
                                      type: string
                                  required:
                                    - path
                                  type: object
                                persistentVolumeClaim:
                                  properties:
                                    claimName:
                                      type: string
                                    readOnly:
                                      type: boolean
                                  required:
                                    - claimName
                                  type: object
                                projected:
                                  properties:
                                    defaultMode:
                                      format: int32
                                      type: integer
                                    sources:
                                      items:
                                        properties:
                                          configMap:
                                            properties:
                                              items:
                                                items:
                                                  properties:
                                                    key:
                                                      type: string
                                                    mode:
                                                      format: int32
                                                      type: integer
                                                    path:
                                                      type: string
                                                  required:
                                                    - key
                                                    - path
                                                  type: object
                                                type: array
                                              name:
                                                type: string
                                              optional:
                                                type: boolean
                                            type: object
                                            x-kubernetes-map-type: atomic
                                          downwardAPI:
                                            properties:
                                              items:
                                                items:
                                                  properties:
                                                    fieldRef:
                                                      properties:
                                                        apiVersion:
                                                          type: string
                                                        fieldPath:
                                                          type: string
                                                      required:
                                                        - fieldPath
                                                      type: object
                                                      x-kubernetes-map-type: atomic
                                                    mode:
                                                      format: int32
                                                      type: integer
                                                    path:
                                                      type: string
                                                    resourceFieldRef:
                                                      properties:
                                                        containerName:
                                                          type: string
                                                        divisor:
                                                          anyOf:
                                                            - type: integer
                                                            - type: string
                                                          pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                                          x-kubernetes-int-or-string: true
                                                        resource:
                                                          type: string
                                                      required:
                                                        - resource
                                                      type: object
                                                      x-kubernetes-map-type: atomic
                                                  required:
                                                    - path
                                                  type: object
                                                type: array
                                            type: object
                                          secret:
                                            properties:
                                              items:
                                                items:
                                                  properties:
                                                    key:
                                                      type: string
                                                    mode:
                                                      format: int32
                                                      type: integer
                                                    path:
                                                      type: string
                                                  required:
                                                    - key
                                                    - path
                                                  type: object
                                                type: array
                                              name:
                                                type: string
                                              optional:
                                                type: boolean
                                            type: object
                                            x-kubernetes-map-type: atomic
                                          serviceAccountToken:
                                            properties:
                                              audience:
                                                type: string
                                              expirationSeconds:
                                                format: int64
                                                type: integer
                                              path:
                                                type: string
                                            required:
                                              - path
                                            type: object
                                        type: object
                                      type: array
                                  type: object
                                secret:
                                  properties:
                                    defaultMode:
                                      format: int32
                                      type: integer
                                    items:
                                      items:
                                        properties:
                                          key:
                                            type: string
                                          mode:
                                            format: int32
                                            type: integer
                                          path:
                                            type: string
                                        required:
                                          - key
                                          - path
                                        type: object
                                      type: array
                                    optional:
                                      type: boolean
                                    secretName:
                                      type: string
                                  type: object
                              type: object
                          type: object
                        domainName:
                          type: string
                        keytabFile:
                          properties:
                            volumeSource:
                              properties:
                                configMap:
                                  properties:
                                    defaultMode:
                                      format: int32
                                      type: integer
                                    items:
                                      items:
                                        properties:
                                          key:
                                            type: string
                                          mode:
                                            format: int32
                                            type: integer
                                          path:
                                            type: string
                                        required:
                                          - key
                                          - path
                                        type: object
                                      type: array
                                    name:
                                      type: string
                                    optional:
                                      type: boolean
                                  type: object
                                  x-kubernetes-map-type: atomic
                                emptyDir:
                                  properties:
                                    medium:
                                      type: string
                                    sizeLimit:
                                      anyOf:
                                        - type: integer
                                        - type: string
                                      pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                      x-kubernetes-int-or-string: true
                                  type: object
                                hostPath:
                                  properties:
                                    path:
                                      type: string
                                    type:
                                      type: string
                                  required:
                                    - path
                                  type: object
                                persistentVolumeClaim:
                                  properties:
                                    claimName:
                                      type: string
                                    readOnly:
                                      type: boolean
                                  required:
                                    - claimName
                                  type: object
                                projected:
                                  properties:
                                    defaultMode:
                                      format: int32
                                      type: integer
                                    sources:
                                      items:
                                        properties:
                                          configMap:
                                            properties:
                                              items:
                                                items:
                                                  properties:
                                                    key:
                                                      type: string
                                                    mode:
                                                      format: int32
                                                      type: integer
                                                    path:
                                                      type: string
                                                  required:
                                                    - key
                                                    - path
                                                  type: object
                                                type: array
                                              name:
                                                type: string
                                              optional:
                                                type: boolean
                                            type: object
                                            x-kubernetes-map-type: atomic
                                          downwardAPI:
                                            properties:
                                              items:
                                                items:
                                                  properties:
                                                    fieldRef:
                                                      properties:
                                                        apiVersion:
                                                          type: string
                                                        fieldPath:
                                                          type: string
                                                      required:
                                                        - fieldPath
                                                      type: object
                                                      x-kubernetes-map-type: atomic
                                                    mode:
                                                      format: int32
                                                      type: integer
                                                    path:
                                                      type: string
                                                    resourceFieldRef:
                                                      properties:
                                                        containerName:
                                                          type: string
                                                        divisor:
                                                          anyOf:
                                                            - type: integer
                                                            - type: string
                                                          pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                                          x-kubernetes-int-or-string: true
                                                        resource:
                                                          type: string
                                                      required:
                                                        - resource
                                                      type: object
                                                      x-kubernetes-map-type: atomic
                                                  required:
                                                    - path
                                                  type: object
                                                type: array
                                            type: object
                                          secret:
                                            properties:
                                              items:
                                                items:
                                                  properties:
                                                    key:
                                                      type: string
                                                    mode:
                                                      format: int32
                                                      type: integer
                                                    path:
                                                      type: string
                                                  required:
                                                    - key
                                                    - path
                                                  type: object
                                                type: array
                                              name:
                                                type: string
                                              optional:
                                                type: boolean
                                            type: object
                                            x-kubernetes-map-type: atomic
                                          serviceAccountToken:
                                            properties:
                                              audience:
                                                type: string
                                              expirationSeconds:
                                                format: int64
                                                type: integer
                                              path:
                                                type: string
                                            required:
                                              - path
                                            type: object
                                        type: object
                                      type: array
                                  type: object
                                secret:
                                  properties:
                                    defaultMode:
                                      format: int32
                                      type: integer
                                    items:
                                      items:
                                        properties:
                                          key:
                                            type: string
                                          mode:
                                            format: int32
                                            type: integer
                                          path:
                                            type: string
                                        required:
                                          - key
                                          - path
                                        type: object
                                      type: array
                                    optional:
                                      type: boolean
                                    secretName:
                                      type: string
                                  type: object
                              type: object
                          type: object
                        principalName:
                          default: nfs
                          type: string
                      type: object
                    sssd:
                      nullable: true
                      properties:
                        sidecar:
                          properties:
                            additionalFiles:
                              items:
                                properties:
                                  subPath:
                                    minLength: 1
                                    pattern: ^[^:]+$
                                    type: string
                                  volumeSource:
                                    properties:
                                      configMap:
                                        properties:
                                          defaultMode:
                                            format: int32
                                            type: integer
                                          items:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                mode:
                                                  format: int32
                                                  type: integer
                                                path:
                                                  type: string
                                              required:
                                                - key
                                                - path
                                              type: object
                                            type: array
                                          name:
                                            type: string
                                          optional:
                                            type: boolean
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      emptyDir:
                                        properties:
                                          medium:
                                            type: string
                                          sizeLimit:
                                            anyOf:
                                              - type: integer
                                              - type: string
                                            pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                            x-kubernetes-int-or-string: true
                                        type: object
                                      hostPath:
                                        properties:
                                          path:
                                            type: string
                                          type:
                                            type: string
                                        required:
                                          - path
                                        type: object
                                      persistentVolumeClaim:
                                        properties:
                                          claimName:
                                            type: string
                                          readOnly:
                                            type: boolean
                                        required:
                                          - claimName
                                        type: object
                                      projected:
                                        properties:
                                          defaultMode:
                                            format: int32
                                            type: integer
                                          sources:
                                            items:
                                              properties:
                                                configMap:
                                                  properties:
                                                    items:
                                                      items:
                                                        properties:
                                                          key:
                                                            type: string
                                                          mode:
                                                            format: int32
                                                            type: integer
                                                          path:
                                                            type: string
                                                        required:
                                                          - key
                                                          - path
                                                        type: object
                                                      type: array
                                                    name:
                                                      type: string
                                                    optional:
                                                      type: boolean
                                                  type: object
                                                  x-kubernetes-map-type: atomic
                                                downwardAPI:
                                                  properties:
                                                    items:
                                                      items:
                                                        properties:
                                                          fieldRef:
                                                            properties:
                                                              apiVersion:
                                                                type: string
                                                              fieldPath:
                                                                type: string
                                                            required:
                                                              - fieldPath
                                                            type: object
                                                            x-kubernetes-map-type: atomic
                                                          mode:
                                                            format: int32
                                                            type: integer
                                                          path:
                                                            type: string
                                                          resourceFieldRef:
                                                            properties:
                                                              containerName:
                                                                type: string
                                                              divisor:
                                                                anyOf:
                                                                  - type: integer
                                                                  - type: string
                                                                pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                                                x-kubernetes-int-or-string: true
                                                              resource:
                                                                type: string
                                                            required:
                                                              - resource
                                                            type: object
                                                            x-kubernetes-map-type: atomic
                                                        required:
                                                          - path
                                                        type: object
                                                      type: array
                                                  type: object
                                                secret:
                                                  properties:
                                                    items:
                                                      items:
                                                        properties:
                                                          key:
                                                            type: string
                                                          mode:
                                                            format: int32
                                                            type: integer
                                                          path:
                                                            type: string
                                                        required:
                                                          - key
                                                          - path
                                                        type: object
                                                      type: array
                                                    name:
                                                      type: string
                                                    optional:
                                                      type: boolean
                                                  type: object
                                                  x-kubernetes-map-type: atomic
                                                serviceAccountToken:
                                                  properties:
                                                    audience:
                                                      type: string
                                                    expirationSeconds:
                                                      format: int64
                                                      type: integer
                                                    path:
                                                      type: string
                                                  required:
                                                    - path
                                                  type: object
                                              type: object
                                            type: array
                                        type: object
                                      secret:
                                        properties:
                                          defaultMode:
                                            format: int32
                                            type: integer
                                          items:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                mode:
                                                  format: int32
                                                  type: integer
                                                path:
                                                  type: string
                                              required:
                                                - key
                                                - path
                                              type: object
                                            type: array
                                          optional:
                                            type: boolean
                                          secretName:
                                            type: string
                                        type: object
                                    type: object
                                required:
                                  - subPath
                                  - volumeSource
                                type: object
                              type: array
                            debugLevel:
                              maximum: 10
                              minimum: 0
                              type: integer
                            image:
                              minLength: 1
                              type: string
                            resources:
                              properties:
                                claims:
                                  items:
                                    properties:
                                      name:
                                        type: string
                                    required:
                                      - name
                                    type: object
                                  type: array
                                  x-kubernetes-list-map-keys:
                                    - name
                                  x-kubernetes-list-type: map
                                limits:
                                  additionalProperties:
                                    anyOf:
                                      - type: integer
                                      - type: string
                                    pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                    x-kubernetes-int-or-string: true
                                  type: object
                                requests:
                                  additionalProperties:
                                    anyOf:
                                      - type: integer
                                      - type: string
                                    pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                    x-kubernetes-int-or-string: true
                                  type: object
                              type: object
                            sssdConfigFile:
                              properties:
                                volumeSource:
                                  properties:
                                    configMap:
                                      properties:
                                        defaultMode:
                                          format: int32
                                          type: integer
                                        items:
                                          items:
                                            properties:
                                              key:
                                                type: string
                                              mode:
                                                format: int32
                                                type: integer
                                              path:
                                                type: string
                                            required:
                                              - key
                                              - path
                                            type: object
                                          type: array
                                        name:
                                          type: string
                                        optional:
                                          type: boolean
                                      type: object
                                      x-kubernetes-map-type: atomic
                                    emptyDir:
                                      properties:
                                        medium:
                                          type: string
                                        sizeLimit:
                                          anyOf:
                                            - type: integer
                                            - type: string
                                          pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                          x-kubernetes-int-or-string: true
                                      type: object
                                    hostPath:
                                      properties:
                                        path:
                                          type: string
                                        type:
                                          type: string
                                      required:
                                        - path
                                      type: object
                                    persistentVolumeClaim:
                                      properties:
                                        claimName:
                                          type: string
                                        readOnly:
                                          type: boolean
                                      required:
                                        - claimName
                                      type: object
                                    projected:
                                      properties:
                                        defaultMode:
                                          format: int32
                                          type: integer
                                        sources:
                                          items:
                                            properties:
                                              configMap:
                                                properties:
                                                  items:
                                                    items:
                                                      properties:
                                                        key:
                                                          type: string
                                                        mode:
                                                          format: int32
                                                          type: integer
                                                        path:
                                                          type: string
                                                      required:
                                                        - key
                                                        - path
                                                      type: object
                                                    type: array
                                                  name:
                                                    type: string
                                                  optional:
                                                    type: boolean
                                                type: object
                                                x-kubernetes-map-type: atomic
                                              downwardAPI:
                                                properties:
                                                  items:
                                                    items:
                                                      properties:
                                                        fieldRef:
                                                          properties:
                                                            apiVersion:
                                                              type: string
                                                            fieldPath:
                                                              type: string
                                                          required:
                                                            - fieldPath
                                                          type: object
                                                          x-kubernetes-map-type: atomic
                                                        mode:
                                                          format: int32
                                                          type: integer
                                                        path:
                                                          type: string
                                                        resourceFieldRef:
                                                          properties:
                                                            containerName:
                                                              type: string
                                                            divisor:
                                                              anyOf:
                                                                - type: integer
                                                                - type: string
                                                              pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                                                              x-kubernetes-int-or-string: true
                                                            resource:
                                                              type: string
                                                          required:
                                                            - resource
                                                          type: object
                                                          x-kubernetes-map-type: atomic
                                                      required:
                                                        - path
                                                      type: object
                                                    type: array
                                                type: object
                                              secret:
                                                properties:
                                                  items:
                                                    items:
                                                      properties:
                                                        key:
                                                          type: string
                                                        mode:
                                                          format: int32
                                                          type: integer
                                                        path:
                                                          type: string
                                                      required:
                                                        - key
                                                        - path
                                                      type: object
                                                    type: array
                                                  name:
                                                    type: string
                                                  optional:
                                                    type: boolean
                                                type: object
                                                x-kubernetes-map-type: atomic
                                              serviceAccountToken:
                                                properties:
                                                  audience:
                                                    type: string
                                                  expirationSeconds:
                                                    format: int64
                                                    type: integer
                                                  path:
                                                    type: string
                                                required:
                                                  - path
                                                type: object
                                            type: object
                                          type: array
                                      type: object
                                    secret:
                                      properties:
                                        defaultMode:
                                          format: int32
                                          type: integer
                                        items:
                                          items:
                                            properties:
                                              key:
                                                type: string
                                              mode:
                                                format: int32
                                                type: integer
                                              path:
                                                type: string
                                            required:
                                              - key
                                              - path
                                            type: object
                                          type: array
                                        optional:
                                          type: boolean
                                        secretName:
                                          type: string
                                      type: object
                                  type: object
                              type: object
                          required:
                            - image
                          type: object
                      type: object
                  type: object
                server:
                  properties:
                    active:
                      type: integer
                    annotations:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    hostNetwork:
                      nullable: true
                      type: boolean
                    labels:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    logLevel:
                      type: string
                    placement:
                      nullable: true
                      properties:
                        nodeAffinity:
                          properties:
                            preferredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  preference:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchFields:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  weight:
                                    format: int32
                                    type: integer
                                required:
                                  - preference
                                  - weight
                                type: object
                              type: array
                            requiredDuringSchedulingIgnoredDuringExecution:
                              properties:
                                nodeSelectorTerms:
                                  items:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchFields:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  type: array
                              required:
                                - nodeSelectorTerms
                              type: object
                              x-kubernetes-map-type: atomic
                          type: object
                        podAffinity:
                          properties:
                            preferredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  podAffinityTerm:
                                    properties:
                                      labelSelector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      namespaceSelector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      namespaces:
                                        items:
                                          type: string
                                        type: array
                                      topologyKey:
                                        type: string
                                    required:
                                      - topologyKey
                                    type: object
                                  weight:
                                    format: int32
                                    type: integer
                                required:
                                  - podAffinityTerm
                                  - weight
                                type: object
                              type: array
                            requiredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  labelSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaceSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaces:
                                    items:
                                      type: string
                                    type: array
                                  topologyKey:
                                    type: string
                                required:
                                  - topologyKey
                                type: object
                              type: array
                          type: object
                        podAntiAffinity:
                          properties:
                            preferredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  podAffinityTerm:
                                    properties:
                                      labelSelector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      namespaceSelector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      namespaces:
                                        items:
                                          type: string
                                        type: array
                                      topologyKey:
                                        type: string
                                    required:
                                      - topologyKey
                                    type: object
                                  weight:
                                    format: int32
                                    type: integer
                                required:
                                  - podAffinityTerm
                                  - weight
                                type: object
                              type: array
                            requiredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  labelSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaceSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaces:
                                    items:
                                      type: string
                                    type: array
                                  topologyKey:
                                    type: string
                                required:
                                  - topologyKey
                                type: object
                              type: array
                          type: object
                        tolerations:
                          items:
                            properties:
                              effect:
                                type: string
                              key:
                                type: string
                              operator:
                                type: string
                              tolerationSeconds:
                                format: int64
                                type: integer
                              value:
                                type: string
                            type: object
                          type: array
                        topologySpreadConstraints:
                          items:
                            properties:
                              labelSelector:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchLabels:
                                    additionalProperties:
                                      type: string
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                              matchLabelKeys:
                                items:
                                  type: string
                                type: array
                                x-kubernetes-list-type: atomic
                              maxSkew:
                                format: int32
                                type: integer
                              minDomains:
                                format: int32
                                type: integer
                              nodeAffinityPolicy:
                                type: string
                              nodeTaintsPolicy:
                                type: string
                              topologyKey:
                                type: string
                              whenUnsatisfiable:
                                type: string
                            required:
                              - maxSkew
                              - topologyKey
                              - whenUnsatisfiable
                            type: object
                          type: array
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    priorityClassName:
                      type: string
                    resources:
                      nullable: true
                      properties:
                        claims:
                          items:
                            properties:
                              name:
                                type: string
                            required:
                              - name
                            type: object
                          type: array
                          x-kubernetes-list-map-keys:
                            - name
                          x-kubernetes-list-type: map
                        limits:
                          additionalProperties:
                            anyOf:
                              - type: integer
                              - type: string
                            pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                            x-kubernetes-int-or-string: true
                          type: object
                        requests:
                          additionalProperties:
                            anyOf:
                              - type: integer
                              - type: string
                            pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                            x-kubernetes-int-or-string: true
                          type: object
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                  required:
                    - active
                  type: object
              required:
                - server
              type: object
            status:
              properties:
                conditions:
                  items:
                    properties:
                      lastHeartbeatTime:
                        format: date-time
                        type: string
                      lastTransitionTime:
                        format: date-time
                        type: string
                      message:
                        type: string
                      reason:
                        type: string
                      status:
                        type: string
                      type:
                        type: string
                    type: object
                  type: array
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephobjectrealms.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephObjectRealm
    listKind: CephObjectRealmList
    plural: cephobjectrealms
    singular: cephobjectrealm
  scope: Namespaced
  versions:
    - name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              nullable: true
              properties:
                pull:
                  properties:
                    endpoint:
                      pattern: ^https*://
                      type: string
                  type: object
              type: object
            status:
              properties:
                conditions:
                  items:
                    properties:
                      lastHeartbeatTime:
                        format: date-time
                        type: string
                      lastTransitionTime:
                        format: date-time
                        type: string
                      message:
                        type: string
                      reason:
                        type: string
                      status:
                        type: string
                      type:
                        type: string
                    type: object
                  type: array
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephobjectstores.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephObjectStore
    listKind: CephObjectStoreList
    plural: cephobjectstores
    singular: cephobjectstore
  scope: Namespaced
  versions:
    - additionalPrinterColumns:
        - jsonPath: .status.phase
          name: Phase
          type: string
      name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                dataPool:
                  nullable: true
                  properties:
                    compressionMode:
                      enum:
                        - none
                        - passive
                        - aggressive
                        - force
                        - ""
                      nullable: true
                      type: string
                    crushRoot:
                      nullable: true
                      type: string
                    deviceClass:
                      nullable: true
                      type: string
                    enableRBDStats:
                      type: boolean
                    erasureCoded:
                      properties:
                        algorithm:
                          type: string
                        codingChunks:
                          minimum: 0
                          type: integer
                        dataChunks:
                          minimum: 0
                          type: integer
                      required:
                        - codingChunks
                        - dataChunks
                      type: object
                    failureDomain:
                      type: string
                    mirroring:
                      properties:
                        enabled:
                          type: boolean
                        mode:
                          type: string
                        peers:
                          nullable: true
                          properties:
                            secretNames:
                              items:
                                type: string
                              type: array
                          type: object
                        snapshotSchedules:
                          items:
                            properties:
                              interval:
                                type: string
                              path:
                                type: string
                              startTime:
                                type: string
                            type: object
                          type: array
                      type: object
                    parameters:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    quotas:
                      nullable: true
                      properties:
                        maxBytes:
                          format: int64
                          type: integer
                        maxObjects:
                          format: int64
                          type: integer
                        maxSize:
                          pattern: ^[0-9]+[\.]?[0-9]*([KMGTPE]i|[kMGTPE])?$
                          type: string
                      type: object
                    replicated:
                      properties:
                        hybridStorage:
                          nullable: true
                          properties:
                            primaryDeviceClass:
                              minLength: 1
                              type: string
                            secondaryDeviceClass:
                              minLength: 1
                              type: string
                          required:
                            - primaryDeviceClass
                            - secondaryDeviceClass
                          type: object
                        replicasPerFailureDomain:
                          minimum: 1
                          type: integer
                        requireSafeReplicaSize:
                          type: boolean
                        size:
                          minimum: 0
                          type: integer
                        subFailureDomain:
                          type: string
                        targetSizeRatio:
                          type: number
                      required:
                        - size
                      type: object
                    statusCheck:
                      properties:
                        mirror:
                          nullable: true
                          properties:
                            disabled:
                              type: boolean
                            interval:
                              type: string
                            timeout:
                              type: string
                          type: object
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                  type: object
                gateway:
                  nullable: true
                  properties:
                    annotations:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    caBundleRef:
                      nullable: true
                      type: string
                    dashboardEnabled:
                      nullable: true
                      type: boolean
                      x-kubernetes-preserve-unknown-fields: true
                    externalRgwEndpoints:
                      items:
                        properties:
                          hostname:
                            type: string
                          ip:
                            type: string
                        type: object
                        x-kubernetes-map-type: atomic
                      nullable: true
                      type: array
                    hostNetwork:
                      nullable: true
                      type: boolean
                      x-kubernetes-preserve-unknown-fields: true
                    instances:
                      format: int32
                      nullable: true
                      type: integer
                    labels:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    placement:
                      nullable: true
                      properties:
                        nodeAffinity:
                          properties:
                            preferredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  preference:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchFields:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  weight:
                                    format: int32
                                    type: integer
                                required:
                                  - preference
                                  - weight
                                type: object
                              type: array
                            requiredDuringSchedulingIgnoredDuringExecution:
                              properties:
                                nodeSelectorTerms:
                                  items:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchFields:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  type: array
                              required:
                                - nodeSelectorTerms
                              type: object
                              x-kubernetes-map-type: atomic
                          type: object
                        podAffinity:
                          properties:
                            preferredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  podAffinityTerm:
                                    properties:
                                      labelSelector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      namespaceSelector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      namespaces:
                                        items:
                                          type: string
                                        type: array
                                      topologyKey:
                                        type: string
                                    required:
                                      - topologyKey
                                    type: object
                                  weight:
                                    format: int32
                                    type: integer
                                required:
                                  - podAffinityTerm
                                  - weight
                                type: object
                              type: array
                            requiredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  labelSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaceSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaces:
                                    items:
                                      type: string
                                    type: array
                                  topologyKey:
                                    type: string
                                required:
                                  - topologyKey
                                type: object
                              type: array
                          type: object
                        podAntiAffinity:
                          properties:
                            preferredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  podAffinityTerm:
                                    properties:
                                      labelSelector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      namespaceSelector:
                                        properties:
                                          matchExpressions:
                                            items:
                                              properties:
                                                key:
                                                  type: string
                                                operator:
                                                  type: string
                                                values:
                                                  items:
                                                    type: string
                                                  type: array
                                              required:
                                                - key
                                                - operator
                                              type: object
                                            type: array
                                          matchLabels:
                                            additionalProperties:
                                              type: string
                                            type: object
                                        type: object
                                        x-kubernetes-map-type: atomic
                                      namespaces:
                                        items:
                                          type: string
                                        type: array
                                      topologyKey:
                                        type: string
                                    required:
                                      - topologyKey
                                    type: object
                                  weight:
                                    format: int32
                                    type: integer
                                required:
                                  - podAffinityTerm
                                  - weight
                                type: object
                              type: array
                            requiredDuringSchedulingIgnoredDuringExecution:
                              items:
                                properties:
                                  labelSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaceSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaces:
                                    items:
                                      type: string
                                    type: array
                                  topologyKey:
                                    type: string
                                required:
                                  - topologyKey
                                type: object
                              type: array
                          type: object
                        tolerations:
                          items:
                            properties:
                              effect:
                                type: string
                              key:
                                type: string
                              operator:
                                type: string
                              tolerationSeconds:
                                format: int64
                                type: integer
                              value:
                                type: string
                            type: object
                          type: array
                        topologySpreadConstraints:
                          items:
                            properties:
                              labelSelector:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchLabels:
                                    additionalProperties:
                                      type: string
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                              matchLabelKeys:
                                items:
                                  type: string
                                type: array
                                x-kubernetes-list-type: atomic
                              maxSkew:
                                format: int32
                                type: integer
                              minDomains:
                                format: int32
                                type: integer
                              nodeAffinityPolicy:
                                type: string
                              nodeTaintsPolicy:
                                type: string
                              topologyKey:
                                type: string
                              whenUnsatisfiable:
                                type: string
                            required:
                              - maxSkew
                              - topologyKey
                              - whenUnsatisfiable
                            type: object
                          type: array
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    port:
                      format: int32
                      type: integer
                    priorityClassName:
                      type: string
                    resources:
                      nullable: true
                      properties:
                        claims:
                          items:
                            properties:
                              name:
                                type: string
                            required:
                              - name
                            type: object
                          type: array
                          x-kubernetes-list-map-keys:
                            - name
                          x-kubernetes-list-type: map
                        limits:
                          additionalProperties:
                            anyOf:
                              - type: integer
                              - type: string
                            pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                            x-kubernetes-int-or-string: true
                          type: object
                        requests:
                          additionalProperties:
                            anyOf:
                              - type: integer
                              - type: string
                            pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                            x-kubernetes-int-or-string: true
                          type: object
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    securePort:
                      format: int32
                      maximum: 65535
                      minimum: 0
                      nullable: true
                      type: integer
                    service:
                      nullable: true
                      properties:
                        annotations:
                          additionalProperties:
                            type: string
                          type: object
                      type: object
                    sslCertificateRef:
                      nullable: true
                      type: string
                  type: object
                healthCheck:
                  nullable: true
                  properties:
                    readinessProbe:
                      properties:
                        disabled:
                          type: boolean
                        probe:
                          properties:
                            exec:
                              properties:
                                command:
                                  items:
                                    type: string
                                  type: array
                              type: object
                            failureThreshold:
                              format: int32
                              type: integer
                            grpc:
                              properties:
                                port:
                                  format: int32
                                  type: integer
                                service:
                                  type: string
                              required:
                                - port
                              type: object
                            httpGet:
                              properties:
                                host:
                                  type: string
                                httpHeaders:
                                  items:
                                    properties:
                                      name:
                                        type: string
                                      value:
                                        type: string
                                    required:
                                      - name
                                      - value
                                    type: object
                                  type: array
                                path:
                                  type: string
                                port:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  x-kubernetes-int-or-string: true
                                scheme:
                                  type: string
                              required:
                                - port
                              type: object
                            initialDelaySeconds:
                              format: int32
                              type: integer
                            periodSeconds:
                              format: int32
                              type: integer
                            successThreshold:
                              format: int32
                              type: integer
                            tcpSocket:
                              properties:
                                host:
                                  type: string
                                port:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  x-kubernetes-int-or-string: true
                              required:
                                - port
                              type: object
                            terminationGracePeriodSeconds:
                              format: int64
                              type: integer
                            timeoutSeconds:
                              format: int32
                              type: integer
                          type: object
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    startupProbe:
                      properties:
                        disabled:
                          type: boolean
                        probe:
                          properties:
                            exec:
                              properties:
                                command:
                                  items:
                                    type: string
                                  type: array
                              type: object
                            failureThreshold:
                              format: int32
                              type: integer
                            grpc:
                              properties:
                                port:
                                  format: int32
                                  type: integer
                                service:
                                  type: string
                              required:
                                - port
                              type: object
                            httpGet:
                              properties:
                                host:
                                  type: string
                                httpHeaders:
                                  items:
                                    properties:
                                      name:
                                        type: string
                                      value:
                                        type: string
                                    required:
                                      - name
                                      - value
                                    type: object
                                  type: array
                                path:
                                  type: string
                                port:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  x-kubernetes-int-or-string: true
                                scheme:
                                  type: string
                              required:
                                - port
                              type: object
                            initialDelaySeconds:
                              format: int32
                              type: integer
                            periodSeconds:
                              format: int32
                              type: integer
                            successThreshold:
                              format: int32
                              type: integer
                            tcpSocket:
                              properties:
                                host:
                                  type: string
                                port:
                                  anyOf:
                                    - type: integer
                                    - type: string
                                  x-kubernetes-int-or-string: true
                              required:
                                - port
                              type: object
                            terminationGracePeriodSeconds:
                              format: int64
                              type: integer
                            timeoutSeconds:
                              format: int32
                              type: integer
                          type: object
                      type: object
                  type: object
                metadataPool:
                  nullable: true
                  properties:
                    compressionMode:
                      enum:
                        - none
                        - passive
                        - aggressive
                        - force
                        - ""
                      nullable: true
                      type: string
                    crushRoot:
                      nullable: true
                      type: string
                    deviceClass:
                      nullable: true
                      type: string
                    enableRBDStats:
                      type: boolean
                    erasureCoded:
                      properties:
                        algorithm:
                          type: string
                        codingChunks:
                          minimum: 0
                          type: integer
                        dataChunks:
                          minimum: 0
                          type: integer
                      required:
                        - codingChunks
                        - dataChunks
                      type: object
                    failureDomain:
                      type: string
                    mirroring:
                      properties:
                        enabled:
                          type: boolean
                        mode:
                          type: string
                        peers:
                          nullable: true
                          properties:
                            secretNames:
                              items:
                                type: string
                              type: array
                          type: object
                        snapshotSchedules:
                          items:
                            properties:
                              interval:
                                type: string
                              path:
                                type: string
                              startTime:
                                type: string
                            type: object
                          type: array
                      type: object
                    parameters:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    quotas:
                      nullable: true
                      properties:
                        maxBytes:
                          format: int64
                          type: integer
                        maxObjects:
                          format: int64
                          type: integer
                        maxSize:
                          pattern: ^[0-9]+[\.]?[0-9]*([KMGTPE]i|[kMGTPE])?$
                          type: string
                      type: object
                    replicated:
                      properties:
                        hybridStorage:
                          nullable: true
                          properties:
                            primaryDeviceClass:
                              minLength: 1
                              type: string
                            secondaryDeviceClass:
                              minLength: 1
                              type: string
                          required:
                            - primaryDeviceClass
                            - secondaryDeviceClass
                          type: object
                        replicasPerFailureDomain:
                          minimum: 1
                          type: integer
                        requireSafeReplicaSize:
                          type: boolean
                        size:
                          minimum: 0
                          type: integer
                        subFailureDomain:
                          type: string
                        targetSizeRatio:
                          type: number
                      required:
                        - size
                      type: object
                    statusCheck:
                      properties:
                        mirror:
                          nullable: true
                          properties:
                            disabled:
                              type: boolean
                            interval:
                              type: string
                            timeout:
                              type: string
                          type: object
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                  type: object
                preservePoolsOnDelete:
                  type: boolean
                security:
                  nullable: true
                  properties:
                    keyRotation:
                      nullable: true
                      properties:
                        enabled:
                          default: false
                          type: boolean
                        schedule:
                          type: string
                      type: object
                    kms:
                      nullable: true
                      properties:
                        connectionDetails:
                          additionalProperties:
                            type: string
                          nullable: true
                          type: object
                          x-kubernetes-preserve-unknown-fields: true
                        tokenSecretName:
                          type: string
                      type: object
                    s3:
                      nullable: true
                      properties:
                        connectionDetails:
                          additionalProperties:
                            type: string
                          nullable: true
                          type: object
                          x-kubernetes-preserve-unknown-fields: true
                        tokenSecretName:
                          type: string
                      type: object
                  type: object
                zone:
                  nullable: true
                  properties:
                    name:
                      type: string
                  required:
                    - name
                  type: object
              type: object
            status:
              properties:
                conditions:
                  items:
                    properties:
                      lastHeartbeatTime:
                        format: date-time
                        type: string
                      lastTransitionTime:
                        format: date-time
                        type: string
                      message:
                        type: string
                      reason:
                        type: string
                      status:
                        type: string
                      type:
                        type: string
                    type: object
                  type: array
                endpoints:
                  properties:
                    insecure:
                      items:
                        type: string
                      nullable: true
                      type: array
                    secure:
                      items:
                        type: string
                      nullable: true
                      type: array
                  type: object
                info:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                message:
                  type: string
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephobjectstoreusers.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephObjectStoreUser
    listKind: CephObjectStoreUserList
    plural: cephobjectstoreusers
    shortNames:
      - rcou
      - objectuser
    singular: cephobjectstoreuser
  scope: Namespaced
  versions:
    - additionalPrinterColumns:
        - jsonPath: .status.phase
          name: Phase
          type: string
      name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                capabilities:
                  nullable: true
                  properties:
                    amz-cache:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    bilog:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    bucket:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    datalog:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    info:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    mdlog:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    metadata:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    oidc-provider:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    ratelimit:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    roles:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    usage:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    user:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    user-policy:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                    zone:
                      enum:
                        - '*'
                        - read
                        - write
                        - read, write
                      type: string
                  type: object
                displayName:
                  type: string
                quotas:
                  nullable: true
                  properties:
                    maxBuckets:
                      nullable: true
                      type: integer
                    maxObjects:
                      format: int64
                      nullable: true
                      type: integer
                    maxSize:
                      anyOf:
                        - type: integer
                        - type: string
                      nullable: true
                      pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                      x-kubernetes-int-or-string: true
                  type: object
                store:
                  type: string
              type: object
            status:
              properties:
                info:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephobjectzonegroups.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephObjectZoneGroup
    listKind: CephObjectZoneGroupList
    plural: cephobjectzonegroups
    singular: cephobjectzonegroup
  scope: Namespaced
  versions:
    - additionalPrinterColumns:
        - jsonPath: .status.phase
          name: Phase
          type: string
      name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                realm:
                  type: string
              required:
                - realm
              type: object
            status:
              properties:
                conditions:
                  items:
                    properties:
                      lastHeartbeatTime:
                        format: date-time
                        type: string
                      lastTransitionTime:
                        format: date-time
                        type: string
                      message:
                        type: string
                      reason:
                        type: string
                      status:
                        type: string
                      type:
                        type: string
                    type: object
                  type: array
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephobjectzones.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephObjectZone
    listKind: CephObjectZoneList
    plural: cephobjectzones
    singular: cephobjectzone
  scope: Namespaced
  versions:
    - additionalPrinterColumns:
        - jsonPath: .status.phase
          name: Phase
          type: string
      name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                customEndpoints:
                  items:
                    type: string
                  nullable: true
                  type: array
                dataPool:
                  nullable: true
                  properties:
                    compressionMode:
                      enum:
                        - none
                        - passive
                        - aggressive
                        - force
                        - ""
                      nullable: true
                      type: string
                    crushRoot:
                      nullable: true
                      type: string
                    deviceClass:
                      nullable: true
                      type: string
                    enableRBDStats:
                      type: boolean
                    erasureCoded:
                      properties:
                        algorithm:
                          type: string
                        codingChunks:
                          minimum: 0
                          type: integer
                        dataChunks:
                          minimum: 0
                          type: integer
                      required:
                        - codingChunks
                        - dataChunks
                      type: object
                    failureDomain:
                      type: string
                    mirroring:
                      properties:
                        enabled:
                          type: boolean
                        mode:
                          type: string
                        peers:
                          nullable: true
                          properties:
                            secretNames:
                              items:
                                type: string
                              type: array
                          type: object
                        snapshotSchedules:
                          items:
                            properties:
                              interval:
                                type: string
                              path:
                                type: string
                              startTime:
                                type: string
                            type: object
                          type: array
                      type: object
                    parameters:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    quotas:
                      nullable: true
                      properties:
                        maxBytes:
                          format: int64
                          type: integer
                        maxObjects:
                          format: int64
                          type: integer
                        maxSize:
                          pattern: ^[0-9]+[\.]?[0-9]*([KMGTPE]i|[kMGTPE])?$
                          type: string
                      type: object
                    replicated:
                      properties:
                        hybridStorage:
                          nullable: true
                          properties:
                            primaryDeviceClass:
                              minLength: 1
                              type: string
                            secondaryDeviceClass:
                              minLength: 1
                              type: string
                          required:
                            - primaryDeviceClass
                            - secondaryDeviceClass
                          type: object
                        replicasPerFailureDomain:
                          minimum: 1
                          type: integer
                        requireSafeReplicaSize:
                          type: boolean
                        size:
                          minimum: 0
                          type: integer
                        subFailureDomain:
                          type: string
                        targetSizeRatio:
                          type: number
                      required:
                        - size
                      type: object
                    statusCheck:
                      properties:
                        mirror:
                          nullable: true
                          properties:
                            disabled:
                              type: boolean
                            interval:
                              type: string
                            timeout:
                              type: string
                          type: object
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                  type: object
                metadataPool:
                  nullable: true
                  properties:
                    compressionMode:
                      enum:
                        - none
                        - passive
                        - aggressive
                        - force
                        - ""
                      nullable: true
                      type: string
                    crushRoot:
                      nullable: true
                      type: string
                    deviceClass:
                      nullable: true
                      type: string
                    enableRBDStats:
                      type: boolean
                    erasureCoded:
                      properties:
                        algorithm:
                          type: string
                        codingChunks:
                          minimum: 0
                          type: integer
                        dataChunks:
                          minimum: 0
                          type: integer
                      required:
                        - codingChunks
                        - dataChunks
                      type: object
                    failureDomain:
                      type: string
                    mirroring:
                      properties:
                        enabled:
                          type: boolean
                        mode:
                          type: string
                        peers:
                          nullable: true
                          properties:
                            secretNames:
                              items:
                                type: string
                              type: array
                          type: object
                        snapshotSchedules:
                          items:
                            properties:
                              interval:
                                type: string
                              path:
                                type: string
                              startTime:
                                type: string
                            type: object
                          type: array
                      type: object
                    parameters:
                      additionalProperties:
                        type: string
                      nullable: true
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                    quotas:
                      nullable: true
                      properties:
                        maxBytes:
                          format: int64
                          type: integer
                        maxObjects:
                          format: int64
                          type: integer
                        maxSize:
                          pattern: ^[0-9]+[\.]?[0-9]*([KMGTPE]i|[kMGTPE])?$
                          type: string
                      type: object
                    replicated:
                      properties:
                        hybridStorage:
                          nullable: true
                          properties:
                            primaryDeviceClass:
                              minLength: 1
                              type: string
                            secondaryDeviceClass:
                              minLength: 1
                              type: string
                          required:
                            - primaryDeviceClass
                            - secondaryDeviceClass
                          type: object
                        replicasPerFailureDomain:
                          minimum: 1
                          type: integer
                        requireSafeReplicaSize:
                          type: boolean
                        size:
                          minimum: 0
                          type: integer
                        subFailureDomain:
                          type: string
                        targetSizeRatio:
                          type: number
                      required:
                        - size
                      type: object
                    statusCheck:
                      properties:
                        mirror:
                          nullable: true
                          properties:
                            disabled:
                              type: boolean
                            interval:
                              type: string
                            timeout:
                              type: string
                          type: object
                      type: object
                      x-kubernetes-preserve-unknown-fields: true
                  type: object
                preservePoolsOnDelete:
                  default: true
                  type: boolean
                zoneGroup:
                  type: string
              required:
                - dataPool
                - metadataPool
                - zoneGroup
              type: object
            status:
              properties:
                conditions:
                  items:
                    properties:
                      lastHeartbeatTime:
                        format: date-time
                        type: string
                      lastTransitionTime:
                        format: date-time
                        type: string
                      message:
                        type: string
                      reason:
                        type: string
                      status:
                        type: string
                      type:
                        type: string
                    type: object
                  type: array
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  name: cephrbdmirrors.ceph.rook.io
spec:
  group: ceph.rook.io
  names:
    kind: CephRBDMirror
    listKind: CephRBDMirrorList
    plural: cephrbdmirrors
    singular: cephrbdmirror
  scope: Namespaced
  versions:
    - additionalPrinterColumns:
        - jsonPath: .status.phase
          name: Phase
          type: string
      name: v1
      schema:
        openAPIV3Schema:
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              properties:
                annotations:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                count:
                  minimum: 1
                  type: integer
                labels:
                  additionalProperties:
                    type: string
                  nullable: true
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                peers:
                  nullable: true
                  properties:
                    secretNames:
                      items:
                        type: string
                      type: array
                  type: object
                placement:
                  nullable: true
                  properties:
                    nodeAffinity:
                      properties:
                        preferredDuringSchedulingIgnoredDuringExecution:
                          items:
                            properties:
                              preference:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchFields:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                type: object
                                x-kubernetes-map-type: atomic
                              weight:
                                format: int32
                                type: integer
                            required:
                              - preference
                              - weight
                            type: object
                          type: array
                        requiredDuringSchedulingIgnoredDuringExecution:
                          properties:
                            nodeSelectorTerms:
                              items:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchFields:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                type: object
                                x-kubernetes-map-type: atomic
                              type: array
                          required:
                            - nodeSelectorTerms
                          type: object
                          x-kubernetes-map-type: atomic
                      type: object
                    podAffinity:
                      properties:
                        preferredDuringSchedulingIgnoredDuringExecution:
                          items:
                            properties:
                              podAffinityTerm:
                                properties:
                                  labelSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaceSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaces:
                                    items:
                                      type: string
                                    type: array
                                  topologyKey:
                                    type: string
                                required:
                                  - topologyKey
                                type: object
                              weight:
                                format: int32
                                type: integer
                            required:
                              - podAffinityTerm
                              - weight
                            type: object
                          type: array
                        requiredDuringSchedulingIgnoredDuringExecution:
                          items:
                            properties:
                              labelSelector:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchLabels:
                                    additionalProperties:
                                      type: string
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                              namespaceSelector:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchLabels:
                                    additionalProperties:
                                      type: string
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                              namespaces:
                                items:
                                  type: string
                                type: array
                              topologyKey:
                                type: string
                            required:
                              - topologyKey
                            type: object
                          type: array
                      type: object
                    podAntiAffinity:
                      properties:
                        preferredDuringSchedulingIgnoredDuringExecution:
                          items:
                            properties:
                              podAffinityTerm:
                                properties:
                                  labelSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaceSelector:
                                    properties:
                                      matchExpressions:
                                        items:
                                          properties:
                                            key:
                                              type: string
                                            operator:
                                              type: string
                                            values:
                                              items:
                                                type: string
                                              type: array
                                          required:
                                            - key
                                            - operator
                                          type: object
                                        type: array
                                      matchLabels:
                                        additionalProperties:
                                          type: string
                                        type: object
                                    type: object
                                    x-kubernetes-map-type: atomic
                                  namespaces:
                                    items:
                                      type: string
                                    type: array
                                  topologyKey:
                                    type: string
                                required:
                                  - topologyKey
                                type: object
                              weight:
                                format: int32
                                type: integer
                            required:
                              - podAffinityTerm
                              - weight
                            type: object
                          type: array
                        requiredDuringSchedulingIgnoredDuringExecution:
                          items:
                            properties:
                              labelSelector:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchLabels:
                                    additionalProperties:
                                      type: string
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                              namespaceSelector:
                                properties:
                                  matchExpressions:
                                    items:
                                      properties:
                                        key:
                                          type: string
                                        operator:
                                          type: string
                                        values:
                                          items:
                                            type: string
                                          type: array
                                      required:
                                        - key
                                        - operator
                                      type: object
                                    type: array
                                  matchLabels:
                                    additionalProperties:
                                      type: string
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                              namespaces:
                                items:
                                  type: string
                                type: array
                              topologyKey:
                                type: string
                            required:
                              - topologyKey
                            type: object
                          type: array
                      type: object
                    tolerations:
                      items:
                        properties:
                          effect:
                            type: string
                          key:
                            type: string
                          operator:
                            type: string
                          tolerationSeconds:
                            format: int64
                            type: integer
                          value:
                            type: string
                        type: object
                      type: array
                    topologySpreadConstraints:
                      items:
                        properties:
                          labelSelector:
                            properties:
                              matchExpressions:
                                items:
                                  properties:
                                    key:
                                      type: string
                                    operator:
                                      type: string
                                    values:
                                      items:
                                        type: string
                                      type: array
                                  required:
                                    - key
                                    - operator
                                  type: object
                                type: array
                              matchLabels:
                                additionalProperties:
                                  type: string
                                type: object
                            type: object
                            x-kubernetes-map-type: atomic
                          matchLabelKeys:
                            items:
                              type: string
                            type: array
                            x-kubernetes-list-type: atomic
                          maxSkew:
                            format: int32
                            type: integer
                          minDomains:
                            format: int32
                            type: integer
                          nodeAffinityPolicy:
                            type: string
                          nodeTaintsPolicy:
                            type: string
                          topologyKey:
                            type: string
                          whenUnsatisfiable:
                            type: string
                        required:
                          - maxSkew
                          - topologyKey
                          - whenUnsatisfiable
                        type: object
                      type: array
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                priorityClassName:
                  type: string
                resources:
                  nullable: true
                  properties:
                    claims:
                      items:
                        properties:
                          name:
                            type: string
                        required:
                          - name
                        type: object
                      type: array
                      x-kubernetes-list-map-keys:
                        - name
                      x-kubernetes-list-type: map
                    limits:
                      additionalProperties:
                        anyOf:
                          - type: integer
                          - type: string
                        pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                        x-kubernetes-int-or-string: true
                      type: object
                    requests:
                      additionalProperties:
                        anyOf:
                          - type: integer
                          - type: string
                        pattern: ^(\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))(([KMGTPE]i)|[numkMGTPE]|([eE](\+|-)?(([0-9]+(\.[0-9]*)?)|(\.[0-9]+))))?$
                        x-kubernetes-int-or-string: true
                      type: object
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
              required:
                - count
              type: object
            status:
              properties:
                conditions:
                  items:
                    properties:
                      lastHeartbeatTime:
                        format: date-time
                        type: string
                      lastTransitionTime:
                        format: date-time
                        type: string
                      message:
                        type: string
                      reason:
                        type: string
                      status:
                        type: string
                      type:
                        type: string
                    type: object
                  type: array
                observedGeneration:
                  format: int64
                  type: integer
                phase:
                  type: string
              type: object
              x-kubernetes-preserve-unknown-fields: true
          required:
            - metadata
            - spec
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: objectbucketclaims.objectbucket.io
spec:
  group: objectbucket.io
  names:
    kind: ObjectBucketClaim
    listKind: ObjectBucketClaimList
    plural: objectbucketclaims
    singular: objectbucketclaim
    shortNames:
      - obc
      - obcs
  scope: Namespaced
  versions:
    - name: v1alpha1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                storageClassName:
                  type: string
                bucketName:
                  type: string
                generateBucketName:
                  type: string
                additionalConfig:
                  type: object
                  nullable: true
                  x-kubernetes-preserve-unknown-fields: true
                objectBucketName:
                  type: string
            status:
              type: object
              x-kubernetes-preserve-unknown-fields: true
      subresources:
        status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: objectbuckets.objectbucket.io
spec:
  group: objectbucket.io
  names:
    kind: ObjectBucket
    listKind: ObjectBucketList
    plural: objectbuckets
    singular: objectbucket
    shortNames:
      - ob
      - obs
  scope: Cluster
  versions:
    - name: v1alpha1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                storageClassName:
                  type: string
                endpoint:
                  type: object
                  nullable: true
                  properties:
                    bucketHost:
                      type: string
                    bucketPort:
                      type: integer
                      format: int32
                    bucketName:
                      type: string
                    region:
                      type: string
                    subRegion:
                      type: string
                    additionalConfig:
                      type: object
                      nullable: true
                      x-kubernetes-preserve-unknown-fields: true
                authentication:
                  type: object
                  nullable: true
                  items:
                    type: object
                    x-kubernetes-preserve-unknown-fields: true
                additionalState:
                  type: object
                  nullable: true
                  x-kubernetes-preserve-unknown-fields: true
                reclaimPolicy:
                  type: string
                claimRef:
                  type: object
                  nullable: true
                  x-kubernetes-preserve-unknown-fields: true
            status:
              type: object
              x-kubernetes-preserve-unknown-fields: true
      subresources:
        status: {}

```

## 创建启动Operator和ceph集群所需的公共资源

```yaml
# Namespace where the operator and other rook resources are created
apiVersion: v1
kind: Namespace
metadata:
  name: rook-ceph # namespace:cluster
---
# TODO: remove this, once https://github.com/rook/rook/issues/10141
# is resolved.
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: cephfs-csi-nodeplugin
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get"]
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: cephfs-external-provisioner-runner
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["persistentvolumes"]
    verbs: ["get", "list", "watch", "create", "delete", "patch"]
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "patch", "update"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["list", "watch", "create", "update", "patch"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["volumeattachments"]
    verbs: ["get", "list", "watch", "patch"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["volumeattachments/status"]
    verbs: ["patch"]
  - apiGroups: [""]
    resources: ["persistentvolumeclaims/status"]
    verbs: ["patch"]
  - apiGroups: ["snapshot.storage.k8s.io"]
    resources: ["volumesnapshots"]
    verbs: ["get", "list"]
  - apiGroups: ["snapshot.storage.k8s.io"]
    resources: ["volumesnapshotclasses"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["snapshot.storage.k8s.io"]
    resources: ["volumesnapshotcontents"]
    verbs: ["get", "list", "watch", "patch", "update"]
  - apiGroups: ["snapshot.storage.k8s.io"]
    resources: ["volumesnapshotcontents/status"]
    verbs: ["update", "patch"]
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rbd-csi-nodeplugin
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["persistentvolumes"]
    verbs: ["get", "list"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["volumeattachments"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["serviceaccounts/token"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get"]
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rbd-external-provisioner-runner
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["persistentvolumes"]
    verbs: ["get", "list", "watch", "create", "delete", "patch"]
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "update"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["list", "watch", "create", "update", "patch"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["volumeattachments"]
    verbs: ["get", "list", "watch", "patch"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["volumeattachments/status"]
    verbs: ["patch"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["csinodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["persistentvolumeclaims/status"]
    verbs: ["patch"]
  - apiGroups: ["snapshot.storage.k8s.io"]
    resources: ["volumesnapshots"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["snapshot.storage.k8s.io"]
    resources: ["volumesnapshotclasses"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["snapshot.storage.k8s.io"]
    resources: ["volumesnapshotcontents"]
    verbs: ["get", "list", "watch", "patch", "update"]
  - apiGroups: ["snapshot.storage.k8s.io"]
    resources: ["volumesnapshotcontents/status"]
    verbs: ["update", "patch"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["serviceaccounts/token"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["csinodes"]
    verbs: ["get", "list", "watch"]
---
# The cluster role for managing all the cluster-specific resources in a namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: rook-ceph-cluster-mgmt
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
rules:
  - apiGroups:
      - ""
      - apps
      - extensions
    resources:
      - secrets
      - pods
      - pods/log
      - services
      - configmaps
      - deployments
      - daemonsets
    verbs:
      - get
      - list
      - watch
      - patch
      - create
      - update
      - delete
---
# The cluster role for managing the Rook CRDs
apiVersion: rbac.authorization.k8s.io/v1
# Rook watches for its CRDs in all namespaces, so this should be a cluster-scoped role unless the
# operator config `ROOK_CURRENT_NAMESPACE_ONLY=true`.
kind: ClusterRole
metadata:
  name: rook-ceph-global
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
rules:
  - apiGroups:
      - ""
    resources:
      # Pod access is needed for fencing
      - pods
      # Node access is needed for determining nodes where mons should run
      - nodes
      - nodes/proxy
      - services
      # Rook watches secrets which it uses to configure access to external resources.
      # e.g., external Ceph cluster; TLS certificates for the admission controller or object store
      - secrets
      # Rook watches for changes to the rook-operator-config configmap
      - configmaps
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - ""
    resources:
      # Rook creates events for its custom resources
      - events
      # Rook creates PVs and PVCs for OSDs managed by the Rook provisioner
      - persistentvolumes
      - persistentvolumeclaims
      # Rook creates endpoints for mgr and object store access
      - endpoints
    verbs:
      - get
      - list
      - watch
      - patch
      - create
      - update
      - delete
  - apiGroups:
      - storage.k8s.io
    resources:
      - storageclasses
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - batch
    resources:
      - jobs
      - cronjobs
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - delete
      - deletecollection
  # The Rook operator must be able to watch all ceph.rook.io resources to reconcile them.
  - apiGroups: ["ceph.rook.io"]
    resources:
      - cephclients
      - cephclusters
      - cephblockpools
      - cephfilesystems
      - cephnfses
      - cephobjectstores
      - cephobjectstoreusers
      - cephobjectrealms
      - cephobjectzonegroups
      - cephobjectzones
      - cephbuckettopics
      - cephbucketnotifications
      - cephrbdmirrors
      - cephfilesystemmirrors
      - cephfilesystemsubvolumegroups
      - cephblockpoolradosnamespaces
    verbs:
      - get
      - list
      - watch
      # Ideally the update permission is not required, but Rook needs it to add finalizers to resources.
      - update
  # Rook must have update access to status subresources for its custom resources.
  - apiGroups: ["ceph.rook.io"]
    resources:
      - cephclients/status
      - cephclusters/status
      - cephblockpools/status
      - cephfilesystems/status
      - cephnfses/status
      - cephobjectstores/status
      - cephobjectstoreusers/status
      - cephobjectrealms/status
      - cephobjectzonegroups/status
      - cephobjectzones/status
      - cephbuckettopics/status
      - cephbucketnotifications/status
      - cephrbdmirrors/status
      - cephfilesystemmirrors/status
      - cephfilesystemsubvolumegroups/status
      - cephblockpoolradosnamespaces/status
    verbs: ["update"]
  # The "*/finalizers" permission may need to be strictly given for K8s clusters where
  # OwnerReferencesPermissionEnforcement is enabled so that Rook can set blockOwnerDeletion on
  # resources owned by Rook CRs (e.g., a Secret owned by an OSD Deployment). See more:
  # https://kubernetes.io/docs/reference/access-authn-authz/_print/#ownerreferencespermissionenforcement
  - apiGroups: ["ceph.rook.io"]
    resources:
      - cephclients/finalizers
      - cephclusters/finalizers
      - cephblockpools/finalizers
      - cephfilesystems/finalizers
      - cephnfses/finalizers
      - cephobjectstores/finalizers
      - cephobjectstoreusers/finalizers
      - cephobjectrealms/finalizers
      - cephobjectzonegroups/finalizers
      - cephobjectzones/finalizers
      - cephbuckettopics/finalizers
      - cephbucketnotifications/finalizers
      - cephrbdmirrors/finalizers
      - cephfilesystemmirrors/finalizers
      - cephfilesystemsubvolumegroups/finalizers
      - cephblockpoolradosnamespaces/finalizers
    verbs: ["update"]
  - apiGroups:
      - policy
      - apps
      - extensions
    resources:
      # This is for the clusterdisruption controller
      - poddisruptionbudgets
      # This is for both clusterdisruption and nodedrain controllers
      - deployments
      - replicasets
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - delete
      - deletecollection
  - apiGroups:
      - apps
    resources:
      # This is to add osd deployment owner ref on key rotation
      # cron jobs.
      - deployments/finalizers
    verbs:
      - update
  - apiGroups:
      - healthchecking.openshift.io
    resources:
      - machinedisruptionbudgets
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - delete
  - apiGroups:
      - machine.openshift.io
    resources:
      - machines
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - delete
  - apiGroups:
      - storage.k8s.io
    resources:
      - csidrivers
    verbs:
      - create
      - delete
      - get
      - update
  - apiGroups:
      - k8s.cni.cncf.io
    resources:
      - network-attachment-definitions
    verbs:
      - get
---
# Aspects of ceph-mgr that require cluster-wide access
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-mgr-cluster
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
rules:
  - apiGroups:
      - ""
    resources:
      - configmaps
      - nodes
      - nodes/proxy
      - persistentvolumes
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - ""
    resources:
      - events
    verbs:
      - create
      - patch
      - list
      - get
      - watch
  - apiGroups:
      - storage.k8s.io
    resources:
      - storageclasses
    verbs:
      - get
      - list
      - watch
---
# Aspects of ceph-mgr that require access to the system namespace
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-mgr-system
rules:
  - apiGroups:
      - ""
    resources:
      - configmaps
    verbs:
      - get
      - list
      - watch
---
# Used for provisioning ObjectBuckets (OBs) in response to ObjectBucketClaims (OBCs).
# Note: Rook runs a copy of the lib-bucket-provisioner's OBC controller.
# OBCs can be created in any Kubernetes namespace, so this must be a cluster-scoped role.
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-object-bucket
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
rules:
  - apiGroups: [""]
    resources: ["secrets", "configmaps"]
    verbs:
      # OBC controller creates secrets and configmaps containing information for users about how to
      # connect to object buckets. It deletes them when an OBC is deleted.
      - get
      - create
      - update
      - delete
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses"]
    verbs:
      # OBC controller gets parameters from the OBC's storageclass
      # Rook gets additional parameters from the OBC's storageclass
      - get
  - apiGroups: ["objectbucket.io"]
    resources: ["objectbucketclaims"]
    verbs:
      # OBC controller needs to list/watch OBCs and get latest version of a reconciled OBC
      - list
      - watch
      - get
      # Ideally, update should not be needed, but the OBC controller updates the OBC with bucket
      # information outside of the status subresource
      - update
      # OBC controller does not delete OBCs; users do this
  - apiGroups: ["objectbucket.io"]
    resources: ["objectbuckets"]
    verbs:
      # OBC controller needs to list/watch OBs and get latest version of a reconciled OB
      - list
      - watch
      - get
      # OBC controller creates an OB when an OBC's bucket has been provisioned by Ceph, updates them
      # when an OBC is updated, and deletes them when the OBC is de-provisioned.
      - create
      - update
      - delete
  - apiGroups: ["objectbucket.io"]
    resources: ["objectbucketclaims/status", "objectbuckets/status"]
    verbs:
      # OBC controller updates OBC and OB statuses
      - update
  - apiGroups: ["objectbucket.io"]
    # This does not strictly allow the OBC/OB controllers to update finalizers. That is handled by
    # the direct "update" permissions above. Instead, this allows Rook's controller to create
    # resources which are owned by OBs/OBCs and where blockOwnerDeletion is set.
    resources: ["objectbucketclaims/finalizers", "objectbuckets/finalizers"]
    verbs:
      - update
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-osd
rules:
  - apiGroups:
      - ""
    resources:
      - nodes
    verbs:
      - get
      - list
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-system
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
rules:
  # Most resources are represented by a string representation of their name, such as "pods", just as it appears in the URL for the relevant API endpoint.
  # However, some Kubernetes APIs involve a "subresource", such as the logs for a pod. [...]
  # To represent this in an RBAC role, use a slash to delimit the resource and subresource.
  # https://kubernetes.io/docs/reference/access-authn-authz/rbac/#referring-to-resources
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]
  - apiGroups: ["admissionregistration.k8s.io"]
    resources: ["validatingwebhookconfigurations"]
    verbs: ["create", "get", "delete", "update"]
---
# This is required by operator-sdk to map the cluster/clusterrolebindings with SA
# otherwise operator-sdk will create a individual file for these.
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: cephfs-csi-nodeplugin-role
subjects:
  - kind: ServiceAccount
    name: rook-csi-cephfs-plugin-sa
    namespace: rook-ceph # namespace:operator
roleRef:
  kind: ClusterRole
  name: cephfs-csi-nodeplugin
  apiGroup: rbac.authorization.k8s.io
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: cephfs-csi-provisioner-role
subjects:
  - kind: ServiceAccount
    name: rook-csi-cephfs-provisioner-sa
    namespace: rook-ceph # namespace:operator
roleRef:
  kind: ClusterRole
  name: cephfs-external-provisioner-runner
  apiGroup: rbac.authorization.k8s.io
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rbd-csi-nodeplugin
subjects:
  - kind: ServiceAccount
    name: rook-csi-rbd-plugin-sa
    namespace: rook-ceph # namespace:operator
roleRef:
  kind: ClusterRole
  name: rbd-csi-nodeplugin
  apiGroup: rbac.authorization.k8s.io
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rbd-csi-provisioner-role
subjects:
  - kind: ServiceAccount
    name: rook-csi-rbd-provisioner-sa
    namespace: rook-ceph # namespace:operator
roleRef:
  kind: ClusterRole
  name: rbd-external-provisioner-runner
  apiGroup: rbac.authorization.k8s.io
---
# Grant the rook system daemons cluster-wide access to manage the Rook CRDs, PVCs, and storage classes
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-global
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: rook-ceph-global
subjects:
  - kind: ServiceAccount
    name: rook-ceph-system
    namespace: rook-ceph # namespace:operator
---
# Allow the ceph mgr to access cluster-wide resources necessary for the mgr modules
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-mgr-cluster
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: rook-ceph-mgr-cluster
subjects:
  - kind: ServiceAccount
    name: rook-ceph-mgr
    namespace: rook-ceph # namespace:cluster
---
kind: ClusterRoleBinding
# Give Rook-Ceph Operator permissions to provision ObjectBuckets in response to ObjectBucketClaims.
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-object-bucket
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: rook-ceph-object-bucket
subjects:
  - kind: ServiceAccount
    name: rook-ceph-system
    namespace: rook-ceph # namespace:operator
---
# Allow the ceph osd to access cluster-wide resources necessary for determining their topology location
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-osd
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: rook-ceph-osd
subjects:
  - kind: ServiceAccount
    name: rook-ceph-osd
    namespace: rook-ceph # namespace:cluster
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-system
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: rook-ceph-system
subjects:
  - kind: ServiceAccount
    name: rook-ceph-system
    namespace: rook-ceph # namespace:operator
---
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: cephfs-external-provisioner-cfg
  namespace: rook-ceph # namespace:operator
rules:
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["get", "watch", "list", "delete", "update", "create"]
---
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rbd-csi-nodeplugin
  namespace: rook-ceph # namespace:operator
rules:
  - apiGroups: ["csiaddons.openshift.io"]
    resources: ["csiaddonsnodes"]
    verbs: ["create"]
---
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rbd-external-provisioner-cfg
  namespace: rook-ceph # namespace:operator
rules:
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["get", "watch", "list", "delete", "update", "create"]
  - apiGroups: ["csiaddons.openshift.io"]
    resources: ["csiaddonsnodes"]
    verbs: ["create"]
---
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-cmd-reporter
  namespace: rook-ceph # namespace:cluster
rules:
  - apiGroups:
      - ""
    resources:
      - pods
      - configmaps
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - delete
---
# Aspects of ceph-mgr that operate within the cluster's namespace
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph # namespace:cluster
rules:
  - apiGroups:
      - ""
    resources:
      - pods
      - services
      - pods/log
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - delete
  - apiGroups:
      - batch
    resources:
      - jobs
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - delete
  - apiGroups:
      - ceph.rook.io
    resources:
      - cephclients
      - cephclusters
      - cephblockpools
      - cephfilesystems
      - cephnfses
      - cephobjectstores
      - cephobjectstoreusers
      - cephobjectrealms
      - cephobjectzonegroups
      - cephobjectzones
      - cephbuckettopics
      - cephbucketnotifications
      - cephrbdmirrors
      - cephfilesystemmirrors
      - cephfilesystemsubvolumegroups
      - cephblockpoolradosnamespaces
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - delete
      - patch
  - apiGroups:
      - apps
    resources:
      - deployments/scale
      - deployments
    verbs:
      - patch
      - delete
  - apiGroups:
      - ''
    resources:
      - persistentvolumeclaims
    verbs:
      - delete
---
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-osd
  namespace: rook-ceph # namespace:cluster
rules:
  # this is needed for rook's "key-management" CLI to fetch the vault token from the secret when
  # validating the connection details and for key rotation operations.
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "update"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
  - apiGroups: ["ceph.rook.io"]
    resources: ["cephclusters", "cephclusters/finalizers"]
    verbs: ["get", "list", "create", "update", "delete"]
---
# Aspects of ceph osd purge job that require access to the cluster namespace
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-purge-osd
  namespace: rook-ceph # namespace:cluster
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "delete"]
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["get", "list", "delete"]
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["get", "update", "delete", "list"]
---
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-rgw
  namespace: rook-ceph # namespace:cluster
rules:
  # Placeholder role so the rgw service account will
  # be generated in the csv. Remove this role and role binding
  # when fixing https://github.com/rook/rook/issues/10141.
  - apiGroups:
      - ""
    resources:
      - configmaps
    verbs:
      - get
---
# Allow the operator to manage resources in its own namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: rook-ceph-system
  namespace: rook-ceph # namespace:operator
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
rules:
  - apiGroups:
      - ""
    resources:
      - pods
      - configmaps
      - services
    verbs:
      - get
      - list
      - watch
      - patch
      - create
      - update
      - delete
  - apiGroups:
      - apps
      - extensions
    resources:
      - daemonsets
      - statefulsets
      - deployments
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - delete
      - deletecollection
  - apiGroups:
      - batch
    resources:
      - cronjobs
    verbs:
      - delete
  - apiGroups:
      - cert-manager.io
    resources:
      - certificates
      - issuers
    verbs:
      - get
      - create
      - delete
  - apiGroups:
      - multicluster.x-k8s.io
    resources:
      - serviceexports
    verbs:
      - get
      - create
---
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: cephfs-csi-provisioner-role-cfg
  namespace: rook-ceph # namespace:operator
subjects:
  - kind: ServiceAccount
    name: rook-csi-cephfs-provisioner-sa
    namespace: rook-ceph # namespace:operator
roleRef:
  kind: Role
  name: cephfs-external-provisioner-cfg
  apiGroup: rbac.authorization.k8s.io
---
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rbd-csi-nodeplugin-role-cfg
  namespace: rook-ceph # namespace:operator
subjects:
  - kind: ServiceAccount
    name: rook-csi-rbd-plugin-sa
    namespace: rook-ceph # namespace:operator
roleRef:
  kind: Role
  name: rbd-csi-nodeplugin
  apiGroup: rbac.authorization.k8s.io
---
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rbd-csi-provisioner-role-cfg
  namespace: rook-ceph # namespace:operator
subjects:
  - kind: ServiceAccount
    name: rook-csi-rbd-provisioner-sa
    namespace: rook-ceph # namespace:operator
roleRef:
  kind: Role
  name: rbd-external-provisioner-cfg
  apiGroup: rbac.authorization.k8s.io
---
# Allow the operator to create resources in this cluster's namespace
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-cluster-mgmt
  namespace: rook-ceph # namespace:cluster
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: rook-ceph-cluster-mgmt
subjects:
  - kind: ServiceAccount
    name: rook-ceph-system
    namespace: rook-ceph # namespace:operator
---
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-cmd-reporter
  namespace: rook-ceph # namespace:cluster
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: rook-ceph-cmd-reporter
subjects:
  - kind: ServiceAccount
    name: rook-ceph-cmd-reporter
    namespace: rook-ceph # namespace:cluster
---
# Allow the ceph mgr to access resources scoped to the CephCluster namespace necessary for mgr modules
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph # namespace:cluster
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: rook-ceph-mgr
subjects:
  - kind: ServiceAccount
    name: rook-ceph-mgr
    namespace: rook-ceph # namespace:cluster
---
# Allow the ceph mgr to access resources in the Rook operator namespace necessary for mgr modules
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-mgr-system
  namespace: rook-ceph # namespace:operator
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: rook-ceph-mgr-system
subjects:
  - kind: ServiceAccount
    name: rook-ceph-mgr
    namespace: rook-ceph # namespace:cluster
---
# Allow the osd pods in this namespace to work with configmaps
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-osd
  namespace: rook-ceph # namespace:cluster
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: rook-ceph-osd
subjects:
  - kind: ServiceAccount
    name: rook-ceph-osd
    namespace: rook-ceph # namespace:cluster
---
# Allow the osd purge job to run in this namespace
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-purge-osd
  namespace: rook-ceph # namespace:cluster
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: rook-ceph-purge-osd
subjects:
  - kind: ServiceAccount
    name: rook-ceph-purge-osd
    namespace: rook-ceph # namespace:cluster
---
# Allow the rgw pods in this namespace to work with configmaps
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-rgw
  namespace: rook-ceph # namespace:cluster
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: rook-ceph-rgw
subjects:
  - kind: ServiceAccount
    name: rook-ceph-rgw
    namespace: rook-ceph # namespace:cluster
---
# Grant the operator, agent, and discovery agents access to resources in the rook-ceph-system namespace
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: rook-ceph-system
  namespace: rook-ceph # namespace:operator
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: rook-ceph-system
subjects:
  - kind: ServiceAccount
    name: rook-ceph-system
    namespace: rook-ceph # namespace:operator
---
# Service account for the job that reports the Ceph version in an image
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rook-ceph-cmd-reporter
  namespace: rook-ceph # namespace:cluster
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
# imagePullSecrets:
#   - name: my-registry-secret
---
# Service account for Ceph mgrs
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph # namespace:cluster
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
# imagePullSecrets:
#   - name: my-registry-secret
---
# Service account for Ceph OSDs
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rook-ceph-osd
  namespace: rook-ceph # namespace:cluster
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
# imagePullSecrets:
#   - name: my-registry-secret
---
# Service account for job that purges OSDs from a Rook-Ceph cluster
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rook-ceph-purge-osd
  namespace: rook-ceph # namespace:cluster
# imagePullSecrets:
#   - name: my-registry-secret
---
# Service account for RGW server
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rook-ceph-rgw
  namespace: rook-ceph # namespace:cluster
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
# imagePullSecrets:
#   - name: my-registry-secret
---
# Service account for the Rook-Ceph operator
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rook-ceph-system
  namespace: rook-ceph # namespace:operator
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/part-of: rook-ceph-operator
# imagePullSecrets:
#   - name: my-registry-secret
---
# Service account for the CephFS CSI driver
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rook-csi-cephfs-plugin-sa
  namespace: rook-ceph # namespace:operator
# imagePullSecrets:
#   - name: my-registry-secret
---
# Service account for the CephFS CSI provisioner
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rook-csi-cephfs-provisioner-sa
  namespace: rook-ceph # namespace:operator
# imagePullSecrets:
#   - name: my-registry-secret
---
# Service account for the RBD CSI driver
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rook-csi-rbd-plugin-sa
  namespace: rook-ceph # namespace:operator
# imagePullSecrets:
#   - name: my-registry-secret
---
# Service account for the RBD CSI provisioner
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rook-csi-rbd-provisioner-sa
  namespace: rook-ceph # namespace:operator
# imagePullSecrets:
#   - name: my-registry-secret
```

## 创建operator

```yaml
# Rook Ceph Operator Config ConfigMap
# Use this ConfigMap to override Rook-Ceph Operator configurations.
# NOTE! Precedence will be given to this config if the same Env Var config also exists in the
#       Operator Deployment.
# To move a configuration(s) from the Operator Deployment to this ConfigMap, add the config
# here. It is recommended to then remove it from the Deployment to eliminate any future confusion.
kind: ConfigMap
apiVersion: v1
metadata:
  name: rook-ceph-operator-config
  # should be in the namespace of the operator
  namespace: rook-ceph # namespace:operator
data:
  # The logging level for the operator: ERROR | WARNING | INFO | DEBUG
  ROOK_LOG_LEVEL: "INFO"

  # Allow using loop devices for osds in test clusters.
  ROOK_CEPH_ALLOW_LOOP_DEVICES: "false"

  # Enable the CSI driver.
  # To run the non-default version of the CSI driver, see the override-able image properties in operator.yaml
  ROOK_CSI_ENABLE_CEPHFS: "true"
  # Enable the default version of the CSI RBD driver. To start another version of the CSI driver, see image properties below.
  ROOK_CSI_ENABLE_RBD: "true"
  # Enable the CSI NFS driver. To start another version of the CSI driver, see image properties below.
  ROOK_CSI_ENABLE_NFS: "false"
  ROOK_CSI_ENABLE_GRPC_METRICS: "false"

  # Set to true to enable Ceph CSI pvc encryption support.
  CSI_ENABLE_ENCRYPTION: "false"

  # Set to true to enable host networking for CSI CephFS and RBD nodeplugins. This may be necessary
  # in some network configurations where the SDN does not provide access to an external cluster or
  # there is significant drop in read/write performance.
  # CSI_ENABLE_HOST_NETWORK: "true"

  # Set to true to enable adding volume metadata on the CephFS subvolume and RBD images.
  # Not all users might be interested in getting volume/snapshot details as metadata on CephFS subvolume and RBD images.
  # Hence enable metadata is false by default.
  # CSI_ENABLE_METADATA: "true"

  # cluster name identifier to set as metadata on the CephFS subvolume and RBD images. This will be useful in cases
  # like for example, when two container orchestrator clusters (Kubernetes/OCP) are using a single ceph cluster.
  # CSI_CLUSTER_NAME: "my-prod-cluster"

  # Set logging level for cephCSI containers maintained by the cephCSI.
  # Supported values from 0 to 5. 0 for general useful logs, 5 for trace level verbosity.
  # CSI_LOG_LEVEL: "0"

  # Set logging level for Kubernetes-csi sidecar containers.
  # Supported values from 0 to 5. 0 for general useful logs (the default), 5 for trace level verbosity.
  # CSI_SIDECAR_LOG_LEVEL: "0"

  # Set replicas for csi provisioner deployment.
  CSI_PROVISIONER_REPLICAS: "2"

  # OMAP generator will generate the omap mapping between the PV name and the RBD image.
  # CSI_ENABLE_OMAP_GENERATOR need to be enabled when we are using rbd mirroring feature.
  # By default OMAP generator sidecar is deployed with CSI provisioner pod, to disable
  # it set it to false.
  # CSI_ENABLE_OMAP_GENERATOR: "false"

  # set to false to disable deployment of snapshotter container in CephFS provisioner pod.
  CSI_ENABLE_CEPHFS_SNAPSHOTTER: "true"

  # set to false to disable deployment of snapshotter container in NFS provisioner pod.
  CSI_ENABLE_NFS_SNAPSHOTTER: "true"

  # set to false to disable deployment of snapshotter container in RBD provisioner pod.
  CSI_ENABLE_RBD_SNAPSHOTTER: "true"

  # Enable cephfs kernel driver instead of ceph-fuse.
  # If you disable the kernel client, your application may be disrupted during upgrade.
  # See the upgrade guide: https://rook.io/docs/rook/latest/ceph-upgrade.html
  # NOTE! cephfs quota is not supported in kernel version < 4.17
  CSI_FORCE_CEPHFS_KERNEL_CLIENT: "true"

  # (Optional) policy for modifying a volume's ownership or permissions when the RBD PVC is being mounted.
  # supported values are documented at https://kubernetes-csi.github.io/docs/support-fsgroup.html
  CSI_RBD_FSGROUPPOLICY: "File"

  # (Optional) policy for modifying a volume's ownership or permissions when the CephFS PVC is being mounted.
  # supported values are documented at https://kubernetes-csi.github.io/docs/support-fsgroup.html
  CSI_CEPHFS_FSGROUPPOLICY: "File"

  # (Optional) policy for modifying a volume's ownership or permissions when the NFS PVC is being mounted.
  # supported values are documented at https://kubernetes-csi.github.io/docs/support-fsgroup.html
  CSI_NFS_FSGROUPPOLICY: "File"

  # (Optional) Allow starting unsupported ceph-csi image
  ROOK_CSI_ALLOW_UNSUPPORTED_VERSION: "false"

  # (Optional) control the host mount of /etc/selinux for csi plugin pods.
  CSI_PLUGIN_ENABLE_SELINUX_HOST_MOUNT: "false"

  # The default version of CSI supported by Rook will be started. To change the version
  # of the CSI driver to something other than what is officially supported, change
  # these images to the desired release of the CSI driver.
  # default images "registry.k8s.io/sig-storage"
  ROOK_CSI_CEPH_IMAGE: "quay.io/cephcsi/cephcsi:v3.8.0"
  ROOK_CSI_REGISTRAR_IMAGE: "registry.aliyuncs.com/google_containers/csi-node-driver-registrar:v2.7.0"
  ROOK_CSI_RESIZER_IMAGE: "registry.aliyuncs.com/google_containers/csi-resizer:v1.7.0"
  ROOK_CSI_PROVISIONER_IMAGE: "registry.aliyuncs.com/google_containers/csi-provisioner:v3.4.0"
  ROOK_CSI_SNAPSHOTTER_IMAGE: "registry.aliyuncs.com/google_containers/csi-snapshotter:v6.2.1"
  ROOK_CSI_ATTACHER_IMAGE: "registry.aliyuncs.com/google_containers/csi-attacher:v4.1.0"

  # To indicate the image pull policy to be applied to all the containers in the csi driver pods.
  # ROOK_CSI_IMAGE_PULL_POLICY: "IfNotPresent"

  # (Optional) set user created priorityclassName for csi plugin pods.
  CSI_PLUGIN_PRIORITY_CLASSNAME: "system-node-critical"

  # (Optional) set user created priorityclassName for csi provisioner pods.
  CSI_PROVISIONER_PRIORITY_CLASSNAME: "system-cluster-critical"

  # CSI CephFS plugin daemonset update strategy, supported values are OnDelete and RollingUpdate.
  # Default value is RollingUpdate.
  # CSI_CEPHFS_PLUGIN_UPDATE_STRATEGY: "OnDelete"
  # CSI RBD plugin daemonset update strategy, supported values are OnDelete and RollingUpdate.
  # Default value is RollingUpdate.
  # CSI_RBD_PLUGIN_UPDATE_STRATEGY: "OnDelete"
  # A maxUnavailable parameter of CSI RBD plugin daemonset update strategy.
  # Default value is 1.
  # CSI_RBD_PLUGIN_UPDATE_STRATEGY_MAX_UNAVAILABLE: "1"

  # CSI NFS plugin daemonset update strategy, supported values are OnDelete and RollingUpdate.
  # Default value is RollingUpdate.
  # CSI_NFS_PLUGIN_UPDATE_STRATEGY: "OnDelete"

  # kubelet directory path, if kubelet configured to use other than /var/lib/kubelet path.
  # ROOK_CSI_KUBELET_DIR_PATH: "/var/lib/kubelet"

  # Labels to add to the CSI CephFS Deployments and DaemonSets Pods.
  # ROOK_CSI_CEPHFS_POD_LABELS: "key1=value1,key2=value2"
  # Labels to add to the CSI RBD Deployments and DaemonSets Pods.
  # ROOK_CSI_RBD_POD_LABELS: "key1=value1,key2=value2"
  # Labels to add to the CSI NFS Deployments and DaemonSets Pods.
  # ROOK_CSI_NFS_POD_LABELS: "key1=value1,key2=value2"

  # (Optional) CephCSI CephFS plugin Volumes
  # CSI_CEPHFS_PLUGIN_VOLUME: |
  #  - name: lib-modules
  #    hostPath:
  #      path: /run/current-system/kernel-modules/lib/modules/
  #  - name: host-nix
  #    hostPath:
  #      path: /nix

  # (Optional) CephCSI CephFS plugin Volume mounts
  # CSI_CEPHFS_PLUGIN_VOLUME_MOUNT: |
  #  - name: host-nix
  #    mountPath: /nix
  #    readOnly: true

  # (Optional) CephCSI RBD plugin Volumes
  # CSI_RBD_PLUGIN_VOLUME: |
  #  - name: lib-modules
  #    hostPath:
  #      path: /run/current-system/kernel-modules/lib/modules/
  #  - name: host-nix
  #    hostPath:
  #      path: /nix

  # (Optional) CephCSI RBD plugin Volume mounts
  # CSI_RBD_PLUGIN_VOLUME_MOUNT: |
  #  - name: host-nix
  #    mountPath: /nix
  #    readOnly: true

  # (Optional) CephCSI provisioner NodeAffinity (applied to both CephFS and RBD provisioner).
  # CSI_PROVISIONER_NODE_AFFINITY: "role=storage-node; storage=rook, ceph"
  # (Optional) CephCSI provisioner tolerations list(applied to both CephFS and RBD provisioner).
  # Put here list of taints you want to tolerate in YAML format.
  # CSI provisioner would be best to start on the same nodes as other ceph daemons.
  # CSI_PROVISIONER_TOLERATIONS: |
  #   - effect: NoSchedule
  #     key: node-role.kubernetes.io/control-plane
  #     operator: Exists
  #   - effect: NoExecute
  #     key: node-role.kubernetes.io/etcd
  #     operator: Exists
  # (Optional) CephCSI plugin NodeAffinity (applied to both CephFS and RBD plugin).
  # CSI_PLUGIN_NODE_AFFINITY: "role=storage-node; storage=rook, ceph"
  # (Optional) CephCSI plugin tolerations list(applied to both CephFS and RBD plugin).
  # Put here list of taints you want to tolerate in YAML format.
  # CSI plugins need to be started on all the nodes where the clients need to mount the storage.
  # CSI_PLUGIN_TOLERATIONS: |
  #   - effect: NoSchedule
  #     key: node-role.kubernetes.io/control-plane
  #     operator: Exists
  #   - effect: NoExecute
  #     key: node-role.kubernetes.io/etcd
  #     operator: Exists

  # (Optional) CephCSI RBD provisioner NodeAffinity (if specified, overrides CSI_PROVISIONER_NODE_AFFINITY).
  # CSI_RBD_PROVISIONER_NODE_AFFINITY: "role=rbd-node"
  # (Optional) CephCSI RBD provisioner tolerations list(if specified, overrides CSI_PROVISIONER_TOLERATIONS).
  # Put here list of taints you want to tolerate in YAML format.
  # CSI provisioner would be best to start on the same nodes as other ceph daemons.
  # CSI_RBD_PROVISIONER_TOLERATIONS: |
  #   - key: node.rook.io/rbd
  #     operator: Exists
  # (Optional) CephCSI RBD plugin NodeAffinity (if specified, overrides CSI_PLUGIN_NODE_AFFINITY).
  # CSI_RBD_PLUGIN_NODE_AFFINITY: "role=rbd-node"
  # (Optional) CephCSI RBD plugin tolerations list(if specified, overrides CSI_PLUGIN_TOLERATIONS).
  # Put here list of taints you want to tolerate in YAML format.
  # CSI plugins need to be started on all the nodes where the clients need to mount the storage.
  # CSI_RBD_PLUGIN_TOLERATIONS: |
  #   - key: node.rook.io/rbd
  #     operator: Exists

  # (Optional) CephCSI CephFS provisioner NodeAffinity (if specified, overrides CSI_PROVISIONER_NODE_AFFINITY).
  # CSI_CEPHFS_PROVISIONER_NODE_AFFINITY: "role=cephfs-node"
  # (Optional) CephCSI CephFS provisioner tolerations list(if specified, overrides CSI_PROVISIONER_TOLERATIONS).
  # Put here list of taints you want to tolerate in YAML format.
  # CSI provisioner would be best to start on the same nodes as other ceph daemons.
  # CSI_CEPHFS_PROVISIONER_TOLERATIONS: |
  #   - key: node.rook.io/cephfs
  #     operator: Exists
  # (Optional) CephCSI CephFS plugin NodeAffinity (if specified, overrides CSI_PLUGIN_NODE_AFFINITY).
  # CSI_CEPHFS_PLUGIN_NODE_AFFINITY: "role=cephfs-node"
  # NOTE: Support for defining NodeAffinity for operators other than "In" and "Exists" requires the user to input a
  # valid v1.NodeAffinity JSON or YAML string. For example, the following is valid YAML v1.NodeAffinity:
  # CSI_CEPHFS_PLUGIN_NODE_AFFINITY: |
  #   requiredDuringSchedulingIgnoredDuringExecution:
  #     nodeSelectorTerms:
  #       - matchExpressions:
  #         - key: myKey
  #           operator: DoesNotExist
  # (Optional) CephCSI CephFS plugin tolerations list(if specified, overrides CSI_PLUGIN_TOLERATIONS).
  # Put here list of taints you want to tolerate in YAML format.
  # CSI plugins need to be started on all the nodes where the clients need to mount the storage.
  # CSI_CEPHFS_PLUGIN_TOLERATIONS: |
  #   - key: node.rook.io/cephfs
  #     operator: Exists

  # (Optional) CephCSI NFS provisioner NodeAffinity (overrides CSI_PROVISIONER_NODE_AFFINITY).
  # CSI_NFS_PROVISIONER_NODE_AFFINITY: "role=nfs-node"
  # (Optional) CephCSI NFS provisioner tolerations list (overrides CSI_PROVISIONER_TOLERATIONS).
  # Put here list of taints you want to tolerate in YAML format.
  # CSI provisioner would be best to start on the same nodes as other ceph daemons.
  # CSI_NFS_PROVISIONER_TOLERATIONS: |
  #   - key: node.rook.io/nfs
  #     operator: Exists
  # (Optional) CephCSI NFS plugin NodeAffinity (overrides CSI_PLUGIN_NODE_AFFINITY).
  # CSI_NFS_PLUGIN_NODE_AFFINITY: "role=nfs-node"
  # (Optional) CephCSI NFS plugin tolerations list (overrides CSI_PLUGIN_TOLERATIONS).
  # Put here list of taints you want to tolerate in YAML format.
  # CSI plugins need to be started on all the nodes where the clients need to mount the storage.
  # CSI_NFS_PLUGIN_TOLERATIONS: |
  #   - key: node.rook.io/nfs
  #     operator: Exists

  # (Optional) CEPH CSI RBD provisioner resource requirement list, Put here list of resource
  # requests and limits you want to apply for provisioner pod
  #CSI_RBD_PROVISIONER_RESOURCE: |
  #  - name : csi-provisioner
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 100m
  #      limits:
  #        memory: 256Mi
  #        cpu: 200m
  #  - name : csi-resizer
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 100m
  #      limits:
  #        memory: 256Mi
  #        cpu: 200m
  #  - name : csi-attacher
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 100m
  #      limits:
  #        memory: 256Mi
  #        cpu: 200m
  #  - name : csi-snapshotter
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 100m
  #      limits:
  #        memory: 256Mi
  #        cpu: 200m
  #  - name : csi-rbdplugin
  #    resource:
  #      requests:
  #        memory: 512Mi
  #        cpu: 250m
  #      limits:
  #        memory: 1Gi
  #        cpu: 500m
  #  - name : csi-omap-generator
  #    resource:
  #      requests:
  #        memory: 512Mi
  #        cpu: 250m
  #      limits:
  #        memory: 1Gi
  #        cpu: 500m
  #  - name : liveness-prometheus
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 50m
  #      limits:
  #        memory: 256Mi
  #        cpu: 100m
  # (Optional) CEPH CSI RBD plugin resource requirement list, Put here list of resource
  # requests and limits you want to apply for plugin pod
  #CSI_RBD_PLUGIN_RESOURCE: |
  #  - name : driver-registrar
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 50m
  #      limits:
  #        memory: 256Mi
  #        cpu: 100m
  #  - name : csi-rbdplugin
  #    resource:
  #      requests:
  #        memory: 512Mi
  #        cpu: 250m
  #      limits:
  #        memory: 1Gi
  #        cpu: 500m
  #  - name : liveness-prometheus
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 50m
  #      limits:
  #        memory: 256Mi
  #        cpu: 100m
  # (Optional) CEPH CSI CephFS provisioner resource requirement list, Put here list of resource
  # requests and limits you want to apply for provisioner pod
  #CSI_CEPHFS_PROVISIONER_RESOURCE: |
  #  - name : csi-provisioner
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 100m
  #      limits:
  #        memory: 256Mi
  #        cpu: 200m
  #  - name : csi-resizer
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 100m
  #      limits:
  #        memory: 256Mi
  #        cpu: 200m
  #  - name : csi-attacher
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 100m
  #      limits:
  #        memory: 256Mi
  #        cpu: 200m
  #  - name : csi-snapshotter
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 100m
  #      limits:
  #        memory: 256Mi
  #        cpu: 200m
  #  - name : csi-cephfsplugin
  #    resource:
  #      requests:
  #        memory: 512Mi
  #        cpu: 250m
  #      limits:
  #        memory: 1Gi
  #        cpu: 500m
  #  - name : liveness-prometheus
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 50m
  #      limits:
  #        memory: 256Mi
  #        cpu: 100m
  # (Optional) CEPH CSI CephFS plugin resource requirement list, Put here list of resource
  # requests and limits you want to apply for plugin pod
  #CSI_CEPHFS_PLUGIN_RESOURCE: |
  #  - name : driver-registrar
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 50m
  #      limits:
  #        memory: 256Mi
  #        cpu: 100m
  #  - name : csi-cephfsplugin
  #    resource:
  #      requests:
  #        memory: 512Mi
  #        cpu: 250m
  #      limits:
  #        memory: 1Gi
  #        cpu: 500m
  #  - name : liveness-prometheus
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 50m
  #      limits:
  #        memory: 256Mi
  #        cpu: 100m

  # (Optional) CEPH CSI NFS provisioner resource requirement list, Put here list of resource
  # requests and limits you want to apply for provisioner pod
  # CSI_NFS_PROVISIONER_RESOURCE: |
  #  - name : csi-provisioner
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 100m
  #      limits:
  #        memory: 256Mi
  #        cpu: 200m
  #  - name : csi-nfsplugin
  #    resource:
  #      requests:
  #        memory: 512Mi
  #        cpu: 250m
  #      limits:
  #        memory: 1Gi
  #        cpu: 500m
  #  - name : csi-attacher
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 100m
  #      limits:
  #        memory: 256Mi
  #        cpu: 200m
  # (Optional) CEPH CSI NFS plugin resource requirement list, Put here list of resource
  # requests and limits you want to apply for plugin pod
  # CSI_NFS_PLUGIN_RESOURCE: |
  #  - name : driver-registrar
  #    resource:
  #      requests:
  #        memory: 128Mi
  #        cpu: 50m
  #      limits:
  #        memory: 256Mi
  #        cpu: 100m
  #  - name : csi-nfsplugin
  #    resource:
  #      requests:
  #        memory: 512Mi
  #        cpu: 250m
  #      limits:
  #        memory: 1Gi
  #        cpu: 500m

  # Configure CSI Ceph FS grpc and liveness metrics port
  # Set to true to enable Ceph CSI liveness container.
  CSI_ENABLE_LIVENESS: "false"
  # CSI_CEPHFS_GRPC_METRICS_PORT: "9091"
  # CSI_CEPHFS_LIVENESS_METRICS_PORT: "9081"
  # Configure CSI RBD grpc and liveness metrics port
  # CSI_RBD_GRPC_METRICS_PORT: "9090"
  # CSI_RBD_LIVENESS_METRICS_PORT: "9080"
  # CSIADDONS_PORT: "9070"

  # Set CephFS Kernel mount options to use https://docs.ceph.com/en/latest/man/8/mount.ceph/#options
  # Set to "ms_mode=secure" when connections.encrypted is enabled in CephCluster CR
  # CSI_CEPHFS_KERNEL_MOUNT_OPTIONS: "ms_mode=secure"

  # Whether the OBC provisioner should watch on the operator namespace or not, if not the namespace of the cluster will be used
  ROOK_OBC_WATCH_OPERATOR_NAMESPACE: "true"

  # Whether to start the discovery daemon to watch for raw storage devices on nodes in the cluster.
  # This daemon does not need to run if you are only going to create your OSDs based on StorageClassDeviceSets with PVCs.
  ROOK_ENABLE_DISCOVERY_DAEMON: "false"
  # The timeout value (in seconds) of Ceph commands. It should be >= 1. If this variable is not set or is an invalid value, it's default to 15.
  ROOK_CEPH_COMMANDS_TIMEOUT_SECONDS: "15"
  # Enable the csi addons sidecar.
  CSI_ENABLE_CSIADDONS: "false"
  # ROOK_CSIADDONS_IMAGE: "quay.io/csiaddons/k8s-sidecar:v0.5.0"
  # The CSI GRPC timeout value (in seconds). It should be >= 120. If this variable is not set or is an invalid value, it's default to 150.
  CSI_GRPC_TIMEOUT_SECONDS: "150"

  ROOK_DISABLE_ADMISSION_CONTROLLER: "true"

  # Enable topology based provisioning.
  CSI_ENABLE_TOPOLOGY: "false"
  # Domain labels define which node labels to use as domains
  # for CSI nodeplugins to advertise their domains
  # NOTE: the value here serves as an example and needs to be
  # updated with node labels that define domains of interest
  # CSI_TOPOLOGY_DOMAIN_LABELS: "kubernetes.io/hostname,topology.kubernetes.io/zone,topology.rook.io/rack"

  # Enable read affinity for RBD volumes. Recommended to
  # set to true if running kernel 5.8 or newer.
  CSI_ENABLE_READ_AFFINITY: "false"
  # CRUSH location labels define which node labels to use
  # as CRUSH location. This should correspond to the values set in
  # the CRUSH map.
  # Defaults to all the labels mentioned in
  # https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#osd-topology
  # CSI_CRUSH_LOCATION_LABELS: "kubernetes.io/hostname,topology.kubernetes.io/zone,topology.rook.io/rack"

  # Whether to skip any attach operation altogether for CephCSI PVCs.
  # See more details [here](https://kubernetes-csi.github.io/docs/skip-attach.html#skip-attach-with-csi-driver-object).
  # If set to false it skips the volume attachments and makes the creation of pods using the CephCSI PVC fast.
  # **WARNING** It's highly discouraged to use this for RWO volumes. for RBD PVC it can cause data corruption,
  # csi-addons operations like Reclaimspace and PVC Keyrotation will also not be supported if set to false
  # since we'll have no VolumeAttachments to determine which node the PVC is mounted on.
  # Refer to this [issue](https://github.com/kubernetes/kubernetes/issues/103305) for more details.
  CSI_CEPHFS_ATTACH_REQUIRED: "true"
  CSI_RBD_ATTACH_REQUIRED: "true"
  CSI_NFS_ATTACH_REQUIRED: "true"
---
# OLM: BEGIN OPERATOR DEPLOYMENT
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rook-ceph-operator
  namespace: rook-ceph # namespace:operator
  labels:
    operator: rook
    storage-backend: ceph
    app.kubernetes.io/name: rook-ceph
    app.kubernetes.io/instance: rook-ceph
    app.kubernetes.io/component: rook-ceph-operator
    app.kubernetes.io/part-of: rook-ceph-operator
spec:
  selector:
    matchLabels:
      app: rook-ceph-operator
  strategy:
    type: Recreate
  replicas: 1
  template:
    metadata:
      labels:
        app: rook-ceph-operator
    spec:
      serviceAccountName: rook-ceph-system
      containers:
        - name: rook-ceph-operator
          image: rook/ceph:v1.11.9
          args: ["ceph", "operator"]
          securityContext:
            runAsNonRoot: true
            runAsUser: 2016
            runAsGroup: 2016
          volumeMounts:
            - mountPath: /var/lib/rook
              name: rook-config
            - mountPath: /etc/ceph
              name: default-config-dir
            - mountPath: /etc/webhook
              name: webhook-cert
          ports:
            - containerPort: 9443
              name: https-webhook
              protocol: TCP
          env:
            # If the operator should only watch for cluster CRDs in the same namespace, set this to "true".
            # If this is not set to true, the operator will watch for cluster CRDs in all namespaces.
            - name: ROOK_CURRENT_NAMESPACE_ONLY
              value: "false"
            # Rook Discover toleration. Will tolerate all taints with all keys.
            # Choose between NoSchedule, PreferNoSchedule and NoExecute:
            # - name: DISCOVER_TOLERATION
            #   value: "NoSchedule"
            # (Optional) Rook Discover toleration key. Set this to the key of the taint you want to tolerate
            # - name: DISCOVER_TOLERATION_KEY
            #   value: "<KeyOfTheTaintToTolerate>"
            # (Optional) Rook Discover tolerations list. Put here list of taints you want to tolerate in YAML format.
            # - name: DISCOVER_TOLERATIONS
            #   value: |
            #     - effect: NoSchedule
            #       key: node-role.kubernetes.io/control-plane
            #       operator: Exists
            #     - effect: NoExecute
            #       key: node-role.kubernetes.io/etcd
            #       operator: Exists
            # (Optional) Rook Discover priority class name to set on the pod(s)
            # - name: DISCOVER_PRIORITY_CLASS_NAME
            #   value: "<PriorityClassName>"
            # (Optional) Discover Agent NodeAffinity.
            # - name: DISCOVER_AGENT_NODE_AFFINITY
            #   value: "role=storage-node; storage=rook, ceph"
            # (Optional) Discover Agent Pod Labels.
            # - name: DISCOVER_AGENT_POD_LABELS
            #   value: "key1=value1,key2=value2"

            # The duration between discovering devices in the rook-discover daemonset.
            - name: ROOK_DISCOVER_DEVICES_INTERVAL
              value: "60m"

            # Whether to start pods as privileged that mount a host path, which includes the Ceph mon and osd pods.
            # Set this to true if SELinux is enabled (e.g. OpenShift) to workaround the anyuid issues.
            # For more details see https://github.com/rook/rook/issues/1314#issuecomment-355799641
            - name: ROOK_HOSTPATH_REQUIRES_PRIVILEGED
              value: "false"

            # Disable automatic orchestration when new devices are discovered
            - name: ROOK_DISABLE_DEVICE_HOTPLUG
              value: "false"

            # Provide customised regex as the values using comma. For eg. regex for rbd based volume, value will be like "(?i)rbd[0-9]+".
            # In case of more than one regex, use comma to separate between them.
            # Default regex will be "(?i)dm-[0-9]+,(?i)rbd[0-9]+,(?i)nbd[0-9]+"
            # Add regex expression after putting a comma to blacklist a disk
            # If value is empty, the default regex will be used.
            - name: DISCOVER_DAEMON_UDEV_BLACKLIST
              value: "(?i)dm-[0-9]+,(?i)rbd[0-9]+,(?i)nbd[0-9]+"

            # - name: DISCOVER_DAEMON_RESOURCES
            #   value: |
            #     resources:
            #       limits:
            #         cpu: 500m
            #         memory: 512Mi
            #       requests:
            #         cpu: 100m
            #         memory: 128Mi

            # Time to wait until the node controller will move Rook pods to other
            # nodes after detecting an unreachable node.
            # Pods affected by this setting are:
            # mgr, rbd, mds, rgw, nfs, PVC based mons and osds, and ceph toolbox
            # The value used in this variable replaces the default value of 300 secs
            # added automatically by k8s as Toleration for
            # <node.kubernetes.io/unreachable>
            # The total amount of time to reschedule Rook pods in healthy nodes
            # before detecting a <not ready node> condition will be the sum of:
            #  --> node-monitor-grace-period: 40 seconds (k8s kube-controller-manager flag)
            #  --> ROOK_UNREACHABLE_NODE_TOLERATION_SECONDS: 5 seconds
            - name: ROOK_UNREACHABLE_NODE_TOLERATION_SECONDS
              value: "5"

            # The name of the node to pass with the downward API
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            # The pod name to pass with the downward API
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            # The pod namespace to pass with the downward API
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          # Recommended resource requests and limits, if desired
          #resources:
          #  limits:
          #    cpu: 500m
          #    memory: 512Mi
          #  requests:
          #    cpu: 100m
          #    memory: 128Mi

          #  Uncomment it to run lib bucket provisioner in multithreaded mode
          #- name: LIB_BUCKET_PROVISIONER_THREADS
          #  value: "5"

      # Uncomment it to run rook operator on the host network
      #hostNetwork: true
      volumes:
        - name: rook-config
          emptyDir: {}
        - name: default-config-dir
          emptyDir: {}
        - name: webhook-cert
          emptyDir: {}
# OLM: END OPERATOR DEPLOYMENT

```


## 创建ceph-cluster

```yaml
#################################################################################################################
# Define the settings for the rook-ceph cluster with common settings for a production cluster.
# All nodes with available raw devices will be used for the Ceph cluster. At least three nodes are required
# in this example. See the documentation for more details on storage settings available.

# For example, to create the cluster:
#   kubectl create -f crds.yaml -f common.yaml -f operator.yaml
#   kubectl create -f cluster.yaml
#################################################################################################################

apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph # namespace:cluster
spec:
  cephVersion:
    # The container image used to launch the Ceph daemon pods (mon, mgr, osd, mds, rgw).
    # v16 is Pacific, and v17 is Quincy.
    # RECOMMENDATION: In production, use a specific version tag instead of the general v17 flag, which pulls the latest release and could result in different
    # versions running within the cluster. See tags available at https://hub.docker.com/r/ceph/ceph/tags/.
    # If you want to be more precise, you can always use a timestamp tag such quay.io/ceph/ceph:v17.2.6-20230410
    # This tag might not contain a new Ceph version, just security fixes from the underlying operating system, which will reduce vulnerabilities
    image: quay.io/ceph/ceph:v17.2.6
    # Whether to allow unsupported versions of Ceph. Currently `pacific` and `quincy` are supported.
    # Future versions such as `reef` (v18) would require this to be set to `true`.
    # Do not set to true in production.
    allowUnsupported: false
  # The path on the host where configuration files will be persisted. Must be specified.
  # Important: if you reinstall the cluster, make sure you delete this directory from each host or else the mons will fail to start on the new cluster.
  # In Minikube, the '/data' directory is configured to persist across reboots. Use "/data/rook" in Minikube environment.
  dataDirHostPath: /var/lib/rook
  # Whether or not upgrade should continue even if a check fails
  # This means Ceph's status could be degraded and we don't recommend upgrading but you might decide otherwise
  # Use at your OWN risk
  # To understand Rook's upgrade process of Ceph, read https://rook.io/docs/rook/latest/ceph-upgrade.html#ceph-version-upgrades
  skipUpgradeChecks: false
  # Whether or not continue if PGs are not clean during an upgrade
  continueUpgradeAfterChecksEvenIfNotHealthy: false
  # WaitTimeoutForHealthyOSDInMinutes defines the time (in minutes) the operator would wait before an OSD can be stopped for upgrade or restart.
  # If the timeout exceeds and OSD is not ok to stop, then the operator would skip upgrade for the current OSD and proceed with the next one
  # if `continueUpgradeAfterChecksEvenIfNotHealthy` is `false`. If `continueUpgradeAfterChecksEvenIfNotHealthy` is `true`, then operator would
  # continue with the upgrade of an OSD even if its not ok to stop after the timeout. This timeout won't be applied if `skipUpgradeChecks` is `true`.
  # The default wait timeout is 10 minutes.
  waitTimeoutForHealthyOSDInMinutes: 10
  mon:
    # Set the number of mons to be started. Generally recommended to be 3.
    # For highest availability, an odd number of mons should be specified.
    count: 3
    # The mons should be on unique nodes. For production, at least 3 nodes are recommended for this reason.
    # Mons should only be allowed on the same node for test environments where data loss is acceptable.
    allowMultiplePerNode: false
  mgr:
    # When higher availability of the mgr is needed, increase the count to 2.
    # In that case, one mgr will be active and one in standby. When Ceph updates which
    # mgr is active, Rook will update the mgr services to match the active mgr.
    count: 2
    allowMultiplePerNode: false
    modules:
      # Several modules should not need to be included in this list. The "dashboard" and "monitoring" modules
      # are already enabled by other settings in the cluster CR.
      - name: pg_autoscaler
        enabled: true
  # enable the ceph dashboard for viewing cluster status
  dashboard:
    enabled: true
    # serve the dashboard under a subpath (useful when you are accessing the dashboard via a reverse proxy)
    # urlPrefix: /ceph-dashboard
    # serve the dashboard at the given port.
    # port: 8443
    # serve the dashboard using SSL
    ssl: true
  # enable prometheus alerting for cluster
  monitoring:
    # requires Prometheus to be pre-installed
    enabled: false
    # Whether to disable the metrics reported by Ceph. If false, the prometheus mgr module and Ceph exporter are enabled.
    # If true, the prometheus mgr module and Ceph exporter are both disabled. Default is false.
    metricsDisabled: false
  network:
    connections:
      # Whether to encrypt the data in transit across the wire to prevent eavesdropping the data on the network.
      # The default is false. When encryption is enabled, all communication between clients and Ceph daemons, or between Ceph daemons will be encrypted.
      # When encryption is not enabled, clients still establish a strong initial authentication and data integrity is still validated with a crc check.
      # IMPORTANT: Encryption requires the 5.11 kernel for the latest nbd and cephfs drivers. Alternatively for testing only,
      # you can set the "mounter: rbd-nbd" in the rbd storage class, or "mounter: fuse" in the cephfs storage class.
      # The nbd and fuse drivers are *not* recommended in production since restarting the csi driver pod will disconnect the volumes.
      encryption:
        enabled: false
      # Whether to compress the data in transit across the wire. The default is false.
      # Requires Ceph Quincy (v17) or newer. Also see the kernel requirements above for encryption.
      compression:
        enabled: false
      # Whether to require communication over msgr2. If true, the msgr v1 port (6789) will be disabled
      # and clients will be required to connect to the Ceph cluster with the v2 port (3300).
      # Requires a kernel that supports msgr v2 (kernel 5.11 or CentOS 8.4 or newer).
      requireMsgr2: false
    # enable host networking
    #provider: host
    # enable the Multus network provider
    #provider: multus
    #selectors:
      # The selector keys are required to be `public` and `cluster`.
      # Based on the configuration, the operator will do the following:
      #   1. if only the `public` selector key is specified both public_network and cluster_network Ceph settings will listen on that interface
      #   2. if both `public` and `cluster` selector keys are specified the first one will point to 'public_network' flag and the second one to 'cluster_network'
      #
      # In order to work, each selector value must match a NetworkAttachmentDefinition object in Multus
      #
      #public: public-conf --> NetworkAttachmentDefinition object name in Multus
      #cluster: cluster-conf --> NetworkAttachmentDefinition object name in Multus
    # Provide internet protocol version. IPv6, IPv4 or empty string are valid options. Empty string would mean IPv4
    #ipFamily: "IPv6"
    # Ceph daemons to listen on both IPv4 and Ipv6 networks
    #dualStack: false
    # Enable multiClusterService to export the mon and OSD services to peer cluster.
    # This is useful to support RBD mirroring between two clusters having overlapping CIDRs.
    # Ensure that peer clusters are connected using an MCS API compatible application, like Globalnet Submariner.
    #multiClusterService:
    #  enabled: false

  # enable the crash collector for ceph daemon crash collection
  crashCollector:
    disable: false
    # Uncomment daysToRetain to prune ceph crash entries older than the
    # specified number of days.
    #daysToRetain: 30
  # enable log collector, daemons will log on files and rotate
  logCollector:
    enabled: true
    periodicity: daily # one of: hourly, daily, weekly, monthly
    maxLogSize: 500M # SUFFIX may be 'M' or 'G'. Must be at least 1M.
  # automate [data cleanup process](https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/ceph-teardown.md#delete-the-data-on-hosts) in cluster destruction.
  cleanupPolicy:
    # Since cluster cleanup is destructive to data, confirmation is required.
    # To destroy all Rook data on hosts during uninstall, confirmation must be set to "yes-really-destroy-data".
    # This value should only be set when the cluster is about to be deleted. After the confirmation is set,
    # Rook will immediately stop configuring the cluster and only wait for the delete command.
    # If the empty string is set, Rook will not destroy any data on hosts during uninstall.
    confirmation: ""
    # sanitizeDisks represents settings for sanitizing OSD disks on cluster deletion
    sanitizeDisks:
      # method indicates if the entire disk should be sanitized or simply ceph's metadata
      # in both case, re-install is possible
      # possible choices are 'complete' or 'quick' (default)
      method: quick
      # dataSource indicate where to get random bytes from to write on the disk
      # possible choices are 'zero' (default) or 'random'
      # using random sources will consume entropy from the system and will take much more time then the zero source
      dataSource: zero
      # iteration overwrite N times instead of the default (1)
      # takes an integer value
      iteration: 1
    # allowUninstallWithVolumes defines how the uninstall should be performed
    # If set to true, cephCluster deletion does not wait for the PVs to be deleted.
    allowUninstallWithVolumes: false
  # To control where various services will be scheduled by kubernetes, use the placement configuration sections below.
  # The example under 'all' would have all services scheduled on kubernetes nodes labeled with 'role=storage-node' and
  # tolerate taints with a key of 'storage-node'.
  # placement:
  #   all:
  #     nodeAffinity:
  #       requiredDuringSchedulingIgnoredDuringExecution:
  #         nodeSelectorTerms:
  #         - matchExpressions:
  #           - key: role
  #             operator: In
  #             values:
  #             - storage-node
  #     podAffinity:
  #     podAntiAffinity:
  #     topologySpreadConstraints:
  #     tolerations:
  #     - key: storage-node
  #       operator: Exists
  # The above placement information can also be specified for mon, osd, and mgr components
  #   mon:
  # Monitor deployments may contain an anti-affinity rule for avoiding monitor
  # collocation on the same node. This is a required rule when host network is used
  # or when AllowMultiplePerNode is false. Otherwise this anti-affinity rule is a
  # preferred rule with weight: 50.
  #   osd:
  #    prepareosd:
  #    mgr:
  #    cleanup:
  annotations:
  #   all:
  #   mon:
  #   osd:
  #   cleanup:
  #   prepareosd:
  # clusterMetadata annotations will be applied to only `rook-ceph-mon-endpoints` configmap and the `rook-ceph-mon` and `rook-ceph-admin-keyring` secrets.
  # And clusterMetadata annotations will not be merged with `all` annotations.
  #    clusterMetadata:
  #       kubed.appscode.com/sync: "true"
  # If no mgr annotations are set, prometheus scrape annotations will be set by default.
  #   mgr:
  labels:
  #   all:
  #   mon:
  #   osd:
  #   cleanup:
  #   mgr:
  #   prepareosd:
  # monitoring is a list of key-value pairs. It is injected into all the monitoring resources created by operator.
  # These labels can be passed as LabelSelector to Prometheus
  #   monitoring:
  #   crashcollector:
  resources:
  #The requests and limits set here, allow the mgr pod to use half of one CPU core and 1 gigabyte of memory
  #   mgr:
  #     limits:
  #       cpu: "500m"
  #       memory: "1024Mi"
  #     requests:
  #       cpu: "500m"
  #       memory: "1024Mi"
  # The above example requests/limits can also be added to the other components
  #   mon:
  #   osd:
  # For OSD it also is a possible to specify requests/limits based on device class
  #   osd-hdd:
  #   osd-ssd:
  #   osd-nvme:
  #   prepareosd:
  #   mgr-sidecar:
  #   crashcollector:
  #   logcollector:
  #   cleanup:
  #   exporter:
  # The option to automatically remove OSDs that are out and are safe to destroy.
  removeOSDsIfOutAndSafeToRemove: false
  priorityClassNames:
    #all: rook-ceph-default-priority-class
    mon: system-node-critical
    osd: system-node-critical
    mgr: system-cluster-critical
    #crashcollector: rook-ceph-crashcollector-priority-class
  storage: # 集群级存储配置和选择
    useAllNodes: true # 使用所有节点
    useAllDevices: true # 使用所有设备
    #deviceFilter:
    config:
      # crushRoot: "custom-root" # specify a non-default root label for the CRUSH map
      # metadataDevice: "md0" # specify a non-rotational storage so ceph-volume will use it as block db device of bluestore.
      # databaseSizeMB: "1024" # uncomment if the disks are smaller than 100 GB
      # journalSizeMB: "1024"  # uncomment if the disks are 20 GB or smaller
      # osdsPerDevice: "1" # this value can be overridden at the node or device level
      # encryptedDevice: "true" # the default value for this option is "false"
    # Individual nodes and their config can be specified as well, but 'useAllNodes' above must be set to false. Then, only the named
    # nodes below will be used as storage resources.  Each node's 'name' field should match their 'kubernetes.io/hostname' label.
    # 指定节点
    # nodes:
    #   - name: "172.17.4.201"
    #     devices: # specific devices to use for storage can be specified for each node
    #       - name: "sdb"
    #       - name: "nvme01" # multiple osds can be created on high performance devices
    #         config:
    #           osdsPerDevice: "5"
    #       - name: "/dev/disk/by-id/ata-ST4000DM004-XXXX" # devices can be specified using full udev paths
    #     config: # configuration can be specified at the node level which overrides the cluster level config
    #   - name: "172.17.4.301"
    #     deviceFilter: "^sd."
    # when onlyApplyOSDPlacement is false, will merge both placement.All() and placement.osd
    onlyApplyOSDPlacement: false
  # The section for configuring management of daemon disruptions during upgrade or fencing.
  disruptionManagement:
    # If true, the operator will create and manage PodDisruptionBudgets for OSD, Mon, RGW, and MDS daemons. OSD PDBs are managed dynamically
    # via the strategy outlined in the [design](https://github.com/rook/rook/blob/master/design/ceph/ceph-managed-disruptionbudgets.md). The operator will
    # block eviction of OSDs by default and unblock them safely when drains are detected.
    managePodBudgets: true
    # A duration in minutes that determines how long an entire failureDomain like `region/zone/host` will be held in `noout` (in addition to the
    # default DOWN/OUT interval) when it is draining. This is only relevant when  `managePodBudgets` is `true`. The default value is `30` minutes.
    osdMaintenanceTimeout: 30
    # A duration in minutes that the operator will wait for the placement groups to become healthy (active+clean) after a drain was completed and OSDs came back up.
    # Operator will continue with the next drain if the timeout exceeds. It only works if `managePodBudgets` is `true`.
    # No values or 0 means that the operator will wait until the placement groups are healthy before unblocking the next drain.
    pgHealthCheckTimeout: 0

  # healthChecks
  # Valid values for daemons are 'mon', 'osd', 'status'
  healthCheck:
    daemonHealth:
      mon:
        disabled: false
        interval: 45s
      osd:
        disabled: false
        interval: 60s
      status:
        disabled: false
        interval: 60s
    # Change pod liveness probe timing or threshold values. Works for all mon,mgr,osd daemons.
    livenessProbe:
      mon:
        disabled: false
      mgr:
        disabled: false
      osd:
        disabled: false
    # Change pod startup probe timing or threshold values. Works for all mon,mgr,osd daemons.
    startupProbe:
      mon:
        disabled: false
      mgr:
        disabled: false
      osd:
        disabled: false

```

## 创建service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-mgr-dashboard-external-https
  namespace: rook-ceph # namespace:cluster
  labels:
    app: rook-ceph-mgr
    rook_cluster: rook-ceph # namespace:cluster
spec:
  ports:
    - name: dashboard
      port: 8443
      protocol: TCP
      targetPort: 8443
  selector:
    app: rook-ceph-mgr
    mgr_role: active
    rook_cluster: rook-ceph
  sessionAffinity: None
  type: NodePort

```

## 创建ceph存储

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: ceph
  namespace: rook-ceph
spec:
  metadataPool:
   replicated:
     size: 3
  dataPools:
    - replicated:  
        size: 3
  preservePoolsOnDelete: true
  metadataServer:
    activeCount: 1
    activeStandby: true

```

## 创建集群storageclass

```yaml
allowVolumeExpansion: true
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  annotations:
    k8s.kuboard.cn/storageType: cephfs_rook
  name: ceph
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  fsName: ceph
  pool: ceph-data0
provisioner: rook-ceph.cephfs.csi.ceph.com
reclaimPolicy: Retain
volumeBindingMode: Immediate

```

## 创建ceph工具箱

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rook-ceph-tools
  namespace: rook-ceph # namespace:cluster
  labels:
    app: rook-ceph-tools
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rook-ceph-tools
  template:
    metadata:
      labels:
        app: rook-ceph-tools
    spec:
      dnsPolicy: ClusterFirstWithHostNet
      containers:
        - name: rook-ceph-tools
          image: quay.io/ceph/ceph:v17.2.6
          command:
            - /bin/bash
            - -c
            - |
              # Replicate the script from toolbox.sh inline so the ceph image
              # can be run directly, instead of requiring the rook toolbox
              CEPH_CONFIG="/etc/ceph/ceph.conf"
              MON_CONFIG="/etc/rook/mon-endpoints"
              KEYRING_FILE="/etc/ceph/keyring"

              # create a ceph config file in its default location so ceph/rados tools can be used
              # without specifying any arguments
              write_endpoints() {
                endpoints=$(cat ${MON_CONFIG})

                # filter out the mon names
                # external cluster can have numbers or hyphens in mon names, handling them in regex
                # shellcheck disable=SC2001
                mon_endpoints=$(echo "${endpoints}"| sed 's/[a-z0-9_-]\+=//g')

                DATE=$(date)
                echo "$DATE writing mon endpoints to ${CEPH_CONFIG}: ${endpoints}"
                  cat <<EOF > ${CEPH_CONFIG}
              [global]
              mon_host = ${mon_endpoints}

              [client.admin]
              keyring = ${KEYRING_FILE}
              EOF
              }

              # watch the endpoints config file and update if the mon endpoints ever change
              watch_endpoints() {
                # get the timestamp for the target of the soft link
                real_path=$(realpath ${MON_CONFIG})
                initial_time=$(stat -c %Z "${real_path}")
                while true; do
                  real_path=$(realpath ${MON_CONFIG})
                  latest_time=$(stat -c %Z "${real_path}")

                  if [[ "${latest_time}" != "${initial_time}" ]]; then
                    write_endpoints
                    initial_time=${latest_time}
                  fi

                  sleep 10
                done
              }

              # read the secret from an env var (for backward compatibility), or from the secret file
              ceph_secret=${ROOK_CEPH_SECRET}
              if [[ "$ceph_secret" == "" ]]; then
                ceph_secret=$(cat /var/lib/rook-ceph-mon/secret.keyring)
              fi

              # create the keyring file
              cat <<EOF > ${KEYRING_FILE}
              [${ROOK_CEPH_USERNAME}]
              key = ${ceph_secret}
              EOF

              # write the initial config file
              write_endpoints

              # continuously update the mon endpoints if they fail over
              watch_endpoints
          imagePullPolicy: IfNotPresent
          tty: true
          securityContext:
            runAsNonRoot: true
            runAsUser: 2016
            runAsGroup: 2016
          env:
            - name: ROOK_CEPH_USERNAME
              valueFrom:
                secretKeyRef:
                  name: rook-ceph-mon
                  key: ceph-username
          volumeMounts:
            - mountPath: /etc/ceph
              name: ceph-config
            - name: mon-endpoint-volume
              mountPath: /etc/rook
            - name: ceph-admin-secret
              mountPath: /var/lib/rook-ceph-mon
              readOnly: true
      volumes:
        - name: ceph-admin-secret
          secret:
            secretName: rook-ceph-mon
            optional: false
            items:
              - key: ceph-secret
                path: secret.keyring
        - name: mon-endpoint-volume
          configMap:
            name: rook-ceph-mon-endpoints
            items:
              - key: data
                path: mon-endpoints
        - name: ceph-config
          emptyDir: {}
      tolerations:
        - key: "node.kubernetes.io/unreachable"
          operator: "Exists"
          effect: "NoExecute"
          tolerationSeconds: 5
```
