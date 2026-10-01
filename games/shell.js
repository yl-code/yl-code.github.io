(function (root) {
  'use strict';

  function fit(canvas) {
    var stage = canvas.parentElement;
    var availW = stage.clientWidth;
    var availH = stage.clientHeight;
    if (availW < 8 || availH < 8) return;
    var rw = canvas.width;
    var rh = canvas.height;
    var w = availW;
    var h = (w * rh) / rw;
    if (h > availH) {
      h = availH;
      w = (h * rw) / rh;
    }
    canvas.style.width = Math.floor(w) + 'px';
    canvas.style.height = Math.floor(h) + 'px';
  }

  function hold(el, fn) {
    var delay = 0;
    var rep = 0;
    var active = false;

    function clear() {
      active = false;
      if (delay) clearTimeout(delay);
      if (rep) clearInterval(rep);
      delay = 0;
      rep = 0;
    }

    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      clear();
      active = true;
      fn();
      delay = setTimeout(function () {
        if (!active) return;
        rep = setInterval(function () {
          if (active) fn();
        }, 70);
      }, 150);
    });
    el.addEventListener('pointerup', clear);
    el.addEventListener('pointercancel', clear);
    window.addEventListener('pointerup', clear);
    window.addEventListener('pointercancel', clear);
  }

  function loadBest(key) {
    try {
      var n = parseInt(localStorage.getItem(key), 10);
      return n > 0 ? n : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(key, score) {
    var best = loadBest(key);
    if (score <= best) return best;
    try { localStorage.setItem(key, String(score)); } catch (e) {}
    return score;
  }

  function loadDiff(key) {
    try {
      var n = parseInt(localStorage.getItem(key), 10);
      if (n === 0 || n === 2) return n;
    } catch (e) {}
    return 1;
  }

  function saveDiff(key, n) {
    try { localStorage.setItem(key, String(n)); } catch (e) {}
  }

  function backing(cssW, cssH, maxPixels) {
    var dpr = window.devicePixelRatio || 1;
    var area;
    if (dpr < 1) dpr = 1;
    if (dpr > 2) dpr = 2;
    area = cssW * cssH;
    if (!(area > 0)) return 1;
    if (!maxPixels || maxPixels < area) maxPixels = area;
    if (area * dpr * dpr > maxPixels) dpr = Math.sqrt(maxPixels / area);
    return dpr;
  }

  function onResize(fn) {
    var wait = 0;
    addEventListener('resize', function () {
      if (wait) clearTimeout(wait);
      wait = setTimeout(function () {
        wait = 0;
        fn();
      }, 120);
    });
  }

  function onHide(fn) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) fn();
    });
  }

  root.Arcade = {
    fit: fit,
    hold: hold,
    loadBest: loadBest,
    saveBest: saveBest,
    loadDiff: loadDiff,
    saveDiff: saveDiff,
    backing: backing,
    onResize: onResize,
    onHide: onHide
  };
})(window);
