#!/bin/bash
# I-class 강의자료 자동 분류 - 바로가기 만들기 (선택 사항, Mac)
# 파일은 다운로드/I-class/<과목명> 에 저장되고, 원하는 폴더(기본: 바탕화면/인하대학교)
# 안에 그 폴더로 바로 가는 "I-class" 바로가기를 만듭니다.
#
# Windows처럼 다운로드/I-class 자체를 다른 폴더로 연결하면 안 됨: 크롬은 확장이 정한 저장 경로가
# 링크를 따라 다운로드 폴더 밖으로 나가면 파일을 받을 때마다 저장 위치를 물어봄.
# 그래서 다운로드/I-class 는 진짜 폴더로 두고, 바로가기 쪽을 링크로 만든다.

default="$HOME/Desktop/인하대학교"
downloads="$HOME/Downloads"
dir="$downloads/I-class"
name="I-class"

if [ -e "$dir" ] && [ ! -L "$dir" ] && [ ! -d "$dir" ]; then
  echo "[주의] $dir 가 폴더가 아니에요. 지우거나 이름을 바꾼 뒤 다시 실행해 주세요."
  exit 1
fi

# 잠깐 배포됐던 방식(바탕화면/인하대학교 자체가 다운로드/I-class 로 가는 바로가기)이면
# 그 바로가기를 진짜 폴더로 바꿔서, 다른 학교 파일을 넣어도 I-class 자료와 섞이지 않게 함
convertedOld=false
if [ -L "$default" ] && [ "$default" -ef "$dir" ]; then
  rm "$default" || exit 1
  convertedOld=true
fi

# 폴더 선택 창: 바탕화면/인하대학교를 미리 골라 둠
createdDefault=false
if [ ! -d "$default" ]; then
  mkdir -p "$default" || exit 1
  createdDefault=true
fi

chosen="$(osascript - "$default" 2>/dev/null <<'EOF'
on run argv
  set picked to choose folder with prompt "\"I-class\" 바로가기를 넣을 폴더를 고르세요. 그대로 선택을 누르면 미리 골라 둔 폴더에 넣어요." default location (POSIX file (item 1 of argv))
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
  # 지웠던 바로가기는 되돌려 둠
  if $convertedOld && [ ! -e "$default" ]; then
    ln -s "$dir" "$default"
  fi
  echo "취소했어요. 아무것도 바꾸지 않았어요."
  exit 0
fi

case "$chosen/" in
  "$dir/"*)
    echo "[주의] 다운로드/I-class 자신이나 그 안의 폴더는 고를 수 없어요. 다시 실행해 주세요."
    exit 1 ;;
esac

# 예전 방식(다운로드/I-class 가 다른 폴더로 가는 링크)이면 링크를 풀어 진짜 폴더로 되돌림.
# 예전 폴더에는 직접 넣은 다른 파일이 있을 수 있어서 이미 받은 파일은 옮기지 않음
if [ -L "$dir" ]; then
  old="$(readlink "$dir")"
  # 링크만 지움 (끝에 / 를 붙이면 링크 안의 실제 파일을 건드릴 수 있어서 붙이지 않음)
  rm "$dir" || exit 1
  echo "예전 방식의 연결($old)을 풀었어요. 이미 받은 파일은 그 폴더에 그대로 남아 있어요."
fi
mkdir -p "$dir" || exit 1

shortcut="$chosen/$name"
if [ -L "$shortcut" ] && [ "$shortcut" -ef "$dir" ]; then
  echo "이미 $shortcut 바로가기가 있어요."
  exit 0
elif [ -e "$shortcut" ] || [ -L "$shortcut" ]; then
  echo "[주의] $shortcut 이(가) 이미 있어서 바로가기를 만들지 못했어요."
  echo "이름을 바꾸거나 정리한 뒤 다시 실행해 주세요. (파일은 계속 다운로드/I-class 에 저장돼요.)"
  exit 1
fi

ln -s "$dir" "$shortcut" || exit 1
echo "완료! I-class 파일은 다운로드/I-class/<과목명> 에 저장되고,"
echo "$shortcut 을(를) 열면 바로 볼 수 있어요."
echo "크롬 설정의 다운로드 위치가 '$downloads' 인지 확인해 주세요."
