/* ==========================================================
   Portfolio interactions (vanilla JS, no dependencies)
   1. Theme  2. Mobile menu  3. Scroll spy  4. Project filter
   5. Contact form  6. Hero network canvas
   ========================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* Footer year */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* 1. Theme: saved choice wins, otherwise follow the system */
  var themeBtn = $('#theme');
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function currentTheme() {
    return root.getAttribute('data-theme') || (systemDark.matches ? 'dark' : 'light');
  }
  function applyTheme(theme, save) {
    root.setAttribute('data-theme', theme);
    themeBtn.setAttribute('aria-pressed', String(theme === 'dark'));
    if (save) { try { localStorage.setItem('theme', theme); } catch (e) { /* storage blocked */ } }
    window.dispatchEvent(new Event('themechange'));
  }
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  } catch (e) { /* storage blocked */ }
  themeBtn.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
  themeBtn.addEventListener('click', function () {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
  });

  /* 2. Mobile menu */
  var menuBtn = $('#menu');
  var nav = $('#nav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });

  /* 3. Scroll spy: mark the nav link of the section in view */
  var links = $$('.nav a');
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          if (a.getAttribute('href') === '#' + entry.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* 4. Project filter */
  var filters = $$('.filter');
  var projects = $$('.project');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-filter');
      filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      projects.forEach(function (p) { p.hidden = !(f === 'all' || p.getAttribute('data-cat') === f); });
    });
  });

  /* 5. Contact form: validate, then open the visitor's email app */
  var form = $('#form');
  var status = $('#status');
  var EMAIL_TO = 'you@example.com'; // change to your address

  function check(input, errId, valid) {
    var err = $('#' + errId);
    input.setAttribute('aria-invalid', String(!valid));
    if (!valid) input.setAttribute('aria-describedby', errId); else input.removeAttribute('aria-describedby');
    err.hidden = valid;
    return valid;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#f-name'), email = $('#f-email'), msg = $('#f-msg');
    var ok = [
      check(name, 'e-name', name.value.trim().length > 0),
      check(email, 'e-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())),
      check(msg, 'e-msg', msg.value.trim().length >= 10)
    ];
    if (ok.indexOf(false) !== -1) {
      status.textContent = 'Fix the highlighted fields and send again.';
      $('[aria-invalid="true"]', form).focus();
      return;
    }
    var subject = encodeURIComponent('Portfolio message from ' + name.value.trim());
    var body = encodeURIComponent(msg.value.trim() + '\n\n' + name.value.trim() + '\n' + email.value.trim());
    window.location.href = 'mailto:' + EMAIL_TO + '?subject=' + subject + '&body=' + body;
    status.textContent = 'Opening your email app to send the message.';
  });

  /* 6. Hero: a small neural network. Signals travel along connections,
        and nodes near the pointer light up. */
  var canvas = $('#net');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var LAYERS = [4, 6, 6, 3];
  var nodes = [], edges = [], pulses = [];
  var w = 0, h = 0, colors = {}, mouse = { x: -999, y: -999 };
  var running = false, inView = true, lastSpawn = 0;

  function readColors() {
    var s = getComputedStyle(root);
    colors.accent = s.getPropertyValue('--accent').trim();
    colors.line = s.getPropertyValue('--muted').trim();
  }
  function build() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nodes = []; edges = []; pulses = [];
    var x0 = w * (w > 820 ? 0.45 : 0.08), x1 = w * 0.94;
    LAYERS.forEach(function (count, l) {
      for (var i = 0; i < count; i++) {
        nodes.push({ layer: l, glow: 0,
          x: x0 + (x1 - x0) * l / (LAYERS.length - 1),
          y: h * (0.12 + 0.76 * (i + 0.5) / count) });
      }
    });
    nodes.forEach(function (a) {
      nodes.forEach(function (b) { if (b.layer === a.layer + 1) edges.push({ a: a, b: b }); });
    });
    readColors();
    draw();
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    edges.forEach(function (e) {
      var mx = (e.a.x + e.b.x) / 2 - mouse.x, my = (e.a.y + e.b.y) / 2 - mouse.y;
      var near = Math.max(0, 1 - Math.sqrt(mx * mx + my * my) / 160);
      ctx.globalAlpha = 0.16 + near * 0.5;
      ctx.strokeStyle = near > 0.05 ? colors.accent : colors.line;
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
    });
    ctx.fillStyle = colors.accent;
    pulses.forEach(function (p) {
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(p.e.a.x + (p.e.b.x - p.e.a.x) * p.t, p.e.a.y + (p.e.b.y - p.e.a.y) * p.t, 3, 0, 6.283);
      ctx.fill();
    });
    nodes.forEach(function (n) {
      var dx = n.x - mouse.x, dy = n.y - mouse.y;
      var near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 140);
      var g = Math.max(near, n.glow);
      ctx.globalAlpha = 0.35 + g * 0.65;
      ctx.beginPath(); ctx.arc(n.x, n.y, 5 + g * 4, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function frame(time) {
    if (!running) return;
    if (time - lastSpawn > 380 && pulses.length < 14) {
      lastSpawn = time;
      pulses.push({ e: edges[Math.floor(Math.random() * edges.length)], t: 0 });
    }
    pulses = pulses.filter(function (p) {
      p.t += 0.012;
      if (p.t >= 1) { p.e.b.glow = 1; return false; }
      return true;
    });
    nodes.forEach(function (n) { n.glow = Math.max(0, n.glow - 0.03); });
    draw();
    requestAnimationFrame(frame);
  }
  function update() {
    var should = inView && !document.hidden && !reduceMotion.matches;
    if (should && !running) { running = true; requestAnimationFrame(frame); }
    if (!should) { running = false; draw(); }
  }

  var hero = $('#home');
  hero.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    if (!running) draw();
  });
  hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; if (!running) draw(); });
  window.addEventListener('resize', build);
  window.addEventListener('themechange', function () { readColors(); draw(); });
  systemDark.addEventListener('change', function () { readColors(); draw(); });
  reduceMotion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; update(); }).observe(hero);
  }
  build();
  update();
})();
