const HISTORY_UI_TEXT = {
  zh: {
    title: "历史记录",
    missingUser: "未找到该用户历史记录。",
    loadFailed: "加载失败",
    back: "返回用户记录",
    settled: "已结算",
    winRate: "胜率",
    avgReturn: "平均收益",
    bestReturn: "最佳",
    worstReturn: "最差",
    entryDate: "建仓日",
    settleDate: "结算日",
    allSettledRecords: "已结算历史记录",
    noSettledRecords: "暂无已结算历史记录",
  },
  en: {
    title: "History",
    missingUser: "No settled history found for this user.",
    loadFailed: "Load failed",
    back: "Back to User Records",
    settled: "Settled",
    winRate: "Win Rate",
    avgReturn: "Avg Return",
    bestReturn: "Best",
    worstReturn: "Worst",
    entryDate: "Entry",
    settleDate: "Settle",
    allSettledRecords: "Settled History",
    noSettledRecords: "No settled history yet",
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

function renderSummaryHtml(stats, t) {
  return `
    <span>${t.settled}: <b>${stats.settled_count || 0}</b></span>
    <span>${t.winRate}: <b>${fmtPct(stats.win_rate_pct)}</b></span>
    <span>${t.avgReturn}: <b>${fmtPct(stats.avg_return_pct)}</b></span>
    <span>${t.bestReturn}: <b>${fmtPct(stats.best_return_pct)}</b></span>
    <span>${t.worstReturn}: <b>${fmtPct(stats.worst_return_pct)}</b></span>
  `;
}

function renderEntryHtml(item, t) {
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
        <span class="chip buy">${t.settled}</span>
        <span class="chip">${fmtPct(avg)}</span>
      </div>
      <h3>${pickTickerText(picks)}</h3>
      <p>${t.entryDate}: <strong>${item.entry_date || "--"}</strong></p>
      <p>${t.settleDate}: <strong>${item.settle_date || "--"}</strong></p>
      <div class="price-block">${rows}</div>
    </div>
  `;
}

function renderHistoryDetail(items, t) {
  const root = document.getElementById("history-detail");
  root.innerHTML = `
    <article class="user-detail-card">
      <h2>${t.allSettledRecords}</h2>
      ${items.length > 0
        ? `<div class="pick-entry-list">${items.map((item) => renderEntryHtml(item, t)).join("")}</div>`
        : `<p class="pick-empty">${t.noSettledRecords}</p>`}
    </article>
  `;
}

async function renderHistoryPage() {
  const lang = getUiLang();
  const t = HISTORY_UI_TEXT[lang];
  const root = document.getElementById("history-detail");
  bindLangSwitch(() => {
    renderHistoryPage().catch((err) => {
      root.innerHTML = `<p>${t.loadFailed}: ${err.message}</p>`;
    });
  });

  const userId = userIdFromUrl();
  const backLink = document.getElementById("back-link");
  backLink.href = `./user.html?user_id=${encodeURIComponent(userId)}`;
  backLink.textContent = t.back;

  const resp = await fetch(`./data/picks.json?t=${Date.now()}`, { cache: "no-store" });
  const data = await resp.json();
  const history = Array.isArray(data.history) ? data.history : [];
  const statsRows = Array.isArray(data.user_stats) ? data.user_stats : [];
  const items = history
    .filter((item) => Number.parseInt(item.user_id || 0, 10) === userId)
    .filter((item) => String(item.status || "").toLowerCase() === "settled")
    .sort((a, b) => String(b.entry_date || "").localeCompare(String(a.entry_date || "")));
  const stats = statsRows.find((item) => Number.parseInt(item.user_id || 0, 10) === userId) || items[0] || null;

  if (!stats) {
    document.getElementById("history-title").textContent = t.title;
    document.getElementById("history-summary").innerHTML = "";
    root.innerHTML = `<p>${t.missingUser}</p>`;
    return;
  }

  const name = String(stats.display_name || `User ${userId}`).trim();
  document.title = `${name} ${t.title} - Easy Stock`;
  document.getElementById("history-title").textContent = `${name} ${t.title}`;
  document.getElementById("history-summary").innerHTML = renderSummaryHtml(stats, t);
  renderHistoryDetail(items, t);
}

renderHistoryPage().catch((err) => {
  const lang = getUiLang();
  const t = HISTORY_UI_TEXT[lang];
  document.getElementById("history-detail").innerHTML = `<p>${t.loadFailed}: ${err.message}</p>`;
});
