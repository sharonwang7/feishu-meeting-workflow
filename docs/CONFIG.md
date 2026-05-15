# 配置项说明

本文档详细介绍所有配置项及其用途。

---

## 📋 配置文件

支持三种配置方式（优先级从高到低）：

1. **环境变量**（`.env` 文件或系统环境变量）
2. **YAML 配置**（`config.yaml`）
3. **JSON 配置**（`config.json`）

---

## 🔑 必填配置项

### 飞书应用配置

| 配置项 | 环境变量 | 说明 | 示例 |
|--------|---------|------|------|
| `feishu.app_id` | `FEISHU_APP_ID` | 飞书应用 App ID | `cli_xxxxxxxxxxxxx` |
| `feishu.app_secret` | `FEISHU_APP_SECRET` | 飞书应用 App Secret | `xxxxxxxxxxxxxxxx` |

**获取方式**：
1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 进入"企业自建应用"
3. 创建应用或选择已有应用
4. 点击"凭证管理" → 查看 App ID 和 App Secret

---

### 用户角色配置

| 配置项 | 环境变量 | 说明 | 示例 |
|--------|---------|------|------|
| `roles.decision_maker_open_id` | `DECISION_MAKER_OPEN_ID` | 决策者 open_id（接收预览） | `ou_xxxxxxxxxxxxx` |
| `roles.organizer_open_id` | `ORGANIZER_OPEN_ID` | 日程组织者 open_id（权限过滤） | `ou_xxxxxxxxxxxxx` |

**获取方式**：
1. 打开飞书
2. 点击用户头像
3. 复制 open_id（格式：`ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

**说明**：
- `decision_maker_open_id`：接收战略决策、风险台账预览的用户
- `organizer_open_id`：只处理此人创建的日程和妙记（通常与 decision_maker 相同）

---

### LLM API 配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|---------|--------|------|
| `llm.endpoint` | `LLM_ENDPOINT` | `localhost:8000` | LLM API 地址 |
| `llm.model` | `LLM_MODEL` | `qwen3.5-397b` | LLM 模型名称 |
| `llm.max_tokens` | - | `4096` | 最大输出 token 数 |
| `llm.temperature` | - | `0.1` | 温度参数（越低越确定性） |

**支持的 endpoint 格式**：
- `localhost:8000`
- `http://localhost:8000`
- `https://your-llm-server.com`

---

## 📊 可选配置项

### 多维表格配置

| 配置项 | 环境变量 | 说明 |
|--------|---------|------|
| `tables.task_management_base_token` | `MEETING_TASK_BASE_TOKEN` | 任务管理表 base token |
| `tables.task_management_table_id` | `MEETING_TASK_TABLE_ID` | 任务管理表 table ID |
| `tables.meeting_records_base_token` | - | 会议记录表 base token（可选） |
| `tables.meeting_records_table_id` | - | 会议记录表 table ID（可选） |

**获取方式**：
1. 打开多维表格
2. 复制 URL 中的 token 部分
   - 示例 URL：`https://example.feishu.cn/base/ABC123xyz/table/DEF456uvw`
   - base token：`ABC123xyz`
   - table ID：`DEF456uvw`

---

### Cron Job 配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|---------|--------|------|
| `cron.overdue_reminder_job_id` | - | - | 逾期提醒 Cron Job ID |

**说明**：
- 在 OpenClaw 或定时任务平台创建 Cron Job 后填入
- 用于每天 9:00 检查逾期任务

---

### 妙记配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|---------|--------|------|
| `minutes.check_window_minutes` | `CHECK_WINDOW_MINUTES` | `60` | 妙记检查窗口（分钟） |
| `minutes.test_minute_token` | - | - | 测试妙记 token（仅用于测试） |

**说明**：
- `check_window_minutes`：Heartbeat 检查过去多少分钟内的妙记
- `test_minute_token`：用于测试的妙记 token（从妙记 URL 获取）

---

### 自动化配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|---------|--------|------|
| `automation.reminder_days_before` | `REMINDER_DAYS_BEFORE` | `3` | 到期前多少天提醒 |

**说明**：
- 任务到期前 X 天自动提醒负责人
- 通过多维表格自动化规则实现

---

### 文件路径配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `paths.processed_file` | `../../memory/processed-meetings-summary.json` | 去重记录文件路径 |
| `paths.cache_file` | `../../memory/meeting-summary-cache.json` | 结构化缓存文件路径 |
| `paths.output_dir` | `./minutes` | lark-cli 妙记输出目录 |
| `paths.pre_meeting_docs_dir` | `../../memory/pre-meeting-docs` | 会前文档保存目录 |

**说明**：
- 路径相对于 `lib/` 目录
- 建议使用 `../../memory/` 格式，指向 workspace memory 目录

---

## 🔧 配置示例

### YAML 格式（config.yaml）

```yaml
feishu:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxx"

roles:
  decision_maker_open_id: "ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  organizer_open_id: "ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

llm:
  endpoint: "localhost:8000"
  model: "qwen3.5-397b"
  max_tokens: 4096
  temperature: 0.1

tables:
  task_management_base_token: "ABC123xyz"
  task_management_table_id: "tblDEF456uvw"

cron:
  overdue_reminder_job_id: "job_xxxxxxxxxxxxx"

minutes:
  check_window_minutes: 60
  test_minute_token: "obcnlleinigd2n98p742j2lm"

automation:
  reminder_days_before: 3

paths:
  processed_file: "../../memory/processed-meetings-summary.json"
  cache_file: "../../memory/meeting-summary-cache.json"
  output_dir: "./minutes"
  pre_meeting_docs_dir: "../../memory/pre-meeting-docs"
```

### JSON 格式（config.json）

```json
{
  "feishu": {
    "app_id": "cli_xxxxxxxxxxxxx",
    "app_secret": "xxxxxxxxxxxxxxxx"
  },
  "roles": {
    "decision_maker_open_id": "ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "organizer_open_id": "ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "llm": {
    "endpoint": "localhost:8000",
    "model": "qwen3.5-397b",
    "max_tokens": 4096,
    "temperature": 0.1
  },
  "tables": {
    "task_management_base_token": "ABC123xyz",
    "task_management_table_id": "tblDEF456uvw"
  },
  "cron": {
    "overdue_reminder_job_id": "job_xxxxxxxxxxxxx"
  },
  "minutes": {
    "check_window_minutes": 60,
    "test_minute_token": "obcnlleinigd2n98p742j2lm"
  },
  "automation": {
    "reminder_days_before": 3
  },
  "paths": {
    "processed_file": "../../memory/processed-meetings-summary.json",
    "cache_file": "../../memory/meeting-summary-cache.json",
    "output_dir": "./minutes",
    "pre_meeting_docs_dir": "../../memory/pre-meeting-docs"
  }
}
```

### 环境变量格式（.env）

```bash
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx
DECISION_MAKER_OPEN_ID=ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ORGANIZER_OPEN_ID=ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LLM_ENDPOINT=localhost:8000
LLM_MODEL=qwen3.5-397b
MEETING_TASK_BASE_TOKEN=ABC123xyz
MEETING_TASK_TABLE_ID=tblDEF456uvw
CHECK_WINDOW_MINUTES=60
REMINDER_DAYS_BEFORE=3
```

---

## 🎯 配置优先级

```
环境变量 > config.yaml / config.json > 默认值
```

**示例**：
- 如果 `.env` 中设置了 `LLM_ENDPOINT`，则覆盖 `config.yaml` 中的值
- 如果 `config.yaml` 中设置了 `llm.model`，则覆盖默认值 `qwen3.5-397b`

---

## 🔒 安全建议

1. **不要提交敏感信息到 Git**
   - `.env` 文件应添加到 `.gitignore`
   - 使用 `.env.example` 作为模板

2. **使用环境变量管理敏感信息**
   - `FEISHU_APP_SECRET` 等敏感信息建议通过环境变量注入
   - 不要写入 `config.yaml` 或 `config.json`

3. **定期轮换密钥**
   - 定期更新飞书应用 Secret
   - 定期更新 LLM API 密钥（如有）

---

## 📝 验证配置

```bash
# 运行测试验证配置
npm test

# 或手动运行
node index.js
```

如果配置正确，应该看到：
```
📋 已加载 config.yaml
🔍 开始检查新增妙记...
📅 搜索范围：2026-05-15 至 2026-05-15
```

---

*最后更新：2026-05-15 | 版本：v3.3*
