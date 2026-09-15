/* ═══════════════════════════════════════════════════════════
   CC PRO BAU — GALLERY.JS
   Surse de date, în ordine:
     1. meta/galerie.json   (manifest scris manual — recomandat)
     2. GitHub API          (automat, cu cache 6h)
     3. Cache expirat       (mai bine ceva decât nimic)
   ═══════════════════════════════════════════════════════════ */

(function () {
    "use strict";

    /* ── Utilitare ─────────────────────────────────────── */

    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    function rafThrottle(fn) {
        let ticking = false;
        return function (...a) {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => { fn.apply(this, a); ticking = false; });
        };
    }

    /* ── Configurare ───────────────────────────────────── */

    const CONFIG = {
        owner:  "fanania",
        repo:   "ccprobau_new",
        branch: "main",

        manifest: "meta/galerie.json",

        cacheKey: "ccpb_gallery_v2",
        cacheTTL: 6 * 60 * 60 * 1000,   // 6 ore

        pageSize: 12,

        imageExt: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"],
        videoExt: [".mp4", ".webm", ".mov", ".m4v"],

        /* Foldere ignorate complet */
        exclude: ["/loop/", "/mini_char/", "/logo/", "/background/",
                  "/posters/", "/icons/"],

        /* Cuvinte-cheie → categorie automată */
        autoCategory: {
            baie:     ["baie", "bath", "dus", "cada", "sanitar"],
            fatada:   ["fatada", "fațadă", "exterior", "termo", "schela",
                       "casa_mare", "acoperis"],
            exterior: ["curte", "gard", "alee", "terasa", "pavaj"],
            interior: ["interior", "living", "camera", "parchet", "glet",
                       "rigips", "tavan", "caramida", "photo"]
        }
    };

    /* ── Elemente DOM ──────────────────────────────────── */

    const grid     = $("#galleryGrid");
    const statusEl = $("#galleryStatus");
    const statsEl  = $("#galleryStats");
    const loadMore = $("#loadMore");
    const filters  = $$("[data-filter]");
    const views    = $$("[data-view]");

    if (!grid) return;

    /* ── Stare ─────────────────────────────────────────── */

    let allItems   = [];   // toate elementele
    let shownItems = [];   // cele filtrate
    let rendered   = 0;    // câte sunt în DOM
    let activeFilter = "all";


    /* ═══ 1. HELPERE PENTRU FIȘIERE ════════════════════════ */

    function ext(path) {
        const name = path.split("/").pop();
        const dot  = name.lastIndexOf(".");
        return dot > -1 ? name.slice(dot).toLowerCase() : "";
    }

    function isVideo(path) {
        return CONFIG.videoExt.includes(ext(path));
    }

    function isAllowed(path) {
        const p = path.toLowerCase();
        const e = ext(p);

        return p.startsWith("meta/")
            && !CONFIG.exclude.some((f) => p.includes(f))
            && [...CONFIG.imageExt, ...CONFIG.videoExt].includes(e);
    }

    /* Transformă o cale în URL utilizabil (relativ la site) */
    function toUrl(path) {
        return path.split("/").map(encodeURIComponent).join("/");
    }

    /* Ghicește categoria din numele fișierului */
    function guessCategory(path) {
        const p = path.toLowerCase();

        if (isVideo(p)) return "video";

        for (const [cat, words] of Object.entries(CONFIG.autoCategory)) {
            if (words.some((w) => p.includes(w))) return cat;
        }

        return "interior";
    }

    /* Titlu prezentabil dintr-un nume de fișier */
    function prettyTitle(path) {
        const raw = path.split("/").pop().replace(/\.[^/.]+$/, "");

        /* Nume generice (PHOTO-2026-..., UUID) → titlu neutru */
        if (/^(photo|video|img|image)[-_ ]?\d/i.test(raw) ||
            /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(raw)) {
            return isVideo(path) ? "Filmare de pe șantier" : "Lucrare CC Pro Bau";
        }

        return raw
            .replace(/[-_]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/^./, (c) => c.toUpperCase());
    }

    function labelFor(cat) {
        return {
            interior: "Interior",
            exterior: "Exterior",
            baie: "Baie",
            fatada: "Fațadă",
            video: "Video"
        }[cat] || "Proiect";
    }


    /* ═══ 2. ÎNCĂRCAREA DATELOR ════════════════════════════ */

    /* — 2a. Manifest manual (cel mai bun) — */

    async function fromManifest() {
        const res = await fetch(CONFIG.manifest, { cache: "no-cache" });
        if (!res.ok) throw new Error("Fără manifest");

        const data = await res.json();
        const list = Array.isArray(data) ? data : data.items;

        if (!Array.isArray(list) || !list.length) throw new Error("Manifest gol");

        return list.map((it) => ({
            path:  it.src,
            url:   toUrl(it.src),
            type:  isVideo(it.src) ? "video" : "image",
            cat:   it.cat || guessCategory(it.src),
            title: it.title || prettyTitle(it.src),
            desc:  it.desc || "",
            poster: it.poster ? toUrl(it.poster) : null
        }));
    }

    /* — 2b. GitHub API — */

    async function fromGitHub() {
        const api = `https://api.github.com/repos/${CONFIG.owner}/`
                  + `${CONFIG.repo}/git/trees/${CONFIG.branch}?recursive=1`;

        const res = await fetch(api);

        if (res.status === 403) throw new Error("RATE_LIMIT");
        if (!res.ok) throw new Error(`GitHub ${res.status}`);

        const data = await res.json();

        const paths = (data.tree || [])
            .filter((f) => f.type === "blob")
            .map((f) => f.path)
            .filter(isAllowed)
            .sort((a, b) => a.localeCompare(b, "ro", { sensitivity: "base" }));

        if (!paths.length) throw new Error("Niciun fișier găsit");

        return paths.map((p) => ({
            path:  p,
            url:   toUrl(p),
            type:  isVideo(p) ? "video" : "image",
            cat:   guessCategory(p),
            title: prettyTitle(p),
            desc:  "",
            poster: null
        }));
    }

    /* — 2c. Cache — */

    function readCache(ignoreAge) {
        try {
            const raw = localStorage.getItem(CONFIG.cacheKey);
            if (!raw) return null;

            const { time, items } = JSON.parse(raw);

            if (!ignoreAge && Date.now() - time > CONFIG.cacheTTL) return null;
            if (!Array.isArray(items) || !items.length) return null;

            return items;
        } catch (e) {
            return null;
        }
    }

    function writeCache(items) {
        try {
            localStorage.setItem(CONFIG.cacheKey,
                JSON.stringify({ time: Date.now(), items }));
        } catch (e) { /* quota plină */ }
    }

    /* — 2d. Orchestrator — */

    async function loadItems() {
        /* 1. Manifest */
        try {
            const items = await fromManifest();
            writeCache(items);
            return items;
        } catch (e) { /* trecem mai departe */ }

        /* 2. Cache proaspăt */
        const fresh = readCache(false);
        if (fresh) return fresh;

        /* 3. GitHub API */
        try {
            const items = await fromGitHub();
            writeCache(items);
            return items;
        } catch (e) {
            console.warn("[Galerie]", e.message);

            /* 4. Cache expirat — tot e mai bine decât nimic */
            const stale = readCache(true);
            if (stale) return stale;

            throw e;
        }
    }


    /* ═══ 3. RANDARE ═══════════════════════════════════════ */

    function buildCard(item, index) {
        const fig = document.createElement("figure");
        fig.className = "g-item" +
            (item.type === "video" ? " g-item--video" : "");
        fig.dataset.cat   = item.cat;
        fig.dataset.index = String(index);

        /* Media */
        let media;

        if (item.type === "video") {
            media = document.createElement("video");
            media.src = item.url;
            media.muted = true;
            media.playsInline = true;
            media.preload = "metadata";
            if (item.poster) media.poster = item.poster;
        } else {
            media = document.createElement("img");
            media.src = item.url;
            media.alt = item.title;
            media.loading = "lazy";
            media.decoding = "async";
        }

        /* Fișier lipsă → scoatem cardul */
        media.addEventListener("error", () => fig.remove(), { once: true });

        /* Buton transparent peste tot cardul */
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "g-item__open";
        btn.setAttribute("aria-label", `Deschide: ${item.title}`);
        btn.addEventListener("click", () => openLightbox(index));

        /* Etichetă categorie */
        const tag = document.createElement("span");
        tag.className = "g-item__tag";
        tag.textContent = labelFor(item.cat);

        /* Legendă */
        const cap = document.createElement("figcaption");
        cap.className = "g-item__cap";

        const t = document.createElement("strong");
        t.textContent = item.title;
        cap.appendChild(t);

        if (item.desc) {
            const d = document.createElement("span");
            d.textContent = item.desc;
            cap.appendChild(d);
        }

        fig.append(media, tag, cap, btn);
        return fig;
    }

    function renderNext() {
        const slice = shownItems.slice(rendered, rendered + CONFIG.pageSize);
        const frag  = document.createDocumentFragment();

        slice.forEach((item) => {
            frag.appendChild(buildCard(item, allItems.indexOf(item)));
        });

        grid.appendChild(frag);
        rendered += slice.length;

        if (loadMore) {
            loadMore.hidden = rendered >= shownItems.length;
        }
    }

    function applyFilter(filter) {
        activeFilter = filter;

        shownItems = filter === "all"
            ? allItems
            : allItems.filter((it) => it.cat === filter);

        grid.innerHTML = "";
        rendered = 0;

        if (!shownItems.length) {
            setStatus("Nu există proiecte în această categorie.", true);
            if (loadMore) loadMore.hidden = true;
            return;
        }

        setStatus("", false);
        renderNext();
        updateStats();
    }

    function updateStats() {
        if (!statsEl) return;

        const photos = allItems.filter((i) => i.type === "image").length;
        const videos = allItems.filter((i) => i.type === "video").length;

        statsEl.innerHTML = "";

        [[photos, "fotografii"], [videos, "videoclipuri"]].forEach(([n, lbl]) => {
            if (!n) return;

            const s = document.createElement("span");
            s.className = "mini-badge";
            s.textContent = `${n} ${lbl}`;
            statsEl.appendChild(s);
        });
    }

    function setStatus(msg, show) {
        if (!statusEl) return;

        statusEl.textContent = msg;
        statusEl.hidden = !show;
    }


    /* ═══ 4. LIGHTBOX ══════════════════════════════════════ */

    const lb        = $("#lightbox");
    const lbStage   = $("#lbStage");
    const lbCaption = $("#lbCaption");
    const lbCounter = $("#lbCounter");

    let lbIndex = 0;
    let lastFocus = null;

    function openLightbox(index) {
        if (!lb) return;

        lastFocus = document.activeElement;
        lbIndex = index;

        lb.hidden = false;
        document.body.classList.add("modal-open");

        showSlide();
        $("#lbClose")?.focus();
    }

    function closeLightbox() {
        if (!lb) return;

        const v = $("video", lbStage);
        if (v) { v.pause(); v.removeAttribute("src"); v.load(); }

        lb.hidden = true;
        document.body.classList.remove("modal-open");
        lbStage.innerHTML = "";

        lastFocus?.focus();
    }

    function showSlide() {
        const item = allItems[lbIndex];
        if (!item || !lbStage) return;

        lbStage.innerHTML = "";

        if (item.type === "video") {
            const v = document.createElement("video");
            v.src = item.url;
            v.controls = true;
            v.playsInline = true;
            v.autoplay = true;
            if (item.poster) v.poster = item.poster;
            lbStage.appendChild(v);
        } else {
            const img = document.createElement("img");
            img.src = item.url;
            img.alt = item.title;
            lbStage.appendChild(img);
        }

        if (lbCaption) {
            lbCaption.innerHTML = "";

            const t = document.createElement("strong");
            t.textContent = item.title;
            lbCaption.appendChild(t);

            if (item.desc) {
                const d = document.createElement("span");
                d.textContent = item.desc;
                lbCaption.appendChild(d);
            }
        }

        if (lbCounter) {
            lbCounter.textContent = `${lbIndex + 1} / ${allItems.length}`;
        }

        /* Preîncarcă vecinii */
        [lbIndex - 1, lbIndex + 1].forEach((i) => {
            const n = allItems[(i + allItems.length) % allItems.length];
            if (n && n.type === "image") new Image().src = n.url;
        });
    }

    function step(dir) {
        lbIndex = (lbIndex + dir + allItems.length) % allItems.length;
        showSlide();
    }

    function initLightbox() {
        if (!lb) return;

        $("#lbClose")?.addEventListener("click", closeLightbox);
        $("#lbPrev")?.addEventListener("click", () => step(-1));
        $("#lbNext")?.addEventListener("click", () => step(1));

        /* Click pe fundal */
        lb.addEventListener("click", (e) => {
            if (e.target === lb || e.target === lbStage) closeLightbox();
        });

        /* Tastatură */
        document.addEventListener("keydown", (e) => {
            if (lb.hidden) return;

            if (e.key === "Escape")     { closeLightbox(); }
            if (e.key === "ArrowLeft")  { e.preventDefault(); step(-1); }
            if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
        });

        /* Swipe pe mobil */
        let sx = 0, sy = 0;

        lbStage.addEventListener("touchstart", (e) => {
            sx = e.touches[0].clientX;
            sy = e.touches[0].clientY;
        }, { passive: true });

        lbStage.addEventListener("touchend", (e) => {
            const dx = e.changedTouches[0].clientX - sx;
            const dy = e.changedTouches[0].clientY - sy;

            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
                step(dx < 0 ? 1 : -1);
            }
        }, { passive: true });
    }


    /* ═══ 5. CONTROALE ═════════════════════════════════════ */

    function initControls() {
        filters.forEach((btn) => {
            btn.addEventListener("click", () => {
                filters.forEach((b) => {
                    const on = b === btn;
                    b.classList.toggle("is-active", on);
                    b.setAttribute("aria-pressed", String(on));
                });

                applyFilter(btn.dataset.filter);
            });
        });

        views.forEach((btn) => {
            btn.addEventListener("click", () => {
                views.forEach((b) => {
                    const on = b === btn;
                    b.classList.toggle("is-active", on);
                    b.setAttribute("aria-pressed", String(on));
                });

                grid.classList.toggle("gallery-grid--large",
                                      btn.dataset.view === "large");
            });
        });

        loadMore?.addEventListener("click", renderNext);
    }

    /* Header + back-to-top (aceleași ca pe index) */
    function initChrome() {
        document.documentElement.classList.add("has-js");

        const y = $("#year");
        if (y) y.textContent = String(new Date().getFullYear());

        const nav      = $("#mainNav");
        const toggle   = $("#navToggle");
        const progress = $("#scrollProgress");
        const toTop    = $("#toTop");

        const onScroll = rafThrottle(() => {
            const sy = window.scrollY;

            document.body.classList.toggle("is-scrolled", sy > 60);
            toTop?.classList.toggle("is-shown", sy > 700);

            if (progress) {
                const max = document.documentElement.scrollHeight
                          - window.innerHeight;
                progress.style.width =
                    `${clamp(max > 0 ? (sy / max) * 100 : 0, 0, 100)}%`;
            }
        });

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        if (toggle && nav) {
            const close = () => {
                nav.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
            };

            toggle.addEventListener("click", () => {
                const open = nav.classList.toggle("is-open");
                toggle.setAttribute("aria-expanded", String(open));
            });

            nav.addEventListener("click", (e) => {
                if (e.target.closest("a")) close();
            });

            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape") close();
            });
        }

        toTop?.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: reducedMotion ? "auto" : "smooth"
            });
        });
    }


    /* ═══ 6. PORNIRE ═══════════════════════════════════════ */

    async function init() {
        initChrome();
        initControls();
        initLightbox();

        try {
            allItems = await loadItems();

            grid.innerHTML = "";
            grid.setAttribute("aria-busy", "false");

            applyFilter("all");

        } catch (err) {
            grid.innerHTML = "";
            grid.setAttribute("aria-busy", "false");

            const rate = String(err.message).includes("RATE_LIMIT");

            setStatus(
                rate
                    ? "Galeria se încarcă momentan greu. Reîncearcă în câteva minute sau sună-ne la +40 732 657 454."
                    : "Galeria nu a putut fi încărcată. Sună-ne la +40 732 657 454 și îți trimitem pozele direct.",
                true
            );

            console.error("[Galerie]", err);
        }
    }

    document.readyState === "loading"
        ? document.addEventListener("DOMContentLoaded", init)
        : init();

})();
