const USER_UI_TEXT = {
  zh: {
    title: "用户记录",
    missingUser: "未找到该用户记录。",
    loadFailed: "加载失败",
    entries: "参与",
    active: "进行中",
    winRate: "胜率",
    avgReturn: "平均收益",
    bestReturn: "最佳",
    worstReturn: "最差",
    entryDate: "建仓日",
    settleDate: "结算日",
    allRecords: "选股信息",
    currentPicks: "当前选股",
    historicalSummary: "历史成绩汇总",
    viewHistoricalRecords: "查看已结算历史记录",
    noCurrentPicks: "暂无进行中的选股",
  },
  en: {
    title: "User Records",
    missingUser: "No records found for this user.",
    loadFailed: "Load failed",
    entries: "Entries",
    active: "Active",
    winRate: "Win Rate",
    avgReturn: "Avg Return",
    bestReturn: "Best",
    worstReturn: "Worst",
    entryDate: "Entry",
    settleDate: "Settle",
    allRecords: "Pick Info",
    currentPicks: "Current Picks",
    historicalSummary: "Historical Summary",
    viewHistoricalRecords: "View Settled History",
    noCurrentPicks: "No active picks",
  },
};

function getUiLang() {
  const lang = localStorage.getItem("ui_lang") || "zh";
  return ["zh", "en"].includes(lang) ? lang : "zh";
}

function setUiLang(lang) {
  localStorage.setItem("ui_lang", lang);
}

function bindLangSwitch(render) {
  const lang = getUiLang();
  const holder = document.getElementById("lang-switch");
  holder.querySelectorAll("button[data-lang]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
    btn.onclick = () => {
      setUiLang(btn.dataset.lang);
      render();
    };
  });
}

function fmtPct(v) {
  if (typeof v !== "number") {
    return "--";
  }
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function trendClass(v) {
  if (typeof v !== "number" || v === 0) {
    return "flat";
  }
  return v > 0 ? "up" : "down";
}

function userIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("user_id") || "";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickTickerText(picks) {
  if (!Array.isArray(picks)) {
    return "";
  }
  return picks.map((pick) => String(pick.ticker || "").toUpperCase()).filter(Boolean).join(", ");
}

function renderEntryHtml(item, t) {
  const status = String(item.status || "").toLowerCase();
  const avg = item.avg_return_pct;
  const picks = Array.isArray(item.picks) ? item.picks : [];
  const rows = picks.map((pick) => `
    <div class="pick-row">
      <span>${String(pick.ticker || "").toUpperCase()}</span>
      <strong class="price-diff ${trendClass(pick.return_pct)}">${fmtPct(pick.return_pct)}</strong>
    </div>
  `).join("");
  return `
    <div class="pick-entry">
      <div class="card-top">
        <span class="chip ${status === "settled" ? "buy" : "hold"}">${status || "--"}</span>
        <span class="chip">${fmtPct(avg)}</span>
      </div>
      <h3>${pickTickerText(picks)}</h3>
      <p>${t.entryDate}: <strong>${item.entry_date || "--"}</strong></p>
      <p>${t.settleDate}: <strong>${item.settle_date || "--"}</strong></p>
      <div class="price-block">${rows}</div>
    </div>
  `;
}

function renderCurrentPicksHtml(items, t) {
  return `
    <section class="pick-record-group">
      <h3>${t.currentPicks}</h3>
      ${items.length > 0
        ? `<div class="pick-entry-list">${items.map((item) => renderEntryHtml(item, t)).join("")}</div>`
        : `<p class="pick-empty">${t.noCurrentPicks}</p>`}
    </section>
  `;
}

function renderHistoricalSummaryHtml(stats, userId, t) {
  return `
    <section class="pick-record-group">
      <div class="pick-record-heading">
        <h3>${t.historicalSummary}</h3>
        <a class="inline-link" href="./user-history.html?user_id=${encodeURIComponent(userId)}">${t.viewHistoricalRecords}</a>
      </div>
      <div class="summary-bar user-detail-summary">
        <span>${t.entries}: <b>${stats.entry_count || 0}</b></span>
        <span>${t.winRate}: <b>${fmtPct(stats.win_rate_pct)}</b></span>
        <span>${t.avgReturn}: <b>${fmtPct(stats.avg_return_pct)}</b></span>
        <span>${t.bestReturn}: <b>${fmtPct(stats.best_return_pct)}</b></span>
        <span>${t.worstReturn}: <b>${fmtPct(stats.worst_return_pct)}</b></span>
      </div>
    </section>
  `;
}

function renderUserDetail(stats, items, t) {
  const root = document.getElementById("user-detail");
  const userId = Number.parseInt(stats.user_id || 0, 10) || userIdFromUrl();
  const activeItems = items.filter((item) => String(item.status || "").toLowerCase() === "active");
  root.innerHTML = `
    <article class="user-detail-card">
      <h2>${t.allRecords}</h2>
      <div class="pick-record-box">
        ${renderCurrentPicksHtml(activeItems, t)}
        ${renderHistoricalSummaryHtml(stats, userId, t)}
      </div>
    </article>
  `;
}

async function renderUserPage() {
  const lang = getUiLang();
  const t = USER_UI_TEXT[lang];
  const root = document.getElementById("user-detail");
  bindLangSwitch(() => {
    renderUserPage().catch((err) => {
      root.innerHTML = `<p>${t.loadFailed}: ${err.message}</p>`;
    });
  });

  const userId = userIdFromUrl();
  const resp = await fetch(`./data/picks.json?t=${Date.now()}`, { cache: "no-store" });
  const data = await resp.json();
  const history = Array.isArray(data.history) ? data.history : [];
  const statsRows = Array.isArray(data.user_stats) ? data.user_stats : [];
  const items = history
    .filter((item) => Number.parseInt(item.user_id || 0, 10) === userId)
    .sort((a, b) => String(b.entry_date || "").localeCompare(String(a.entry_date || "")));
  const stats = statsRows.find((item) => Number.parseInt(item.user_id || 0, 10) === userId) || items[0] || null;

  if (!stats) {
    document.getElementById("user-title").textContent = t.title;
    root.innerHTML = `<p>${t.missingUser}</p>`;
    return;
  }

  const name = String(stats.display_name || `User ${userId}`).trim();
  document.title = `${name} - Easy Stock`;
  document.getElementById("user-title").textContent = name;
  renderUserDetail(stats, items, t);
}

renderUserPage().catch((err) => {
  const lang = getUiLang();
  const t = USER_UI_TEXT[lang];
  document.getElementById("user-detail").innerHTML = `<p>${t.loadFailed}: ${err.message}</p>`;
});
