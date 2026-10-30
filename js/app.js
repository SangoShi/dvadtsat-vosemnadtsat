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

  const VIEWS = ["overview", "characters", "knowledge", "recommendations"];
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
  const recCats = byId(SITE.recommendationCategories);

  const DATA = {
    characters: SITE.characters || [],
    knowledge: SITE.knowledge || [],
    recommendations: SITE.recommendations || []
  };

  /* ── Картинки и файлы ────────────────────────────────────────────── */

  // Путь к фото персонажа: сначала c.photo (из per-character файлов), затем img/paths.js, затем старое поле image
  function charImage(c) {
    if (c.photo && String(c.photo).trim()) return "img/characters/" + encodeURIComponent(c.photo);
    const name = typeof IMG !== "undefined" && IMG.characters ? IMG.characters[c.id] : null;
    if (name) return "img/characters/" + encodeURIComponent(name);
    if (c.image && String(c.image).trim()) return c.image;
    return null;
  }

  function charPhoto(c) {
    const src = charImage(c);
    if (src) return `<img src="${esc(src)}" alt="" loading="lazy">`;
    const ini = initials(c.name);
    return `<svg aria-hidden="true" focusable="false"><use href="#person"/></svg>${ini ? `<span class="pol-initials">${esc(ini)}</span>` : ""}`;
  }

  function fileType(name) {
    const m = String(name || "").match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toUpperCase() : "";
  }

  // Кнопка «Скачать». Имя файла берётся из data.js, папка — folder
  function downloadButton(name, folder) {
    if (!name) {
      return `<div class="download"><span class="btn btn-download is-disabled" aria-disabled="true">Файл скоро появится</span></div>`;
    }
    const type = fileType(name);
    return `
      <div class="download">
        <a class="btn btn-primary btn-download" href="files/${folder}/${esc(encodeURIComponent(name))}" download="${esc(name)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14"/></svg>
          Скачать${type ? ` <span class="download-type">${esc(type)}</span>` : ""}
        </a>
      </div>`;
  }

  // Кнопка «Слушать». Ссылка на плейлист из Яндекс.Музыки
  function playlistButton(url) {
    if (!url) return "";
    // Проверяем, что это ссылка на Яндекс.Музыку
    try {
      const link = new URL(url);
      if (!link.hostname.includes("music.yandex")) {
        return "";
      }
    } catch {
      return "";
    }
    return `
      <div class="playlist">
        <a class="btn btn-primary btn-playlist" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16m-7 6h7M4 3v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3"/></svg>
          Плейлист
        </a>
      </div>`;
  }

  function findItem(id) {
    for (const type of Object.keys(DATA)) {
      const item = DATA[type].find((x) => x.id === id);
      if (item) return { type, item };
    }
    return null;
  }

  /* ── Шаблоны ─────────────────────────────────────────────────────── */

  function personCard(c, base) {
    const tag = c.tag ? `<span class="pol-sticker">${rich(c.tag)}</span>` : "";
    const nickname = c.nickname ? `<div class="person-nick">${rich(c.nickname)}</div>` : "";
    const role = c.role ? `<div class="person-role">${rich(c.role)}</div>` : "";
    
    return `
      <a class="person ${toneClass(c.tone)}" href="${link(base, c.id)}">
        <div class="pol-frame">
          <span class="tape" aria-hidden="true"></span>
          <div class="pol-photo">
            ${charPhoto(c)}
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

  function recCard(r, base) {
    const cat = recCats[r.category] || {};
    const sub = r.sub ? `<div class="note-sub">${rich(r.sub)}</div>` : "";
    const type = fileType(r.file);
    const badge = r.file
      ? `<span class="file-badge">${esc(type || "файл")}</span>`
      : `<span class="file-badge is-soon">скоро</span>`;
    return `
      <a class="note rec ${toneClass(cat.tone)}" href="${link(base, r.id)}">
        <div class="note-tab" aria-hidden="true"></div>
        <div class="rec-top">
          <span class="rec-cat">${esc(cat.label || "")}</span>
          ${badge}
        </div>
        <h3>${rich(r.title)}</h3>
        ${sub}
        <div class="note-text">${rich(r.short)}</div>
        <span class="more">${r.file ? "Открыть и скачать →" : "Подробнее →"}</span>
      </a>`;
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
    // Два персонажа по бокам (теперь берём из img/paths.js)
    if (typeof IMG !== "undefined" && IMG.hero) {
      $("hero-portraits").innerHTML = ["left", "right"]
        .filter((side) => IMG.hero[side])
        .map((side) => {
          const filename = IMG.hero[side];
          const className = side === "left" ? "hero-portrait-left" : "hero-portrait-right";
          return `<img class="hero-portrait ${className}" src="img/hero/${esc(filename)}" alt="" onerror="this.remove()">`;
        })
        .join("");
    } else {
      // Совместимость со старым data.js (если там portraits)
      $("hero-portraits").innerHTML = ["left", "right"]
        .filter((side) => p[side])
        .map((side) => `<img class="hero-portrait hero-portrait-${side}" src="${esc(p[side])}" alt="" onerror="this.remove()">`)
        .join("");
    }

    const chars = DATA.characters.length;
    const kb = DATA.knowledge.length;
    const recs = DATA.recommendations.length;
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
        <span class="metric-value">${recs}</span>
        <span class="metric-label">${plural(recs, "файл", "файла", "файлов")} для Таверны</span>
      </div>
      ${em.value ? `<div class="metric"><span class="metric-value">${esc(em.value)}</span><span class="metric-label">${esc(em.label)}</span></div>` : ""}
    `;

    $("featured-characters").innerHTML = DATA.characters.slice(0, 3).map((c) => personCard(c, "characters")).join("");
    $("featured-knowledge").innerHTML = DATA.knowledge.slice(-3).reverse().map((k) => `<li><a href="${link("knowledge", k.id)}">${rich(k.title)}</a></li>`).join("");
    $("featured-recommendations").innerHTML = DATA.recommendations.slice(-3).reverse().map((r) => `<li><a href="${link("recommendations", r.id)}">${rich(r.title)}</a></li>`).join("");

    $("footer-note").textContent = SITE.footerNote || "";
    $("footer-meta").innerHTML = `${esc(SITE.title)} · ${esc(SITE.author)}`;
  }

  // Установка баннеров для всех страниц из img/paths.js
  function setupBanners() {
    if (typeof IMG === "undefined") return;
    
    // Баннер персонажей
    if (IMG.charactersBanner) {
      const chBanner = $("characters-hero");
      if (chBanner) {
        chBanner.style.backgroundImage = `url('img/characters/${IMG.charactersBanner}')`;
      }
    }
    
    // Баннер мира
    if (IMG.knowledgeBanner) {
      const kbBanner = $("knowledge-hero");
      if (kbBanner) {
        kbBanner.style.backgroundImage = `url('img/knowledge/${IMG.knowledgeBanner}')`;
      }
    }
    
    // Баннер файлов
    if (IMG.recommendationsBanner) {
      const recBanner = $("recommendations-hero");
      if (recBanner) {
        recBanner.style.backgroundImage = `url('img/recommendations/${IMG.recommendationsBanner}')`;
      }
    }
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
    modal.dataset.kind = type === "characters" ? "character" : type === "knowledge" ? "knowledge" : "recommendation";
    modalFromNav = fromNav;
    modalLabel.textContent = type === "characters" ? "Персонаж" : type === "knowledge" ? "Заметка" : "Файл";

    if (type === "characters") {
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

      // Баннер персонажа
      const bannerSrc = item.banner ? `img/characters/${esc(encodeURIComponent(item.banner))}` : null;
      const bannerHTML = bannerSrc 
        ? `<div class="profile-banner"><img src="${bannerSrc}" alt="" loading="lazy"></div>` 
        : `<div class="profile-banner profile-banner-placeholder"><span>картинка</span></div>`;

      // Галерея 3×2
      const gallery = item.gallery && Array.isArray(item.gallery) ? item.gallery.slice(0, 6) : [];
      const galleryHTML = gallery.length 
        ? `<div class="profile-gallery">${gallery.map((img) => {
            if (img) {
              const src = `img/characters/${esc(encodeURIComponent(img))}`;
              return `<div class="gallery-cell"><img src="${src}" alt="" loading="lazy"></div>`;
            }
            return `<div class="gallery-cell gallery-cell-placeholder"></div>`;
          }).join("")}</div>` 
        : "";

      modalContent.innerHTML = `
        <article class="profile">
          <div class="profile-top">
            <div class="profile-pol">
              <div class="pol-frame">
                <span class="tape" aria-hidden="true"></span>
                <div class="pol-photo">
                  ${charPhoto(item)}
                  ${tag}
                </div>
                <h3 class="pol-caption">${rich(item.name)}</h3>
              </div>
            </div>
            ${downloadButton(item.file, "characters")}
            ${playlistButton(item.playlist)}
          </div>
          ${bannerHTML}
          ${galleryHTML}
          <div class="profile-body">
            <h2 class="profile-name">${rich(item.name)}</h2>
            ${nickname}
            ${quote}
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
      const cat = recCats[item.category] || {};
      const sub = item.sub ? `<div class="entry-sub">${rich(item.sub)}</div>` : "";
      const meta = cat.label ? `<div class="entry-meta"><span>${esc(cat.label)}</span></div>` : "";
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
          ${meta}
          ${downloadButton(item.file, "recommendations")}
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
    recommendations: "Файлы"
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
      cfg = { filters: SITE.recommendationCategories || [], key: "category" };
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
        } else if (view === "recommendations") {
          // Группируем файлы по полю group
          const groupLabels = { own: "Авторские файлы", community: "От других авторов" };
          const groupOrder = ["own", "community"];
          const grouped = {};
          
          filtered.forEach((r) => {
            const g = r.group || "own";
            if (!grouped[g]) grouped[g] = [];
            grouped[g].push(r);
          });
          
          let html = "";
          groupOrder.forEach((g) => {
            if (!grouped[g] || grouped[g].length === 0) return;
            html += `<div class="files-section"><div class="files-section-label">${esc(groupLabels[g] || g)}</div></div>`;
            html += grouped[g].map((r) => recCard(r, view)).join("");
          });
          
          resultBox.innerHTML = html;
        } else {
          resultBox.innerHTML = filtered.map((r) => recCard(r, view)).join("");
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

  // Loader
  const loader = $("loader");
  window.addEventListener("load", () => {
    setTimeout(() => {
      loader.classList.add("loaded");
    }, 2800);
  });

  renderOverview();
  setupBanners();
  setupList("characters");
  setupList("knowledge");
  setupList("recommendations");
  route(false);

})();
