/* =========================================================
   interactions: particles, typing, scroll reveals, tilt,
   parallax, counters, cursor
   ========================================================= */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------------------------------------------------------
     split text into animated words
     --------------------------------------------------------- */
  let wordIndex = 0;

  function buildWords(node, gradient) {
    const frag = document.createDocumentFragment();

    Array.from(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        const tokens = child.textContent.split(/(\s+)/);
        tokens.forEach(function (token) {
          if (!token.trim()) {
            if (token) frag.appendChild(document.createTextNode(token));
            return;
          }
          const wrap = document.createElement("span");
          wrap.className = "word";
          const inner = document.createElement("i");
          inner.textContent = token;
          inner.style.setProperty("--i", wordIndex++);
          if (gradient) inner.classList.add("grad-i");
          wrap.appendChild(inner);
          frag.appendChild(wrap);
        });
      } else if (child.nodeType === 1) {
        if (child.tagName === "BR") {
          frag.appendChild(child.cloneNode(false));
          return;
        }
        const copy = child.cloneNode(false);
        copy.appendChild(buildWords(child, gradient || child.classList.contains("grad-text")));
        frag.appendChild(copy);
      }
    });

    return frag;
  }

  document.querySelectorAll(".sec-title[data-split], .contact-title[data-split]").forEach(function (el) {
    wordIndex = 0;
    const built = buildWords(el, el.classList.contains("grad-text"));
    el.textContent = "";
    el.appendChild(built);
  });

  /* ---------------------------------------------------------
     hero letters with a continuous gradient across the line
     --------------------------------------------------------- */
  const accentLines = [];

  document.querySelectorAll(".hero-title .line[data-split]").forEach(function (line) {
    const text = line.textContent.trim();
    line.textContent = "";
    Array.from(text).forEach(function (ch, i) {
      const span = document.createElement("span");
      span.className = "char" + (ch === " " ? " space" : "");
      span.textContent = ch === " " ? "\u00A0" : ch;
      span.style.setProperty("--i", i);
      line.appendChild(span);
    });
    if (line.classList.contains("accent")) accentLines.push(line);
  });

  function paintAccentGradient() {
    accentLines.forEach(function (line) {
      const width = line.getBoundingClientRect().width || window.innerWidth * 0.8;
      Array.from(line.children).forEach(function (ch) {
        ch.style.backgroundImage = "linear-gradient(115deg, #3ef2ff, #8b5cf6 52%, #ff4bb0)";
        ch.style.backgroundSize = width + "px 100%";
        ch.style.backgroundPosition = "-" + ch.offsetLeft + "px 0";
        ch.style.webkitBackgroundClip = "text";
        ch.style.backgroundClip = "text";
        ch.style.color = "transparent";
      });
    });
  }
  paintAccentGradient();
  window.addEventListener("load", paintAccentGradient);
  window.addEventListener("resize", paintAccentGradient);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintAccentGradient);

  /* ---------------------------------------------------------
     reveal on scroll
     --------------------------------------------------------- */
  const revealTargets = document.querySelectorAll("[data-reveal], .split");

  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );
    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------------------------------------------------
     typewriter
     --------------------------------------------------------- */
  const typeEl = document.getElementById("roleType");
  if (typeEl) {
    let words = [];
    try { words = JSON.parse(typeEl.dataset.words || "[]"); } catch (e) { words = []; }
    if (words.length) {
      if (reduceMotion) {
        typeEl.textContent = words[0];
      } else {
        let wi = 0, ci = 0, deleting = false;
        (function tick() {
          const word = words[wi];
          ci += deleting ? -1 : 1;
          typeEl.textContent = word.slice(0, ci);
          let wait = deleting ? 34 : 58;
          if (!deleting && ci === word.length) { deleting = true; wait = 1900; }
          else if (deleting && ci === 0) { deleting = false; wi = (wi + 1) % words.length; wait = 320; }
          window.setTimeout(tick, wait);
        })();
      }
    }
  }

  /* ---------------------------------------------------------
     counters
     --------------------------------------------------------- */
  const counters = document.querySelectorAll("[data-count]");
  function runCounter(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const duration = 1500;
    const start = performance.now();

    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(frame);
  }

  if ("IntersectionObserver" in window && !reduceMotion) {
    const countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { countObserver.observe(el); });
  } else {
    counters.forEach(function (el) {
      el.textContent = el.dataset.count + (el.dataset.suffix || "");
    });
  }

  /* ---------------------------------------------------------
     scroll-driven: progress, parallax, timeline, nav state
     --------------------------------------------------------- */
  const bar = document.getElementById("progressBar");
  const nav = document.getElementById("nav");
  const parallaxEls = Array.from(document.querySelectorAll("[data-parallax]"));
  const timeline = document.getElementById("timeline");
  const timelineFill = document.getElementById("timelineFill");
  const tickerTrack = document.getElementById("tickerTrack");
  let ticking = false;

  if (tickerTrack) tickerTrack.innerHTML += tickerTrack.innerHTML;

  function onScrollFrame() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight - vh;

    if (bar) bar.style.width = (docH > 0 ? Math.min(100, (y / docH) * 100) : 0) + "%";
    if (nav) nav.classList.toggle("is-stuck", y > 24);

    parallaxEls.forEach(function (el) {
      const speed = parseFloat(el.dataset.parallax) || 0;
      const rect = el.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - vh / 2) * speed;
      el.style.transform = "translate3d(0," + offset.toFixed(2) + "px,0)";
    });

    if (timeline && timelineFill) {
      const r = timeline.getBoundingClientRect();
      const progress = (vh * 0.62 - r.top) / r.height;
      timelineFill.style.height = Math.max(0, Math.min(1, progress)) * 100 + "%";
    }

    ticking = false;
  }

  function requestScrollFrame() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScrollFrame);
    }
  }

  window.addEventListener("scroll", requestScrollFrame, { passive: true });
  window.addEventListener("resize", requestScrollFrame);
  onScrollFrame();

  /* ---------------------------------------------------------
     active nav link
     --------------------------------------------------------- */
  const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
  const sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-42% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (s) { navObserver.observe(s); });
  }

  /* ---------------------------------------------------------
     cursor glow + dot
     --------------------------------------------------------- */
  if (canHover && !reduceMotion) {
    const glow = document.getElementById("cursorGlow");
    const dot = document.getElementById("cursorDot");
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let gx = mx, gy = my;

    window.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      document.body.classList.add("has-pointer");
      const hot = e.target.closest("a, button, .pills li, .stat, .proj-card");
      document.body.classList.toggle("cursor-hot", !!hot);
      if (dot) dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
    }, { passive: true });

    (function loop() {
      gx += (mx - gx) * 0.09;
      gy += (my - gy) * 0.09;
      if (glow) glow.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------------------------------------------------
     robot looks at the pointer
     --------------------------------------------------------- */
  const bot = document.getElementById("bot");
  const heroEl = document.getElementById("hero");
  if (bot && heroEl && canHover && !reduceMotion) {
    heroEl.addEventListener("pointermove", function (e) {
      const r = bot.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(r.width, 1);
      const dy = (e.clientY - (r.top + r.height / 2)) / Math.max(r.height, 1);
      const clamp = function (v) { return Math.max(-1, Math.min(1, v)); };
      bot.style.setProperty("--look-x", (clamp(dx * 1.8) * 7).toFixed(1) + "px");
      bot.style.setProperty("--look-y", (clamp(dy * 1.8) * 5).toFixed(1) + "px");
    }, { passive: true });
  }

  /* ---------------------------------------------------------
     magnetic buttons
     --------------------------------------------------------- */
  if (canHover && !reduceMotion) {
    document.querySelectorAll(".magnetic").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = "translate(" + dx * 9 + "px," + dy * 7 + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------------------------------------------------------
     3D tilt + spotlight cards
     --------------------------------------------------------- */
  if (canHover && !reduceMotion) {
    document.querySelectorAll(".stat, .proj-card").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", px * 100 + "%");
        el.style.setProperty("--my", py * 100 + "%");
        if (el.classList.contains("tilt")) {
          el.style.transform =
            "rotateY(" + (px - 0.5) * 7 + "deg) rotateX(" + (0.5 - py) * 7 + "deg) translateY(-4px)";
        }
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------------------------------------------------------
     hero particle field
     --------------------------------------------------------- */
  const canvas = document.getElementById("hero-canvas");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const hero = canvas.parentElement;
    let w = 0, h = 0, points = [], raf = null;
    const pointer = { x: -9999, y: -9999 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = hero.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = reduceMotion ? 40 : Math.min(120, Math.round((w * h) / 15000));
      points = [];
      for (let i = 0; i < count; i++) {
        points.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.26,
          vy: (Math.random() - 0.5) * 0.26,
          r: Math.random() * 1.4 + 0.5
        });
      }
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        for (let j = i + 1; j < points.length; j++) {
          const q = points[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 20000) {
            const a = (1 - d2 / 20000) * 0.34;
            ctx.strokeStyle = "rgba(96, 200, 255," + a.toFixed(3) + ")";
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        const mdx = p.x - pointer.x, mdy = p.y - pointer.y;
        const md2 = mdx * mdx + mdy * mdy;
        if (md2 < 34000) {
          const a = (1 - md2 / 34000) * 0.6;
          ctx.strokeStyle = "rgba(62, 242, 255," + a.toFixed(3) + ")";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.fillStyle = "rgba(168, 228, 255, 0.72)";
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function step() {
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
      }
      draw();
      raf = requestAnimationFrame(step);
    }

    function start() { if (!raf) step(); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    hero.addEventListener("pointermove", function (e) {
      const r = hero.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener("pointerleave", function () {
      pointer.x = -9999; pointer.y = -9999;
    });

    window.addEventListener("resize", resize);
    resize();

    if (reduceMotion) {
      draw();
    } else if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) start(); else stop();
      }, { threshold: 0.02 }).observe(hero);
    } else {
      start();
    }
  }

  /* ---------------------------------------------------------
     copy email
     --------------------------------------------------------- */
  const copyBtn = document.getElementById("copyEmail");
  const toast = document.getElementById("toast");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      const email = copyBtn.dataset.email;
      const done = function () {
        if (!toast) return;
        toast.classList.add("is-on");
        window.setTimeout(function () { toast.classList.remove("is-on"); }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done).catch(function () {});
      } else {
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  }
})();
