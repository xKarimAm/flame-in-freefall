# Opens the deck in PowerPoint (read-only, no window) and exports every slide as PNG.
# A file PowerPoint has to repair fails to open here, so this is also the file check.
param([string]$Deck, [string]$OutDir)
New-Item -ItemType Directory -Force $OutDir | Out-Null
Get-ChildItem $OutDir -Filter 'slide-*.png' | Remove-Item -Confirm:$false
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($Deck, $true, $false, $false)   # ReadOnly, Untitled, WithWindow
  "slides: $($pres.Slides.Count)"
  foreach ($s in $pres.Slides) {
    $s.Export((Join-Path $OutDir ("slide-{0}.png" -f $s.SlideIndex)), 'PNG', 1600, 900)
    $notes = $s.NotesPage.Shapes | Where-Object { $_.HasTextFrame -and $_.PlaceholderFormat.Type -eq 2 } | ForEach-Object { $_.TextFrame.TextRange.Text.Length }
    "slide $($s.SlideIndex): notes chars $notes"
  }
  $pres.Close()
} finally { $app.Quit() }
