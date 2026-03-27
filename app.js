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

async function main() {
  const root = document.getElementById("report-list");
  const resp = await fetch("./data/reports.json");
  const data = await resp.json();
  const reports = data.reports || [];

  if (reports.length === 0) {
    root.innerHTML = "<p>暂无报告，请先运行 `python scripts/build_pages.py` 生成。</p>";
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
            <p>报告日收盘：<strong>${fmtPrice(pricing.report_close)}</strong></p>
            <p>当前价格：<strong>${fmtPrice(pricing.current_price)}</strong></p>
            <p class="price-diff ${diffCls}">价格差：<strong>${fmtDiff(pricing.price_diff, pricing.price_diff_pct)}</strong></p>
          </div>
          <p>${item.files.length} 份报告</p>
        </a>
      `;
    })
    .join("");
}

main().catch((err) => {
  const root = document.getElementById("report-list");
  root.innerHTML = `<p>加载失败：${err.message}</p>`;
});
