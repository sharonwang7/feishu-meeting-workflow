# 🦞 飞书会议总结 Skill - 开源发布总结

**版本**: v3.4.0  
**发布日期**: 2026-05-15  
**状态**: ✅ 开源就绪

---

## 🎯 一句话介绍

**上传会议录音/妙记 → LLM 智能价值提取 → 自动生成 6 类文档 → 任务闭环追踪**

解决开完会后没人系统性记录：谁该做什么？什么时候做完？哪些风险该持续盯着？

---

## 📦 核心功能

### 六级价值量判断
- **P0** 🔴 战略决策 → 《战略决策备忘》
- **P0.5** 🔶 风险信号 → 《风险与问题台账》
- **P1** 🟠 执行任务 → 《个人执行任务单》
- **P2** 🟡 知悉信息 → 《信息分发快报》
- **P3** 🟢 背景信息 → 《信息分发快报》附录
- **P4** ⬜ 无效内容 → 直接丢弃

### 6 类文档体系
| 文档 | 名称 | 接收人 | 时机 |
|:---|:---|:---|:---|
| 逐字稿 | 完整发言记录 | 存档 | 会后 |
| A | 《战略决策备忘》 | 高管层 | 会后 |
| B | 《风险与问题台账》 | 决策者 + 责任人 | 会后 |
| C×N | 《个人执行任务单》 | 各执行人 | 会后 |
| D×M | 《信息分发快报》 | 相关部门 | 会后 |
| E | 《历史关联与冲突速查》 | 决策者 | 会前 24h |
| F | 《历史待办执行状态速查表》 | 决策者 | 会前 24h |

---

## 🏗️ 技术架构

```
feishu-meeting-workflow/
├── index.js (617 行)          ← 主执行脚本
├── SKILL.md (~600 行)         ← 完整设计文档
├── README.md (~300 行)        ← 快速开始指南
├── package.json               ← 依赖管理
├── config.example.yaml        ← 配置示例
├── .env.example               ← 环境变量示例
├── lib/                       ← 6 个核心模块
│   ├── config-loader.js       ← 配置加载（支持 .env）
│   ├── extract.js             ← LLM 价值提取
│   ├── template.js            ← 文档模板生成
│   ├── distribute.js          ← 分发引擎
│   ├── cache.js               ← 结构化缓存
│   └── permission.js          ← 权限设置
├── test/                      ← 测试文件
│   └── test-flow.js           ← 完整流程测试
└── memory/                    ← 运行时数据
    ├── processed-meetings.json
    ├── meeting-queue.json
    └── meeting-summary-cache.json
```

---

## ⚡ 快速开始

### 1. 安装依赖
```bash
cd skills/feishu-meeting-workflow
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 填写：
# - FEISHU_APP_ID
# - FEISHU_APP_SECRET
# - DECISION_MAKER_OPEN_ID
# - LLM_ENDPOINT
# - LLM_MODEL
```

### 3. 运行测试
```bash
npm test
```

### 4. 触发执行
```bash
# 方式一：Heartbeat 自动触发（推荐）
# 方式二：手动触发
node index.js
```

---

## 🔧 配置方式

支持 3 种配置方式（优先级从高到低）：

1. **环境变量**（最高优先级）
   ```bash
   FEISHU_APP_ID=cli_xxx
   DECISION_MAKER_OPEN_ID=ou_xxx
   ```

2. **config.yaml / config.json**
   ```yaml
   roles:
     decision_maker_open_id: ou_xxx
   tables:
     task_management_base_token: xxx
   ```

3. **.env 文件**（敏感信息推荐）
   ```bash
   FEISHU_APP_SECRET=xxx
   ```

---

## 📊 实战验证

### XXX专利案
- **原始妙记**: 30,329 字
- **生成文档**: 4 份（~11k 字，压缩比 2.7:1）
- **提取任务**: 3 条 P1 任务
- **录入表格**: ✅ 4 条任务 + 1 条会议记录
- **权限设置**: ✅ 全部"组织内可读"

---

## 🎯 核心特性

1. **全自动**: Heartbeat 自动检查新增妙记（12:00/17:00/22:00）
2. **六级分类**: P0/P0.5/P1/P2/P3/P4，80% 价值藏在 P0.5 风险信号中
3. **权限自动**: 创建文档后立即设置"组织内获得链接的人可阅读"
4. **决策者确认**: 先预览确认，再分发，避免 AI 乱发
5. **任务闭环**: 录入多维表格 → 触发自动化 → Cron Job 逾期提醒
6. **跨会议关联**: 下次会前 24h 自动推送"上次定了什么 + 哪些没完成"

---

## 🛡️ 安全性

- ✅ 无硬编码敏感信息（open_id / baseToken / tableId）
- ✅ .gitignore 排除 .env 和 config.json
- ✅ 配置示例使用占位符
- ✅ 支持环境变量注入敏感信息

---

## 📈 版本历史

### v3.4.0 (2026-05-15) - 开源就绪
- ✅ 架构重构（1472 行 → 546 行，63% 缩减）
- ✅ 模块化设计（6 个 lib/ 模块）
- ✅ 开源安全修复（移除硬编码 token）
- ✅ 配置通用化（decision_maker_open_id）
- ✅ 文档完善（README/SKILL/CHANGELOG/CONTRIBUTING）

### v3.3.0 (2026-05-14) - XXX实战验证
- ✅ 确认机制（决策者预览后分发）
- ✅ 结构化缓存（跨会议关联）
- ✅ 权限自动设置

### v3.2.0 (2026-05-13) - LLM API 集成
- ✅ 接入 LLM API 进行价值提取
- ✅ 配置外部化（config.yaml）

---

## 🤝 贡献指南

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 License

MIT License - 详见 [LICENSE](./LICENSE)

---

## 📞 联系方式

- **GitHub**: https://github.com/your-username/feishu-meeting-summary
- **Issues**: https://github.com/your-username/feishu-meeting-summary/issues

---

*发布总结完成时间：2026-05-15 19:20*
