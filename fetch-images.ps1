<#
  Downloads photos of the Mandil fleet from Wikimedia Commons into .\images
  Run once:   powershell -ExecutionPolicy Bypass -File .\fetch-images.ps1

  Filenames are resolved live through the Commons API, so nothing is guessed.
  Credits for every image are written to images\CREDITS.md.
#>

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$UA = @{ 'User-Agent' = 'MandilRentACar-ImageFetch/1.0 (contact: auxthdg.ai@gmail.com)' }

# slug -> the file the site expects; q -> Commons search; must -> tokens required in the filename
$cars = @(
  @{ slug='lexus-lx570';      q='Lexus LX 570 J200';            must=@('lexus') },
  @{ slug='byd-atto3';        q='BYD Atto 3';                   must=@('byd')   },
  @{ slug='tank-300';         q='GWM Tank 300';                 must=@('tank')  },
  @{ slug='landcruiser-v8zx'; q='Toyota Land Cruiser J200 V8';  must=@('cruiser') },
  @{ slug='prado';            q='Toyota Land Cruiser Prado J150'; must=@('prado') },
  @{ slug='revo';             q='Toyota Hilux Revo double cab'; must=@('hilux') },
  @{ slug='fortuner';         q='Toyota Fortuner';              must=@('fortuner') },
  @{ slug='civic';            q='Honda Civic sedan 2022';       must=@('civic') },
  @{ slug='grande-altis';     q='Toyota Corolla Altis sedan';   must=@('corolla') },
  @{ slug='alto';             q='Suzuki Alto HA36';             must=@('alto')  }
)

$outDir = Join-Path $PSScriptRoot 'images'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

function Strip-Html([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return 'Unknown' }
  return ((($s -replace '<[^>]+>', '') -replace '\s+', ' ').Trim())
}

$credits = @()
$ok = 0

foreach ($car in $cars) {
  Write-Host ("-> {0,-18} searching: {1}" -f $car.slug, $car.q)

  $api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json' +
         '&generator=search&gsrnamespace=6&gsrlimit=40&gsrsearch=' +
         [uri]::EscapeDataString($car.q) +
         '&prop=imageinfo&iiprop=url|size|mime|extmetadata'

  try { $resp = Invoke-RestMethod -Uri $api -Headers $UA -TimeoutSec 45 }
  catch { Write-Warning ("   API failed: {0}" -f $_.Exception.Message); continue }

  if (-not $resp.query) { Write-Warning '   no results'; continue }

  $best = $null
  foreach ($p in $resp.query.pages.PSObject.Properties.Value | Sort-Object index) {
    $ii = $p.imageinfo[0]
    if (-not $ii) { continue }
    if ($ii.mime -ne 'image/jpeg') { continue }          # skip svg/png diagrams
    if ($ii.width -lt 1200) { continue }                 # need print-ish quality
    if ($ii.width -lt $ii.height) { continue }           # landscape only, cards are 16:9-ish
    $lower = $p.title.ToLower()
    $hit = $true
    foreach ($tok in $car.must) { if ($lower -notlike "*$tok*") { $hit = $false } }
    if (-not $hit) { continue }
    if ($lower -like '*interior*' -or $lower -like '*engine*' -or $lower -like '*dashboard*') { continue }
    $best = $p; break
  }

  if (-not $best) { Write-Warning ("   no suitable photo for {0}" -f $car.slug); continue }

  $file = $best.title -replace '^File:', ''
  $url  = 'https://commons.wikimedia.org/wiki/Special:FilePath/' +
          [uri]::EscapeDataString($file) + '?width=1400'
  $dest = Join-Path $outDir ($car.slug + '.jpg')

  try {
    Invoke-WebRequest -Uri $url -Headers $UA -OutFile $dest -TimeoutSec 90
    $size = [math]::Round((Get-Item $dest).Length / 1KB)
    Write-Host ("   saved {0}.jpg ({1} KB)" -f $car.slug, $size) -ForegroundColor Green
    $ok++
  } catch {
    Write-Warning ("   download failed: {0}" -f $_.Exception.Message); continue
  }

  $meta   = $best.imageinfo[0].extmetadata
  $artist = 'Unknown'; $lic = 'see Commons'
  if ($meta.Artist)           { $artist = Strip-Html $meta.Artist.value }
  if ($meta.LicenseShortName) { $lic    = Strip-Html $meta.LicenseShortName.value }

  $credits += [pscustomobject]@{
    Slug = $car.slug; File = $file; Artist = $artist; License = $lic
    Page = 'https://commons.wikimedia.org/wiki/' + [uri]::EscapeDataString($best.title)
  }
}

$md = @("# Image credits", "",
        "Fleet photos from Wikimedia Commons. Keep this attribution on the site.", "")
foreach ($c in $credits) {
  $md += ("- **{0}.jpg** - {1} by {2}, {3}. <{4}>" -f $c.Slug, $c.File, $c.Artist, $c.License, $c.Page)
}
$md -join "`r`n" | Out-File -FilePath (Join-Path $outDir 'CREDITS.md') -Encoding utf8

Write-Host ""
Write-Host ("Done: {0}/{1} images in {2}" -f $ok, $cars.Count, $outDir) -ForegroundColor Cyan
Write-Host "Credits written to images\CREDITS.md"
if ($ok -lt $cars.Count) { Write-Host "Any that failed still show 'photo coming soon' - tell Claude which ones." }
