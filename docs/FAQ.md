# 常见问题 (FAQ)

本文档汇总了使用飞书会议总结 Skill 时的常见问题及解决方案。

---

## 📌 安装与配置

### Q1: npm install 失败，提示 "ENOTFOUND"

**问题**: 网络问题导致依赖下载失败

**解决方案**:
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com

# 清除缓存后重试
npm cache clean --force
npm install
```

---

### Q2: lark-cli 安装失败，提示权限错误

**问题**: 全局安装需要管理员权限

**解决方案**:
```bash
# Windows：以管理员身份运行命令行
# macOS/Linux：使用 sudo
sudo npm install -g @lark-base-cli/cli

# 或使用 yarn（不需要 sudo）
yarn global add @lark-base-cli/cli
```

---

### Q3: 找不到 open_id 在哪里获取

**问题**: 不知道如何获取飞书用户的 open_id

**解决方案**:
1. 打开飞书桌面版或网页版
2. 点击目标用户的头像
3. 在弹出的个人资料页面，复制 open_id（格式：`ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）
4. 或者在飞书开放平台 → 用户管理 → 搜索用户 → 查看 open_id

---

### Q4: LLM API 连接失败

**问题**: 调用 LLM API 时提示连接错误

**解决方案**:
1. **检查 LLM 服务是否运行**:
   ```bash
   curl http://localhost:8000/v1/models
   ```
   
2. **检查配置**:
   - 确认 `.env` 中 `LLM_ENDPOINT` 地址正确
   - 确认端口号正确（默认 8000）

3. **防火墙设置**:
   - 确保 LLM 服务端口未被防火墙阻止
   - 如果是远程服务器，确认安全组规则

---

## 🔧 使用问题

### Q5: 妙记搜索不到任何结果

**问题**: 运行后提示 "未找到妙记"

**可能原因**:
1. Heartbeat 检查窗口内没有新增妙记
2. 妙记所有者配置错误
3. lark-cli 未正确登录

**解决方案**:
```bash
# 1. 检查妙记所有者配置
# 确认 ORGANIZER_OPEN_ID 是正确的用户

# 2. 手动测试 lark-cli
lark-cli minutes +search --owner-ids "ou_xxx" --start "2026-05-15" --end "2026-05-15"

# 3. 检查 lark-cli 登录状态
lark-cli login
```

---

### Q6: LLM 提取结果为空或分类错误

**问题**: 价值提取结果不准确

**可能原因**:
1. 转录文字稿质量差（识别错误多）
2. LLM 模型能力不足
3. 提示词需要优化

**解决方案**:
1. **检查转录质量**: 打开妙记，确认转文字准确率
2. **调整温度参数**: 降低 `llm.temperature`（如 0.1 → 0.05）
3. **手动标注**: 在会议中明确说出决策和任务，便于 AI 识别

---

### Q7: 文档权限设置失败

**问题**: 提示权限设置失败

**可能原因**:
1. lark-cli 版本过低
2. 文档 token 错误
3. 权限 API 限制

**解决方案**:
```bash
# 1. 更新 lark-cli
npm install -g @lark-base-cli/cli

# 2. 手动测试权限设置
lark-cli drive permission.public patch --token [DOC_TOKEN] --type docx --data '{"link_share_entity":"tenant_readable"}' --yes

# 3. 检查文档 token 是否正确
# 从飞书文档 URL 中提取 token
```

---

### Q8: 任务未录入多维表格

**问题**: P1 任务提取后未自动录入表格

**可能原因**:
1. 多维表格配置缺失
2. lark-cli 命令执行失败
3. 字段名称不匹配

**解决方案**:
```bash
# 1. 检查配置
# 确认 .env 中 MEETING_TASK_BASE_TOKEN 和 MEETING_TASK_TABLE_ID 已填写

# 2. 手动测试录入
lark-cli base +record-create \
  --base-token [BASE_TOKEN] \
  --table "会议任务管理" \
  --fields '{"任务内容":"测试任务","负责人":"张三","截止时间":"2026-05-25","当前状态":"进行中","来源会议":"测试会议","妙记 token":"xxx"}'

# 3. 检查字段名称
# 确认多维表格字段名称与命令中的完全一致
```

---

## 🔄 工作流问题

### Q9: 会前文档 E/F 未生成

**问题**: 下次会议前没有收到历史关联文档

**可能原因**:
1. 会议缓存为空（首次使用）
2. 会议匹配失败（标题差异大）
3. Heartbeat 未触发检查

**解决方案**:
```bash
# 1. 检查缓存文件
cat memory/meeting-summary-cache.json

# 2. 手动触发检查
node index.js

# 3. 检查会前文档目录
ls memory/pre-meeting-docs/
```

**说明**:
- 首次使用时，会提示"首次使用，跨会议关联将在下次会议后启用"
- 第 2 次会议后开始生成简单对比
- 第 3 次会议后三重检测全开

---

### Q10: 任务逾期提醒未发送

**问题**: 任务到期前没有收到提醒

**可能原因**:
1. Cron Job 未配置
2. 多维表格自动化规则未创建
3. 任务状态已为"已完成"

**解决方案**:
```bash
# 1. 检查 Cron Job 配置
# 确认 .env 中 CRON_OVERDUE_REMINDER_JOB_ID 已填写

# 2. 手动创建自动化规则
lark-cli base +workflow-create \
  --base-token [BASE_TOKEN] \
  --title "任务到期前 3 天提醒" \
  --client-token "task_reminder_3days" \
  --steps '[...]'

# 3. 检查任务状态
# 确认任务状态不是"已完成"
```

---

## 🤖 AI 相关问题

### Q11: AI 提取的负责人名字不准确

**问题**: 任务负责人是"小王"而不是全名

**解决方案**:
- 这是 AI 的处理边界，会标注"小王（待确认全名）"
- 王爷在审核时可以手动修正
- 建议会议中明确说出全名

---

### Q12: AI 编造了不存在的决策

**问题**: 文档中出现了会议中未提及的内容

**解决方案**:
1. **检查 LLM 温度参数**: 降低 `llm.temperature`（如 0.1 → 0.05）
2. **优化提示词**: 在 `lib/extract.js` 中强调"不要编造信息"
3. **人工审核**: 王爷在预览阶段仔细检查，回复调整意见

**核心原则**: 宁可标"待确认"，绝不编造。

---

### Q13: 会议类型判断错误

**问题**: 将项目评审误判为周会

**解决方案**:
- 当前使用简化版关键词匹配
- 优化方向：引入 LLM 判断会议类型
- 可以在提示词中增加会议类型判断规则

---

## 📊 性能与优化

### Q14: 处理速度慢

**问题**: 单次处理耗时超过 5 分钟

**可能原因**:
1. 妙记文字稿过长（>30k 字）
2. LLM API 响应慢
3. 网络延迟

**解决方案**:
```bash
# 1. 检查文字稿长度
# 如果>30k 字，考虑截断或分页处理

# 2. 优化 LLM 配置
# 降低 max_tokens（如 4096 → 2048）

# 3. 使用本地 LLM 服务
# 减少网络延迟
```

---

### Q15: 缓存文件过大

**问题**: memory/meeting-summary-cache.json 超过 10MB

**解决方案**:
```bash
# 手动清理过期缓存（保留 90 天）
node -e "require('./lib/cache').cleanupOldCache('../../memory/meeting-summary-cache.json', 90)"

# 或修改配置，自动清理
# 在 index.js 中添加定期清理逻辑
```

---

## 🔒 权限与安全

### Q16: 飞书开放平台权限不足

**问题**: API 调用提示权限不足

**解决方案**:
1. 登录飞书开放平台
2. 进入企业自建应用
3. 添加以下权限：
   - 妙记读写权限
   - 云文档读写权限
   - 多维表格读写权限
   - 日历读写权限
   - 任务读写权限
4. 发布应用

---

### Q17: 敏感信息泄露

**问题**: 担心配置文件泄露敏感信息

**解决方案**:
1. **使用环境变量**: 敏感信息通过 `.env` 文件管理
2. **添加到 .gitignore**: 确保 `.env` 不提交到 Git
3. **定期轮换密钥**: 定期更新飞书应用 Secret

---

## 📞 其他问题

### Q18: 如何提交 Bug 或建议？

**方式**:
1. GitHub Issues: https://github.com/your-username/feishu-meeting-summary/issues
2. 飞书联系：三公子
3. 邮件：your-email@example.com

---

### Q19: 如何贡献代码？

**步骤**:
1. Fork 本项目
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送到分支：`git push origin feature/your-feature`
5. 创建 Pull Request

详见 [CONTRIBUTING.md](../CONTRIBUTING.md)

---

### Q20: 许可证是什么？

**答案**: MIT License

详见 [LICENSE](../LICENSE) 文件。

---

*最后更新：2026-05-15 | 版本：v3.3*
