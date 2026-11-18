/* =========================================================
   interactions
   scroll reveals · typing · counters · cursor
   + autonomous path playback · oscilloscope · live telemetry
   ========================================================= */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------------------------------------------------------
     split section headings into animated words
     --------------------------------------------------------- */
  let wordIndex = 0;

  function buildWords(node) {
    const frag = document.createDocumentFragment();

    Array.from(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        child.textContent.split(/(\s+)/).forEach(function (token) {
          if (!token.trim()) {
            if (token) frag.appendChild(document.createTextNode(token));
            return;
          }
          const wrap = document.createElement("span");
          wrap.className = "word";
          const inner = document.createElement("i");
          inner.textContent = token;
          inner.style.setProperty("--i", wordIndex++);
          wrap.appendChild(inner);
          frag.appendChild(wrap);
        });
      } else if (child.nodeType === 1) {
        if (child.tagName === "BR") {
          frag.appendChild(child.cloneNode(false));
          return;
        }
        const copy = child.cloneNode(false);
        copy.appendChild(buildWords(child));
        frag.appendChild(copy);
      }
    });

    return frag;
  }

  document.querySelectorAll(".sec-title[data-split], .contact-title[data-split]").forEach(function (el) {
    wordIndex = 0;
    const built = buildWords(el);
    el.textContent = "";
    el.appendChild(built);
  });

  /* ---------------------------------------------------------
     hero name letters
     --------------------------------------------------------- */
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
  });

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
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
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
          let wait = deleting ? 28 : 52;
          if (!deleting && ci === word.length) { deleting = true; wait = 2100; }
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
    const duration = 1400;
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
     telemetry binding
     --------------------------------------------------------- */
  const telGroups = {};
  document.querySelectorAll("[data-tel]").forEach(function (node) {
    const key = node.dataset.tel;
    (telGroups[key] = telGroups[key] || []).push(node);
  });

  function setTel(key, value) {
    const nodes = telGroups[key];
    if (!nodes) return;
    nodes.forEach(function (node) { node.textContent = value; });
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
    if (nav) nav.classList.toggle("is-stuck", y > 18);

    parallaxEls.forEach(function (el) {
      if (window.innerWidth < 1081) { el.style.transform = ""; return; }
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
     cursor
     --------------------------------------------------------- */
  if (canHover && !reduceMotion) {
    const glow = document.getElementById("cursorGlow");
    const dot = document.getElementById("cursorDot");
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let gx = mx, gy = my;

    window.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      document.body.classList.add("has-pointer");
      const hot = e.target.closest("a, button, .pills li, .stat, .proj-card, .contact-card");
      document.body.classList.toggle("cursor-hot", !!hot);
      if (dot) dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
    }, { passive: true });

    (function loop() {
      gx += (mx - gx) * 0.08;
      gy += (my - gy) * 0.08;
      if (glow) glow.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";
      requestAnimationFrame(loop);
    })();
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
        el.style.transform = "translate(" + dx * 5 + "px," + dy * 4 + "px)";
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
            "rotateY(" + (px - 0.5) * 4 + "deg) rotateX(" + (0.5 - py) * 4 + "deg) translateY(-2px)";
        }
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------------------------------------------------------
     autonomous path playback (field map)
     --------------------------------------------------------- */
  const routePath = document.getElementById("autonPath");
  const runTrail = document.getElementById("runTrail");
  const botGroup = document.getElementById("autonBot");

  if (routePath && runTrail && botGroup && routePath.getTotalLength) {
    const total = routePath.getTotalLength();
    const TRAVERSE = 16500;  // ms for the full auton routine
    const HOLD = 1700;       // pause at the final waypoint
    const FIELD_PX = 304;    // field border width in map units
    const FIELD_M = 3.66;    // 12 ft

    runTrail.style.strokeDasharray = total;
    runTrail.style.strokeDashoffset = reduceMotion ? total * 0.42 : total;

    let progress = reduceMotion ? 0.58 : 0;
    let hold = 0;
    let last = 0;

    function setPose(p) {
      const s = Math.max(0, Math.min(total, p * total));
      const pt = routePath.getPointAtLength(s);
      const a = routePath.getPointAtLength(Math.max(0, s - 4));
      const b = routePath.getPointAtLength(Math.min(total, s + 4));
      const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;

      botGroup.setAttribute(
        "transform",
        "translate(" + pt.x.toFixed(2) + "," + pt.y.toFixed(2) + ") rotate(" + (angle + 90).toFixed(2) + ")"
      );
      runTrail.style.strokeDashoffset = total * (1 - p);

      const x = ((pt.x - 8) / FIELD_PX) * FIELD_M;
      const y = ((312 - pt.y) / FIELD_PX) * FIELD_M;
      const yaw = ((angle % 360) + 360) % 360;
      setTel("x", x.toFixed(2));
      setTel("y", y.toFixed(2));
      setTel("yaw", yaw.toFixed(0));
    }

    setPose(progress);

    function autonFrame(now) {
      if (!last) last = now;
      const dt = Math.min(64, now - last);
      last = now;

      if (hold > 0) {
        hold -= dt;
        if (hold <= 0) progress = 0;
      } else {
        progress += dt / TRAVERSE;
        if (progress >= 1) { progress = 1; hold = HOLD; }
      }

      setPose(progress);
      requestAnimationFrame(autonFrame);
    }

    if (!reduceMotion) requestAnimationFrame(autonFrame);
  }

  /* ---------------------------------------------------------
     oscilloscope: commanded vs measured drive velocity
     --------------------------------------------------------- */
  const scope = document.getElementById("scope");
  if (scope && scope.getContext) {
    const sctx = scope.getContext("2d");
    const SAMPLES = 170;
    const CMD = [];       // commanded setpoint history
    const ACT = [];       // measured velocity history

    let w = 0, h = 0;
    let cmd = 0;
    let act = 0;
    let elapsed = 0;
    let nextStep = 1.1;
    let raf = null;

    function sizeScope() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = scope.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      scope.width = Math.round(w * dpr);
      scope.height = Math.round(h * dpr);
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScope();
    }

    function drawScope() {
      const padL = 24, padR = 8, padT = 8, padB = 10;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;
      const yMax = 2.8;

      sctx.clearRect(0, 0, w, h);

      // grid
      sctx.lineWidth = 1;
      sctx.strokeStyle = "rgba(255,255,255,0.07)";
      for (let i = 0; i <= 4; i++) {
        const y = padT + (plotH / 4) * i;
        sctx.beginPath();
        sctx.moveTo(padL, y + 0.5);
        sctx.lineTo(padL + plotW, y + 0.5);
        sctx.stroke();
      }
      sctx.strokeStyle = "rgba(255,255,255,0.045)";
      for (let i = 0; i <= 8; i++) {
        const x = padL + (plotW / 8) * i;
        sctx.beginPath();
        sctx.moveTo(x + 0.5, padT);
        sctx.lineTo(x + 0.5, padT + plotH);
        sctx.stroke();
      }

      // axis labels
      sctx.fillStyle = "rgba(255,255,255,0.28)";
      sctx.font = "8px 'IBM Plex Mono', monospace";
      sctx.textAlign = "right";
      sctx.fillText("2.8", padL - 4, padT + 7);
      sctx.fillText("0", padL - 4, padT + plotH);
      sctx.textAlign = "left";
      sctx.fillText("s", padL + 2, padT + plotH + 8);

      function plot(series, stroke, width, dash) {
        if (series.length < 2) return;
        sctx.beginPath();
        sctx.lineWidth = width;
        sctx.strokeStyle = stroke;
        sctx.setLineDash(dash || []);
        series.forEach(function (v, i) {
          const x = padL + (i / (SAMPLES - 1)) * plotW;
          const y = padT + plotH - Math.min(1, Math.max(0, v / yMax)) * plotH;
          if (i === 0) sctx.moveTo(x, y); else sctx.lineTo(x, y);
        });
        sctx.stroke();
        sctx.setLineDash([]);
      }

      plot(ACT, "rgba(240,161,46,0.13)", 8);
      plot(CMD, "rgba(87,182,217,0.75)", 1.2, [3, 3]);
      plot(ACT, "#f0a12e", 1.6);

      // live cursor
      if (ACT.length) {
        const v = ACT[ACT.length - 1];
        const y = padT + plotH - Math.min(1, Math.max(0, v / yMax)) * plotH;
        const x = padL + plotW;
        sctx.fillStyle = "#f0a12e";
        sctx.beginPath();
        sctx.arc(x - 2, y, 2, 0, Math.PI * 2);
        sctx.fill();
      }
    }

    function stepScope(dt) {
      elapsed += dt;
      if (elapsed >= nextStep) {
        cmd = cmd > 0.1 ? 0 : 2.4;
        nextStep = elapsed + (cmd > 0 ? 3600 : 2200);
      }
      const tau = 0.17;
      act += (cmd - act) * Math.min(1, dt / 1000 / tau);
      const measured = Math.max(0, act + (Math.random() - 0.5) * 0.055);
      const error = Math.abs(cmd - measured);

      CMD.push(cmd);
      ACT.push(measured);
      if (CMD.length > SAMPLES) CMD.shift();
      if (ACT.length > SAMPLES) ACT.shift();

      setTel("err", error.toFixed(2));
    }

    let lastScope = 0;
    function scopeFrame(now) {
      if (!lastScope) lastScope = now;
      const dt = Math.min(80, now - lastScope);
      lastScope = now;
      stepScope(dt);
      drawScope();
      raf = requestAnimationFrame(scopeFrame);
    }

    if (reduceMotion) {
      for (let i = 0; i < SAMPLES; i++) {
        const t = i / SAMPLES;
        CMD.push(t > 0.1 && t < 0.62 ? 2.4 : 0);
        const target = CMD[i];
        act += (target - act) * 0.22;
        ACT.push(act + (Math.random() - 0.5) * 0.03);
      }
      setTel("err", "0.05");
    }

    window.addEventListener("resize", sizeScope);
    sizeScope();

    if (!reduceMotion) {
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) {
            if (!raf) { lastScope = 0; raf = requestAnimationFrame(scopeFrame); }
          } else if (raf) {
            cancelAnimationFrame(raf);
            raf = null;
          }
        }, { threshold: 0.05 }).observe(scope);
      } else {
        raf = requestAnimationFrame(scopeFrame);
      }
    }
  }

  /* ---------------------------------------------------------
     live telemetry (battery sag, draw, loop time, bus load)
     --------------------------------------------------------- */
  (function telemetry() {
    if (reduceMotion) {
      setTel("bat", "12.47");
      setTel("current", "38.2");
      setTel("loop", "5.0");
      setTel("can", "82");
      return;
    }

    let current = 38;
    let battery = 12.52;
    let t = 0;

    function sample() {
      t += 0.12;

      current += (26 + Math.sin(t * 0.9) * 18 + (Math.random() - 0.5) * 9 - current) * 0.25;
      current = Math.max(4, Math.min(78, current));

      const target = 12.62 - (current / 78) * 0.42;
      battery += (target - battery) * 0.35;

      const loop = 5.0 + (Math.random() - 0.5) * 0.7;
      const can = 78 + Math.sin(t * 0.5) * 8 + (Math.random() - 0.5) * 4;

      setTel("bat", battery.toFixed(2));
      setTel("current", current.toFixed(1));
      setTel("loop", loop.toFixed(1));
      setTel("can", Math.round(can));
    }

    sample();
    window.setInterval(sample, 120);
  })();

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
