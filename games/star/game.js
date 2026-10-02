(function (root) {
  'use strict';

  var W = 96;
  var H = 160;
  var TAU = 6.2831853;
  var HULL_HP = [8, 12, 17, 23, 30];
  var GRUNT_HP = [3, 4, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 26, 30, 34, 38, 44];
  var BOSS_HP = [60, 90, 130, 175, 230, 300, 380, 470, 580, 720];
  var BOSS_DMG = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6];
  var QUOTA = [6, 7, 8, 8, 9, 10, 10, 11, 12, 12];
  var BOSS_BOX = [
    [16, 11], [13, 13], [18, 9], [13, 16], [20, 11],
    [14, 14], [10, 18], [20, 8], [18, 10], [17, 12]
  ];
  var RANKS = [
    { lives: 5, hp: 0.85, gap: 1.28, pace: 0.88 },
    { lives: 3, hp: 1, gap: 1, pace: 1 },
    { lives: 2, hp: 1.22, gap: 0.8, pace: 1.14 }
  ];
  var WAIT = [
    [280, 240, 200],
    [320, 280, 240],
    [300, 260, 220],
    [360, 310, 270],
    [320, 270, 230]
  ];
  var GUN_DMG = [
    null,
    null,
    [2, 3, 5],
    [3, 5, 7],
    [4, 6, 8]
  ];

  var PLAYER = [
    [0, -1.15, 0.2, -0.35, 0.78, 0.28, 0.24, 0.02, 0.18, 0.78, 0, 0.95],
    [0, -1.15, 0.24, -0.4, 0.98, 0.22, 0.36, 0.12, 0.3, 0.62, 0.16, 0.98, 0, 0.62],
    [0, -0.12, 0.12, -0.4, 0.16, -1.12, 0.3, -0.78, 0.24, -0.15, 0.82, 0.28, 0.32, 0.12, 0.24, 0.95, 0, 1.08],
    [0, -0.95, 0.38, -0.4, 1.05, 0.18, 0.7, 0.5, 0.36, 0.32, 0.3, 0.95, 0, 0.68],
    [0, -1.22, 0.14, -0.45, 0.9, 0.38, 0.26, 0.08, 0.2, 0.9, 0, 1.02]
  ];
  var GRUNT = [
    [0, -1.05, 0.22, -0.5, 0.75, 0.02, 0.28, 0.2, 0.22, 0.78, 0, 0.98],
    [0, -0.95, 0.98, 0.02, 0.36, 0.58, 0.22, 0.92, 0, 0.68],
    [0, -0.9, 0.28, -0.4, 0.66, -0.05, 0.52, 0.32, 0.22, 0.75, 0, 0.95],
    [0, -0.28, 0.16, -0.28, 0.26, -1.02, 0.46, -0.95, 0.34, -0.1, 0.58, 0.4, 0.2, 0.88, 0, 0.7],
    [0, -0.42, 0.5, -0.62, 0.9, 0.02, 0.7, 0.32, 0.22, 0.5, 0, 0.78],
    [0, -1.18, 0.16, -0.35, 0.58, 0.08, 0.16, 0.4, 0.12, 0.95, 0, 1.08],
    [0, -0.55, 0.32, -0.32, 0.9, 0.12, 0.62, 0.5, 0.24, 0.32, 0.2, 0.8, 0, 0.55],
    [0, -1.02, 0.58, -0.08, 0.88, 0.32, 0.26, 0.12, 0.18, 0.85, 0, 0.42],
    [0, -0.88, 0.24, -0.88, 0.5, -0.28, 0.5, 0.5, 0.28, 0.85, 0, 0.98],
    [0, -0.72, 0.22, -0.4, 0.82, 0.22, 0.9, 0.7, 0.34, 0.32, 0.16, 0.85, 0, 0.98],
    [0.22, -1.02, 0.48, -1.02, 0.55, 0.72, 0.28, 0.88, 0.24, 0.05, 0.16, -0.15],
    [0, -1.05, 0.16, -0.15, 0.88, -0.08, 0.22, 0.2, 0.2, 0.9, 0, 1.02],
    [0, -0.92, 0.22, -0.35, 0.9, 0.62, 0.42, 0.12, 0.18, 0.85, 0, 0.98],
    [0, -0.42, 0.95, -0.22, 0.88, 0.38, 0.28, 0.55, 0, 0.28],
    [0, -1.18, 0.12, -0.15, 0.4, 0.08, 0.12, 0.28, 0.1, 0.95, 0, 1.08],
    [0, -1.02, 0.16, -0.82, 0.16, -0.18, 0.72, 0.02, 0.72, 0.28, 0.16, 0.28, 0.16, 0.9, 0, 1.02],
    [0, -0.98, 0.58, -0.28, 0.42, 0.5, 0.16, 0.95, 0, 1.02],
    [0.14, -0.12, 0.16, -0.95, 0.5, -0.9, 0.44, 0.6, 0.14, 0.75, 0, 0.18],
    [0, -0.32, 0.72, -0.12, 0.9, 0.2, 0.28, 0.48, 0.14, 0.85, 0, 0.98],
    [0, -0.85, 0.22, -0.55, 0.55, 0.15, 0.22, 0.45, 0, 0.7]
  ];
  var BOSS = [
    [0, -1.15, 0.2, -0.65, 1.02, 0.02, 0.68, 0.32, 0.24, 0.12, 0.3, 0.9, 0, 1.05],
    [0, -0.95, 0.2, -0.55, 0.72, -0.12, 0.55, 0.35, 0.18, 0.85, 0, 1.0],
    [0, -0.32, 1.02, -0.12, 1.08, 0.18, 0.7, 0.28, 0.62, 0.9, 0.38, 0.32, 0.26, 0.95, 0.1, 0.28, 0, 0.18],
    [0, -1.22, 0.16, -1.02, 0.48, -0.62, 0.9, -0.12, 0.55, 0.22, 0.75, 0.62, 0.34, 0.4, 0.42, 1.0, 0, 1.2],
    [0, -0.55, 0.12, -1.15, 0.28, -0.62, 0.95, -0.18, 1.12, 0.2, 0.68, 0.5, 0.22, 0.32, 0, 0.58],
    [0, -0.85, 0.16, -0.4, 0.42, 0.15, 0.16, 0.7, 0, 0.9],
    [0, -0.45, 0.2, -0.7, 0.32, -1.15, 0.14, -0.15, 0.58, 0.2, 0.4, 0.95, 0, 1.18],
    [0, -0.12, 0.22, -0.38, 1.05, -0.15, 1.12, 0.22, 0.82, 0.38, 0.24, 0.22, 0.14, 0.75, 0, 0.42],
    [0, -0.15, 0.14, -1.0, 0.28, -0.28, 0.52, -0.12, 0.46, -0.82, 0.64, -0.18, 1.0, 0.12, 0.78, 0.45, 0, 0.58],
    [0, -1.12, 0.24, -0.4, 1.0, 0.18, 0.34, 0.02, 0.3, 0.75, 0, 1.08]
  ];

  function create() {
    var stars = new Array(16);
    var foes = new Array(5);
    var shots = new Array(28);
    var sparks = new Array(40);
    var rings = new Array(5);
    var gifts = new Array(2);
    var boss = blankFoe();
    var i;
    var px = W * 0.5;
    var tx = px;
    var py = H - 28;
    var ty = py;
    var score = 0;
    var lives = 3;
    var hp = HULL_HP[0];
    var maxHp = HULL_HP[0];
    var hull = 0;
    var gun = 0;
    var stage = 0;
    var slain = 0;
    var phase = 'wave';
    var hurt = false;
    var shield = 0;
    var shieldFlash = 0;
    var iframe = 0;
    var morph = 0;
    var shake = 0;
    var fire = 0;
    var spawnMs = 600;
    var gapMs = 0;
    var time = 0;
    var over = false;
    var won = false;
    var playing = false;
    var unit = 1;
    var rank = 1;
    var phw = 3;
    var phh = 4.2;

    for (i = 0; i < stars.length; i++) {
      stars[i] = {
        x: Math.random() * W,
        y: Math.random() * H,
        v: 16 + (i % 5) * 7,
        hot: i % 5 === 0
      };
    }
    for (i = 0; i < foes.length; i++) foes[i] = blankFoe();
    for (i = 0; i < shots.length; i++) shots[i] = blankShot();
    for (i = 0; i < sparks.length; i++) sparks[i] = { on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, kind: 0 };
    for (i = 0; i < rings.length; i++) rings[i] = { on: false, x: 0, y: 0, r: 0, vr: 0, life: 0, max: 1 };
    for (i = 0; i < gifts.length; i++) gifts[i] = { on: false, x: 0, y: 0, kind: 0, t: 0 };

    function spec() {
      return RANKS[rank] || RANKS[1];
    }

    function setRank(n) {
      rank = n === 0 || n === 2 ? n : 1;
      if (!playing) lives = spec().lives;
    }

    function fitPlayer() {
      phw = 3.6 + hull * 0.28;
      phh = 5.1 + hull * 0.2;
    }

    function clampX(x) {
      var m = 7 + hull * 0.4;
      if (x < m) return m;
      if (x > W - m) return W - m;
      return x;
    }

    function clampY(y) {
      if (y < 16) return 16;
      if (y > H - 12) return H - 12;
      return y;
    }

    function setX(x) { tx = clampX(x); }
    function aim(x, y) {
      tx = clampX(x);
      ty = clampY(y);
    }
    function nudge(dx, dy) {
      tx = clampX(tx + (dx || 0));
      if (dy) ty = clampY(ty + dy);
    }

    function emit(x, y, vx, vy, dmg, shape, face, hw, hh, sc) {
      var n, s;
      for (n = 0; n < shots.length; n++) {
        s = shots[n];
        if (s.on) continue;
        s.on = true;
        s.x = x;
        s.y = y;
        s.vx = vx;
        s.vy = vy;
        s.dmg = dmg;
        s.shape = shape;
        s.face = face;
        s.hw = hw;
        s.hh = hh;
        s.sc = sc;
        s.bad = face < 0;
        s.tier = 1;
        s.sprite = '';
        return s;
      }
      return null;
    }

    function addRing(x, y, r, vr, life) {
      var n, o;
      o = null;
      for (n = 0; n < rings.length; n++) {
        if (!rings[n].on) { o = rings[n]; break; }
      }
      if (!o) o = rings[0];
      o.on = true;
      o.x = x;
      o.y = y;
      o.r = r;
      o.vr = vr;
      o.life = life;
      o.max = life;
    }

    function boom(x, y, mode) {
      var n = mode === 2 ? 16 : mode === 1 ? 18 : mode === 3 ? 5 : 9;
      var made = 0;
      var speed = mode === 1 ? 78 : mode === 2 ? 62 : 44;
      var life = mode === 1 ? 460 : mode === 2 ? 380 : 280;
      var a, v, s, k;
      for (k = 0; k < sparks.length && made < n; k++) {
        s = sparks[k];
        if (s.on) continue;
        a = made * (TAU / n) + ((made * 5) & 7) * 0.17;
        v = speed * (0.4 + (made & 3) * 0.18);
        s.on = true;
        s.x = x;
        s.y = y;
        s.vx = Math.cos(a) * v;
        s.vy = Math.sin(a) * v;
        s.max = life;
        s.life = life;
        s.kind = mode === 1 ? 1 : 0;
        made++;
      }
      if (mode === 3) return;
      if (mode === 1) {
        addRing(x, y, 12, -40, 340);
        shake = 300;
        return;
      }
      addRing(x, y, 1.4, mode === 2 ? 48 : 36, mode === 2 ? 420 : 260);
      if (mode === 2) {
        addRing(x, y, 3, 26, 500);
        shake = 260;
      }
    }

    function openGift(slot) {
      var g = null;
      var n;
      for (n = 0; n < gifts.length; n++) {
        if (!gifts[n].on) { g = gifts[n]; break; }
      }
      if (g || !slot) return g;
      g = gifts[0];
      for (n = 1; n < gifts.length; n++) if (gifts[n].t > g.t) g = gifts[n];
      return g;
    }

    function dropAt(x, y, kind, force) {
      var g = openGift(force);
      if (!g) return;
      if (x < 4) x = 4;
      if (x > W - 4) x = W - 4;
      g.on = true;
      g.x = x;
      g.y = y;
      g.kind = kind;
      g.t = 0;
    }

    function putGift(slot, x, y, kind) {
      if (x < 4) x = 4;
      if (x > W - 4) x = W - 4;
      slot.on = true;
      slot.x = x;
      slot.y = y;
      slot.kind = kind;
      slot.t = 0;
    }

    function maybeDrop(x, y, fromBoss) {
      var r = Math.random();
      if (fromBoss) {
        putGift(gifts[0], x - 5, y, 2);
        putGift(gifts[1], x + 5, y, r < 0.5 ? 3 : 0);
        return;
      }
      if (r < 0.36) return;
      if (r < 0.58) dropAt(x, y, 0, false);
      else if (r < 0.72) dropAt(x, y, 1, false);
      else if (r < 0.88) dropAt(x, y, 2, false);
      else dropAt(x, y, 3, false);
    }

    function takeGift(g) {
      var add;
      g.on = false;
      if (g.kind === 0) {
        add = maxHp * 0.28 | 0;
        if (add < 2) add = 2;
        if (hp >= maxHp) score += 40;
        hp += add;
        if (hp > maxHp) hp = maxHp;
        if (hp >= maxHp) hurt = false;
        boom(px, pyHold(), 3);
        return;
      }
      if (g.kind === 1) {
        hurt = false;
        hp = maxHp;
        boom(px, pyHold(), 3);
        addRing(px, pyHold(), 2, 34, 300);
        return;
      }
      if (g.kind === 2) {
        if (gun < 2) gun++;
        else if (hull < 4) {
          hull++;
          gun = 0;
          maxHp = HULL_HP[hull];
          hp = maxHp;
          hurt = false;
          fitPlayer();
        } else {
          hp = maxHp;
          hurt = false;
          score += 400;
        }
        morph = 640;
        addRing(px, pyHold(), 2, 46, 440);
        return;
      }
      if (shield < 8000) shield = 8000;
      shieldFlash = 200;
    }

    function pyHold() { return py; }

    function damagePlayer(n) {
      if (over || iframe > 0) return;
      if (shield > 0) {
        shield -= 900;
        if (shield < 0) shield = 0;
        shieldFlash = 160;
        iframe = 220;
        addRing(px, py, 8, 18, 160);
        return;
      }
      hp -= n;
      hurt = true;
      iframe = 380;
      boom(px, py, 3);
      if (hp > 0) return;
      hp = 0;
      lives--;
      boom(px, py, 1);
      if (lives <= 0) {
        over = true;
        playing = false;
        return;
      }
      hp = maxHp;
      hurt = false;
      iframe = 1400;
      px = W * 0.5;
      tx = px;
      py = H - 28;
      ty = py;
    }

    function killGrunt(f) {
      f.on = false;
      slain++;
      score += (8 + f.kind * 2) * (rank === 2 ? 2 : 1);
      boom(f.x, f.y, 0);
      maybeDrop(f.x, f.y, false);
      if (phase === 'wave' && !boss.on && slain >= QUOTA[stage]) spawnBoss();
    }

    function defeatBoss() {
      var x = boss.x;
      var y = boss.y;
      boss.on = false;
      score += 220 * (stage + 1) * (rank === 2 ? 2 : 1);
      boom(x, y, 2);
      maybeDrop(x, y, true);
      if (stage >= 9) {
        won = true;
        over = true;
        playing = false;
        return;
      }
      phase = 'gap';
      gapMs = 1100;
    }

    function spawnBoss() {
      var box = BOSS_BOX[stage];
      phase = 'boss';
      boss.on = true;
      boss.kind = stage;
      boss.max = Math.max(12, BOSS_HP[stage] * spec().hp | 0);
      boss.hp = boss.max;
      boss.x = W * 0.5;
      boss.y = -16;
      boss.vx = 24 + stage;
      boss.cool = 700;
      boss.hw = box[0];
      boss.hh = box[1];
    }

    function trySpawn() {
      var slot = null;
      var alive = 0;
      var kind, f, n;
      if (phase === 'gap') return;
      for (n = 0; n < foes.length; n++) {
        if (foes[n].on) alive++;
        else if (!slot) slot = foes[n];
      }
      if (!slot || alive >= (boss.on ? 3 : 5)) return;
      kind = stage * 2;
      if (Math.random() < 0.58) kind++;
      if (stage > 0 && Math.random() < 0.22) kind = (stage - 1) * 2 + (Math.random() < 0.5 ? 1 : 0);
      if (kind > 19) kind = 19;
      if (kind < 0) kind = 0;
      f = slot;
      f.on = true;
      f.kind = kind;
      f.hp = Math.max(1, GRUNT_HP[kind] * spec().hp | 0);
      f.max = f.hp;
      f.x = 8 + Math.random() * (W - 16);
      f.y = -8;
      f.vx = 0;
      f.vy = (26 + (kind % 5) * 3.2) * spec().pace;
      f.t = Math.random() * TAU;
      f.cool = 500 + (kind % 4) * 80;
      f.hw = 5.2;
      f.hh = 5.8;
      f.mode = kind & 3;
    }

    function two(n) {
      return (n < 10 ? '0' : '') + n;
    }

    function volley() {
      var wait = WAIT[hull][gun];
      var dmg = [[1, 2, 4], [3, 5, 6], [2, 3, 5], [3, 5, 7], [4, 6, 8]][hull][gun];
      var box = [
        [[1.2, 3.2], [2.2, 3.2], [3.4, 3.5]],
        [[3.8, 2.8], [5.4, 2.8], [6.4, 3.0]],
        [[2.4, 2.2], [2.6, 2.4], [2.2, 2.6]],
        [[1.3, 3.4], [1.4, 3.6], [1.8, 4.0]],
        [[1.8, 3.0], [2.0, 3.2], [2.4, 3.4]]
      ][hull][gun];
      var vy = (hull === 3 ? -136 : -164) - gun * 10;
      var s;
      if (hurt) wait *= 1.25;
      s = emit(px, py - 10, 0, vy, dmg, 0, 1, box[0], box[1], 2);
      if (s) {
        s.sprite = 'hg' + hull + gun;
        s.bad = false;
      }
      fire = wait;
    }

    function fireFoe(f) {
      var dmg = 1 + (f.kind / 8 | 0);
      var vy = 76 + (f.kind % 5) * 7;
      if (rank === 2) dmg++;
      var s = emit(f.x, f.y + f.hh * 0.55, 0, vy * spec().pace, dmg, 0, -1, 1.35, 2.6, 2);
      if (s) {
        s.sprite = 'eb' + two(f.kind);
        s.bad = true;
      }
      f.cool = 1040 - (f.kind % 5) * 36;
      if (rank === 0) f.cool += 240;
      if (rank === 2) f.cool -= 140;
      if (f.cool < 520) f.cool = 520;
    }

    function fireBoss() {
      var dmg = BOSS_DMG[stage];
      var vy = (84 + stage * 5) * spec().pace;
      var vx = 0;
      if (rank === 2) dmg++;
      if (stage === 3 || stage === 8) {
        vx = px - boss.x;
        if (vx > 36) vx = 36;
        if (vx < -36) vx = -36;
      }
      var s = emit(boss.x, boss.y + boss.hh * 0.62, vx, vy, dmg, 0, -1, 2.1, 3.6, 2);
      if (s) {
        s.sprite = 'bb' + two(stage);
        s.bad = true;
      }
      boss.cool = 1120 - stage * 52;
      if (rank === 0) boss.cool += 180;
      if (rank === 2) boss.cool -= 120;
      if (boss.cool < 480) boss.cool = 480;
    }

    function overlap(ax, ay, ahw, ahh, bx, by, bhw, bhh) {
      return Math.abs(ax - bx) < ahw + bhw && Math.abs(ay - by) < ahh + bhh;
    }

    function stepFx(dt) {
      var n, s, o, k;
      k = dt * 0.001;
      for (n = 0; n < sparks.length; n++) {
        s = sparks[n];
        if (!s.on) continue;
        s.x += s.vx * k;
        s.y += s.vy * k;
        s.life -= dt;
        if (s.life <= 0) s.on = false;
      }
      for (n = 0; n < rings.length; n++) {
        o = rings[n];
        if (!o.on) continue;
        o.r += o.vr * k;
        o.life -= dt;
        if (o.life <= 0 || o.r < 0.4) o.on = false;
      }
      if (shake > 0) {
        shake -= dt;
        if (shake < 0) shake = 0;
      }
      if (morph > 0) {
        morph -= dt;
        if (morph < 0) morph = 0;
      }
    }

    function reset() {
      var n;
      score = 0;
      lives = spec().lives;
      hull = 0;
      gun = 0;
      stage = 0;
      slain = 0;
      phase = 'wave';
      maxHp = HULL_HP[0];
      hp = maxHp;
      hurt = false;
      shield = 0;
      shieldFlash = 0;
      iframe = 900;
      morph = 0;
      shake = 0;
      fire = 280;
      spawnMs = 500;
      gapMs = 0;
      over = false;
      won = false;
      playing = true;
      px = W * 0.5;
      tx = px;
      py = H - 28;
      ty = py;
      boss.on = false;
      fitPlayer();
      for (n = 0; n < shots.length; n++) shots[n].on = false;
      for (n = 0; n < foes.length; n++) foes[n].on = false;
      for (n = 0; n < sparks.length; n++) sparks[n].on = false;
      for (n = 0; n < rings.length; n++) rings[n].on = false;
      for (n = 0; n < gifts.length; n++) gifts[n].on = false;
    }

    function update(dt) {
      var n, m, s, f, k, dx, dist;
      if (!(dt > 0)) dt = 34;
      if (dt > 50) dt = 50;
      time += dt;
      stepFx(dt);
      if (!playing || over) return;
      k = dt * 0.001;
      px += (tx - px) * (1 - Math.exp(-dt / 46));
      py += (ty - py) * (1 - Math.exp(-dt / 46));
      if (shield > 0) shield -= dt;
      if (shield < 0) shield = 0;
      if (shieldFlash > 0) shieldFlash -= dt;
      if (iframe > 0) iframe -= dt;
      fire -= dt;
      if (fire <= 0) volley();
      for (n = 0; n < stars.length; n++) {
        s = stars[n];
        s.y += s.v * k;
        if (s.y >= H) {
          s.y -= H;
          s.x = Math.random() * W;
        }
      }
      if (phase === 'gap') {
        gapMs -= dt;
        if (gapMs <= 0) {
          stage++;
          slain = 0;
          phase = 'wave';
          spawnMs = 360;
        }
      } else {
        spawnMs -= dt;
        if (spawnMs <= 0) {
          trySpawn();
          spawnMs = (boss.on ? 1500 : 760) - stage * 28;
          spawnMs *= spec().gap;
          if (spawnMs < 380) spawnMs = 380;
        }
      }
      for (n = 0; n < gifts.length; n++) {
        f = gifts[n];
        if (!f.on) continue;
        f.t += dt;
        f.y += 30 * k;
        dx = px - f.x;
        dist = dx * dx + (py - f.y) * (py - f.y);
        if (dist < 260) f.x += dx * k * 3.2;
        if (f.y > H + 6) f.on = false;
        else if (overlap(f.x, f.y, 1.8, 1.8, px, py, phw, phh)) takeGift(f);
      }
      for (n = 0; n < shots.length; n++) {
        s = shots[n];
        if (!s.on) continue;
        s.x += s.vx * k;
        s.y += s.vy * k;
        if (s.y < -10 || s.y > H + 8 || s.x < -8 || s.x > W + 8) s.on = false;
      }
      for (n = 0; n < foes.length; n++) {
        f = foes[n];
        if (!f.on) continue;
        f.y += f.vy * k;
        f.t += dt * (f.mode === 3 ? 0.006 : 0.003);
        if (f.mode === 1 || f.mode === 3) {
          f.x += Math.sin(f.t) * (f.mode === 3 ? 28 : 16) * k;
        } else if (f.mode === 2) {
          dx = px - f.x;
          if (dx > 18) dx = 18;
          if (dx < -18) dx = -18;
          f.x += dx * k * 0.35;
        }
        if (f.x < f.hw) f.x = f.hw;
        if (f.x > W - f.hw) f.x = W - f.hw;
        if (f.y > H + 8) { f.on = false; continue; }
        f.cool -= dt;
        if (f.cool <= 0 && f.y > 10 && f.y < H * 0.68) fireFoe(f);
        if (iframe <= 0 && overlap(px, py, phw, phh, f.x, f.y, f.hw, f.hh)) {
          killGrunt(f);
          damagePlayer(2);
        }
      }
      if (boss.on) {
        if (boss.y < 28) boss.y += 40 * k;
        else {
          boss.x += boss.vx * k;
          if (boss.x < boss.hw + 1 || boss.x > W - boss.hw - 1) boss.vx = -boss.vx;
        }
        boss.cool -= dt;
        if (boss.cool <= 0 && boss.y >= 18) fireBoss();
        if (iframe <= 0 && overlap(px, py, phw, phh, boss.x, boss.y, boss.hw * 0.72, boss.hh * 0.72)) {
          damagePlayer(BOSS_DMG[stage]);
        }
      }
      for (n = 0; n < shots.length; n++) {
        s = shots[n];
        if (!s.on) continue;
        if (!s.bad) {
          if (boss.on && overlap(s.x, s.y, s.hw, s.hh, boss.x, boss.y, boss.hw, boss.hh)) {
            s.on = false;
            boss.hp -= s.dmg;
            if (boss.hp <= 0) defeatBoss();
            continue;
          }
          for (m = 0; m < foes.length; m++) {
            f = foes[m];
            if (!f.on) continue;
            if (!overlap(s.x, s.y, s.hw, s.hh, f.x, f.y, f.hw, f.hh)) continue;
            s.on = false;
            f.hp -= s.dmg;
            if (f.hp <= 0) killGrunt(f);
            break;
          }
        } else if (overlap(s.x, s.y, s.hw, s.hh, px, py, phw, phh)) {
          s.on = false;
          damagePlayer(s.dmg);
        }
      }
    }

    function mirror(ctx, x, y, sc, face, pts) {
      var i, n;
      n = pts.length;
      ctx.beginPath();
      ctx.moveTo(x + pts[0] * sc, y + pts[1] * sc * face);
      for (i = 2; i < n; i += 2) ctx.lineTo(x + pts[i] * sc, y + pts[i + 1] * sc * face);
      for (i = n - 4; i >= 0; i -= 2) ctx.lineTo(x - pts[i] * sc, y + pts[i + 1] * sc * face);
      ctx.closePath();
      ctx.stroke();
    }

    function ring(ctx, x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.stroke();
    }

    function gly(ctx, x, y, sc, face, pts, open) {
      var i;
      ctx.beginPath();
      ctx.moveTo(x + pts[0] * sc, y + pts[1] * sc * face);
      for (i = 2; i < pts.length; i += 2) ctx.lineTo(x + pts[i] * sc, y + pts[i + 1] * sc * face);
      if (!open) ctx.closePath();
      ctx.stroke();
    }

    function trail(ctx, s) {
      var mag = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 1;
      var ux = s.vx / mag;
      var uy = s.vy / mag;
      var len = 11;
      var back = 5.5;
      var i, a, b;
      ctx.strokeStyle = '#fff';
      for (i = 0; i < 3; i++) {
        a = back + len * i * 0.22;
        b = back + len * (0.34 + i * 0.32);
        ctx.globalAlpha = 0.78 - i * 0.24;
        ctx.lineWidth = (2.6 - i * 0.75) / unit;
        ctx.beginPath();
        ctx.moveTo(s.x - ux * a, s.y - uy * a);
        ctx.lineTo(s.x - ux * b, s.y - uy * b);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.08 / unit;
    }

    function needle(ctx, x, y, sc, face, barbs) {
      gly(ctx, x, y, sc, face, [0, -1.15, 0.22, -0.15, 0.16, 0.55, 0.34, 0.85, 0, 0.45, -0.34, 0.85, -0.16, 0.55, -0.22, -0.15]);
      if (barbs) gly(ctx, x, y, sc, face, [-0.42, 0.15, -0.12, 0.28, -0.12, 0.05], true);
      if (barbs) gly(ctx, x, y, sc, face, [0.42, 0.15, 0.12, 0.28, 0.12, 0.05], true);
    }

    function arrowHead(ctx, x, y, sc, face) {
      gly(ctx, x, y, sc, face, [0, -1.05, 0.62, 0.35, 0.16, 0.12, 0.22, 0.72, 0, 0.38, -0.22, 0.72, -0.16, 0.12, -0.62, 0.35]);
      gly(ctx, x, y, sc, face, [0, -0.45, 0.16, 0.15, 0, 0.28, -0.16, 0.15]);
    }

    function chevrons(ctx, x, y, sc, face, n) {
      var i, o;
      for (i = 0; i < n; i++) {
        o = i * 0.42;
        gly(ctx, x, y, sc, face, [-0.85, o + 0.28, 0, o - 0.55, 0.85, o + 0.28, 0, o - 0.22], true);
      }
    }

    function shell(ctx, x, y, sc, face, bands) {
      gly(ctx, x, y, sc, face, [0, -1.15, 0.28, -0.55, 0.32, 0.35, 0.55, 0.72, 0, 0.42, -0.55, 0.72, -0.32, 0.35, -0.28, -0.55]);
      if (bands > 1) gly(ctx, x, y, sc, face, [-0.22, -0.15, 0.22, -0.15], true);
      if (bands > 2) gly(ctx, x, y, sc, face, [-0.24, 0.12, 0.24, 0.12], true);
      gly(ctx, x, y, sc, face, [0, -0.85, 0, 0.15], true);
    }

    function prism(ctx, x, y, sc, face, tier) {
      gly(ctx, x, y, sc, face, [0, -1.05, 0.72, 0.55, 0, 0.15, -0.72, 0.55]);
      if (tier > 1) {
        gly(ctx, x, y, sc, face, [0, -0.55, 0.28, 0.28, -0.28, 0.28]);
        gly(ctx, x, y, sc, face, [-0.95, 0.35, -0.55, 0.72, -0.4, 0.22], true);
        gly(ctx, x, y, sc, face, [0.95, 0.35, 0.55, 0.72, 0.4, 0.22], true);
      }
      if (tier > 2) ring(ctx, x, y + sc * 0.05 * face, sc * 0.95);
    }

    function roundShot(ctx, x, y, sc, face) {
      ring(ctx, x, y, sc * 0.48);
      ring(ctx, x, y, sc * 0.18);
      gly(ctx, x, y, sc, face, [0, 0.48, 0, 1.05], true);
      gly(ctx, x, y, sc, face, [-0.16, 0.72, 0, 1.05, 0.16, 0.72], true);
    }

    function spear(ctx, x, y, sc, face) {
      gly(ctx, x, y, sc, face, [0, -1.45, 0.14, -0.85, 0.1, 0.55, 0.28, 0.95, 0, 0.62, -0.28, 0.95, -0.1, 0.55, -0.14, -0.85]);
      gly(ctx, x, y, sc, face, [-0.1, -0.2, 0.1, -0.2], true);
      gly(ctx, x, y, sc, face, [-0.1, 0.15, 0.1, 0.15], true);
    }

    function bomb(ctx, x, y, sc, face) {
      ring(ctx, x, y + sc * 0.12 * face, sc * 0.55);
      gly(ctx, x, y, sc, face, [-0.16, -0.72, -0.16, -0.28, 0.16, -0.28, 0.16, -0.72]);
      gly(ctx, x, y, sc, face, [-0.34, -0.28, 0.34, -0.28], true);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y + sc * 0.12 * face, sc * 0.16, 0, TAU);
      ctx.fill();
    }

    function crownShell(ctx, x, y, sc, face) {
      gly(ctx, x, y, sc, face, [0, -1.25, 0.16, -0.72, 0.34, -0.95, 0.28, -0.45, 0.32, 0.35, 0.5, 0.7, 0, 0.4, -0.5, 0.7, -0.32, 0.35, -0.28, -0.45, -0.34, -0.95, -0.16, -0.72]);
    }

    function wideArrow(ctx, x, y, sc, face) {
      gly(ctx, x, y, sc, face, [0, -0.85, 0.95, 0.35, 0.28, 0.05, 0.18, 0.55, 0, 0.22, -0.18, 0.55, -0.28, 0.05, -0.95, 0.35]);
    }

    function diamondShot(ctx, x, y, sc, face) {
      gly(ctx, x, y, sc, face, [0, -1.1, 0.42, 0.05, 0.16, 0.85, 0, 0.45, -0.16, 0.85, -0.42, 0.05]);
      gly(ctx, x, y, sc, face, [0, -0.45, 0.16, 0.12, 0, 0.35, -0.16, 0.12]);
    }

    function forkShot(ctx, x, y, sc, face) {
      gly(ctx, x, y, sc, face, [0, -0.15, 0.12, -0.15, 0.28, -1.05, 0.48, -0.85, 0.22, 0.15, 0.55, 0.55, 0, 0.28, -0.55, 0.55, -0.22, 0.15, -0.48, -0.85, -0.28, -1.05, -0.12, -0.15]);
    }

    function clawShot(ctx, x, y, sc, face) {
      shell(ctx, x, y, sc, face, 1);
      gly(ctx, x, y, sc, face, [-0.32, 0.15, -0.7, 0.55, -0.4, 0.35], true);
      gly(ctx, x, y, sc, face, [0.32, 0.15, 0.7, 0.55, 0.4, 0.35], true);
    }

    function slug(ctx, x, y, sc, face) {
      gly(ctx, x, y, sc, face, [0, -0.85, 0.38, -0.35, 0.38, 0.55, 0.22, 0.85, 0, 0.62, -0.22, 0.85, -0.38, 0.55, -0.38, -0.35]);
    }

    function needleLine(ctx, x, y, sc, face) {
      gly(ctx, x, y, sc, face, [0, -1.45, 0.1, -0.2, 0.08, 0.85, 0, 1.05, -0.08, 0.85, -0.1, -0.2]);
    }

    function drawShot(ctx, s) {
      var x = s.x;
      var y = s.y;
      var sc = s.sc;
      var face = s.face;
      var tier = s.tier || 1;
      var id = s.shape;
      if (id < 5) {
        if (id === 0) needle(ctx, x, y, sc, face, true);
        else if (id === 1) arrowHead(ctx, x, y, sc, face);
        else if (id === 2) chevrons(ctx, x, y, sc, face, tier);
        else if (id === 3) shell(ctx, x, y, sc * (0.85 + tier * 0.18), face, tier);
        else prism(ctx, x, y, sc, face, tier);
        return;
      }
      if (id >= 200) {
        id = id - 200;
        if (id === 0) wideArrow(ctx, x, y, sc * 1.15, face);
        else if (id === 1) bomb(ctx, x, y, sc, face);
        else if (id === 2) slug(ctx, x, y, sc * 1.15, face);
        else if (id === 3) spear(ctx, x, y, sc, face);
        else if (id === 4) shell(ctx, x, y, sc, face, 2);
        else if (id === 5) bomb(ctx, x, y, sc * 0.95, face);
        else if (id === 6) spear(ctx, x, y, sc * 1.15, face);
        else if (id === 7) wideArrow(ctx, x, y, sc, face);
        else if (id === 8) crownShell(ctx, x, y, sc, face);
        else diamondShot(ctx, x, y, sc, face);
        return;
      }
      id -= 100;
      if (id === 0) needle(ctx, x, y, sc, face, true);
      else if (id === 1) diamondShot(ctx, x, y, sc * 0.9, face);
      else if (id === 2) shell(ctx, x, y, sc * 0.8, face, 1);
      else if (id === 3) forkShot(ctx, x, y, sc, face);
      else if (id === 4) roundShot(ctx, x, y, sc, face);
      else if (id === 5) spear(ctx, x, y, sc * 0.85, face);
      else if (id === 6) clawShot(ctx, x, y, sc * 0.85, face);
      else if (id === 7) shell(ctx, x, y, sc * 0.9, face, 1);
      else if (id === 8) slug(ctx, x, y, sc, face);
      else if (id === 9) clawShot(ctx, x, y, sc * 0.9, face);
      else if (id === 10) shell(ctx, x, y, sc * 0.75, face, 1);
      else if (id === 11) needleLine(ctx, x, y, sc, face);
      else if (id === 12) clawShot(ctx, x, y, sc * 0.8, face);
      else if (id === 13) slug(ctx, x, y, sc * 1.05, face);
      else if (id === 14) needleLine(ctx, x, y, sc * 1.15, face);
      else if (id === 15) shell(ctx, x, y, sc * 0.95, face, 2);
      else if (id === 16) roundShot(ctx, x, y, sc * 0.85, face);
      else if (id === 17) forkShot(ctx, x, y, sc * 0.85, face);
      else if (id === 18) diamondShot(ctx, x, y, sc, face);
      else needle(ctx, x, y, sc * 0.75, face, false);
    }

    function drawGruntShip(ctx, kind, x, y, sc, face) {
      if (kind === 4) {
        ctx.beginPath();
        ctx.ellipse(x, y, sc * 0.95, sc * 0.42, 0, 0, TAU);
        ctx.stroke();
        gly(ctx, x, y, sc, face, [0, -0.72, 0, -0.28], true);
        gly(ctx, x, y, sc, face, [-0.22, 0.15, 0, 0.55, 0.22, 0.15], true);
        return;
      }
      if (kind === 6) {
        mirror(ctx, x, y, sc, face, [0, -0.45, 0.42, -0.2, 0.38, 0.35, 0.16, 0.5, 0, 0.22]);
        gly(ctx, x, y, sc, face, [0.3, 0.05, 0.95, 0.45, 0.55, 0.72, 0.35, 0.28], true);
        gly(ctx, x, y, sc, face, [-0.3, 0.05, -0.95, 0.45, -0.55, 0.72, -0.35, 0.28], true);
        return;
      }
      if (kind === 8) {
        gly(ctx, x, y, sc, face, [-0.72, -0.72, 0.72, -0.72, 0.72, 0.55, -0.72, 0.55]);
        gly(ctx, x, y, sc, face, [0, -0.95, 0.22, -0.72, -0.22, -0.72]);
        gly(ctx, x, y, sc, face, [-0.72, 0, 0.72, 0], true);
        gly(ctx, x, y, sc, face, [0, -0.72, 0, 0.55], true);
        return;
      }
      if (kind === 10) {
        mirror(ctx, x + sc * 0.42, y, sc * 0.55, face, [0, -1.05, 0.28, -0.2, 0.22, 0.85, 0, 1.0]);
        mirror(ctx, x - sc * 0.42, y, sc * 0.55, face, [0, -1.05, 0.28, -0.2, 0.22, 0.85, 0, 1.0]);
        gly(ctx, x, y, sc, face, [-0.28, -0.15, 0.28, -0.15], true);
        return;
      }
      if (kind === 15) {
        mirror(ctx, x, y, sc, face, [0, -1.15, 0.16, -0.75, 0.16, -0.12, 0.9, 0.02, 0.9, 0.32, 0.16, 0.32, 0.14, 0.9, 0, 1.05]);
        return;
      }
      if (kind === 18) {
        ctx.beginPath();
        ctx.ellipse(x, y, sc * 0.85, sc * 0.48, 0, 0, TAU);
        ctx.stroke();
        gly(ctx, x, y, sc, face, [0, -0.28, 0.22, 0, 0, 0.28, -0.22, 0]);
        gly(ctx, x, y, sc, face, [0, 0.35, 0, 0.85], true);
        return;
      }
      if (kind === 19) {
        mirror(ctx, x, y + sc * 0.25 * face, sc * 0.42, face, [0, -1.1, 0.35, 0.1, 0.2, 0.85, 0, 1.0]);
        mirror(ctx, x - sc * 0.62, y - sc * 0.2 * face, sc * 0.32, face, [0, -1.1, 0.35, 0.1, 0.2, 0.85, 0, 1.0]);
        mirror(ctx, x + sc * 0.62, y - sc * 0.2 * face, sc * 0.32, face, [0, -1.1, 0.35, 0.1, 0.2, 0.85, 0, 1.0]);
        return;
      }
      if (kind === 0) mirror(ctx, x, y, sc, face, [0, -1.15, 0.22, -0.45, 0.98, 0.08, 0.42, 0.28, 0.26, 0.18, 0.24, 0.82, 0.14, 1.05, 0, 0.7]);
      else if (kind === 1) mirror(ctx, x, y, sc, face, [0, -1.05, 1.15, 0.12, 0.42, 0.32, 0.36, 0.98, 0.2, 0.98, 0, 0.48]);
      else if (kind === 2) mirror(ctx, x, y, sc, face, [0, -0.9, 0.28, -0.4, 0.7, -0.05, 0.48, 0.28, 0.18, 0.15, 0.36, 0.98, 0, 0.35]);
      else if (kind === 3) mirror(ctx, x, y, sc, face, [0, -0.25, 0.12, -0.25, 0.2, -1.05, 0.42, -0.9, 0.26, 0.05, 0.82, 0.32, 0.18, 0.85, 0, 0.42]);
      else if (kind === 5) mirror(ctx, x, y, sc, face, [0, -1.25, 0.16, -0.25, 0.72, 0.12, 0.18, 0.32, 0.12, 1.05, 0, 1.18]);
      else if (kind === 7) mirror(ctx, x, y, sc, face, [0, -1.12, 0.9, 0.18, 0.32, 0.02, 0.24, 0.72, 0, 0.32]);
      else if (kind === 9) mirror(ctx, x, y, sc, face, [0, -0.75, 0.18, -0.35, 0.95, 0.2, 1.02, 0.78, 0.4, 0.28, 0.16, 0.95, 0, 1.05]);
      else if (kind === 11) mirror(ctx, x, y, sc, face, [0, -1.15, 0.18, -0.15, 0.95, 0.02, 0.22, 0.22, 0.16, 0.95, 0, 1.08]);
      else if (kind === 12) mirror(ctx, x, y, sc, face, [0, -1.0, 0.18, -0.35, 0.98, 0.62, 0.38, 0.12, 0.16, 0.95, 0, 1.08]);
      else if (kind === 13) mirror(ctx, x, y, sc, face, [0, -0.42, 1.12, -0.12, 1.02, 0.42, 0.35, 0.55, 0, 0.22]);
      else if (kind === 14) mirror(ctx, x, y, sc, face, [0, -1.28, 0.1, -0.15, 0.48, 0.08, 0.12, 0.28, 0.08, 1.05, 0, 1.18]);
      else if (kind === 16) mirror(ctx, x, y, sc, face, [0, -1.05, 0.62, -0.2, 0.42, 0.55, 0.16, 0.95, 0, 1.08]);
      else mirror(ctx, x, y, sc, face, [0.15, -0.12, 0.2, -1.02, 0.55, -0.82, 0.4, 0.55, 0.14, 0.72, 0, 0.12]);
      if (kind === 0 || kind === 1 || kind === 5 || kind === 7) {
        gly(ctx, x, y, sc, face, [0, -0.45, 0.12, -0.18, 0, 0.08, -0.12, -0.18]);
      }
      if (kind === 1 || kind === 2) {
        gly(ctx, x, y, sc, face, [-0.28, 0.45, -0.28, 0.95, -0.12, 0.95, -0.12, 0.45], true);
        gly(ctx, x, y, sc, face, [0.12, 0.45, 0.12, 0.95, 0.28, 0.95, 0.28, 0.45], true);
      }
    }

    function drawBossShip(ctx, kind, x, y, sc, face) {
      if (kind === 1) {
        ring(ctx, x, y, sc * 0.72);
        ring(ctx, x, y, sc * 0.28);
        gly(ctx, x, y, sc, face, [-0.9, 0, 0.9, 0], true);
        gly(ctx, x, y, sc, face, [0, -0.9, 0, 0.9], true);
        mirror(ctx, x, y, sc * 0.85, face, [0, -1.05, 0.22, -0.2, 0.85, 0.15, 0.2, 0.85, 0, 1.05]);
        return;
      }
      if (kind === 5) {
        ring(ctx, x, y, sc * 1.05);
        ring(ctx, x, y, sc * 0.82);
        mirror(ctx, x, y, sc * 0.48, face, [0, -1.15, 0.28, -0.1, 0.2, 0.9, 0, 1.05]);
        gly(ctx, x, y, sc, face, [-1.05, 0, -0.82, 0], true);
        gly(ctx, x, y, sc, face, [0.82, 0, 1.05, 0], true);
        gly(ctx, x, y, sc, face, [0, -1.05, 0, -0.82], true);
        gly(ctx, x, y, sc, face, [0, 0.82, 0, 1.05], true);
        return;
      }
      if (kind === 2) {
        mirror(ctx, x, y, sc, face, [0, -0.35, 1.15, -0.12, 1.05, 0.22, 0.72, 0.18, 0.62, 0.95, 0.4, 0.28, 0.28, 0.98, 0.12, 0.22, 0, 0.12]);
        return;
      }
      if (kind === 6) {
        mirror(ctx, x, y, sc, face, [0, -0.35, 0.22, -0.55, 0.28, -1.2, 0.12, 0.15, 0.35, 0.35, 0.22, 1.15, 0, 1.25]);
        gly(ctx, x, y, sc, face, [-0.55, -0.85, -0.85, 0.15, -0.45, 0.95], true);
        gly(ctx, x, y, sc, face, [0.55, -0.85, 0.85, 0.15, 0.45, 0.95], true);
        return;
      }
      if (kind === 7) {
        mirror(ctx, x, y, sc, face, [0, -0.22, 0.18, -0.42, 1.2, -0.08, 1.15, 0.28, 0.35, 0.22, 0.16, 0.72, 0, 0.38]);
        gly(ctx, x, y, sc, face, [-0.35, -0.15, 0.35, -0.15], true);
        return;
      }
      if (kind === 8) {
        mirror(ctx, x, y, sc, face, [0, -0.15, 0.12, -1.05, 0.28, -0.25, 0.55, -0.08, 0.48, -0.85, 0.68, -0.15, 1.15, 0.18, 0.72, 0.42, 0, 0.55]);
        return;
      }
      if (kind === 9) {
        mirror(ctx, x, y, sc, face, [0, -1.2, 0.22, -0.35, 1.15, 0.22, 0.32, 0.05, 0.28, 0.85, 0, 1.1]);
        ctx.beginPath();
        ctx.arc(x, y, sc * 0.78, 0.5, 1.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, sc * 0.78, 2.0, 2.65);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, sc * 0.78, 3.7, 4.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, sc * 0.78, 5.2, 5.85);
        ctx.stroke();
        return;
      }
      if (kind === 0) {
        mirror(ctx, x, y, sc, face, [0, -1.2, 0.18, -0.55, 1.15, 0.05, 0.72, 0.32, 0.22, 0.12, 0.28, 0.95, 0, 1.08]);
        gly(ctx, x, y, sc, face, [-1.05, 0.22, -0.85, 0.72, -0.62, 0.28], true);
        gly(ctx, x, y, sc, face, [1.05, 0.22, 0.85, 0.72, 0.62, 0.28], true);
        return;
      }
      if (kind === 3) {
        mirror(ctx, x, y, sc, face, [0, -1.25, 0.16, -0.95, 0.42, -0.45, 0.85, 0.05, 0.48, 0.35, 0.72, 0.75, 0.28, 0.45, 0.34, 1.05, 0, 1.2]);
        gly(ctx, x, y, sc, face, [-0.55, 0.2, -0.85, 0.85], true);
        gly(ctx, x, y, sc, face, [0.55, 0.2, 0.85, 0.85], true);
        return;
      }
      mirror(ctx, x, y, sc, face, [0, -0.85, 0.14, -1.2, 0.32, -0.45, 1.15, 0.05, 1.05, 0.38, 0.4, 0.22, 0.22, 0.55, 0, 0.72]);
      gly(ctx, x, y, sc, face, [-0.85, 0.12, -1.05, 0.42], true);
      gly(ctx, x, y, sc, face, [0.85, 0.12, 1.05, 0.42], true);
    }

    function drawPlayer(ctx) {
      var sc = 8.2 + hull * 0.35;
      if (iframe > 80 && ((iframe / 90) & 1) === 0) return;
      ctx.strokeStyle = hurt ? '#c8c8c8' : '#ececec';
      ctx.lineWidth = 1.15 / unit;
      if (hull === 0) {
        mirror(ctx, px, py, sc, 1, [0, -1.22, 0.16, -0.62, 0.22, 0.02, 1.02, 0.42, 0.4, 0.16, 0.24, 0.24, 0.18, 0.82, 0.12, 1.05, 0, 0.72]);
        gly(ctx, px, py, sc, 1, [0, -0.48, 0.12, -0.22, 0, 0.05, -0.12, -0.22]);
      } else if (hull === 1) {
        mirror(ctx, px, py, sc, 1, [0, -1.28, 0.26, -0.42, 1.22, 0.2, 0.48, 0.02, 0.38, 0.42, 0.46, 1.02, 0.26, 1.02, 0.2, 0.38, 0, 0.52]);
        gly(ctx, px, py, sc, 1, [0, -0.55, 0.1, -0.22, 0, 0.02, -0.1, -0.22]);
      } else if (hull === 2) {
        mirror(ctx, px, py, sc, 1, [0, -0.15, 0.1, -0.48, 0.14, -1.25, 0.3, -0.72, 0.22, -0.12, 0.98, 0.28, 0.36, 0.05, 0.28, 0.62, 0.2, 1.08, 0, 0.78]);
        gly(ctx, px, py, sc, 1, [0.32, -0.05, 0.55, -0.38, 0.46, 0.18], true);
        gly(ctx, px, py, sc, 1, [-0.32, -0.05, -0.55, -0.38, -0.46, 0.18], true);
      } else if (hull === 3) {
        mirror(ctx, px, py, sc, 1, [0, -1.05, 0.48, -0.28, 1.28, 0.18, 0.9, 0.58, 0.42, 0.32, 0.36, 1.02, 0, 0.62]);
        gly(ctx, px, py, sc, 1, [-0.55, 0.22, -0.72, 0.85, -0.4, 0.38], true);
        gly(ctx, px, py, sc, 1, [0.55, 0.22, 0.72, 0.85, 0.4, 0.38], true);
      } else {
        ring(ctx, px, py, sc * 0.62);
        mirror(ctx, px, py, sc, 1, [0, -1.32, 0.12, -0.35, 1.08, 0.5, 0.26, 0.08, 0.16, 0.95, 0, 1.08]);
        gly(ctx, px, py, sc, 1, [-0.14, 0.72, -0.28, 1.12, 0, 0.85, 0.28, 1.12, 0.14, 0.72], true);
      }
      ctx.fillStyle = '#fff';
      ctx.fillRect(px - 0.35, py - sc * 0.05, 0.7, 0.7);
      if (hurt) {
        ctx.strokeStyle = '#737373';
        gly(ctx, px, py, sc, 1, [-0.2, 0.15, 0.08, -0.25, -0.05, 0.45], true);
      }
    }


    function drawGift(ctx, g) {
      var x = g.x;
      var y = g.y + Math.sin(g.t * 0.01) * 0.55;
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      if (g.kind === 0) {
        ctx.rect(x - 0.75, y - 1.5, 1.5, 2.7);
        ctx.moveTo(x, y - 2.3);
        ctx.lineTo(x, y - 1.5);
        ctx.moveTo(x - 0.45, y + 0.3);
        ctx.lineTo(x + 0.45, y + 0.3);
        ctx.moveTo(x, y - 0.15);
        ctx.lineTo(x, y + 0.75);
      } else if (g.kind === 1) {
        ctx.arc(x, y, 1.75, 0, TAU);
        ctx.moveTo(x, y - 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x - 1, y);
        ctx.lineTo(x + 1, y);
      } else if (g.kind === 2) {
        ctx.moveTo(x - 1.55, y + 0.15);
        ctx.lineTo(x, y - 1.55);
        ctx.lineTo(x + 1.55, y + 0.15);
        ctx.moveTo(x - 1.55, y + 1.25);
        ctx.lineTo(x, y - 0.35);
        ctx.lineTo(x + 1.55, y + 1.25);
      } else {
        ctx.arc(x, y, 1.7, 0, TAU);
        ctx.moveTo(x, y - 2.45);
        ctx.lineTo(x, y - 1.7);
        ctx.moveTo(x, y + 1.7);
        ctx.lineTo(x, y + 2.45);
        ctx.moveTo(x - 2.45, y);
        ctx.lineTo(x - 1.7, y);
        ctx.moveTo(x + 1.7, y);
        ctx.lineTo(x + 2.45, y);
      }
      ctx.stroke();
    }

    function drawBullet(ctx, s) {
      var id = s.sprite || '';
      var face = s.bad ? -1 : 1;
      var x = s.x;
      var y = s.y;
      var sc = s.bad ? 2.7 : 3.1;
      var n = 0;
      var gunN = 0;
      if (id.indexOf('hg') === 0) {
        n = id.charAt(2) | 0;
        gunN = id.charAt(3) | 0;
        sc = 2.6 + gunN * 0.35;
        if (n === 0) {
          if (gunN === 0) needle(ctx, x, y, sc, face, true);
          else if (gunN === 1) {
            needle(ctx, x - sc * 0.55, y, sc * 0.85, face, true);
            needle(ctx, x + sc * 0.55, y, sc * 0.85, face, true);
          } else {
            needle(ctx, x - sc * 0.7, y + sc * 0.25 * face, sc * 0.75, face, true);
            needle(ctx, x, y - sc * 0.35 * face, sc * 1.05, face, true);
            needle(ctx, x + sc * 0.7, y + sc * 0.25 * face, sc * 0.75, face, true);
          }
        } else if (n === 1) {
          var count = gunN === 0 ? 3 : 5;
          var i, t;
          for (i = 0; i < count; i++) {
            t = (i - (count - 1) / 2) / ((count - 1) / 2);
            arrowHead(ctx, x + t * sc * (gunN === 2 ? 1.15 : 0.85), y + Math.abs(t) * sc * 0.35 * face, sc * (gunN === 2 && t === 0 ? 1.05 : 0.72), face);
          }
        } else if (n === 2) chevrons(ctx, x, y, sc, face, gunN + 1);
        else if (n === 3) shell(ctx, x, y, sc * (0.9 + gunN * 0.18), face, gunN + 1);
        else prism(ctx, x, y, sc, face, gunN + 1);
        return;
      }
      n = parseInt(id.slice(2), 10) || 0;
      if (id.indexOf('bb') === 0) {
        if (n === 0) wideArrow(ctx, x, y, sc * 1.2, face);
        else if (n === 1 || n === 5) bomb(ctx, x, y, sc, face);
        else if (n === 2) slug(ctx, x, y, sc * 1.15, face);
        else if (n === 3 || n === 6) spear(ctx, x, y, sc * 1.2, face);
        else if (n === 4) shell(ctx, x, y, sc, face, 2);
        else if (n === 7) wideArrow(ctx, x, y, sc * 1.25, face);
        else if (n === 8) crownShell(ctx, x, y, sc, face);
        else diamondShot(ctx, x, y, sc, face);
        return;
      }
      if (n === 0) needle(ctx, x, y, sc, face, true);
      else if (n === 1 || n === 18) diamondShot(ctx, x, y, sc, face);
      else if (n === 4 || n === 16) roundShot(ctx, x, y, sc, face);
      else if (n === 3 || n === 17) forkShot(ctx, x, y, sc, face);
      else if (n === 5 || n === 11 || n === 14) needleLine(ctx, x, y, sc * (n === 14 ? 1.25 : 1), face);
      else if (n === 6 || n === 9 || n === 12) clawShot(ctx, x, y, sc, face);
      else if (n === 8 || n === 13) slug(ctx, x, y, sc * (n === 13 ? 1.15 : 1), face);
      else shell(ctx, x, y, sc, face, 1);
    }

    function drawLines(ctx, name, x, y, maxH, maxW) {
      var g, s;
      g = typeof STAR_LINES === 'undefined' ? null : STAR_LINES[name];
      if (!g || typeof Path2D === 'undefined') return;
      if (!g._p) g._p = new Path2D(g.d);
      s = maxH / g.h;
      if (maxW && g.w * s > maxW) s = maxW / g.w;
      ctx.save();
      ctx.translate(x - g.w * s * 0.5, y - g.h * s * 0.5);
      ctx.scale(s, s);
      ctx.fill(g._p, 'evenodd');
      ctx.restore();
    }

    function drawCraft(ctx, kind, x, y, sc, face, bossy) {
      ctx.strokeStyle = bossy ? '#fff' : '#ececec';
      if (bossy) drawBossShip(ctx, kind, x, y, sc, face);
      else drawGruntShip(ctx, kind, x, y, sc, face);
    }

    function drawDrift(ctx, s, shakeX) {
      var len = s.v * unit * 0.034;
      if (len < 1) len = 1;
      if (s.hot && len < 2) len = 2;
      if (len > 7) len = 7;
      ctx.fillRect(Math.round(s.x * unit + shakeX), s.y * unit - len, 1, len);
    }

    function paint(ctx) {
      var n, s, f, dot, pulse, u;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      u = 0;
      if (shake > 0) u = Math.sin(time * 0.045) * 0.65 * unit;
      if (!playing && !over) return;
      ctx.fillStyle = '#737373';
      for (n = 0; n < stars.length; n++) {
        s = stars[n];
        if (!s.hot) drawDrift(ctx, s, u);
      }
      ctx.fillStyle = '#ececec';
      for (n = 0; n < stars.length; n++) {
        s = stars[n];
        if (s.hot) drawDrift(ctx, s, u);
      }
      ctx.globalAlpha = 1;
      ctx.setTransform(unit, 0, 0, unit, u, 0);
      dot = 1 / unit;
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'butt';
      ctx.lineWidth = 1.12 / unit;
      ctx.strokeStyle = '#ececec';
      for (n = 0; n < rings.length; n++) {
        s = rings[n];
        if (!s.on) continue;
        ctx.globalAlpha = s.life / s.max;
        ring(ctx, s.x, s.y, s.r);
      }
      ctx.globalAlpha = 1;
      for (n = 0; n < gifts.length; n++) if (gifts[n].on) drawGift(ctx, gifts[n]);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1 / unit;
      ctx.strokeStyle = '#fff';
      for (n = 0; n < shots.length; n++) {
        s = shots[n];
        if (!s.on) continue;
        if (!s.bad) trail(ctx, s);
        ctx.globalAlpha = 1;
        ctx.fillStyle = s.bad ? '#d8d8d8' : '#fff';
        drawLines(ctx, s.sprite, s.x, s.y, s.bad ? 9 : 13, s.bad ? 9 : 16);
      }
      ctx.fillStyle = '#ececec';
      for (n = 0; n < foes.length; n++) {
        f = foes[n];
        if (!f.on) continue;
        drawLines(ctx, 'e' + two(f.kind), f.x, f.y, 15, 16);
      }
      if (boss.on) {
        ctx.fillStyle = '#fff';
        drawLines(ctx, 'b' + two(boss.kind), boss.x, boss.y, boss.hh * 2.2, boss.hw * 2.2);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(boss.x - boss.hw, boss.y - boss.hh - 2.2, boss.hw * 2, 0.7);
        ctx.fillStyle = '#fff';
        ctx.fillRect(boss.x - boss.hw, boss.y - boss.hh - 2.2, boss.hw * 2 * (boss.hp / boss.max), 0.7);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#737373';
      for (n = 0; n < sparks.length; n++) {
        s = sparks[n];
        if (!s.on || s.kind) continue;
        ctx.globalAlpha = s.life / s.max;
        ctx.fillRect(s.x, s.y, dot * 1.4, dot * 1.4);
      }
      ctx.fillStyle = '#fff';
      for (n = 0; n < sparks.length; n++) {
        s = sparks[n];
        if (!s.on || !s.kind) continue;
        ctx.globalAlpha = s.life / s.max;
        if (Math.abs(s.vx) >= Math.abs(s.vy)) ctx.fillRect(s.x, s.y, Math.min(7, Math.abs(s.vx) * 0.08) + dot, dot);
        else ctx.fillRect(s.x, s.y, dot, Math.min(7, Math.abs(s.vy) * 0.08) + dot);
      }
      ctx.globalAlpha = 1;
      if (playing && shield > 0) {
        pulse = 7.4 + Math.sin(time * 0.012) * 0.4;
        ctx.strokeStyle = '#fff';
        ctx.globalAlpha = shieldFlash > 0 ? 0.95 : 0.5;
        ring(ctx, px, py, pulse);
        ctx.globalAlpha = 0.28;
        ring(ctx, px, py, pulse + 1.4);
        ctx.globalAlpha = 1;
      }
      if (playing && morph > 0) {
        u = 1 - morph / 640;
        ctx.globalAlpha = 1 - u;
        ctx.strokeStyle = '#fff';
        ring(ctx, px, py, 2 + u * 16);
        ctx.beginPath();
        ctx.moveTo(px - 3 - u * 4, py + 1);
        ctx.lineTo(px, py - 3 - u * 5);
        ctx.lineTo(px + 3 + u * 4, py + 1);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (playing && !(iframe > 80 && ((iframe / 90) & 1) === 0)) {
        ctx.fillStyle = '#fff';
        drawLines(ctx, 'h' + hull, px, py, 20, 22);
      }
    }

    function prepare(u) {
      if (u > 0) unit = u;
    }

    function hot() {
      var n;
      if (morph > 0 || shake > 0) return true;
      for (n = 0; n < sparks.length; n++) if (sparks[n].on) return true;
      for (n = 0; n < rings.length; n++) if (rings[n].on) return true;
      return false;
    }

    return {
      reset: reset,
      setRank: setRank,
      update: update,
      paint: paint,
      prepare: prepare,
      setX: setX,
      aim: aim,
      nudge: nudge,
      hot: hot,
      W: W,
      H: H,
      get score() { return score; },
      get lives() { return lives; },
      get hp() { return hp < 0 ? 0 : hp; },
      get maxHp() { return maxHp; },
      get over() { return over; },
      get won() { return won; },
      get playing() { return playing; },
      get stage() { return stage; },
      get hull() { return hull; },
      get gun() { return gun; },
      get boss() { return boss.on; },
      get hurt() { return hurt; },
      get shield() { return shield; }
    };
  }

  function blankFoe() {
    return {
      on: false, x: 0, y: 0, vx: 0, vy: 0, kind: 0, hp: 1, max: 1,
      cool: 0, hw: 3, hh: 4, t: 0, mode: 0
    };
  }

  function blankShot() {
    return {
      on: false, x: 0, y: 0, vx: 0, vy: 0, dmg: 1, shape: 0,
      face: 1, hw: 1, hh: 2, sc: 1.6, bad: false, tier: 1, sprite: ''
    };
  }

  root.ArcadeStar = { create: create, viewW: W, viewH: H };
})(typeof window !== 'undefined' ? window : globalThis);
