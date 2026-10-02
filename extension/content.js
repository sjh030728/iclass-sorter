// I-class 페이지에서 "지금 어떤 과목 페이지인지(과목 번호·코드·이름)"와
// "이 페이지에 있는 파일 링크"를 백그라운드에 알려 줍니다.

// 예: "이산구조[202602-CSE1312-002]"
const COURSE_RE = /([^\[\]\n]*?)\s*\[(\d{6})-([A-Z]{2,4}\d{4})-\d{3}\]/g;

function coursesIn(text) {
  if (!text) return [];
  const found = new Map();
  for (const m of text.matchAll(COURSE_RE)) {
    let name = m[1].replace(/^\s*(강좌|과목|Course)\s*[:：]\s*/i, "").trim();
    if (!found.has(m[3]) || (!found.get(m[3]).name && name)) {
      found.set(m[3], { code: m[3], semester: m[2], name });
    }
  }
  return [...found.values()];
}

// 과목 찾기: 탭 제목 → 상단 경로/제목 영역 순으로, 과목이 딱 하나만 보일 때만 인정
// (I-class 탭 제목은 항상 "인하대학교 I-Class"라서 실제로는 .coursename / h1에서 찾음)
function detectCourse() {
  const candidates = [document.title];
  const selectors = [
    ".breadcrumb", "nav[aria-label]", ".page-header-headings",
    ".coursename", ".course-title", "#page-header", "h1", "h2"
  ];
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => candidates.push(el.textContent));
  }
  for (const text of candidates) {
    const cs = coursesIn(text);
    if (cs.length === 1) return cs[0];
  }
  // 비교과처럼 과목 코드가 없는 강좌: 강좌 제목(.coursename)을 이름으로 사용
  const titles = [...document.querySelectorAll(".coursename")]
    .map((el) => el.textContent.trim()).filter(Boolean);
  if (titles.length === 1) return { code: "", semester: "", name: titles[0] };
  return null;
}

// Moodle은 과목 안의 모든 페이지 <body>에 "course-<번호>" 클래스를 붙입니다. (1번은 메인/대시보드)
function detectCourseId() {
  const m = (document.body?.className || "").match(/\bcourse-(\d+)\b/);
  if (m && m[1] !== "1") return m[1];
  const u = new URL(location.href);
  if (u.pathname.includes("/course/view.php")) return u.searchParams.get("id");
  return null;
}

function collectLinks() {
  const urls = new Set([location.href]);
  document.querySelectorAll("a[href], iframe[src], embed[src], object[data]").forEach((el) => {
    const raw = el.getAttribute("href") || el.getAttribute("src") || el.getAttribute("data");
    try {
      const u = new URL(raw, location.href);
      if (u.hostname === "learn.inha.ac.kr" &&
          (u.pathname.includes("/mod/") || u.pathname.includes("pluginfile.php"))) {
        urls.add(u.href);
      }
    } catch (_) { /* 무시 */ }
  });
  return [...urls];
}

function report() {
  const courseId = detectCourseId();
  if (!courseId) return;
  chrome.runtime.sendMessage({
    type: "page",
    courseId,
    course: detectCourse(),
    links: collectLinks()
  }).catch(() => {});
}

// 클릭한 순간의 과목을 기록 (다운로드 직전 신호)
document.addEventListener("mousedown", (e) => {
  const a = e.target.closest?.("a[href]");
  const courseId = detectCourseId();
  if (!a || !courseId) return;
  chrome.runtime.sendMessage({ type: "click", courseId, href: a.href }).catch(() => {});
}, true);

report();
let timer = null;
new MutationObserver(() => {
  clearTimeout(timer);
  timer = setTimeout(report, 1000);
}).observe(document.documentElement, { childList: true, subtree: true });
