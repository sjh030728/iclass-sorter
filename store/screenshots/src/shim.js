// 스크린샷용: 예시 데이터로 chrome.storage 흉내
const DATA = {
  local: { courses: {
    "74790": { code: "CSE1312", semester: "202602", name: "이산구조" },
    "74806": { code: "CSE2211", semester: "202602", name: "논리회로" },
    "74787": { code: "CSE1103", semester: "202602", name: "객체지향프로그래밍 2" },
    "77336": { code: "MTH1902", semester: "202602", name: "일반수학 2" },
    "75742": { code: "GEB1108", semester: "202602", name: "의사소통 영어: 중급" },
    "78255": { code: "", semester: "", name: "인하동동(2026-2)" }
  } },
  sync: { bySemester: false, folderNames: {} }
};
const area = (n) => ({
  get(def, cb) { const r = { ...(typeof def === "object" && !Array.isArray(def) ? def : {}), ...DATA[n] }; if (cb) cb(r); return Promise.resolve(r); },
  set(o, cb) { Object.assign(DATA[n], o); if (cb) cb(); return Promise.resolve(); }
});
window.chrome = { storage: { local: area("local"), sync: area("sync") } };
