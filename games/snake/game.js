(function (root) {
  'use strict';

  var COLS = 15;
  var ROWS = 22;
  var MAX = COLS * ROWS;
  var STRIDE = 8;
  var RANKS = [
    { step: 240, floor: 150, accel: 3, gain: 10, bonus: 40 },
    { step: 180, floor: 96, accel: 6, gain: 10, bonus: 50 },
    { step: 120, floor: 64, accel: 8, gain: 20, bonus: 80 }
  ];
  var SPARKS = 160;
  var OFF = '#1a1a1a';
  var HALF = '#737373';
  var LIT = '#ececec';

  function create() {
    var xs = new Int16Array(MAX);
    var ys = new Int16Array(MAX);
    var head = 0;
    var len = 0;
    var dx = 1;
    var dy = 0;
    var q1x = 0;
    var q1y = 0;
    var q2x = 0;
    var q2y = 0;
    var qn = 0;
    var fx = 0;
    var fy = 0;
    var score = 0;
    var alive = false;
    var ready = false;
    var won = false;
    var step = 180;
    var cell = 8;
    var glide = 0;
    var grid = null;
    var gridCell = 0;
    var rank = 1;
    var eats = 0;
    var bx = -1;
    var by = -1;
    var bleft = 0;
    var ox = new Float32Array(SPARKS);
    var oy = new Float32Array(SPARKS);
    var svx = new Float32Array(SPARKS);
    var svy = new Float32Array(SPARKS);
    var sborn = new Float32Array(SPARKS);
    var slife = new Float32Array(SPARKS);
    var sparkN = 0;
    var aimX = 1;
    var aimY = 0;
    var aimAt = 0;
    var bend = 0;
    var fixX = 0;
    var fixY = 0;
    var fixAt = 0;

    function idx(i) {
      return (head - i + MAX) % MAX;
    }

    function occupied(x, y, skipTail) {
      var n = skipTail ? len - 1 : len;
      var i, p;
      if (n < 0) n = 0;
      for (i = 0; i < n; i++) {
        p = idx(i);
        if (xs[p] === x && ys[p] === y) return true;
      }
      return false;
    }

    function placeFood() {
      var k, x, y;
      if (len >= MAX) {
        won = true;
        alive = false;
        return;
      }
      for (k = 0; k < 40; k++) {
        x = (Math.random() * COLS) | 0;
        y = (Math.random() * ROWS) | 0;
        if (freeFood(x, y)) {
          fx = x;
          fy = y;
          return;
        }
      }
      for (y = 0; y < ROWS; y++) {
        for (x = 0; x < COLS; x++) {
          if (freeFood(x, y)) {
            fx = x;
            fy = y;
            return;
          }
        }
      }
      won = true;
      alive = false;
    }

    function spec() {
      return RANKS[rank] || RANKS[1];
    }

    function freeFood(x, y) {
      if (occupied(x, y, false)) return false;
      return !(bx >= 0 && x === bx && y === by);
    }

    function openCell(x, y) {
      if (occupied(x, y, false)) return false;
      if (x === fx && y === fy) return false;
      if (x === bx && y === by) return false;
      return true;
    }

    function placeBonus() {
      var k, x, y;
      for (k = 0; k < 30; k++) {
        x = (Math.random() * COLS) | 0;
        y = (Math.random() * ROWS) | 0;
        if (openCell(x, y)) {
          bx = x;
          by = y;
          bleft = 22;
          return;
        }
      }
      for (y = 0; y < ROWS; y++) {
        for (x = 0; x < COLS; x++) {
          if (openCell(x, y)) {
            bx = x;
            by = y;
            bleft = 22;
            return;
          }
        }
      }
    }

    function setRank(n) {
      rank = n === 0 || n === 2 ? n : 1;
    }

    function reset() {
      len = 3;
      head = 2;
      xs[0] = 4; ys[0] = 11;
      xs[1] = 5; ys[1] = 11;
      xs[2] = 6; ys[2] = 11;
      dx = 1;
      dy = 0;
      qn = 0;
      score = 0;
      eats = 0;
      bx = -1;
      by = -1;
      bleft = 0;
      alive = true;
      ready = true;
      won = false;
      step = spec().step;
      sparkN = 0;
      aimX = dx;
      aimY = dy;
      aimAt = 0;
      bend = 0;
      fixX = 0;
      fixY = 0;
      fixAt = 0;
      placeFood();
    }

    function turn(x, y) {
      var lx, ly;
      if (!alive) return false;
      lx = dx;
      ly = dy;
      if (qn) { lx = q1x; ly = q1y; }
      if (lx === x && ly === y) return false;
      if (lx === -x && ly === -y) return false;
      if (qn === 0) {
        q1x = x;
        q1y = y;
        qn = 1;
        bend = glide;
        aimX = x;
        aimY = y;
        aimAt = performance.now();
      } else if (qn === 1) {
        q2x = x;
        q2y = y;
        qn = 2;
      } else {
        q2x = x;
        q2y = y;
      }
      return true;
    }

    function applyTurn() {
      if (!qn) return;
      dx = q1x;
      dy = q1y;
      bend = 0;
      if (qn === 2) {
        q1x = q2x;
        q1y = q2y;
        qn = 1;
      } else {
        qn = 0;
      }
      aimX = qn ? q1x : dx;
      aimY = qn ? q1y : dy;
      aimAt = performance.now();
    }

    function tick() {
      var nx, ny, eat, p, vis;
      if (!alive) return won ? 'win' : 'dead';
      if (qn && bend > 0) vis = headOffset(glide);
      applyTurn();
      if (vis) {
        fixX = vis[0] - dx;
        fixY = vis[1] - dy;
        if (fixX * fixX + fixY * fixY < 0.008) {
          fixX = 0;
          fixY = 0;
        }
        fixAt = performance.now();
      }
      nx = xs[head] + dx;
      ny = ys[head] + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
        die(Math.max(0, Math.min(COLS - 1, nx)), Math.max(0, Math.min(ROWS - 1, ny)));
        return 'dead';
      }
      if (bx >= 0 && nx === bx && ny === by) {
        if (occupied(nx, ny, false)) {
          die(nx, ny);
          return 'dead';
        }
        burst(nx + 0.5, ny + 0.5, 16, true);
        head = (head + 1) % MAX;
        xs[head] = nx;
        ys[head] = ny;
        len++;
        score += spec().bonus;
        bx = -1;
        by = -1;
        if (len >= MAX) {
          won = true;
          alive = false;
          return 'win';
        }
        return 'eat';
      }
      eat = nx === fx && ny === fy;
      if (occupied(nx, ny, !eat)) {
        die(nx, ny);
        return 'dead';
      }
      head = (head + 1) % MAX;
      xs[head] = nx;
      ys[head] = ny;
      if (eat) {
        burst(nx + 0.5, ny + 0.5, 12, false);
        len++;
        eats++;
        score += spec().gain;
        if (step - spec().accel > spec().floor) step -= spec().accel;
        else step = spec().floor;
        placeFood();
        ageBonus();
        if (eats % 5 === 0) placeBonus();
        return won ? 'win' : 'eat';
      }
      ageBonus();
      return 'ok';
    }

    function burst(cx, cy, n, fast) {
      var i, a, v, now;
      now = performance.now();
      for (i = 0; i < n && sparkN < SPARKS; i++) {
        a = Math.random() * 6.2832;
        v = (fast ? 0.006 : 0.003) * (0.35 + Math.random());
        ox[sparkN] = cx;
        oy[sparkN] = cy;
        svx[sparkN] = Math.cos(a) * v;
        svy[sparkN] = Math.sin(a) * v;
        sborn[sparkN] = now;
        slife[sparkN] = 260 + Math.random() * 280;
        sparkN++;
      }
    }

    function die(x, y) {
      var i, p;
      alive = false;
      fixX = 0;
      fixY = 0;
      burst(x + 0.5, y + 0.5, 16, true);
      for (i = 0; i < len; i += 2) {
        p = idx(i);
        burst(xs[p] + 0.5, ys[p] + 0.5, 3, false);
      }
    }

    function ageBonus() {
      if (bx < 0) return;
      bleft--;
      if (bleft <= 0) { bx = -1; by = -1; }
    }

    function prepare(size) {
      size = size | 0;
      if (size >= 4) cell = size;
    }

    function setGlide(t) {
      if (!alive) t = 0;
      glide = t < 0 ? 0 : t > 1 ? 1 : t;
    }

    function nextStep() {
      if (qn) return [q1x, q1y];
      return [dx, dy];
    }

    function headOffset(t) {
      var ox, oy, span, u;
      if (!qn) return [dx * t, dy * t];
      if (bend <= 0) return [q1x * t, q1y * t];
      if (t <= bend) return [dx * t, dy * t];
      ox = dx * bend;
      oy = dy * bend;
      span = 1 - bend;
      u = span > 0 ? (t - bend) / span : 1;
      if (u > 1) u = 1;
      return [ox + (q1x - ox) * u, oy + (q1y - oy) * u];
    }

    function decayFix() {
      var now, dt, mag, step, keep;
      mag = Math.sqrt(fixX * fixX + fixY * fixY);
      if (mag < 0.02) {
        fixX = 0;
        fixY = 0;
        return;
      }
      now = performance.now();
      dt = fixAt ? now - fixAt : 16;
      fixAt = now;
      if (dt < 0) dt = 0;
      if (dt > 32) dt = 32;
      step = dt / 70;
      if (step >= mag) {
        fixX = 0;
        fixY = 0;
        return;
      }
      keep = (mag - step) / mag;
      fixX *= keep;
      fixY *= keep;
    }

    function relaxAim() {
      var now = performance.now();
      var dt = aimAt ? now - aimAt : 16;
      var f = nextStep();
      var k;
      aimAt = now;
      if (dt < 0) dt = 0;
      if (dt > 48) dt = 48;
      k = 1 - Math.exp(-dt / 36);
      aimX += (f[0] - aimX) * k;
      aimY += (f[1] - aimY) * k;
      if ((aimX - f[0]) * (aimX - f[0]) + (aimY - f[1]) * (aimY - f[1]) < 0.0004) {
        aimX = f[0];
        aimY = f[1];
      }
    }

    function brick(g, x, y, p, mark) {
      var e = Math.max(1, Math.round(p / 11));
      var s = p - e;
      var c = s - e * 4;
      x += e >> 1;
      y += e >> 1;
      g.fillRect(x, y, s, e);
      g.fillRect(x, y + s - e, s, e);
      g.fillRect(x, y + e, e, s - e * 2);
      g.fillRect(x + s - e, y + e, e, s - e * 2);
      if (mark && c > 0) g.fillRect(x + e * 2, y + e * 2, c, c);
    }

    function paintSparks(ctx, s) {
      var now = performance.now();
      var dot = Math.max(1, Math.round(s / 26));
      var w = 0;
      var i, t, x, y, len;
      ctx.fillStyle = '#fff';
      for (i = 0; i < sparkN; i++) {
        t = (now - sborn[i]) / slife[i];
        if (t >= 1) continue;
        ox[w] = ox[i];
        oy[w] = oy[i];
        svx[w] = svx[i];
        svy[w] = svy[i];
        sborn[w] = sborn[i];
        slife[w] = slife[i];
        w++;
        x = (ox[i] + svx[i] * (now - sborn[i])) * s;
        y = (oy[i] + svy[i] * (now - sborn[i])) * s;
        ctx.globalAlpha = (1 - t) * (1 - t);
        if (Math.abs(svx[i]) >= Math.abs(svy[i])) {
          len = Math.max(dot * 2, Math.min(s, Math.abs(svx[i]) * s * 60));
          ctx.fillRect(svx[i] > 0 ? x - len : x, y, len, dot);
        } else {
          len = Math.max(dot * 2, Math.min(s, Math.abs(svy[i]) * s * 60));
          ctx.fillRect(x, svy[i] > 0 ? y - len : y, dot, len);
        }
      }
      sparkN = w;
      ctx.globalAlpha = 1;
    }

    function ensureGrid() {
      var g, x, y;
      if (grid && gridCell === cell) return;
      gridCell = cell;
      grid = document.createElement('canvas');
      grid.width = COLS * cell;
      grid.height = ROWS * cell;
      g = grid.getContext('2d');
      g.fillStyle = '#000';
      g.fillRect(0, 0, grid.width, grid.height);
      g.fillStyle = OFF;
      for (y = 0; y < ROWS; y++) {
        for (x = 0; x < COLS; x++) brick(g, x * cell, y * cell, cell, false);
      }
    }

    function partAt(i, t) {
      var a, b, x, y, off;
      if (i === 0) {
        off = headOffset(t);
        x = xs[head] + off[0] + fixX;
        y = ys[head] + off[1] + fixY;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x > COLS - 1) x = COLS - 1;
        if (y > ROWS - 1) y = ROWS - 1;
        return [x, y];
      }
      a = idx(i);
      b = idx(i - 1);
      return [xs[a] + (xs[b] - xs[a]) * t, ys[a] + (ys[b] - ys[a]) * t];
    }

    function drawHead(g, gx, gy, p) {
      var mag = Math.sqrt(aimX * aimX + aimY * aimY) || 1;
      var cx = (gx + 0.5) * p;
      var cy = (gy + 0.5) * p;
      var fx = aimX / mag;
      var fy = aimY / mag;
      var sx = -fy;
      var sy = fx;
      var nose = p * 0.46;
      var back = p * 0.22;
      var wide = p * 0.3;
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo(cx + fx * nose, cy + fy * nose);
      g.lineTo(cx + sx * wide - fx * back, cy + sy * wide - fy * back);
      g.lineTo(cx - fx * back * 0.2, cy - fy * back * 0.2);
      g.lineTo(cx - sx * wide - fx * back, cy - sy * wide - fy * back);
      g.closePath();
      g.fill();
    }

    function node(g, gx, gy, p, shade, head) {
      var side = Math.max(3, Math.round(p * (0.2 + 0.22 * shade)));
      var x = (gx + 0.5) * p - side / 2;
      var y = (gy + 0.5) * p - side / 2;
      var e = Math.max(1, Math.round(Math.max(2, side) / 6));
      var c = Math.round(72 + 164 * shade);
      if (head) {
        drawHead(g, gx, gy, p);
        return;
      }
      g.fillStyle = 'rgb(' + c + ',' + c + ',' + c + ')';
      g.fillRect(x, y, side, e);
      g.fillRect(x, y + side - e, side, e);
      g.fillRect(x, y + e, e, side - e * 2);
      g.fillRect(x + side - e, y + e, e, side - e * 2);
    }

    function paint(ctx) {
      var s = cell;
      var t = alive ? glide : 0;
      var n = len;
      var i, at, shade, cx, cy, r, c;
      ensureGrid();
      if (alive) {
        decayFix();
        relaxAim();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(grid, 0, 0);
      if (!ready || len < 1) {
        paintSparks(ctx, s);
        return;
      }
      if (bx >= 0) {
        cx = (bx + 0.5) * s;
        cy = (by + 0.5) * s;
        r = Math.round(s * 0.28);
        ctx.strokeStyle = bleft < 7 ? HALF : '#fff';
        ctx.lineWidth = Math.max(1, Math.round(s / 14));
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
        ctx.stroke();
      }
      if (len < MAX) {
        ctx.strokeStyle = LIT;
        ctx.lineWidth = Math.max(1, Math.round(s / 14));
        cx = (fx + 0.5) * s;
        cy = (fy + 0.5) * s;
        r = Math.max(2, Math.round(s * 0.16));
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx, cy + r);
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx + r, cy);
        ctx.stroke();
      }
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (i = n - 1; i >= 1; i--) {
        at = partAt(i, t);
        shade = 1 - i / (n - 1);
        cx = (at[0] + 0.5) * s;
        cy = (at[1] + 0.5) * s;
        r = partAt(i - 1, t);
        ctx.strokeStyle = 'rgb(' + (c = Math.round(48 + 140 * shade)) + ',' + c + ',' + c + ')';
        ctx.lineWidth = Math.max(1, s * (0.08 + 0.12 * shade));
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo((r[0] + 0.5) * s, (r[1] + 0.5) * s);
        ctx.stroke();
      }
      for (i = n - 1; i >= 0; i--) {
        at = partAt(i, t);
        shade = n <= 1 ? 1 : 1 - i / (n - 1);
        node(ctx, at[0], at[1], s, shade, i === 0);
      }
      paintSparks(ctx, s);
    }

    return {
      reset: reset,
      setRank: setRank,
      turn: turn,
      tick: tick,
      paint: paint,
      prepare: prepare,
      setGlide: setGlide,
      hot: function () { return sparkN > 0; },
      setFood: function (x, y) { fx = x; fy = y; },
      delay: function () { return step; },
      cell: function (i) {
        var p = idx(i);
        return [xs[p], ys[p]];
      },
      get score() { return score; },
      get alive() { return alive; },
      get won() { return won; },
      get len() { return len; },
      get dx() { return dx; },
      get dy() { return dy; },
      get fx() { return fx; },
      get fy() { return fy; }
    };
  }

  root.ArcadeSnake = {
    create: create,
    COLS: COLS,
    ROWS: ROWS,
    viewW: COLS * STRIDE,
    viewH: ROWS * STRIDE
  };
})(typeof window !== 'undefined' ? window : globalThis);
