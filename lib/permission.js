/**
 * 权限设置模块
 * 功能：使用 lark-cli 设置飞书文档权限
 * 
 * 权限级别：
 * - 仅创建者可编辑（预览阶段）
 * - 组织内获得链接的人可阅读（分发阶段）
 */

const { exec } = require('child_process');

/**
 * 设置文档权限为"组织内获得链接的人可阅读"
 * 
 * @param {string} docToken - 文档 token
 * @param {string} docType - 文档类型（docx/sheet/bitable）
 * @returns {Promise<boolean>} 是否成功
 */
async function setTenantReadable(docToken, docType = 'docx') {
  return new Promise((resolve, reject) => {
    const cmd = `lark-cli drive permission.public patch --token ${docToken} --type ${docType} --data '{"link_share_entity":"tenant_readable"}' --yes`;
    
    console.log(`🔐 设置文档权限：${docToken}`);
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(`⚠️ 设置权限失败：${stderr || error.message}`);
        resolve(false);
        return;
      }
      
      console.log(`✅ 权限设置成功：${docToken}`);
      resolve(true);
    });
  });
}

/**
 * 批量设置文档权限
 * 
 * @param {Array} docTokens - 文档 token 列表
 * @param {string} docType - 文档类型
 * @param {number} delayMs - 每个文档之间的延迟（毫秒）
 */
async function setDocumentsPermission(docTokens, docType = 'docx', delayMs = 100) {
  const results = [];
  
  for (const token of docTokens) {
    const success = await setTenantReadable(token, docType);
    results.push({ token, success });
    
    // API 频率限制：每 10 个文档暂停 1 秒
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

/**
 * 设置文档权限为"仅创建者可编辑"（预览阶段）
 * 
 * @param {string} docToken - 文档 token
 * @param {string} docType - 文档类型
 * @returns {Promise<boolean>} 是否成功
 */
async function setPrivate(docToken, docType = 'docx') {
  return new Promise((resolve, reject) => {
    const cmd = `lark-cli drive permission.public patch --token ${docToken} --type ${docType} --data '{"link_share_entity":"none"}' --yes`;
    
    console.log(`🔒 设置私有权限：${docToken}`);
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(`⚠️ 设置私有权限失败：${stderr || error.message}`);
        resolve(false);
        return;
      }
      
      console.log(`✅ 私有权限设置成功：${docToken}`);
      resolve(true);
    });
  });
}

module.exports = {
  setTenantReadable,
  setDocumentsPermission,
  setPrivate
};
