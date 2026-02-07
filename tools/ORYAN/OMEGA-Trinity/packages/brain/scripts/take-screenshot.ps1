Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$savePath = "C:\Users\mega_\gAIng-Brain\screenshot.png"
$bitmap.Save($savePath)
$bitmap.Dispose()
$graphics.Dispose()
Write-Host "Screenshot saved to: $savePath" -ForegroundColor Green
