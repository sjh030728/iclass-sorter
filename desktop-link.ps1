# I-class 강의자료 자동 분류 - 저장 폴더 연결 (선택 사항)
# 다운로드\I-class 폴더를 원하는 폴더(기본: 바탕화면\인하대학교)로 연결합니다.
# 실행하지 않으면 파일은 다운로드\I-class\<과목명> 에 저장돼요.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

$desktop = [Environment]::GetFolderPath('Desktop')
$default = Join-Path $desktop '인하대학교'
$downloads = (New-Object -ComObject Shell.Application).Namespace('shell:Downloads').Self.Path
$link = Join-Path $downloads 'I-class'

$current = $null
if (Test-Path $link) {
  $item = Get-Item $link -Force
  if ($item.LinkType -eq 'Junction') { $current = @($item.Target)[0] }
}

# 폴더 선택 창: 이미 연결돼 있으면 그 폴더, 아니면 바탕화면\인하대학교를 미리 골라 둠
$createdDefault = $false
$start = $current
if (-not $start) {
  if (-not (Test-Path $default)) {
    New-Item -ItemType Directory -Path $default | Out-Null
    $createdDefault = $true
  }
  $start = $default
}

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "I-class 강의자료를 저장할 폴더를 고르세요. 그대로 확인을 누르면 선택된 폴더를 써요."
$dialog.SelectedPath = $start
$dialog.ShowNewFolderButton = $true
$owner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true }
$result = $dialog.ShowDialog($owner)
$owner.Dispose()

# 미리 만든 바탕화면\인하대학교를 안 쓰게 됐고 비어 있으면 지움
function Remove-UnusedDefault($chosen) {
  if ($createdDefault -and $chosen -ne $default -and -not (Get-ChildItem -Force $default)) {
    Remove-Item $default
  }
}

if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
  Remove-UnusedDefault $null
  Write-Host "취소했어요. 아무것도 바꾸지 않았어요."
  exit 0
}

$base = $dialog.SelectedPath.TrimEnd('\')
Remove-UnusedDefault $base

if ($base -eq $link -or $base.StartsWith("$link\")) {
  Write-Host "[주의] 다운로드\I-class 자신이나 그 안의 폴더는 고를 수 없어요. 다시 실행해 주세요."
  exit 1
}

Write-Host "연결할 위치: $link  ->  $base"
Write-Host ""

if ($current) {
  if ($current.TrimEnd('\') -eq $base) {
    Write-Host "이미 이 폴더로 연결되어 있어요."
    exit 0
  }
  # 연결만 지움 (Remove-Item은 정션 안의 실제 파일까지 지울 수 있어서 쓰지 않음)
  [System.IO.Directory]::Delete($link)
  Write-Host "기존 연결($current)을 바꿉니다. 그 폴더에 받은 파일은 그대로 남아 있어요."
} elseif (Test-Path $link) {
  # 이미 받은 파일이 있으면 새 폴더로 옮긴 뒤 연결
  Write-Host "기존 다운로드\I-class 폴더의 파일을 $base 로 옮깁니다..."
  Get-ChildItem -Force $link | ForEach-Object {
    Move-Item -Path $_.FullName -Destination $base -Force
  }
  Remove-Item $link -Force
}

New-Item -ItemType Junction -Path $link -Target $base | Out-Null
Write-Host "연결 완료! 이제 I-class 파일이 $base\<과목명> 에 저장돼요."
Write-Host "크롬 설정의 다운로드 위치가 '$downloads' 인지 확인해 주세요."
