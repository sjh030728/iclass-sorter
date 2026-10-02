// I-class 강의자료 자동 분류 (배포용)
// 과목 페이지에서 읽은 과목명으로 폴더를 만들어 저장합니다. 과목 목록을 따로 적을 필요가 없어요.

const ROOT = "I-class";          // 다운로드 폴더 안의 하위 폴더
const UNSORTED = "미분류";        // 과목을 못 알아냈을 때
const CLICK_WINDOW_MS = 60 * 1000;
const MAX_LINKS = 5000;

let cache = null;
async function state() {
  if (!cache) {
    const s = await chrome.storage.session.get(["links", "tabs", "lastClick"]);
    const l = await chrome.storage.local.get(["courses"]);
    cache = {
      links: s.links || {},
      tabs: s.tabs || {},
      lastClick: s.lastClick || null,
      courses: l.courses || {}   // courseId -> { code, semester, name }
    };
  }
  return cache;
}
async function save() {
  const { links, tabs, lastClick, courses } = cache;
  await chrome.storage.session.set({ links, tabs, lastClick });
  await chrome.storage.local.set({ courses });
}

function norm(url) {
  try {
    const u = new URL(url);
    let key = u.origin + u.pathname;
    const id = u.searchParams.get("id");
    if (id) key += "?id=" + id;
    return key;
  } catch (_) {
    return url;
  }
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

chrome.runtime.onMessage.addListener((msg, sender) => {
  (async () => {
    const st = await state();
    if (msg.type === "page") {
      if (msg.course) {
        const prev = st.courses[msg.courseId] || {};
        st.courses[msg.courseId] = {
          code: msg.course.code,
          semester: msg.course.semester,
          name: msg.course.name || prev.name || ""
        };
      }
      if (sender.tab) st.tabs[sender.tab.id] = msg.courseId;
      for (const l of msg.links) st.links[norm(l)] = msg.courseId;
      const keys = Object.keys(st.links);
      if (keys.length > MAX_LINKS) {
        for (const k of keys.slice(0, keys.length - MAX_LINKS)) delete st.links[k];
      }
    } else if (msg.type === "click") {
      st.lastClick = { courseId: msg.courseId, time: Date.now() };
      st.links[norm(msg.href)] = msg.courseId;
    }
    await save();
  })();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const st = await state();
  delete st.tabs[tabId];
  await save();
});

// 설정 페이지에서 "과목 목록 초기화"를 누르면 캐시도 비웁니다.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.courses && cache) {
    cache.courses = changes.courses.newValue || {};
  }
});

function isIclass(url) {
  try { return new URL(url).hostname === "learn.inha.ac.kr"; } catch (_) { return false; }
}

async function resolveCourseId(item) {
  const st = await state();
  for (const u of [item.url, item.finalUrl, item.referrer]) {
    if (u && st.links[norm(u)]) return st.links[norm(u)];
  }
  if (item.referrer) {
    try {
      const r = new URL(item.referrer);
      if (r.pathname.includes("/course/view.php") && r.searchParams.get("id")) {
        return r.searchParams.get("id");
      }
    } catch (_) {}
  }
  if (st.lastClick && Date.now() - st.lastClick.time < CLICK_WINDOW_MS) {
    return st.lastClick.courseId;
  }
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab && st.tabs[tab.id]) return st.tabs[tab.id];
  return null;
}

async function folderFor(item) {
  const courseId = await resolveCourseId(item);
  const st = await state();
  const c = courseId && st.courses[courseId];
  if (!c) return UNSORTED;
  const { bySemester, folderNames } = await chrome.storage.sync.get({ bySemester: false, folderNames: {} });
  const course = safeName(folderNames[c.code] || c.name) || c.code;
  return bySemester && c.semester ? `${semesterLabel(c.semester)}/${course}` : course;
}

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const related = [item.url, item.finalUrl, item.referrer].some((u) => u && isIclass(u));
  if (!related) {
    suggest();
    return;
  }
  (async () => {
    let folder = UNSORTED;
    try {
      folder = await folderFor(item);
    } catch (e) {
      console.warn("I-class 분류 실패", e);
    }
    const base = item.filename.split(/[\\/]/).pop();
    suggest({ filename: `${ROOT}/${folder}/${base}`, conflictAction: "uniquify" });
  })();
  return true; // 비동기로 suggest 호출
});

// 툴바 아이콘을 누르면 설정 페이지 열기
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
