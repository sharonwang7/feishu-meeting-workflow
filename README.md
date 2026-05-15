# 飞书通用会议总结 Skill (Feishu Meeting Summary V3.3)

**版本**: v3.4（架构重构 + 模块化 + 开源安全 + 通用配置）  
**设计框架**: 《通用会议总结 Skill 完整设计框架 V3.0》  
**License**: MIT

[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 一句话介绍

**上传会议录音/妙记 → LLM 智能价值提取 → 自动生成 6 类文档 → 任务闭环追踪**

解决开完会后没人系统性记录：谁该做什么？什么时候做完？哪些风险该持续盯着？

> 💡 **说明**: 本文档中的"[决策者]"是示例称呼，实际使用时请替换为你的角色名称（如"CEO"、"项目负责人"等）。

---

## ⚡ 快速开始（5 分钟）

### 1. 安装依赖

```bash
cd skills/feishu-meeting-workflow
npm install
```

### 2. 配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 编辑 .env 文件，填写必要配置
# 必填项：
# - FEISHU_APP_ID
# - FEISHU_APP_SECRET
# - DECISION_MAKER_OPEN_ID
# - LLM_ENDPOINT
# - LLM_MODEL
```

### 3. 运行测试

```bash
# 使用测试妙记验证完整流程
npm test
```

### 4. 触发执行

**方式一：Heartbeat 自动触发**（推荐）
- Heartbeat 检查新增妙记（12:00/17:00/22:00）
- 自动处理过去 5 小时内的妙记

**方式二：手动触发**
```bash
node index.js
```

---

## 📄 核心功能

### 六级价值量判断

| 等级 | 标签 | 含义 | 输出文档 |
|---|---|---|---|
| **P0** | 🔴 战略级 | 涉及公司方向、重大决策、CEO 拍板 | 《战略决策备忘》 |
| **P0.5** | 🔶 风险级 | 会上提了但没解决的风险/分歧/担忧 | 《风险与问题台账》 |
| **P1** | 🟠 行动级 | 需要具体某人限时完成的明确任务 | 《个人执行任务单》 |
| **P2** | 🟡 知悉级 | 不需要行动，但与某些人相关 | 《信息分发快报》 |
| **P3** | 🟢 背景级 | 背景信息、行业趋势、参考观点 | 《信息分发快报》附录 |
| **P4** | ⬜ 无效级 | 闲聊、寒暄、重复讨论 | 直接丢弃 |

### 6 类文档体系

| 文档 | 名称 | 优先级 | 接收人 | 发送时机 |
|---|---|---|---|---|
| **逐字稿** | 完整发言记录 | - | 存档 | 会议结束后 |
| **A** | 《战略决策备忘》 | P0 | 高管层 | 会议结束后 |
| **B** | 《风险与问题台账》 | P0.5 | 决策者 + 责任人 | 会议结束后 |
| **C×N** | 《个人执行任务单》 | P1 | 各执行人 | 会议结束后 |
| **D×M** | 《信息分发快报》 | P2/P3 | 相关部门 | 会议结束后 |
| **E** | 《历史关联与冲突速查》 | - | 决策者 | 下次会前 24h |
| **F** | 《历史待办执行状态速查表》 | - | 决策者 | 下次会前 24h |

> 💡 **说明**: 文档中的"[决策者]"是示例称呼，实际使用时指配置中的 `DECISION_MAKER_OPEN_ID`

---

## 🔧 配置说明

### 必填配置项

| 配置项 | 说明 | 获取方式 |
|--------|------|---------|
| `FEISHU_APP_ID` | 飞书应用 App ID | 飞书开放平台 → 企业自建应用 → 凭证管理 |
| `FEISHU_APP_SECRET` | 飞书应用 App Secret | 同上 |
| `DECISION_MAKER_OPEN_ID` | 决策者 open_id（示例中称为"王爷"） | 飞书 → 点击用户头像 → 复制 open_id |
| `LLM_ENDPOINT` | LLM API 地址 | 本地部署：`localhost:8000` |
| `LLM_MODEL` | LLM 模型名称 | 根据实际部署的模型填写 |

### 可选配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `ORGANIZER_OPEN_ID` | 同 DECISION_MAKER | 日程组织者 open_id（用于权限过滤） |
| `MEETING_TASK_BASE_TOKEN` | - | 任务管理表 base token（**不要硬编码**） |
| `MEETING_TASK_TABLE_ID` | - | 任务管理表 table ID |
| `CHECK_WINDOW_MINUTES` | 60 | 妙记检查窗口（分钟） |
| `REMINDER_DAYS_BEFORE` | 3 | 任务到期前提醒天数 |

> ⚠️ **重要**: `MEETING_TASK_BASE_TOKEN` 等配置项应从配置文件或环境变量读取，不要在代码中硬编码。

### 配置文件优先级

```
环境变量 > config.yaml / config.json > 默认值
```

---

## 📊 完整工作流（14 Steps）

```plaintext
会议录音/妙记
    ↓
Step 1-3: 查询日程 → 搜索妙记 → 读取文字稿
    ↓
Step 4: 生成逐字稿云文档
    ↓
Step 5: LLM 价值提取（P0/P0.5/P1/P2/P3/P4）
    ↓
Step 6: 创建 4 份分发云文档（A/B/C/D）
    ↓
Step 6.5: ⭐ 权限自动设置（仅决策者可编辑）
    ↓
Step 7: 生成汇总文档 → 发送预览给决策者
    ↓
Step 10: 决策者回复"OK" → 设置权限为"组织内可读"，分发 4 份文档
    ↓
Step 8: 录入会议记录表格
    ↓
Step 9: 提取 P1 任务 → 录入任务表
    ↓
Step 9.5: ⭐⭐ 任务录入多维表格（触发自动化）
    ↓
Step 11: 创建飞书任务
    ↓
Step 12: 记录已处理 → 去重
    ↓
Step 13: Cron Job 逾期提醒（每天 9:00）
    ↓
Step 14: 会前文档 E/F 发送（下次会前 24h）
```

---

## 🧪 测试

### 单元测试

```bash
# 妙记读取测试
npm run test:minute

# 价值提取测试
npm run test:extract

# 完整工作流测试
npm run test:workflow
```

### 使用真实妙记测试

```bash
# 编辑 test-flow.js，填入测试妙记 token
# 然后运行
npm test
```

---

## 📦 文件结构

```plaintext
skills/feishu-meeting-workflow/
├── SKILL.md              # 完整设计文档
├── README.md             # 快速上手指南（本文件）
├── LICENSE               # MIT 许可证
├── package.json          # 项目配置
├── .env.example          # 环境变量示例
├── index.js              # 主程序入口
├── lib/
│   ├── config-loader.js  # 配置加载器
│   ├── extract.js        # LLM 价值提取模块
│   ├── template.js       # 文档模板引擎
│   ├── distribute.js     # 分发引擎
│   ├── cache.js          # 结构化缓存
│   └── permission.js     # 权限设置
├── test/
│   ├── test-minute.js    # 妙记读取测试
│   ├── test-extract.js   # 价值提取测试
│   └── test-workflow.js  # 完整工作流测试
└── memory/
    ├── processed-meetings.json  # 去重记录（30 天）
    ├── meeting-queue.json       # 待办队列
    └── meeting-summary-cache.json  # 结构化缓存
```

---

## 🤖 Agent 执行指南

### 主流程：会议总结

```bash
# Step 1: 运行脚本
node index.js

# Step 2: 读取预览文件
cat memory/meeting-preview.txt

# Step 3: 发送预览给决策者
feishu_im_user_message send \
  --receive_id_type "open_id" \
  --receive_id "[决策者 open_id]" \
  --msg_type "text" \
  --content '{"text":"预览内容..."}'

# Step 4: 等待决策者回复"发"确认

# Step 5: 创建文档
feishu_create_doc \
  --title "战略决策备忘 · 会议主题 - 2026-05-15" \
  --markdown "[文档内容]"

# Step 6: 设置权限
lark-cli drive permission.public patch \
  --token [DOC_TOKEN] \
  --type docx \
  --data '{"link_share_entity":"tenant_readable"}' \
  --yes

# Step 7: 创建飞书任务
feishu_task_task create \
  --summary "任务内容" \
  --description "来源会议：XXX" \
  --due '{"timestamp": "2026-05-20T23:59:59+08:00"}' \
  --members '[{"id": "ou_xxx", "role": "assignee"}]'
```

---

## 📚 详细文档

- **[SKILL.md](./SKILL.md)** - 完整设计文档、价值提取规则、配置项详解
- **[docs/INSTALL.md](./docs/INSTALL.md)** - 详细安装教程
- **[docs/CONFIG.md](./docs/CONFIG.md)** - 配置项说明
- **[docs/FAQ.md](./docs/FAQ.md)** - 常见问题
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - 贡献指南

---

## 🔄 版本历史

详见 [CHANGELOG.md](./CHANGELOG.md)

---

## ⚠️ 技术边界

### AI 可能出错的情况

| 情况 | 处理方式 |
|---|---|
| 录音提到"那个事"，无法推断 | 标注"待补充：请确认具体事项" |
| 未提截止时间 | 标注"截止时间：待确认" |
| 名字不明确（"小王"） | 标注"小王（待确认全名）" |
| 无法判断发给谁 | 标注"建议知悉：待确认" |

**核心原则**: 宁可标"待确认"，绝不编造。

### 降级模式说明 ⚠️

当 LLM API 不可用时，自动降级到关键词匹配模式。

**局限性**:
- 关键词匹配无法理解语义，专业讨论场景下 P0.5/P1 提取准确率显著下降
- 无法识别复杂的决策逻辑和任务分配关系

**建议**: 确保 LLM API 可用以获得最佳效果（准确率 85%+）

---

## 📝 使用示例

### 场景 1：妙记链接

```
用户：帮我总结这个会议
链接：https://jqx28l0j4lx.feishu.cn/minutes/obcnlleinigd2n98p742j2lm
```

### 场景 2：录音文件

```
用户：总结这个录音
[上传录音文件]
```

### 场景 3：文字稿

```
用户：整理这份会议记录
[上传 txt/docx 文件]
```

---

## 📊 实战验证

**XXX专利案会议**（2026-05-13，39 分钟，30k 字妙记）

| 指标 | 结果 | 说明 |
|:---|:---|:---|
| 原始妙记字数 | 30,329 字 | 飞书妙记自动转写 |
| 生成文档数量 | 4 份 | 战略决策 + 风险台账 + 任务单 + 信息快报 |
| 文档总字数 | ~11k 字 | 压缩比 2.7:1，信息密度提升 |
| 提取 P1 任务 | 3 条 | 配方检测实验、专利无效检索、侵权比对分析 |
| 录入任务表格 | ✅ 4 条 | XXX专利案任务管理表 |
| 归档会议记录 | ✅ 1 条 | 会议记录表 |

---

## 📄 License

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

*最后更新：2026-05-15 | 版本：v3.4 | 作者：[YOUR_NAME]*
