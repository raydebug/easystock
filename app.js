const UI_TEXT = {
  zh: {
    title: "股票研究报告中心",
    empty: "暂无报告，请先运行 `python scripts/build_pages.py` 生成。",
    reportCount: "份报告",
    reportClose: "报告日收盘",
    currentPrice: "当前价格",
    priceDiff: "价格差",
    loadFailed: "加载失败",
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
  },
  en: {
    title: "Stock Research Report Center",
    empty: "No reports yet. Run `python scripts/build_pages.py` first.",
    reportCount: "reports",
    reportClose: "Close On Report Date",
    currentPrice: "Current Price",
    priceDiff: "Price Change",
    loadFailed: "Load failed",
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

function renderStatusCard(item, t, status) {
  const isFailed = status === "failed";
  const statusLabel = isFailed ? t.failed : t.generating;
  const statusDesc = isFailed ? t.failedDesc : t.generatingDesc;
  const msg = item.message ? `<p class="status-message">${item.message}</p>` : "";
  const progress = typeof item.progress_pct === "number" ? Math.max(0, Math.min(100, item.progress_pct)) : null;
  const progressText = progress !== null ? `${progress.toFixed(1)}%` : "--";
  const elapsedText = formatElapsed(item.elapsed_seconds);
  const progressBar = progress !== null
    ? `<div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>`
    : "";

  return `
    <div class="card card-status ${status}">
      <div class="card-top">
        <span class="chip ${isFailed ? "sell" : "hold"}">${statusLabel}</span>
      </div>
      <h3>${item.ticker}</h3>
      <p>${item.date}</p>
      <div class="price-block">
        <p>${statusDesc}</p>
        <p><strong>${t.progress}:</strong> ${progressText}</p>
        <p><strong>${t.elapsed}:</strong> ${elapsedText}</p>
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

  const selectedMarket = getMarketFilter();
  const filtered = reports.filter((item) => {
    if (selectedMarket === "all") {
      return true;
    }
    return classifyMarket(item.ticker) === selectedMarket;
  });

  if (filtered.length === 0) {
    root.innerHTML = `<p>${t.empty}</p>`;
    return;
  }

  root.innerHTML = filtered
    .map((item, idx) => {
      const status = (item.status || "").toLowerCase();
      if (status === "generating" || status === "failed") {
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
