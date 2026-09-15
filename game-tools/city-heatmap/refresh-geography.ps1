$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$geo = Get-Content -Raw (Join-Path $root 'src/assets/china-provinces.json') | ConvertFrom-Json
$target = Join-Path $root 'public/assets/city-heatmap/regions'
New-Item -ItemType Directory -Force -Path $target | Out-Null
$index = @()
foreach ($feature in $geo.features) {
  $p = $feature.properties
  if (-not $p.name) { continue }
  $url = "https://geo.datav.aliyun.com/areas_v3/bound/$($p.adcode)_full.json"
  $entry = [ordered]@{ code=$p.adcode; name=$p.name; center=$p.center; source=$url; status='unavailable'; children=@() }
  try {
    $data = Invoke-RestMethod -Uri $url -TimeoutSec 30
    $children = @($data.features | Where-Object { $_.properties.name })
    if ($children.Count -gt 0) {
      $entry.status='available'
      $entry.children = @($children | ForEach-Object {
        $c=$_.properties
        $location=if($c.center){$c.center}else{$c.centroid}
        [ordered]@{ code=$c.adcode; name=$c.name; level=$c.level; center=$location }
      })
      $collection = @{type='FeatureCollection';features=@($children | ForEach-Object {
        @{type='Feature';properties=@{code=$_.properties.adcode;name=$_.properties.name};geometry=$_.geometry}
      })}
      [IO.File]::WriteAllText((Join-Path $target "$($p.adcode).json"), ($collection|ConvertTo-Json -Depth 100 -Compress), [Text.UTF8Encoding]::new($false))
    }
  } catch { Write-Host "Unavailable: $($p.name): $($_.Exception.Message)" }
  $index += $entry
  Write-Host "$($p.name): $($entry.children.Count)"
}
[IO.File]::WriteAllText((Join-Path $root 'src/assets/city-regions.json'), ($index|ConvertTo-Json -Depth 15 -Compress), [Text.UTF8Encoding]::new($false))
Write-Host "Regions: $($index.Count); children: $(($index | ForEach-Object {$_.children.Count} | Measure-Object -Sum).Sum)"
