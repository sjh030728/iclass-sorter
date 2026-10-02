const box = document.getElementById("bySemester");
const saved = document.getElementById("saved");

chrome.storage.sync.get({ bySemester: false }, (v) => { box.checked = v.bySemester; });
box.addEventListener("change", () => {
  chrome.storage.sync.set({ bySemester: box.checked }, () => {
    saved.textContent = "저장됐어요.";
    setTimeout(() => (saved.textContent = ""), 1500);
  });
});

function cell(tr, text) {
  const td = document.createElement("td");
  td.textContent = text || "";
  tr.appendChild(td);
  return td;
}

// 폴더 이름은 과목 코드(예: CSE1103) 기준으로 chrome.storage.sync.folderNames에 저장
// 비교과처럼 코드가 없으면 "id:<강좌 번호>"를 키로 씀 (background.js folderFor와 같은 규칙)
function folderInput(c, folderNames) {
  const key = c.code || "id:" + c.id;
  const input = document.createElement("input");
  input.value = folderNames[key] || "";
  input.placeholder = c.name || c.code;
  input.addEventListener("change", () => {
    chrome.storage.sync.get({ folderNames: {} }, ({ folderNames }) => {
      const v = input.value.trim();
      if (v) folderNames[key] = v;
      else delete folderNames[key];
      chrome.storage.sync.set({ folderNames });
    });
  });
  return input;
}

async function render() {
  const { courses } = await chrome.storage.local.get({ courses: {} });
  const { folderNames } = await chrome.storage.sync.get({ folderNames: {} });
  const rows = Object.entries(courses).map(([id, c]) => ({ id, ...c })).sort((a, b) =>
    (b.semester || "").localeCompare(a.semester || "") || (a.name || "").localeCompare(b.name || "", "ko"));
  const tbody = document.querySelector("#list tbody");
  tbody.textContent = "";
  for (const c of rows) {
    const tr = document.createElement("tr");
    cell(tr, c.name || "(이름 없음)");
    cell(tr).appendChild(folderInput(c, folderNames));
    cell(tr, c.code || "비교과");
    cell(tr, c.semester);
    tbody.appendChild(tr);
  }
  document.getElementById("list").hidden = rows.length === 0;
  document.getElementById("empty").hidden = rows.length > 0;
}

document.getElementById("reset").addEventListener("click", () => {
  if (confirm("인식된 과목 목록을 지울까요? 과목 페이지에 다시 들어가면 다시 인식돼요.")) {
    chrome.storage.local.set({ courses: {} }, render);
  }
});

render();
