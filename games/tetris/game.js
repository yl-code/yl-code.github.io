(function (root) {
  'use strict';

  var COLS = 10;
  var ROWS = 20;
  var I = 0;
  var O = 1;
  var T = 2;
  var SHAPES = [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[2, 0], [0, 1], [1, 1], [2, 1]]
  ];
  // SRS wall kicks with y growing downward, indexed by the rotation state before turning.
  var KICK_CW = [
    [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]
  ];
  var KICK_CCW = [
    [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]
  ];
  var KICK_I_CW = [
    [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]]
  ];
  var KICK_I_CCW = [
    [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]]
  ];
  var RANKS = [
    { base: 980, step: 50, floor: 240, every: 12, lock: 600, resets: 15, ghost: 1, hold: 1, preview: 3, startLv: 1 },
    { base: 860, step: 70, floor: 160, every: 10, lock: 500, resets: 15, ghost: 1, hold: 0, preview: 3, startLv: 1 },
    { base: 640, step: 75, floor: 100, every: 8, lock: 320, resets: 8, ghost: 0, hold: 0, preview: 1, startLv: 3 }
  ];
  var LINE_SCORE = [0, 100, 300, 500, 800];
  var SPIN_SCORE = [400, 800, 1200, 1600];
  var CLEAR_SCORE = [0, 800, 1200, 1800, 2000];
  var CLEAR_NAME = ['', 'SINGLE', 'DOUBLE', 'TRIPLE'];
  var MAX_LEVEL = 16;
  var SCAN_MS = 90;
  var CLEAR_MS = 210;
  var SPARKS = 512;
  var GRAVITY = 0.000012;
  var ROW_MS = 30;
  var END_MS = ROW_MS * (ROWS * 2 + 1);
  var QUEUE = 3;
  var HOT = '#fff';
  var LIT = '#ececec';
  var HALF = '#737373';
  var GHOST = '#454545';
  var OFF = '#1a1a1a';

  function buildRots(t) {
    var box = t === I ? 4 : 3;
    var cur = SHAPES[t];
    var rots = [];
    var r, i, flat, turned;
    for (r = 0; r < 4; r++) {
      flat = new Int8Array(8);
      for (i = 0; i < 4; i++) {
        flat[i * 2] = cur[i][0];
        flat[i * 2 + 1] = cur[i][1];
      }
      rots.push(flat);
      if (t === O) continue;
      turned = [];
      for (i = 0; i < 4; i++) turned.push([box - 1 - cur[i][1], cur[i][0]]);
      cur = turned;
    }
    return rots;
  }

  var ROTS = SHAPES.map(function (shape, t) { return buildRots(t); });

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function create() {
    var board = new Uint8Array(COLS * ROWS);
    var bag = [];
    var queue = [];
    var clearRows = [];
    var sx = new Float32Array(SPARKS);
    var sy = new Float32Array(SPARKS);
    var svx = new Float32Array(SPARKS);
    var svy = new Float32Array(SPARKS);
    var sage = new Float32Array(SPARKS);
    var slife = new Float32Array(SPARKS);
    var ssize = new Uint8Array(SPARKS);
    var streak = new Uint8Array(SPARKS);
    var sparkN = 0;
    var burst = false;
    var cue = { id: 0, main: '', sub: '' };
    var rank = 1;
    var score = 0;
    var lines = 0;
    var level = 1;
    var alive = false;
    var active = false;
    var stuck = false;
    var type = 0;
    var held = -1;
    var holdUsed = false;
    var rot = 0;
    var px = 3;
    var py = 0;
    var ghostY = 0;
    var grounded = false;
    var fallMs = 0;
    var lockMs = 0;
    var lowest = 0;
    var resets = 0;
    var spun = false;
    var combo = -1;
    var b2b = false;
    var clearMs = 0;
    var endMs = -1;
    var previewRev = 0;
    var boardRev = 0;
    var dirty = true;
    var unit = 0;
    var layer = null;
    var layerCtx = null;
    var layerRev = -1;

    function spec() {
      return RANKS[rank] || RANKS[1];
    }

    function gravity() {
      var s = spec();
      return Math.max(s.floor, s.base - (level - 1) * s.step);
    }

    function pull() {
      var i, j, t;
      if (!bag.length) {
        bag.push(0, 1, 2, 3, 4, 5, 6);
        for (i = 6; i > 0; i--) {
          j = (Math.random() * (i + 1)) | 0;
          t = bag[i];
          bag[i] = bag[j];
          bag[j] = t;
        }
      }
      return bag.pop();
    }

    function fits(t, r, ox, oy) {
      var cells = ROTS[t][r];
      var i, x, y;
      for (i = 0; i < 8; i += 2) {
        x = ox + cells[i];
        y = oy + cells[i + 1];
        if (x < 0 || x >= COLS || y >= ROWS) return false;
        if (y >= 0 && board[y * COLS + x]) return false;
      }
      return true;
    }

    function solid(x, y) {
      if (x < 0 || x >= COLS || y >= ROWS) return 1;
      if (y < 0) return 0;
      return board[y * COLS + x] ? 1 : 0;
    }

    function full(y) {
      var row = y * COLS;
      var x;
      for (x = 0; x < COLS; x++) {
        if (!board[row + x]) return false;
      }
      return true;
    }

    function wiped() {
      var i;
      for (i = 0; i < COLS * ROWS; i++) {
        if (board[i] && clearRows.indexOf((i / COLS) | 0) < 0) return false;
      }
      return true;
    }

    function corners() {
      return solid(px, py) + solid(px + 2, py) + solid(px, py + 2) + solid(px + 2, py + 2);
    }

    function dropY() {
      var y = py;
      while (fits(type, rot, px, y + 1)) y++;
      return y;
    }

    function topOut() {
      alive = false;
      active = false;
      endMs = 0;
      dirty = true;
    }

    function enter(t) {
      type = t;
      rot = 0;
      px = 3;
      py = 0;
      fallMs = 0;
      lockMs = 0;
      lowest = 0;
      resets = 0;
      spun = false;
      previewRev++;
      dirty = true;
      if (!fits(type, rot, px, py)) {
        stuck = true;
        topOut();
        return;
      }
      active = true;
      grounded = !fits(type, rot, px, py + 1);
      ghostY = dropY();
    }

    function spawn() {
      var t = queue.shift();
      queue.push(pull());
      holdUsed = false;
      enter(t);
    }

    function settle(was) {
      grounded = !fits(type, rot, px, py + 1);
      if (py > lowest) {
        lowest = py;
        resets = 0;
        lockMs = 0;
      } else if ((was || grounded) && resets < spec().resets) {
        resets++;
        lockMs = 0;
      }
      ghostY = dropY();
      dirty = true;
    }

    function shift(dx) {
      var was;
      if (!active || !fits(type, rot, px + dx, py)) return false;
      was = grounded;
      px += dx;
      spun = false;
      settle(was);
      return true;
    }

    function turn(dir) {
      var to, kicks, k, x, y, was;
      if (!active || type === O) return false;
      to = (rot + (dir < 0 ? 3 : 1)) % 4;
      if (type === I) kicks = (dir < 0 ? KICK_I_CCW : KICK_I_CW)[rot];
      else kicks = (dir < 0 ? KICK_CCW : KICK_CW)[rot];
      for (k = 0; k < kicks.length; k++) {
        x = px + kicks[k][0];
        y = py + kicks[k][1];
        if (!fits(type, to, x, y)) continue;
        was = grounded;
        rot = to;
        px = x;
        py = y;
        spun = type === T;
        settle(was);
        return true;
      }
      return false;
    }

    function fall() {
      py++;
      spun = false;
      if (py > lowest) {
        lowest = py;
        resets = 0;
        lockMs = 0;
      }
      grounded = !fits(type, rot, px, py + 1);
      dirty = true;
    }

    function softDrop() {
      if (!active || grounded) return false;
      fall();
      fallMs = 0;
      score++;
      return true;
    }

    function hardDrop() {
      var n;
      if (!active) return 0;
      n = dropY() - py;
      if (n > 0) {
        py += n;
        spun = false;
        score += n * 2;
      }
      lock();
      return n;
    }

    function hold() {
      var t;
      if (!spec().hold || !active || holdUsed) return false;
      t = type;
      active = false;
      if (held < 0) {
        held = t;
        spawn();
      } else {
        enter(held);
        held = t;
      }
      holdUsed = true;
      return true;
    }

    function lock() {
      var cells = ROTS[type][rot];
      var spin = type === T && spun && corners() >= 3;
      var out = false;
      var i, x, y, n, base, chain, perfect, gain, before, main, sub;
      for (i = 0; i < 8; i += 2) {
        x = px + cells[i];
        y = py + cells[i + 1];
        if (y < 0) out = true;
        else board[y * COLS + x] = type + 1;
      }
      active = false;
      boardRev++;
      dirty = true;
      if (out) {
        topOut();
        return;
      }
      clearRows.length = 0;
      for (y = Math.max(0, py); y < Math.min(ROWS, py + 4); y++) {
        if (full(y)) clearRows.push(y);
      }
      n = clearRows.length;
      base = spin ? SPIN_SCORE[n] : LINE_SCORE[n];
      chain = false;
      if (n) {
        chain = b2b && (n === 4 || spin);
        b2b = n === 4 || spin;
        combo++;
      } else {
        combo = -1;
      }
      if (chain) base = (base * 3) >> 1;
      if (combo > 0) base += 50 * combo;
      perfect = n > 0 && wiped();
      if (perfect) base += CLEAR_SCORE[n];
      gain = base * level;
      score += gain;
      before = level;
      if (n) {
        lines += n;
        level = Math.min(MAX_LEVEL, spec().startLv + ((lines / spec().every) | 0));
        clearMs = 0;
        burst = false;
      }
      main = '';
      sub = '';
      if (perfect) main = 'ALL CLEAR';
      else if (spin) main = n ? 'T-SPIN ' + CLEAR_NAME[n] : 'T-SPIN';
      else if (n === 4) main = 'TETRIS';
      if (main && chain) main = 'B2B ' + main;
      if (combo > 1) {
        if (main) sub = 'COMBO ' + combo + ' · ';
        else main = 'COMBO ' + combo;
      }
      if (!main && level > before) main = 'LV ' + pad2(level);
      if (main) {
        cue.id++;
        cue.main = main;
        cue.sub = sub + '+' + gain;
      }
      if (!n) spawn();
    }

    function explode() {
      var per = clearRows.length >= 4 ? 12 : 10;
      var r, c, k, i, a, v, out;
      for (r = 0; r < clearRows.length; r++) {
        for (c = 0; c < COLS; c++) {
          out = c < COLS / 2 ? -1 : 1;
          for (k = 0; k < per && sparkN < SPARKS; k++) {
            i = sparkN++;
            a = (k + Math.random() * 0.7) / per * Math.PI * 2;
            v = 3 + Math.random() * 8;
            sx[i] = c + 0.5 + (Math.random() - 0.5) * 0.3;
            sy[i] = clearRows[r] + 0.5 + (Math.random() - 0.5) * 0.3;
            svx[i] = (Math.cos(a) * v + out * (1 + Math.random() * 2)) / 1000;
            svy[i] = (Math.sin(a) * v * 0.8 - 2 - Math.random() * 3) / 1000;
            sage[i] = 0;
            slife[i] = 420 + Math.random() * 340;
            ssize[i] = Math.random() < 0.7 ? 1 : 2;
            streak[i] = Math.random() < 0.3 ? 1 : 0;
          }
        }
      }
    }

    function stepSparks(dt) {
      var drag = Math.max(0, 1 - dt * 0.0035);
      var i = 0;
      var j;
      if (!sparkN) return;
      dirty = true;
      while (i < sparkN) {
        sage[i] += dt;
        if (sage[i] >= slife[i]) {
          j = --sparkN;
          sx[i] = sx[j];
          sy[i] = sy[j];
          svx[i] = svx[j];
          svy[i] = svy[j];
          sage[i] = sage[j];
          slife[i] = slife[j];
          ssize[i] = ssize[j];
          streak[i] = streak[j];
          continue;
        }
        svy[i] += GRAVITY * dt;
        svx[i] *= drag;
        svy[i] *= drag;
        sx[i] += svx[i] * dt;
        sy[i] += svy[i] * dt;
        i++;
      }
    }

    function collapse() {
      var i;
      for (i = 0; i < clearRows.length; i++) {
        board.copyWithin(COLS, 0, clearRows[i] * COLS);
        board.fill(0, 0, COLS);
      }
      clearRows.length = 0;
      boardRev++;
      dirty = true;
      spawn();
    }

    function advance(dt) {
      var delay;
      stepSparks(dt);
      if (endMs >= 0) {
        if (endMs < END_MS) {
          endMs += dt;
          dirty = true;
        }
        return;
      }
      if (!alive) return;
      if (clearRows.length) {
        clearMs += dt;
        dirty = true;
        if (!burst && clearMs >= SCAN_MS) {
          burst = true;
          explode();
        }
        if (clearMs >= CLEAR_MS) collapse();
        return;
      }
      if (!active) return;
      delay = gravity();
      if (grounded) {
        fallMs = Math.min(delay, fallMs + dt);
        lockMs += dt;
        if (lockMs >= spec().lock) lock();
        return;
      }
      fallMs += dt;
      while (!grounded && fallMs >= delay) {
        fallMs -= delay;
        fall();
      }
    }

    function setRank(n) {
      rank = n === 0 || n === 2 ? n : 1;
    }

    function reset() {
      board.fill(0);
      bag.length = 0;
      clearRows.length = 0;
      score = 0;
      lines = 0;
      level = spec().startLv;
      alive = true;
      active = false;
      stuck = false;
      held = -1;
      holdUsed = false;
      combo = -1;
      b2b = false;
      endMs = -1;
      sparkN = 0;
      boardRev++;
      queue.length = 0;
      while (queue.length < QUEUE) queue.push(pull());
      spawn();
    }

    function prepare(cell) {
      cell = cell | 0;
      if (cell < 4) cell = 4;
      if (cell === unit) return;
      unit = cell;
      if (typeof document !== 'undefined') {
        layer = document.createElement('canvas');
        layer.width = COLS * unit;
        layer.height = ROWS * unit;
        layerCtx = layer.getContext('2d', { alpha: false });
      }
      layerRev = -1;
      dirty = true;
    }

    function brick(g, x, y, p) {
      var e = Math.max(1, Math.round(p / 11));
      var s = p - e;
      var c = s - e * 4;
      x += e >> 1;
      y += e >> 1;
      g.fillRect(x, y, s, e);
      g.fillRect(x, y + s - e, s, e);
      g.fillRect(x, y + e, e, s - e * 2);
      g.fillRect(x + s - e, y + e, e, s - e * 2);
      if (c > 0) g.fillRect(x + e * 2, y + e * 2, c, c);
    }

    function paintRow(g, y, color) {
      var x;
      g.fillStyle = '#000';
      g.fillRect(0, y * unit, COLS * unit, unit);
      g.fillStyle = color;
      for (x = 0; x < COLS; x++) brick(g, x * unit, y * unit, unit);
    }

    function drawBase(g) {
      var i;
      g.fillStyle = '#000';
      g.fillRect(0, 0, COLS * unit, ROWS * unit);
      g.fillStyle = OFF;
      for (i = 0; i < COLS * ROWS; i++) {
        if (!board[i]) brick(g, (i % COLS) * unit, ((i / COLS) | 0) * unit, unit);
      }
      g.fillStyle = LIT;
      for (i = 0; i < COLS * ROWS; i++) {
        if (board[i]) brick(g, (i % COLS) * unit, ((i / COLS) | 0) * unit, unit);
      }
    }

    function paintClear(ctx) {
      var w = COLS * unit;
      var line = Math.max(1, Math.round(unit / 14));
      var i, k, half, y, mid, shift, x;
      for (i = 0; i < clearRows.length; i++) {
        y = clearRows[i] * unit;
        mid = y + ((unit - line) >> 1);
        if (clearMs < SCAN_MS) {
          k = clearMs / SCAN_MS;
          half = Math.round(w / 2 * k * (2 - k));
          shift = Math.round((Math.random() - 0.5) * unit / 6);
          ctx.fillStyle = '#000';
          ctx.fillRect(0, y, w, unit);
          ctx.fillStyle = LIT;
          for (x = 0; x < COLS; x++) brick(ctx, x * unit + shift, y, unit);
          ctx.fillStyle = HOT;
          ctx.fillRect((w >> 1) - half, mid, half * 2, line);
          continue;
        }
        paintRow(ctx, clearRows[i], OFF);
        k = Math.min(1, (clearMs - SCAN_MS) / (CLEAR_MS - SCAN_MS));
        half = Math.round(unit / 2 * (1 - (1 - k) * (1 - k)));
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = HOT;
        ctx.fillRect(0, mid - half, w, line);
        ctx.fillRect(0, mid + half, w, line);
        ctx.globalAlpha = 1;
      }
    }

    function paintSparks(ctx) {
      var dot = Math.max(1, Math.round(unit / 26));
      var i, t, a, x, y, len;
      ctx.fillStyle = HOT;
      for (i = 0; i < sparkN; i++) {
        t = sage[i] / slife[i];
        a = (1 - t) * (1 - t * 0.4);
        if (Math.random() < 0.07) a *= 0.3;
        ctx.globalAlpha = a;
        x = (sx[i] * unit) | 0;
        y = (sy[i] * unit) | 0;
        if (streak[i] && Math.abs(svx[i]) >= Math.abs(svy[i])) {
          len = Math.max(dot * 2, Math.min(unit, (Math.abs(svx[i]) * unit * 50) | 0));
          ctx.fillRect(svx[i] > 0 ? x - len : x, y, len, dot);
        } else if (streak[i]) {
          len = Math.max(dot * 2, Math.min(unit, (Math.abs(svy[i]) * unit * 50) | 0));
          ctx.fillRect(x, svy[i] > 0 ? y - len : y, dot, len);
        } else {
          ctx.fillRect(x, y, dot * ssize[i], dot * ssize[i]);
        }
      }
      ctx.globalAlpha = 1;
    }

    function paintEnd(ctx) {
      var step = Math.min(ROWS * 2, (endMs / ROW_MS) | 0);
      var y;
      for (y = 0; y < ROWS; y++) {
        if (step >= ROWS && y <= step - ROWS) paintRow(ctx, y, OFF);
        else if (y >= ROWS - 1 - step) paintRow(ctx, y, LIT);
      }
    }

    function paint(ctx) {
      var cells, i, y;
      dirty = false;
      if (!unit) prepare(20);
      if (layer) {
        if (layerRev !== boardRev) {
          drawBase(layerCtx);
          layerRev = boardRev;
        }
        ctx.drawImage(layer, 0, 0);
      } else {
        drawBase(ctx);
      }
      if (clearRows.length) paintClear(ctx);
      if (active || stuck) {
        cells = ROTS[type][rot];
        if (active && spec().ghost && ghostY > py) {
          ctx.fillStyle = GHOST;
          for (i = 0; i < 8; i += 2) brick(ctx, (px + cells[i]) * unit, (ghostY + cells[i + 1]) * unit, unit);
        }
        ctx.fillStyle = LIT;
        for (i = 0; i < 8; i += 2) {
          y = py + cells[i + 1];
          if (y >= 0) brick(ctx, (px + cells[i]) * unit, y * unit, unit);
        }
      }
      if (sparkN) paintSparks(ctx);
      if (endMs >= 0) paintEnd(ctx);
    }

    function grid(ctx, piece, x, y, p, color) {
      var cells, i, cx, cy;
      ctx.fillStyle = OFF;
      for (cy = 0; cy < 2; cy++) {
        for (cx = 0; cx < 4; cx++) brick(ctx, x + cx * p, y + cy * p, p);
      }
      if (piece < 0) return;
      cells = ROTS[piece][0];
      ctx.fillStyle = color;
      for (i = 0; i < 8; i += 2) brick(ctx, x + cells[i] * p, y + cells[i + 1] * p, p);
    }

    function paintNext(ctx) {
      var w = ctx.canvas.width;
      var h = ctx.canvas.height;
      var n = spec().preview;
      var p = (w / 4) | 0;
      var gap = n > 1 ? Math.max(0, ((h - p * 2 * n) / (n - 1)) | 0) : 0;
      var i;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      for (i = 0; i < n; i++) grid(ctx, i < queue.length ? queue[i] : -1, 0, i * (p * 2 + gap), p, i ? HALF : LIT);
    }

    function paintHold(ctx) {
      var w = ctx.canvas.width;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, ctx.canvas.height);
      grid(ctx, held, 0, 0, (w / 4) | 0, holdUsed ? HALF : LIT);
    }

    return {
      board: board,
      reset: reset,
      setRank: setRank,
      advance: advance,
      left: function () { return shift(-1); },
      right: function () { return shift(1); },
      rotate: function () { return turn(1); },
      rotateBack: function () { return turn(-1); },
      softDrop: softDrop,
      hardDrop: hardDrop,
      hold: hold,
      prepare: prepare,
      paint: paint,
      paintNext: paintNext,
      paintHold: paintHold,
      get score() { return score; },
      get lines() { return lines; },
      get level() { return level; },
      get alive() { return alive; },
      get active() { return active; },
      get over() { return endMs >= END_MS; },
      get dirty() { return dirty; },
      get clearing() { return clearRows.length > 0; },
      get sparks() { return sparkN; },
      get progress() { return level >= MAX_LEVEL ? 1 : (lines % spec().every) / spec().every; },
      get aids() { return { ghost: !!spec().ghost, hold: !!spec().hold, preview: spec().preview }; },
      get held() { return held; },
      get holdUsed() { return holdUsed; },
      get previewRev() { return previewRev; },
      get cue() { return cue; },
      get type() { return type; },
      get rot() { return rot; },
      get px() { return px; },
      get py() { return py; },
      get grounded() { return grounded; }
    };
  }

  root.ArcadeTetris = {
    create: create,
    COLS: COLS,
    ROWS: ROWS
  };
})(typeof window !== 'undefined' ? window : globalThis);
