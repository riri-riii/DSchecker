function clearSugBox(sugBox) {
  sugBox.innerHTML = "";
  sugBox.classList.remove("active-border");
}

function setJudgeCell(cell, actual, required) {
  const diff = actual - required;
  cell.innerText = (diff >= 0 ? "+" : "") + diff.toFixed(2);
  cell.style.color = diff >= 0 ? "green" : "red";
}

function setupSearchBoxes() {
  config.forEach((cfg, index) => {
    const input = document.getElementById(cfg.search);
    const sugBox = document.getElementById(cfg.sug);

    input.addEventListener("input", () => {
      const keyword = input.value.toLowerCase();
      clearSugBox(sugBox);

      if (!keyword) {
        const tableBody = document.getElementById("resultTable").querySelector("tbody");
        const rows = tableBody.querySelectorAll("tr");
        rows[index].cells[0].innerText = placeholderNames[index];
        rows[index].cells[0].classList.add("placeholder-text");
        rows[index].cells[1].innerText = "";
        rows[index].cells[2].innerText = "";
        rows[index].cells[3].innerText = "";
        updateSummaryTable();
        return;
      }

      sugBox.classList.add("active-border");
      const list = (cfg.source === "a" ? dataA : dataB).filter(cfg.filter);
      const matches = list.filter(item =>
        item.読み.toLowerCase().includes(keyword) ||
        item.アシスト名.toLowerCase().includes(keyword)
      );

      matches.forEach(item => {
        const div = document.createElement("div");
        div.textContent = item.アシスト名;
        div.className = "suggestion-item";
        div.onclick = () => {
          input.value = item.アシスト名;
          clearSugBox(sugBox);
          addToTable(item);
        };
        sugBox.appendChild(div);
      });
    });

    input.addEventListener("blur", () => {
      setTimeout(() => clearSugBox(sugBox), 200);
    });

    input.addEventListener("focus", () => {
      if (sugBox.children.length > 0) {
        sugBox.classList.add("active-border");
      }
    });
  });
}

function addToTable(item) {
  const index = config.findIndex(cfg => document.getElementById(cfg.search).value === item.アシスト名);
  if (index === -1) return;

  const tableBody = document.getElementById("resultTable").querySelector("tbody");
  const rows = tableBody.querySelectorAll("tr");

  rows[index].cells[0].innerText = item.アシスト名;
  rows[index].cells[0].classList.remove("placeholder-text");
  rows[index].cells[1].innerText = item.レベル;
  rows[index].cells[2].innerText = parseFloat(item.DS値).toFixed(2);
  rows[index].cells[3].innerText = item.カテゴリ;
  updateSummaryTable();
}

function updateSummaryTable() {
  const tableBody = document.getElementById("resultTable").querySelector("tbody");
  const rows = tableBody.querySelectorAll("tr");

  const levels = [];
  const dsValues = [];

  // 各行（アシスト/ソウル）のデータを取得
  for (let i = 0; i < rows.length; i++) {
    const level = parseInt(rows[i].cells[1].innerText);
    const ds = parseFloat(rows[i].cells[2].innerText);
    if (!isNaN(level) && !isNaN(ds)) {
      levels.push(level);
      dsValues.push(ds);
    }
  }

  // ds1〜ds8 の要素をキャッシュしつつ更新
  const dsEls = {};
  for (let i = 1; i <= 8; i++) {
    dsEls[i] = document.getElementById("ds" + i);
    let total = 0;
    for (let j = 0; j < levels.length; j++) {
      if (levels[j] <= i) total += dsValues[j];
    }
    dsEls[i].innerText = total.toFixed(2);
  }

  const judgeRow = document.getElementById("judgeRow");
  const judgeRow2 = document.getElementById("judgeRow2");
  const castName = document.getElementById("castSelect").value;

  if (!castName) {
    for (let i = 1; i <= 4; i++) {
      judgeRow.cells[i].innerText = "";
      judgeRow.cells[i].style.color = "";
      judgeRow2.cells[i].innerText = "";
      judgeRow2.cells[i].style.color = "";
    }
    return;
  }

  const cast = castData.find(c => c.キャスト === castName);
  if (!cast) return;

  // Lv2-4 (judgeRow: cells[2]=Lv2, cells[3]=Lv3, cells[4]=Lv4)
  for (let i = 2; i <= 4; i++) {
    setJudgeCell(judgeRow.cells[i], parseFloat(dsEls[i].innerText), parseFloat(cast[i]));
  }

  // Lv5-7 (judgeRow2: cells[1]=Lv5, cells[2]=Lv6, cells[3]=Lv7)
  for (let i = 5; i <= 7; i++) {
    setJudgeCell(judgeRow2.cells[i - 4], parseFloat(dsEls[i].innerText), parseFloat(cast[i]));
  }

  judgeRow.cells[1].innerText = "-";   // Lv1
  judgeRow2.cells[4].innerText = "-";  // Lv8
}

function populateCastSelect() {
  const castSelect = document.getElementById("castSelect");
  castData.forEach(c => {
    const option = document.createElement("option");
    option.value = c.キャスト;
    option.textContent = c.キャスト;
    castSelect.appendChild(option);
  });

  castSelect.addEventListener("change", () => {
    updateSummaryTable();
  });
}

const placeholderNames = ["アシスト1", "アシスト2", "アシスト3", "アシスト4", "ソウル"];

let dataA = [], dataB = [], castData = [];

const config = [
  { search: "search1", sug: "sug1", source: "a", filter: () => true },
  { search: "search2", sug: "sug2", source: "a", filter: () => true },
  { search: "search3", sug: "sug3", source: "a", filter: () => true },
  { search: "search4", sug: "sug4", source: "a", filter: item => item.レベル >= 6 },
  { search: "search5", sug: "sug5", source: "b", filter: () => true }
];

Promise.all([
  fetch("assist.json").then(r => r.json()),
  fetch("soul.json").then(r => r.json()),
  fetch("cast.json").then(r => r.json())
]).then(([aData, bData, cData]) => {
  dataA = aData;
  dataB = bData;
  castData = cData;
  setupSearchBoxes();
  populateCastSelect();
}).catch(err => console.error("データ読み込みエラー:", err));

// 各検索ボックスの内容をクリア
document.getElementById("clearButton").addEventListener("click", () => {
  if (!confirm("選択内容をリセットしますか？")) return;
  for (let i = 1; i <= 5; i++) {
    const input = document.getElementById(`search${i}`);
    const sugBox = document.getElementById(`sug${i}`);
    if (input) input.value = "";
    if (sugBox) clearSugBox(sugBox);
  }
  const rows = document.getElementById("resultTable").querySelectorAll("tbody tr");
  rows.forEach((row, rowIndex) => {
    row.cells[0].innerText = placeholderNames[rowIndex];
    row.cells[0].classList.add("placeholder-text");
    for (let j = 1; j < row.cells.length; j++) {
      row.cells[j].innerText = "";
    }
  });
  updateSummaryTable();
});
