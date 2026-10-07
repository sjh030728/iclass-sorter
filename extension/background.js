// I-class 강의자료 자동 분류
// 과목 페이지에서 읽은 과목명으로 폴더를 만들어 저장합니다.

importScripts("common.js"); // safeName, semesterLabel

const UNSORTED = "미분류";        // 과목을 못 알아냈을 때
const MAX_LINKS = 5000;

// 서비스 워커가 깨어날 때 메시지가 동시에 와도 한 번만 읽도록 Promise를 공유
// (각자 읽으면 나중에 읽은 쪽이 cache를 덮어써서 먼저 들어온 기록이 사라짐)
let cache = null;
let loading = null;
function state() {
  return loading ??= (async () => {
    const s = await chrome.storage.session.get(["links", "tabs", "lastClick"]);
    const l = await chrome.storage.local.get(["courses"]);
    return cache = {
      links: s.links || {},
      tabs: s.tabs || {},
      lastClick: s.lastClick || null,
      courses: l.courses || {}   // courseId -> { code, semester, name } (비교과는 code가 "")
    };
  })();
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

// courses는 여기서만 저장한다. 설정 페이지에서 지울 때도 "forget" 메시지로 부탁함
// (설정 페이지가 직접 쓰면 이쪽의 save()가 옛 목록으로 덮어써서 지운 과목이 되살아날 수 있음)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const st = await state();
    if (msg.type === "page") {
      if (msg.course) {
        st.courses[msg.courseId] = {
          code: msg.course.code,
          semester: msg.course.semester,
          name: msg.course.name || st.courses[msg.courseId]?.name || ""
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
    } else if (msg.type === "forget") {
      for (const id of msg.ids) delete st.courses[id];
    }
    await save();
  })().finally(() => sendResponse());
  return true; // 저장이 끝난 뒤 응답 (설정 페이지가 그다음 목록을 다시 그림)
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const st = await state();
  delete st.tabs[tabId];
  await save();
});

async function resolveCourseId(item) {
  const st = await state();
  for (const u of [item.url, item.finalUrl, item.referrer]) {
    if (!u) continue;
    const hit = st.links[norm(u)] || st.links[cmKey(u)];
    if (hit) return hit;
  }
  try {
    const r = new URL(item.referrer);
    if (r.pathname.includes("/course/view.php") && r.searchParams.get("id")) {
      return r.searchParams.get("id");
    }
  } catch (_) {}
  if (st.lastClick && Date.now() - st.lastClick.time < 60 * 1000) {
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
  if (!bySemester) return course;
  // 비교과(과목 코드 없음)는 학기를 알 수 없어서 학기 폴더 대신 "비교과" 폴더에 모음
  return c.code ? `${semesterLabel(c.semester)}/${course}` : `비교과/${course}`;
}

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const related = [item.url, item.finalUrl, item.referrer].some((u) => {
    try { return new URL(u).hostname === "learn.inha.ac.kr"; } catch (_) { return false; }
  });
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
    suggest({ filename: `I-class/${folder}/${item.filename.split(/[\\/]/).pop()}`, conflictAction: "uniquify" });
  })();
  return true; // 비동기로 suggest 호출
});

// 툴바 아이콘을 누르면 설정 페이지 열기
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
