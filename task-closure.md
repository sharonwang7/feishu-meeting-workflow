# 任务闭环设计文档

**版本**: v1.0  
**创建时间**: 2026-05-15  
**关联 Skill**: `feishu-meeting-summary` V3.0

---

## 🎯 核心目标

实现会议任务的完整闭环管理，确保"会上说的"变成"实际做的"。

**完整流程**:
```
任务提取 → 创建飞书任务 → 逾期追踪 → 会前速查表 → 下次会议跟进
```

---

## 📊 任务闭环架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    会议转录文字稿                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  LLM 价值提取 (P1 任务)   │
         │  谁 × 做什么 × 何时      │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  创建飞书任务           │
         │  (feishu_task_task)    │
         └────────────┬───────────┘
                      │
                      ▼
    ┌─────────────────┴─────────────────┐
    │                                   │
    ▼                                   ▼
┌────────┐                    ┌────────────────┐
│ 缓存   │                    │  Heartbeat     │
│ 记录   │                    │  定期检查      │
│        │                    │  (逾期检测)    │
└────────┘                    └───────┬────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │  下次同类会议前 24h    │
                          │  生成文档 E/F          │
                          └───────────┬───────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │  发送给王爷           │
                          │  - 历史关联速查 (E)   │
                          │  - 待办状态速查表 (F)  │
                          └───────────────────────┘
```

---

## 🔄 完整流程说明

### Step 1: 任务提取（LLM）

**触发**: Heartbeat 检测到新增妙记

**输入**: 会议转录文字稿

**处理**:
- LLM 识别 P1 级执行任务
- 提取三要素：**谁** +** 做什么**+** 何时**
- 置信度标记：high/medium/low

**输出**:
```json
{
  "p1": [
    {
      "content": "完成系统接口对接",
      "owner": "张三",
      "deadline": "2026-05-20",
      "quote": "张三，你要在本周三前完成系统接口对接",
      "confidence": "high"
    }
  ]
}
```

---

### Step 2: 创建飞书任务

**触发**: 王爷确认"发"后

**工具**: `feishu_task_task`

**参数映射**:
| 飞书任务字段 | 来源 | 说明 |
|---|---|---|
| `summary` | `p1.content` | 任务标题 |
| `description` | 会议信息 + quote | 包含来源会议和原文引用 |
| `due.timestamp` | `p1.deadline` | 截止时间（ISO 8601） |
| `members[].id` | `p1.owner` | 负责人 open_id（需转换） |
| `members[].role` | 固定值 | "assignee" |

**示例指令**:
```javascript
feishu_task_task create
  --summary "完成系统接口对接"
  --description "来源会议：季度营销策略讨论\n会议日期：2026-05-15\n原文引用：张三，你要在本周三前完成系统接口对接"
  --due '{"timestamp": "2026-05-20T23:59:59+08:00", "is_all_day": false}'
  --members '[{"id": "ou_xxx", "role": "assignee"}]'
```

**注意事项**:
1. 负责人姓名需转换为 open_id（使用 `feishu_search_user`）
2. 无法识别负责人时，任务创建给王爷（作为默认负责人）
3. 截止时间未明确时，设置为"待确认"，不传 `due` 参数

---

### Step 3: 逾期追踪（Heartbeat）

**触发**: 每次 Heartbeat（建议每 30 分钟）

**检查逻辑**:
```javascript
// 伪代码
const now = new Date();
const tasks = await feishu_task_task list(); // 获取我负责的任务

tasks.forEach(task => {
  if (task.due && new Date(task.due.timestamp) < now) {
    if (task.status !== 'completed') {
      // 标记为逾期
      markAsOverdue(task);
    }
  }
});
```

**逾期处理**:
1. 更新缓存中的任务状态：`status = 'overdue'`
2. 记录逾期天数：`overdueDays = Math.floor((now - deadline) / 24h)`
3. 可选：发送提醒消息给负责人（需王爷授权）

**缓存更新**:
```json
{
  "p1_tasks": [
    {
      "task": "完成系统接口对接",
      "owner": "张三",
      "deadline": "2026-05-20",
      "status": "overdue",
      "overdueDays": 3,
      "feishu_task_id": "xxx"
    }
  ]
}
```

---

### Step 4: 会前速查表（文档 E/F）

**触发**: 下次同类会议前 24 小时

**检测逻辑**:
- 遍历会议缓存
- 查找 1-7 天前的会议
- 为每个会议生成文档 E/F

**文档 E: 《历史关联与冲突速查》**

三重检测:
1. **重复检测**: 议题是否与历史会议重复？
2. **矛盾检测**: 决策方向是否与历史相反？
3. **遗漏检测**: 上次待办是否本次未跟进？

**文档 F: 《历史待办执行状态速查表》**

表格字段:
| 字段 | 说明 |
|---|---|
| 任务内容 | P1 任务描述 |
| 负责人 | 任务 owner |
| 截止时间 | 原始 deadline |
| 当前状态 | ✅ 已完成 / 🟡 进行中 / 🔴 已逾期 / ⏳ 待开始 |
| 逾期天数 | 如逾期，显示 +N 天 |
| 影响 | 逾期影响评估 |

**发送方式**:
- 通过 `feishu_im_user_message` 发送给王爷
- 附带文档链接（已创建的飞书文档）
- 消息模板:
  ```
  📋 会前速查资料（下次会议前 24h）
  
  📄 历史关联与冲突速查：[链接]
  📄 历史待办执行状态速查表：[链接]
  
  重点提醒：
  - 发现 X 个重复议题
  - 发现 X 个潜在矛盾
  - 发现 X 个未跟进待办
  
  请在会议中确认以上事项。
  ```

---

### Step 5: 下次会议跟进

**触发**: 下次同类会议召开

**检查点**:
1. 文档 E 中提到的重复议题是否已解决？
2. 文档 E 中提到的矛盾是否已澄清？
3. 文档 F 中的逾期任务是否已完成？

**闭环验证**:
- 如果上次任务在本次会议上被提及 → 标记为"已跟进"
- 如果上次任务已完成 → 标记为"completed"
- 如果上次任务仍逾期且未提及 → 升级提醒（需王爷授权）

---

## 📝 实现细节

### 1. 人员姓名 → open_id 转换

```javascript
async function resolveOwnerOpenId(ownerName) {
  // 1. 先查缓存（之前转换过的）
  const cached = nameToOpenIdCache[ownerName];
  if (cached) return cached;
  
  // 2. 调用飞书搜索
  const result = await feishu_search_user(ownerName);
  if (result.users?.length > 0) {
    const openId = result.users[0].open_id;
    nameToOpenIdCache[ownerName] = openId;
    return openId;
  }
  
  // 3. 无法识别时返回王爷 open_id（默认）
  return CONFIG.wangyeOpenId;
}
```

---

### 2. 任务状态同步

**飞书任务 API 限制**:
- 飞书任务状态变更需要用户手动操作
- AI 无法自动标记任务为"已完成"

**解决方案**:
1. **被动同步**: 通过 `feishu_task_task list` 定期拉取任务状态
2. **主动询问**: Heartbeat 时询问王爷"张三的系统对接任务完成了吗？"
3. **会议触发**: 下次会议提到该任务时，现场询问状态

**推荐策略**: 被动同步 + 会议触发

---

### 3. 会议类型识别

**问题**: 如何判断两次会议是"同类会议"？

**解决方案**:
1. **标题关键词匹配**: 提取 2 字以上中文词，计算重合度
2. **参会人重合度**: 计算参会人交集比例
3. **LLM 分类**: 调用 LLM 判断会议类型（战略讨论/项目评审/周会等）

**实现**:
```javascript
function isRelatedMeeting(current, historical) {
  // 标题相似度
  const titleSimilarity = calculateTitleSimilarity(current.title, historical.title);
  
  // 参会人重合度
  const participantOverlap = calculateParticipantOverlap(
    current.participants, 
    historical.participants
  );
  
  // 满足任一条件即视为同类会议
  return titleSimilarity >= 0.6 || participantOverlap >= 0.5;
}
```

---

### 4. 缓存清理策略

**问题**: 缓存文件会无限增长

**解决方案**:
```javascript
function cleanupCache() {
  const now = new Date();
  const maxAgeDays = 90; // 保留 90 天
  
  Object.keys(cache).forEach(meetingId => {
    const meetingDate = new Date(cache[meetingId].date);
    const daysDiff = (now - meetingDate) / (24 * 60 * 60 * 1000);
    
    if (daysDiff > maxAgeDays) {
      delete cache[meetingId];
    }
  });
  
  saveCache(cache);
}
```

**触发时机**: 每次 Heartbeat 时检查，每月清理一次

---

## ⚠️ 技术边界与兜底

### 1. 飞书任务 API 权限

**限制**:
- 只能创建自己负责的任务
- 无法强制标记他人为负责人（只能邀请）
- 任务状态变更需要用户主动操作

**兜底**:
- 任务创建失败时，降级到文档 C（个人执行任务单）
- 在文档中标注"建议创建飞书任务追踪"

---

### 2. 人员识别准确率

**问题**:
- 会议转录中可能使用昵称（"小王"）
- 同名人员无法区分

**兜底**:
- 无法识别时标注"待确认"
- 在文档中列出候选人员供王爷选择

---

### 3. 会议类型判断误差

**问题**:
- 标题相似的会议可能内容完全不同
- 标题不同的会议可能是同类会议

**优化方向**:
- 引入 LLM 判断会议类型（调用成本较高）
- 结合多维度（标题 + 参会人 + 议题关键词）

---

## 🧪 测试清单

### 测试场景 1: 完整闭环

1. ✅ 上传会议录音 → LLM 提取 P1 任务
2. ✅ 王爷确认"发" → 创建飞书任务
3. ⏳ Heartbeat 检查 → 逾期任务标记
4. ⏳ 下次会议前 24h → 生成文档 E/F
5. ⏳ 王爷确认 → 发送文档 E/F

### 测试场景 2: 人员识别

- [ ] 测试全名识别（"张三"）
- [ ] 测试昵称识别（"小王"）
- [ ] 测试无法识别（"那个谁"）

### 测试场景 3: 会议关联

- [ ] 测试标题相似会议匹配
- [ ] 测试参会人重合匹配
- [ ] 测试误报（标题相似但内容不同）

---

## 📚 相关文件

- `index.js`: 主执行脚本（包含文档 E/F 生成逻辑）
- `memory/meeting-summary-cache.json`: 结构化缓存
- `memory/pre-meeting-docs/`: 会前文档 E/F 临时目录
- `SKILL.md`: Skill 规范文档
- `README.md`: 使用说明

---

## 🚀 后续优化方向

1. **LLM 增强**: 使用 LLM 判断会议类型和决策矛盾（当前为简化版关键词匹配）
2. **自动提醒**: 逾期任务自动发送提醒消息（需王爷授权）
3. **多维表格集成**: 任务状态同步到多维表格，可视化追踪
4. **语音提醒**: 逾期任务通过语音消息提醒负责人
5. **周报生成**: 每周自动生成任务完成情况周报

---

*版本：v1.0 | 创建时间：2026-05-15 | 关联 Skill: feishu-meeting-summary V3.0*
