function setupSearchBoxes() {
    config.forEach(cfg => {
      const input = document.getElementById(cfg.search);
      const sugBox = document.getElementById(cfg.sug);

      input.addEventListener("input", () => {
        const keyword = input.value.toLowerCase();
        sugBox.innerHTML = "";
        if (!keyword) return;

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
            sugBox.innerHTML = "";
            addToTable(item);
          };
          sugBox.appendChild(div);
        });
      });

      input.addEventListener("blur", () => {
        setTimeout(() => {
          sugBox.innerHTML = "";
        }, 200);
      });
    });
  }

  function addToTable(item) {
    const index = config.findIndex(cfg => document.getElementById(cfg.search).value === item.アシスト名);
    if (index === -1) return;

    const tableBody = document.getElementById("resultTable").querySelector("tbody");
    const rows = tableBody.querySelectorAll("tr");

    rows[0].cells[index + 1].innerText = item.アシスト名;
    rows[1].cells[index + 1].innerText = item.レベル;
    rows[2].cells[index + 1].innerText = item.DS値;
    rows[3].cells[index + 1].innerText = item.カテゴリ;

    updateSummaryTable();
  }

  function updateSummaryTable() {
    const tableBody = document.getElementById("resultTable").querySelector("tbody");
    const levelRow = tableBody.querySelectorAll("tr")[1].cells;
    const dsRow = tableBody.querySelectorAll("tr")[2].cells;

    const levels = [];
    const dsValues = [];

    for (let i = 1; i < levelRow.length; i++) {
      const level = parseInt(levelRow[i].innerText);
      const ds = parseFloat(dsRow[i].innerText);
      if (!isNaN(level) && !isNaN(ds)) {
        levels.push(level);
        dsValues.push(ds);
      }
    }

    const summaryCells = document.querySelector("#summaryTable tbody tr").cells;
    for (let i = 1; i <= 8; i++) {
      summaryCells[i].innerText = "0";
    }

    for (let i = 1; i <= 8; i++) {
      let total = 0;
      for (let j = 0; j < levels.length; j++) {
        if (levels[j] <= i) {
          total += dsValues[j];
        }
      }
      summaryCells[i].innerText = total;
    }

    // 評価行取得
    const judgeRow = document.getElementById("judgeRow");
    const castName = document.getElementById("castSelect").value;

    if (!castName) {
    for (let i = 1; i <= 8; i++) {
        judgeRow.cells[i].innerText = "";
        judgeRow.cells[i].style.color = "";
    }
    judgeRow.cells[0].innerText = "評価";
    return;
    }

    const cast = castData.find(c => c.キャスト === castName);
    if (!cast) return;

    judgeRow.cells[0].innerText = `評価`;

    for (let i = 2; i <= 7; i++) {
    const required = parseFloat(cast[i]);
    const actual = parseFloat(summaryCells[i].innerText);
    const diff = actual - required;
    const cell = judgeRow.cells[i];

    if (actual >= required) {
        cell.innerText = `+${Math.round(diff)}`;
        cell.style.color = "green";
    } else {
        cell.innerText = `${Math.round(diff)}`;
        cell.style.color = "red";
    }
    }

    // 1列目（レベル1）と8列目（レベル8）は比較対象外として空欄
    judgeRow.cells[1].innerText = "-";
    judgeRow.cells[8].innerText = "-";

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

  // --- グローバルデータ ---
  let dataA = [], dataB = [], castData = [];

  const config = [
    { search: "search1", sug: "sug1", det: "det1", source: "a", filter: () => true },
    { search: "search2", sug: "sug2", det: "det2", source: "a", filter: () => true },
    { search: "search3", sug: "sug3", det: "det3", source: "a", filter: () => true },
    { search: "search4", sug: "sug4", det: "det4", source: "a", filter: item => item.レベル >= 6 },
    { search: "search5", sug: "sug5", det: "det5", source: "b", filter: () => true }
  ];

  // --- データ読み込み ---
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
