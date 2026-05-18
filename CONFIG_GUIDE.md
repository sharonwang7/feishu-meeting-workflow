# 配置指南

本 Skill 采用**配置外部化设计**，所有敏感信息和本地化配置均从配置文件读取，代码中无任何硬编码。

---

## 📋 配置文件说明

### 1. config.json（推荐）

**位置**: `skills/feishu-meeting-workflow/config.json`

**用途**: 存储所有运行时配置，包括飞书应用、LLM 服务、多维表格等。

**示例**:
```json
{
  "feishu": {
    "app_id": "cli_xxx",
    "app_secret": "xxx"
  },
  "roles": {
    "decision_maker_open_id": "ou_xxx",
    "organizer_open_id": "ou_xxx"
  },
  "llm": {
    "endpoint": "localhost:8000",
    "model": "qwen3.5-397b"
  },
  "tables": {
    "task_management_base_token": "xxx",
    "task_management_table_id": "tblxxx"
  },
  "cron": {
    "overdue_reminder_job_id": ""
  },
  "minutes": {
    "check_window_minutes": 60
  },
  "automation": {
    "reminder_days_before": 3
  },
  "paths": {
    "processed_file": "../../memory/processed-meetings-summary.json",
    "cache_file": "../../memory/meeting-summary-cache.json",
    "output_dir": "./minutes"
  }
}
```

---

### 2. .env（可选）

**位置**: `skills/feishu-meeting-workflow/.env`

**用途**: 通过环境变量方式配置，优先级高于 config.json。

**示例**:
```bash
# 飞书应用配置
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx

# 用户角色配置
DECISION_MAKER_OPEN_ID=ou_xxx
ORGANIZER_OPEN_ID=ou_xxx

# LLM API 配置（从本地配置文件读取）
LLM_ENDPOINT=localhost:8000
LLM_MODEL=qwen3.5-397b

# 多维表格配置
MEETING_TASK_BASE_TOKEN=xxx
MEETING_TASK_TABLE_ID=tblxxx
```

---

## 🔑 关键配置项说明

### LLM 配置（重点）

**`llm.endpoint`** 和 **`llm.model`** 是本 Skill 的核心配置，**必须从本地配置文件读取**。

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| `llm.endpoint` | LLM API 服务地址 | `localhost:8000` 或 `https://api.xxx.com` |
| `llm.model` | 模型名称 | `qwen3.5-397b` 或 `gpt-4` 等 |

**为什么这样设计？**
1. **不同用户有不同的 LLM 服务**：有人用本地部署，有人用远程 API
2. **避免代码污染**：不在代码中硬编码任何用户的配置
3. **安全性**：敏感信息不进入 Git 仓库

**如何配置？**
1. 复制 `config.json` 文件（如已存在则直接编辑）
2. 填写你的 LLM 服务地址和模型名称
3. 保存后运行 `node index.js` 测试

---

### 飞书应用配置

| 配置项 | 说明 | 获取方式 |
|--------|------|---------|
| `feishu.app_id` | 飞书应用 App ID | 飞书开放平台 → 企业自建应用 → 凭证管理 |
| `feishu.app_secret` | 飞书应用 App Secret | 同上 |

---

### 用户角色配置

| 配置项 | 说明 | 获取方式 |
|--------|------|---------|
| `roles.decision_maker_open_id` | 决策者 open_id（接收预览、战略决策） | 飞书 → 点击用户头像 → 复制 open_id |
| `roles.organizer_open_id` | 日程组织者 open_id（用于权限过滤） | 同上（通常与 decision_maker 相同） |

---

### 多维表格配置（可选）

| 配置项 | 说明 | 获取方式 |
|--------|------|---------|
| `tables.task_management_base_token` | 任务管理表 base token | 多维表格 URL 中提取 |
| `tables.task_management_table_id` | 任务管理表 table ID | 多维表格 URL 中提取 |

---

## 🚀 快速开始

### 步骤 1: 复制配置文件

```bash
cd skills/feishu-meeting-workflow
cp config.json config.json  # 如已存在可跳过
```

### 步骤 2: 编辑配置

使用文本编辑器打开 `config.json`，填写你的配置值。

**必填项**（必须填写才能运行）:
- ✅ `feishu.app_id`
- ✅ `feishu.app_secret`
- ✅ `roles.decision_maker_open_id`
- ✅ `roles.organizer_open_id`
- ✅ `llm.endpoint`
- ✅ `llm.model`

**可选项**（根据需求填写）:
- ⚪ `tables.task_management_base_token`
- ⚪ `tables.task_management_table_id`
- ⚪ `cron.overdue_reminder_job_id`

### 步骤 3: 验证配置

```bash
node -e "const config = require('./lib/config-loader').loadConfig(); console.log(JSON.stringify(config, null, 2))"
```

如配置正确，会输出完整的配置对象。

### 步骤 4: 运行测试

```bash
npm install
npm test
```

---

## ⚠️ 注意事项

1. **不要提交配置文件到 Git**: `.gitignore` 已配置，`config.json` 和 `.env` 会被忽略
2. **LLM 服务必须可用**: 如使用本地部署，确保 `localhost:8000` 可访问
3. **飞书应用权限**: 确保应用有以下权限：
   - 云文档读写
   - 日历读写
   - 妙记读写
   - 多维表格读写
   - 飞书任务
   - 消息发送

---

## 🆘 常见问题

### Q: LLM 服务地址填什么？

**A**: 取决于你的 LLM 部署方式：
- **本地部署**: `localhost:8000` 或 `127.0.0.1:8000`
- **远程 API**: `https://api.xxx.com`（完整 URL）
- **Docker 部署**: `http://host.docker.internal:8000`（Mac/Windows）

### Q: 模型名称填什么？

**A**: 填写你的 LLM 服务支持的模型名称，例如：
- `qwen3.5-397b`（通义千问）
- `gpt-4`（OpenAI）
- `claude-3`（Anthropic）
- 或其他你部署的模型

### Q: 配置文件格式错误怎么办？

**A**: 使用 JSON 验证工具检查 `config.json` 格式，或改用 YAML 格式（`config.yaml`）。

### Q: 如何切换不同环境（开发/生产）？

**A**: 创建多个配置文件，如 `config.dev.json` 和 `config.prod.json`，使用时复制为 `config.json`。

---

*最后更新：2026-05-18 | 版本：v3.4*
