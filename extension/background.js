// I-class 강의자료 자동 분류 (배포용)
// 과목 페이지에서 읽은 과목명으로 폴더를 만들어 저장합니다. 과목 목록을 따로 적을 필요가 없어요.

const ROOT = "I-class";          // 다운로드 폴더 안의 하위 폴더
const UNSORTED = "미분류";        // 과목을 못 알아냈을 때
const CLICK_WINDOW_MS = 60 * 1000;
const MAX_LINKS = 5000;

// 서비스 워커가 깨어날 때 메시지가 동시에 와도 한 번만 읽도록 Promise를 공유
// (각자 읽으면 나중에 읽은 쪽이 cache를 덮어써서 먼저 들어온 기록이 사라짐)
let cache = null;
let loading = null;
async function state() {
  if (cache) return cache;
  loading ??= (async () => {
    const s = await chrome.storage.session.get(["links", "tabs", "lastClick"]);
    const l = await chrome.storage.local.get(["courses"]);
    cache = {
      links: s.links || {},
      tabs: s.tabs || {},
      lastClick: s.lastClick || null,
      courses: l.courses || {}   // courseId -> { code, semester, name } (비교과는 code가 "")
    };
    return cache;
  })();
  return loading;
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

// 강의자료 번호(cmid). 강의실의 /mod/ubfile/view.php?id=N 과
// 문서 뷰어의 /local/ubdoc/?id=N, /local/ubdoc/download.php?id=N 이 같은 N을 씀
function cmKey(url) {
  try {
    const u = new URL(url);
    const id = u.searchParams.get("id");
    if (id && /^\/(mod\/\w+|local\/ubdoc)\//.test(u.pathname)) return "cm:" + id;
  } catch (_) {}
  return null;
}

function remember(links, url, courseId) {
  links[norm(url)] = courseId;
  const cm = cmKey(url);
  if (cm) links[cm] = courseId;
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

// 1.0.3 이하는 분반에 영문자가 섞인 과목(예: -Y04)을 코드 없는 비교과로 인식해서
// 폴더 이름을 "id:<강좌 번호>" 키로 저장했음. 코드가 잡히면 그 이름을 코드 키로 옮김.
async function moveFolderName(courseId, code) {
  const { folderNames } = await chrome.storage.sync.get({ folderNames: {} });
  const old = folderNames["id:" + courseId];
  if (old === undefined) return;
  if (!(code in folderNames)) folderNames[code] = old;
  delete folderNames["id:" + courseId];
  await chrome.storage.sync.set({ folderNames });
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  (async () => {
    const st = await state();
    if (msg.type === "page") {
      if (msg.course) {
        const prev = st.courses[msg.courseId] || {};
        if (prev.code === "" && msg.course.code) await moveFolderName(msg.courseId, msg.course.code);
        st.courses[msg.courseId] = {
          code: msg.course.code,
          semester: msg.course.semester,
          name: msg.course.name || prev.name || ""
        };
      }
      if (sender.tab) st.tabs[sender.tab.id] = msg.courseId;
      for (const l of msg.links) remember(st.links, l, msg.courseId);
      const keys = Object.keys(st.links);
      if (keys.length > MAX_LINKS) {
        for (const k of keys.slice(0, keys.length - MAX_LINKS)) delete st.links[k];
      }
    } else if (msg.type === "click") {
      st.lastClick = { courseId: msg.courseId, time: Date.now() };
      remember(st.links, msg.href, msg.courseId);
    }
    await save();
  })();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const st = await state();
  delete st.tabs[tabId];
  await save();
});

// 설정 페이지에서 과목을 목록에서 지우면 캐시에도 반영합니다.
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
    if (!u) continue;
    const hit = st.links[norm(u)] || st.links[cmKey(u)];
    if (hit) return hit;
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
  const course = safeName(folderNames[c.code || "id:" + courseId] || c.name) || c.code || UNSORTED;
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
