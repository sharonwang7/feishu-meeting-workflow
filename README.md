# 飞书通用会议总结 Skill (Feishu Meeting Summary V3.5)

**版本**: v3.6（一键安装脚本 + 三种安装方式引导）  
**设计框架**: 《通用会议总结 Skill 完整设计框架 V3.0》  
**License**: MIT

[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 一句话介绍

**在飞书日程结束/上传会议录音文件 → 全自动生成 6 类会议纪要 → 全自动任务提取 → 全自动权限判断和信息分发 → 全自动任务闭环追踪（多维表格归档 + 逾期追踪 + 会前关联）**

解决开完会后没人系统性记录：谁该做什么？什么时候做完？哪些风险该持续盯着？

> 💡 **说明**: 本文档中的"[决策者]"是示例称呼，实际使用时请替换为你的角色名称（如"CEO"、"项目负责人"等）。

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

## ⚡ 快速开始（5 步安装）

### 前置准备
- ✅ OpenClaw 已运行
- ✅ GitHub repo 已 clone
- ✅ `npm install` 已完成
- ✅ 已创建飞书应用（获得 App ID + App Secret）

---

### 方式一：让 Agent 帮你安装（推荐）

在飞书私聊你的 Agent，复制粘贴以下提示词：

> 请帮我安装 feishu-meeting-workflow 这个技能。
> 项目地址：https://github.com/sharonwang7/feishu-meeting-workflow.git
> 安装到：skills/feishu-meeting-workflow/ 目录
> 需要你帮我完成以下步骤：
> 1. 下载代码（Git 或 ZIP）
> 2. npm install 装依赖
> 3. 运行 setup.ps1 帮我完成 5 步配置
> 过程中我提供 App Secret 即可，LLM 配置和 Cron 任务由系统自动检测。

Agent 会引导你完成全部 5 步配置，全程有指引，放心使用。

---

### 方式二：手动安装（5 步交互流程）

#### Step 1: 运行安装脚本
打开 **PowerShell**（开始菜单搜索 PowerShell），执行：

```powershell
powershell -ExecutionPolicy Bypass -f setup.ps1
```

脚本启动后，会引导你完成以下 5 步。

#### Step 2: 阅读工作流介绍
脚本会逐一介绍 4 个工作模块：

| 模块 | 名称 | 说明 |
|:---:|:---|:---|
| **A** | 分级纪要 + 综合归档 | 一份会议 → 4 份分级文档 + 完整内容合并的综合纪要 |
| **B** | 任务管理 | P1 任务自动录入多维表格 + 到期前 N 天提醒 |
| **C** | 会前历史关联 | 下次同类会前 24h 推送历史决策 + 检测重复/矛盾 |
| **D** | 会议记录归档 | 逐字稿 + 综合纪要分别归档到多维表格 |

回复 `继续` 或 `next` 进入下一步。

#### Step 3: 选择需要的模块
脚本展示 4 个模块的简洁复述，输入编号（如 `1,2,4`）或 `all` 全选。

#### Step 4: 表格处理
根据所选模块，展示需要的表格和字段。你有两个选择：
- **[A] 已有表格发链接** → 脚本自动解析 token，检查并补全字段
- **[B] 自动创建** → 调用飞书 API 一键生成多维表格 + 配齐全部字段

#### Step 5: 自检完成
脚本打印最终检查结果，并引导你：
- **方式一**：等待日程自动触发
- **方式二**：立即发一条测试妙记链接验证全流程

---

> 💡 **配置说明**：参数配置（接收人、提醒天数等）不在安装时配置，而是在**每次处理妙记时**问用户，灵活适应每次会议的需求。

### macOS / Linux 用户

```bash
cd skills
git clone https://github.com/sharonwang7/feishu-meeting-workflow.git
cd feishu-meeting-workflow
npm install
bash setup.sh
```

get/setup.sh 已完成同样的 5 步交互流程适配。

## 🔧 配置说明

### 核心设计理念

**本 Skill 采用配置外部化设计**，所有敏感信息和本地化配置均从 `config.json` 或 `.env` 文件读取，**代码中无任何硬编码**。这使得：

1. ✅ **安全**：敏感信息不进入代码库
2. ✅ **灵活**：不同用户可使用各自的飞书应用、LLM 服务
3. ✅ **易部署**：复制示例配置文件，填写自己的值即可

### 基础配置（App ID / Secret / Open ID）

详见快速开始 → **[安装时准备](#📋-安装时准备)**。这部分信息是**首次安装时**一次性准备的。

### LLM 配置（自动检测）

| 配置项 | 说明 |
|--------|------|
| `LLM_ENDPOINT` | 由 `setup.ps1` 从系统配置自动读取，无需手动填写 |
| `LLM_MODEL` | 同上 |

> 如需手动指定，可编辑 `config.json` 中的 `llm.endpoint` 和 `llm.model`。

### 可选配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `ORGANIZER_OPEN_ID` | 同 DECISION_MAKER | 日程组织者 open_id（用于权限过滤） |
| `MEETING_TASK_BASE_TOKEN` | - | 任务管理表 base token |
| `MEETING_TASK_TABLE_ID` | - | 任务管理表 table ID |
| `CHECK_WINDOW_MINUTES` | 60 | 妙记检查窗口（分钟） |
| `REMINDER_DAYS_BEFORE` | 3 | 任务到期前提醒天数 |

### 配置文件参考

```json
{
  "feishu": {
    "app_id": "cli_xxx",
    "app_secret": "xxx"
  },
  "roles": {
    "decision_maker_open_id": "ou_xxx"
  },
  "llm": {
    "endpoint": "",              // setup.ps1 自动填写
    "model": ""                   // setup.ps1 自动填写
  },
  "tables": {
    "task_management_base_token": "",
    "task_management_table_id": ""
  }
}
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

*最后更新：2026-05-19 | 版本：v3.6 | 作者：[YOUR_NAME]*
