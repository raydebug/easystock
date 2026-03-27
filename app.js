const UI_TEXT = {
  zh: {
    title: "股票研究报告中心",
    empty: "暂无报告，请先运行 `python scripts/build_pages.py` 生成。",
    reportCount: "份报告",
    reportClose: "报告日收盘",
    currentPrice: "当前价格",
    priceDiff: "价格差",
    loadFailed: "加载失败",
  },
  en: {
    title: "Stock Research Report Center",
    empty: "No reports yet. Run `python scripts/build_pages.py` first.",
    reportCount: "reports",
    reportClose: "Close On Report Date",
    currentPrice: "Current Price",
    priceDiff: "Price Change",
    loadFailed: "Load failed",
  },
};

function getUiLang() {
  const lang = localStorage.getItem("ui_lang") || "zh";
  return ["zh", "en"].includes(lang) ? lang : "zh";
}

function setUiLang(lang) {
  localStorage.setItem("ui_lang", lang);
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

async function renderHome() {
  const lang = getUiLang();
  const t = UI_TEXT[lang];

  document.getElementById("home-title").textContent = t.title;

  const root = document.getElementById("report-list");
  const resp = await fetch("./data/reports.json");
  const data = await resp.json();
  const reports = data.reports || [];

  if (reports.length === 0) {
    root.innerHTML = `<p>${t.empty}</p>`;
    return;
  }

  root.innerHTML = reports
    .map((item, idx) => {
      const decision = (item.decision || "UNKNOWN").toUpperCase();
      const cls = ["BUY", "SELL", "HOLD"].includes(decision)
        ? decision.toLowerCase()
        : "unknown";

      const pricing = item.pricing || {};
      const diffCls = trendClass(pricing.price_diff);

      const link = `./report.html?id=${idx}&file=final_trade_decision`;
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

  bindLangSwitch(() => {
    renderHome().catch((err) => {
      root.innerHTML = `<p>${t.loadFailed}: ${err.message}</p>`;
    });
  });
}

renderHome().catch((err) => {
  const lang = getUiLang();
  const t = UI_TEXT[lang];
  const root = document.getElementById("report-list");
  root.innerHTML = `<p>${t.loadFailed}: ${err.message}</p>`;
});
