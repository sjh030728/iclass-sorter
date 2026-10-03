// background.js, content.js, options.js가 같이 쓰는 규칙. tests/common.test.js에서도 불러 씀.

// 텍스트에 보이는 과목들 (과목 코드별로 하나씩)
// 예: "이산구조[202602-CSE1312-002]", 분반에 영문자가 섞이기도 함: "커리어 디자인 1[202601-GEB1117-Y04]"
function coursesIn(text) {
  const found = new Map();
  for (const m of text.matchAll(/([^\[\]\n]*?)\s*\[(\d{6})-([A-Z]{2,4}\d{4})-[A-Z\d]{3}\]/g)) {
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

function semesterLabel(sem) {
  const y = sem.slice(0, 4), t = sem.slice(4);
  if (t === "01") return `${y}년 1학기`;
  if (t === "02") return `${y}년 2학기`;
  return `${y}-${t}`;
}
