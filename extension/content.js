// I-class 페이지에서 "지금 어떤 과목 페이지인지(과목 번호·코드·이름)"와
// "이 페이지에 있는 파일 링크"를 백그라운드에 알려 줍니다.

// coursesIn은 common.js (manifest에서 먼저 불러옴)

// 과목 찾기: 상단 경로/제목 영역 순으로, 과목이 딱 하나만 보일 때만 인정
// (대시보드처럼 여러 과목이 보이는 곳은 무시. 실제 I-class에서는 .coursename / h1에서 찾음)
function detectCourse() {
  const candidates = [];
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
  const m = document.body.className.match(/\bcourse-(\d+)\b/);
  return m && m[1] !== "1" ? m[1] : null;
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
    } catch (_) {}
  });
  return [...urls];
}

// 확장을 새로고침·업데이트하면 이미 열린 탭의 이 스크립트는 확장과 끊긴 채 남는다.
// 그때 sendMessage는 Promise 대신 "Extension context invalidated" 예외를 바로 던지므로
// try로 잡고, 끊겼으면 리스너를 모두 떼고 조용히 멈춘다. (새로고침한 탭에는 새 스크립트가 들어감)
function send(msg) {
  try {
    chrome.runtime.sendMessage(msg).catch(() => {});
  } catch (_) {
    stop();
  }
}

function report() {
  const courseId = detectCourseId();
  if (!courseId) return;
  send({
    type: "page",
    courseId,
    course: detectCourse(),
    links: collectLinks()
  });
}

// 클릭한 순간의 과목을 기록 (다운로드 직전 신호)
function onMouseDown(e) {
  const a = e.target.closest("a[href]");
  const courseId = detectCourseId();
  if (!a || !courseId) return;
  send({ type: "click", courseId, href: a.href });
}

let timer = null;
const observer = new MutationObserver(() => {
  clearTimeout(timer);
  timer = setTimeout(report, 1000);
});

function stop() {
  document.removeEventListener("mousedown", onMouseDown, true);
  observer.disconnect();
  clearTimeout(timer);
}

document.addEventListener("mousedown", onMouseDown, true);
observer.observe(document.documentElement, { childList: true, subtree: true });
report();
