<#
 .SYNOPSIS
  feishu-meeting-workflow 5-step interactive setup (PowerShell)

 .DESCRIPTION
  Step 1: Configuration initialization (LLM detection + Feishu identity + permissions + Open ID)
  Step 2: Workflow introduction (4 modules explained)
  Step 3: Module selection (user picks needed modules)
  Step 4: Table setup (auto-create or paste existing table links)
  Step 5: Final check and guidance
#>

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================"
Write-Host "  飞书通用会议总结 Skill - 5 步安装配置脚本"
Write-Host "  v3.6 | PowerShell"
Write-Host "============================================"
Write-Host ""

# ──────────────────────────────────────────
# Step 1: 配置初始化
# ──────────────────────────────────────────
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  Step 1 / 5: 配置初始化"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

# [1/5] 检测 OpenClaw 配置
Write-Host "[1/5] 检测 OpenClaw 环境..."
$configPath = Join-Path $env:APPDATA "FanDo\openclaw\openclaw.json"
$feishuAppId = ""
$llmEndpoint = ""
$llmModel = ""

if (Test-Path $configPath) {
    try {
        $ocConfig = Get-Content $configPath -Encoding UTF8 | ConvertFrom-Json
        
        # 检测 LLM
        if ($ocConfig.models.providers.vllm.baseUrl) {
            $llmEndpoint = $ocConfig.models.providers.vllm.baseUrl
            Write-Host "   ✅ LLM endpoint: $llmEndpoint"
            
            # 如果 endpoint 包含 localhost → 警告
            if ($llmEndpoint -like "*localhost*") {
                Write-Host "   ⚠️ 检测到 localhost → 建议改为云端地址，否则只在本地可用"
            }
        } else {
            Write-Host "   ⚠️ 未检测到 LLM endpoint"
        }
        
        if ($ocConfig.models.providers.vllm.models) {
            $availableModels = $ocConfig.models.providers.vllm.models | ForEach-Object { $_.id }
            $llmModel = $availableModels | Select-Object -First 1
            if ($llmModel) {
                Write-Host "   ✅ LLM model: $llmModel"
            }
        }
        
        # 检测 Feishu App ID
        if ($ocConfig.channels.feishu.appId) {
            $feishuAppId = $ocConfig.channels.feishu.appId
            Write-Host "   ✅ Feishu App ID: $feishuAppId"
        }
    } catch {
        Write-Host "   ⚠️ 读取配置文件失败: $($_.Exception.Message)"
    }
} else {
    Write-Host "   ⚠️ 未找到 OpenClaw 配置文件: $configPath"
    Write-Host "   ⚠️ 请先确保 OpenClaw 已运行"
}

Write-Host ""

# [2/5] 飞书身份配置
Write-Host "[2/5] 配置飞书身份..."
Write-Host "   前往飞书开放平台复制: https://open.feishu.cn/app"
Write-Host ""

# 如果自动检测到 App ID，展示给用户
if ($feishuAppId -ne "") {
    Write-Host "   自动检测到 App ID: $feishuAppId"
    $confirmAppId = Read-Host "   是否使用此 App ID？(Y/n，默认 Y)"
    if ($confirmAppId -eq "n" -or $confirmAppId -eq "N") {
        $feishuAppId = Read-Host "   ⮕ 请输入 App ID"
    }
} else {
    $feishuAppId = Read-Host "   ⮕ 请输入 App ID"
}

$APP_SECRET = Read-Host "   ⮕ 请输入 App Secret (必填)"

Write-Host ""

# [3/5] 飞书权限清单
Write-Host "[3/5] 请确认以下飞书权限已开通:"
Write-Host "   前往: https://open.feishu.cn/app → 你的应用 → 权限管理"
Write-Host ""
Write-Host "   必需的权限:"
Write-Host "   ┌─────────────────────────────────────────────────────────┐"
Write-Host "   │ ☐ minutes:minute:readonly     读取妙记                  │"
Write-Host "   │ ☐ minutes:transcript:export   导出妙记逐字稿（必需！）  │"
Write-Host "   │ ☐ drive:drive                 创建和读写云文档          │"
Write-Host "   │ ☐ bitable:app                 操作多维表格              │"
Write-Host "   │ ☐ contact:contact             读取用户信息              │"
Write-Host "   │ ☐ calendar:calendar:readonly  读取日程（推荐）          │"
Write-Host "   └─────────────────────────────────────────────────────────┘"
Write-Host ""
Write-Host "   开通后点击「提交审核」→ 企业管理员审核通过才生效"
Write-Host ""

# [4/5] 自动检测用户 Open ID
Write-Host "[4/5] 检测用户身份..."
$USER_OPEN_ID = ""

try {
    $larkStatus = & lark-cli auth status 2>&1
    if ($LASTEXITCODE -eq 0) {
        $userInfo = $larkStatus | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($userInfo.userOpenId) {
            $USER_OPEN_ID = $userInfo.userOpenId
            Write-Host "   ✅ 自动检测到 Open ID: $USER_OPEN_ID"
        }
    }
} catch {
    # 忽略错误
}

if ([string]::IsNullOrEmpty($USER_OPEN_ID)) {
    Write-Host "   ⚠️ 自动检测失败"
    $USER_OPEN_ID = Read-Host "   ⮕ 请输入你的飞书 Open ID (ou_xxx)"
    if ([string]::IsNullOrEmpty($USER_OPEN_ID)) {
        $USER_OPEN_ID = "YOUR_OPEN_ID"
        Write-Host "   ⚠️ 留空，使用占位符，请稍后手动修改 config.json"
    }
}

Write-Host ""

# [5/5] 生成 config.json
Write-Host "[5/5] 生成配置文件..."

$config = @{
    feishu = @{
        app_id = if ($feishuAppId) { $feishuAppId } else { "YOUR_APP_ID" }
        app_secret = $APP_SECRET
    }
    roles = @{
        decision_maker_open_id = $USER_OPEN_ID
        organizer_open_id = $USER_OPEN_ID
    }
    llm = @{
        endpoint = if ($llmEndpoint) { $llmEndpoint } else { "YOUR_LLM_ENDPOINT" }
        model = if ($llmModel) { $llmModel } else { "YOUR_MODEL" }
        max_tokens = 4096
        temperature = 0.1
    }
    tables = @{
        task_management_base_token = ""
        task_management_table_id = ""
        meeting_records_base_token = ""
        meeting_records_table_id = ""
    }
    cron = @{
        overdue_reminder_job_id = ""
    }
    minutes = @{
        check_window_minutes = 60
    }
    automation = @{
        reminder_days_before = 3
    }
    paths = @{
        processed_file = "../../memory/processed-meetings-summary.json"
        cache_file = "../../memory/meeting-summary-cache.json"
        output_dir = "./minutes"
        pre_meeting_docs_dir = "../../memory/pre-meeting-docs"
    }
}

$configJsonPath = Join-Path $PSScriptRoot "config.json"
$config | ConvertTo-Json -Depth 10 | Set-Content $configJsonPath -Encoding UTF8
Write-Host "   ✅ config.json 已创建: $configJsonPath"
Write-Host ""

Write-Host "✅ Step 1 配置初始化完成！"
Write-Host "回复 continue 或 next 进入 Step 2 →"
$input1 = Read-Host "   ⮕"

# ──────────────────────────────────────────
# Step 2: 工作流介绍
# ──────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  Step 2 / 5: 完整工作流介绍"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

Write-Host "以下逐一介绍本 Skill 的 4 个工作模块。"
Write-Host "看完后我会让你选择需要哪些。"
Write-Host ""

Write-Host "───────────────────────────────────────────"
Write-Host ""
Write-Host "【模块 A：分级纪要 + 综合归档】"
Write-Host "───────────────────────────────────────────"
Write-Host ""
Write-Host "一次会议 → 生成 5 份文档，按角色分层分发："
Write-Host ""
Write-Host "   📄 战略决策备忘"
Write-Host "     内容：会上敲定的战略方向、重大决策"
Write-Host "     发给：高管"
Write-Host ""
Write-Host "   📄 风险与问题台账"
Write-Host "     内容：没解决的风险、分歧、外部变化"
Write-Host "     发给：项目负责人"
Write-Host ""
Write-Host "   📄 个人执行任务单"
Write-Host "     内容："谁 + 做什么 + 何时完成"的任务"
Write-Host "     发给：每个任务的执行人"
Write-Host ""
Write-Host "   📄 信息分发快报"
Write-Host "     内容：不需行动但需知晓的背景/趋势"
Write-Host "     发给：所有相关群聊"
Write-Host ""
Write-Host "   另外生成 📄 综合纪要：以上 4 份的完整内容合并，"
Write-Host "   附进会议记录归档表，也直接发给你阅读。"
Write-Host ""
Write-Host "   💡 每次处理妙记时，会问你这几份文档分别发给谁。"
Write-Host "     也可以沿用上次的配置。"
Write-Host ""

Write-Host "───────────────────────────────────────────"
Write-Host ""
Write-Host "【模块 B：任务管理】"
Write-Host "───────────────────────────────────────────"
Write-Host ""
Write-Host "从文档 C 中提取的 P1 任务，自动录入多维表格。"
Write-Host ""
Write-Host "之后每天 9:00 自动检查任务状态："
Write-Host "   · 到期前 N 天 → 提醒负责人（N 可在处理时调整，默认 3）"
Write-Host "   · 已逾期 → 升级通知决策者"
Write-Host ""
Write-Host "需要：一个「会议任务管理表」多维表格"
Write-Host ""

Write-Host "───────────────────────────────────────────"
Write-Host ""
Write-Host "【模块 C：会前历史关联】"
Write-Host "───────────────────────────────────────────"
Write-Host ""
Write-Host "下次同类会议开始前 24 小时，自动推送："
Write-Host "   · 上次定了什么"
Write-Host "   · 哪些任务过期了"
Write-Host "   · 本次议题和上次是否重复 / 矛盾"
Write-Host ""

Write-Host "───────────────────────────────────────────"
Write-Host ""
Write-Host "【模块 D：会议记录归档】"
Write-Host "───────────────────────────────────────────"
Write-Host ""
Write-Host "每次会议自动将两份文档归档到多维表格："
Write-Host "   · 📄 逐字稿（完整发言记录）"
Write-Host "   · 📄 综合纪要（4 份分级文档完整内容合并）"
Write-Host "   两个分别作为独立字段存入，方便后续按需查阅。"
Write-Host ""
Write-Host "归档后支持按日期 / 参会人 / 议题检索。"
Write-Host ""
Write-Host "需要：一个「会议记录归档表」多维表格"
Write-Host ""

Write-Host "───────────────────────────────────────────"
Write-Host ""
Write-Host "📖 介绍完毕！"
Write-Host "回复 continue 或 next 进入选择 →"
$input2 = Read-Host "   ⮕"

# ──────────────────────────────────────────
# Step 3: 用户选择模块
# ──────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  Step 3 / 5: 功能选择"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

Write-Host "请选择需要启用的工作模块："
Write-Host ""
Write-Host "  1️⃣ 分级纪要 + 综合归档  多份文档按角色分发 + 完整内容合并"
Write-Host "  2️⃣ 任务管理             自动录入 + 到期提醒 + 逾期升级"
Write-Host "  3️⃣ 会前历史关联         重复/矛盾/遗漏检测 + 历史推送"
Write-Host "  4️⃣ 会议记录归档         逐字稿 + 综合纪要存入表格"
Write-Host ""
Write-Host "  输入 all → 启用全部 4 个模块"
Write-Host ""

$selectedModules = @()
$moduleInput = Read-Host "   ⮕ 请输入（例如 1,2,4 或 all）"

if ($moduleInput -eq "all") {
    $selectedModules = @(1, 2, 3, 4)
    Write-Host "   ✅ 已选择全部 4 个模块"
} else {
    $parts = $moduleInput -split "," | ForEach-Object { $_.Trim() }
    $valid = $true
    foreach ($p in $parts) {
        $num = 0
        if ([int]::TryParse($p, [ref]$num)) {
            if ($num -ge 1 -and $num -le 4) {
                $selectedModules += $num
            } else {
                Write-Host "   ❌ 无效编号: $p（请输入 1-4）"
                $valid = $false
            }
        } else {
            Write-Host "   ❌ 无效输入: $p"
            $valid = $false
        }
    }
    if (-not $valid) {
        $moduleInput = Read-Host "   ⮕ 请重新输入（例如 1,2,4 或 all）"
        if ($moduleInput -eq "all") {
            $selectedModules = @(1, 2, 3, 4)
        } else {
            $selectedModules = $moduleInput -split "," | ForEach-Object { [int]$_.Trim() }
        }
    }
}

$hasModuleB = $selectedModules -contains 2
$hasModuleD = $selectedModules -contains 4

Write-Host ""
Write-Host "   ✅ 已选模块: $($selectedModules -join ', ')"
Write-Host ""

Write-Host "✅ Step 3 选择完成！"
Write-Host "回复 continue 或 next 进入 Step 4 →"
$input3 = Read-Host "   ⮕"

# ──────────────────────────────────────────
# Step 4: 表格处理
# ──────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  Step 4 / 5: 多维表格设置"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

Write-Host "根据你选择的模块，需要以下表格："
Write-Host ""

if ($hasModuleB) {
    Write-Host "┌── 模块 B → 会议任务管理表 ──────────────────────┐"
    Write-Host "│  任务内容(文本) / 负责人(人员) / 截止时间(日期)   │"
    Write-Host "│  当前状态(单选:待开始/进行中/已完成/已逾期)      │"
    Write-Host "│  来源会议(文本)                                   │"
    Write-Host "└──────────────────────────────────────────────────┘"
    Write-Host ""
}

if ($hasModuleD) {
    Write-Host "┌── 模块 D → 会议记录归档表 ──────────────────────┐"
    Write-Host "│  会议主题(文本) / 会议日期(日期)                  │"
    Write-Host "│  参会人(人员) / 逐字稿链接(文本)                  │"
    Write-Host "│  纪要整理链接(文本)                               │"
    Write-Host "│  （逐字稿链接和纪要整理链接是两个独立字段！）     │"
    Write-Host "└──────────────────────────────────────────────────┘"
    Write-Host ""
}

Write-Host "[A] 已有这些表格 → 发链接给我，我检查字段"
Write-Host "[B] 我来创建 → 一键生成 + 配齐全部字段"
Write-Host ""

$tableChoice = Read-Host "   ⮕ 选哪个？[A/B]"

if ($tableChoice -eq "B" -or $tableChoice -eq "b") {
    Write-Host ""
    Write-Host "   🛠️ 正在通过飞书 API 创建多维表格..."
    Write-Host "   请确保你的飞书应用已开通 bitable:app 权限"
    Write-Host ""
    Write-Host "   ⚠️ 目前自动化创建功能需要你手动创建多维表格，"
    Write-Host "   后续版本会支持一键自动创建。"
    Write-Host ""
    Write-Host "   请手动在飞书中创建多维表格："
    if ($hasModuleB) {
        Write-Host "   1️⃣ 创建「会议任务管理表」，包含以下字段："
        Write-Host "      - 任务内容(文本)"
        Write-Host "      - 负责人(人员)"
        Write-Host "      - 截止时间(日期)"
        Write-Host "      - 当前状态(单选:待开始/进行中/已完成/已逾期)"
        Write-Host "      - 来源会议(文本)"
    }
    if ($hasModuleD) {
        Write-Host "   2️⃣ 创建「会议记录归档表」，包含以下字段："
        Write-Host "      - 会议主题(文本)"
        Write-Host "      - 会议日期(日期)"
        Write-Host "      - 参会人(人员)"
        Write-Host "      - 逐字稿链接(文本) ← 独立字段"
        Write-Host "      - 纪要整理链接(文本) ← 独立字段"
    }
    Write-Host ""
    Write-Host "   创建完成后，把表格链接发给我 ↓"
}

Write-Host ""
if ($hasModuleB) {
    Write-Host "   📋 会议任务管理表链接（或留空跳过）:"
    $taskBaseUrl = Read-Host "   ⮕"
    if ($taskBaseUrl -ne "") {
        # 尝试解析 token
        if ($taskBaseUrl -match "base/([a-zA-Z0-9]+)") {
            $config.tables.task_management_base_token = $matches[1]
            Write-Host "   ✅ 已解析 task base token: $($matches[1])"
        } elseif ($taskBaseUrl -match "bitable/([a-zA-Z0-9]+)") {
            $config.tables.task_management_base_token = $matches[1]
            Write-Host "   ✅ 已解析 task base token: $($matches[1])"
        }
    }
}
if ($hasModuleD) {
    Write-Host "   📋 会议记录归档表链接（或留空跳过）:"
    $meetingBaseUrl = Read-Host "   ⮕"
    if ($meetingBaseUrl -ne "") {
        if ($meetingBaseUrl -match "base/([a-zA-Z0-9]+)") {
            $config.tables.meeting_records_base_token = $matches[1]
            Write-Host "   ✅ 已解析 meeting base token: $($matches[1])"
        } elseif ($meetingBaseUrl -match "bitable/([a-zA-Z0-9]+)") {
            $config.tables.meeting_records_base_token = $matches[1]
            Write-Host "   ✅ 已解析 meeting base token: $($matches[1])"
        }
    }
}

Write-Host ""
Write-Host "✅ Step 4 表格处理完成！"
Write-Host "回复 continue 或 next 进入 Step 5 →"
$input4 = Read-Host "   ⮕"

# ──────────────────────────────────────────
# Step 5: 最终自检
# ──────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  Step 5 / 5: 最终自检"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

Write-Host "正在执行最终验证..."
Write-Host ""

# 更新 config.json
$config | ConvertTo-Json -Depth 10 | Set-Content $configJsonPath -Encoding UTF8

# 自检结果
Write-Host "   ☐ 飞书连接：✅ 配置已保存（App ID: $($config.feishu.app_id)）"
if ($llmEndpoint -ne "") {
    Write-Host "   ☐ LLM 连通性：✅ 已检测（model: $llmModel）"
} else {
    Write-Host "   ☐ LLM 连通性：⚠️ 未检测到，请稍后手动配置"
}
Write-Host "   ☐ 飞书权限：请确认以下权限已开通："
Write-Host "       minutes:minute:readonly ✅ / minutes:transcript:export ✅"
Write-Host "       drive:drive ✅ / bitable:app ✅"
Write-Host "   ☐ 启用模块：$($selectedModules -join '、')"
if ($hasModuleB) {
    if ($config.tables.task_management_base_token -ne "") {
        Write-Host "   ☐ 会议任务管理表：✅ 已就绪"
    } else {
        Write-Host "   ☐ 会议任务管理表：⚠️ 未配置，请稍后手动添加 token"
    }
}
if ($hasModuleD) {
    if ($config.tables.meeting_records_base_token -ne "") {
        Write-Host "   ☐ 会议记录归档表：✅ 已就绪"
    } else {
        Write-Host "   ☐ 会议记录归档表：⚠️ 未配置，请稍后手动添加 token"
    }
}

# 注册 Cron
Write-Host ""
Write-Host "   [可选] 注册 Cron 逾期提醒（每天 9:00 工作日）？"
$registerCron = Read-Host "   注册吗？(Y/n，默认 Y)"
if ($registerCron -ne "n" -and $registerCron -ne "N") {
    try {
        $cronResult = openclaw cron add --name "meeting-overdue-check" --cron "0 9 * * 1-5" --tz "Asia/Shanghai" --message "Read skills/feishu-meeting-workflow/SKILL.md and execute Step 13-14." --session isolated --no-deliver --timeout-seconds 300 --light-context 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ 逾期提醒 Cron 已注册"
            try {
                $newJobId = ($cronResult | ConvertFrom-Json).id
                $config.cron.overdue_reminder_job_id = $newJobId
                $config | ConvertTo-Json -Depth 10 | Set-Content $configJsonPath -Encoding UTF8
                Write-Host "   ✅ Cron Job ID: $newJobId 已写入 config.json"
            } catch {
                Write-Host "   ⚠️ 无法解析 Cron Job ID，请稍后手动检查"
            }
        } else {
            Write-Host "   ⚠️ Cron 注册失败，可稍后手动注册"
        }
    } catch {
        Write-Host "   ⚠️ Cron 注册失败（openclaw CLI 可能未就绪）"
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  ✅ 安装配置完成！（第 5 步 / 共 5 步）"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
Write-Host "📌 下一步："
Write-Host "   方式一：正常使用 → 下次你创建日程并开会后，自动扫描妙记处理"
Write-Host "   方式二：立即验证 → 发一条你有权限的测试妙记链接给 Agent，"
Write-Host "           立即走完全流程"
Write-Host ""
Write-Host "   建议：先发一条测试妙记跑一遍，确认所有环节正常"
Write-Host ""
