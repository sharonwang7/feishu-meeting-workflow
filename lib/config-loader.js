/**
 * 配置加载模块
 * 支持从 .env、config.json 或 config.yaml 读取配置
 * 同时支持环境变量覆盖
 */

const fs = require('fs');
const path = require('path');

// 加载 .env 文件（如果存在）
const dotenvPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(dotenvPath)) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: dotenvPath });
    console.log('📋 已加载 .env 文件');
  } catch (error) {
    console.warn('⚠️ 加载 .env 文件失败:', error.message);
  }
}

/**
 * 加载配置文件
 * 优先级：config.json > config.yaml > 默认值
 */
function loadConfig() {
  const configDir = __dirname;
  const configJson = path.join(configDir, 'config.json');
  const configYaml = path.join(configDir, 'config.yaml');
  const configExample = path.join(configDir, 'config.example.yaml');

  let config = {};

  // 尝试读取 JSON 配置
  if (fs.existsSync(configJson)) {
    try {
      const data = fs.readFileSync(configJson, 'utf-8');
      config = JSON.parse(data);
      console.log('📋 已加载 config.json');
    } catch (error) {
      console.warn('⚠️ 读取 config.json 失败:', error.message);
    }
  }
  // 尝试读取 YAML 配置
  else if (fs.existsSync(configYaml)) {
    try {
      const yaml = require('js-yaml');
      const data = fs.readFileSync(configYaml, 'utf-8');
      config = yaml.load(data);
      console.log('📋 已加载 config.yaml');
    } catch (error) {
      console.warn('⚠️ 读取 config.yaml 失败:', error.message);
    }
  }
  // 检查是否缺少配置文件
  else if (!fs.existsSync(configJson) && !fs.existsSync(configYaml)) {
    if (fs.existsSync(configExample)) {
      console.error('❌ 缺少配置文件！请复制 config.example.yaml 为 config.yaml（或 config.json），并填写配置。');
    }
  }

  // 环境变量覆盖
  config = applyEnvOverrides(config);

  return config;
}

/**
 * 环境变量覆盖
 * 支持以下环境变量：
 * - FEISHU_APP_ID
 * - FEISHU_APP_SECRET
 * - LLM_ENDPOINT
 * - LLM_MODEL
 * - DECISION_MAKER_OPEN_ID
 */
function applyEnvOverrides(config) {
  if (process.env.FEISHU_APP_ID) {
    config.feishu = config.feishu || {};
    config.feishu.app_id = process.env.FEISHU_APP_ID;
  }

  if (process.env.FEISHU_APP_SECRET) {
    config.feishu = config.feishu || {};
    config.feishu.app_secret = process.env.FEISHU_APP_SECRET;
  }

  if (process.env.LLM_ENDPOINT) {
    config.llm = config.llm || {};
    config.llm.endpoint = process.env.LLM_ENDPOINT;
  }

  if (process.env.LLM_MODEL) {
    config.llm = config.llm || {};
    config.llm.model = process.env.LLM_MODEL;
  }

  if (process.env.DECISION_MAKER_OPEN_ID) {
    config.roles = config.roles || {};
    config.roles.decision_maker_open_id = process.env.DECISION_MAKER_OPEN_ID;
  }

  if (process.env.ORGANIZER_OPEN_ID) {
    config.roles = config.roles || {};
    config.roles.organizer_open_id = process.env.ORGANIZER_OPEN_ID;
  }

  return config;
}

/**
 * 获取配置项，带默认值
 */
function getConfig(config, key, defaultValue) {
  const keys = key.split('.');
  let value = config;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return defaultValue;
    }
  }

  return value !== undefined ? value : defaultValue;
}

module.exports = {
  loadConfig,
  getConfig
};
