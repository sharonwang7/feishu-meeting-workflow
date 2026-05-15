/**
 * 测试脚本：验证完整流程
 * 使用测试妙记：obcnlleinigd2n98p742j2lm
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_MINUTE_TOKEN = 'obcnlleinigd2n98p742j2lm';

async function main() {
  console.log('🧪 开始测试 feishu-meeting-summary 完整流程...\n');
  console.log(`📋 测试妙记：${TEST_MINUTE_TOKEN}\n`);
  
  try {
    // Step 1: 读取文字稿
    console.log('📖 Step 1: 读取妙记文字稿...');
    const transcript = await readTranscript(TEST_MINUTE_TOKEN);
    
    if (!transcript || transcript.length < 100) {
      console.error('❌ 文字稿内容过少，测试失败');
      return;
    }
    
    console.log(`✅ 文字稿长度：${transcript.length} 字符\n`);
    
    // Step 2: LLM 价值提取
    console.log('🧠 Step 2: LLM 价值提取...');
    const minute = {
      token: TEST_MINUTE_TOKEN,
      title: '测试会议',
      startTime: new Date().toISOString(),
      duration: '60 分钟'
    };
    
    // 导入 extractValue 函数
    const { extractValue } = require('./index.js');
    
    // 注意：由于 index.js 是脚本形式，我们需要重新实现提取逻辑
    const extracted = await testExtractValue(transcript, minute);
    
    console.log(`🔴 P0 战略决策：${extracted.p0.length} 条`);
    console.log(`🔶 P0.5 风险信号：${extracted.p0_5.length} 条`);
    console.log(`🟠 P1 执行任务：${extracted.p1.length} 条`);
    console.log(`🟡 P2 知悉信息：${extracted.p2.length} 条`);
    console.log(`🟢 P3 背景信息：${extracted.p3.length} 条`);
    console.log(`👥 参会人：${extracted.participants.join('、') || '待确认'}\n`);
    
    // Step 3: 生成文档
    console.log('📄 Step 3: 生成文档...');
    const docs = await testCreateDocuments(minute, extracted);
    console.log(`✅ 生成文档：${Object.keys(docs).length} 份\n`);
    
    // Step 4: 生成预览
    console.log('📤 Step 4: 生成预览消息...');
    const preview = generatePreview(minute, extracted, docs);
    console.log(preview);
    console.log('');
    
    // Step 5: 保存缓存
    console.log('💾 Step 5: 保存结构化缓存...');
    saveTestCache(minute, extracted);
    
    console.log('\n✅ 测试完成！\n');
    console.log('📌 下一步操作:');
    console.log('   1. 检查 memory/meeting-preview.txt 是否生成');
    console.log('   2. 使用 feishu_im_user_message 发送预览给王爷');
    console.log('   3. 等待王爷回复"发"确认');
    console.log('   4. 使用 feishu_create_doc 创建文档');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 读取文字稿
 */
async function readTranscript(minuteToken) {
  return new Promise((resolve, reject) => {
    const outputDir = './minutes';
    const cmd = `lark-cli vc +notes --minute-tokens "${minuteToken}" --format pretty --output-dir "${outputDir}"`;
    
    exec(cmd, { 
      encoding: 'utf-8', 
      cwd: path.join(__dirname, '../..')
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`lark-cli 执行失败：${stderr || error.message}`));
        return;
      }
      
      const pathMatch = stdout.match(/(minutes\\[^\\]+\\transcript\.txt)/);
      if (!pathMatch) {
        reject(new Error(`无法解析 transcript 文件路径，输出：${stdout}`));
        return;
      }
      
      const relativePath = pathMatch[1];
      const transcriptPath = path.join(__dirname, '../..', relativePath);
      
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

/**
 * 测试用价值提取（简化版，不依赖 LLM）
 */
async function testExtractValue(transcript, minute) {
  // 这里调用实际的 LLM API
  const http = require('http');
  
  const prompt = buildTestPrompt(transcript, minute);
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'qwen3.5-397b',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的会议纪要分析专家。请严格按要求输出 JSON 格式。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4096,
      temperature: 0.1,
      stream: false
    });
    
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log('📡 发送 LLM 请求...');
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const content = response.choices?.[0]?.message?.content;
          
          if (!content) {
            console.warn('⚠️ LLM 返回内容为空，使用简化版提取');
            resolve(extractValueSimple(transcript, minute));
            return;
          }
          
          // 解析 JSON
          let jsonStr = content.trim();
          jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```$/, '');
          jsonStr = jsonStr.replace(/^```\s*/, '').replace(/```$/, '');
          
          const result = JSON.parse(jsonStr);
          
          // 补充参会人
          result.participants = extractParticipants(transcript);
          
          resolve({
            p0: Array.isArray(result.p0) ? result.p0 : [],
            p0_5: Array.isArray(result.p0_5) ? result.p0_5 : [],
            p1: Array.isArray(result.p1) ? result.p1 : [],
            p2: Array.isArray(result.p2) ? result.p2 : [],
            p3: Array.isArray(result.p3) ? result.p3 : [],
            participants: result.participants,
            meetingType: result.meetingType || '未知',
            quotes: []
          });
          
        } catch (error) {
          console.warn('⚠️ 解析 LLM 响应失败，使用简化版提取:', error.message);
          resolve(extractValueSimple(transcript, minute));
        }
      });
    });
    
    req.on('error', (error) => {
      console.warn('⚠️ LLM API 调用失败，使用简化版提取:', error.message);
      resolve(extractValueSimple(transcript, minute));
    });
    
    req.write(postData);
    req.end();
  });
}

function buildTestPrompt(transcript, minute) {
  const truncatedTranscript = transcript.length > 15000 
    ? transcript.substring(0, 15000) + '...[内容过长已截断]' 
    : transcript;
  
  return `你是一位专业的会议纪要分析专家。请根据以下会议转录文字稿，提取关键信息并分类。

## 会议信息
- 会议主题：${minute.title}
- 开始时间：${minute.startTime}

## 转录文字稿
${truncatedTranscript}

## 任务要求
请从转录中提取以下六类信息，并以 JSON 格式返回：

### 1. P0 战略决策（最高优先级）
- 涉及公司方向、重大决策、CEO 拍板的事项
- 判断标准：不做公司会出大事

### 2. P0.5 风险信号（高优先级）
- 会上提了但没解决的风险/分歧/担忧
- 信号包括："这个问题很大，但我们还没想好"、"先放一放"、"这个要关注"

### 3. P1 执行任务（行动级）
- 需要具体某人限时完成的明确任务
- 必须包含：谁 + 做什么 + 何时（如果文中提到）

### 4. P2 知悉信息（知悉级）
- 不需要行动，但与某些人相关的信息

### 5. P3 背景信息（背景级）
- 背景信息、行业趋势、参考观点

### 6. 会议类型
- 从以下选择：战略讨论、项目评审、周会/例会、培训分享、客户沟通、其他

## 输出格式
请严格返回以下 JSON 格式（不要包含 Markdown 代码块标记）：
{
  "p0": [{"content": "决策内容摘要", "quote": "原文引用", "confidence": "high|medium|low"}],
  "p0_5": [{"content": "风险描述", "quote": "原文引用", "severity": "🔴阻塞|🟠高|🟡中|🟢低"}],
  "p1": [{"content": "任务描述", "owner": "负责人", "deadline": "截止时间", "quote": "原文引用"}],
  "p2": [{"content": "信息摘要", "targetAudience": "建议知悉的对象"}],
  "p3": [{"content": "背景信息摘要"}],
  "meetingType": "会议类型"
}

## 注意事项
1. 如果某类没有内容，返回空数组 []
2. 不要编造信息，文中未提及的字段留空
3. 严格返回 JSON，不要包含任何解释性文字`;
}

function extractParticipants(transcript) {
  const participants = new Set();
  const speakerMatches = transcript.match(/([A-Z 一二三四五六七八九十黎赵曾侯何唐秦吴张陈赵曾赖黄]{2,8}|\b 说话人 \d+)\s+\d{2}:\d{2}:\d{2}/g);
  
  if (speakerMatches) {
    speakerMatches.forEach(s => {
      const match = s.match(/([A-Z 一二三四五六七八九十黎赵曾侯何唐秦吴张陈赵曾赖黄]{2,8}|\b 说话人 \d+)/);
      if (match) {
        const name = match[1].trim();
        if (name.length >= 2 && name !== '说话人') {
          participants.add(name);
        }
      }
    });
  }
  
  if (participants.size === 0) {
    const genericSpeakers = transcript.match(/说话人 \d+/g);
    if (genericSpeakers) {
      genericSpeakers.forEach(s => participants.add(s));
    }
  }
  
  return Array.from(participants);
}

function extractValueSimple(transcript, minute) {
  const result = {
    p0: [],
    p0_5: [],
    p1: [],
    p2: [],
    p3: [],
    participants: extractParticipants(transcript),
    meetingType: '未知',
    quotes: []
  };
  
  const paragraphs = transcript.split(/\n(?=[A-Z 一二三四五六七八九十黎赵曾说话人]+\s+\d{2}:\d{2}:\d{2})/);
  
  paragraphs.forEach(para => {
    const trimmed = para.trim();
    if (trimmed.length < 20) return;
    
    if (/我们决定 | 确定了 | 拍板 | 就这么办 | 必须/i.test(trimmed)) {
      result.p0.push({ content: trimmed.substring(0, 200), confidence: 'medium' });
    }
    
    if (/问题 | 风险 | 担忧 | 但是 | 不过/i.test(trimmed) && 
        /还没 | 没想好 | 要关注 | 先放 | 需要再/i.test(trimmed)) {
      result.p0_5.push({ content: trimmed.substring(0, 200), confidence: 'medium' });
    }
    
    if (/要 | 需要 | 负责 | 完成 | 你们 | 你们团队 | 我们这边/i.test(trimmed) &&
        /实验 | 检测 | 检索 | 准备 | 提交 | 联系/i.test(trimmed)) {
      result.p1.push({ content: trimmed.substring(0, 200), confidence: 'medium' });
    }
    
    if (/介绍 | 说明 | 背景 | 情况 | 目前 | 现在/i.test(trimmed) &&
        !/决定 | 必须 | 要/i.test(trimmed)) {
      result.p2.push({ content: trimmed.substring(0, 200), confidence: 'low' });
    }
  });
  
  result.p0 = result.p0.slice(0, 5);
  result.p0_5 = result.p0_5.slice(0, 5);
  result.p1 = result.p1.slice(0, 10);
  result.p2 = result.p2.slice(0, 10);
  
  return result;
}

async function testCreateDocuments(minute, extracted) {
  const docs = {};
  const date = new Date().toISOString().split('T')[0];
  
  // 文档 A: 《战略决策备忘》（P0）
  if (extracted.p0.length > 0) {
    const title = `战略决策备忘 · ${minute.title} - ${date}`;
    const content = generateP0Document(minute, extracted);
    docs.p0 = { title, content, type: '战略决策备忘' };
    console.log(`   📄 文档 A: ${title}`);
  }
  
  // 文档 B: 《风险与问题台账》（P0.5）
  if (extracted.p0_5.length > 0) {
    const title = `风险与问题台账 · ${minute.title} - ${date}`;
    const content = generateP05Document(minute, extracted);
    docs.p0_5 = { title, content, type: '风险与问题台账' };
    console.log(`   📄 文档 B: ${title}`);
  }
  
  // 文档 C: 《个人执行任务单》（P1）
  if (extracted.p1.length > 0) {
    const tasksByOwner = groupTasksByOwner(extracted.p1);
    Object.entries(tasksByOwner).forEach(([owner, tasks], index) => {
      const ownerName = owner === 'unknown' ? '待确认' : owner;
      const title = `个人执行任务单 · ${ownerName} · ${minute.title} - ${date}`;
      const content = generateP1Document(minute, ownerName, tasks);
      docs[`p1_${index}`] = { title, content, type: '个人执行任务单', owner: ownerName };
      console.log(`   📄 文档 C-${ownerName}: ${title}`);
    });
  }
  
  // 文档 D: 《信息分发快报》（P2/P3）
  if (extracted.p2.length > 0 || extracted.p3.length > 0) {
    const title = `信息分发快报 · ${minute.title} - ${date}`;
    const content = generateP2Document(minute, extracted);
    docs.p2 = { title, content, type: '信息分发快报' };
    console.log(`   📄 文档 D: ${title}`);
  }
  
  return docs;
}

function generateP0Document(minute, extracted) {
  const date = new Date().toISOString().split('T')[0];
  let md = `# 战略决策备忘\n\n**会议主题**: ${minute.title}\n**会议日期**: ${date}\n**参会人**: ${extracted.participants.join('、') || '待确认'}\n\n---\n\n`;
  
  if (extracted.p0.length === 0) {
    md += `暂无战略决策内容。\n\n`;
  } else {
    extracted.p0.forEach((item, index) => {
      md += `## 决策 ${index + 1}\n\n### 决策摘要\n${item.content}\n\n`;
      if (item.quote) md += `### 原文引用\n> "${item.quote}"\n\n`;
      md += `### 决策逻辑\n待补充\n\n### 边界条件\n待补充\n\n### 执行路线\n待补充\n\n---\n\n`;
    });
  }
  
  md += `\n> 本文档由 AI 自动生成，请王爷确认决策内容准确性\n`;
  return md;
}

function generateP05Document(minute, extracted) {
  const date = new Date().toISOString().split('T')[0];
  let md = `# 风险与问题台账\n\n**会议主题**: ${minute.title}\n**会议日期**: ${date}\n**参会人**: ${extracted.participants.join('、') || '待确认'}\n\n---\n\n`;
  
  if (extracted.p0_5.length === 0) {
    md += `暂无风险与问题。\n\n`;
  } else {
    md += `| # | 风险/问题描述 | 当前状态 | 影响范围 | 严重程度 | 责任人 | 首次提出 | 下次复盘 |\n|---|---|---|---|---|---|---|---|\n`;
    extracted.p0_5.forEach((item, index) => {
      const severity = item.severity || '🟠 高';
      const desc = item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content;
      md += `| ${index + 1} | ${desc} | 待确认 | 待评估 | ${severity} | 待确认 | ${date} | 待确认 |\n`;
    });
  }
  
  md += `\n---\n\n> 本文档由 AI 自动生成，请王爷确认风险内容并指定责任人\n`;
  return md;
}

function groupTasksByOwner(tasks) {
  const groups = {};
  tasks.forEach(task => {
    let owner = 'unknown';
    const match = task.content.match(/([A-Z 一二三四五六七八九十]+)\s*(要 | 需要 | 负责 | 完成)/);
    if (match) owner = match[1];
    if (!groups[owner]) groups[owner] = [];
    groups[owner].push(task);
  });
  return groups;
}

function generateP1Document(minute, owner, tasks) {
  const date = new Date().toISOString().split('T')[0];
  let md = `# 个人执行任务单\n\n**执行人**: ${owner}\n**会议主题**: ${minute.title}\n**会议日期**: ${date}\n\n---\n\n`;
  
  if (tasks.length === 0) {
    md += `暂无执行任务。\n\n`;
  } else {
    tasks.forEach((task, index) => {
      md += `## 任务 ${index + 1}\n\n**任务**: ${task.content}\n\n`;
      if (task.quote) md += `**原文引用**:\n> "${task.quote}"\n\n`;
      md += `### 六要素\n\n▎**任务**: [待补充]\n▎**协同**: [待补充]\n▎**产出**: [待补充]\n▎**截止**: ${task.deadline || '[待补充]'}\n▎**反馈**: [待补充]\n▎**为何重要**: [待补充]\n\n---\n\n`;
    });
  }
  
  md += `\n> 本文档由 AI 自动生成，请确认任务内容并补充六要素\n`;
  return md;
}

function generateP2Document(minute, extracted) {
  const date = new Date().toISOString().split('T')[0];
  let md = `# 信息分发快报\n\n**会议主题**: ${minute.title}\n**会议日期**: ${date}\n**参会人**: ${extracted.participants.join('、') || '待确认'}\n\n---\n\n`;
  
  if (extracted.p2.length === 0 && extracted.p3.length === 0) {
    md += `暂无知悉信息。\n\n`;
  } else {
    if (extracted.p2.length > 0) {
      md += `## 🟡 知悉信息（P2）\n\n`;
      extracted.p2.forEach((item, index) => {
        md += `${index + 1}. ${item.content}\n\n`;
        if (item.targetAudience) md += `   **建议知悉**: ${item.targetAudience}\n\n`;
      });
    }
    if (extracted.p3.length > 0) {
      md += `## 🟢 背景信息（P3）\n\n`;
      extracted.p3.forEach((item, index) => {
        md += `${index + 1}. ${item.content}\n\n`;
      });
    }
  }
  
  md += `\n---\n\n> **仅知悉，无需回复**\n> 本文档由 AI 自动生成\n`;
  return md;
}

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

function saveTestCache(minute, extracted) {
  const cacheFile = path.join(__dirname, '../../memory/meeting-summary-cache.json');
  const dir = path.dirname(cacheFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
  }
  
  const meetingId = minute.token;
  const date = new Date().toISOString().split('T')[0];
  
  cache[meetingId] = {
    meeting_id: meetingId,
    date: date,
    title: minute.title,
    type: extracted.meetingType || '待分类',
    participants: extracted.participants,
    p0_decisions: extracted.p0.map(p => ({ decision: p.content, context: '' })),
    p0_5_risks: extracted.p0_5.map(p => ({ 
      risk: p.content, 
      owner: '待确认', 
      severity: p.severity || '🟠', 
      review_date: '待确认' 
    })),
    p1_tasks: extracted.p1.map(p => ({
      task: p.content,
      owner: p.owner || '待确认',
      deadline: p.deadline || '待确认',
      status: 'pending'
    })),
    processedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  console.log(`💾 缓存已保存到：${cacheFile}`);
}

// 执行测试
main();
