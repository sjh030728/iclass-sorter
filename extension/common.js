// background.js, content.js, options.js가 같이 쓰는 규칙. tests/common.test.js에서도 불러 씀.

// 텍스트에 보이는 과목들 (과목 코드별로 하나씩)
// 예: "이산구조[202602-CSE1312-002]", 분반에 영문자가 섞이기도 함: "커리어 디자인 1[202601-GEB1117-Y04]"
// 계절학기는 학기 자리가 "2026하계", "2025동계": "동화의이해[2026하계-GEE1006-901]"
// 합반 과목은 분반 뒤에 "~분반"이 더 붙음: "데이터베이스[202602-DSC2002-001~001]", "회계원론[202602-CBA1906-005~004]"
// 분반 뒤는 쓰지 않으니 "]" 앞까지 무엇이 와도 받음
function coursesIn(text) {
  const found = new Map();
  for (const m of text.matchAll(/([^\[\]\n]*?)\s*\[(\d{4}(?:\d{2}|하계|동계))-([A-Z]{2,4}\d{4})-[A-Z\d]{3}[^\]\n]*\]/g)) {
    const name = m[1].replace(/^\s*(강좌|과목|Course)\s*[:：]\s*/i, "").trim();
    if (!found.has(m[3]) || (!found.get(m[3]).name && name)) {
      found.set(m[3], { code: m[3], semester: m[2], name });
    }
  }
  return [...found.values()];
}

// Windows/Mac에서 폴더 이름으로 쓸 수 없는 문자 정리
function safeName(name) {
  return name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 80);
}

// 학기 코드 뒷부분과 이름. 배열 순서가 한 해 안의 순서
const TERMS = [["01", "1학기"], ["하계", "여름학기"], ["02", "2학기"], ["동계", "겨울학기"]];

function semesterLabel(sem) {
  const y = sem.slice(0, 4), t = sem.slice(4);
  const term = TERMS.find(([code]) => code === t);
  return term ? `${y}년 ${term[1]}` : `${y}-${t}`;
}

// 학기 정렬용 숫자 (클수록 최근)
function semesterOrder(sem) {
  return sem.slice(0, 4) * 10 + TERMS.findIndex(([code]) => code === sem.slice(4));
}
