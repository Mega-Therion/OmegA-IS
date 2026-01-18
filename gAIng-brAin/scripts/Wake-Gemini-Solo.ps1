# Wake-Gemini-Solo.ps1
# The Optimized "God Mode" Startup
# Launches ONLY Gemini in an interactive terminal, fully synced and ready.

# 0. THE HUD (Window Management)
# Position: Top-Left Quadrant (25% area) | Layer: Always On Top
try {
    Add-Type -AssemblyName System.Windows.Forms
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $w = [int]($screen.WorkingArea.Width / 2)
    $h = [int]($screen.WorkingArea.Height / 2)

    $signature = @"
    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
"@
    $win32 = Add-Type -MemberDefinition $signature -Name "Win32MainWindow" -Namespace "Win32" -PassThru
    $handle = $win32::GetConsoleWindow()
    $HWND_TOPMOST = [IntPtr]::new(-1)
    $SWP_SHOWWINDOW = 0x0040
    
    # Move to 0,0, resize to w,h, set TopMost
    $win32::SetWindowPos($handle, $HWND_TOPMOST, 0, 0, $w, $h, $SWP_SHOWWINDOW)
} catch {
    Write-Warning "HUD configuration failed: $_"
}

$ErrorActionPreference = 'SilentlyContinue'
$root = (Split-Path -Parent $PSScriptRoot)

# 1. THE SHADOWS (Infrastructure)
# Start Server and Ngrok hidden
if (Test-Path "$root\scripts\start-brain.ps1") {
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$root\scripts\start-brain.ps1`"" -WindowStyle Hidden
}
if (Test-Path "$root\scripts\start-ngrok.ps1") {
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$root\scripts\start-ngrok.ps1`"" -WindowStyle Hidden
}

# 2. THE UNLOCK (Environment)
# Run Peak Mode setup in THIS terminal (dot-source to keep env vars)
. "$root\scripts\Unlock-PeakMode.ps1"

# 3. THE SYNC (Visual Context)
Write-Host "`n[SYSTEM SYNCED] Reading latest from The Blackboard..." -ForegroundColor Cyan
$logPath = [System.Environment]::GetEnvironmentVariable('AGENTS_MD_PATH', 'User')
if ($logPath -and (Test-Path $logPath)) {
    Get-Content $logPath -Tail 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
}

Write-Host "`n[GEMINI READY] Awaiting input..." -ForegroundColor Yellow

# 4. THE INTERFACE
# Launch Gemini CLI via the optimized Terminal Profile
wt -p "Gemini"
