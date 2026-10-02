(function () {
  var KEY = 'yl-health-v1';
  var COLORS = ['#0A84FF', '#30A14E', '#E68600', '#FF375F', '#5E5CE6', '#BF5AF2', '#0E8A8A', '#E05A3A'];
  var RANGE_MS = { '7d': 7 * 864e5, '30d': 30 * 864e5, '6m': 180 * 864e5, '90d': 90 * 864e5, '1y': 365 * 864e5, all: Infinity };
  var RANGES = [
    ['7d', '周'],
    ['30d', '月'],
    ['6m', '半年'],
    ['1y', '年'],
    ['all', '全部']
  ];

  var state = {
    data: emptyData(),
    index: new Map(),
    sheet: null,
    broken: null,
    storageError: false,
    range: '30d',
    rangeMetric: null,
    rangeTouched: false,
    routeKey: '',
    viewLogs: [],
    focusPlot: null,
    opener: null,
    focusId: null,
    query: '',
    dropped: 0,
    recoverRaw: null,
    longView: 'overview'
  };

  function emptyData() {
    return { v: 1, metrics: [], logs: [], lastMetricId: null };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function uid(prefix) {
    var c = globalThis.crypto;
    if (c && c.getRandomValues) {
      var bytes = new Uint8Array(6);
      c.getRandomValues(bytes);
      var hex = '';
      for (var i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
      return prefix + hex;
    }
    return prefix + Math.random().toString(16).slice(2, 14);
  }

  function parseNum(s) {
    var t = String(s == null ? '' : s).trim().replace(/\s/g, '').replace(/，/g, ',');
    if (!t) return null;
    if (t.indexOf(',') !== -1 && t.indexOf('.') === -1) t = t.replace(',', '.');
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(t)) return null;
    var n = Number(t);
    if (!Number.isFinite(n) || Math.abs(n) > 1e9) return null;
    return n;
  }

  function parseOptional(raw) {
    var t = String(raw == null ? '' : raw).trim();
    if (!t) return { ok: true, value: null };
    var n = parseNum(t);
    if (n == null) return { ok: false, value: null };
    return { ok: true, value: n };
  }

  function formatNum(n) {
    if (!Number.isFinite(n)) return '—';
    var rounded = Math.round(n * 1000) / 1000;
    if (rounded === 0) return '0';
    return String(rounded);
  }

  function rawNum(n) {
    if (!Number.isFinite(n)) return '';
    var s = String(n);
    return s.length > 16 ? formatNum(n) : s;
  }

  function startOfDay(ts) {
    var d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function formatWhen(ts, withTime, now) {
    if (withTime == null) withTime = true;
    if (now == null) now = Date.now();
    var d = new Date(ts);
    if (!Number.isFinite(d.getTime())) return '';
    var diff = Math.round((startOfDay(now) - startOfDay(ts)) / 864e5);
    var hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    var dayLabel;
    if (diff === 0) dayLabel = '今天';
    else if (diff === 1) dayLabel = '昨天';
    else if (diff === 2) dayLabel = '前天';
    else if (d.getFullYear() === new Date(now).getFullYear()) dayLabel = (d.getMonth() + 1) + '月' + d.getDate() + '日';
    else dayLabel = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return withTime ? dayLabel + ' ' + hm : dayLabel;
  }

  function toLocalInput(ts) {
    var d = new Date(ts);
    if (!Number.isFinite(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function isHex(c) {
    return typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c);
  }

  function safeColor(c) {
    return isHex(c) ? c : COLORS[0];
  }

  function pickColor() {
    var counts = {};
    COLORS.forEach(function (c) { counts[c] = 0; });
    state.data.metrics.forEach(function (m) {
      var c = safeColor(m.color);
      counts[c] = (counts[c] || 0) + 1;
    });
    var best = COLORS[0];
    var bestN = Infinity;
    COLORS.forEach(function (c) {
      if (counts[c] < bestN) { bestN = counts[c]; best = c; }
    });
    return best;
  }

  function sampleData(now) {
    var weightId = 'msampleweight';
    var heartId = 'msampleheart1';
    var origin = startOfDay(now);
    var logs = [];
    for (var i = 0; i < 16; i++) {
      var value = Math.round((63.6 - i * 0.07 + Math.sin(i * 0.85) * 0.28) * 10) / 10;
      var hr = Math.round(61 + Math.sin(i * 0.7) * 6 + (i === 15 ? 16 : 0));
      var at = origin - (15 - i) * 864e5;
      logs.push({ id: 'lsamplew' + (i < 10 ? '0' : '') + i, metricId: weightId, value: value, at: at + 8 * 3600000 });
      logs.push({ id: 'lsampleh' + (i < 10 ? '0' : '') + i, metricId: heartId, value: hr, at: at + 9 * 3600000 });
    }
    return {
      v: 1,
      metrics: [
        { id: weightId, name: '体重', unit: 'kg', low: 58, high: 72, color: '#0A84FF', createdAt: origin - 15 * 864e5, sample: true },
        { id: heartId, name: '心率', unit: '次/分', low: 50, high: 70, color: '#FF2D55', createdAt: origin - 15 * 864e5, sample: true }
      ],
      logs: logs,
      lastMetricId: heartId
    };
  }

  function statusOf(metric, value) {
    var low = metric.low;
    var high = metric.high;
    if (low == null && high == null) return { key: 'none', label: '未设范围' };
    if (low != null && value < low) return { key: 'low', label: '低于标准' };
    if (high != null && value > high) return { key: 'high', label: '高于标准' };
    return { key: 'ok', label: '范围内' };
  }

  function rangeLabel(metric) {
    var unit = metric.unit ? ' ' + metric.unit : '';
    if (metric.low != null && metric.high != null) return '标准 ' + formatNum(metric.low) + '–' + formatNum(metric.high) + unit;
    if (metric.low != null) return '不低于 ' + formatNum(metric.low) + unit;
    if (metric.high != null) return '不高于 ' + formatNum(metric.high) + unit;
    return '还没有标准范围';
  }

  function deltaText(curr, prev) {
    if (!Number.isFinite(prev)) return '';
    var d = curr - prev;
    if (Math.abs(d) < 0.0005) return '与上次持平';
    return '较上次 ' + (d > 0 ? '+' : '−') + formatNum(Math.abs(d));
  }

  function parseStoredNumber(v) {
    if (typeof v === 'number') {
      if (!Number.isFinite(v) || Math.abs(v) > 1e9) return null;
      return v;
    }
    if (typeof v === 'string') return parseNum(v);
    return null;
  }

  function validId(id) {
    return typeof id === 'string' && /^[A-Za-z0-9_-]{4,40}$/.test(id);
  }

  function sanitize(input) {
    var data = emptyData();
    var dropped = 0;
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { data: data, dropped: 1 };
    var srcMetrics = Array.isArray(input.metrics) ? input.metrics : [];
    var srcLogs = Array.isArray(input.logs) ? input.logs : [];
    var seen = new Set();
    srcMetrics.forEach(function (m, i) {
      if (!m || typeof m !== 'object') { dropped++; return; }
      var name = typeof m.name === 'string' ? m.name.trim().slice(0, 20) : '';
      if (!name) { dropped++; return; }
      var id = validId(m.id) ? m.id : uid('m');
      if (seen.has(id)) id = uid('m');
      seen.add(id);
      var low = m.low == null || m.low === '' ? null : parseStoredNumber(m.low);
      var high = m.high == null || m.high === '' ? null : parseStoredNumber(m.high);
      if (low != null && high != null && low > high) {
        var swap = low;
        low = high;
        high = swap;
      }
      data.metrics.push({
        id: id,
        name: name,
        unit: typeof m.unit === 'string' ? m.unit.trim().slice(0, 12) : '',
        low: low,
        high: high,
        color: isHex(m.color) ? m.color : COLORS[i % COLORS.length],
        createdAt: Number.isFinite(m.createdAt) ? m.createdAt : Date.now(),
        sample: m.sample === true
      });
    });
    var metricIds = new Set(data.metrics.map(function (m) { return m.id; }));
    var logIds = new Set();
    srcLogs.forEach(function (log) {
      if (!log || typeof log !== 'object' || !metricIds.has(log.metricId)) { dropped++; return; }
      var value = parseStoredNumber(log.value);
      var at = typeof log.at === 'number' ? log.at : Number(log.at);
      if (value == null || !Number.isFinite(at) || at < 0 || at > Date.UTC(2100, 0, 1)) { dropped++; return; }
      var id = validId(log.id) ? log.id : uid('l');
      if (logIds.has(id)) id = uid('l');
      logIds.add(id);
      data.logs.push({ id: id, metricId: log.metricId, value: value, at: at });
    });
    if (typeof input.lastMetricId === 'string' && metricIds.has(input.lastMetricId)) data.lastMetricId = input.lastMetricId;
    return { data: data, dropped: dropped };
  }

  function loadFrom(raw, storageFailed) {
    if (storageFailed) return { data: emptyData(), broken: null, storageError: true, dropped: 0 };
    if (!raw) return { data: emptyData(), broken: null, storageError: false, dropped: 0 };
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || (!Array.isArray(parsed.metrics) && !Array.isArray(parsed.logs))) {
        return { data: emptyData(), broken: raw, storageError: false, dropped: 0 };
      }
      var cleaned = sanitize(parsed);
      return { data: cleaned.data, broken: null, storageError: false, dropped: cleaned.dropped };
    } catch (e) {
      return { data: emptyData(), broken: raw, storageError: false, dropped: 0 };
    }
  }

  function load() {
    var raw = null;
    var failed = false;
    try { raw = localStorage.getItem(KEY); } catch (e) { failed = true; }
    var result = loadFrom(raw, failed);
    state.data = result.data;
    state.broken = result.broken;
    state.storageError = result.storageError;
    state.dropped = result.dropped || 0;
    state.recoverRaw = state.dropped > 0 ? raw : null;
  }

  function persist() {
    if (state.broken) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify(state.data));
      state.storageError = false;
      state.dropped = 0;
      state.recoverRaw = null;
      return true;
    } catch (e) {
      state.storageError = true;
      return false;
    }
  }

  function indexLogs(data) {
    var map = new Map();
    data.metrics.forEach(function (m) { map.set(m.id, []); });
    data.logs.forEach(function (log) {
      if (!map.has(log.metricId)) return;
      map.get(log.metricId).push(log);
    });
    map.forEach(function (arr) {
      arr.sort(function (a, b) { return a.at - b.at || (a.id < b.id ? -1 : 1); });
    });
    return map;
  }

  function refreshIndex() {
    state.index = indexLogs(state.data);
  }

  function latestOf(id) {
    var arr = state.index && state.index.get(id);
    return arr && arr.length ? arr[arr.length - 1] : null;
  }

  function previousLog(metricId, logId) {
    var arr = (state.index && state.index.get(metricId)) || [];
    var i = arr.findIndex(function (l) { return l.id === logId; });
    return i > 0 ? arr[i - 1] : null;
  }

  function orderedMetrics() {
    return state.data.metrics.slice().sort(function (a, b) {
      var la = latestOf(a.id);
      var lb = latestOf(b.id);
      var ta = la ? la.at : a.createdAt || 0;
      var tb = lb ? lb.at : b.createdAt || 0;
      return tb - ta;
    });
  }

  function logsInRange(logs, range, now) {
    var ms = RANGE_MS[range] == null ? Infinity : RANGE_MS[range];
    if (range === 'all' || !Number.isFinite(ms)) return logs.slice();
    var start = now - ms;
    return logs.filter(function (l) { return l.at >= start; });
  }

  function pickRange(logs, now) {
    if (now == null) now = Date.now();
    if (!logs.length) return '30d';
    if (logsInRange(logs, '30d', now).length) return '30d';
    if (logsInRange(logs, '6m', now).length) return '6m';
    if (logsInRange(logs, '1y', now).length) return '1y';
    return 'all';
  }

  function withinPct(metric, logs) {
    if (metric.low == null && metric.high == null) return null;
    if (!logs.length) return null;
    var n = logs.filter(function (l) { return statusOf(metric, l.value).key === 'ok'; }).length;
    return Math.round((n / logs.length) * 100);
  }

  function r1(n) {
    var v = Math.round(n * 10) / 10;
    return v === 0 ? 0 : v;
  }

  function niceStep(span) {
    var rough = span / 3;
    if (!(rough > 0)) return 1;
    var pow = Math.pow(10, Math.floor(Math.log10(rough)));
    var err = rough / pow;
    var nice = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    return nice * pow;
  }

  function tickValues(min, max) {
    var step = niceStep(max - min);
    if (!Number.isFinite(step) || step <= 0) return [min, max];
    var start = Math.ceil((min - step * 1e-8) / step) * step;
    var out = [];
    for (var i = 0; i < 6; i++) {
      var v = start + i * step;
      if (v > max + step * 1e-6) break;
      if (v >= min - step * 1e-6) out.push(v);
    }
    if (out.length < 2) return [min, (min + max) / 2, max];
    return out;
  }

  function yDomain(values, metric) {
    var dMin = Math.min.apply(null, values);
    var dMax = Math.max.apply(null, values);
    var mid = (dMin + dMax) / 2;
    var dataSpan = Math.max(dMax - dMin, Math.abs(mid) * 0.02, 0.5);
    var yMin = dMin;
    var yMax = dMax;
    if (!(yMax > yMin)) {
      yMin -= dataSpan;
      yMax += dataSpan;
    }
    var padY = (yMax - yMin) * 0.14;
    yMin -= padY;
    yMax += padY;
    var band = 'none';
    var low = metric && metric.low != null ? metric.low : null;
    var high = metric && metric.high != null ? metric.high : null;
    if (low != null || high != null) {
      var lowIn = low != null && low >= yMin && low <= yMax;
      var highIn = high != null && high >= yMin && high <= yMax;
      if (low != null && high != null && lowIn && highIn) band = 'area';
      else if (lowIn || highIn) band = 'line';
      else band = 'far';
    }
    return { yMin: yMin, yMax: yMax, band: band };
  }

  function downsample(points, max) {
    if (points.length <= max) return points.slice();
    var bucketCount = Math.floor(max / 2);
    var size = points.length / bucketCount;
    var out = [];
    var seen = new Set();
    function push(p) {
      if (!p || seen.has(p.id)) return;
      seen.add(p.id);
      out.push(p);
    }
    for (var i = 0; i < bucketCount; i++) {
      var start = Math.floor(i * size);
      var end = Math.max(Math.floor((i + 1) * size), start + 1);
      var slice = points.slice(start, end);
      if (!slice.length) continue;
      var lo = slice[0];
      var hi = slice[0];
      for (var j = 0; j < slice.length; j++) {
        if (slice[j].value < lo.value) lo = slice[j];
        if (slice[j].value > hi.value) hi = slice[j];
      }
      if (lo.at <= hi.at) { push(lo); push(hi); }
      else { push(hi); push(lo); }
    }
    push(points[0]);
    push(points[points.length - 1]);
    out.sort(function (a, b) { return a.at - b.at || (a.id < b.id ? -1 : 1); });
    return out;
  }

  var gradSeq = 0;

  function axisLabel(ts, sameDay, now) {
    var d = new Date(ts);
    if (sameDay) return pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (d.getFullYear() === new Date(now).getFullYear()) return (d.getMonth() + 1) + '/' + d.getDate();
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  }

  function buildChart(metric, logs, cssWidth, now, cssHeight) {
    if (now == null) now = Date.now();
    var sorted = logs.slice().sort(function (a, b) { return a.at - b.at || (a.id < b.id ? -1 : 1); });
    if (!sorted.length) {
      return { html: '', band: 'none', points: [] };
    }
    var domain = yDomain(sorted.map(function (l) { return l.value; }), metric);
    var yMin = domain.yMin;
    var yMax = domain.yMax;
    var ticks = tickValues(yMin, yMax);
    var labels = ticks.map(formatNum);
    var padL = Math.max(40, Math.ceil(Math.max.apply(null, labels.map(function (t) { return t.length; })) * 7.2) + 14);
    var width = Math.max(260, Math.round(cssWidth || 320));
    var height = Math.max(160, Math.round(cssHeight || 228));
    var pad = { l: padL, r: 18, t: 16, b: 26 };
    var innerW = Math.max(20, width - pad.l - pad.r);
    var innerH = height - pad.t - pad.b;
    var plotted = downsample(sorted, 240);
    var t0 = sorted[0].at;
    var t1 = sorted[sorted.length - 1].at;
    var prevX = -Infinity;
    var coords = plotted.map(function (log) {
      var x = t1 === t0 ? pad.l + innerW / 2 : pad.l + ((log.at - t0) / (t1 - t0)) * innerW;
      if (x <= prevX) x = prevX + 0.75;
      prevX = x;
      var y = pad.t + (1 - (log.value - yMin) / (yMax - yMin)) * innerH;
      return { log: log, x: x, y: y };
    });
    function yOf(v) {
      return pad.t + (1 - (v - yMin) / (yMax - yMin)) * innerH;
    }
    var grid = ticks.map(function (v, idx) {
      var y = yOf(v);
      return '<line class="grid" x1="' + pad.l + '" x2="' + (width - pad.r) + '" y1="' + r1(y) + '" y2="' + r1(y) + '"></line>' +
        '<text class="tick" x="' + (pad.l - 8) + '" y="' + r1(y) + '" text-anchor="end" dominant-baseline="middle">' + esc(labels[idx]) + '</text>';
    }).join('');
    var bandSvg = '';
    if (domain.band === 'area' || domain.band === 'line') {
      if (domain.band === 'area') {
        var yTop = Math.min(yOf(metric.high), yOf(metric.low));
        var yBot = Math.max(yOf(metric.high), yOf(metric.low));
        var clampedTop = Math.max(pad.t, Math.min(pad.t + innerH, yTop));
        var clampedBot = Math.max(pad.t, Math.min(pad.t + innerH, yBot));
        bandSvg += '<rect class="band" x="' + pad.l + '" y="' + r1(clampedTop) + '" width="' + innerW + '" height="' + r1(Math.max(1, clampedBot - clampedTop)) + '"></rect>';
      }
      if (metric.high != null && metric.high >= yMin && metric.high <= yMax) {
        bandSvg += '<line class="band-line" x1="' + pad.l + '" x2="' + (pad.l + innerW) + '" y1="' + r1(yOf(metric.high)) + '" y2="' + r1(yOf(metric.high)) + '"></line>';
      }
      if (metric.low != null && metric.low >= yMin && metric.low <= yMax) {
        bandSvg += '<line class="band-line" x1="' + pad.l + '" x2="' + (pad.l + innerW) + '" y1="' + r1(yOf(metric.low)) + '" y2="' + r1(yOf(metric.low)) + '"></line>';
      }
    }
    var line = coords.map(function (p, i) { return (i ? 'L' : 'M') + r1(p.x) + ' ' + r1(p.y); }).join(' ');
    var area = '';
    if (coords.length > 1) {
      var base = pad.t + innerH;
      area = line + ' L' + r1(coords[coords.length - 1].x) + ' ' + r1(base) + ' L' + r1(coords[0].x) + ' ' + r1(base) + ' Z';
    }
    var gid = 'hg' + (++gradSeq);
    var dots = coords.filter(function (p, i) {
      return coords.length <= 24 || i === coords.length - 1;
    }).map(function (p) {
      return '<circle class="dot" cx="' + r1(p.x) + '" cy="' + r1(p.y) + '" r="3.2" stroke="var(--c)"></circle>';
    }).join('');
    var sameDay = startOfDay(sorted[0].at) === startOfDay(sorted[sorted.length - 1].at);
    var xLabels = sorted.length === 1
      ? '<text class="tick" text-anchor="middle" x="' + r1(coords[0].x) + '" y="' + (height - 8) + '">' + esc(axisLabel(sorted[0].at, true, now)) + '</text>'
      : '<text class="tick" x="' + pad.l + '" y="' + (height - 8) + '">' + esc(axisLabel(sorted[0].at, sameDay, now)) + '</text>' +
        '<text class="tick" x="' + (width - pad.r) + '" y="' + (height - 8) + '" text-anchor="end">' + esc(axisLabel(sorted[sorted.length - 1].at, sameDay, now)) + '</text>';
    var vals = sorted.map(function (l) { return l.value; });
    var aria = '趋势折线图，最低 ' + formatNum(Math.min.apply(null, vals)) + '，最高 ' + formatNum(Math.max.apply(null, vals));
    var html = '<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="100%" role="img" aria-label="' + esc(aria) + '">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + safeColor(metric.color) + '" stop-opacity="0.28"></stop>' +
      '<stop offset="100%" stop-color="' + safeColor(metric.color) + '" stop-opacity="0"></stop>' +
      '</linearGradient></defs>' +
      grid + bandSvg +
      (area ? '<path class="area" d="' + area + '" fill="url(#' + gid + ')"></path>' : '') +
      (coords.length > 1 ? '<path class="trend" pathLength="1" d="' + line + '" fill="none" stroke="' + safeColor(metric.color) + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>' : '') +
      dots +
      '<g class="scrub" visibility="hidden"><line class="scrub-line" y1="' + pad.t + '" y2="' + (pad.t + innerH) + '"></line><circle class="scrub-dot" r="5.5"></circle></g>' +
      xLabels +
      '</svg>';
    return {
      html: html,
      band: domain.band,
      points: coords.map(function (p) {
        return { id: p.log.id, x: p.x, y: p.y, value: p.log.value, at: p.log.at };
      })
    };
  }

  function sparkSVG(logs, color, box) {
    var wide = !!(box && box.wide);
    var pts = wide ? logs.slice() : logs.slice(-20);
    if (wide && pts.length > 240) pts = downsample(logs, 240);
    if (!pts.length) return '';
    var w = wide ? 640 : 112;
    var h = wide ? 208 : 48;
    var p = wide ? 16 : 5;
    var vals = pts.map(function (item) { return item.value; });
    var min = Math.min.apply(null, vals);
    var max = Math.max.apply(null, vals);
    var span = max - min;
    if (span === 0) span = Math.max(Math.abs(max) * 0.08, 1);
    min -= span * 0.35;
    max += span * 0.35;
    var coords = pts.map(function (item, i) {
      var x = pts.length === 1 ? w / 2 : p + (i / (pts.length - 1)) * (w - p * 2);
      var y = p + (1 - (item.value - min) / (max - min)) * (h - p * 2);
      return [x, y];
    });
    var d = coords.map(function (c, i) { return (i ? 'L' : 'M') + r1(c[0]) + ' ' + r1(c[1]); }).join(' ');
    var last = coords[coords.length - 1];
    var base = h - (wide ? 8 : 1);
    var area = coords.length > 1 ? d + ' L' + r1(last[0]) + ' ' + base + ' L' + r1(coords[0][0]) + ' ' + base + ' Z' : '';
    var size = wide ? 'width="100%" height="auto"' : 'width="' + w + '" height="' + h + '"';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" ' + size + ' aria-hidden="true">' +
      (area ? '<path d="' + area + '" fill="' + color + '" opacity="' + (wide ? '0.12' : '0.16') + '"></path>' : '') +
      (coords.length > 1 ? '<path class="spark-line" pathLength="1" d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + (wide ? '2.5' : '2') + '" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"></path>' : '') +
      '<circle cx="' + r1(last[0]) + '" cy="' + r1(last[1]) + '" r="' + (wide ? '4' : '2.6') + '" fill="' + color + '"></circle></svg>';
  }

  function icon(name) {
    var body = {
      plus: '<path d="M12 5v14M5 12h14"/>',
      back: '<path d="M14.5 6.5 8 12l6.5 5.5"/>',
      more: '<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
      chev: '<path d="M9.5 7.5 14 12l-4.5 4.5"/>',
      line: '<path d="M4 16.5 9 10.5l3.2 2.8L20 6"/>',
      search: '<circle cx="11" cy="11" r="6.2"/><path d="m16 16 4 4"/>'
    }[name];
    var cls = name === 'chev' ? ' class="chev"' : '';
    return '<svg' + cls + ' viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="' + (name === 'more' ? '0' : '1.8') + '" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }

  function illo() {
    return '<svg class="illo" viewBox="0 0 120 96" aria-hidden="true"><rect class="illo-bg" x="18" y="16" width="84" height="64" rx="18"></rect><path class="illo-line" d="M32 62l16-14 12 8 22-24"></path><circle cx="82" cy="32" r="3.5" fill="#E07A5F"></circle></svg>';
  }

  function currentRoute() {
    var m = /^#m\/([A-Za-z0-9_-]+)$/.exec(location.hash);
    if (m) return { name: 'detail', id: m[1] };
    if (location.hash === '#browse') return { name: 'browse' };
    return { name: 'home' };
  }

  function metricById(id) {
    return state.data.metrics.find(function (m) { return m.id === id; }) || null;
  }

  function bannerHTML() {
    if (state.broken) {
      return '<div class="notice warn"><p>这份浏览器里的旧数据读不出来。先别记新的，以免把它盖掉。</p><div class="notice-actions"><button type="button" data-act="download-raw">下载原始数据</button><button type="button" data-act="reset-storage">清空并重来</button></div></div>';
    }
    var html = '';
    if (state.dropped > 0) {
      html += '<div class="notice warn"><p>有 ' + state.dropped + ' 条没读出来。下次保存会去掉它们，可以先下载原始数据。</p><div class="notice-actions"><button type="button" data-act="download-raw">下载原始数据</button></div></div>';
    }
    if (state.storageError) html += '<div class="notice warn"><p>当前浏览器存不了数据，离开页面后记录会消失。</p></div>';
    return html;
  }

  function rangeNotice() {
    var names = [];
    orderedMetrics().forEach(function (m) {
      var last = latestOf(m.id);
      if (!last) return;
      var key = statusOf(m, last.value).key;
      if (key === 'high' || key === 'low') names.push(m.name);
    });
    if (!names.length) return '';
    var text = names.length === 1
      ? names[0] + '最近一次超出了你定的范围'
      : names.length === 2
        ? names[0] + '、' + names[1] + '最近一次超出了你定的范围'
        : '有 ' + names.length + ' 项最近超出了你定的范围';
    return '<div class="notice">' + esc(text) + '</div>';
  }

  function todayLine(now) {
    var start = startOfDay(now);
    var n = state.data.logs.filter(function (l) { return l.at >= start && l.at < start + 864e5; }).length;
    if (!n) return '今天还没有记录';
    return '今天记了 ' + n + ' 笔';
  }

  function cardHTML(metric) {
    var logs = state.index.get(metric.id) || [];
    var latest = logs.length ? logs[logs.length - 1] : null;
    var color = safeColor(metric.color);
    var sub;
    if (!latest) sub = '<div class="sub st-none">还没有记录</div>';
    else {
      var st = statusOf(metric, latest.value);
      var prev = previousLog(metric.id, latest.id);
      var delta = prev ? deltaText(latest.value, prev.value) : '';
      sub = '<div class="sub"><span class="st-' + st.key + '">' + st.label + '</span>' +
        (delta ? '<span class="delta"> · ' + esc(delta) + '</span>' : '') + '</div>';
    }
    var label = metric.name + (latest ? '，' + formatNum(latest.value) + (metric.unit ? metric.unit : '') : '，还没有记录');
    return '<button type="button" class="card" data-act="open" data-id="' + metric.id + '" aria-label="' + esc(label) + '">' +
      '<div class="card-top"><span class="badge" style="--c:' + color + ';background:' + color + '2E"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 11.5 4.8 7.8l2.4 2.1L14.5 3.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg></span><span class="name">' + esc(metric.name) + '</span>' +
      (latest ? '<span class="when-sm">' + esc(formatWhen(latest.at)) + '</span>' : '') + '</div>' +
      '<div class="card-main"><div class="line"><span class="num">' + (latest ? esc(formatNum(latest.value)) : '—') + '</span>' +
      (metric.unit ? '<span class="unit">' + esc(metric.unit) + '</span>' : '') + '</div>' + sub + '</div>' +
      '<div class="spark">' + (latest ? sparkSVG(logs, color) : '') + '</div></button>';
  }

  function tabIcon(name) {
    if (name === 'heart') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 20.2s-6.6-4.1-6.6-8.4A3.7 3.7 0 0 1 12 8.6a3.7 3.7 0 0 1 6.6 3.2c0 4.3-6.6 8.4-6.6 8.4z"/></svg>';
    if (name === 'spark') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 4.2v15.6M5.4 7.8l13.2 8.4M18.6 7.8 5.4 16.2"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z"/></svg>';
  }

  function tabbarHTML(active) {
    function item(tab, label, svg) {
      return '<button type="button" data-act="tab" data-tab="' + tab + '" aria-selected="' + (active === tab ? 'true' : 'false') + '">' + svg + '<span>' + label + '</span></button>';
    }
    var on = active === 'browse' ? 'browse' : 'home';
    return '<div class="tab-fade" aria-hidden="true"></div><nav class="tabbar" data-on="' + on + '" aria-label="健康"><span class="tab-pill"></span>' +
      item('home', '洞察', tabIcon('heart')) +
      item('browse', '浏览', tabIcon('grid')) + '</nav>';
  }

  function storyFor(metric) {
    var last = latestOf(metric.id);
    if (!last) return { title: metric.name + '还没有记录', body: '记下第一笔之后，这里会画出变化。' };
    var prev = previousLog(metric.id, last.id);
    var delta = prev ? deltaText(last.value, prev.value) : '';
    var value = formatNum(last.value) + (metric.unit ? ' ' + metric.unit : '');
    var flat = !delta || delta.indexOf('持平') !== -1;
    var title = flat ? metric.name + '和上次一样' : metric.name + (delta.indexOf('+') !== -1 ? '较上次升高' : '较上次降低');
    if (!prev) title = metric.name;
    var body = '最近一次是 ' + value + '，记于' + formatWhen(last.at) + (delta ? '，' + delta : '') + '。';
    return { title: title, body: body };
  }

  function metricChip(metric, selected) {
    var last = latestOf(metric.id);
    var color = safeColor(metric.color);
    var sub = last ? formatNum(last.value) + (metric.unit ? ' ' + metric.unit : '') : '无记录';
    return '<button type="button" class="mchip" data-act="focus" data-id="' + metric.id + '" aria-selected="' + (selected ? 'true' : 'false') + '">' +
      '<span class="mchip-ico" style="background:' + color + '">' + icon('line') + '</span>' +
      '<span class="mchip-txt"><b>' + esc(metric.name) + '</b><span>' + esc(sub) + '</span></span></button>';
  }

  function chipRow(metrics, focus) {
    var todayOn = !focus;
    var today = '<button type="button" class="mchip" data-act="focus" aria-selected="' + (todayOn ? 'true' : 'false') + '">' +
      '<span class="mchip-ico" style="background:#FF2D55">' + tabIcon('heart') + '</span>' +
      '<span class="mchip-txt"><b>今天</b><span>' + esc(todayLine(Date.now())) + '</span></span></button>';
    return '<div class="chipbar"><div class="mchips">' + today + metrics.map(function (m) {
      return metricChip(m, focus && focus.id === m.id);
    }).join('') + '</div><button type="button" class="mchip-add" data-act="add" data-fresh="1" aria-label="新建指标">' + icon('plus') + '<span>新建</span></button></div>';
  }

  function insightCard(metric) {
    var logs = state.index.get(metric.id) || [];
    var latest = logs.length ? logs[logs.length - 1] : null;
    var color = safeColor(metric.color);
    var note = '记下第一笔之后会出现在这里';
    var flag = '';
    if (latest) {
      var prev = previousLog(metric.id, latest.id);
      var delta = prev ? deltaText(latest.value, prev.value) : '';
      var st = statusOf(metric, latest.value);
      if (st.key === 'high' || st.key === 'low') flag = '<span class="flag st-' + st.key + '">' + esc(st.label) + '</span>';
      note = formatWhen(latest.at) + (delta ? ' · ' + delta : '');
    }
    return '<button type="button" class="insight" data-act="open" data-id="' + metric.id + '">' +
      '<div class="insight-top"><span class="mark" style="color:' + color + ';background:' + color + '1F">' + icon('line') + '</span><span class="insight-name">' + esc(metric.name) + '</span>' + flag + '</div>' +
      '<div class="insight-mid"><div class="insight-val"><b>' + (latest ? esc(formatNum(latest.value)) : '—') + '</b>' +
      (metric.unit ? '<span>' + esc(metric.unit) + '</span>' : '') + '</div>' +
      '<span class="spark">' + (logs.length ? sparkSVG(logs, color) : '') + '</span></div>' +
      '<p class="insight-note">' + esc(note) + '</p></button>';
  }

  function briefStats(logs) {
    if (logs.length < 2) return '';
    var vals = logs.map(function (l) { return l.value; });
    var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    function cell(n, label) {
      return '<div><b>' + esc(formatNum(Math.round(n * 10) / 10)) + '</b><span>' + label + '</span></div>';
    }
    return '<div class="mini-stats">' + cell(avg, '平均') + cell(Math.min.apply(null, vals), '最低') + cell(Math.max.apply(null, vals), '最高') + '</div>';
  }

  function focusHTML(metric) {
    var story = storyFor(metric);
    var last = latestOf(metric.id);
    var logs = state.index.get(metric.id) || [];
    var color = safeColor(metric.color);
    var chart = logs.length
      ? '<section class="panel spark-panel"><div class="spark-lg">' + sparkSVG(logs, color, { wide: true }) + '</div>' + briefStats(logs) +
        '<button type="button" class="more-logs" data-act="open" data-id="' + metric.id + '">查看全部记录</button></section>'
      : '<button type="button" class="more-logs" data-act="open" data-id="' + metric.id + '">查看全部记录</button>';
    return '<div class="focus-block" style="--c:' + color + '"><div class="focus-hero"><p class="focus-num"><b>' +
      (last ? esc(formatNum(last.value)) : '—') + '</b>' +
      (metric.unit ? '<span>' + esc(metric.unit) + '</span>' : '') + '</p></div>' +
      '<div class="story"><h2>' + esc(story.title) + '</h2><p>' + esc(story.body) + '</p></div>' +
      chart + '</div>';
  }

  function feedHTML(metrics) {
    return '<div class="feed">' + metrics.map(insightCard).join('') + '</div>';
  }

  function emptyHTML() {
    var story = state.broken
      ? '<div class="story"><h2>先处理旧数据</h2><p>这份记录读不出来。下载或清空之后，才能继续记。</p></div>'
      : '<div class="story"><h2>还没有记录</h2><p>记下任何你想看着的数字。</p></div>';
    var action = state.broken ? '' : '<button type="button" class="fill" data-act="add">记一笔</button>';
    return '<div class="page">' + bannerHTML() + '<div class="empty">' + illo() + story + action + '</div>' +
      tabbarHTML('home') + '</div>';
  }

  function homeHTML() {
    var metrics = orderedMetrics();
    if (!metrics.length) return emptyHTML();
    var focus = state.focusId ? metricById(state.focusId) : null;
    if (state.focusId && !focus) state.focusId = null;
    return '<div class="page">' + bannerHTML() + chipRow(metrics, focus) +
      (focus ? focusHTML(focus) : feedHTML(metrics)) +
      tabbarHTML('home') + '</div>';
  }

  function browseHTML() {
    var metrics = orderedMetrics();
    var q = state.query || '';
    var text = q.trim().toLowerCase();
    var matched = 0;
    var tiles = metrics.map(function (m) {
      var last = latestOf(m.id);
      var color = safeColor(m.color);
      var hide = !!text && m.name.toLowerCase().indexOf(text) === -1;
      if (!hide) matched++;
      return '<button type="button" class="tile" data-act="open" data-id="' + m.id + '"' + (hide ? ' hidden' : '') + '>' +
        '<span class="tile-icon" style="background:' + color + '">' + icon('line') + '</span>' +
        '<span class="tile-name">' + esc(m.name) + '</span>' +
        '<span class="tile-val"><b>' + (last ? esc(formatNum(last.value)) : '—') + '</b>' +
        (m.unit ? '<small>' + esc(m.unit) + '</small>' : '') + '</span></button>';
    }).join('');
    var body = metrics.length
      ? '<div class="browse">' + tiles + '</div><p id="browseEmpty" class="muted pad"' + (text && !matched ? '' : ' hidden') + '>没有匹配的指标</p>'
      : '<p class="muted pad">还没有指标。先在洞察里新建一个。</p>';
    return '<div class="page">' + bannerHTML() + '<div class="browse-bar"><label class="search">' + icon('search') +
      '<input id="browseQ" type="search" placeholder="搜索" value="' + esc(q) + '"></label>' +
      '<button type="button" class="glass" data-act="menu" aria-label="数据">' + icon('more') + '</button></div>' +
      body + tabbarHTML('browse') + '</div>';
  }

  function segHTML(current) {
    return '<div class="seg" role="tablist">' + RANGES.map(function (item) {
      return '<button type="button" role="tab" data-act="range" data-range="' + item[0] + '" aria-selected="' + (current === item[0] ? 'true' : 'false') + '">' + item[1] + '</button>';
    }).join('') + '</div>';
  }

  function statsHTML(metric, logs) {
    if (!logs.length) return '';
    var vals = logs.map(function (l) { return l.value; });
    var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    var fourth = '<div><b>' + logs.length + '</b><span>次数</span></div>';
    return '<div class="stats"><div><b>' + esc(formatNum(Math.round(avg * 10) / 10)) + '</b><span>平均</span></div><div><b>' +
      esc(formatNum(Math.min.apply(null, vals))) + '</b><span>最低</span></div><div><b>' +
      esc(formatNum(Math.max.apply(null, vals))) + '</b><span>最高</span></div>' + fourth + '</div>';
  }

  function logsHTML(metric, logs, allCount) {
    if (!logs.length) return '';
    var desc = logs.slice().reverse();
    var html = '<section class="logs"><div class="logs-head"><h2>记录</h2><span>' + logs.length + ' 条</span></div>';
    var lastDay = null;
    var open = false;
    desc.forEach(function (log) {
      var day = startOfDay(log.at);
      if (day !== lastDay) {
        if (open) html += '</div></section>';
        lastDay = day;
        open = true;
        html += '<section class="log-group"><h3>' + esc(formatWhen(log.at, false)) + '</h3><div class="log-card">';
      }
      var d = new Date(log.at);
      html += '<button type="button" class="log-row" data-act="edit-log" data-id="' + log.id + '"><span class="t">' +
        pad(d.getHours()) + ':' + pad(d.getMinutes()) + '</span><span class="v">' + esc(formatNum(log.value)) +
        (metric.unit ? '<i>' + esc(metric.unit) + '</i>' : '') + '</span>' + icon('chev') + '</button>';
    });
    if (open) html += '</div></section>';
    if (allCount > logs.length) html += '<button type="button" class="more-logs" data-act="range" data-range="all">查看全部 ' + allCount + ' 条</button>';
    html += '</section>';
    return html;
  }

  function heroHTML(metric, latest) {
    if (!latest) {
      var overall = latestOf(metric.id);
      if (overall) {
        return '<div class="hero"><p class="hero-kicker">这段时间还没有记录</p><p class="time">最近一次是 ' +
          esc(formatWhen(overall.at)) + '，' + esc(formatNum(overall.value)) + (metric.unit ? ' ' + esc(metric.unit) : '') +
          '</p><button type="button" class="text-btn" data-act="range" data-range="all">查看全部</button></div>';
      }
      return '<div class="hero"><p class="hero-kicker">记下第一笔之后，这里会画出趋势</p></div>';
    }
    var prev = previousLog(metric.id, latest.id);
    var delta = prev ? deltaText(latest.value, prev.value) : '';
    var st = statusOf(metric, latest.value);
    var ranged = metric.low != null || metric.high != null;
    return '<div class="hero"><p class="hero-kicker" id="heroKicker">最近一次</p><p class="hero-value"><span id="heroNum" class="num">' +
      esc(formatNum(latest.value)) + '</span><span id="heroUnit" class="unit"' + (metric.unit ? '' : ' hidden') + '>' + esc(metric.unit || '') +
      '</span></p><p class="hero-meta"><span id="heroWhen" class="time">' + esc(formatWhen(latest.at)) + '</span><span id="heroDelta" class="delta">' + esc(delta) +
      '</span></p><p id="heroStatus" class="pill st-' + st.key + '"' + (st.key === 'none' ? ' hidden' : '') + '>' +
      (st.key === 'none' ? '' : esc(st.label)) + '</p>' +
      (ranged ? '<p class="range-line">' + esc(rangeLabel(metric)) + '</p>' : '') +
      '<button type="button" id="heroReset" data-act="reset-hero" hidden>回到最近</button></div>';
  }

  function missingHTML() {
    return '<div class="page detail"><header class="navglass"><button type="button" class="glass" data-act="back" aria-label="返回">' + icon('back') + '</button><h1>健康</h1><span></span></header>' +
      bannerHTML() +
      '<div class="empty"><p>没有这个指标</p><button type="button" class="fill" data-act="back">返回</button></div></div>';
  }

  function detailHTML(metric) {
    var all = state.index.get(metric.id) || [];
    if (state.rangeMetric !== metric.id) {
      state.rangeMetric = metric.id;
      state.rangeTouched = false;
    }
    if (!state.rangeTouched) state.range = pickRange(all);
    var logs = logsInRange(all, state.range, Date.now());
    state.viewLogs = logs;
    var latest = logs.length ? logs[logs.length - 1] : null;
    return '<div class="page detail" style="--c:' + safeColor(metric.color) + '">' +
      '<header class="navglass"><button type="button" class="glass" data-act="back" aria-label="返回">' + icon('back') + '</button>' +
      '<h1>' + esc(metric.name) + '</h1>' +
      '<div class="nav-right"><button type="button" class="glass" data-act="add" data-id="' + metric.id + '" aria-label="记一笔">' + icon('plus') + '</button></div></header>' +
      bannerHTML() +
      heroHTML(metric, latest) +
      '<div class="edit-row"><button type="button" data-act="edit-metric" data-id="' + metric.id + '">编辑指标</button></div>' +
      segHTML(state.range) +
      '<section class="panel"><div id="chartHost" class="chart-card"></div><p id="legend" class="legend" hidden></p>' +
      statsHTML(metric, logs) + '</section>' + logsHTML(metric, logs, all.length) + '</div>';
  }

  function scrubbedBefore() {
    try { return sessionStorage.getItem('yl-health-scrubbed') === '1'; } catch (e) { return true; }
  }

  function mountChart(metric) {
    var host = document.getElementById('chartHost');
    if (!host) return;
    var logs = state.viewLogs || [];
    var all = state.index.get(metric.id) || [];
    host.style.setProperty('--c', safeColor(metric.color));
    var legend = document.getElementById('legend');
    var hint = document.getElementById('scrubHint');
    if (!logs.length) {
      host.innerHTML = '<div class="chart-empty">' + (all.length ? '这段时间还没有记录' : '还没有可以画的点') + '</div>';
      if (legend) legend.hidden = true;
      if (hint) hint.hidden = true;
      state.focusPlot = null;
      state.plotPoints = [];
      return;
    }
    var chartH = host.clientHeight;
    if (chartH < 160) chartH = 248;
    var model = buildChart(metric, logs, host.clientWidth || window.innerWidth || 320, Date.now(), chartH);
    host.innerHTML = model.html;
    if (legend) {
      legend.hidden = model.band !== 'far';
      legend.textContent = '标准范围和这组数据差得比较远，没有画在图上';
    }
    if (hint) hint.hidden = logs.length < 2 || scrubbedBefore();
    var svg = host.querySelector('svg');
    if (svg && model.points.length) bindScrub(svg, model.points, metric);
  }

  function updateHero(metric, point, isLatest) {
    var num = document.getElementById('heroNum');
    if (!num) return;
    num.textContent = formatNum(point.value);
    var unit = document.getElementById('heroUnit');
    if (unit) {
      unit.textContent = metric.unit || '';
      unit.hidden = !metric.unit;
    }
    var st = statusOf(metric, point.value);
    var pill = document.getElementById('heroStatus');
    if (pill) {
      pill.hidden = st.key === 'none';
      pill.className = 'pill st-' + st.key;
      pill.textContent = st.key === 'none' ? '' : st.label;
    }
    var when = document.getElementById('heroWhen');
    if (when) when.textContent = formatWhen(point.at, true);
    var delta = document.getElementById('heroDelta');
    if (delta) {
      var prev = previousLog(metric.id, point.id);
      delta.textContent = prev ? deltaText(point.value, prev.value) : '';
    }
    var kicker = document.getElementById('heroKicker');
    if (kicker) kicker.textContent = isLatest ? '最近一次' : '选中的记录';
    var reset = document.getElementById('heroReset');
    if (reset) reset.hidden = !!isLatest;
  }

  function bindScrub(svg, points, metric) {
    var scrub = svg.querySelector('.scrub');
    var line = svg.querySelector('.scrub-line');
    var dot = svg.querySelector('.scrub-dot');
    var active = false;
    function nearest(clientX) {
      var rect = svg.getBoundingClientRect();
      var vb = svg.viewBox.baseVal;
      if (!rect.width || !vb.width) return points[points.length - 1];
      var x = (clientX - rect.left) * (vb.width / rect.width);
      var best = points[0];
      var bestD = Infinity;
      for (var i = 0; i < points.length; i++) {
        var dist = Math.abs(points[i].x - x);
        if (dist < bestD) { best = points[i]; bestD = dist; }
      }
      return best;
    }
    function apply(p, showLine) {
      var latest = points[points.length - 1];
      scrub.setAttribute('visibility', 'visible');
      line.setAttribute('visibility', showLine && points.length > 1 ? 'visible' : 'hidden');
      line.setAttribute('x1', p.x);
      line.setAttribute('x2', p.x);
      dot.setAttribute('cx', p.x);
      dot.setAttribute('cy', p.y);
      dot.style.fill = safeColor(metric.color);
      updateHero(metric, p, p.id === latest.id);
    }
    state.plotPoints = points;
    state.focusPlot = apply;
    apply(points[points.length - 1], false);
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('pointerdown', function (e) {
      active = true;
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      apply(nearest(e.clientX), true);
      var hint = document.getElementById('scrubHint');
      if (hint) hint.hidden = true;
      try { sessionStorage.setItem('yl-health-scrubbed', '1'); } catch (err) {}
    });
    svg.addEventListener('pointermove', function (e) {
      if (!active) return;
      apply(nearest(e.clientX), true);
    });
    function end() { active = false; }
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var current = points.findIndex(function (p) {
        return document.getElementById('heroWhen') && formatWhen(p.at) === document.getElementById('heroWhen').textContent;
      });
      if (current < 0) current = points.length - 1;
      var next = e.key === 'ArrowRight' ? Math.min(points.length - 1, current + 1) : Math.max(0, current - 1);
      apply(points[next], true);
    });
  }

  function applyBrowseFilter() {
    var q = document.getElementById('browseQ');
    if (!q) return;
    var text = q.value.trim().toLowerCase();
    var any = false;
    document.querySelectorAll('.tile').forEach(function (tile) {
      var nameEl = tile.querySelector('.tile-name');
      var name = nameEl ? nameEl.textContent.toLowerCase() : '';
      var hide = !!text && name.indexOf(text) === -1;
      tile.hidden = hide;
      if (!hide) any = true;
    });
    var empty = document.getElementById('browseEmpty');
    if (empty) empty.hidden = !text || any;
  }

  function bindBrowse() {
    var q = document.getElementById('browseQ');
    if (!q) return;
    q.addEventListener('input', function () {
      state.query = q.value;
      applyBrowseFilter();
    });
  }

  function render() {
    refreshIndex();
    var route = currentRoute();
    var key = route.name + ':' + (route.id || '');
    var routeChanged = key !== state.routeKey;
    state.routeKey = key;
    var keptY = window.scrollY || 0;
    var prevChips = document.querySelector('.mchips');
    var chipScroll = prevChips ? prevChips.scrollLeft : 0;
    var browseField = document.activeElement && document.activeElement.id === 'browseQ' ? document.activeElement : null;
    var selStart = browseField ? browseField.selectionStart : null;
    var selEnd = browseField ? browseField.selectionEnd : null;
    var app = document.getElementById('app');
    if (route.name === 'detail') {
      var metric = metricById(route.id);
      if (!metric) {
        document.title = '健康';
        app.innerHTML = missingHTML();
      } else {
        document.title = metric.name + ' · 健康';
        app.innerHTML = detailHTML(metric);
        if (!routeChanged) {
          var detailPage = app.querySelector('.page');
          if (detailPage) detailPage.classList.add('steady');
        }
        mountChart(metric);
      }
    } else if (route.name === 'browse') {
      document.title = '浏览 · 健康';
      app.innerHTML = browseHTML();
      bindBrowse();
      if (browseField) {
        var field = document.getElementById('browseQ');
        if (field) {
          field.focus();
          if (selStart != null && field.setSelectionRange) field.setSelectionRange(selStart, selEnd);
        }
      }
    } else {
      document.title = '洞察 · 健康';
      app.innerHTML = homeHTML();
    }
    var page = app.querySelector('.page');
    if (page && !routeChanged) page.classList.add('steady');
    if (routeChanged) window.scrollTo(0, 0);
    else {
      window.scrollTo(0, keptY);
      var nextChips = document.querySelector('.mchips');
      if (nextChips) nextChips.scrollLeft = chipScroll;
    }
    syncStuck();
  }

  function syncStuck() {
    document.body.classList.toggle('stuck', (window.scrollY || 0) > 4);
  }

  function goHome() {
    if (state.returnTab === 'browse') {
      state.returnTab = '';
      if (location.hash !== '#browse') {
        if (history.length > 1) {
          history.back();
          return;
        }
        history.replaceState(null, '', location.pathname + location.search + '#browse');
      }
      render();
      return;
    }
    state.returnTab = '';
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    render();
  }

  function goDetail(id) {
    var next = '#m/' + id;
    if (location.hash === next) render();
    else location.hash = next;
  }

  var locked = false;
  var lockedY = 0;

  function lock(on) {
    if (on) {
      if (locked) return;
      lockedY = window.scrollY || 0;
      locked = true;
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + lockedY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      return;
    }
    if (!locked) return;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    var y = lockedY;
    locked = false;
    window.scrollTo(0, y);
  }

  function setInert(on) {
    var app = document.getElementById('app');
    if (app && 'inert' in app) app.inert = on;
  }

  function sheetTitle(sheet) {
    if (sheet.mode === 'edit-metric') return '编辑指标';
    if (sheet.mode === 'edit-log') return '编辑记录';
    if (sheet.mode === 'create') return '新指标';
    return '记一笔';
  }

  function chipsHTML(sheet) {
    var allowNew = !sheet.logId && sheet.mode !== 'edit-metric';
    var html = state.data.metrics.map(function (m) {
      var on = sheet.mode !== 'create' && m.id === sheet.metricId;
      return '<button type="button" class="chip" role="radio" data-act="pick-metric" data-id="' + m.id + '" aria-checked="' + (on ? 'true' : 'false') + '">' + esc(m.name) + '</button>';
    }).join('');
    if (allowNew) {
      html += '<button type="button" class="chip" role="radio" data-act="pick-metric" data-id="new" aria-checked="' + (sheet.mode === 'create' ? 'true' : 'false') + '">新指标</button>';
    }
    return html;
  }

  function formHTML(sheet) {
    var d = sheet.draft;
    var showRange = sheet.mode === 'create' || sheet.mode === 'edit-metric';
    return '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle"><div class="sheet-head"><div class="handle-hit" id="handle"><div class="handle"></div></div>' +
      '<div class="sheet-bar"><button type="button" class="text-btn" data-act="close">取消</button><h2 id="sheetTitle">' + esc(sheetTitle(sheet)) + '</h2>' +
      '<button type="button" class="text-btn done" data-act="save">完成</button></div><p id="formErr" class="err" role="alert" hidden></p></div>' +
      '<form id="entryForm" autocomplete="off"><div id="chipRow" class="chips" role="radiogroup" aria-label="选择指标">' + chipsHTML(sheet) + '</div>' +
      '<div id="createFields"><div class="group">' +
      '<label class="field"><span>名称</span><input id="f-name" maxlength="20" placeholder="自定义名称" autocomplete="off" value="' + esc(d.name) + '"></label>' +
      '<label class="field"><span>单位</span><input id="f-unit" maxlength="12" placeholder="单位" autocomplete="off" value="' + esc(d.unit) + '"></label></div>' +
      '<div id="rangeFields" class="group"' + (showRange ? '' : ' hidden') + '>' +
      '<label class="field"><span>下限</span><input id="f-low" inputmode="decimal" placeholder="可不填" autocomplete="off" value="' + esc(d.low) + '"></label>' +
      '<label class="field"><span>上限</span><input id="f-high" inputmode="decimal" placeholder="可不填" autocomplete="off" value="' + esc(d.high) + '"></label></div>' +
      '<p id="rangeNote" class="help"' + (showRange ? '' : ' hidden') + '>有合理范围就填上，没有可以留空。</p></div>' +
      '<div id="valueFields"><div class="group"><label class="field"><span>数值</span><input id="f-value" inputmode="decimal" placeholder="0" aria-label="数值" autocomplete="off" enterkeyhint="done" value="' + esc(d.value) + '"><i id="valueUnit" class="unit-echo"></i></label>' +
      '<label class="field"><span>时间</span><input id="f-time" type="datetime-local" step="60" value="' + esc(d.time) + '"></label></div></div>' +
      '<button type="button" id="deleteBtn" class="delete" data-act="delete">删除</button></form></div>';
  }

  function menuHTML() {
    return '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle"><div class="sheet-head"><div class="handle-hit" id="handle"><div class="handle"></div></div>' +
      '<div class="sheet-bar"><button type="button" class="text-btn" data-act="close">取消</button><h2 id="sheetTitle">数据</h2><span></span></div></div>' +
      '<div class="menu-list"><button type="button" data-act="export">导出备份</button><button type="button" data-act="import">导入备份</button></div>' +
      '<p class="help">记录只放在这个浏览器里。换手机或清除网站数据之后，这里的内容会消失，可以先导出一份备份。</p></div>';
  }

  function importHTML(sheet) {
    var n = sheet.payload.metrics.length;
    var m = sheet.payload.logs.length;
    var extra = sheet.dropped ? '<p class="help">有 ' + sheet.dropped + ' 条没读出来，已跳过。</p>' : '';
    return '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle"><div class="sheet-head"><div class="handle-hit" id="handle"><div class="handle"></div></div>' +
      '<div class="sheet-bar"><button type="button" class="text-btn" data-act="close">取消</button><h2 id="sheetTitle">导入备份</h2><span></span></div></div>' +
      '<p class="import-copy">将用这份备份替换当前浏览器里的记录，共 ' + n + ' 个指标、' + m + ' 条记录。</p>' + extra +
      '<button type="button" class="go" data-act="do-import">替换</button><button type="button" class="sheet-cancel" data-act="close">取消</button></div>';
  }

  function setHidden(id, hidden) {
    var el = document.getElementById(id);
    if (el) el.hidden = hidden;
  }

  function syncUnitEcho() {
    var el = document.getElementById('valueUnit');
    if (!el || !state.sheet) return;
    var unit = '';
    if (state.sheet.mode === 'create' || !state.sheet.metricId) {
      var input = document.getElementById('f-unit');
      unit = input ? input.value.trim() : '';
    } else {
      var metric = metricById(state.sheet.metricId);
      unit = metric ? metric.unit : '';
    }
    el.textContent = unit;
  }

  function applySheetVisibility() {
    var s = state.sheet;
    if (!s || s.mode === 'menu' || s.mode === 'import') return;
    var creating = s.mode === 'create';
    var editMetric = s.mode === 'edit-metric';
    var allowNew = !s.logId && !editMetric;
    var choices = state.data.metrics.length + (allowNew ? 1 : 0);
    setHidden('chipRow', editMetric || s.lockMetric || choices < 2);
    setHidden('createFields', !(creating || editMetric));
    setHidden('valueFields', editMetric);
    setHidden('rangeFields', !(creating || editMetric));
    setHidden('rangeNote', !(creating || editMetric));
    setHidden('deleteBtn', !(s.mode === 'edit-log' || editMetric));
    var title = document.getElementById('sheetTitle');
    if (title) title.textContent = sheetTitle(s);
    var sub = document.getElementById('sheetSub');
    if (sub) {
      var lockedMetric = s.lockMetric ? metricById(s.metricId) : null;
      sub.hidden = !lockedMetric;
      sub.textContent = lockedMetric ? lockedMetric.name : '';
    }
    document.querySelectorAll('[data-act="pick-metric"]').forEach(function (btn) {
      var on = btn.dataset.id === 'new' ? creating : btn.dataset.id === s.metricId && !creating;
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    syncUnitEcho();
    var rangeText = document.getElementById('rangeText');
    if (rangeText && s.metricId) {
      var metric = metricById(s.metricId);
      rangeText.textContent = metric ? rangeLabel(metric) : '';
    }
    var toggle = document.getElementById('rangeToggle');
    if (toggle) toggle.textContent = s.rangeOpen ? '收起' : '修改范围';
    var del = document.getElementById('deleteBtn');
    if (del && !del.classList.contains('arm')) del.textContent = editMetric ? '删除这个指标' : '删除这条记录';
  }

  function clearError() {
    var err = document.getElementById('formErr');
    if (!err) return;
    err.hidden = true;
    err.textContent = '';
  }

  function showError(msg) {
    var err = document.getElementById('formErr');
    if (!err) return;
    err.hidden = false;
    err.textContent = msg;
  }

  function bindHandle() {
    var hit = document.getElementById('handle');
    var sheet = hit && hit.closest('.sheet');
    if (!hit || !sheet) return;
    var start = 0;
    var dy = 0;
    var dragging = false;
    hit.addEventListener('pointerdown', function (e) {
      dragging = true;
      start = e.clientY;
      dy = 0;
      sheet.style.transition = 'none';
      try { hit.setPointerCapture(e.pointerId); } catch (err) {}
    });
    hit.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dy = Math.max(0, e.clientY - start);
      sheet.style.transform = 'translateY(' + dy + 'px)';
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      if (dy > 90) { closeSheet(); return; }
      sheet.style.transition = 'transform .28s cubic-bezier(.32,.72,0,1)';
      sheet.style.transform = '';
      dy = 0;
    }
    hit.addEventListener('pointerup', end);
    hit.addEventListener('pointercancel', end);
  }

  function focusSheetField() {
    var s = state.sheet;
    if (!s) return;
    var id = s.mode === 'create' || s.mode === 'edit-metric' ? 'f-name' : 'f-value';
    var el = document.getElementById(id);
    if (!el) return;
    var box = el.closest('[hidden]');
    if (box) return;
    el.focus();
  }

  function openSheet(sheet, opener) {
    state.sheet = sheet;
    state.opener = opener || null;
    var root = document.getElementById('sheetRoot');
    var html = sheet.mode === 'menu' ? menuHTML() : sheet.mode === 'import' ? importHTML(sheet) : formHTML(sheet);
    root.innerHTML = html;
    root.hidden = false;
    root.classList.remove('show');
    requestAnimationFrame(function () { root.classList.add('show'); });
    if (sheet.mode !== 'menu' && sheet.mode !== 'import') {
      applySheetVisibility();
      var form = document.getElementById('entryForm');
      if (form) {
        form.addEventListener('input', function () {
          clearError();
          var del = document.getElementById('deleteBtn');
          if (del) {
            del.classList.remove('arm');
            del.textContent = state.sheet && state.sheet.mode === 'edit-metric' ? '删除这个指标' : '删除这条记录';
          }
        });
      }
      var unit = document.getElementById('f-unit');
      if (unit) unit.addEventListener('input', syncUnitEcho);
      focusSheetField();
    }
    bindHandle();
    setInert(true);
    lock(true);
  }

  function closeSheet() {
    var root = document.getElementById('sheetRoot');
    if (!state.sheet && root.hidden) return;
    state.sheet = null;
    var sheet = root.querySelector('.sheet');
    var dragged = sheet && sheet.style.transform;
    function finish() {
      root.hidden = true;
      root.innerHTML = '';
      root.classList.remove('show');
      setInert(false);
      lock(false);
      if (state.opener && state.opener.isConnected && state.opener.focus) state.opener.focus();
      state.opener = null;
    }
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (dragged || reduce || !root.classList.contains('show')) {
      finish();
      return;
    }
    root.classList.remove('show');
    var done = false;
    function end() {
      if (done) return;
      done = true;
      finish();
    }
    var timer = setTimeout(end, 480);
    if (sheet) {
      sheet.addEventListener('transitionend', function (e) {
        if (e.propertyName !== 'transform') return;
        clearTimeout(timer);
        end();
      });
    } else end();
  }

  function blankDraft(metric) {
    return {
      name: metric ? metric.name : '',
      unit: metric ? metric.unit : '',
      low: metric && metric.low != null ? rawNum(metric.low) : '',
      high: metric && metric.high != null ? rawNum(metric.high) : '',
      value: '',
      time: toLocalInput(Date.now())
    };
  }

  function openAdd(metricId, opener) {
    if (state.broken) { toast('先处理读不出来的旧数据'); return; }
    var metrics = state.data.metrics;
    if (!metrics.length) {
      openSheet({ mode: 'create', metricId: null, logId: null, lockMetric: true, color: pickColor(), rangeOpen: true, draft: blankDraft(null) }, opener);
      return;
    }
    var id = metricId;
    if (!metrics.some(function (m) { return m.id === id; })) {
      id = metrics.some(function (m) { return m.id === state.data.lastMetricId; }) ? state.data.lastMetricId : orderedMetrics()[0].id;
    }
    var metric = metricById(id);
    openSheet({
      mode: 'log',
      metricId: id,
      logId: null,
      lockMetric: !!(metricId && metrics.some(function (m) { return m.id === metricId; })),
      color: safeColor(metric.color),
      rangeOpen: false,
      draft: blankDraft(metric)
    }, opener);
  }

  function openEditLog(id, opener) {
    var log = state.data.logs.find(function (l) { return l.id === id; });
    var metric = log && metricById(log.metricId);
    if (!log || !metric) return;
    var draft = blankDraft(metric);
    draft.value = rawNum(log.value);
    draft.time = toLocalInput(log.at);
    openSheet({
      mode: 'edit-log',
      metricId: metric.id,
      logId: log.id,
      lockMetric: false,
      color: safeColor(metric.color),
      rangeOpen: false,
      draft: draft
    }, opener);
  }

  function openEditMetric(id, opener) {
    var metric = metricById(id);
    if (!metric) return;
    openSheet({
      mode: 'edit-metric',
      metricId: metric.id,
      logId: null,
      lockMetric: true,
      color: safeColor(metric.color),
      rangeOpen: true,
      draft: blankDraft(metric)
    }, opener);
  }

  function readRange() {
    var fields = document.getElementById('rangeFields');
    if (!fields || fields.hidden) return { ok: true, skip: true, low: null, high: null };
    var low = parseOptional(document.getElementById('f-low').value);
    var high = parseOptional(document.getElementById('f-high').value);
    if (!low.ok || !high.ok) return { ok: false, message: '标准范围要填数字' };
    if (low.value != null && high.value != null && low.value > high.value) return { ok: false, message: '下限要比上限小' };
    return { ok: true, skip: false, low: low.value, high: high.value };
  }

  function savedToast(ok, message) {
    if (!ok) toast(message + '，但没能存进浏览器');
    else toast(message);
  }

  function saveForm() {
    var sheet = state.sheet;
    if (!sheet || sheet.mode === 'menu' || sheet.mode === 'import') return;
    var range = readRange();
    if (!range.ok) return showError(range.message);
    if (sheet.mode === 'edit-metric') {
      var name = document.getElementById('f-name').value.trim();
      var unit = document.getElementById('f-unit').value.trim();
      if (!name) return showError('先写个名字');
      if (!unit) return showError('填一下单位');
      var clash = state.data.metrics.some(function (m) {
        return m.id !== sheet.metricId && m.name.trim().toLowerCase() === name.toLowerCase();
      });
      if (clash) return showError('已经有同名指标了');
      var metric = metricById(sheet.metricId);
      if (!metric) return showError('找不到这个指标');
      metric.name = name.slice(0, 20);
      metric.unit = unit.slice(0, 12);
      metric.color = safeColor(sheet.color);
      metric.sample = false;
      if (!range.skip) {
        metric.low = range.low;
        metric.high = range.high;
      }
      var okEdit = persist();
      closeSheet();
      render();
      savedToast(okEdit, '已保存');
      return;
    }
    var valueEl = document.getElementById('f-value');
    if (!valueEl.value.trim()) return showError('先填这次的数值');
    var value = parseNum(valueEl.value);
    if (value == null) return showError('数值好像不是数字');
    var timeEl = document.getElementById('f-time');
    var at = new Date(timeEl.value).getTime();
    if (!timeEl.value || !Number.isFinite(at) || at < 0 || at > Date.UTC(2100, 0, 1)) return showError('时间看起来不太对');
    var target = null;
    var merged = false;
    var mergedUnitKept = false;
    if (sheet.mode === 'create') {
      var nextName = document.getElementById('f-name').value.trim();
      var nextUnit = document.getElementById('f-unit').value.trim();
      if (!nextName) return showError('先写个名字');
      if (!nextUnit) return showError('填一下单位');
      var existed = state.data.metrics.find(function (m) { return m.name.trim().toLowerCase() === nextName.toLowerCase(); });
      if (existed) {
        var nextLow = existed.low;
        var nextHigh = existed.high;
        if (!range.skip && (range.low != null || range.high != null)) {
          if (range.low != null) nextLow = range.low;
          if (range.high != null) nextHigh = range.high;
          if (nextLow != null && nextHigh != null && nextLow > nextHigh) return showError('下限要比上限小');
        }
        target = existed;
        merged = true;
        mergedUnitKept = (existed.unit || '') !== nextUnit;
        target.sample = false;
        target.low = nextLow;
        target.high = nextHigh;
      } else {
        target = {
          id: uid('m'),
          name: nextName.slice(0, 20),
          unit: nextUnit.slice(0, 12),
          low: range.skip ? null : range.low,
          high: range.skip ? null : range.high,
          color: safeColor(sheet.color),
          createdAt: Date.now()
        };
        state.data.metrics.push(target);
      }
    } else {
      target = metricById(sheet.metricId);
      if (!target) return showError('先选一个指标');
      if (!range.skip) {
        target.low = range.low;
        target.high = range.high;
      }
    }
    if (sheet.mode === 'edit-log' && sheet.logId) {
      var log = state.data.logs.find(function (l) { return l.id === sheet.logId; });
      if (!log) return showError('找不到这条记录');
      log.metricId = target.id;
      log.value = value;
      log.at = at;
    } else {
      state.data.logs.push({ id: uid('l'), metricId: target.id, value: value, at: at });
    }
    state.data.lastMetricId = target.id;
    var ok = persist();
    var id = target.id;
    var note = merged ? '已记到「' + target.name + '」' + (mergedUnitKept ? '，单位没有改' : '') : '已记下';
    closeSheet();
    savedToast(ok, note);
    goDetail(id);
  }

  function armOrDelete() {
    var btn = document.getElementById('deleteBtn');
    var sheet = state.sheet;
    if (!btn || !sheet) return;
    if (!btn.classList.contains('arm')) {
      btn.classList.add('arm');
      btn.textContent = '确认删除';
      return;
    }
    if (sheet.mode === 'edit-metric') {
      var id = sheet.metricId;
      state.data.metrics = state.data.metrics.filter(function (m) { return m.id !== id; });
      state.data.logs = state.data.logs.filter(function (l) { return l.metricId !== id; });
      if (state.data.lastMetricId === id) state.data.lastMetricId = null;
      var okMetric = persist();
      closeSheet();
      savedToast(okMetric, '已删除');
      goHome();
      return;
    }
    state.data.logs = state.data.logs.filter(function (l) { return l.id !== sheet.logId; });
    var okLog = persist();
    closeSheet();
    render();
    savedToast(okLog, '已删除');
  }

  function pickMetric(id) {
    var sheet = state.sheet;
    if (!sheet) return;
    if (id === 'new') {
      sheet.mode = 'create';
      sheet.metricId = null;
      sheet.color = sheet.color || COLORS[0];
      var lowEl = document.getElementById('f-low');
      var highEl = document.getElementById('f-high');
      if (lowEl) lowEl.value = '';
      if (highEl) highEl.value = '';
    } else {
      sheet.mode = sheet.logId ? 'edit-log' : 'log';
      sheet.metricId = id;
      var metric = metricById(id);
      if (metric) sheet.color = safeColor(metric.color);
      var lowInput = document.getElementById('f-low');
      var highInput = document.getElementById('f-high');
      if (lowInput) lowInput.value = metric && metric.low != null ? rawNum(metric.low) : '';
      if (highInput) highInput.value = metric && metric.high != null ? rawNum(metric.high) : '';
    }
    sheet.rangeOpen = false;
    var del = document.getElementById('deleteBtn');
    if (del) del.classList.remove('arm');
    clearError();
    applySheetVisibility();
  }

  function toggleRange() {
    var sheet = state.sheet;
    if (!sheet) return;
    sheet.rangeOpen = !sheet.rangeOpen;
    if (sheet.rangeOpen) {
      var metric = metricById(sheet.metricId);
      var lowEl = document.getElementById('f-low');
      var highEl = document.getElementById('f-high');
      if (metric && lowEl && !lowEl.value && metric.low != null) lowEl.value = rawNum(metric.low);
      if (metric && highEl && !highEl.value && metric.high != null) highEl.value = rawNum(metric.high);
    }
    applySheetVisibility();
    if (sheet.rangeOpen) {
      var focus = document.getElementById('f-low');
      if (focus) focus.focus();
    }
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  function exportData() {
    var day = toLocalInput(Date.now()).slice(0, 10) || 'backup';
    download('health-' + day + '.json', JSON.stringify(state.data, null, 2));
    closeSheet();
    toast('已导出');
  }

  var toastTimer = 0;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function actFrom(e) {
    var el = e.target && e.target.nodeType === 1 ? e.target : e.target && e.target.parentElement;
    if (!el || !el.closest) return null;
    return el.closest('[data-act]');
  }

  function onClick(e) {
    var btn = actFrom(e);
    if (!btn) return;
    var act = btn.dataset.act;
    if (act === 'close') {
      if (btn.id === 'sheetRoot' && e.target.closest && e.target.closest('.sheet')) return;
      closeSheet();
      return;
    }
    if (act === 'open') {
      var from = currentRoute().name;
      state.returnTab = from === 'browse' || from === 'longevity' ? from : '';
      goDetail(btn.dataset.id);
      return;
    }
    if (act === 'focus') {
      state.focusId = btn.dataset.id || null;
      render();
      return;
    }
    if (act === 'back') { goHome(); return; }
    if (act === 'add') {
      if (btn.dataset.fresh === '1') {
        openSheet({ mode: 'create', metricId: null, logId: null, lockMetric: true, color: pickColor(), rangeOpen: true, draft: blankDraft(null) }, btn);
        return;
      }
      openAdd(btn.dataset.id || null, btn);
      return;
    }
    if (act === 'menu') { openSheet({ mode: 'menu' }, btn); return; }
    if (act === 'edit-metric') { openEditMetric(btn.dataset.id, btn); return; }
    if (act === 'edit-log') { openEditLog(btn.dataset.id, btn); return; }
    if (act === 'range') {
      state.range = btn.dataset.range;
      state.rangeTouched = true;
      render();
      return;
    }
    if (act === 'reset-hero') {
      var pts = state.plotPoints;
      if (pts && pts.length && state.focusPlot) state.focusPlot(pts[pts.length - 1]);
      return;
    }
    if (act === 'save') { saveForm(); return; }
    if (act === 'delete') { armOrDelete(); return; }
    if (act === 'pick-metric') { pickMetric(btn.dataset.id); return; }
    if (act === 'toggle-range') { toggleRange(); return; }
    if (act === 'export') { exportData(); return; }
    if (act === 'import') { document.getElementById('file').click(); return; }
    if (act === 'do-import') {
      if (!state.sheet || !state.sheet.payload) return;
      state.data = state.sheet.payload;
      state.broken = null;
      var imported = persist();
      closeSheet();
      goHome();
      savedToast(imported, '导入好了');
      return;
    }
    if (act === 'download-raw') {
      var raw = state.broken || state.recoverRaw;
      if (raw) download('health-raw.json', raw);
      return;
    }
    if (act === 'tab') {
      var tab = btn.dataset.tab;
      if (tab === 'home') state.focusId = null;
      var hash = tab === 'browse' ? '#browse' : '';
      if ((location.hash || '') === hash) render();
      else if (!hash) {
        history.replaceState(null, '', location.pathname + location.search);
        render();
      } else location.hash = hash;
      return;
    }
    if (act === 'load-sample') {
      state.data = sampleData(Date.now());
      var seeded = persist();
      closeSheet();
      goDetail(state.data.lastMetricId);
      savedToast(seeded, '已放入示例');
      return;
    }
    if (act === 'clear-sample') {
      var keep = {};
      state.data.metrics = state.data.metrics.filter(function (m) {
        if (m.sample) return false;
        keep[m.id] = true;
        return true;
      });
      state.data.logs = state.data.logs.filter(function (l) { return keep[l.metricId]; });
      state.data.lastMetricId = state.data.metrics.length ? state.data.metrics[0].id : null;
      persist();
      closeSheet();
      goHome();
      toast('示例已清除');
      return;
    }
    if (act === 'reset-storage') {
      state.broken = null;
      state.dropped = 0;
      state.recoverRaw = null;
      state.data = emptyData();
      try {
        localStorage.removeItem(KEY);
        localStorage.setItem(KEY, JSON.stringify(state.data));
        state.storageError = false;
      } catch (err) {
        state.storageError = true;
      }
      render();
      toast('可以重新开始了');
    }
  }

  function onSubmit(e) {
    if (!e.target || e.target.id !== 'entryForm') return;
    e.preventDefault();
    saveForm();
  }

  function onFile(e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('文件太大了'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var json = JSON.parse(String(reader.result));
        if (!json || typeof json !== 'object' || Array.isArray(json) || (!Array.isArray(json.metrics) && !Array.isArray(json.logs))) {
          toast('这份文件读不了');
          return;
        }
        var result = sanitize(json);
        if (!result.data.metrics.length && !result.data.logs.length) { toast('没有读到可用的记录'); return; }
        openSheet({ mode: 'import', payload: result.data, dropped: result.dropped });
      } catch (err) {
        toast('这份文件读不了');
      }
    };
    reader.readAsText(file);
  }

  function boot() {
    load();
    if (location.hash === '#longevity') history.replaceState(null, '', location.pathname + location.search);
    refreshIndex();
    document.body.addEventListener('click', onClick);
    document.body.addEventListener('submit', onSubmit);
    document.getElementById('file').addEventListener('change', onFile);
    window.addEventListener('hashchange', function () { render(); });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.sheet) closeSheet();
    });
    window.addEventListener('scroll', syncStuck, { passive: true });
    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (!state.sheet) render();
      }, 150);
    });
    render();
  }

  var api = {
    COLORS: COLORS,
    emptyData: emptyData,
    parseNum: parseNum,
    formatNum: formatNum,
    statusOf: statusOf,
    rangeLabel: rangeLabel,
    sanitize: sanitize,
    loadFrom: loadFrom,
    logsInRange: logsInRange,
    pickRange: pickRange,
    buildChart: buildChart,
    esc: esc,
    formatWhen: formatWhen,
    deltaText: deltaText,
    downsample: downsample
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})();
