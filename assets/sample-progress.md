# Project HyperFlow · AI 微服务重构
> 将原有单体订单服务解耦为事件驱动的异步微服务架构，全面提升吞吐与高可用性。

## 阶段一：架构设计与领域拆分
> 完成 DDD 领域建模，厘清限界上下文与事件骨干网。

### 领域模型与边界梳理
> 定义订单、支付与库存核心聚合根。

#### 订单聚合根抽象
> 提取订单状态机，隔离核心支付与物流分支。
- [x] 完成 OrderAggregate 领域对象设计
- [x] 梳理订单状态转移规则矩阵
- [ ] 编写状态机单元测试
```diff
+ class OrderAggregate {
+   transitionTo(state: OrderState): void;
+   canCancel(): boolean;
+ }
```

#### 库存领域防腐层
> 建立与老旧 ERP 系统的 Anti-Corruption Layer。
- [x] 设计 StockAdapter 接口
- [ ] 实现幂等重试与降级熔断
- [ ] 联调老旧 ERP 模拟数据

### 事件总线基础设施
> 选用 Kafka 构建高性能事件通道。

#### Schema 注册表与契约验证
> 统一事件 payload 定义与版本兼容性检查。
- [x] 接入 Avro Schema Registry
- [x] 制定 Backward 兼容性策略
- [ ] 编写事件序列化与反序列化 Benchmark

## 阶段二：服务实现与并行跑批
> 双写验证，保证新旧系统数据 100% 一致性。

### 订单核心微服务
> 基于 Go-Zero 构建高并发订单接入层。

#### 下单接口改造
> 切换至基于分布式事务的分离下单。
- [x] 实现基于 Redis 的分布式幂等校验
- [x] 改造 MySQL 分库分表逻辑
- [ ] 接入 Seata TCC 事务补偿

#### 状态投影与读模型
> 使用 CQRS 模式构建读写分离投影流。
- [x] 接入 Debezium CDC 监听 MySQL Binlog
- [ ] 实时同步数据至 Elasticsearch 查询集群
- [ ] 验证投影延迟低于 50ms
```diff
- select * from orders where user_id = ?
+ searchEs(buildUserOrderQuery(userId))
```

## 阶段三：灰度切流与生产上线
> 稳健的百分比切流与全链路可观测。

### 流量路由与金丝雀发布
> 在网关层基于用户 ID 哈希执行动态分流。

#### 网关路由规则配置
> 在 APISIX 网关中配置 Canary 插件。
- [x] 编写 Lua 灰度规则脚本
- [ ] 开展 5% 灰度测试
- [ ] 观察 24 小时错误率与 P99 延迟

#### 回滚预案演练
> 演练突发故障下 30 秒秒级全量回切老系统。
- [ ] 编写自动化一键回切脚本
- [ ] 组织生产模拟断网演练
- [ ] 输出灰度复盘与验收总结报告
