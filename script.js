/* ═══════════════════════════════════════════════════════════
   CC PRO BAU — SCRIPT.JS (pagina principala)
   fara dependente.
   ═══════════════════════════════════════════════════════════ */

(function () {
    "use strict";

    /* ── Utilitare ─────────────────────────────────────── */

    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    /* Limiteaza frecventa unui handler la un cadru de randare */
    function rafThrottle(fn) {
        let ticking = false;

        return function (...args) {
            if (ticking) return;
            ticking = true;

            window.requestAnimationFrame(() => {
                fn.apply(this, args);
                ticking = false;
            });
        };
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);

        return `${m}:${String(s).padStart(2, "0")}`;
    }


    /* ═══ 1. BOOTSTRAP ═════════════════════════════════════ */

    function initBootstrap() {
        document.documentElement.classList.add("has-js");

        const yearEl = $("#year");
        if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    }

    /* ═══ 2. HEADER, MENIU & SCROLLSPY ═════════════════════ */
    function initHeader() {
        const header    = $("#siteHeader");
        const nav       = $("#mainNav");
        const toggle    = $("#navToggle");
        const progress  = $("#scrollProgress");
        const navLinks  = $$("#mainNav a[href^='#']");

        /* — Stare de scroll + bara de progres — */

        const onScroll = rafThrottle(() => {
            const y = window.scrollY;

            document.body.classList.toggle("is-scrolled", y > 60);

            if (progress) {
                const max = document.documentElement.scrollHeight
                          - window.innerHeight;
                const pct = max > 0 ? (y / max) * 100 : 0;

                progress.style.width = `${clamp(pct, 0, 100)}%`;
            }
        });

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        /* — Meniu mobil — */

        function closeNav() {
            if (!nav || !toggle) return;

            nav.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Deschide meniul");
        }
        function openNav() {
            if (!nav || !toggle) return;

            nav.classList.add("is-open");
            toggle.setAttribute("aria-expanded", "true");
            toggle.setAttribute("aria-label", "Închide meniul");
        }

        if (toggle && nav) {
            toggle.addEventListener("click", () => {
                const isOpen = nav.classList.contains("is-open");
                isOpen ? closeNav() : openNav();
            });

            /* Închide la click pe un link */
            nav.addEventListener("click", (e) => {
                if (e.target.closest("a")) closeNav();
            });

            /* Închide la Escape */
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape") closeNav();
            });

            /* Închide la click în afara meniului */
            document.addEventListener("click", (e) => {
                if (!nav.classList.contains("is-open")) return;
                if (nav.contains(e.target) || toggle.contains(e.target)) return;

                closeNav();
            });

            /* Închide când trecem pe desktop */
            const mq = window.matchMedia("(min-width: 901px)");
            const onChange = (ev) => { if (ev.matches) closeNav(); };

            mq.addEventListener
                ? mq.addEventListener("change", onChange)
                : mq.addListener(onChange);
        }

        /* — Scrollspy: evidențiaza sectiunea activa — */

        const sections = navLinks
            .map((link) => {
                const id = link.getAttribute("href");
                if (!id || id === "#") return null;

                const target = document.querySelector(id);
                return target ? { link, target } : null;
            })
            .filter(Boolean);

        if (!sections.length || !("IntersectionObserver" in window)) return;

        const spy = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    navLinks.forEach((l) => l.classList.remove("is-current"));

                    const match = sections.find(
                        (s) => s.target === entry.target
                    );

                    if (match) match.link.classList.add("is-current");
                });
            },
            { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
        );

        sections.forEach((s) => spy.observe(s.target));
    }

    /* ═══ 3. REVEAL LA SCROLL ══════════════════════════════ */

    function initReveal() {
        const items = $$("[data-reveal]");
        if (!items.length) return;

        /* Fallback: fara IO sau cu reduced-motion, aratam tot */
        if (!("IntersectionObserver" in window) || prefersReducedMotion) {
            items.forEach((el) => el.classList.add("is-visible"));
            return;
        }

        items.forEach((el) => {
            const delay = el.dataset.revealDelay;
            if (delay) el.style.setProperty("--reveal-delay", `${delay}ms`);
        });

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    entry.target.classList.add("is-visible");
                    obs.unobserve(entry.target);
                });
            },
            { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
        );

        items.forEach((el) => observer.observe(el));
    }


    /* ═══ 4. CONTOARE ANIMATE ══════════════════════════════ */

    function initCounters() {
        const nums = $$("[data-count]");
        if (!nums.length) return;

        function setFinal(el) {
            el.textContent = el.dataset.count;
        }

        if (!("IntersectionObserver" in window) || prefersReducedMotion) {
            nums.forEach(setFinal);
            return;
        }

        function animate(el) {
            const target   = parseFloat(el.dataset.count) || 0;
            const duration = 1600;
            const start    = performance.now();

            function step(now) {
                const t = clamp((now - start) / duration, 0, 1);

                /* easeOutExpo */
                const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

                el.textContent = String(Math.round(target * eased));

                if (t < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    setFinal(el);
                }
            }

            window.requestAnimationFrame(step);
        }

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    animate(entry.target);
                    obs.unobserve(entry.target);
                });
            },
            { threshold: 0.5 }
        );

        nums.forEach((el) => observer.observe(el));
    }


    /* ═══ 5. ÎNAINTE / DUPĂ ════════════════════════════════ */

    function initBeforeAfter() {

        /* — 5a. Slidere — */

        $$("[data-ba]").forEach((wrap) => {
            const before = $(".ba__img--before", wrap);
            const handle = $(".ba__handle", wrap);

            if (!before || !handle) return;

            let dragging = false;

            function setPosition(pct) {
                const p = clamp(pct, 0, 100);

                before.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
                handle.style.left = `${p}%`;
                handle.setAttribute("aria-valuenow", String(Math.round(p)));
            }

            function positionFromEvent(e) {
                const rect = wrap.getBoundingClientRect();
                if (!rect.width) return;

                setPosition(((e.clientX - rect.left) / rect.width) * 100);
            }

            wrap.addEventListener("pointerdown", (e) => {
                dragging = true;
                wrap.setPointerCapture(e.pointerId);
                positionFromEvent(e);
            });

            wrap.addEventListener("pointermove", (e) => {
                if (!dragging) return;

                e.preventDefault();
                positionFromEvent(e);
            });

            const stop = (e) => {
                if (!dragging) return;

                dragging = false;

                if (e.pointerId !== undefined &&
                    wrap.hasPointerCapture?.(e.pointerId)) {
                    wrap.releasePointerCapture(e.pointerId);
                }
            };

            wrap.addEventListener("pointerup", stop);
            wrap.addEventListener("pointercancel", stop);
            wrap.addEventListener("pointerleave", stop);

            /* Navigare cu tastatura */
            handle.addEventListener("keydown", (e) => {
                const current = parseFloat(handle.style.left) || 50;
                const step = e.shiftKey ? 10 : 2;

                const moves = {
                    ArrowLeft:  current - step,
                    ArrowRight: current + step,
                    Home: 0,
                    End: 100
                };

                if (!(e.key in moves)) return;

                e.preventDefault();
                setPosition(moves[e.key]);
            });

            /* Ascunde cardul dacă imaginile lipsesc din repo */
            $$(".ba__img", wrap).forEach((img) => {
                img.addEventListener("error", () => {
                    const card = wrap.closest(".ba-card");
                    if (card) card.remove();
                }, { once: true });
            });

            setPosition(50);
        });

        /* — 5b. Filtre — */

        const filters = $$("[data-ba-filter]");
        const grid    = $("#baGrid");

        if (!filters.length || !grid) return;

        filters.forEach((btn) => {
            btn.addEventListener("click", () => {
                const value = btn.dataset.baFilter;

                filters.forEach((b) => {
                    const active = b === btn;

                    b.classList.toggle("is-active", active);
                    b.setAttribute("aria-pressed", String(active));
                });

                $$(".ba-card", grid).forEach((card) => {
                    const show = value === "all" ||
                                 card.dataset.baCat === value;

                    card.classList.toggle("is-hidden", !show);
                });
            });
        });
    }


    /* ═══ 6. PLAYER VIDEO + PLAYLIST ═══════════════════════ */

    /* Editează lista de mai jos ca să adaugi / scoți clipuri.
       „poster" e opțional, dar recomandat pentru performanță. */
    const VIDEOS = [
        {
            src: "meta/VIDEO-2026-09-03-15-33-13.mp4",
            poster: "meta/posters/video1.jpg",
            title: "Finisaje interioare",
            desc: "Gletuire și pregătire pereți — apartament, Iași."
        },
        {
            src: "meta/loop_vid/video2.mp4",
            poster: "meta/posters/video2.jpg",
            title: "Tencuială decorativă",
            desc: "Aplicare microciment pe perete de accent."
        },
        {
            src: "meta/VIDEO-2026-09-03-15-33-59 2.mp4",
            poster: "meta/posters/video3.jpg",
            title: "Montaj gresie format mare",
            desc: "Nivelare cu clips și rosturi uniforme."
        },
        {
            src: "meta/VIDEO-2026-09-03-15-33-53 2.mp4",
            poster: "meta/posters/video4.jpg",
            title: "Renovare baie",
            desc: "Hidroizolație și placare — etapă intermediară."
        },
        {
            src: "meta/VIDEO-2026-09-03-16-33-41.mp4",
            poster: "meta/posters/video5.jpg",
            title: "Rigips și tavan fals",
            desc: "Structură metalică și scafă cu iluminat LED."
        },
        {
            src: "meta/loop_vid/video5.mp4",
            poster: "meta/posters/video6.jpg",
            title: "Detalii de finisaj",
            desc: "Colțare, profile și racorduri executate curat."
        },
        {
            src: "meta/VIDEO-2026-09-03-15-33-58.mp4",
            poster: "meta/posters/video7.jpg",
            title: "Proiect finalizat",
            desc: "Livrare la cheie — spațiu rezidențial."
        }
    ];

    function initPlayer() {
        const video    = $("#showcaseVideo");
        const list     = $("#playlistItems");
        const player   = video ? video.closest(".player") : null;

        if (!video || !list || !player) return;

        const bigPlay  = $("#playerBig");
        const btnPlay  = $("#btnPlay");
        const btnMute  = $("#btnMute");
        const btnFull  = $("#btnFull");
        const progress = $("#playerProgress");
        const played   = $("#playerPlayed");
        const buffer   = $("#playerBuffer");
        const timeEl   = $("#playerTime");
        const titleEl  = $("#playerTitle");
        const descEl   = $("#playerDesc");
        const autoplay = $("#autoplayToggle");
        const frame    = $(".player__frame", player);

        let index = 0;

        /* — Construiește playlistul — */

        VIDEOS.forEach((item, i) => {
            const li  = document.createElement("li");
            const btn = document.createElement("button");

            btn.type = "button";
            btn.className = "pl-item" + (i === 0 ? " is-active" : "");
            btn.dataset.index = String(i);
            btn.setAttribute("aria-label", `Redă: ${item.title}`);

            btn.innerHTML = `
                <span class="pl-item__thumb">
                    <img src="${item.poster}" alt="" loading="lazy" decoding="async">
                </span>
                <span class="pl-item__body">
                    <span class="pl-item__title">${item.title}</span>
                    <span class="pl-item__meta">${item.desc}</span>
                </span>
            `;

            /* Dacă posterul lipsește, lăsăm doar fundalul */
            const thumbImg = $("img", btn);
            thumbImg.addEventListener("error", () => {
                thumbImg.remove();
            }, { once: true });

            btn.addEventListener("click", () => load(i, true));

            li.appendChild(btn);
            list.appendChild(li);
        });

        const items = $$(".pl-item", list);

        /* — Încarcă un clip — */

        function load(i, autoPlay) {
            index = (i + VIDEOS.length) % VIDEOS.length;

            const item = VIDEOS[index];

            video.src = item.src;
            video.poster = item.poster || "";
            video.setAttribute("aria-label", item.title);
            video.load();

            if (titleEl) titleEl.textContent = item.title;
            if (descEl)  descEl.textContent  = item.desc;

            items.forEach((b, n) => {
                b.classList.toggle("is-active", n === index);
            });

            /* Derulează elementul activ în lista vizibilă */
            const active = items[index];
            if (active && list.scrollHeight > list.clientHeight) {
                active.scrollIntoView({ block: "nearest" });
            }

            if (autoPlay) play();
        }

        /* — Comenzi — */

        function play() {
            const promise = video.play();

            if (promise && typeof promise.catch === "function") {
                promise.catch(() => {
                    /* Browserul a blocat redarea — încercăm fără sunet */
                    video.muted = true;
                    player.classList.remove("is-unmuted");
                    video.play().catch(() => {});
                });
            }
        }

        function togglePlay() {
            video.paused ? play() : video.pause();
        }

        if (bigPlay) bigPlay.addEventListener("click", togglePlay);
        if (btnPlay) btnPlay.addEventListener("click", togglePlay);

        video.addEventListener("click", togglePlay);

        video.addEventListener("play", () => {
            player.classList.add("is-playing");
            if (bigPlay) bigPlay.classList.add("is-hidden");
        });

        video.addEventListener("pause", () => {
            player.classList.remove("is-playing");
            if (bigPlay) bigPlay.classList.remove("is-hidden");
        });

        /* Sunet */
        if (btnMute) {
            btnMute.addEventListener("click", () => {
                video.muted = !video.muted;
                player.classList.toggle("is-unmuted", !video.muted);
            });
        }

        video.muted = true;
        player.classList.remove("is-unmuted");

        /* Ecran complet */
        if (btnFull && frame) {
            btnFull.addEventListener("click", () => {
                if (document.fullscreenElement) {
                    document.exitFullscreen?.();
                } else if (frame.requestFullscreen) {
                    frame.requestFullscreen().catch(() => {});
                } else if (video.webkitEnterFullscreen) {
                    /* iOS Safari */
                    video.webkitEnterFullscreen();
                }
            });
        }

        /* — Progres & timp — */

        function updateProgress() {
            const dur = video.duration;
            if (!Number.isFinite(dur) || dur === 0) return;

            const pct = (video.currentTime / dur) * 100;

            if (played) played.style.width = `${clamp(pct, 0, 100)}%`;

            if (progress) {
                progress.setAttribute("aria-valuenow", String(Math.round(pct)));
            }

            if (timeEl) {
                timeEl.textContent =
                    `${formatTime(video.currentTime)} / ${formatTime(dur)}`;
            }
        }

        video.addEventListener("timeupdate", rafThrottle(updateProgress));
        video.addEventListener("loadedmetadata", updateProgress);

        video.addEventListener("progress", () => {
            if (!buffer || !video.buffered.length || !video.duration) return;

            const end = video.buffered.end(video.buffered.length - 1);
            buffer.style.width = `${clamp((end / video.duration) * 100, 0, 100)}%`;
        });

        /* — Căutare în bara de progres — */

        if (progress) {
            let seeking = false;

            function seekFromEvent(e) {
                const rect = progress.getBoundingClientRect();
                if (!rect.width || !Number.isFinite(video.duration)) return;

                const pct = clamp((e.clientX - rect.left) / rect.width, 0, 1);
                video.currentTime = pct * video.duration;

                updateProgress();
            }

            progress.addEventListener("pointerdown", (e) => {
                seeking = true;
                progress.setPointerCapture(e.pointerId);
                seekFromEvent(e);
            });

            progress.addEventListener("pointermove", (e) => {
                if (seeking) seekFromEvent(e);
            });

            progress.addEventListener("pointerup", () => { seeking = false; });
            progress.addEventListener("pointercancel", () => { seeking = false; });

            progress.addEventListener("keydown", (e) => {
                if (!Number.isFinite(video.duration)) return;

                const jump = { ArrowLeft: -5, ArrowRight: 5 };

                if (e.key in jump) {
                    e.preventDefault();
                    video.currentTime = clamp(
                        video.currentTime + jump[e.key], 0, video.duration
                    );
                    updateProgress();
                }

                if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    togglePlay();
                }
            });
        }

        /* — Clip următor / eroare — */

        video.addEventListener("ended", () => {
            if (autoplay && autoplay.checked) {
                load(index + 1, true);
            } else {
                player.classList.remove("is-playing");
                if (bigPlay) bigPlay.classList.remove("is-hidden");
            }
        });

        video.addEventListener("error", () => {
            console.warn("Clip indisponibil:", VIDEOS[index]?.src);

            if (autoplay && autoplay.checked && VIDEOS.length > 1) {
                load(index + 1, true);
            }
        });

        /* — Pauză când secțiunea iese din ecran — */

        if ("IntersectionObserver" in window) {
            const io = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting && !video.paused) {
                            video.pause();
                        }
                    });
                },
                { threshold: 0.25 }
            );

            io.observe(player);
        }

        document.addEventListener("visibilitychange", () => {
            if (document.hidden && !video.paused) video.pause();
        });

        /* — Pornire — */

        load(0, false);
    }


    /* ═══ 7. FORMULAR DE OFERTĂ ════════════════════════════ */

    function initForm() {
        const form   = $("#quoteForm");
        if (!form) return;

        const submit = $("#quoteSubmit");
        const status = $("#formStatus");

        const RULES = {
            prenume: {
                test: (v) => v.trim().length >= 2,
                msg: "Introdu prenumele (minim 2 caractere)."
            },
            nume: {
                test: (v) => v.trim().length >= 2,
                msg: "Introdu numele de familie."
            },
            email: {
                test: (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()),
                msg: "Adresa de email nu pare validă."
            },
            telefon: {
                test: (v) => {
                    const digits = v.replace(/[\s().-]/g, "");
                    return /^(\+?4?0)?7\d{8}$/.test(digits) ||
                           /^\+?\d{9,15}$/.test(digits);
                },
                msg: "Introdu un număr valid (ex. 0732 657 454)."
            },
            mesaj: {
                test: (v) => v.trim().length >= 15,
                msg: "Descrie pe scurt proiectul (minim 15 caractere)."
            },
            gdpr: {
                test: (v, el) => el.checked,
                msg: "Trebuie să accepți prelucrarea datelor."
            }
        };

        function showError(id, message) {
            const field = $(`#${id}`);
            const box   = $(`[data-error-for="${id}"]`);

            if (field) {
                field.closest(".form-field")?.classList.add("has-error");
                field.setAttribute("aria-invalid", "true");
            }

            if (box) {
                box.textContent = message;
                box.classList.add("is-shown");
            }
        }

        function clearError(id) {
            const field = $(`#${id}`);
            const box   = $(`[data-error-for="${id}"]`);

            if (field) {
                field.closest(".form-field")?.classList.remove("has-error");
                field.removeAttribute("aria-invalid");
            }

            if (box) {
                box.textContent = "";
                box.classList.remove("is-shown");
            }
        }

        function validateField(id) {
            const rule  = RULES[id];
            const field = $(`#${id}`);

            if (!rule || !field) return true;

            const ok = rule.test(field.value, field);

            ok ? clearError(id) : showError(id, rule.msg);

            return ok;
        }

        /* Validare la ieșirea din câmp + curățare la scriere */
        Object.keys(RULES).forEach((id) => {
            const field = $(`#${id}`);
            if (!field) return;

            const evt = field.type === "checkbox" ? "change" : "blur";

            field.addEventListener(evt, () => validateField(id));

            field.addEventListener("input", () => {
                if (field.closest(".form-field")?.classList.contains("has-error") ||
                    field.type === "checkbox") {
                    validateField(id);
                }
            });
        });

        function setStatus(message, type) {
            if (!status) return;

            status.textContent = message;
            status.classList.remove("is-success", "is-error");

            if (type) status.classList.add(`is-${type}`);
        }

        /* — Trimitere — */

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            setStatus("", null);

            /* Honeypot: dacă e completat, e bot */
            const honeypot = $("#website");
            if (honeypot && honeypot.value) return;

            /* Validare completă */
            const ids = Object.keys(RULES);
            let firstInvalid = null;

            ids.forEach((id) => {
                const ok = validateField(id);
                if (!ok && !firstInvalid) firstInvalid = id;
            });

            if (firstInvalid) {
                $(`#${firstInvalid}`)?.focus();
                setStatus("Verifică câmpurile marcate cu roșu.", "error");
                return;
            }

            /* Protecție: Formspree neconfigurat */
            if (form.action.includes("ID_FORMULAR")) {
                setStatus(
                    "Formularul nu este încă configurat. " +
                    "Sună-ne la +40 732 657 454 sau scrie la info7ccprobau@gmail.com.",
                    "error"
                );
                return;
            }

            submit?.classList.add("is-loading");
            submit?.setAttribute("disabled", "disabled");

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    headers: { Accept: "application/json" }
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                form.reset();
                ids.forEach(clearError);

                setStatus(
                    "Mulțumim! Am primit cererea ta. Te contactăm în " +
                    "maximum 24 de ore lucrătoare.",
                    "success"
                );

                status?.scrollIntoView({ block: "nearest", behavior: "smooth" });

            } catch (err) {
                console.error(err);

                setStatus(
                    "Nu am putut trimite mesajul. Încearcă din nou sau " +
                    "sună la +40 732 657 454.",
                    "error"
                );
            } finally {
                submit?.classList.remove("is-loading");
                submit?.removeAttribute("disabled");
            }
        });
    }


    /* ═══ 8. ÎNAPOI SUS ════════════════════════════════════ */

    function initToTop() {
        const btn = $("#toTop");
        if (!btn) return;

        const onScroll = rafThrottle(() => {
            btn.classList.toggle("is-shown", window.scrollY > 700);
        });

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        btn.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion ? "auto" : "smooth"
            });
        });
    }


    /* ═══ PORNIRE ══════════════════════════════════════════ */

    function init() {
        initBootstrap();
        initHeader();
        initReveal();
        initCounters();
        initBeforeAfter();
        initPlayer();
        initForm();
        initToTop();
    }

    document.readyState === "loading"
        ? document.addEventListener("DOMContentLoaded", init)
        : init();

})();
