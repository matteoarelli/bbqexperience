# Register the BBQ Claude Gate scheduled task on Windows.
# Run as the user that owns the claude.exe Pro Max OAuth session (NOT SYSTEM,
# because claude OAuth lives in %USERPROFILE%\.claude).
#
# Usage:
#   pwsh -File C:\Progetti\bbqexperience\scripts\agents\setup-claude-gate-task.ps1
#
# Re-run is idempotent (Unregister-ScheduledTask -Confirm:$false then re-register).

$ErrorActionPreference = "Stop"

$TaskName = "bbq-claude-gate"
$ScriptPath = "C:\Progetti\bbqexperience\scripts\agents\run-claude-gate.cmd"

if (-not (Test-Path $ScriptPath)) {
    throw "Launcher missing: $ScriptPath"
}

# Trigger: every 15 minutes, indefinitely, starting now (rounded to next quarter).
$now = Get-Date
$startMinute = [Math]::Ceiling($now.Minute / 15) * 15
if ($startMinute -ge 60) {
    $start = $now.Date.AddHours($now.Hour + 1)
} else {
    $start = $now.Date.AddHours($now.Hour).AddMinutes($startMinute)
}

# RepetitionDuration cap: TimeSpan.MaxValue is rejected by the COM API on Win10/11.
# 9999 days (~27 years) is effectively "forever" and works.
$trigger = New-ScheduledTaskTrigger -Once -At $start `
    -RepetitionInterval (New-TimeSpan -Minutes 15) `
    -RepetitionDuration (New-TimeSpan -Days 9999)

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$ScriptPath`""

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 5) `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Write-Host "Removing existing task '$TaskName'..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask -TaskName $TaskName `
    -Description "BBQ Experience: Claude Opus 4.7 quality gate (polls Strapi every 15 min)" `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Principal $principal | Out-Null

Write-Host "[OK] Task '$TaskName' registered."
Write-Host "     Trigger: every 15 min from $($start.ToString('yyyy-MM-dd HH:mm'))"
Write-Host "     Launcher: $ScriptPath"
Write-Host "     Log: C:\Progetti\bbqexperience\logs\claude-gate.log"
Write-Host ""
Write-Host "Test it now: cmd.exe /c `"$ScriptPath`""
