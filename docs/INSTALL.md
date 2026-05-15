# 安装指南

本文档详细介绍如何安装和配置飞书会议总结 Skill。

---

## 📋 前置要求

### 系统要求
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **操作系统**: Windows / macOS / Linux

### 依赖工具
- **lark-cli**: 飞书命令行工具（用于妙记搜索、文档权限设置等）
- **LLM API**: 本地或远程 LLM 服务（如 vllm/qwen3.5-397b）
- **飞书开放平台账号**: 企业自建应用权限

---

## 🚀 安装步骤

### Step 1: 克隆或复制 Skill

```bash
# 如果使用 Git
git clone <repository-url>
cd skills/feishu-meeting-workflow

# 或直接复制文件夹
cp -r skills/feishu-meeting-workflow /your/path/
```

### Step 2: 安装 Node.js 依赖

```bash
cd skills/feishu-meeting-workflow
npm install
```

这会安装以下依赖：
- `js-yaml`: YAML 配置文件解析
- `eslint`: 代码检查（开发依赖）

### Step 3: 安装 lark-cli

```bash
# 全局安装 lark-cli
npm install -g @lark-base-cli/cli

# 验证安装
lark-cli --version
```

**配置 lark-cli**：
```bash
# 登录飞书
lark-cli login

# 按照提示完成授权
```

### Step 4: 配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 编辑 .env 文件
# Windows: 使用记事本或 VS Code
# macOS/Linux: 使用 vim 或 nano
```

**必填配置项**：

| 变量名 | 说明 | 获取方式 |
|--------|------|---------|
| `FEISHU_APP_ID` | 飞书应用 App ID | 飞书开放平台 → 企业自建应用 → 凭证管理 |
| `FEISHU_APP_SECRET` | 飞书应用 App Secret | 同上 |
| `DECISION_MAKER_OPEN_ID` | 决策者 open_id | 飞书 → 点击用户头像 → 复制 open_id |
| `LLM_ENDPOINT` | LLM API 地址 | 本地部署：`localhost:8000` |
| `LLM_MODEL` | LLM 模型名称 | 根据实际部署的模型填写 |

**示例**：
```bash
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DECISION_MAKER_OPEN_ID=ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LLM_ENDPOINT=localhost:8000
LLM_MODEL=qwen3.5-397b
```

### Step 5: 配置多维表格（可选）

如果需要任务管理功能，需要创建多维表格：

1. **创建多维表格**
   - 打开飞书 → 云文档 → 新建 → 多维表格
   - 命名为"会议任务管理"

2. **添加字段**
   - 任务内容（文本）
   - 负责人（人员）
   - 截止时间（日期）
   - 当前状态（单选：待开始/进行中/已完成/已逾期）
   - 来源会议（文本）
   - 妙记 token（文本）

3. **获取配置信息**
   - 打开多维表格，复制 URL 中的 `base token` 和 `table ID`
   - 添加到 `.env` 文件：
     ```bash
     MEETING_TASK_BASE_TOKEN=xxxxxxxxxxxxxxxxxxxx
     MEETING_TASK_TABLE_ID=tblxxxxxxxxxxxx
     ```

### Step 6: 验证安装

```bash
# 运行测试
npm test

# 或手动运行
node index.js
```

如果看到以下输出，说明安装成功：
```
🔍 开始检查新增妙记...
📅 搜索范围：2026-05-15 至 2026-05-15
ℹ️ 未找到妙记
✅ 无新增妙记
```

---

## 🔧 常见问题

### 问题 1: npm install 失败

**原因**: Node.js 版本过低或网络问题

**解决方案**：
```bash
# 检查 Node.js 版本
node --version

# 如果版本 < 18.0.0，请升级 Node.js
# https://nodejs.org/

# 使用国内镜像
npm config set registry https://registry.npmmirror.com
npm install
```

### 问题 2: lark-cli 安装失败

**原因**: 权限问题或网络问题

**解决方案**：
```bash
# Windows：以管理员身份运行命令行
# macOS/Linux：使用 sudo
sudo npm install -g @lark-base-cli/cli

# 或使用 yarn
yarn global add @lark-base-cli/cli
```

### 问题 3: 飞书开放平台权限不足

**原因**: 应用未开通相应权限

**解决方案**：
1. 登录飞书开放平台
2. 进入企业自建应用
3. 添加权限：
   - 妙记读写权限
   - 云文档读写权限
   - 多维表格读写权限
   - 日历读写权限
   - 任务读写权限
4. 发布应用

### 问题 4: LLM API 连接失败

**原因**: LLM 服务未启动或地址错误

**解决方案**：
```bash
# 检查 LLM 服务是否运行
curl http://localhost:8000/v1/models

# 如果未运行，启动 LLM 服务
# 例如：vllm serve Qwen/Qwen2.5-72B-Instruct

# 修改 .env 中的 LLM_ENDPOINT
LLM_ENDPOINT=http://your-llm-server:8000
```

---

## 📝 下一步

安装完成后，请参考：
- **[CONFIG.md](./CONFIG.md)** - 详细配置项说明
- **[README.md](../README.md)** - 快速开始指南
- **[SKILL.md](../SKILL.md)** - 完整设计文档

---

*最后更新：2026-05-15 | 版本：v3.3*
