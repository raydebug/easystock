const UI_TEXT = {
  zh: {
    title: "Easy Stock",
    empty: "暂无报告，请先运行 `python scripts/build_pages.py` 生成。",
    reportCount: "份报告",
    reportClose: "报告日收盘",
    currentPrice: "当前价格",
    priceDiff: "价格差",
    disclaimer: "所有内容由 AI 生成，仅用于学习，不构成任何投资建议。",
    loadFailed: "加载失败",
    queued: "排队中",
    queuedDesc: "该报告已进入队列，等待前序任务完成。",
    generating: "正在生成",
    generatingDesc: "该报告正在生成中，请稍后刷新。",
    failed: "生成失败",
    failedDesc: "生成失败，请检查日志后重试。",
    progress: "进度",
    elapsed: "已耗时",
    filterLabel: "市场过滤",
    filterAll: "全部",
    filterUs: "美股",
    filterAu: "澳股",
    filterOther: "其他地区",
    keywordLabel: "关键词",
    keywordPlaceholder: "输入代码/日期/状态",
    pnlTitle: "报告盈亏指数",
    pnlIndex: "指数",
    pnlSamples: "样本",
    pnlWins: "正确",
    pnlLosses: "错误",
    agents: "代理",
    llmCalls: "LLM调用",
    toolCalls: "工具调用",
    tokens: "Token",
    reports: "报告",
  },
  en: {
    title: "Easy Stock",
    empty: "No reports yet. Run `python scripts/build_pages.py` first.",
    reportCount: "reports",
    reportClose: "Close On Report Date",
    currentPrice: "Current Price",
    priceDiff: "Price Change",
    disclaimer: "All content is AI-generated for learning only and does not constitute investment advice.",
    loadFailed: "Load failed",
    queued: "Queued",
    queuedDesc: "This report is queued and waiting for previous tasks.",
    generating: "Generating",
    generatingDesc: "This report is being generated. Please refresh later.",
    failed: "Failed",
    failedDesc: "Generation failed. Check logs and retry.",
    progress: "Progress",
    elapsed: "Elapsed",
    filterLabel: "Market Filter",
    filterAll: "All",
    filterUs: "US",
    filterAu: "AU",
    filterOther: "Other",
    keywordLabel: "Keyword",
    keywordPlaceholder: "ticker/date/status",
    pnlTitle: "Report PnL Index",
    pnlIndex: "Index",
    pnlSamples: "Samples",
    pnlWins: "Wins",
    pnlLosses: "Losses",
    agents: "Agents",
    llmCalls: "LLM Calls",
    toolCalls: "Tool Calls",
    tokens: "Tokens",
    reports: "Reports",
  },
};

function getUiLang() {
  const lang = localStorage.getItem("ui_lang") || "zh";
  return ["zh", "en"].includes(lang) ? lang : "zh";
}

function setUiLang(lang) {
  localStorage.setItem("ui_lang", lang);
}

function getMarketFilter() {
  const filter = localStorage.getItem("market_filter") || "all";
  return ["all", "us", "au", "other"].includes(filter) ? filter : "all";
}

function setMarketFilter(filter) {
  localStorage.setItem("market_filter", filter);
}

function getKeywordFilter() {
  return (localStorage.getItem("keyword_filter") || "").trim();
}

function setKeywordFilter(keyword) {
  localStorage.setItem("keyword_filter", keyword);
}

function classifyMarket(ticker) {
  const symbol = String(ticker || "").toUpperCase();
  if (symbol.endsWith(".AX")) {
    return "au";
  }
  if (symbol.includes(".")) {
    return "other";
  }
  return "us";
}

function fmtPrice(v) {
  return typeof v === "number" ? `$${v.toFixed(2)}` : "--";
}

function fmtDiff(v, pct) {
  if (typeof v !== "number") {
    return "--";
  }
  const sign = v > 0 ? "+" : "";
  const pctText = typeof pct === "number" ? ` (${sign}${pct.toFixed(2)}%)` : "";
  return `${sign}${v.toFixed(2)}${pctText}`;
}

function trendClass(v) {
  if (typeof v !== "number" || v === 0) {
    return "flat";
  }
  return v > 0 ? "up" : "down";
}

function fmtPct(v) {
  if (typeof v !== "number") {
    return "--";
  }
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function renderPnlSummary(summary, t) {
  const holder = document.getElementById("pnl-summary");
  if (!holder) {
    return;
  }
  const indexVal = fmtPct(summary && summary.pnl_index);
  const count = (summary && typeof summary.valid_reports === "number") ? summary.valid_reports : 0;
  const wins = (summary && typeof summary.wins === "number") ? summary.wins : 0;
  const losses = (summary && typeof summary.losses === "number") ? summary.losses : 0;
  holder.innerHTML = `
    <strong>${t.pnlTitle}</strong>
    <span>${t.pnlIndex}: <b>${indexVal}</b></span>
    <span>${t.pnlSamples}: <b>${count}</b></span>
    <span>${t.pnlWins}: <b>${wins}</b></span>
    <span>${t.pnlLosses}: <b>${losses}</b></span>
  `;
}

function computePnlSummaryFallback(reports) {
  const holdBand = 1.0;
  const scores = [];
  let wins = 0;
  let losses = 0;

  (reports || []).forEach((item) => {
    const status = String(item.status || "").toLowerCase();
    if (["queued", "generating", "failed"].includes(status)) {
      return;
    }
    const decision = String(item.decision || "UNKNOWN").toUpperCase();
    const pricing = item.pricing || {};
    const pct = pricing.price_diff_pct;
    if (typeof pct !== "number") {
      return;
    }

    let score = null;
    if (decision === "BUY") {
      score = pct > 0 ? Math.abs(pct) : -Math.abs(pct);
    } else if (decision === "SELL") {
      score = pct < 0 ? Math.abs(pct) : -Math.abs(pct);
    } else if (decision === "HOLD") {
      const move = Math.abs(pct);
      score = move <= holdBand ? (holdBand - move) : -move;
    }

    if (typeof score !== "number") {
      return;
    }
    scores.push(score);
    if (score > 0) wins += 1;
    if (score < 0) losses += 1;
  });

  const count = scores.length;
  const pnlIndex = count > 0 ? (scores.reduce((a, b) => a + b, 0) / count) : null;
  return {
    pnl_index: pnlIndex,
    valid_reports: count,
    wins,
    losses,
  };
}

function formatElapsed(seconds) {
  if (typeof seconds !== "number") {
    return "--";
  }
  const sec = Math.max(0, Math.floor(seconds));
  const s = sec % 60;
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600);
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function bindLangSwitch(render) {
  const lang = getUiLang();
  const holder = document.getElementById("lang-switch");
  const buttons = holder.querySelectorAll("button[data-lang]");

  buttons.forEach((btn) => {
    const isActive = btn.dataset.lang === lang;
    btn.classList.toggle("active", isActive);
    btn.addEventListener("click", () => {
      setUiLang(btn.dataset.lang);
      render();
    });
  });
}

function bindMarketFilter(render, t) {
  const select = document.getElementById("market-filter");
  const label = document.getElementById("market-filter-label");
  label.textContent = t.filterLabel;

  const options = {
    all: t.filterAll,
    us: t.filterUs,
    au: t.filterAu,
    other: t.filterOther,
  };

  select.querySelectorAll("option").forEach((opt) => {
    const key = opt.value;
    if (options[key]) {
      opt.textContent = options[key];
    }
  });

  select.value = getMarketFilter();
  select.onchange = () => {
    setMarketFilter(select.value);
    render();
  };
}

function bindKeywordFilter(render, t) {
  const input = document.getElementById("keyword-filter");
  const label = document.getElementById("keyword-filter-label");
  label.textContent = t.keywordLabel;
  input.placeholder = t.keywordPlaceholder;
  input.value = getKeywordFilter();
  input.oninput = () => {
    setKeywordFilter(input.value);
    render();
  };
}

function reportMatchesKeyword(item, keyword) {
  if (!keyword) {
    return true;
  }
  const key = keyword.toLowerCase();
  const status = String(item.status || "").toLowerCase();
  const decision = String(item.decision || "").toLowerCase();
  const haystack = [
    String(item.ticker || ""),
    String(item.company_name || ""),
    String(item.date || ""),
    status,
    decision,
    String(item.phase || ""),
    String(item.message || ""),
  ].join(" ").toLowerCase();
  return haystack.includes(key);
}

function renderStatusCard(item, t, status) {
  const isFailed = status === "failed";
  const isQueued = status === "queued";
  const statusLabel = isFailed ? t.failed : (isQueued ? t.queued : t.generating);
  const statusDesc = isFailed ? t.failedDesc : (isQueued ? t.queuedDesc : t.generatingDesc);
  const msg = item.message ? `<p class="status-message">${item.message}</p>` : "";
  const progress = typeof item.progress_pct === "number" ? Math.max(0, Math.min(100, item.progress_pct)) : null;
  const progressText = progress !== null ? `${progress.toFixed(1)}%` : "--";
  const elapsedText = formatElapsed(item.elapsed_seconds);
  const progressBar = progress !== null
    ? `<div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>`
    : "";
  const stats = (item && typeof item.stats === "object" && item.stats) ? item.stats : null;
  const statsHtml = stats
    ? `
      <div class="status-stats">
        <p><strong>${t.agents}:</strong> ${stats.agents_done ?? 0}/${stats.agents_total ?? 0}</p>
        <p><strong>${t.llmCalls}:</strong> ${stats.llm_calls ?? 0}</p>
        <p><strong>${t.toolCalls}:</strong> ${stats.tool_calls ?? 0}</p>
        <p><strong>${t.tokens}:</strong> ${stats.tokens_in_text ?? "0"}↑ ${stats.tokens_out_text ?? "0"}↓</p>
        <p><strong>${t.reports}:</strong> ${stats.reports_done ?? 0}/${stats.reports_total ?? 0}</p>
      </div>
    `
    : "";

  return `
    <div class="card card-status ${status}">
      <div class="card-top">
        <span class="chip ${isFailed ? "sell" : "hold"}">${statusLabel}</span>
      </div>
      <h3>${item.ticker}</h3>
      ${item.company_name ? `<p class="company-name">${item.company_name}</p>` : ""}
      <p>${item.date}</p>
      <div class="price-block">
        <p>${statusDesc}</p>
        <p><strong>${t.progress}:</strong> ${progressText}</p>
        <p><strong>${t.elapsed}:</strong> ${elapsedText}</p>
        ${statsHtml}
        ${progressBar}
        ${msg}
      </div>
    </div>
  `;
}

async function renderHome() {
  const lang = getUiLang();
  const t = UI_TEXT[lang];

  document.getElementById("home-title").textContent = t.title;
  document.getElementById("disclaimer-banner").textContent = t.disclaimer;

  const root = document.getElementById("report-list");
  const resp = await fetch("./data/reports.json");
  const data = await resp.json();
  const reports = data.reports || [];

  bindLangSwitch(() => {
    renderHome().catch((err) => {
      root.innerHTML = `<p>${t.loadFailed}: ${err.message}</p>`;
    });
  });
  bindMarketFilter(() => {
    renderHome().catch((err) => {
      root.innerHTML = `<p>${t.loadFailed}: ${err.message}</p>`;
    });
  }, t);
  bindKeywordFilter(() => {
    renderHome().catch((err) => {
      root.innerHTML = `<p>${t.loadFailed}: ${err.message}</p>`;
    });
  }, t);

  const selectedMarket = getMarketFilter();
  const keyword = getKeywordFilter();
  const marketFiltered = reports.filter((item) => {
    if (selectedMarket !== "all" && classifyMarket(item.ticker) !== selectedMarket) {
      return false;
    }
    return true;
  });
  const filtered = marketFiltered.filter((item) => reportMatchesKeyword(item, keyword));
  renderPnlSummary(computePnlSummaryFallback(marketFiltered), t);

  if (filtered.length === 0) {
    root.innerHTML = `<p>${t.empty}</p>`;
    return;
  }

  root.innerHTML = filtered
    .map((item) => {
      const status = (item.status || "").toLowerCase();
      if (status === "queued" || status === "generating" || status === "failed") {
        return renderStatusCard(item, t, status);
      }

      const decision = (item.decision || "UNKNOWN").toUpperCase();
      const cls = ["BUY", "SELL", "HOLD"].includes(decision)
        ? decision.toLowerCase()
        : "unknown";

      const pricing = item.pricing || {};
      const diffCls = trendClass(pricing.price_diff);
      const originalIdx = reports.indexOf(item);
      const link = `./report.html?id=${originalIdx}&file=final_trade_decision`;

      return `
        <a class="card" href="${link}">
          <div class="card-top">
            <span class="chip ${cls}">${decision}</span>
          </div>
          <h3>${item.ticker}</h3>
          ${item.company_name ? `<p class="company-name">${item.company_name}</p>` : ""}
          <p>${item.date}</p>
          <div class="price-block">
            <p>${t.reportClose}：<strong>${fmtPrice(pricing.report_close)}</strong></p>
            <p>${t.currentPrice}：<strong>${fmtPrice(pricing.current_price)}</strong></p>
            <p class="price-diff ${diffCls}">${t.priceDiff}：<strong>${fmtDiff(pricing.price_diff, pricing.price_diff_pct)}</strong></p>
          </div>
          <p>${item.files.length} ${t.reportCount}</p>
        </a>
      `;
    })
    .join("");
}

renderHome().catch((err) => {
  const lang = getUiLang();
  const t = UI_TEXT[lang];
  const root = document.getElementById("report-list");
  root.innerHTML = `<p>${t.loadFailed}: ${err.message}</p>`;
});
