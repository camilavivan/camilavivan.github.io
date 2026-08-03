---
title: kubernetes各名词缩写
date: 2023-02-07 14:54:33
type: categories
tags: 
  - kubernetes
keywords: kubernetes
categories: 
  - kubernetes
cover: https://gh-proxy.com/https://raw.githubusercontent.com/Ghostpanter/tuchuang/main/img/202301101650972.png
---

## kubernetes各名词缩写

|NAME                             |SHORTNAMES   |APIGROUP                       |NAMESPACED   |KIND                                |
|--| -- | -- | -- |  -- |  
|bindings                          |             |                               |true         |Binding                            |
|componentstatuses                 |cs           |                               |false        |ComponentStatus                    |
|configmaps                        |cm           |                               |true         |ConfigMap                          |
|endpoints                         |ep           |                               |true         |Endpoints                          |
|events                            |ev           |                               |true         |Event                              |
|limitranges                       |limits       |                               |true         |LimitRange                         |
|namespaces                        |ns           |                               |false        |Namespace                          |
|nodes                             |no           |                               |false        |Node                               |
|persistentvolumeclaims            |pvc          |                               |true         |PersistentVolumeClaim              |
|persistentvolumes                 |pv           |                               |false        |PersistentVolume                   |
|pods                              |po           |                               |true         |Pod                                |
|podtemplates                      |             |                               |true         |PodTemplate                        |
|replicationcontrollers            |rc           |                               |true         |ReplicationController              |
|resourcequotas                    |quota        |                               |true         |ResourceQuota                      |
|secrets                           |             |                               |true         |Secret                             |
|serviceaccounts                   |sa           |                               |true         |ServiceAccount                     |
|services                          |svc          |                               |true         |Service                            |
|mutatingwebhookconfigurations     |             |admissionregistration.k8s.io   |false        |MutatingWebhookConfiguration       |
|validatingwebhookconfigurations   |             |admissionregistration.k8s.io   |false        |ValidatingWebhookConfiguration     |
|customresourcedefinitions         |crd,crds     |apiextensions.k8s.io           |false        |CustomResourceDefinition           |
|apiservices                       |             |apiregistration.k8s.io         |false        |APIService                         |
|controllerrevisions               |             |apps                           |true         |ControllerRevision                 |
|daemonsets                        |ds           |apps                           |true         |DaemonSet                          |
|deployments                       |deploy       |apps                           |true         |Deployment                         |
|replicasets                       |rs           |apps                           |true         |ReplicaSet                         |
|statefulsets                      |sts          |apps                           |true         |StatefulSet                        |
|tokenreviews                      |             |authentication.k8s.io          |false        |TokenReview                        |
|localsubjectaccessreviews         |             |authorization.k8s.io           |true         |LocalSubjectAccessReview           |
|selfsubjectaccessreviews          |             |authorization.k8s.io           |false        |SelfSubjectAccessReview            |
|selfsubjectrulesreviews           |             |authorization.k8s.io           |false        |SelfSubjectRulesReview             |
|subjectaccessreviews              |             |authorization.k8s.io           |false        |SubjectAccessReview                |
|horizontalpodautoscalers          |hpa          |autoscaling                    |true         |HorizontalPodAutoscaler            |
|cronjobs                          |cj           |batch                          |true         |CronJob                            |
|jobs                              |             |batch                          |true         |Job                                |
|certificatesigningrequests        |csr          |certificates.k8s.io            |false        |CertificateSigningRequest          |
|leases                            |             |coordination.k8s.io            |true         |Lease                              |
|bgpconfigurations                 |             |crd.projectcalico.org          |false        |BGPConfiguration                   |
|clusterinformations               |             |crd.projectcalico.org          |false        |ClusterInformation                 |
|felixconfigurations               |             |crd.projectcalico.org          |false        |FelixConfiguration                 |
|globalnetworkpolicies             |             |crd.projectcalico.org          |false        |GlobalNetworkPolicy                |
|globalnetworksets                 |             |crd.projectcalico.org          |false        |GlobalNetworkSet                   |
|hostendpoints                     |             |crd.projectcalico.org          |false        |HostEndpoint                       |
|ippools                           |             |crd.projectcalico.org          |false        |IPPool                             |
|networkpolicies                   |             |crd.projectcalico.org          |true         |NetworkPolicy                      |
|events                            |ev           |events.k8s.io                  |true         |Event                              |
|daemonsets                        |ds           |extensions                     |true         |DaemonSet                          |
|deployments                       |deploy       |extensions                     |true         |Deployment                         |
|ingresses                         |ing          |extensions                     |true         |Ingress                            |
|networkpolicies                   |netpol       |extensions                     |true         |NetworkPolicy                      |
|podsecuritypolicies               |psp          |extensions                     |false        |PodSecurityPolicy                  |
|replicasets                       |rs           |extensions                     |true         |ReplicaSet                         |
|nodes                             |             |metrics.k8s.io                 |false        |NodeMetrics                        |
|pods                              |             |metrics.k8s.io                 |true         |PodMetrics                         |
|networkpolicies                   |netpol       |networking.k8s.io              |true         |NetworkPolicy                      |
|poddisruptionbudgets              |pdb          |policy                         |true         |PodDisruptionBudget                |
|podsecuritypolicies               |psp          |policy                         |false        |PodSecurityPolicy                  |
|clusterrolebindings               |             |rbac.authorization.k8s.io      |false        |ClusterRoleBinding                 |
|clusterroles                      |             |rbac.authorization.k8s.io      |false        |ClusterRole                        |
|rolebindings                      |             |rbac.authorization.k8s.io      |true         |RoleBinding                        |
|roles                             |             |rbac.authorization.k8s.io      |true         |Role                               |
|priorityclasses                   |pc           |scheduling.k8s.io              |false        |PriorityClass                      |
|storageclasses                    |sc           |storage.k8s.io                 |false        |StorageClass                       |
|volumeattachments                 |             |storage.k8s.io                 |false        |VolumeAttachment                   |
