# Generates Chrome Web Store images into store/:
#   screenshot-1.png  1280x800  (from screenshot.png in the project root, letterboxed in black)
#   promo-small.png   440x280   (icon + name)
# Run with Windows PowerShell (needs WPF): powershell -File scripts/make-store-images.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore, WindowsBase
$M = 'System.Windows.Media'

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'store'
New-Item -ItemType Directory -Force $outDir | Out-Null

function Save-Png($visual, $width, $height, $path) {
  $bmp = New-Object System.Windows.Media.Imaging.RenderTargetBitmap $width, $height, 96, 96, ([System.Windows.Media.PixelFormats]::Pbgra32)
  $bmp.Render($visual)
  # The store wants PNGs without an alpha channel.
  $rgb = New-Object System.Windows.Media.Imaging.FormatConvertedBitmap $bmp, ([System.Windows.Media.PixelFormats]::Bgr24), $null, 0
  $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($rgb))
  $fs = [System.IO.File]::Create($path)
  try { $enc.Save($fs) } finally { $fs.Close() }
  Write-Host "Wrote $path"
}

function Brush($r, $g, $b) {
  New-Object System.Windows.Media.SolidColorBrush ([System.Windows.Media.Color]::FromRgb($r, $g, $b))
}

# ---- Screenshot ----

# GDI+ high-quality bicubic averages every source pixel when shrinking, which keeps text crisp on
# large reductions (e.g. a 3840x2400 capture down to 1280x800). WPF's renderer only samples a few.
Add-Type -AssemblyName System.Drawing
$srcPath = Join-Path $root 'screenshot.png'
$src = [System.Drawing.Image]::FromFile($srcPath)
try {
  $w = 1280; $h = 800
  $scale = [Math]::Min($w / $src.Width, $h / $src.Height)
  $dw = [int][Math]::Round($src.Width * $scale); $dh = [int][Math]::Round($src.Height * $scale)
  $out = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.Clear([System.Drawing.Color]::Black)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.CompositingQuality = 'HighQuality'
  # Clamp sampling at the image edges so the border doesn't pick up a dark halo.
  $attrs = New-Object System.Drawing.Imaging.ImageAttributes
  $attrs.SetWrapMode('TileFlipXY')
  $dest = New-Object System.Drawing.Rectangle ([int](($w - $dw) / 2)), ([int](($h - $dh) / 2)), $dw, $dh
  $g.DrawImage($src, $dest, 0, 0, $src.Width, $src.Height, 'Pixel', $attrs)
  $g.Dispose()
  $shotPath = Join-Path $outDir 'screenshot-1.png'
  $out.Save($shotPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  Write-Host "Wrote $shotPath"
} finally {
  $src.Dispose()
}

# ---- Small promo tile ----

$svg = Get-Content (Join-Path $root 'icons/icon.svg') -Raw
$arrows = [regex]::Match($svg, ' d="([^"]+)"').Groups[1].Value

function Draw-Icon($ctx, $x, $y, $size) {
  $k = $size / 24.0
  $ctx.DrawRoundedRectangle((Brush 255 0 0), $null, (New-Object System.Windows.Rect $x, $y, $size, $size), 5 * $k, 5 * $k)
  $geo = [System.Windows.Media.Geometry]::Parse($arrows).Clone()
  $tg = New-Object System.Windows.Media.TransformGroup
  $tg.Children.Add((New-Object System.Windows.Media.TranslateTransform -12, -10))
  $tg.Children.Add((New-Object System.Windows.Media.ScaleTransform 1.3, 1.3))
  $tg.Children.Add((New-Object System.Windows.Media.TranslateTransform 12, 12))
  $tg.Children.Add((New-Object System.Windows.Media.ScaleTransform $k, $k))
  $tg.Children.Add((New-Object System.Windows.Media.TranslateTransform $x, $y))
  $geo.Transform = $tg
  $pen = New-Object System.Windows.Media.Pen ([System.Windows.Media.Brushes]::White), (0.5 * 1.3 * $k)
  $pen.LineJoin = 'Round'
  $ctx.DrawGeometry([System.Windows.Media.Brushes]::White, $pen, $geo)
}

function Draw-Text($ctx, $text, $size, $weight, $brush, $centerX, $y) {
  $typeface = New-Object System.Windows.Media.Typeface (New-Object System.Windows.Media.FontFamily 'Segoe UI'), 'Normal', $weight, 'Normal'
  $ft = New-Object System.Windows.Media.FormattedText $text, ([System.Globalization.CultureInfo]::InvariantCulture), 'LeftToRight', $typeface, $size, $brush, 1.0
  $ctx.DrawText($ft, (New-Object System.Windows.Point ($centerX - $ft.WidthIncludingTrailingWhitespace / 2), $y))
}

$w = 440; $h = 280
$visual = New-Object System.Windows.Media.DrawingVisual
$ctx = $visual.RenderOpen()
$ctx.DrawRectangle((Brush 15 15 15), $null, (New-Object System.Windows.Rect 0, 0, $w, $h))
Draw-Icon $ctx (($w - 88) / 2) 34 88
Draw-Text $ctx 'Absolute Cinema Mode' 32 ([System.Windows.FontWeights]::Bold) ([System.Windows.Media.Brushes]::White) ($w / 2) 140
Draw-Text $ctx 'for YouTube' 20 ([System.Windows.FontWeights]::Normal) (Brush 170 170 170) ($w / 2) 188
$ctx.Close()
Save-Png $visual $w $h (Join-Path $outDir 'promo-small.png')
