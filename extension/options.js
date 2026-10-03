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
  input.placeholder = safeName(c.name || "") || c.code;
  // 칸보다 긴 이름은 마우스를 올리면 전체가 보이게
  const tip = () => { input.title = input.value || input.placeholder; };
  tip();
  input.addEventListener("input", tip);
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

// safeName, semesterLabel은 common.js
function groupLabel(sem) {
  return sem ? semesterLabel(sem) : "비교과·기타";
}

// 학기별로 접을 수 있게 묶음. 가장 최근 학기만 펼쳐 둔다.
async function render() {
  const { courses } = await chrome.storage.local.get({ courses: {} });
  const { folderNames } = await chrome.storage.sync.get({ folderNames: {} });
  const groups = new Map();
  for (const [id, c] of Object.entries(courses)) {
    const sem = c.semester || "";
    if (!groups.has(sem)) groups.set(sem, []);
    groups.get(sem).push({ id, ...c });
  }
  // 최근 학기 먼저, 학기 없는 비교과는 맨 뒤
  const sems = [...groups.keys()].sort((a, b) => (!a) - (!b) || b.localeCompare(a));
  const list = document.getElementById("list");
  list.textContent = "";
  sems.forEach((sem, i) => {
    const rows = groups.get(sem).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
    const details = document.createElement("details");
    details.open = i === 0;
    const summary = document.createElement("summary");
    summary.textContent = groupLabel(sem) + " ";
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${rows.length}과목`;
    summary.appendChild(count);
    details.appendChild(summary);
    const table = document.createElement("table");
    table.innerHTML = "<thead><tr><th>과목명</th><th>폴더 이름</th><th>코드</th><th></th></tr></thead><tbody></tbody>";
    const tbody = table.querySelector("tbody");
    for (const c of rows) {
      const tr = document.createElement("tr");
      cell(tr, c.name || "(이름 없음)");
      const input = folderInput(c, folderNames);
      cell(tr).appendChild(input);
      cell(tr, c.code || "비교과");
      cell(tr).appendChild(deleteButton("삭제", () => forget([c.id])));
      tr.dataset.text = [c.name, c.code].join(" ").toLowerCase();
      tr._folder = input;
      tbody.appendChild(tr);
    }
    details.appendChild(table);
    const label = groupLabel(sem);
    details.appendChild(deleteButton(`${label} 목록 지우기`, () => {
      if (confirm(`${label} 과목 ${rows.length}개를 목록에서 지울까요? 과목 페이지에 다시 들어가면 다시 인식돼요.`)) {
        forget(rows.map((c) => c.id));
      }
    }));
    list.appendChild(details);
  });
  const total = Object.keys(courses).length;
  document.getElementById("search").hidden = total === 0;
  document.getElementById("empty").hidden = total > 0;
  filter();
}

// 검색어가 있으면 맞는 과목만 보이고 그 학기는 펼침. 지우면 원래 펼침 상태로 돌아감.
function filter() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  let any = false;
  for (const details of document.querySelectorAll("#list details")) {
    let shown = 0;
    for (const tr of details.querySelectorAll("tbody tr")) {
      const hit = !q || (tr.dataset.text + " " + tr._folder.value.toLowerCase()).includes(q);
      tr.hidden = !hit;
      if (hit) shown++;
    }
    details.hidden = shown === 0;
    if (q) {
      if (details.dataset.wasOpen === undefined) details.dataset.wasOpen = details.open ? "1" : "";
      details.open = shown > 0;
    } else if (details.dataset.wasOpen !== undefined) {
      details.open = details.dataset.wasOpen === "1";
      delete details.dataset.wasOpen;
    }
    any ||= shown > 0;
  }
  document.getElementById("nomatch").hidden = !q || any;
}

document.getElementById("search").addEventListener("input", filter);

// 목록에서만 지움. 폴더 이름 설정과 이미 받은 파일은 그대로이고, 과목 페이지에 다시 들어가면 다시 인식됨.
// 저장은 background.js가 함 (forget 메시지)
async function forget(ids) {
  await chrome.runtime.sendMessage({ type: "forget", ids });
  render();
}

function deleteButton(label, onClick) {
  const b = document.createElement("button");
  b.className = "del";
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

render();
