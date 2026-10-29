/* ══════════════════════════════════════════════════════════════════════
   ДВАДЦАТЬ-ВОСЕМНАДЦАТЬ — логика сайта
   Весь текст берётся из js/data.js. Этот файл обычно трогать не нужно.
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (typeof SITE === "undefined") {
    console.error("Файл js/data.js не загрузился: объект SITE не найден.");
    return;
  }

  const VIEWS = ["overview", "characters", "knowledge", "chronicle"];
  const $ = (id) => document.getElementById(id);

  /* ── Текст ───────────────────────────────────────────────────────── */

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ESC[ch]);
  }

  function rich(value) {
    return esc(value).replace(/█+/g, (run) =>
      `<span class="redacted" role="img" aria-label="скрыто">${run}</span>`);
  }

  function paragraphs(value) {
    return String(value || "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${rich(p).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function plural(n, one, few, many) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function initials(name) {
    const clean = String(name || "").replace(/[█«»"„""'()]/g, " ").trim();
    if (!clean) return "";
    return clean.split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join("").toUpperCase();
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/ё/g, "е");
  }

  function toneClass(tone) {
    return "tone-" + (tone === "green" || tone === "red" ? tone : "neutral");
  }

  function link(base, id) {
    return `#${base}/${esc(encodeURIComponent(id))}`;
  }

  /* ── Данные ──────────────────────────────────────────────────────── */

  const byId = (list) => Object.fromEntries((list || []).map((x) => [x.id, x]));
  const groups = byId(SITE.characterGroups);
  const kbCats = byId(SITE.knowledgeCategories);
  const chronCats = byId(SITE.chronicleCategories);

  const DATA = {
    characters: SITE.characters || [],
    knowledge: SITE.knowledge || [],
    chronicle: SITE.chronicle || []
  };

  function findItem(id) {
    for (const type of Object.keys(DATA)) {
      const item = DATA[type].find((x) => x.id === id);
      if (item) return { type, item };
    }
    return null;
  }

  /* ── Шаблоны ─────────────────────────────────────────────────────── */

  function personCard(c, base) {
    const hasImage = c.image;
    const ini = initials(c.name);
    const tag = c.tag ? `<span class="pol-sticker">${rich(c.tag)}</span>` : "";
    const nickname = c.nickname ? `<div class="person-nick">${rich(c.nickname)}</div>` : "";
    const role = c.role ? `<div class="person-role">${rich(c.role)}</div>` : "";
    
    return `
      <a class="person ${toneClass(c.tone)}" href="${link(base, c.id)}">
        <div class="pol-frame">
          <span class="tape" aria-hidden="true"></span>
          <div class="pol-photo">
            ${hasImage ? `<img src="${esc(c.image)}" alt="" loading="lazy">` : `<svg aria-hidden="true" focusable="false"><use href="#person"/></svg>${ini ? `<span class="pol-initials">${esc(ini)}</span>` : ""}`}
            ${tag}
          </div>
          <h3 class="pol-caption">${rich(c.name)}</h3>
        </div>
        <div class="person-body">
          ${role}
          ${nickname}
          <p>${rich(c.short)}</p>
          <span class="more">Открыть анкету →</span>
        </div>
      </a>`;
  }

  function kbCard(k, base) {
    const cat = kbCats[k.category] || {};
    const sub = k.sub ? `<div class="note-sub">${rich(k.sub)}</div>` : "";
    return `
      <a class="note ${toneClass(cat.tone)}" href="${link(base, k.id)}">
        <div class="note-tab" aria-hidden="true"></div>
        <h3>${rich(k.title)}</h3>
        ${sub}
        <div class="note-text">${rich(k.short)}</div>
        <span class="more">Читать →</span>
      </a>`;
  }

  function chronCard(e, base) {
    const cat = chronCats[e.category] || {};
    const important = e.important ? `<span class="important">★ важное</span>` : "";
    const tag = e.tag ? `<span>${esc(e.tag)}</span>` : "";
    return `
      <li class="diary-item ${toneClass(e.tone)} ${e.important ? "is-important" : ""}">
        <div class="diary-date">${esc(e.date)}</div>
        <a class="diary-card" href="${link(base, e.id)}">
          <div class="diary-meta">${tag}${important}</div>
          <h3>${rich(e.title)}</h3>
          <p>${rich(e.short)}</p>
        </a>
      </li>`;
  }

  /* ── Вывод главной ───────────────────────────────────────────────── */

  function renderOverview() {
    $("brand-sub").textContent = SITE.subtitle || "";
    $("np-track").textContent = SITE.nowPlaying || "";

    const h = SITE.hero || {};
    $("hero-eyebrow").textContent = h.eyebrow || "";
    $("hero-title").innerHTML = `<span class="t-line">${esc(SITE.title)}</span>`;
    $("hero-tagline").textContent = h.tagline || "";
    $("hero-lead").textContent = h.lead || "";

    const p = h.portraits || {};
    $("hero-portraits").innerHTML = ["left", "right"]
      .filter((side) => p[side])
      .map((side) => `<img class="hero-portrait hero-portrait-${side}" src="${esc(p[side])}" alt="" onerror="this.remove()">`)
      .join("");

    const chars = DATA.characters.length;
    const kb = DATA.knowledge.length;
    const chron = DATA.chronicle.length;
    const em = SITE.extraMetric || {};

    $("metrics").innerHTML = `
      <div class="metric">
        <span class="metric-value">${chars}</span>
        <span class="metric-label">${plural(chars, "персонаж", "персонажа", "персонажей")}</span>
      </div>
      <div class="metric">
        <span class="metric-value">${kb}</span>
        <span class="metric-label">${plural(kb, "заметка", "заметки", "заметок")} о мире</span>
      </div>
      <div class="metric">
        <span class="metric-value">${chron}</span>
        <span class="metric-label">${plural(chron, "событие", "события", "событий")} в хронике</span>
      </div>
      ${em.value ? `<div class="metric"><span class="metric-value">${esc(em.value)}</span><span class="metric-label">${esc(em.label)}</span></div>` : ""}
    `;

    $("featured-characters").innerHTML = DATA.characters.slice(0, 3).map((c) => personCard(c, "characters")).join("");
    $("featured-knowledge").innerHTML = DATA.knowledge.slice(-3).reverse().map((k) => `<li><a href="${link("knowledge", k.id)}">${rich(k.title)}</a></li>`).join("");
    $("featured-chronicle").innerHTML = DATA.chronicle.slice(-3).reverse().map((e) => `<li><a href="${link("chronicle", e.id)}">${rich(e.title)}</a></li>`).join("");

    const a = SITE.about || {};
    $("about-title").textContent = a.title || "Об истории";
    $("about-text").innerHTML = paragraphs(a.text);
    $("about-sign").innerHTML = `— <span class="t-accent">${rich(SITE.author || "████████")}</span>`;

    // Устанавливаем фон для баннера персонажей из img/paths.js
    if (typeof IMG !== "undefined" && IMG.charactersBanner) {
      const banner = $("characters-hero");
      if (banner) {
        banner.style.backgroundImage = `url('img/characters/${IMG.charactersBanner}')`;
      }
    }

    $("footer-note").textContent = SITE.footerNote || "";
    $("footer-meta").innerHTML = `${esc(SITE.title)} · ${esc(SITE.author)}`;
  }

  /* ── Модалки ─────────────────────────────────────────────────────── */

  const modal = $("modal");
  const modalSheet = $("modal-sheet");
  const modalLabel = $("modal-label");
  const modalContent = $("modal-content");
  const modalClose = $("modal-close");
  let modalFromNav = false;

  function openModal(found, fromNav) {
    const { type, item } = found;
    modal.dataset.kind = type === "characters" ? "character" : type === "knowledge" ? "knowledge" : "chronicle";
    modalFromNav = fromNav;
    modalLabel.textContent = type === "characters" ? "Персонаж" : type === "knowledge" ? "Заметка" : "Событие";

    if (type === "characters") {
      const ini = initials(item.name);
      const hasImage = item.image;
      const nickname = item.nickname ? `<div class="profile-nick">${rich(item.nickname)}</div>` : "";
      const quote = item.quote ? `<div class="profile-quote">${rich(item.quote)}</div>` : "";
      const tag = item.tag ? `<span class="pol-sticker">${rich(item.tag)}</span>` : "";

      let sections = "";
      if (item.sections && item.sections.length) {
        sections = item.sections.map(([title, rows]) => {
          const list = rows.map(([q, a]) => `<dt>${rich(q)}</dt><dd><span>${rich(a)}</span></dd>`).join("");
          return `<div><h3>${esc(title)}</h3><dl>${list}</dl></div>`;
        }).join("");
      }

      modalContent.innerHTML = `
        <article class="profile">
          <div class="profile-header">
            <div class="profile-pol">
              <div class="pol-frame">
                <span class="tape" aria-hidden="true"></span>
                <div class="pol-photo">
                  ${hasImage ? `<img src="${esc(item.image)}" alt="" loading="lazy">` : `<svg aria-hidden="true" focusable="false"><use href="#person"/></svg>${ini ? `<span class="pol-initials">${esc(ini)}</span>` : ""}`}
                  ${tag}
                </div>
                <h3 class="pol-caption">${rich(item.name)}</h3>
              </div>
            </div>
            <div class="profile-intro">
              <h2>${rich(item.name)}</h2>
              ${nickname}
              ${quote}
            </div>
          </div>
          <div class="prose">${paragraphs(item.text)}</div>
          ${sections ? `<div class="anketa">${sections}</div>` : ""}
        </article>`;
    } else if (type === "knowledge") {
      const sub = item.sub ? `<div class="entry-sub">${rich(item.sub)}</div>` : "";
      let sections = "";
      if (item.sections && item.sections.length) {
        sections = item.sections.map(([title, items]) => {
          const list = items.map((s) => `<li>${rich(s)}</li>`).join("");
          return `<div><h3>${esc(title)}</h3><ul>${list}</ul></div>`;
        }).join("");
      }
      modalContent.innerHTML = `
        <article class="entry">
          <h2>${rich(item.title)}</h2>
          ${sub}
          <div class="prose">${paragraphs(item.text)}</div>
          ${sections ? `<div class="entry-sections">${sections}</div>` : ""}
        </article>`;
    } else {
      const important = item.important ? `<span>★ важное</span>` : "";
      const tag = item.tag ? `<span>${esc(item.tag)}</span>` : "";
      const meta = important || tag ? `<div class="entry-meta">${important}${tag}</div>` : "";
      let sections = "";
      if (item.sections && item.sections.length) {
        sections = item.sections.map(([title, items]) => {
          const list = items.map((s) => `<li>${rich(s)}</li>`).join("");
          return `<div><h3>${esc(title)}</h3><ul>${list}</ul></div>`;
        }).join("");
      }
      modalContent.innerHTML = `
        <article class="entry">
          <h2>${rich(item.title)}</h2>
          ${meta}
          <div class="prose">${paragraphs(item.text)}</div>
          ${sections ? `<div class="entry-sections">${sections}</div>` : ""}
        </article>`;
    }

    document.body.classList.add("modal-open");
    modal.showModal();
  }

  function closeModal() {
    modal.close();
    document.body.classList.remove("modal-open");
    if (modalFromNav) history.back();
    else {
      const r = parseHash();
      if (r && r.view) history.replaceState(null, "", "#" + r.view);
    }
  }

  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (modal.open && e.key === "Escape") closeModal();
  });

  /* ── Роутинг ─────────────────────────────────────────────────────── */

  function parseHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return { view: "overview", id: null };
    const [view, id] = h.split("/");
    return { view: VIEWS.includes(view) ? view : "overview", id: id || null };
  }

  function showView(view) {
    VIEWS.forEach((v) => {
      const el = $("view-" + v);
      if (v === view) {
        el.hidden = false;
        // Плавная прокрутка наверх при смене раздела
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        el.hidden = true;
      }
    });
    document.querySelectorAll(".nav a").forEach((a) => {
      a.setAttribute("aria-current", a.dataset.view === view ? "page" : "false");
    });
    document.title = view === "overview" ? SITE.title : `${VIEW_TITLES[view] || view} — ${SITE.title}`;
  }

  function route(fromNav) {
    const r = parseHash();
    if (!r) return;

    if (r.id) {
      const found = findItem(r.id);
      if (found) {
        openModal(found, fromNav);
        if (!fromNav) history.replaceState(null, "", "#" + r.view);
      } else {
        showView(r.view);
      }
    } else {
      if (modal.open) modal.close();
      document.body.classList.remove("modal-open");
      showView(r.view);
    }
  }

  window.addEventListener("popstate", () => route(true));

  /* ── Списки ──────────────────────────────────────────────────────── */

  const VIEW_TITLES = {
    characters: "Персонажи",
    knowledge: "Мир",
    chronicle: "Хроника"
  };

  function setupList(view) {
    const list = DATA[view] || [];
    const searchBox = $("search-" + view);
    const chipsBox = $("filter-" + view);
    const resultBox = $("list-" + view);
    const noteBox = $("note-" + view);
    const emptyBox = $("empty-" + view);

    let cfg = {};
    if (view === "characters") {
      cfg = { filters: SITE.characterGroups || [], key: "group" };
    } else if (view === "knowledge") {
      cfg = { filters: SITE.knowledgeCategories || [], key: "category" };
    } else {
      cfg = { filters: SITE.chronicleCategories || [], key: "category" };
    }

    const state = { query: "", filter: "" };

    const chips = [{ id: "", label: "Все" }].concat(cfg.filters);
    chipsBox.innerHTML = chips.map((c) => {
      const count = c.id ? list.filter((x) => x[cfg.key] === c.id).length : list.length;
      return `<button class="chip" type="button" data-value="${esc(c.id)}" aria-pressed="${c.id ? "false" : "true"}">${esc(c.label)}<span class="chip-n">${count}</span></button>`;
    }).join("");

    function render() {
      const q = normalize(state.query);
      const filtered = list.filter((x) => {
        if (state.filter && x[cfg.key] !== state.filter) return false;
        if (q) {
          const text = [x.title, x.name, x.nickname, x.role, x.short, x.tag, x.date].map(normalize).join(" ");
          return text.includes(q);
        }
        return true;
      });

      if (filtered.length === 0) {
        resultBox.innerHTML = "";
        emptyBox.hidden = false;
        noteBox.textContent = "";
      } else {
        emptyBox.hidden = true;
        if (view === "characters") {
          resultBox.innerHTML = filtered.map((c) => personCard(c, view)).join("");
        } else if (view === "knowledge") {
          resultBox.innerHTML = filtered.map((k) => kbCard(k, view)).join("");
        } else {
          resultBox.innerHTML = filtered.map((e) => chronCard(e, view)).join("");
        }
        const total = state.filter ? list.filter((x) => x[cfg.key] === state.filter).length : list.length;
        noteBox.textContent = filtered.length !== total ? `Нашлось ${filtered.length} из ${total}` : "";
      }
    }

    searchBox.addEventListener("input", () => {
      state.query = searchBox.value;
      render();
    });

    chipsBox.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      state.filter = chip.dataset.value;
      chipsBox.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      render();
    });

    render();
  }

  /* ── Старт ───────────────────────────────────────────────────────── */

  // Плавный скролл
  document.documentElement.classList.add('smooth-scroll');
  
  // Улучшенный smooth scroll с CSS Scroll Snap
  let scrollTimeout;
  let isScrolling = false;
  
  window.addEventListener('wheel', (e) => {
    if (!isScrolling) {
      isScrolling = true;
      document.documentElement.style.scrollBehavior = 'smooth';
    }
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
    }, 150);
  }, { passive: true });

  // Loader
  const loader = $("loader");
  window.addEventListener("load", () => {
    setTimeout(() => {
      loader.classList.add("loaded");
    }, 2800);
  });

  renderOverview();
  setupList("characters");
  setupList("knowledge");
  setupList("chronicle");
  route(false);

})();
