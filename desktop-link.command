#!/bin/bash
# I-class 강의자료 자동 분류 - 바탕화면 바로가기 만들기 (선택 사항, Mac)
# 파일은 그대로 다운로드/I-class/<과목명> 에 저장되고,
# 원하는 곳(기본: 바탕화면/인하대학교)에 그 폴더로 가는 바로가기를 만듭니다.
#
# Windows처럼 다운로드/I-class 를 바탕화면 폴더로 연결하면, macOS가 크롬의 바탕화면 쓰기를
# 막아서 크롬이 파일을 받을 때마다 저장 위치를 물어봐요. 그래서 Mac은 방향을 거꾸로 연결해요.

downloads="$HOME/Downloads"
folder="$downloads/I-class"

# src 안의 항목을 dst로 옮김. 같은 이름 폴더는 안쪽끼리 합치고, 같은 이름 파일은 옮기지 않고 남김
merge() {
  local src="$1" dst="$2" item name
  for item in "$src"/* "$src"/.[!.]*; do
    [ -e "$item" ] || [ -L "$item" ] || continue
    name="$(basename "$item")"
    [ "$name" = ".DS_Store" ] && continue
    if [ ! -e "$dst/$name" ] && [ ! -L "$dst/$name" ]; then
      mv "$item" "$dst/"
    elif [ -d "$item" ] && [ -d "$dst/$name" ] && [ ! -L "$item" ]; then
      merge "$item" "$dst/$name"
      rm -f "$item/.DS_Store"
      rmdir "$item" 2>/dev/null
    fi
  done
}

# 예전 방식(다운로드/I-class 가 다른 폴더로 가는 링크)이면 실제 폴더로 되돌림
oldTarget=""
if [ -L "$folder" ]; then
  oldTarget="$(readlink "$folder")"
  echo "예전 연결(다운로드/I-class -> $oldTarget)을 새 방식으로 바꿉니다..."
  # 링크만 지움 (끝에 / 를 붙이면 링크 안의 실제 파일을 건드릴 수 있어서 붙이지 않음)
  rm "$folder" || exit 1
  mkdir "$folder" || exit 1
  if [ -d "$oldTarget" ]; then
    merge "$oldTarget" "$folder"
    rm -f "$oldTarget/.DS_Store"
    if rmdir "$oldTarget" 2>/dev/null; then
      echo "받은 파일을 다운로드/I-class 로 옮겼어요."
    else
      echo "[주의] 옮기지 못한 파일이 $oldTarget 에 남아 있어요 (같은 이름의 파일이 있거나 권한이 없어요):"
      find "$oldTarget" -type f ! -name .DS_Store
    fi
  fi
elif [ -e "$folder" ] && [ ! -d "$folder" ]; then
  echo "[주의] $folder 가 폴더가 아니에요. 지우거나 이름을 바꾼 뒤 다시 실행해 주세요."
  exit 1
fi
mkdir -p "$folder" || exit 1

# 바로가기 위치와 이름 고르기 (기본: 바탕화면/인하대학교, 예전에 연결했던 폴더가 비었으면 그 자리)
startDir="$HOME/Desktop"
startName="인하대학교"
if [ -n "$oldTarget" ] && [ ! -e "$oldTarget" ] && [ -d "$(dirname "$oldTarget")" ]; then
  startDir="$(dirname "$oldTarget")"
  startName="$(basename "$oldTarget")"
fi

chosen="$(osascript - "$startDir" "$startName" 2>/dev/null <<'EOF'
on run argv
  set picked to choose file name with prompt "I-class 폴더 바로가기를 만들 위치와 이름을 고르세요. 그대로 저장을 누르면 바탕화면에 만들어요." default name (item 2 of argv) default location (POSIX file (item 1 of argv))
  return POSIX path of picked
end run
EOF
)"
chosen="${chosen%/}"

if [ -z "$chosen" ]; then
  echo "취소했어요. 바로가기는 만들지 않았어요. 파일은 다운로드/I-class 에 저장돼요."
  exit 0
fi

if [ "$chosen" = "$folder" ] || [ "${chosen#"$folder"/}" != "$chosen" ]; then
  echo "[주의] 다운로드/I-class 자신이나 그 안에는 만들 수 없어요. 다시 실행해 주세요."
  exit 1
fi

# 고른 이름이 이미 있으면: 링크는 바꾸고, 폴더는 안의 파일을 다운로드/I-class 로 옮긴 뒤 바꿈
if [ -L "$chosen" ]; then
  rm "$chosen" || exit 1
elif [ -d "$chosen" ]; then
  echo "$chosen 안의 파일을 다운로드/I-class 로 옮깁니다..."
  merge "$chosen" "$folder"
  rm -f "$chosen/.DS_Store"
  if ! rmdir "$chosen" 2>/dev/null; then
    echo "[주의] 같은 이름의 파일이 있어서 옮기지 못한 파일이 남아 있어요:"
    find "$chosen" -type f ! -name .DS_Store
    echo "Finder에서 정리한 뒤 다시 실행해 주세요. 바로가기는 만들지 않았어요."
    exit 1
  fi
elif [ -e "$chosen" ]; then
  echo "[주의] $chosen 에 같은 이름의 파일이 있어요. 다른 이름으로 다시 실행해 주세요."
  exit 1
fi

ln -s "$folder" "$chosen" || exit 1
echo "완료! I-class 파일은 다운로드/I-class/<과목명> 에 저장되고,"
echo "$chosen 바로가기로 바로 열 수 있어요."
echo "크롬 설정의 다운로드 위치가 '$downloads' 인지 확인해 주세요."
