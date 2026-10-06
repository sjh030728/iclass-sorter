#!/bin/bash
# I-class 강의자료 자동 분류 - 바탕화면 바로가기 만들기 (선택 사항, Mac)
# 파일은 다운로드/I-class/<과목명> 에 저장되고, 원하는 폴더(기본: 바탕화면)에
# 그 폴더로 바로 가는 "인하대학교" 바로가기를 만듭니다.
#
# Windows처럼 다운로드/I-class 자체를 다른 폴더로 연결하면 안 됨: 크롬은 확장이 정한 저장 경로가
# 링크를 따라 다운로드 폴더 밖으로 나가면 파일을 받을 때마다 저장 위치를 물어봄.
# 그래서 다운로드/I-class 는 진짜 폴더로 두고, 바로가기 쪽을 링크로 만든다.

downloads="$HOME/Downloads"
dir="$downloads/I-class"
name="인하대학교"

if [ -e "$dir" ] && [ ! -L "$dir" ] && [ ! -d "$dir" ]; then
  echo "[주의] $dir 가 폴더가 아니에요. 지우거나 이름을 바꾼 뒤 다시 실행해 주세요."
  exit 1
fi

chosen="$(osascript - "$HOME/Desktop" 2>/dev/null <<'EOF'
on run argv
  set picked to choose folder with prompt "\"인하대학교\" 바로가기를 둘 폴더를 고르세요. 그대로 선택을 누르면 바탕화면에 만들어요." default location (POSIX file (item 1 of argv))
  return POSIX path of picked
end run
EOF
)"
chosen="${chosen%/}"

if [ -z "$chosen" ]; then
  echo "취소했어요. 아무것도 바꾸지 않았어요."
  exit 0
fi

case "$chosen/" in
  "$dir/"*)
    echo "[주의] 다운로드/I-class 자신이나 그 안의 폴더는 고를 수 없어요. 다시 실행해 주세요."
    exit 1 ;;
esac

shortcut="$chosen/$name"

# 예전 방식(다운로드/I-class 가 다른 폴더로 가는 링크)이면 링크를 풀어 진짜 폴더로 되돌림.
# 바로가기가 놓일 자리가 바로 그 예전 폴더(기본: 바탕화면/인하대학교)면 폴더째 옮겨서 바로가기로 바꿈.
# 그 밖의 폴더는 바탕화면 전체처럼 다른 파일이 섞여 있을 수 있어서 건드리지 않음
if [ -L "$dir" ]; then
  old="$(readlink "$dir")"
  # 링크만 지움 (끝에 / 를 붙이면 링크 안의 실제 파일을 건드릴 수 있어서 붙이지 않음)
  rm "$dir" || exit 1
  echo "예전 방식의 연결($old)을 풀었어요."
  if [ -d "$old" ] && [ ! -L "$shortcut" ] && [ "$old" -ef "$shortcut" ]; then
    echo "$old 를 다운로드/I-class 로 옮기고 그 자리에 바로가기를 만듭니다..."
    mv "$old" "$dir" || exit 1
  else
    mkdir "$dir" || exit 1
    [ -d "$old" ] && echo "이미 받은 파일은 $old 에 그대로 남아 있어요."
  fi
else
  mkdir -p "$dir" || exit 1
fi

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
