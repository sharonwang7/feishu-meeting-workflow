/**
 * 飞书通用会议总结 Skill - 执行脚本
 * 版本：v3.5（修复截止时间年份校验 bug）
 * 触发方式：Heartbeat（检查新增妙记）
 *
 * 核心功能：
 * 1. 检查新增妙记（过去 1 小时）
 * 2. 读取妙记文字稿（lark-cli vc +notes）
 * 3. 价值提取（P0-P4 分类 + 6 类文档生成）- LLM API
 * 4. 创建飞书文档 + 发送预览给决策者 - Feishu API
 * 5. 保存结构化缓存（供下次跨会议关联）
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// 配置加载
const { loadConfig, getConfig } = require('./lib/config-loader');

// 导入 lib/ 模块
const { extractValue, extractValueSimple } = require('./lib/extract');
const { 
  generateP0Document, 
  generateP05Document, 
  generateP1Document, 
  generateP2Document,
  generateDocumentE,
  generateDocumentF
} = require('./lib/template');
const { matchRecipients, generateFeishuMessage, generatePreview } = require('./lib/distribute');
const { saveMeetingCache, loadMeetingCache } = require('./lib/cache');
const { setTenantReadable, setDocumentsPermission } = require('./lib/permission');

// 加载配置
const config = loadConfig();

// 运行时配置（从 config.json / config.yaml 读取，支持环境变量覆盖）
const CONFIG = {
  // 去重记录文件
  processedFile: path.resolve(__dirname, getConfig(config, 'paths.processed_file', '../../memory/processed-meetings-summary.json')),
  // 结构化缓存文件（供下次跨会议关联）
  cacheFile: path.resolve(__dirname, getConfig(config, 'paths.cache_file', '../../memory/meeting-summary-cache.json')),
  // 检查窗口（分钟）
  checkWindowMinutes: getConfig(config, 'minutes.check_window_minutes', 60),
  // 妙记所有者/日程组织者（用于权限过滤，只处理此人创建的日程/妙记）
  ownerOpenId: getConfig(config, 'roles.organizer_open_id', ''),
  // 决策者 open_id（用于发送预览）
  decisionMakerOpenId: getConfig(config, 'roles.decision_maker_open_id', ''),
  // lark-cli 输出目录（相对路径，相对于执行目录）
  outputDir: getConfig(config, 'paths.output_dir', './minutes'),
  // 多维表格
  baseToken: getConfig(config, 'tables.task_management_base_token', ''),
  taskTableId: getConfig(config, 'tables.task_management_table_id', ''),
  // LLM API 配置（从本地配置文件读取，无默认值）
  llmEndpoint: getConfig(config, 'llm.endpoint', ''),
  llmModel: getConfig(config, 'llm.model', ''),
  llmMaxTokens: getConfig(config, 'llm.max_tokens', 4096),
  llmTemperature: getConfig(config, 'llm.temperature', 0.1),
  // Cron Job ID
  cronJobId: getConfig(config, 'cron.overdue_reminder_job_id', ''),
  // 自动化：到期前多少天提醒
  reminderDaysBefore: getConfig(config, 'automation.reminder_days_before', 3),
};

/**
 * 主函数：Heartbeat 触发
 */
async function main() {
  console.log('🔍 开始检查新增妙记...');
  
  try {
    // Step 0: 检查并生成会前文档 E/F
    await checkAndGeneratePreMeetingDocs();
    
    // Step 1: 读取已处理记录
    const processed = loadProcessedRecords();
    
    // Step 2: 搜索妙记（过去 1 小时）
    const minutes = await searchMinutes();
    
    if (minutes.length === 0) {
      console.log('ℹ️ 无新增妙记');
      return;
    }
    
    console.log(`📋 发现 ${minutes.length} 条妙记`);
    
    // Step 3: 过滤已处理的
    const newMinutes = minutes.filter(m => !processed[m.token]);
    
    if (newMinutes.length === 0) {
      console.log('✅ 所有妙记已处理');
      return;
    }
    
    console.log(`🆕 发现 ${newMinutes.length} 条新增妙记`);
    
    // Step 4: 处理第一条新增妙记（避免一次性处理太多）
    const minute = newMinutes[0];
    await processMinute(minute);
    
    // 记录已处理
    processed[minute.token] = {
      title: minute.title,
      processedAt: new Date().toISOString()
    };
    saveProcessedRecords(processed);
    
    console.log('\n✅ 妙记处理完成');
    console.log(`\n📌 剩余 ${newMinutes.length - 1} 条妙记将在下次 Heartbeat 处理`);
    
    // 输出 Agent 需要执行的步骤
    console.log('\n' + '='.repeat(60));
    console.log('🤖 Agent 操作指南:');
    console.log('='.repeat(60));
    console.log('1. 读取 memory/meeting-preview.txt 获取预览内容');
    console.log('2. 使用 feishu_im_user_message 发送预览给决策者（示例中称为"王爷"）');
    console.log('3. 等待决策者回复"发"确认');
    console.log('4. 读取 memory/meeting-docs.json 获取文档列表');
    console.log('5. 使用 feishu_create_doc 创建所有文档');
    console.log('6. 立即设置权限：lark-cli drive permission.public patch --token [DOC_TOKEN] --type docx --data \'{"link_share_entity":"tenant_readable"}\' --yes');
    console.log('7. 将文档链接通过飞书消息发送给对应人员');
    console.log('8. 读取 memory/pre-meeting-docs/ 获取会前文档 E/F');
    console.log('9. 使用 feishu_task_task 创建 P1 任务（任务闭环）');
    console.log(`10. 录入多维表格：lark-cli base +record-create --base-token ${CONFIG.baseToken} --table "会议任务管理" --fields '{"任务内容":"xxx","负责人":"xxx","截止时间":"2026-xx-xx","当前状态":"进行中","来源会议":"xxx","妙记 token":"xxx"}'`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ 处理失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 读取已处理记录
 */
function loadProcessedRecords() {
  try {
    if (fs.existsSync(CONFIG.processedFile)) {
      const data = fs.readFileSync(CONFIG.processedFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('⚠️ 读取已处理记录失败:', error.message);
  }
  return {};
}

/**
 * 保存已处理记录
 */
function saveProcessedRecords(records) {
  try {
    const dir = path.dirname(CONFIG.processedFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG.processedFile, JSON.stringify(records, null, 2));
    console.log('💾 已保存处理记录');
  } catch (error) {
    console.error('❌ 保存已处理记录失败:', error.message);
  }
}

/**
 * 搜索妙记（使用 lark-cli minutes +search）
 */
async function searchMinutes() {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - CONFIG.checkWindowMinutes * 60 * 1000);
    
    const start = oneHourAgo.toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];
    
    console.log(`📅 搜索范围：${start} 至 ${end}`);
    
    // 使用 minutes +search 命令搜索妙记
    const cmd = `lark-cli minutes +search --owner-ids "${CONFIG.ownerOpenId}" --start "${start}" --end "${end}" --format json --page-size 30`;
    
    exec(cmd, { encoding: 'utf-8', cwd: path.join(__dirname, '../..') }, (error, stdout, stderr) => {
      if (error) {
        if (stderr.includes('No minutes found') || stdout.includes('"items":[]')) {
          console.log('ℹ️ 未找到妙记');
          resolve([]);
        } else {
          reject(new Error(`搜索妙记失败：${stderr || error.message}`));
        }
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        
        // 兼容不同的返回格式
        let items = [];
        if (result.data?.items) {
          items = result.data.items;
        } else if (result.items) {
          items = result.items;
        }
        
        if (items.length === 0) {
          console.log('ℹ️ 未找到妙记');
          resolve([]);
          return;
        }
        
        const minutes = items.map(m => {
          // 解析 display_info 获取标题
          let title = '无标题';
          const titleMatch = m.display_info?.match(/^([^\n]+)/);
          if (titleMatch) {
            title = titleMatch[1].trim();
          }
          
          // 解析 description 获取所有者
          let owner = '未知';
          const ownerMatch = m.meta_data?.description?.match(/所有者：([^\s]+)/);
          if (ownerMatch) {
            owner = ownerMatch[1];
          }
          
          return {
            token: m.token,
            title: title,
            owner: owner,
            startTime: m.meta_data?.description?.match(/开始时间：([^\s]+\s+[^\s]+)/)?.[1] || '',
            duration: m.meta_data?.description?.match(/时长：([^\s]+)/)?.[1] || '',
            link: m.meta_data?.app_link || ''
          };
        });
        
        console.log(`📋 找到 ${minutes.length} 条妙记`);
        minutes.forEach(m => console.log(`   - ${m.title} (${m.token})`));
        
        resolve(minutes);
      } catch (parseError) {
        reject(new Error(`解析搜索结果失败：${parseError.message}\nstdout: ${stdout}`));
      }
    });
  });
}

/**
 * 处理单条妙记
 */
async function processMinute(minute) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 处理妙记：${minute.title}`);
  console.log(`🔗 Token: ${minute.token}`);
  console.log('='.repeat(60));
  
  try {
    // Step 1: 读取文字稿（使用 lark-cli vc +notes）
    console.log('\n📖 Step 1: 读取妙记文字稿...');
    const transcript = await readTranscript(minute.token);
    
    if (!transcript || transcript.length < 100) {
      console.warn('⚠️ 文字稿内容过少，跳过处理');
      return;
    }
    
    console.log(`📊 文字稿长度：${transcript.length} 字符`);
    
    // Step 2: 价值提取（P0-P4 分类 + 6 类文档生成）
    console.log('\n🧠 Step 2: 价值提取...');
    const extracted = await extractValue(transcript, minute, CONFIG);
    
    console.log(`🔴 P0 战略决策：${extracted.p0.length} 条`);
    console.log(`🔶 P0.5 风险信号：${extracted.p0_5.length} 条`);
    console.log(`🟠 P1 执行任务：${extracted.p1.length} 条`);
    console.log(`🟡 P2 知悉信息：${extracted.p2.length} 条`);
    console.log(`🟢 P3 背景信息：${extracted.p3.length} 条`);
    
    // Step 3: 生成并创建 6 类文档（自动调用 feishu_create_doc）
    console.log('\n📄 Step 3: 生成并创建文档...');
    const { docs, docTokens } = await createDocuments(minute, extracted, CONFIG);
    
    console.log(`✅ 创建文档：${Object.keys(docs).length} 份`);
    
    // Step 6.5: 权限自动设置（createDocuments 后立即调用）
    if (docTokens.length > 0) {
      console.log('\n🔐 Step 6.5: 设置文档权限...');
      await setDocumentsPermission(docTokens, 'docx', 100);
    }
    
    // Step 4: 发送飞书消息预览给王爷（包含真实文档链接）
    console.log('\n📤 Step 4: 发送预览给王爷...');
    await sendPreview(minute, extracted, docs);
    
    // Step 5: 保存结构化缓存（供下次跨会议关联）
    console.log('\n💾 Step 5: 保存结构化缓存...');
    saveMeetingCache(minute, extracted, CONFIG.cacheFile);
    
    // Step 6: 录入任务到多维表格（Step 9/9.5 in SKILL.md）
    if (extracted.p1 && extracted.p1.length > 0) {
      console.log('\n📋 Step 6: 录入 P1 任务到多维表格...');
      const meetingDate = new Date().toISOString().split('T')[0];
      await recordTasksToBase(minute.token, minute.title, meetingDate, extracted.p1, CONFIG);
    }
    
    // Step 8: 录入会议记录到归档表（含逐字稿链接和纪要整理链接两个独立字段）
    const meetingDate = new Date().toISOString().split('T')[0];
    await recordMeetingToBase(minute, docs, meetingDate, CONFIG);
    
    console.log(`\n✅ 妙记处理完成：${minute.title}`);
  } catch (error) {
    console.error(`❌ 处理妙记失败：${error.message}`);
    console.error(error.stack);
  }
}

/**
 * 读取文字稿（使用 lark-cli vc +notes）
 */
async function readTranscript(minuteToken) {
  return new Promise((resolve, reject) => {
    const cmd = `lark-cli vc +notes --minute-tokens "${minuteToken}" --format pretty --output-dir "${CONFIG.outputDir}"`;
    
    console.log(`🔧 执行命令：${cmd}`);
    
    exec(cmd, { 
      encoding: 'utf-8', 
      cwd: path.join(__dirname, '../..')
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`lark-cli 执行失败：${stderr || error.message}`));
        return;
      }
      
      // 从输出中提取 transcript 文件路径
      // 格式：minutes\artifact-xxx\transcript.txt
      const pathMatch = stdout.match(/(minutes\\[^\\]+\\transcript\.txt)/);
      if (!pathMatch) {
        reject(new Error(`无法解析 transcript 文件路径，输出：${stdout}`));
        return;
      }
      
      const relativePath = pathMatch[1];
      const transcriptPath = path.join(__dirname, '../..', relativePath);
      
      console.log(`📂 读取文件：${transcriptPath}`);
      
      fs.readFile(transcriptPath, 'utf-8', (err, data) => {
        if (err) {
          reject(new Error(`读取文字稿失败：${err.message}`));
          return;
        }
        
        resolve(data);
      });
    });
  });
}

async function createDocuments(minute, extracted, config) {
  const docs = {};
  const docTokens = [];
  const date = new Date().toISOString().split('T')[0];
  
  console.log('\n📄 生成并创建飞书文档...');
  
  // 文档 A: 《战略决策备忘》（P0）
  if (extracted.p0.length > 0) {
    const title = `战略决策备忘 · ${minute.title} - ${date}`;
    const content = generateP0Document(minute, extracted);
    console.log(`   📝 创建文档 A: ${title}`);
    const docToken = await createFeishuDoc(title, content, config.folderToken);
    if (docToken) {
      docs.p0 = { title, content, type: '战略决策备忘', token: docToken };
      docTokens.push(docToken);
      console.log(`   ✅ 文档 A 创建成功：${docToken}`);
    }
  }
  
  // 文档 B: 《风险与问题台账》（P0.5）
  if (extracted.p0_5.length > 0) {
    const title = `风险与问题台账 · ${minute.title} - ${date}`;
    const content = generateP05Document(minute, extracted);
    console.log(`   📝 创建文档 B: ${title}`);
    const docToken = await createFeishuDoc(title, content, config.folderToken);
    if (docToken) {
      docs.p0_5 = { title, content, type: '风险与问题台账', token: docToken };
      docTokens.push(docToken);
      console.log(`   ✅ 文档 B 创建成功：${docToken}`);
    }
  }
  
  // 文档 C: 《个人执行任务单》（P1）按人聚合
  if (extracted.p1.length > 0) {
    const tasksByOwner = groupTasksByOwner(extracted.p1);
    const ownerEntries = Object.entries(tasksByOwner);
    for (let index = 0; index < ownerEntries.length; index++) {
      const [owner, tasks] = ownerEntries[index];
      const ownerName = owner === 'unknown' ? '待确认' : owner;
      const title = `个人执行任务单 · ${ownerName} · ${minute.title} - ${date}`;
      const content = generateP1Document(minute, ownerName, tasks);
      console.log(`   📝 创建文档 C-${ownerName}: ${title}`);
      const docToken = await createFeishuDoc(title, content, config.folderToken);
      if (docToken) {
        docs[`p1_${index}`] = { title, content, type: '个人执行任务单', owner: ownerName, token: docToken };
        docTokens.push(docToken);
        console.log(`   ✅ 文档 C-${ownerName} 创建成功：${docToken}`);
      }
    }
  }
  
  // 文档 D: 《信息分发快报》（P2/P3）
  if (extracted.p2.length > 0 || extracted.p3.length > 0) {
    const title = `信息分发快报 · ${minute.title} - ${date}`;
    const content = generateP2Document(minute, extracted);
    console.log(`   📝 创建文档 D: ${title}`);
    const docToken = await createFeishuDoc(title, content, config.folderToken);
    if (docToken) {
      docs.p2 = { title, content, type: '信息分发快报', token: docToken };
      docTokens.push(docToken);
      console.log(`   ✅ 文档 D 创建成功：${docToken}`);
    }
  }
  
  // 综合纪要（合并文档）：包含 4 份文档的完整 Markdown 内容
  const mergedContent = generateMergedDocument(minute, extracted, docs, date);
  if (mergedContent) {
    const title = `综合会议纪要 · ${minute.title} - ${date}`;
    console.log(`   📝 创建综合纪要（合并文档）: ${title}`);
    const docToken = await createFeishuDoc(title, mergedContent, config.folderToken);
    if (docToken) {
      docs.merged = { title, content: mergedContent, type: '综合会议纪要', token: docToken };
      docTokens.push(docToken);
      console.log(`   ✅ 综合纪要创建成功：${docToken}`);
    }
  }
  
  // 文档 E & F: 历史关联与待办速查（下次会前 24h 发送，本次不创建）
  // 这里只保存缓存，下次会议前由 Heartbeat 检查并发送
  
  console.log(`\n✅ 共创建 ${docTokens.length} 份飞书文档`);
  
  return { docs, docTokens };
}

/**
 * 生成综合会议纪要（合并文档）：包含 4 份文档的完整内容
 */
function generateMergedDocument(minute, extracted, docs, date) {
  const title = minute.title || '无标题';
  
  let merged = `# 综合会议纪要 · ${title} - ${date}\n\n`;
  
  // 添加 P0 战略决策备忘完整内容
  if (docs.p0 && docs.p0.content) {
    merged += `## 📄 战略决策备忘\n\n${docs.p0.content}\n\n`;
  }
  
  // 添加 P0.5 风险与问题台账完整内容
  if (docs.p0_5 && docs.p0_5.content) {
    merged += `## 📄 风险与问题台账\n\n${docs.p0_5.content}\n\n`;
  }
  
  // 添加 P1 个人执行任务单完整内容（所有负责人版本）
  const p1Keys = Object.keys(docs).filter(k => k.startsWith('p1_'));
  if (p1Keys.length > 0) {
    // 如果有多份 P1 文档，逐一拼入
    for (const key of p1Keys) {
      if (docs[key] && docs[key].content) {
        const ownerLabel = docs[key].owner ? `（${docs[key].owner}）` : '';
        merged += `## 📄 个人执行任务单${ownerLabel}\n\n${docs[key].content}\n\n`;
      }
    }
  } else if (extracted.p1 && extracted.p1.length > 0) {
    // 退一步：直接从 extracted 拼接
    merged += `## 📄 个人执行任务单\n\n`;
    for (const task of extracted.p1) {
      merged += `### 任务：${task.content || '未命名任务'}\n\n`;
      merged += `- **负责人**：${task.owner || '待确认'}\n`;
      merged += `- **截止时间**：${task.deadline || '待确认'}\n`;
      if (task.details) merged += `- **详情**：${task.details}\n`;
      merged += `\n`;
    }
  }
  
  // 添加 P2/P3 信息分发快报完整内容
  if (docs.p2 && docs.p2.content) {
    merged += `## 📄 信息分发快报\n\n${docs.p2.content}\n\n`;
  }
  
  return merged;
}

/**
 * 调用 lark-cli 创建飞书云文档
 * @param {string} title - 文档标题
 * @param {string} markdown - Markdown 内容
 * @param {string} folderToken - 文件夹 token（可选）
 * @returns {Promise<string|null>} 文档 token，失败返回 null
 */
async function createFeishuDoc(title, markdown, folderToken = '') {
  const { exec } = require('child_process');
  return new Promise((resolve) => {
    const cmd = `lark-cli docs +create --title "${title.replace(/"/g, '\\"')}" --markdown "${markdown.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"${folderToken ? ` --folder "${folderToken}"` : ''}`;
    
    exec(cmd, { encoding: 'utf-8', cwd: path.join(__dirname, '../..'), timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.warn(`⚠️ 创建文档失败：${stderr || error.message}`);
        resolve(null);
        return;
      }
      const tokenMatch = stdout.match(/docx\/([a-zA-Z0-9]+)/);
      if (!tokenMatch) {
        console.warn(`⚠️ 无法解析文档 token，输出：${stdout}`);
        resolve(null);
        return;
      }
      resolve(tokenMatch[1]);
    });
  });
}

/**
 * 录入任务到多维表格
 * @param {string} minuteToken - 妙记 token
 * @param {string} meetingTitle - 会议主题
 * @param {string} meetingDate - 会议日期
 * @param {Array} p1Tasks - P1 任务列表
 * @param {object} config - 配置对象
 */
async function recordTasksToBase(minuteToken, meetingTitle, meetingDate, p1Tasks, config) {
  // 配置优先级：config.json > 环境变量 > 报错
  const baseToken = config.tables?.task_management_base_token || config.baseToken || process.env.MEETING_TASK_BASE_TOKEN;
  const tableId = config.tables?.task_management_table_id || config.taskTableId;
  
  if (!baseToken) {
    console.warn('⚠️ 未配置任务管理表 baseToken，请在 config.json 中设置 tables.task_management_base_token');
    return;
  }
  
  if (!tableId) {
    console.warn('⚠️ 未配置任务管理表 tableId，请在 config.json 中设置 tables.task_management_table_id');
    return;
  }
  
  console.log(`📊 录入 ${p1Tasks.length} 条任务到多维表格...`);
  
  // 遍历 P1 任务，创建记录
  for (const task of p1Tasks) {
    // 【修复】校验并修正截止时间年份
    let deadlineValue = task.deadline || '待确认';
    if (deadlineValue !== '待确认' && deadlineValue.trim()) {
      deadlineValue = validateAndFixDeadlineYear(task.deadline);
    }
    
    const fields = {
      '任务内容': task.content,
      '负责人': task.owner || '待确认',
      '截止时间': deadlineValue,
      '来源会议': meetingTitle,
      '妙记 token': minuteToken,
      '创建日期': meetingDate,
      '当前状态': '待开始'
    };
    
    // 使用 lark-cli 创建记录
    const command = `lark-cli base record.create --base-token ${baseToken} --table-id ${tableId} --fields '${JSON.stringify(fields)}'`;
    
    try {
      await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.warn(`⚠️ 创建任务记录失败：${stderr || error.message}`);
            resolve(false);
            return;
          }
          console.log(`✅ 任务记录创建成功：${task.content.substring(0, 30)}...`);
          resolve(true);
        });
      });
    } catch (err) {
      console.error(`❌ 创建任务记录异常：${err.message}`);
    }
  }
}

/**
 * 录入会议记录到归档表（含逐字稿链接和纪要整理链接两个独立字段）
 * @param {object} minute - 妙记信息
 * @param {object} docs - 创建的文档对象
 * @param {string} meetingDate - 会议日期
 * @param {object} config - 配置对象
 */
async function recordMeetingToBase(minute, docs, meetingDate, config) {
  const baseToken = config.tables?.meeting_records_base_token || '';
  const tableId = config.tables?.meeting_records_table_id || '';
  
  if (!baseToken || !tableId) {
    console.warn('⚠️ 未配置会议记录归档表（meeting_records_base_token / meeting_records_table_id），请在 config.json 中设置');
    return;
  }
  
  // 构建逐字稿链接和纪要整理链接
  // 从 docs 中找逐字稿文档和综合纪要文档的链接
  const transcriptDoc = Object.values(docs).find(d => d.type === '逐字稿');
  const summaryDoc = docs.merged || Object.values(docs).find(d => d.type === '综合会议纪要');
  
  const transcriptDocLink = transcriptDoc?.token ? `https://${process.env.FEISHU_HOST || 'jqx28l0j4lx'}.feishu.cn/docx/${transcriptDoc.token}` : '';
  const summaryDocLink = summaryDoc?.token ? `https://${process.env.FEISHU_HOST || 'jqx28l0j4lx'}.feishu.cn/docx/${summaryDoc.token}` : '';
  
  const fields = {
    '会议主题': minute.title || '无标题',
    '会议日期': meetingDate,
    '参会人': '', // 暂缺参会人信息
    '逐字稿链接': transcriptDocLink,
    '纪要整理链接': summaryDocLink
  };
  
  console.log(`📊 录入会议记录到归档表...`);
  console.log(`   逐字稿链接: ${transcriptDocLink || '无'}`);
  console.log(`   纪要整理链接: ${summaryDocLink || '无'}`);
  
  const command = `lark-cli base record.create --base-token ${baseToken} --table-id ${tableId} --fields '${JSON.stringify(fields)}'`;
  
  try {
    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.warn(`⚠️ 创建会议记录失败：${stderr || error.message}`);
          resolve(false);
          return;
        }
        console.log('✅ 会议记录创建成功');
        resolve(true);
      });
    });
  } catch (err) {
    console.error(`❌ 创建会议记录异常：${err.message}`);
  }
}

/**
 * 【修复】校验并修正截止时间的年份
 * 问题：LLM 可能提取到过去年份（如 2024），需要自动修正为当前年份或未来年份
 * 
 * @param {string} deadlineStr - LLM 提取的截止时间字符串（如"2024-05-22"或"5 月 22 日"）
 * @returns {string} 修正后的日期字符串（YYYY-MM-DD 格式）
 */
function validateAndFixDeadlineYear(deadlineStr) {
  if (!deadlineStr || deadlineStr === '待确认') {
    return '待确认';
  }
  
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // 尝试解析日期字符串
    let parsedDate = null;
    
    // 格式 1: "2024-05-22" 或 "2024/05/22"
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(deadlineStr)) {
      parsedDate = new Date(deadlineStr.replace(/\//g, '-'));
    }
    // 格式 2: "5 月 22 日" 或 "05 月 22 日"
    else if (/(\d{1,2}) 月 (\d{1,2}) 日/.test(deadlineStr)) {
      const match = deadlineStr.match(/(\d{1,2}) 月 (\d{1,2}) 日/);
      if (match) {
        const month = parseInt(match[1], 10) - 1; // JS 月份从 0 开始
        const day = parseInt(match[2], 10);
        parsedDate = new Date(currentYear, month, day);
      }
    }
    // 格式 3: "2024 年 5 月 22 日"
    else if (/(\d{4}) 年 (\d{1,2}) 月 (\d{1,2}) 日/.test(deadlineStr)) {
      const match = deadlineStr.match(/(\d{4}) 年 (\d{1,2}) 月 (\d{1,2}) 日/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        parsedDate = new Date(year, month, day);
      }
    }
    
    // 如果解析失败，返回原值
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      console.warn(`⚠️ 日期解析失败，保留原值：${deadlineStr}`);
      return deadlineStr;
    }
    
    // 检查年份是否为过去年份
    const parsedYear = parsedDate.getFullYear();
    if (parsedYear < currentYear) {
      console.warn(`⚠️ 检测到过去年份 ${parsedYear}，修正为 ${currentYear}`);
      // 修正为当前年份
      parsedDate.setFullYear(currentYear);
    }
    
    // 检查是否已经过去（同一年但日期已过）
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deadline = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    
    if (deadline < today) {
      console.warn(`⚠️ 检测到日期已过 (${deadlineStr})，顺延 7 天`);
      deadline.setDate(deadline.getDate() + 7);
    }
    
    // 返回 YYYY-MM-DD 格式
    const year = deadline.getFullYear();
    const month = String(deadline.getMonth() + 1).padStart(2, '0');
    const day = String(deadline.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
    
  } catch (error) {
    console.error(`❌ 日期校验失败：${error.message}，保留原值：${deadlineStr}`);
    return deadlineStr;
  }
}

/**
 * 按负责人聚合任务
 */
function groupTasksByOwner(tasks) {
  return tasks.reduce((acc, task) => {
    const owner = task.owner || 'unknown';
    if (!acc[owner]) {
      acc[owner] = [];
    }
    acc[owner].push(task);
    return acc;
  }, {});
}

/**
 * 发送飞书消息预览给决策者（示例中称为"王爷"）
 * 使用 feishu_im_user_message 工具发送
 */
async function sendPreview(minute, extracted, docs) {
  const preview = generatePreview(minute, extracted, docs);
  
  // 使用 matchRecipients 确定文档接收人（按文档类型分发）
  const allRecipients = new Set();
  Object.entries(docs).forEach(([key, doc]) => {
    const docType = key.replace(/_\d+$/, ''); // p0, p0_5, p1, p2
    const recipients = matchRecipients(docType, extracted, CONFIG);
    recipients.forEach(r => allRecipients.add(r));
  });
  console.log(`📬 文档接收人：${[...allRecipients].join(', ') || '仅王爷'}`);
  
  console.log('\n📋 预览消息:');
  console.log('-'.repeat(60));
  console.log(preview);
  console.log('-'.repeat(60));
  
  // 生成飞书消息指令
  const messageCommand = generateFeishuMessage(preview, CONFIG.decisionMakerOpenId);
  
  console.log('\n📤 发送预览消息给决策者（示例中称为"王爷"）...');
  console.log(messageCommand);
  
  // 输出指令给 Agent 执行
  // 实际发送由 Agent 通过 feishu_im_user_message 工具完成
  console.log('\n⚠️ 请 Agent 执行以下飞书消息发送：');
  console.log(`   工具：feishu_im_user_message`);
  console.log(`   动作：send`);
  console.log(`   接收人：决策者（示例中称为"王爷"，open_id: ${CONFIG.decisionMakerOpenId}）`);
  console.log(`   消息类型：text`);
  console.log(`   内容：${JSON.stringify({ text: preview })}`);
  
  // 保存预览到文件供 Agent 读取
  const previewFile = path.join(__dirname, '../../memory/meeting-preview.txt');
  const dir = path.dirname(previewFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(previewFile, JSON.stringify({
    minute,
    extracted,
    docs,
    preview,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log(`\n💾 预览已保存到：${previewFile}`);
  console.log('📝 Agent 请读取该文件并使用 feishu_im_user_message 发送');
}

/**
 * 检查并生成会前文档 E/F（Heartbeat 触发）
 */
async function checkAndGeneratePreMeetingDocs() {
  console.log('\n🔍 检查是否需要生成会前文档 E/F...');
  
  try {
    if (!fs.existsSync(CONFIG.cacheFile)) {
      console.log('ℹ️ 无会议缓存，跳过');
      return;
    }
    
    const cache = loadMeetingCache(CONFIG.cacheFile);
    const now = new Date();
    
    // 遍历所有会议，检查是否有即将召开的同类会议
    // 简化版：检查最近 7 天的会议，生成对应的 E/F 文档
    
    const meetings = Object.values(cache);
    const recentMeetings = meetings.filter(m => {
      const meetingDate = new Date(m.date);
      const daysDiff = (now - meetingDate) / (1000 * 60 * 60 * 24);
      return daysDiff >= 1 && daysDiff <= 7; // 1-7 天前的会议
    });
    
    if (recentMeetings.length === 0) {
      console.log('ℹ️ 无符合条件的历史会议');
      return;
    }
    
    console.log(`📊 发现 ${recentMeetings.length} 个历史会议需要生成会前文档`);
    
    // 为每个历史会议生成 E/F 文档
    for (const meeting of recentMeetings) {
      console.log(`\n📄 为会议"${meeting.title}" 生成文档 E/F...`);
      
      // 文档 E
      const docE = generateDocumentE(meeting, cache);
      const docETitle = `历史关联与冲突速查 · ${meeting.title}`;
      
      // 文档 F
      const docF = generateDocumentF(meeting, cache);
      const docFTitle = `历史待办执行状态速查表 · ${meeting.title}`;
      
      // 保存文档到本地
      const docsDir = path.join(__dirname, '../../memory/pre-meeting-docs');
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }
      
      const docEPath = path.join(docsDir, `${meeting.meeting_id}-docE.md`);
      const docFPath = path.join(docsDir, `${meeting.meeting_id}-docF.md`);
      
      fs.writeFileSync(docEPath, docE);
      fs.writeFileSync(docFPath, docF);
      
      console.log(`   ✅ 文档 E: ${docETitle}`);
      console.log(`   ✅ 文档 F: ${docFTitle}`);
      console.log(`   📂 保存路径：${docsDir}`);
    }
    
    console.log('\n✅ 会前文档生成完成');
    console.log('\n⚠️ 请 Agent 使用 feishu_create_doc 创建文档并通过 feishu_im_user_message 发送给决策者');
    
  } catch (error) {
    console.error('❌ 生成会前文档失败:', error.message);
  }
}

// 执行
main();
