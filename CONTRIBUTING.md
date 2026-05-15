# 贡献指南

感谢你对本项目的关注！欢迎通过以下方式参与贡献。

---

## 🤝 如何贡献

### 1. 报告 Bug

发现 Bug？请创建 Issue 并提供以下信息：

- **问题描述**: 清晰描述问题现象
- **复现步骤**: 详细的重现步骤
- **期望行为**: 你认为应该发生什么
- **实际行为**: 实际发生了什么
- **环境信息**: Node.js 版本、操作系统、lark-cli 版本等
- **日志**: 相关错误日志（如有）

**Issue 模板**:
```markdown
### 问题描述
[清晰描述问题]

### 复现步骤
1. [步骤 1]
2. [步骤 2]
3. [步骤 3]

### 期望行为
[应该发生什么]

### 实际行为
[实际发生了什么]

### 环境信息
- Node.js: [版本]
- 操作系统：[系统]
- lark-cli: [版本]

### 日志
[相关错误日志]
```

---

### 2. 提交功能建议

有新想法？欢迎创建 Issue 讨论：

- **功能描述**: 清晰描述新功能
- **使用场景**: 什么情况下会用到
- **实现思路**: 如何实现（可选）
- **替代方案**: 是否有其他解决方案

---

### 3. 提交代码

#### Step 1: Fork 项目

```bash
# GitHub 上点击 Fork 按钮
# 然后克隆到本地
git clone https://github.com/YOUR_USERNAME/feishu-meeting-summary.git
cd feishu-meeting-summary
```

#### Step 2: 创建功能分支

```bash
# 从 main 分支创建新分支
git checkout -b feature/your-feature-name

# 分支命名规范：
# - feature/xxx - 新功能
# - bugfix/xxx - Bug 修复
# - docs/xxx - 文档更新
# - refactor/xxx - 代码重构
```

#### Step 3: 开发并测试

```bash
# 安装依赖
npm install

# 编写代码
# ...

# 运行测试
npm test

# 代码检查
npm run lint
```

#### Step 4: 提交更改

```bash
# 添加更改
git add .

# 提交（使用清晰的提交信息）
git commit -m "feat: 添加新功能"

# 提交信息规范：
# - feat: 新功能
# - fix: Bug 修复
# - docs: 文档更新
# - style: 代码格式
# - refactor: 代码重构
# - test: 测试相关
# - chore: 构建/工具相关
```

#### Step 5: 推送到远程

```bash
git push origin feature/your-feature-name
```

#### Step 6: 创建 Pull Request

1. 在 GitHub 上打开你的 Fork
2. 点击 "Compare & pull request"
3. 填写 PR 描述：
   - **变更内容**: 做了什么改动
   - **关联 Issue**: 如 `Fixes #123`
   - **测试说明**: 如何测试这些改动
4. 提交 PR

---

## 📝 代码规范

### JavaScript 代码风格

遵循 ESLint 默认规则：

```bash
# 运行代码检查
npm run lint

# 自动修复
npm run lint -- --fix
```

**基本要求**:
- 使用 2 空格缩进
- 单引号字符串
- 语句末尾加分号
- 函数使用驼峰命名
- 类使用大驼峰命名
- 常量使用全大写 + 下划线

---

### 文档规范

**Markdown 格式**:
- 标题使用 `#` 分级
- 列表使用 `-` 或 `1.`
- 代码块使用 ``` 包裹
- 链接使用 `[文本](URL)`

**文档结构**:
```markdown
# 标题

## 章节

### 小节

- 列表项
- 列表项

**粗体**: 强调

`行内代码`: 技术术语

```bash
# 代码块
命令
```
```

---

## 🧪 测试要求

### 单元测试

新功能需要添加对应的单元测试：

```javascript
// test/test-extract.js
const assert = require('assert');
const { extractValue } = require('../lib/extract');

describe('extractValue', () => {
  it('应该正确提取 P0 决策', async () => {
    const transcript = '我们决定启动这个项目';
    const result = await extractValue(transcript, {}, config);
    assert.strictEqual(result.p0.length, 1);
  });
});
```

### 集成测试

确保完整工作流正常运行：

```bash
# 运行所有测试
npm test

# 运行特定测试
npm run test:minute
npm run test:extract
npm run test:workflow
```

---

## 📚 文档更新

### 更新 README.md

如果添加了新功能，需要：

1. 在 README.md 中添加功能说明
2. 更新配置项表格（如有新配置）
3. 更新使用示例（如有新用法）

### 更新 CHANGELOG.md

每次 PR 需要在 CHANGELOG.md 中添加记录：

```markdown
## [版本号] - 日期

### ✨ 新增功能
- 功能描述

### 🔧 优化改进
- 优化描述

### 🐛 Bug 修复
- 修复描述
```

---

## 🔍 Code Review

### Review 标准

PR 会被检查以下方面：

- ✅ 代码质量：逻辑清晰、无冗余代码
- ✅ 测试覆盖：新功能有对应测试
- ✅ 文档完整：README/CHANGELOG 已更新
- ✅ 代码风格：符合 ESLint 规范
- ✅ 向后兼容：不破坏现有功能

### Review 流程

1. 提交 PR 后，维护者会在 48 小时内 Review
2. 如有问题，会提出修改建议
3. 修改后重新提交
4. Review 通过后合并到 main 分支

---

## 📦 发布流程

### 版本号规则

遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

- **主版本号（Major）**: 不兼容的 API 变更
- **次版本号（Minor）**: 向后兼容的功能性新增
- **修订号（Patch）**: 向后兼容的问题修正

### 发布步骤

1. 更新 `package.json` 中的版本号
2. 更新 `CHANGELOG.md`
3. 提交并打 Tag：
   ```bash
   git commit -m "chore: release v3.3.0"
   git tag v3.3.0
   git push origin main --tags
   ```
4. 发布到 npm（如适用）：
   ```bash
   npm publish
   ```

---

## 🙏 致谢

感谢所有为本项目做出贡献的开发者！

- 三公子 - 初始版本和核心功能
- [你的名字] - [贡献内容]

---

## 📞 联系方式

- GitHub Issues: https://github.com/your-username/feishu-meeting-summary/issues
- 飞书：三公子
- 邮箱：your-email@example.com

---

*最后更新：2026-05-15 | 版本：v3.3*
