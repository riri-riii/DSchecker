/* ===== Firebase設定 ===== */
// Firebase Realtime Database の URL を入力してください
// 例: "https://your-project-id-default-rtdb.firebaseio.com"
const FIREBASE_DB_URL = "YOUR_FIREBASE_DATABASE_URL_HERE";

/* ===== 認証 ===== */
const AUTH_KEY = "ds_checker_auth";
const AUTH_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30日
const GAS_URL = "https://script.google.com/macros/s/AKfycbwGGhy1A5MnLe4S0U450LxOY9cJEsNB5J7ePcUh6QwxTuTpNJ5gb1ab1XTX_rk9nv2N/exec";

function isAuthenticated() {
  try {
    const data = JSON.parse(localStorage.getItem(AUTH_KEY));
    return data && data.expiry > Date.now();
  } catch { return false; }
}

function saveAuth() {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ expiry: Date.now() + AUTH_DURATION_MS }));
}

function updateAuthUI() {
  const authed = isAuthenticated();
  const btn = document.getElementById("authButton");
  btn.textContent = authed ? "認証済み" : "ご協力者様ですか？";
  btn.classList.toggle("authenticated", authed);

  const display = authed ? "" : "none";
  document.getElementById("sectionInfo").style.display = display;
  document.getElementById("sectionResult").style.display = display;
}

function showAuthModal() {
  document.getElementById("authCodeInput").value = "";
  document.getElementById("authError").textContent = "";
  document.getElementById("authModal").classList.remove("hidden");
  document.getElementById("authCodeInput").focus();
}


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
      `<td class="ichikaku-cell">-</td>` +
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

    const ichikakuCell = rows[i].querySelector(".ichikaku-cell");
    const required = cast ? parseFloat(cast[level]) : NaN;

    if (cast && !isNaN(required) && required > 0) {
      const diff = total - required;
      ichikakuCell.textContent = (diff >= 0 ? "+" : "") + diff.toFixed(2);
      ichikakuCell.style.color = diff >= 0 ? "#2e7d32" : "#c62828";
    } else {
      ichikakuCell.textContent = "-";
      ichikakuCell.style.color = "";
    }
  }
}

/* ===== Firebase REST API ===== */
function getDbUrl() {
  const url = FIREBASE_DB_URL.trim().replace(/\/$/, "");
  if (!url.startsWith("https://")) {
    throw new Error("Firebase URL が正しく設定されていません。GitHub Actions のワークフローが main ブランチで実行されているか、Secret の FIREBASE_DB_URL を確認してください。");
  }
  return url;
}

async function getLog() {
  const res = await fetch(`${getDbUrl()}/measurementLog.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data) return [];
  // Firebase は object で返すので配列に変換し、timestamp 昇順でソート
  // _firebaseKey を保持して削除時に使用する
  return Object.entries(data)
    .map(([key, val]) => ({ _firebaseKey: key, ...val }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

async function addEntry(entry) {
  const res = await fetch(`${getDbUrl()}/measurementLog.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function deleteEntry(key) {
  const res = await fetch(`${getDbUrl()}/measurementLog/${key}.json`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/* ===== ログ表示 ===== */
async function renderLog() {
  const container = document.getElementById("logContainer");
  container.innerHTML = '<p class="no-log">読み込み中…</p>';

  let log;
  try {
    log = await getLog();
  } catch (err) {
    container.innerHTML = '<p class="no-log log-error">ログの読み込みに失敗しました。<br>Firebase の URL が正しく設定されているか確認してください。</p>';
    console.error("ログ読み込みエラー:", err);
    return;
  }

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

    const assistParts = (entry.アシスト || []).filter(a => a);
    const assistStr = assistParts.length > 0 ? assistParts.join("") : "（アシストなし）";
    const header = `${entry.検証アシスト名}[${entry.キャスト}_${assistStr}]`;

    let html = `<div class="log-header">${escapeHtml(header)}</div>`;

    for (const row of (entry.データ || [])) {
      const resultChar = row.結果 ? "○" : "×";
      const resultClass = row.結果 ? "result-ok" : "result-ng";
      const ichikaku = row["1確残"] || "-";
      html += `<div class="log-line">レベル${row.レベル}(${row.DS値})：${ichikaku}<span class="${resultClass}">${resultChar}</span></div>`;
    }

    if (entry.補足) {
      html += `<div class="log-supplement">補足: ${escapeHtml(entry.補足)}</div>`;
    }

    div.innerHTML = html;

    // ゴミ箱ボタン（認証済み時のみ）
    if (!isAuthenticated()) {
      container.appendChild(div);
      continue;
    }
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "log-delete-btn";
    deleteBtn.title = "削除";
    deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    deleteBtn.addEventListener("click", async () => {
      if (!confirm(`「${header}」\nを削除しますか？`)) return;
      deleteBtn.disabled = true;
      try {
        await deleteEntry(entry._firebaseKey);
        await renderLog();
      } catch (err) {
        alert("削除に失敗しました。");
        console.error("削除エラー:", err);
        deleteBtn.disabled = false;
      }
    });
    div.appendChild(deleteBtn);

    container.appendChild(div);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ===== アシスト入力クリア ===== */
function clearAssistInputs() {
  for (let i = 1; i <= 5; i++) {
    const input = document.getElementById(`search${i}`);
    const sugBox = document.getElementById(`sug${i}`);
    if (input) input.value = "";
    if (sugBox) { sugBox.innerHTML = ""; sugBox.classList.remove("active-border"); }
  }
  selectedItems = [null, null, null, null, null];
  // テーブルのチェックをすべて外す
  document.querySelectorAll("#measureTable .cb-check, #measureTable .result-check")
    .forEach(cb => { cb.checked = false; });
  updateMeasureTable();
}

/* ===== 記録ボタン ===== */
document.getElementById("recordButton").addEventListener("click", () => {
  if (!isAuthenticated()) {
    showAuthModal();
    return;
  }
  const name = document.getElementById("measureAssistName").value.trim();
  if (!name) {
    alert("検証アシスト名を入力してください。");
    return;
  }
  if (!document.getElementById("castSelect").value) {
    alert("キャストを選択してください。");
    return;
  }
  if (!document.querySelector("#measureTable .cb-check:checked")) {
    alert("記録する行を少なくとも1つチェックしてください。");
    return;
  }
  document.getElementById("supplementInput").value = "";
  document.getElementById("recordModal").classList.remove("hidden");
});

document.getElementById("cancelRecord").addEventListener("click", () => {
  document.getElementById("recordModal").classList.add("hidden");
});

document.getElementById("modalOverlay").addEventListener("click", () => {
  document.getElementById("recordModal").classList.add("hidden");
});

document.getElementById("confirmRecord").addEventListener("click", async () => {
  const supplement = document.getElementById("supplementInput").value.trim();

  const tbody = document.querySelector("#measureTable tbody");
  const rows = tbody.querySelectorAll("tr");
  const data = [];

  for (let i = 0; i < 8; i++) {
    const cbChecked = rows[i].querySelector(".cb-check").checked;
    if (!cbChecked) continue;

    const level = i + 1;
    const dsValue = rows[i].querySelector(".ds-cell").textContent;
    const ichikaku = rows[i].querySelector(".ichikaku-cell").textContent || "-";
    const result = rows[i].querySelector(".result-check").checked;

    data.push({
      "レベル": level,
      "DS値": dsValue,
      "1確残": ichikaku,
      "結果": result
    });
  }

  const measureAssistName = document.getElementById("measureAssistName").value.trim();
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

  const confirmBtn = document.getElementById("confirmRecord");
  confirmBtn.disabled = true;
  confirmBtn.textContent = "保存中…";

  try {
    await addEntry(entry);
    document.getElementById("recordModal").classList.add("hidden");
    clearAssistInputs();
    await renderLog();
  } catch (err) {
    alert("保存に失敗しました。Firebase の URL が正しく設定されているか確認してください。");
    console.error("保存エラー:", err);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "OK";
  }
});

/* ===== クリアボタン ===== */
document.getElementById("clearButton").addEventListener("click", () => {
  if (!confirm("アシストとソウルの入力情報をクリアしますか？")) return;

  document.getElementById("castSelect").value = "";

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
  document.querySelectorAll("#measureTable .cb-check, #measureTable .result-check")
    .forEach(cb => { cb.checked = false; });
  updateMeasureTable();
});

/* ===== ログ再読み込みボタン ===== */
document.getElementById("reloadLogButton").addEventListener("click", () => {
  renderLog();
});

/* ===== 認証モーダル ===== */
document.getElementById("authButton").addEventListener("click", showAuthModal);

document.getElementById("authModalOverlay").addEventListener("click", () => {
  document.getElementById("authModal").classList.add("hidden");
});

document.getElementById("cancelAuth").addEventListener("click", () => {
  document.getElementById("authModal").classList.add("hidden");
});

document.getElementById("confirmAuth").addEventListener("click", async () => {
  const code = document.getElementById("authCodeInput").value.trim();
  if (!code) return;

  const confirmBtn = document.getElementById("confirmAuth");
  const errorEl = document.getElementById("authError");
  confirmBtn.disabled = true;
  confirmBtn.textContent = "確認中…";
  errorEl.textContent = "";

  try {
    const res = await fetch(`${GAS_URL}?code=${encodeURIComponent(code)}`);
    const text = await res.text();
    if (res.ok && text === "OK") {
      saveAuth();
      document.getElementById("authModal").classList.add("hidden");
      updateAuthUI();
      await renderLog();
    } else {
      errorEl.textContent = "コードが正しくありません。";
    }
  } catch (err) {
    errorEl.textContent = "通信エラーが発生しました。";
    console.error("認証エラー:", err);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "OK";
  }
});

document.getElementById("authCodeInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("confirmAuth").click();
});

/* ===== 初期化 ===== */
Promise.all([
  fetch("assist.json").then(r => r.json()),
  fetch("soul.json").then(r => r.json()),
  fetch("cast.json").then(r => r.json())
]).then(async ([aData, bData, cData]) => {
  dataA = aData;
  dataB = bData;
  castData = cData;
  initTable();
  setupSearchBoxes();
  populateCastSelect();
  updateAuthUI();
  await renderLog();
}).catch(err => console.error("データ読み込みエラー:", err));
