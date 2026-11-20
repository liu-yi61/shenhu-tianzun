const app = document.querySelector("#app");
const header = document.querySelector("#site-header");
const searchDialog = document.querySelector("#search-dialog");
const settingsDialog = document.querySelector("#settings-dialog");
const searchInput = document.querySelector("#search-input");
const searchResults = document.querySelector("#search-results");
const searchHint = document.querySelector("#search-hint");

let siteData;
let revealObserver;

const defaultSettings = { theme: "dark", fontSize: 19, lineHeight: 1.9 };
const settings = { ...defaultSettings, ...JSON.parse(localStorage.getItem("shenhu-reading") || "{}") };

function escapeHtml(value = "") {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function padChapter(number) {
  return String(number).padStart(3, "0");
}

function applySettings() {
  const resolvedTheme = settings.theme === "system"
    ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : settings.theme;
  document.body.dataset.theme = resolvedTheme;
  document.documentElement.style.setProperty("--reader-size", `${settings.fontSize}px`);
  document.documentElement.style.setProperty("--reader-line", settings.lineHeight);
  document.querySelector("#font-range").value = settings.fontSize;
  document.querySelector("#line-range").value = settings.lineHeight;
  document.querySelector("#font-output").value = `${settings.fontSize}px`;
  document.querySelector("#line-output").value = Number(settings.lineHeight).toFixed(1);
  document.querySelectorAll("[data-theme-value]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeValue === settings.theme);
  });
  localStorage.setItem("shenhu-reading", JSON.stringify(settings));
}

function footer() {
  return `<footer class="site-footer">《神狐天尊》 · 作者 糖加三勺 · 玄墨仙宮小說專站</footer>`;
}

function latestChapter() {
  return siteData.chapters.reduce((latest, chapter) => chapter.number > latest.number ? chapter : latest, siteData.chapters[0]);
}

function renderHome() {
  const latest = latestChapter();
  const first = siteData.chapters[0];
  app.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <div class="hero-copy">
          <p class="eyebrow">A NOVEL BY 糖加三勺</p>
          <h1 class="hero-title">神狐<span>天尊</span></h1>
          <p class="hero-intro">不仙宗裡，令神狐與凌天宇曾以命相交。愛意、野心與登仙之路，終將同門誓言割成兩半。</p>
          <div class="hero-actions">
            <a class="primary-button" href="#/chapter/${first.number}">開始閱讀</a>
            <a class="ghost-button" href="#/volumes">展開卷冊</a>
          </div>
        </div>
      </div>
      <a class="scroll-cue" href="#/volumes">向下閱覽</a>
    </section>

    <section class="content-section" id="volumes">
      <div class="section-heading reveal">
        <div><p class="eyebrow">THE CELESTIAL ARCHIVE</p><h2>全書卷冊</h2></div>
        <p>全書採連續章號管理；每卷可獨立整理，首頁會依 Markdown 章節自動更新。</p>
      </div>
      <div class="volume-grid">
        ${siteData.volumes.map((volume, index) => `
          <a class="volume-card reveal" style="transition-delay:${index * 100}ms" href="#/volume/${volume.number}">
            <div class="cover-frame">
              <img src="${escapeHtml(volume.cover)}" alt="${escapeHtml(volume.title)}書封" loading="lazy" />
              <div class="cover-ornament"></div>
              <div class="cover-label"><small>VOLUME ${String(volume.number).padStart(2, "0")}</small><h3>${escapeHtml(volume.title)}</h3></div>
            </div>
            <div class="volume-meta"><strong>${escapeHtml(volume.subtitle)}</strong><span>已刊 ${volume.chapter_count} / ${volume.planned_chapters} 章</span></div>
          </a>`).join("")}
      </div>
    </section>

    <section class="content-section">
      <div class="latest-panel reveal">
        <div class="latest-mark"><span class="latest-number">${padChapter(latest.number)}</span></div>
        <div class="latest-copy">
          <p class="eyebrow">LATEST CHAPTER</p>
          <h2>${escapeHtml(latest.title)}</h2>
          <p>${escapeHtml(latest.excerpt)}</p>
          <a class="ghost-button" href="#/chapter/${latest.number}">閱讀最新章節</a>
        </div>
      </div>
    </section>
    ${footer()}`;
  setupReveal();
}

function renderVolume(volumeNumber) {
  const volume = siteData.volumes.find((item) => item.number === volumeNumber);
  if (!volume) return renderNotFound();
  const chapters = siteData.chapters.filter((chapter) => chapter.volume === volumeNumber);
  app.innerHTML = `
    <section class="page-shell">
      <header class="page-heading">
        <p class="eyebrow">VOLUME ${String(volume.number).padStart(2, "0")}</p>
        <h1>${escapeHtml(volume.title)}</h1>
        <p>${escapeHtml(volume.subtitle)}</p>
      </header>
      <div class="chapter-list">
        ${chapters.length ? chapters.map((chapter) => `
          <a class="chapter-row" href="#/chapter/${chapter.number}">
            <span class="chapter-row-number">${padChapter(chapter.number)}</span>
            <span class="chapter-row-title">${escapeHtml(chapter.title)}</span>
            <span class="chapter-row-meta">第 ${chapter.number} 章</span>
          </a>`).join("") : `<div class="empty-state"><strong>此卷尚待落筆</strong><span>加入 Markdown 章節後，這裡會自動更新。</span></div>`}
      </div>
    </section>${footer()}`;
}

function renderReader(chapterNumber) {
  const chapterIndex = siteData.chapters.findIndex((item) => item.number === chapterNumber);
  if (chapterIndex < 0) return renderNotFound();
  const chapter = siteData.chapters[chapterIndex];
  const previous = siteData.chapters[chapterIndex - 1];
  const next = siteData.chapters[chapterIndex + 1];
  document.title = `${chapter.title}｜神狐天尊`;
  app.innerHTML = `
    <div class="progress-line" aria-hidden="true"></div>
    <section class="reader-shell">
      <header class="reader-header">
        <p class="eyebrow">${escapeHtml(chapter.volume_title)} · CHAPTER ${padChapter(chapter.number)}</p>
        <h1>${escapeHtml(chapter.title)}</h1>
        <p>${escapeHtml(chapter.date || "未標註日期")}</p>
      </header>
      <article class="reader-article">${chapter.html}</article>
      <nav class="reader-nav" aria-label="章節導覽">
        ${previous ? `<a href="#/chapter/${previous.number}">前章 · ${escapeHtml(previous.title)}</a>` : `<span></span>`}
        <a class="toc-link" href="#/volume/${chapter.volume}">章目</a>
        ${next ? `<a href="#/chapter/${next.number}">${escapeHtml(next.title)} · 後章</a>` : `<span></span>`}
      </nav>
    </section>${footer()}`;
  updateReadingProgress();
}

function renderCharacters() {
  const cards = siteData.characters.length
    ? siteData.characters.map((character) => `<article class="character-card"><p class="eyebrow">${escapeHtml(character.role || "人物")}</p><h2>${escapeHtml(character.name)}</h2><p>${escapeHtml(character.summary || "設定待補")}</p></article>`).join("")
    : `<div class="empty-state"><strong>人物誌尚待作者題名</strong><span>在 data/characters.json 新增資料後，人物卡片會自動出現；網站不預設故事角色。</span></div>`;
  app.innerHTML = `
    <section class="page-shell">
      <header class="page-heading"><p class="eyebrow">CHARACTER ARCHIVE</p><h1>人物誌</h1><p>角色、門派與關係由作者自行定稿。</p></header>
      <div class="character-grid">${cards}</div>
    </section>${footer()}`;
}

function renderNotFound() {
  app.innerHTML = `<section class="page-shell"><div class="empty-state"><strong>此頁已隱入雲海</strong><a class="text-button" href="#/">返回卷冊首頁</a></div></section>`;
}

function route() {
  const path = location.hash.slice(1) || "/";
  window.scrollTo(0, 0);
  document.title = "神狐天尊｜玄墨仙宮";
  document.querySelectorAll("[data-nav]").forEach((link) => link.removeAttribute("aria-current"));
  if (path === "/" || path === "/volumes") {
    document.querySelector('[data-nav="home"]').setAttribute("aria-current", "page");
    renderHome();
    if (path === "/volumes") requestAnimationFrame(() => document.querySelector("#volumes")?.scrollIntoView());
  } else if (path === "/characters") {
    document.querySelector('[data-nav="characters"]').setAttribute("aria-current", "page");
    renderCharacters();
  } else if (/^\/volume\/\d+$/.test(path)) {
    renderVolume(Number(path.split("/").pop()));
  } else if (/^\/chapter\/\d+$/.test(path)) {
    renderReader(Number(path.split("/").pop()));
  } else {
    renderNotFound();
  }
}

function setupReveal() {
  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting));
  }, { threshold: 0.16 });
  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
}

function updateReadingProgress() {
  const article = document.querySelector(".reader-article");
  if (!article) return document.documentElement.style.setProperty("--reading-progress", "0%");
  const start = article.offsetTop;
  const distance = Math.max(article.offsetHeight - innerHeight * 0.35, 1);
  const progress = Math.min(100, Math.max(0, ((scrollY - start + innerHeight * 0.18) / distance) * 100));
  document.documentElement.style.setProperty("--reading-progress", `${progress}%`);
}

function runSearch(query) {
  const normalized = query.trim().toLocaleLowerCase("zh-Hant");
  if (normalized.length < 2) {
    searchResults.innerHTML = "";
    searchHint.textContent = "輸入兩個字以上，搜尋全書章節與內文。";
    return;
  }
  const matches = siteData.chapters.filter((chapter) => chapter.search_text.toLocaleLowerCase("zh-Hant").includes(normalized));
  searchHint.textContent = matches.length ? `找到 ${matches.length} 個章節` : "雲海中沒有找到相符文字。";
  searchResults.innerHTML = matches.map((chapter) => {
    const source = chapter.search_text;
    const start = Math.max(0, source.toLocaleLowerCase("zh-Hant").indexOf(normalized) - 24);
    const excerpt = escapeHtml(source.slice(start, start + 72));
    return `<a class="search-result" href="#/chapter/${chapter.number}"><span class="search-result-number">${padChapter(chapter.number)}</span><div><h3>${escapeHtml(chapter.title)}</h3><p>${excerpt}…</p></div></a>`;
  }).join("");
}

document.querySelector("#search-open").addEventListener("click", () => {
  searchDialog.showModal();
  requestAnimationFrame(() => searchInput.focus());
});
document.querySelector("#settings-open").addEventListener("click", () => settingsDialog.showModal());
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => document.querySelector(`#${button.dataset.close}`).close()));
searchInput.addEventListener("input", (event) => runSearch(event.target.value));
searchResults.addEventListener("click", () => searchDialog.close());
document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
document.querySelector("#theme-options").addEventListener("click", (event) => {
  if (!event.target.dataset.themeValue) return;
  settings.theme = event.target.dataset.themeValue;
  applySettings();
});
document.querySelector("#font-range").addEventListener("input", (event) => { settings.fontSize = Number(event.target.value); applySettings(); });
document.querySelector("#line-range").addEventListener("input", (event) => { settings.lineHeight = Number(event.target.value); applySettings(); });
document.querySelector("#reset-settings").addEventListener("click", () => { Object.assign(settings, defaultSettings); applySettings(); });
window.addEventListener("hashchange", route);
window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", scrollY > 24);
  updateReadingProgress();
}, { passive: true });
matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { if (settings.theme === "system") applySettings(); });

async function init() {
  applySettings();
  try {
    const response = await fetch("data/site.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    siteData = await response.json();
    if (!siteData.chapters.length) throw new Error("沒有章節資料");
    route();
  } catch (error) {
    app.innerHTML = `<section class="page-shell"><div class="empty-state"><strong>尚未完成建置</strong><span>請先執行 README 的建置指令，再透過本機伺服器預覽。<br>${escapeHtml(error.message)}</span></div></section>`;
  }
}

init();
