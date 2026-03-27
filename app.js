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

      const link = `./report.html?id=${idx}&file=final_trade_decision`;
      return `
        <a class="card" href="${link}">
          <span class="chip ${cls}">${decision}</span>
          <h3>${item.ticker}</h3>
          <p>${item.date}</p>
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
