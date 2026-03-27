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
    translating: "正在翻译...",
    translateFail: "翻译失败，显示原文。",
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
    translating: "Translating...",
    translateFail: "Translation failed, original shown.",
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

function sanitizeHtml(html) {
  return html
    .replaceAll("<script", "&lt;script")
    .replaceAll("</script>", "&lt;/script&gt;");
}

function normalizeName(name) {
  return (name || "").replaceAll("-", "_").toLowerCase();
}

function detectLang(text) {
  const zhCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  return zhCount > 20 ? "zh" : "en";
}

function splitTextForTranslate(text, maxLen = 1200) {
  const chunks = [];
  const lines = text.split("\n");
  let curr = "";

  for (const line of lines) {
    if ((curr + "\n" + line).length > maxLen && curr) {
      chunks.push(curr);
      curr = line;
    } else {
      curr = curr ? `${curr}\n${line}` : line;
    }
  }

  if (curr) {
    chunks.push(curr);
  }
  return chunks;
}

async function translateChunk(text, targetLang) {
  const url = "https://translate.googleapis.com/translate_a/single"
    + `?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`translate http ${resp.status}`);
  }
  const data = await resp.json();
  const rows = data?.[0] || [];
  return rows.map((x) => x?.[0] || "").join("");
}

async function translateText(text, targetLang, cacheKey) {
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return cached;
  }

  const chunks = splitTextForTranslate(text);
  const translatedChunks = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) {
      translatedChunks.push(chunk);
      continue;
    }
    const translated = await translateChunk(chunk, targetLang);
    translatedChunks.push(translated);
  }

  const merged = translatedChunks.join("\n");
  localStorage.setItem(cacheKey, merged);
  return merged;
}

function applyViewMode(mode) {
  const sourceWrap = document.getElementById("content").parentElement;
  const translatedWrap = document.getElementById("translated-wrap");

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

function renderModeTabs(uiLang, onChange) {
  const t = UI_TEXT[uiLang];
  const host = document.getElementById("view-mode");
  host.innerHTML = `
    <button class="mode-btn active" data-mode="source">${t.originalOnly}</button>
    <button class="mode-btn" data-mode="translated">${t.translatedOnly}</button>
    <button class="mode-btn" data-mode="both">${t.bilingual}</button>
  `;

  const buttons = host.querySelectorAll("button[data-mode]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
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
      return `<a class="${isActive ? "active" : ""}" href="${href}">${f.name}</a>`;
    })
    .join("");

  const mdResp = await fetch(`./${activeFile.path}`);
  const mdText = await mdResp.text();
  content.innerHTML = sanitizeHtml(marked.parse(mdText));

  translatedContent.innerHTML = `<p>${t.translating}</p>`;

  const srcLang = detectLang(mdText);
  const targetLang = srcLang === "zh" ? "en" : "zh-CN";
  const cacheKey = `tr:${activeFile.path}:${targetLang}`;

  try {
    const translated = await translateText(mdText, targetLang, cacheKey);
    translatedContent.innerHTML = sanitizeHtml(marked.parse(translated));
  } catch {
    translatedContent.innerHTML = `<p>${t.translateFail}</p>` + sanitizeHtml(marked.parse(mdText));
  }

  renderModeTabs(uiLang, (mode) => applyViewMode(mode));
  applyViewMode("source");
}

renderReport().catch((err) => {
  const uiLang = getUiLang();
  const t = UI_TEXT[uiLang];
  displayError(`${t.loadFailed}: ${err.message}`);
});
