/**
 * 结构化缓存模块
 * 功能：保存会议结构化数据，供下次跨会议关联使用
 * 
 * 缓存内容：
 * - 会议基本信息（标题、日期、参会人）
 * - P0 决策
 * - P0.5 风险
 * - P1 任务
 */

const fs = require('fs');
const path = require('path');

/**
 * 保存会议缓存
 * 
 * @param {object} minute - 妙记元数据
 * @param {object} extracted - 提取的结构化数据
 * @param {string} cacheFile - 缓存文件路径
 */
function saveMeetingCache(minute, extracted, cacheFile) {
  try {
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
      p0_decisions: extracted.p0.map(p => ({ decision: p.content, context: p.quote || '' })),
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
        status: 'pending',
        feishu_task_id: null // 飞书任务 ID（创建后更新）
      })),
      processedAt: new Date().toISOString()
    };
    
    const dir = path.dirname(cacheFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
    console.log('💾 已保存会议缓存');
  } catch (error) {
    console.error('❌ 保存会议缓存失败:', error.message);
  }
}

/**
 * 加载会议缓存
 */
function loadMeetingCache(cacheFile) {
  try {
    if (fs.existsSync(cacheFile)) {
      const data = fs.readFileSync(cacheFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('⚠️ 读取会议缓存失败:', error.message);
  }
  return {};
}

/**
 * 获取历史会议数据（用于跨会议关联）
 */
function getHistoricalData(cache, meetingId) {
  return cache[meetingId] || null;
}

/**
 * 清理过期缓存（保留 90 天）
 */
function cleanupOldCache(cacheFile, daysToKeep = 90) {
  try {
    if (!fs.existsSync(cacheFile)) {
      return;
    }
    
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - daysToKeep * 24 * 60 * 60 * 1000);
    
    let removed = 0;
    Object.keys(cache).forEach(meetingId => {
      const meetingDate = new Date(cache[meetingId].date);
      if (meetingDate < cutoffDate) {
        delete cache[meetingId];
        removed++;
      }
    });
    
    if (removed > 0) {
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
      console.log(`🗑️ 已清理 ${removed} 条过期缓存记录`);
    }
  } catch (error) {
    console.error('❌ 清理缓存失败:', error.message);
  }
}

module.exports = {
  saveMeetingCache,
  loadMeetingCache,
  getHistoricalData,
  cleanupOldCache
};
