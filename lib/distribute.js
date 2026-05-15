/**
 * 分发引擎模块
 * 功能：智能匹配文档接收人
 * 
 * 分发规则：
 * 1. 所有信息抄送上级
 * 2. 外部人员不发送
 * 3. 按角色分发（决策给高管、任务给执行人、知悉给相关人）
 */

/**
 * 匹配文档接收人
 * 
 * @param {string} docType - 文档类型（p0/p0_5/p1/p2）
 * @param {object} extracted - 提取的结构化数据
 * @param {object} config - 配置对象
 * @returns {Array} 接收人列表
 */
function matchRecipients(docType, extracted, config) {
  const recipients = [];
  // 支持多种配置方式：config.roles.decision_maker_open_id 或 config.decision_maker_open_id
  const decisionMaker = config.roles?.decision_maker_open_id || config.decision_maker_open_id;
  
  // ⚠️ 警告：如果决策者 open_id 未配置，会静默失败
  if (!decisionMaker) {
    console.warn('⚠️ 未配置决策者 open_id，请在 config.json 中设置 roles.decision_maker_open_id');
    return [];
  }
  
  switch (docType) {
    case 'p0':
      // P0 战略决策 → 决策者 + 高管层
      recipients.push(decisionMaker);
      // TODO: 根据 extracted.p0 自动匹配相关高管
      break;
      
    case 'p0_5':
      // P0.5 风险台账 → 决策者 + 责任人
      recipients.push(decisionMaker);
      // TODO: 根据 extracted.p0_5 自动匹配责任人
      break;
      
    case 'p1':
      // P1 执行任务 → 执行人 + 决策者（抄送）
      recipients.push(decisionMaker);
      // TODO: 根据 extracted.p1 自动匹配执行人
      break;
      
    case 'p2':
      // P2 知悉信息 → 相关部门 + 决策者（抄送）
      recipients.push(decisionMaker);
      // TODO: 根据 extracted.p2 自动匹配相关部门
      break;
  }
  
  // 去重
  return [...new Set(recipients)];
}

/**
 * 生成飞书消息指令
 * @param {string} preview - 预览内容
 * @param {string} decisionMakerOpenId - 决策者 open_id
 */
function generateFeishuMessage(preview, decisionMakerOpenId) {
  return `
// 飞书消息发送指令
feishu_im_user_message send \\
  --receive_id_type "open_id" \\
  --receive_id "${decisionMakerOpenId}" \\
  --msg_type "text" \\
  --content '${JSON.stringify({ text: preview }).replace(/'/g, "'\\''")}'
`;
}

/**
 * 生成预览消息
 */
function generatePreview(minute, extracted, docs) {
  let msg = `📋 本次会议产出预览：\n\n`;
  
  if (extracted.p0.length > 0) {
    msg += `🔴 P0 战略决策（${extracted.p0.length}条）→ 决策备忘\n`;
  }
  if (extracted.p0_5.length > 0) {
    msg += `🔶 P0.5 风险信号（${extracted.p0_5.length}条）→ 风险台账\n`;
  }
  if (extracted.p1.length > 0) {
    const owners = [...new Set(Object.keys(groupTasksByOwner(extracted.p1)))];
    msg += `🟠 P1 执行任务（${extracted.p1.length}条）→ ${owners.join('执行单、')}执行单\n`;
  }
  if (extracted.p2.length > 0 || extracted.p3.length > 0) {
    msg += `🟡 P2 知悉信息（${extracted.p2.length + extracted.p3.length}条）→ 信息快报\n`;
  }
  
  msg += `\n📄 生成文档：${Object.keys(docs).length} 份\n`;
  msg += `\n回复"发"确认发送 | 回复具体调整\n`;
  
  return msg;
}

/**
 * 按负责人分组任务（辅助函数）
 */
function groupTasksByOwner(tasks) {
  const groups = {};
  
  tasks.forEach(task => {
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

module.exports = {
  matchRecipients,
  generateFeishuMessage,
  generatePreview,
  groupTasksByOwner
};
