const UI_TEXT = {
  zh: {
    back: "← 返回报告列表",
    detailTitle: "报告详情",
    notFound: "未找到对应报告项。",
    noContent: "该报告没有可展示内容。",
    source: "原文",
    translated: "译文",
    originalOnly: "仅原文",
    translatedOnly: "仅译文",
    bilingual: "双语",
    noTranslation: "当前报告暂无离线译文。",
    loadFailed: "加载失败",
  },
  en: {
    back: "← Back To Reports",
    detailTitle: "Report Detail",
    notFound: "Report item not found.",
    noContent: "No report content available.",
    source: "Original",
    translated: "Translation",
    originalOnly: "Original",
    translatedOnly: "Translation",
    bilingual: "Bilingual",
    noTranslation: "No offline translation for this report yet.",
    loadFailed: "Load failed",
  },
};

const REPORT_NAME_MAP = {
  final_trade_decision: { zh: "最终交易决策", en: "Final Trade Decision" },
  fundamentals_report: { zh: "基本面报告", en: "Fundamentals Report" },
  hot_news_since_last_report: { zh: "自上次报告以来的热点新闻", en: "Hot News Since Last Report" },
  investment_plan: { zh: "研究计划", en: "Investment Plan" },
  market_report: { zh: "市场报告", en: "Market Report" },
  news_report: { zh: "新闻报告", en: "News Report" },
  sentiment_report: { zh: "情绪报告", en: "Sentiment Report" },
  trader_investment_plan: { zh: "交易员计划", en: "Trader Investment Plan" },
};

function getUiLang() {
  const lang = localStorage.getItem("ui_lang") || "zh";
  return ["zh", "en"].includes(lang) ? lang : "zh";
}

function setUiLang(lang) {
  localStorage.setItem("ui_lang", lang);
}

function sanitizeHtml(html) {
  return html
    .replaceAll("<script", "&lt;script")
    .replaceAll("</script>", "&lt;/script&gt;");
}

function normalizeName(name) {
  return (name || "").replaceAll("-", "_").toLowerCase();
}

function localizeReportName(name, lang) {
  const key = normalizeName(name);
  const mapped = REPORT_NAME_MAP[key];
  if (mapped && mapped[lang]) {
    return mapped[lang];
  }
  return key.replaceAll("_", " ");
}

function applyViewMode(mode, hasTranslation) {
  const sourceWrap = document.getElementById("content").parentElement;
  const translatedWrap = document.getElementById("translated-wrap");

  if (!hasTranslation) {
    sourceWrap.style.display = "block";
    translatedWrap.style.display = "none";
    return;
  }

  if (mode === "source") {
    sourceWrap.style.display = "block";
    translatedWrap.style.display = "none";
    return;
  }

  if (mode === "translated") {
    sourceWrap.style.display = "none";
    translatedWrap.style.display = "block";
    return;
  }

  sourceWrap.style.display = "block";
  translatedWrap.style.display = "block";
}

function renderModeTabs(uiLang, hasTranslation, defaultMode, onChange) {
  const t = UI_TEXT[uiLang];
  const host = document.getElementById("view-mode");
  host.innerHTML = `
    <button class="mode-btn ${defaultMode === "source" ? "active" : ""}" data-mode="source">${t.originalOnly}</button>
    <button class="mode-btn ${defaultMode === "translated" ? "active" : ""}" data-mode="translated" ${hasTranslation ? "" : "disabled"}>${t.translatedOnly}</button>
    <button class="mode-btn ${defaultMode === "both" ? "active" : ""}" data-mode="both" ${hasTranslation ? "" : "disabled"}>${t.bilingual}</button>
  `;

  const buttons = host.querySelectorAll("button[data-mode]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) {
        return;
      }
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      onChange(btn.dataset.mode);
    });
  });
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

function displayError(msg) {
  const content = document.getElementById("content");
  content.innerHTML = `<p>${msg}</p>`;
}

async function renderReport() {
  const uiLang = getUiLang();
  const t = UI_TEXT[uiLang];

  document.getElementById("back-link").textContent = t.back;
  document.getElementById("title").textContent = t.detailTitle;
  document.getElementById("source-title").textContent = t.source;
  document.getElementById("translated-title").textContent = t.translated;

  bindLangSwitch(() => {
    renderReport().catch((err) => displayError(`${t.loadFailed}: ${err.message}`));
  });

  const params = new URLSearchParams(location.search);
  const id = Number(params.get("id") || 0);
  const selected = normalizeName(params.get("file") || "final_trade_decision");

  const meta = document.getElementById("meta");
  const tabs = document.getElementById("tabs");
  const content = document.getElementById("content");
  const translatedContent = document.getElementById("translated-content");

  const resp = await fetch("./data/reports.json");
  const data = await resp.json();
  const reports = data.reports || [];

  const item = reports[id];
  if (!item) {
    displayError(t.notFound);
    return;
  }

  meta.textContent = `${item.ticker} · ${item.date}`;

  const files = item.files || [];
  if (files.length === 0) {
    displayError(t.noContent);
    return;
  }

  const activeFile = files.find((f) => normalizeName(f.name) === selected) || files[0];

  tabs.innerHTML = files
    .map((f) => {
      const norm = normalizeName(f.name);
      const isActive = norm === normalizeName(activeFile.name);
      const href = `./report.html?id=${id}&file=${encodeURIComponent(norm)}`;
      const label = localizeReportName(f.name, uiLang);
      return `<a class="${isActive ? "active" : ""}" href="${href}">${label}</a>`;
    })
    .join("");

  const mdResp = await fetch(`./${activeFile.path}`);
  const mdText = await mdResp.text();
  content.innerHTML = sanitizeHtml(marked.parse(mdText));

  let hasTranslation = false;
  if (activeFile.translated_path) {
    try {
      const trResp = await fetch(`./${activeFile.translated_path}`);
      if (trResp.ok) {
        const trText = await trResp.text();
        translatedContent.innerHTML = sanitizeHtml(marked.parse(trText));
        hasTranslation = true;
      }
    } catch {
      hasTranslation = false;
    }
  }

  if (!hasTranslation) {
    translatedContent.innerHTML = `<p>${t.noTranslation}</p>`;
  }

  const defaultMode = hasTranslation && uiLang === "zh" ? "translated" : "source";
  renderModeTabs(uiLang, hasTranslation, defaultMode, (mode) => applyViewMode(mode, hasTranslation));
  applyViewMode(defaultMode, hasTranslation);
}

renderReport().catch((err) => {
  const uiLang = getUiLang();
  const t = UI_TEXT[uiLang];
  displayError(`${t.loadFailed}: ${err.message}`);
});
