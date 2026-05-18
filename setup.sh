#!/usr/bin/env bash
# ============================================================
# feishu-meeting-workflow 一键安装脚本
# ============================================================
# 用法: bash setup.sh
# 依赖: openclaw CLI (必需), git (可选), node (可选)
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  feishu-meeting-workflow 安装脚本${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ---------- 检查依赖 ----------
echo -e "${YELLOW}[1/5] 检查依赖环境...${NC}"

if ! command -v openclaw &>/dev/null; then
    echo -e "${RED}❌ openclaw CLI 未找到，请先安装 OpenClaw${NC}"
    exit 1
fi
echo -e "${GREEN}✅ openclaw CLI 可用${NC}"

if command -v node &>/dev/null; then
    echo -e "${GREEN}✅ node $(node -v) 可用${NC}"
    echo "   运行 npm install 安装依赖..."
    npm install --silent 2>/dev/null || echo -e "${YELLOW}   ⚠️ npm install 失败，可手动运行${NC}"
else
    echo -e "${YELLOW}⚠️  node 未安装，跳过依赖安装${NC}"
fi

# ---------- 配置检查 ----------
echo ""
echo -e "${YELLOW}[2/5] 检查配置文件...${NC}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}⚠️  未找到 config.json${NC}"
    if [ -f "$SCRIPT_DIR/config.example.yaml" ]; then
        echo "   参考 config.example.yaml 创建 config.json"
        echo "   配置项说明见 docs/CONFIG.md"
    fi
    echo "   请手动创建 config.json 后重新运行本脚本"
else
    echo -e "${GREEN}✅ config.json 已存在${NC}"
fi

# ---------- 注册 Cron Job ----------
echo ""
echo -e "${YELLOW}[3/5] 注册定时任务...${NC}"

# 逾期提醒：每天 09:00 检查逾期任务
echo "   注册「逾期提醒」每天 09:00..."
if openclaw cron add \
    --name "会议-逾期提醒" \
    --cron "0 9 * * 1-5" \
    --tz "Asia/Shanghai" \
    --message "执行飞书会议逾期提醒和会前文档检查。Read skills/feishu-meeting-workflow/SKILL.md and execute Step 13-14." \
    --session isolated \
    --no-deliver \
    --timeout-seconds 300 \
    --light-context \
    2>/dev/null; then
    echo -e "${GREEN}   ✅ 逾期提醒已注册${NC}"
else
    echo -e "${YELLOW}   ⚠️ 注册失败（可能已存在），可手动执行：${NC}"
    echo "      openclaw cron add --name \"会议-逾期提醒\" --cron \"0 9 * * 1-5\" --tz \"Asia/Shanghai\" --message \"...\" --session isolated --no-deliver"
fi

echo ""
echo -e "${YELLOW}[4/5] 完成！${NC}"
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  安装完成！以下是已注册的定时任务：${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  📅 逾期提醒      每天 09:00（工作日）"
echo ""
echo -e "${BLUE}使用说明：${NC}"
echo -e "  1. 确保 config.json 已正确配置"
echo -e "  2. 手动触发测试：openclaw cron run <job-id>"
echo -e "  3. 查看运行日志：openclaw cron runs <job-id>"
echo ""
echo -e "${YELLOW}[5/5] 快速验证...${NC}"
openclaw cron list 2>/dev/null | grep "会议-" || true
echo ""
echo -e "${GREEN}✅ 安装脚本执行完毕${NC}"
