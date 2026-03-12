/* ===== データ ===== */
let dataA = [], dataB = [], castData = [];
let selectedItems = [null, null, null, null, null]; // [assist1, assist2, assist3, assist4, soul]

const config = [
  { search: "search1", sug: "sug1", source: "a", filter: () => true },
  { search: "search2", sug: "sug2", source: "a", filter: () => true },
  { search: "search3", sug: "sug3", source: "a", filter: () => true },
  { search: "search4", sug: "sug4", source: "a", filter: item => item.レベル >= 6 },
  { search: "search5", sug: "sug5", source: "b", filter: () => true }
];

/* ===== テーブル初期化 ===== */
function initTable() {
  const tbody = document.querySelector("#measureTable tbody");
  for (let i = 1; i <= 8; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td><input type="checkbox" class="cb-check"></td>` +
      `<td class="level-cell">${i}</td>` +
      `<td class="ds-cell">0.00</td>` +
      `<td><input type="text" class="ichikaku-input" placeholder="-"></td>` +
      `<td><input type="checkbox" class="result-check"></td>`;
    tbody.appendChild(tr);
  }
}

/* ===== サジェスト ===== */
function clearSugBox(sugBox) {
  sugBox.innerHTML = "";
  sugBox.classList.remove("active-border");
}

function setupSearchBoxes() {
  config.forEach((cfg, index) => {
    const input = document.getElementById(cfg.search);
    const sugBox = document.getElementById(cfg.sug);

    input.addEventListener("input", () => {
      const keyword = input.value.toLowerCase();
      clearSugBox(sugBox);

      if (!keyword) {
        selectedItems[index] = null;
        updateMeasureTable();
        return;
      }

      const list = (cfg.source === "a" ? dataA : dataB).filter(cfg.filter);
      const matches = list.filter(item =>
        item.読み.toLowerCase().includes(keyword) ||
        item.アシスト名.toLowerCase().includes(keyword)
      );

      if (matches.length > 0) {
        sugBox.classList.add("active-border");
      }

      matches.forEach(item => {
        const div = document.createElement("div");
        div.textContent = item.アシスト名;
        div.onclick = () => {
          input.value = item.アシスト名;
          clearSugBox(sugBox);
          selectedItems[index] = item;
          updateMeasureTable();
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

/* ===== キャストセレクト ===== */
function populateCastSelect() {
  const castSelect = document.getElementById("castSelect");
  castData.forEach(c => {
    const option = document.createElement("option");
    option.value = c.キャスト;
    option.textContent = c.キャスト;
    castSelect.appendChild(option);
  });
  castSelect.addEventListener("change", updateMeasureTable);
}

/* ===== DS値計算・テーブル更新 ===== */
function updateMeasureTable() {
  const castName = document.getElementById("castSelect").value;
  const cast = castName ? castData.find(c => c.キャスト === castName) : null;

  const tbody = document.querySelector("#measureTable tbody");
  const rows = tbody.querySelectorAll("tr");

  for (let i = 0; i < 8; i++) {
    const level = i + 1;
    let total = 0;

    for (const item of selectedItems) {
      if (item && item.レベル <= level) {
        total += parseFloat(item.DS値);
      }
    }

    rows[i].querySelector(".ds-cell").textContent = total.toFixed(2);

    // 1確残: キャストが選択されていれば自動計算（Lv1・Lv8は対象外）
    const ichikakuInput = rows[i].querySelector(".ichikaku-input");
    const required = cast ? parseFloat(cast[level]) : NaN;

    if (cast && !isNaN(required) && required > 0) {
      const diff = total - required;
      ichikakuInput.placeholder = (diff >= 0 ? "+" : "") + diff.toFixed(2);
    } else if (level === 1 || level === 8) {
      ichikakuInput.placeholder = "-";
    } else {
      ichikakuInput.placeholder = "-";
    }
  }
}

/* ===== ローカルストレージ ===== */
function getLog() {
  try {
    return JSON.parse(localStorage.getItem("measurementLog") || "[]");
  } catch {
    return [];
  }
}

function saveLog(log) {
  localStorage.setItem("measurementLog", JSON.stringify(log));
}

/* ===== ログ表示 ===== */
function renderLog() {
  const log = getLog();
  const container = document.getElementById("logContainer");

  if (log.length === 0) {
    container.innerHTML = '<p class="no-log">記録がありません</p>';
    return;
  }

  container.innerHTML = "";

  // 新しい順に表示
  const reversed = [...log].reverse();

  for (const entry of reversed) {
    const div = document.createElement("div");
    div.className = "log-entry";

    const assistParts = entry.アシスト.filter(a => a);
    const assistStr = assistParts.length > 0 ? "_" + assistParts.join("_") : "";
    const header = `${entry.検証アシスト名}[${entry.キャスト}${assistStr}]`;

    let html = `<div class="log-timestamp">${formatTimestamp(entry.timestamp)}</div>`;

    for (const row of entry.データ) {
      const resultChar = row.結果 ? "○" : "×";
      const resultClass = row.結果 ? "result-ok" : "result-ng";
      const ichikaku = row["1確残"] || "-";
      html += `<div class="log-line">${header} レベル${row.レベル}(${row.DS値})：${ichikaku}<span class="${resultClass}">${resultChar}</span></div>`;
    }

    if (entry.補足) {
      html += `<div class="log-supplement">補足: ${escapeHtml(entry.補足)}</div>`;
    }

    div.innerHTML = html;
    container.appendChild(div);
  }
}

function formatTimestamp(iso) {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${h}:${min}`;
  } catch {
    return iso;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ===== 記録ボタン ===== */
document.getElementById("recordButton").addEventListener("click", () => {
  document.getElementById("supplementInput").value = "";
  document.getElementById("recordModal").classList.remove("hidden");
});

document.getElementById("cancelRecord").addEventListener("click", () => {
  document.getElementById("recordModal").classList.add("hidden");
});

document.getElementById("modalOverlay").addEventListener("click", () => {
  document.getElementById("recordModal").classList.add("hidden");
});

document.getElementById("confirmRecord").addEventListener("click", () => {
  const supplement = document.getElementById("supplementInput").value.trim();

  // CBがオンになっている行のデータを収集
  const tbody = document.querySelector("#measureTable tbody");
  const rows = tbody.querySelectorAll("tr");
  const data = [];

  for (let i = 0; i < 8; i++) {
    const cbChecked = rows[i].querySelector(".cb-check").checked;
    if (!cbChecked) continue;

    const level = i + 1;
    const dsValue = rows[i].querySelector(".ds-cell").textContent;
    const ichikakuInput = rows[i].querySelector(".ichikaku-input");
    const ichikaku = ichikakuInput.value.trim() || ichikakuInput.placeholder || "-";
    const result = rows[i].querySelector(".result-check").checked;

    data.push({
      "レベル": level,
      "DS値": dsValue,
      "1確残": ichikaku,
      "結果": result
    });
  }

  const measureAssistName = document.getElementById("measureAssistName").value.trim() || "（名称未設定）";
  const castName = document.getElementById("castSelect").value || "（未選択）";
  const assistNames = selectedItems.map(item => item ? item.アシスト名 : null);

  const entry = {
    "timestamp": new Date().toISOString(),
    "検証アシスト名": measureAssistName,
    "キャスト": castName,
    "アシスト": assistNames,
    "データ": data,
    "補足": supplement
  };

  const log = getLog();
  log.push(entry);
  saveLog(log);

  document.getElementById("recordModal").classList.add("hidden");
  renderLog();
});

/* ===== クリアボタン ===== */
document.getElementById("clearButton").addEventListener("click", () => {
  if (!confirm("アシストとソウルの入力情報をクリアしますか？")) return;

  // キャスト選択をリセット
  document.getElementById("castSelect").value = "";

  // アシスト1〜4・ソウルをリセット
  for (let i = 1; i <= 5; i++) {
    const input = document.getElementById(`search${i}`);
    const sugBox = document.getElementById(`sug${i}`);
    if (input) input.value = "";
    if (sugBox) {
      sugBox.innerHTML = "";
      sugBox.classList.remove("active-border");
    }
  }

  selectedItems = [null, null, null, null, null];
  updateMeasureTable();
});

/* ===== 初期化 ===== */
Promise.all([
  fetch("assist.json").then(r => r.json()),
  fetch("soul.json").then(r => r.json()),
  fetch("cast.json").then(r => r.json())
]).then(([aData, bData, cData]) => {
  dataA = aData;
  dataB = bData;
  castData = cData;
  initTable();
  setupSearchBoxes();
  populateCastSelect();
  renderLog();
}).catch(err => console.error("データ読み込みエラー:", err));
