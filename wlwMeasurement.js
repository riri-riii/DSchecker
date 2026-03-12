/* ===== ユーティリティ ===== */
function clearSugBox(sugBox) {
  sugBox.innerHTML = "";
  sugBox.classList.remove("active-border");
}

/* ===== データ ===== */
let dataA = [], dataB = [], castData = [];
let logData = [];

// 選択中のアイテム（config インデックス対応）
const selectedItems = [null, null, null, null, null];

const config = [
  { search: "search1", sug: "sug1", source: "a", filter: () => true },
  { search: "search2", sug: "sug2", source: "a", filter: () => true },
  { search: "search3", sug: "sug3", source: "a", filter: () => true },
  { search: "search4", sug: "sug4", source: "a", filter: item => item.レベル >= 6 },
  { search: "search5", sug: "sug5", source: "b", filter: () => true }
];

/* ===== 検索ボックス設定 ===== */
function setupSearchBoxes() {
  config.forEach((cfg, index) => {
    const input = document.getElementById(cfg.search);
    const sugBox = document.getElementById(cfg.sug);

    input.addEventListener("input", () => {
      const keyword = input.value.toLowerCase();
      clearSugBox(sugBox);

      if (!keyword) {
        selectedItems[index] = null;
        updateMeasurementTable();
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
        div.onclick = () => {
          input.value = item.アシスト名;
          clearSugBox(sugBox);
          selectedItems[index] = item;
          updateMeasurementTable();
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

/* ===== キャスト選択肢を追加 ===== */
function populateCastSelect() {
  const castSelect = document.getElementById("castSelect");
  castData.forEach(c => {
    const option = document.createElement("option");
    option.value = c.キャスト;
    option.textContent = c.キャスト;
    castSelect.appendChild(option);
  });
  castSelect.addEventListener("change", updateMeasurementTable);
}

/* ===== 検証データ表を更新 ===== */
function updateMeasurementTable() {
  const castName = document.getElementById("castSelect").value;
  const cast = castName ? castData.find(c => c.キャスト === castName) : null;

  for (let level = 1; level <= 8; level++) {
    const dsCell = document.getElementById("mds" + level);
    const judgeCell = document.getElementById("mjudge" + level);

    // DS値 計算: 選択アイテムのうち item.レベル <= level のものを合計
    let total = 0;
    selectedItems.forEach(item => {
      if (item && parseFloat(item.レベル) <= level) {
        total += parseFloat(item.DS値);
      }
    });
    dsCell.textContent = total.toFixed(2);

    // 1確残 計算
    judgeCell.className = "";
    if (level === 1 || level === 8 || !cast) {
      judgeCell.textContent = "-";
    } else {
      const required = parseFloat(cast[level]);
      if (!required || required <= 0) {
        judgeCell.textContent = "-";
      } else {
        const diff = total - required;
        judgeCell.textContent = (diff >= 0 ? "+" : "") + diff.toFixed(2);
        judgeCell.className = diff >= 0 ? "judge-positive" : "judge-negative";
      }
    }
  }
}

/* ===== ログ関連 ===== */
function loadLog() {
  const stored = localStorage.getItem("wlwMeasurementLog");
  logData = stored ? JSON.parse(stored) : [];
  displayLog();
}

function saveLogToStorage() {
  localStorage.setItem("wlwMeasurementLog", JSON.stringify(logData));
}

function saveRecord(notes) {
  const tbody = document.getElementById("measureTable").querySelector("tbody");
  const rows = tbody.querySelectorAll("tr");

  const savedRows = [];
  for (let level = 1; level <= 8; level++) {
    const row = rows[level - 1];
    const cbChecked = row.cells[0].querySelector(".cb-check").checked;
    if (cbChecked) {
      const ds = document.getElementById("mds" + level).textContent;
      const remaining = document.getElementById("mjudge" + level).textContent;
      const result = row.cells[4].querySelector(".result-check").checked;
      savedRows.push({ level, ds, remaining, result });
    }
  }

  const assists = [
    document.getElementById("search1").value,
    document.getElementById("search2").value,
    document.getElementById("search3").value,
    document.getElementById("search4").value,
  ];

  const record = {
    timestamp: new Date().toISOString(),
    assistName: document.getElementById("measureAssistName").value || "（名称未設定）",
    cast: document.getElementById("castSelect").value,
    assists: assists,
    soul: document.getElementById("search5").value,
    rows: savedRows,
    notes: notes
  };

  logData.push(record);
  saveLogToStorage();
  displayLog();
}

function displayLog() {
  const logDiv = document.getElementById("logDisplay");

  if (logData.length === 0) {
    logDiv.innerHTML = '<p class="log-empty">記録がありません</p>';
    return;
  }

  logDiv.innerHTML = "";

  // 新しい順に表示
  [...logData].reverse().forEach(record => {
    const entry = document.createElement("div");
    entry.className = "log-entry";

    // ヘッダー行: {検証アシスト名}[{キャスト}_{アシスト情報}]
    const assistParts = [
      record.cast,
      ...record.assists,
      record.soul
    ].filter(s => s && s.trim() !== "");
    const assistInfo = assistParts.join("_");

    const header = document.createElement("div");
    header.className = "log-header";
    header.textContent = `${record.assistName}[${assistInfo}]`;
    entry.appendChild(header);

    // レベル行群
    if (record.rows && record.rows.length > 0) {
      const rowsWrap = document.createElement("div");
      rowsWrap.className = "log-rows";
      record.rows.forEach(r => {
        const line = document.createElement("div");
        line.className = "log-row";
        const resultMark = r.result ? "○" : "×";
        line.textContent = `${r.level}(${r.ds})：${r.remaining}${resultMark}`;
        rowsWrap.appendChild(line);
      });
      entry.appendChild(rowsWrap);
    }

    // 補足情報
    if (record.notes && record.notes.trim()) {
      const notesEl = document.createElement("div");
      notesEl.className = "log-notes";
      notesEl.textContent = `補足：${record.notes}`;
      entry.appendChild(notesEl);
    }

    // タイムスタンプ
    if (record.timestamp) {
      const ts = document.createElement("div");
      ts.className = "log-timestamp";
      ts.textContent = new Date(record.timestamp).toLocaleString("ja-JP");
      entry.appendChild(ts);
    }

    logDiv.appendChild(entry);
  });
}

/* ===== 記録ボタン ===== */
document.getElementById("recordButton").addEventListener("click", () => {
  document.getElementById("notesInput").value = "";
  document.getElementById("recordModal").classList.add("active");
});

document.getElementById("modalOk").addEventListener("click", () => {
  const notes = document.getElementById("notesInput").value.trim();
  document.getElementById("recordModal").classList.remove("active");
  saveRecord(notes);
});

document.getElementById("modalCancel").addEventListener("click", () => {
  document.getElementById("recordModal").classList.remove("active");
});

// モーダル外クリックで閉じる
document.getElementById("recordModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("recordModal")) {
    document.getElementById("recordModal").classList.remove("active");
  }
});

/* ===== クリアボタン（アシストとソウルのみ） ===== */
document.getElementById("clearButton").addEventListener("click", () => {
  if (!confirm("アシストとソウルの入力情報をクリアしますか？")) return;

  // アシスト1〜4・ソウル（search1〜search5）をクリア
  for (let i = 1; i <= 5; i++) {
    const input = document.getElementById(`search${i}`);
    const sugBox = document.getElementById(`sug${i}`);
    if (input) input.value = "";
    if (sugBox) { sugBox.innerHTML = ""; sugBox.classList.remove("active-border"); }
    selectedItems[i - 1] = null;
  }

  updateMeasurementTable();
});

/* ===== データ読み込み ===== */
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
  loadLog();
  updateMeasurementTable();
}).catch(err => console.error("データ読み込みエラー:", err));
