// 실행 (저장소 루트에서): node --test
// extension/common.js는 확장용 일반 스크립트라서 export가 없음 → 소스를 읽어 함수만 꺼냄
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const src = fs.readFileSync(path.join(__dirname, "../extension/common.js"), "utf8");
const { coursesIn, safeName, semesterLabel } =
  new Function(src + "\nreturn { coursesIn, safeName, semesterLabel };")();

test("과목 페이지 제목에서 과목 하나", () => {
  assert.deepEqual(coursesIn("이산구조[202602-CSE1312-002]"),
    [{ code: "CSE1312", semester: "202602", name: "이산구조" }]);
});

test("이름에 콜론·숫자가 있는 과목", () => {
  assert.deepEqual(coursesIn("의사소통 영어: 중급[202602-GEB1108-015]"),
    [{ code: "GEB1108", semester: "202602", name: "의사소통 영어: 중급" }]);
  assert.deepEqual(coursesIn("크로스오버 3 : 사회의 탐색[202602-GEB1114-010]")[0].name,
    "크로스오버 3 : 사회의 탐색");
});

test("분반에 영문자가 섞인 과목 (1.0.3에서 비교과로 잘못 잡힘)", () => {
  assert.deepEqual(coursesIn("커리어 디자인 1[202601-GEB1117-Y04]"),
    [{ code: "GEB1117", semester: "202601", name: "커리어 디자인 1" }]);
  assert.equal(coursesIn("문해와 글쓰기[202601-GEB1126-Y07]")[0].code, "GEB1126");
});

test("앞에 붙은 '강좌:' 같은 머리말은 뺌", () => {
  assert.equal(coursesIn("강좌: 논리회로[202602-CSE2211-004]")[0].name, "논리회로");
});

test("대시보드처럼 여러 과목이 보이면 전부 돌려줌 (호출하는 쪽이 무시)", () => {
  const text = "이산구조[202602-CSE1312-002]\n논리회로[202602-CSE2211-004]";
  assert.equal(coursesIn(text).length, 2);
});

test("같은 과목이 여러 번 나오면 하나, 이름 있는 쪽 사용", () => {
  const text = "[202602-CSE1312-002]\n이산구조[202602-CSE1312-002]";
  assert.deepEqual(coursesIn(text), [{ code: "CSE1312", semester: "202602", name: "이산구조" }]);
});

test("과목 코드가 없는 텍스트", () => {
  assert.deepEqual(coursesIn("인하동동 비교과 프로그램"), []);
  assert.deepEqual(coursesIn(""), []);
});

test("폴더명에 못 쓰는 문자 정리", () => {
  assert.equal(safeName("의사소통 영어: 중급"), "의사소통 영어 중급");
  assert.equal(safeName('a\\b/c*d?e"f<g>h|i'), "a b c d e f g h i");
  assert.equal(safeName("끝에 점..."), "끝에 점");
  assert.equal(safeName("가".repeat(100)).length, 80);
});

test("학기 표시", () => {
  assert.equal(semesterLabel("202601"), "2026년 1학기");
  assert.equal(semesterLabel("202602"), "2026년 2학기");
  assert.equal(semesterLabel("202603"), "2026-03");
});
