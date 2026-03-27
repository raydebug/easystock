function sanitizeHtml(html) {
  return html
    .replaceAll("<script", "&lt;script")
    .replaceAll("</script>", "&lt;/script&gt;");
}

function displayError(msg) {
  const content = document.getElementById("content");
  content.innerHTML = `<p>${msg}</p>`;
}

function normalizeName(name) {
  return (name || "").replaceAll("-", "_").toLowerCase();
}

async function main() {
  const params = new URLSearchParams(location.search);
  const id = Number(params.get("id") || 0);
  const selected = normalizeName(params.get("file") || "final_trade_decision");

  const meta = document.getElementById("meta");
  const title = document.getElementById("title");
  const tabs = document.getElementById("tabs");
  const content = document.getElementById("content");

  const resp = await fetch("./data/reports.json");
  const data = await resp.json();
  const reports = data.reports || [];

  const item = reports[id];
  if (!item) {
    displayError("未找到对应报告项。");
    return;
  }

  meta.textContent = `${item.ticker} · ${item.date}`;
  title.textContent = `${item.ticker} 报告详情`;

  const files = item.files || [];
  if (files.length === 0) {
    displayError("该报告没有可展示内容。");
    return;
  }

  const activeFile =
    files.find((f) => normalizeName(f.name) === selected) || files[0];

  tabs.innerHTML = files
    .map((f) => {
      const norm = normalizeName(f.name);
      const isActive = norm === normalizeName(activeFile.name);
      const href = `./report.html?id=${id}&file=${encodeURIComponent(norm)}`;
      return `<a class="${isActive ? "active" : ""}" href="${href}">${f.name}</a>`;
    })
    .join("");

  const mdResp = await fetch(`./${activeFile.path}`);
  const mdText = await mdResp.text();
  const html = marked.parse(mdText);
  content.innerHTML = sanitizeHtml(html);
}

main().catch((err) => displayError(`加载失败：${err.message}`));
