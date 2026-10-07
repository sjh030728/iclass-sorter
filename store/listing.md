# Chrome 웹 스토어 등록 정보

개발자 대시보드(https://chrome.google.com/webstore/devconsole)에 붙여넣을 내용.
업로드 파일: `git archive -o ../iclass-sorter-store.zip HEAD:extension` (manifest.json이 zip 최상위)

---

## 스토어 등록정보 (Store listing)

**이름 / 짧은 설명**: manifest.json에서 자동으로 채워짐

**언어**: 한국어

**카테고리**: 생산성 › Workflow & Planning

**자세한 설명**:

```
인하대 I-class에서 받은 강의자료를 과목별 폴더에 자동으로 저장해 주는 확장 프로그램입니다. (비공식)

다운로드할 때마다 폴더를 고르거나, 다운로드 폴더에 쌓인 파일을 일일이 정리할 필요가 없어요.
I-class 과목 페이지에서 파일을 받으면 다운로드\I-class\<과목명> 폴더에 바로 들어갑니다.

■ 이런 기능이 있어요
· 과목명을 I-class 페이지에서 자동으로 읽어 폴더를 만듭니다. 과목 목록을 따로 입력할 필요가 없어요.
· 강의실에서 바로 받는 파일과 문서 뷰어에서 받는 파일 모두 분류합니다.
· 비교과 강좌도 강좌 이름으로 폴더를 만듭니다.
· 학기별 폴더로 나누기 (예: I-class\2026년 2학기\이산구조)
· 과목별 폴더 이름 바꾸기 (예: "객체지향프로그래밍 2" → "객프")

■ 사용 방법
1. 설치 후 I-class에서 수강 중인 과목 페이지에 한 번씩 들어가 주세요. 들어간 과목부터 인식됩니다.
2. 이후 강의자료를 받으면 과목 폴더에 자동으로 저장됩니다.
3. 툴바의 확장 아이콘을 누르면 설정 페이지가 열립니다.

■ 개인정보
· 어떤 정보도 외부로 보내지 않습니다. 과목 정보와 설정은 브라우저 안에만 저장됩니다.
· learn.inha.ac.kr 에서만 동작하고, 다른 사이트의 다운로드는 건드리지 않습니다.

※ 인하대학교의 공식 프로그램이 아닙니다.
```

**스크린샷** (1280×800): `store/screenshots/` 순서대로 업로드
1. `1-folders.png` — 과목별 폴더에 저장된 모습 (그림으로 구성)
2. `2-settings.png` — 실제 `extension/options.html`을 `src/shim.js`의 예시 과목 데이터로 렌더링

다시 만들 때: `store/screenshots/src/shot1.html`, `shot2.html`을 크롬 headless로 1280×800 촬영
(`chrome --headless=new --user-data-dir=<빈 임시 폴더> --allow-file-access-from-files --hide-scrollbars --window-size=1280,800 --screenshot=out.png <html 경로>`).
shot2는 확장 폴더의 파일을 직접 읽으므로 설정 페이지를 고치면 다시 찍기만 하면 된다. 설정 페이지 길이가 바뀌면 shot2.html의 iframe 높이(672px)를 맞출 것.

**아이콘**: extension/icons/128.png

---

## 개인정보 보호 관행 (Privacy practices)

**단일 목적 (Single purpose)**:

```
인하대학교 I-class(learn.inha.ac.kr)에서 다운로드한 파일을, 그 파일을 받은 과목의 이름으로 된 폴더에 자동으로 저장합니다.
```

**권한 사용 이유 (Permission justification)**:

- `downloads`
  ```
  I-class에서 시작된 다운로드의 저장 경로를 과목별 폴더(다운로드\I-class\<과목명>)로 지정하기 위해 chrome.downloads.onDeterminingFilename을 사용합니다. 다른 사이트의 다운로드는 변경하지 않습니다.
  ```
- `storage`
  ```
  과목 번호와 과목명의 대응, I-class 페이지의 강의자료 링크와 과목의 대응, 사용자 설정(학기별 폴더, 폴더 이름)을 브라우저 저장소에 보관하기 위해 사용합니다. 외부로 전송하지 않습니다.
  ```
- 호스트 권한 `https://learn.inha.ac.kr/*`
  ```
  I-class 과목 페이지에서 과목명과 강의자료 링크를 읽어, 다운로드된 파일이 어느 과목의 자료인지 판단하기 위해 사용합니다. 이 사이트 외에는 접근하지 않습니다.
  ```

**원격 코드 사용 (Remote code)**: 아니요, 원격 코드를 사용하지 않습니다.

**데이터 사용 (Data usage)**: 수집하는 항목 없음 — 모든 체크박스 비움
(정보를 기기 밖으로 보내지 않으므로 "수집"에 해당하지 않음)

**인증 3개 체크** (모두 해당):
- 승인된 사용 사례 외의 목적으로 사용자 데이터를 판매하거나 제3자에게 전송하지 않음
- 단일 목적과 관련 없는 목적으로 사용자 데이터를 사용하거나 전송하지 않음
- 신용도 판단이나 대출 목적으로 사용자 데이터를 사용하거나 전송하지 않음

**개인정보처리방침 URL**: https://github.com/sjh030728/iclass-sorter/blob/main/PRIVACY.md

---

## 배포 (Distribution)

- 공개 범위: **링크가 있는 사용자만 (Unlisted)**
- 지역: 모든 지역 (또는 대한민국만)
- 판매자(trader) 여부: 판매자 아님
