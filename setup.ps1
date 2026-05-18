# feishu-meeting-workflow setup script (PowerShell)
# Auto-detects OpenClaw config, no manual input needed for basic setup

Write-Host "============================================"
Write-Host "  feishu-meeting-workflow setup"
Write-Host "============================================"

# ---------- Auto-detect OpenClaw config ----------
Write-Host "[1/4] Auto-detecting OpenClaw configuration..."
$configPath = Join-Path $env:APPDATA "FanDo\openclaw\openclaw.json"
if (Test-Path $configPath) {
    $ocConfig = Get-Content $configPath -Encoding UTF8 | ConvertFrom-Json
    
    # Detect LLM
    $llmEndpoint = $ocConfig.models.providers.vllm.baseUrl
    $availableModels = $ocConfig.models.providers.vllm.models | ForEach-Object { $_.id }
    $llmModel = $availableModels | Select-Object -First 1
    
    if ($llmEndpoint) { Write-Host "  OK - LLM endpoint: $llmEndpoint" }
    if ($llmModel) { Write-Host "  OK - LLM model: $llmModel" }
    
    # Detect Feishu app config from channel plugins
    # Note: app_secret is sensitive and not auto-read; user needs to provide
    $feishuAppId = $ocConfig.channels.feishu.appId
    if ($feishuAppId) { Write-Host "  OK - Feishu App ID: $feishuAppId" }
    
} else {
    Write-Host "  WARN - OpenClaw config not found at $configPath"
}

# ---------- Auto-detect current user ----------
Write-Host "[2/4] Checking current Feishu user..."
# The decision maker is typically the current Feishu user
# We can note this but can't auto-read the open_id from here

# ---------- Create config.json ----------
Write-Host "[3/4] Generating config.json..."

$USER_OPEN_ID = Read-Host "Enter your Feishu Open ID (or press Enter to skip for now)"
if ([string]::IsNullOrEmpty($USER_OPEN_ID)) {
    $USER_OPEN_ID = "YOUR_OPEN_ID"
}

# Read Feishu App Secret from user (required)
$APP_SECRET = Read-Host "Enter your Feishu App Secret (required)"

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
        task_management_base_token = "YOUR_TASK_BASE_TOKEN"
        task_management_table_id = "YOUR_TASK_TABLE_ID"
        meeting_records_base_token = "YOUR_MEETING_BASE_TOKEN"
        meeting_records_table_id = "YOUR_MEETING_TABLE_ID"
    }
    cron = @{
        overdue_reminder_job_id = "YOUR_CRON_JOB_ID"
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

$configPath = Join-Path $PSScriptRoot "config.json"
$config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
Write-Host "  OK - config.json created at $configPath"

# ---------- Register cron jobs ----------
Write-Host "[4/4] Registering cron jobs..."

$cronResult = openclaw cron add --name "meeting-overdue-check" --cron "0 9 * * 1-5" --tz "Asia/Shanghai" --message "Read skills/feishu-meeting-workflow/SKILL.md and execute Step 13-14." --session isolated --no-deliver --timeout-seconds 300 --light-context 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - overdue check cron registered"
    $newJobId = ($cronResult | ConvertFrom-Json).id
    Write-Host "  Cron Job ID: $newJobId"
    
    # Update config.json with the actual cron job ID
    $currentConfig = Get-Content $configPath -Encoding UTF8 | ConvertFrom-Json
    $currentConfig.cron.overdue_reminder_job_id = $newJobId
    $currentConfig | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
}

Write-Host ""
Write-Host "============================================"
Write-Host "  Setup complete"
Write-Host "============================================"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Edit config.json to fill in YOUR_TASK_BASE_TOKEN, YOUR_TASK_TABLE_ID, etc."
Write-Host "  2. Or just run the workflow and I'll guide you through missing configs"
