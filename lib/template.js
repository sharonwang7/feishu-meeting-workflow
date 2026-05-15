/**
 * 文档模板引擎模块
 * 功能：生成 6 类文档模板（A/B/C/D/E/F）
 */

/**
 * 按负责人分组任务
 */
function groupTasksByOwner(tasks) {
  const groups = {};
  
  tasks.forEach(task => {
    // 尝试从文本中提取负责人（简化版）
    let owner = 'unknown';
    const match = task.content.match(/([A-Z 一二三四五六七八九十]+)\s*(要 | 需要 | 负责 | 完成)/);
    if (match) {
      owner = match[1];
    }
    
    if (!groups[owner]) {
      groups[owner] = [];
    }
    groups[owner].push(task);
  });
  
  return groups;
}

/**
 * 生成文档 A: 《战略决策备忘》（P0）
 */
function generateP0Document(minute, extracted) {
  const date = new Date().toISOString().split('T')[0];
  
  let md = `# 战略决策备忘\n\n`;
  md += `**会议主题**: ${minute.title}\n`;
  md += `**会议日期**: ${date}\n`;
  md += `**参会人**: ${extracted.participants.join('、') || '待确认'}\n\n`;
  md += `---\n\n`;
  
  if (extracted.p0.length === 0) {
    md += `暂无战略决策内容。\n\n`;
  } else {
    extracted.p0.forEach((item, index) => {
      md += `## 决策 ${index + 1}\n\n`;
      md += `### 决策摘要\n`;
      md += `${item.content}\n\n`;
      
      if (item.quote) {
        md += `### 原文引用\n`;
        md += `> "${item.quote}"\n\n`;
      }
      
      md += `### 决策逻辑\n`;
      md += `待补充：问题 → 讨论 → 权衡 → 决策的完整推理链\n\n`;
      
      md += `### 边界条件\n`;
      md += `待补充：在什么情况下此决策应重新审视？\n\n`;
      
      md += `### 执行路线\n`;
      md += `待补充：谁 × 什么时间 × 什么动作\n\n`;
      
      md += `---\n\n`;
    });
  }
  
  md += `\n> 本文档由 AI 自动生成，请王爷确认决策内容准确性\n`;
  
  return md;
}

/**
 * 生成文档 B: 《风险与问题台账》（P0.5）
 */
function generateP05Document(minute, extracted) {
  const date = new Date().toISOString().split('T')[0];
  
  let md = `# 风险与问题台账\n\n`;
  md += `**会议主题**: ${minute.title}\n`;
  md += `**会议日期**: ${date}\n`;
  md += `**参会人**: ${extracted.participants.join('、') || '待确认'}\n\n`;
  md += `---\n\n`;
  
  if (extracted.p0_5.length === 0) {
    md += `暂无风险与问题。\n\n`;
  } else {
    md += `| # | 风险/问题描述 | 当前状态 | 影响范围 | 严重程度 | 责任人 | 首次提出 | 下次复盘 |\n`;
    md += `|---|---|---|---|---|---|---|---|\n`;
    
    extracted.p0_5.forEach((item, index) => {
      const severity = item.severity || '🟠 高';
      const desc = item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content;
      md += `| ${index + 1} | ${desc} | 待确认 | 待评估 | ${severity} | 待确认 | ${date} | 待确认 |\n`;
    });
  }
  
  md += `\n---\n\n`;
  md += `> 本文档由 AI 自动生成，请王爷确认风险内容并指定责任人\n`;
  
  return md;
}

/**
 * 生成文档 C: 《个人执行任务单》（P1）- 每人一份
 */
function generateP1Document(minute, owner, tasks) {
  const date = new Date().toISOString().split('T')[0];
  
  let md = `# 个人执行任务单\n\n`;
  md += `**执行人**: ${owner}\n`;
  md += `**会议主题**: ${minute.title}\n`;
  md += `**会议日期**: ${date}\n`;
  md += `**生成日期**: ${date}\n\n`;
  md += `---\n\n`;
  
  if (tasks.length === 0) {
    md += `暂无执行任务。\n\n`;
  } else {
    tasks.forEach((task, index) => {
      md += `## 任务 ${index + 1}\n\n`;
      md += `**任务**: ${task.content}\n\n`;
      
      if (task.quote) {
        md += `**原文引用**:\n> "${task.quote}"\n\n`;
      }
      
      md += `### 六要素\n\n`;
      md += `▎**任务**: [待补充：具体动作]\n`;
      md += `▎**协同**: [待补充：和谁配合 / 依赖谁]\n`;
      md += `▎**产出**: [待补充：验收标准]\n`;
      md += `▎**截止**: ${task.deadline || '[待补充：精确到日期]'}\n`;
      md += `▎**反馈**: [待补充：向谁汇报 / 汇报形式]\n`;
      md += `▎**为何重要**: [待补充：不做会有什么后果]\n\n`;
      
      md += `---\n\n`;
    });
  }
  
  md += `\n> 本文档由 AI 自动生成，请确认任务内容并补充六要素\n`;
  
  return md;
}

/**
 * 生成文档 D: 《信息分发快报》（P2/P3）
 */
function generateP2Document(minute, extracted) {
  const date = new Date().toISOString().split('T')[0];
  
  let md = `# 信息分发快报\n\n`;
  md += `**会议主题**: ${minute.title}\n`;
  md += `**会议日期**: ${date}\n`;
  md += `**参会人**: ${extracted.participants.join('、') || '待确认'}\n\n`;
  md += `---\n\n`;
  
  if (extracted.p2.length === 0 && extracted.p3.length === 0) {
    md += `暂无知悉信息。\n\n`;
  } else {
    if (extracted.p2.length > 0) {
      md += `## 🟡 知悉信息（P2）\n\n`;
      extracted.p2.forEach((item, index) => {
        md += `${index + 1}. ${item.content}\n\n`;
        if (item.targetAudience) {
          md += `   **建议知悉**: ${item.targetAudience}\n\n`;
        }
      });
    }
    
    if (extracted.p3.length > 0) {
      md += `## 🟢 背景信息（P3）\n\n`;
      extracted.p3.forEach((item, index) => {
        md += `${index + 1}. ${item.content}\n\n`;
      });
    }
  }
  
  md += `\n---\n\n`;
  md += `> **仅知悉，无需回复**\n`;
  md += `> 本文档由 AI 自动生成\n`;
  
  return md;
}

/**
 * 生成文档 E: 《历史关联与冲突速查》
 * 触发时机：下次同类会议前 24 小时
 */
function generateDocumentE(currentMinute, cache) {
  const date = new Date().toISOString().split('T')[0];
  
  // 查找历史会议（按标题关键词匹配）
  const historicalMeetings = findRelatedMeetings(currentMinute, cache);
  
  let md = `# 历史关联与冲突速查\n\n`;
  md += `**当前会议**: ${currentMinute.title}\n`;
  md += `**检查日期**: ${date}\n`;
  md += `**历史会议数量**: ${historicalMeetings.length}\n\n`;
  md += `---\n\n`;
  
  if (historicalMeetings.length === 0) {
    md += `ℹ️ **首次使用**：这是首次检测到此类型会议，跨会议关联将在下次会议后启用。\n\n`;
  } else {
    // 一、重复检测
    md += `## 🔍 一、重复检测\n\n`;
    const duplicates = detectDuplicates(currentMinute, historicalMeetings);
    if (duplicates.length > 0) {
      md += `发现 **${duplicates.length}** 个议题与历史会议重复：\n\n`;
      duplicates.forEach((dup, idx) => {
        md += `${idx + 1}. **${dup.topic}**\n`;
        md += `   - 历史会议：${dup.historicalMeeting.title} (${dup.historicalMeeting.date})\n`;
        md += `   - 历史决策：${dup.historicalDecision}\n`;
        md += `   - ⚠️ **提示**: 本次会议是更新还是推翻历史决策？\n\n`;
      });
    } else {
      md += `✅ 未发现重复议题\n\n`;
    }
    
    // 二、矛盾检测
    md += `## ⚠️ 二、矛盾检测\n\n`;
    const conflicts = detectConflicts(currentMinute, historicalMeetings);
    if (conflicts.length > 0) {
      md += `发现 **${conflicts.length}** 个潜在矛盾：\n\n`;
      conflicts.forEach((conflict, idx) => {
        md += `${idx + 1}. **${conflict.topic}**\n`;
        md += `   - 历史决策 (${conflict.historicalDate}): ${conflict.historicalDecision}\n`;
        md += `   - 本次方向：${conflict.currentDirection}\n`;
        md += `   - ❓ **待确认**: 是新信息改变了判断，还是策略调整？\n\n`;
      });
    } else {
      md += `✅ 未发现矛盾决策\n\n`;
    }
    
    // 三、遗漏检测
    md += `## 📋 三、遗漏检测\n\n`;
    const omissions = detectOmissions(currentMinute, historicalMeetings);
    if (omissions.length > 0) {
      md += `发现 **${omissions.length}** 个上次待办未跟进：\n\n`;
      md += `| # | 任务内容 | 负责人 | 截止时间 | 状态 |\n`;
      md += `|---|---|---|---|---|\n`;
      omissions.forEach((omission, idx) => {
        md += `| ${idx + 1} | ${omission.task} | ${omission.owner} | ${omission.deadline} | ${omission.status} |\n`;
      });
      md += `\n💡 **建议**: 下次会议应确认以上任务执行状态。\n\n`;
    } else {
      md += `✅ 所有上次待办已跟进或已完成\n\n`;
    }
  }
  
  md += `\n---\n\n`;
  md += `> 本文档由 AI 自动生成，供王爷在下次会议前参考\n`;
  md += `> 生成时间：${new Date().toISOString()}\n`;
  
  return md;
}

/**
 * 生成文档 F: 《历史待办执行状态速查表》
 * 触发时机：下次同类会议前 24 小时
 */
function generateDocumentF(currentMinute, cache) {
  const date = new Date().toISOString().split('T')[0];
  
  // 查找历史会议
  const historicalMeetings = findRelatedMeetings(currentMinute, cache);
  const lastMeeting = historicalMeetings[0];
  
  let md = `# 历史待办执行状态速查表\n\n`;
  md += `**当前会议**: ${currentMinute.title}\n`;
  md += `**检查日期**: ${date}\n`;
  md += `**上次会议**: ${lastMeeting ? lastMeeting.title : '无'} (${lastMeeting?.date || '未知'})\n\n`;
  md += `---\n\n`;
  
  if (!lastMeeting || !lastMeeting.p1_tasks || lastMeeting.p1_tasks.length === 0) {
    md += `ℹ️ 上次会议无待办任务。\n\n`;
  } else {
    md += `## 上次会议任务完成情况\n\n`;
    md += `| # | 任务内容 | 负责人 | 截止时间 | 当前状态 | 逾期天数 | 影响 |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    
    const now = new Date();
    
    lastMeeting.p1_tasks.forEach((task, idx) => {
      const deadline = task.deadline !== '待确认' ? new Date(task.deadline) : null;
      const isOverdue = deadline && deadline < now;
      const overdueDays = isOverdue ? Math.floor((now - deadline) / (1000 * 60 * 60 * 24)) : 0;
      
      const statusEmoji = task.status === 'completed' ? '✅' : 
                          task.status === 'in_progress' ? '🟡' : 
                          isOverdue ? '🔴' : '⏳';
      
      const impact = isOverdue ? '可能影响后续进度' : '-';
      
      md += `| ${idx + 1} | ${task.task.length > 30 ? task.task.substring(0, 30) + '...' : task.task} | ${task.owner} | ${task.deadline} | ${statusEmoji} ${task.status} | ${isOverdue ? '+' + overdueDays : '-'} | ${impact} |\n`;
    });
    
    md += `\n---\n\n`;
    md += `> 状态说明：✅ 已完成 | 🟡 进行中 | 🔴 已逾期 | ⏳ 待开始\n`;
    md += `> 本文档由 AI 自动生成，供王爷在下次会议前参考\n`;
  }
  
  return md;
}

/**
 * 查找相关历史会议（按标题关键词/参会人匹配）
 */
function findRelatedMeetings(currentMinute, cache) {
  const currentTitle = (currentMinute.title || '').toLowerCase();
  const related = [];
  
  Object.values(cache).forEach(meeting => {
    if (meeting.meeting_id === currentMinute.token) return; // 跳过自己
    
    // 标题关键词匹配（提取 2 字以上中文词）
    const titleWords = currentTitle.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const historicalTitle = (meeting.title || '').toLowerCase();
    
    const matchCount = titleWords.filter(word => historicalTitle.includes(word)).length;
    
    // 匹配 2 个以上关键词或相同参会人超过 50%
    const participantOverlap = calculateParticipantOverlap(currentMinute.participants, meeting.participants);
    
    if (matchCount >= 2 || participantOverlap >= 0.5) {
      related.push(meeting);
    }
  });
  
  // 按日期排序，最近的在前
  return related.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * 计算参会人重合度
 */
function calculateParticipantOverlap(participants1, participants2) {
  if (!participants1 || !participants2 || participants1.length === 0) return 0;
  
  const set1 = new Set(participants1);
  const set2 = new Set(participants2);
  const intersection = [...set1].filter(p => set2.has(p)).length;
  
  return intersection / Math.max(set1.size, set2.size);
}

/**
 * 重复检测：本次会议议题是否已讨论过？
 */
function detectDuplicates(currentMinute, historicalMeetings) {
  const duplicates = [];
  const currentTitle = (currentMinute.title || '').toLowerCase();
  
  historicalMeetings.forEach(historical => {
    // 简单标题相似度检测
    const historicalTitle = (historical.title || '').toLowerCase();
    const similarity = calculateTitleSimilarity(currentTitle, historicalTitle);
    
    if (similarity >= 0.6) { // 60% 相似度阈值
      const historicalDecision = historical.p0_decisions?.[0]?.decision || '无明确决策';
      
      duplicates.push({
        topic: currentMinute.title,
        historicalMeeting: {
          title: historical.title,
          date: historical.date
        },
        historicalDecision
      });
    }
  });
  
  return duplicates;
}

/**
 * 计算标题相似度（简化版）
 */
function calculateTitleSimilarity(title1, title2) {
  const words1 = title1.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const words2 = title2.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const commonWords = words1.filter(w => words2.includes(w)).length;
  return commonWords / Math.max(words1.length, words2.length);
}

/**
 * 矛盾检测：本次决策是否与历史决策冲突？
 */
function detectConflicts(currentMinute, historicalMeetings) {
  const conflicts = [];
  
  // 这里需要 LLM 判断决策方向是否相反
  // 简化版：检查关键词（如"停止"vs"继续"、"放弃"vs"投入"）
  const conflictKeywords = [
    ['停止', '继续'],
    ['放弃', '投入'],
    ['暂停', '推进'],
    ['取消', '启动'],
    ['收缩', '扩张']
  ];
  
  historicalMeetings.forEach(historical => {
    historical.p0_decisions?.forEach(histDecision => {
      const histText = (histDecision.decision || '').toLowerCase();
      
      conflictKeywords.forEach(pair => {
        if (histText.includes(pair[0])) {
          // 检查当前会议是否有相反方向
          // 简化版：假设当前会议标题包含相反词
          const currentTitle = (currentMinute.title || '').toLowerCase();
          if (currentTitle.includes(pair[1])) {
            conflicts.push({
              topic: histText.substring(0, 50),
              historicalDate: historical.date,
              historicalDecision: histDecision.decision,
              currentDirection: currentMinute.title
            });
          }
        }
      });
    });
  });
  
  return conflicts;
}

/**
 * 遗漏检测：上次待办是否本次未跟进？
 */
function detectOmissions(currentMinute, historicalMeetings) {
  const omissions = [];
  
  // 取最近一次历史会议
  const lastMeeting = historicalMeetings[0];
  if (!lastMeeting) return omissions;
  
  // 检查上次的 P1 任务
  lastMeeting.p1_tasks?.forEach(task => {
    if (task.status === 'pending' || task.status === 'in_progress') {
      // 检查本次会议是否提到该任务（简化版：检查标题是否包含关键词）
      const taskKeywords = task.task.match(/[\u4e00-\u9fa5]{2,}/g) || [];
      const currentTitle = (currentMinute.title || '').toLowerCase();
      
      const mentioned = taskKeywords.some(keyword => currentTitle.includes(keyword));
      
      if (!mentioned) {
        omissions.push({
          task: task.task,
          owner: task.owner,
          deadline: task.deadline,
          status: task.status
        });
      }
    }
  });
  
  return omissions;
}

module.exports = {
  groupTasksByOwner,
  generateP0Document,
  generateP05Document,
  generateP1Document,
  generateP2Document,
  generateDocumentE,
  generateDocumentF,
  findRelatedMeetings
};
