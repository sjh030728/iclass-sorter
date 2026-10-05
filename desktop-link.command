#!/bin/bash
# I-class 강의자료 자동 분류 - 저장 폴더 연결 (선택 사항, Mac)
# 다운로드/I-class 폴더를 원하는 폴더(기본: 바탕화면/인하대학교)로 연결합니다.
# 실행하지 않으면 파일은 다운로드/I-class/<과목명> 에 저장돼요.

default="$HOME/Desktop/인하대학교"
downloads="$HOME/Downloads"
link="$downloads/I-class"

current=""
if [ -L "$link" ]; then
  current="$(readlink "$link")"
elif [ -e "$link" ] && [ ! -d "$link" ]; then
  echo "[주의] $link 가 폴더가 아니에요. 지우거나 이름을 바꾼 뒤 다시 실행해 주세요."
  exit 1
fi

# 폴더 선택 창: 이미 연결돼 있으면 그 폴더, 아니면 바탕화면/인하대학교를 미리 골라 둠
createdDefault=false
start="$current"
if [ -z "$start" ] || [ ! -d "$start" ]; then
  if [ ! -d "$default" ]; then
    mkdir -p "$default" || exit 1
    createdDefault=true
  fi
  start="$default"
fi

chosen="$(osascript - "$start" 2>/dev/null <<'EOF'
on run argv
  set picked to choose folder with prompt "I-class 강의자료를 저장할 폴더를 고르세요. 그대로 선택을 누르면 미리 골라 둔 폴더를 써요." default location (POSIX file (item 1 of argv))
  return POSIX path of picked
end run
EOF
)"
chosen="${chosen%/}"

# 미리 만든 바탕화면/인하대학교를 안 쓰게 됐고 비어 있으면 지움
if $createdDefault && ! [ "$chosen" -ef "$default" ]; then
  rm -f "$default/.DS_Store"
  rmdir "$default" 2>/dev/null
fi

if [ -z "$chosen" ]; then
  echo "취소했어요. 아무것도 바꾸지 않았어요."
  exit 0
fi

if [ "$chosen" = "$link" ] || [ "${chosen#"$link"/}" != "$chosen" ]; then
  echo "[주의] 다운로드/I-class 자신이나 그 안의 폴더는 고를 수 없어요. 다시 실행해 주세요."
  exit 1
fi

echo "연결할 위치: $link  ->  $chosen"
echo ""

# src 안의 항목을 dst로 옮김. 같은 이름 폴더는 안쪽끼리 합치고, 같은 이름 파일은 옮기지 않고 남김
merge() {
  local src="$1" dst="$2" item name
  for item in "$src"/* "$src"/.[!.]*; do
    [ -e "$item" ] || continue
    name="$(basename "$item")"
    [ "$name" = ".DS_Store" ] && continue
    if [ ! -e "$dst/$name" ]; then
      mv "$item" "$dst/"
    elif [ -d "$item" ] && [ -d "$dst/$name" ] && [ ! -L "$item" ]; then
      merge "$item" "$dst/$name"
      rm -f "$item/.DS_Store"
      rmdir "$item" 2>/dev/null
    fi
  done
}

if [ -n "$current" ]; then
  if [ "$current" -ef "$chosen" ]; then
    echo "이미 이 폴더로 연결되어 있어요."
    exit 0
  fi
  # 링크만 지움 (끝에 / 를 붙이면 링크 안의 실제 파일을 건드릴 수 있어서 붙이지 않음)
  rm "$link" || exit 1
  echo "기존 연결($current)을 바꿉니다. 그 폴더에 받은 파일은 그대로 남아 있어요."
elif [ -d "$link" ]; then
  # 이미 받은 파일이 있으면 새 폴더로 옮긴 뒤 연결
  echo "기존 다운로드/I-class 폴더의 파일을 $chosen 으로 옮깁니다..."
  merge "$link" "$chosen"
  rm -f "$link/.DS_Store"
  if ! rmdir "$link" 2>/dev/null; then
    echo "[주의] 같은 이름의 파일이 있어서 옮기지 못한 파일이 남아 있어요:"
    find "$link" -type f ! -name .DS_Store
    echo "Finder에서 정리한 뒤 다시 실행해 주세요. 연결은 하지 않았어요."
    exit 1
  fi
fi

ln -s "$chosen" "$link" || exit 1
echo "연결 완료! 이제 I-class 파일이 $chosen/<과목명> 에 저장돼요."
echo "크롬 설정의 다운로드 위치가 '$downloads' 인지 확인해 주세요."
