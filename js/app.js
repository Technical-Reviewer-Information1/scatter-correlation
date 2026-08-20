(function () {
  'use strict';
  const C = window.Chart, T = window.Tools, $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- 統計 ---------- */
  function stats(pts) {
    const n = pts.length;
    if (n < 2) return null;
    const mx = pts.reduce((a, p) => a + p[0], 0) / n;
    const my = pts.reduce((a, p) => a + p[1], 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    pts.forEach(p => { sxy += (p[0] - mx) * (p[1] - my); sxx += (p[0] - mx) ** 2; syy += (p[1] - my) ** 2; });
    const cov = sxy / n;
    const r = (sxx && syy) ? sxy / Math.sqrt(sxx * syy) : 0;
    const a = sxx ? sxy / sxx : 0;
    return { n, mx, my, cov, r, a, b: my - a * mx, sxy, sxx, syy };
  }
  function word(r) {
    const x = Math.abs(r);
    const dir = r > 0 ? '正の' : '負の';
    if (x < 0.2) return 'ほとんど相関がない';
    if (x < 0.4) return '弱い' + dir + '相関';
    if (x < 0.7) return dir + '相関がある';
    if (x < 0.9) return '強い' + dir + '相関';
    return 'とても強い' + dir + '相関';
  }

  /* ---------- STEP1 対話式散布図 ---------- */
  const W = 460, H = 360, M = { t: 16, r: 16, b: 34, l: 40 };
  const IW = W - M.l - M.r, IH = H - M.t - M.b;
  let pts = [], dragIdx = -1;

  const X = v => M.l + v / 100 * IW;
  const Y = v => M.t + IH - v / 100 * IH;
  const invX = px => (px - M.l) / IW * 100;
  const invY = py => (M.t + IH - py) / IH * 100;

  function el(n, a) { const e = document.createElementNS(NS, n); for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]); return e; }

  function drawPlay() {
    const box = $('playBox');
    box.innerHTML = '';
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'application',
      'aria-label': '散布図。クリックで点を追加、ドラッグで移動' });
    svg.style.display = 'block';
    for (let v = 0; v <= 100; v += 20) {
      svg.appendChild(el('line', { x1: X(v), y1: M.t, x2: X(v), y2: M.t + IH, stroke: '#ebe8e2', 'stroke-width': 1 }));
      svg.appendChild(el('line', { x1: M.l, y1: Y(v), x2: M.l + IW, y2: Y(v), stroke: '#ebe8e2', 'stroke-width': 1 }));
      const tx = el('text', { x: X(v), y: M.t + IH + 15, 'text-anchor': 'middle', 'font-size': 10, fill: '#858a92', 'font-family': 'monospace' });
      tx.textContent = v; svg.appendChild(tx);
      const ty = el('text', { x: M.l - 7, y: Y(v), 'text-anchor': 'end', 'dominant-baseline': 'middle', 'font-size': 10, fill: '#858a92', 'font-family': 'monospace' });
      ty.textContent = v; svg.appendChild(ty);
    }
    svg.appendChild(el('line', { x1: M.l, y1: M.t, x2: M.l, y2: M.t + IH, stroke: '#4a4f57', 'stroke-width': 1.4 }));
    svg.appendChild(el('line', { x1: M.l, y1: M.t + IH, x2: M.l + IW, y2: M.t + IH, stroke: '#4a4f57', 'stroke-width': 1.4 }));

    const st = stats(pts);
    if (st && $('showMean').checked) {
      svg.appendChild(el('line', { x1: X(st.mx), y1: M.t, x2: X(st.mx), y2: M.t + IH, stroke: '#8a5a00', 'stroke-width': 1.4, 'stroke-dasharray': '5 3' }));
      svg.appendChild(el('line', { x1: M.l, y1: Y(st.my), x2: M.l + IW, y2: Y(st.my), stroke: '#8a5a00', 'stroke-width': 1.4, 'stroke-dasharray': '5 3' }));
    }
    if (st && $('showLine').checked && Math.abs(st.a) < 1e6) {
      const y0 = st.b, y1 = st.a * 100 + st.b;
      svg.appendChild(el('line', { x1: X(0), y1: Y(Math.max(-50, Math.min(150, y0))), x2: X(100), y2: Y(Math.max(-50, Math.min(150, y1))),
        stroke: '#123a6b', 'stroke-width': 2, 'stroke-dasharray': '7 4' }));
    }
    pts.forEach((p, i) => {
      const c = el('circle', { cx: X(p[0]), cy: Y(p[1]), r: 7, class: 'pt', 'data-i': i,
        fill: 'rgba(18,58,107,.7)', stroke: '#fff', 'stroke-width': 1.5 });
      svg.appendChild(c);
    });
    box.appendChild(svg);
    $('ptCount').textContent = pts.length;
    updateStats();
  }

  function updateStats() {
    const st = stats(pts);
    if (!st) {
      $('rVal').textContent = '—'; $('rWord').textContent = '点が2つ以上必要です';
      $('needle').style.left = '50%';
      ['mMx', 'mMy', 'mCov'].forEach(i => $(i).textContent = '—');
      $('rNote').className = 'note info';
      $('rNote').textContent = 'グラフをクリックして点を打ってください。上のボタンから典型的な形も呼び出せます。';
      drawCalc(null); return;
    }
    $('rVal').textContent = (st.r >= 0 ? '+' : '') + st.r.toFixed(3);
    $('rWord').textContent = word(st.r);
    $('needle').style.left = ((st.r + 1) / 2 * 100) + '%';
    $('mMx').textContent = st.mx.toFixed(1);
    $('mMy').textContent = st.my.toFixed(1);
    $('mCov').textContent = st.cov.toFixed(1);
    const n = $('rNote');
    const ax = Math.abs(st.r);
    if (ax >= 0.7) { n.className = 'note ok'; n.innerHTML = '点が<strong>直線に近く並んでいます</strong>。片方の値からもう片方をよく予測できる状態です。'; }
    else if (ax >= 0.4) { n.className = 'note info'; n.innerHTML = '<strong>ゆるやかな傾き</strong>が見えます。傾向はあるが、外れる点も目立ちます。'; }
    else { n.className = 'note warn'; n.innerHTML = '点が<strong>散らばっています</strong>。ただし r が 0 に近くても、曲がった関係が隠れていることがあります。散布図を必ず見てください。'; }
    drawCalc(st);
  }

  function drawCalc(st) {
    const tb = $('calcTable').tBodies[0], tf = $('calcTable').tFoot;
    tb.innerHTML = ''; tf.innerHTML = '';
    if (!st) { $('formulaNote').textContent = '点を2つ以上打つと計算表が出ます。'; return; }
    const show = pts.slice(0, 12);
    show.forEach((p, i) => {
      const dx = p[0] - st.mx, dy = p[1] - st.my;
      const tr = document.createElement('tr');
      const prod = dx * dy;
      tr.innerHTML = '<td>' + (i + 1) + '</td><td>' + p[0].toFixed(1) + '</td><td>' + p[1].toFixed(1) + '</td>' +
        '<td>' + dx.toFixed(1) + '</td><td>' + dy.toFixed(1) + '</td>' +
        '<td style="color:' + (prod >= 0 ? 'var(--ok)' : 'var(--ng)') + '">' + prod.toFixed(1) + '</td>' +
        '<td>' + (dx * dx).toFixed(1) + '</td><td>' + (dy * dy).toFixed(1) + '</td>';
      tb.appendChild(tr);
    });
    if (pts.length > 12) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="8" style="text-align:center;color:var(--ink-3)">…ほか ' + (pts.length - 12) + ' 点</td>';
      tb.appendChild(tr);
    }
    tf.innerHTML = '<tr><th colspan="5">合計</th><th>' + st.sxy.toFixed(1) + '</th><th>' + st.sxx.toFixed(1) +
      '</th><th>' + st.syy.toFixed(1) + '</th></tr>';
    $('formulaNote').innerHTML =
      'r ＝ <span class="mono">' + st.sxy.toFixed(1) + ' ÷ √(' + st.sxx.toFixed(1) + ' × ' + st.syy.toFixed(1) +
      ') ＝ ' + st.r.toFixed(3) + '</span><br>' +
      '分子は「(x−x̄)(y−ȳ) の合計」、分母は「x のばらつきと y のばらつきの積の平方根」。' +
      '分母で割ることで、<strong>単位に関係なく −1〜1 に収まる</strong>ようにしています。';
  }

  function shape(kind) {
    pts = [];
    const rnd = () => (Math.random() - .5);
    for (let i = 0; i < 18; i++) {
      const x = 8 + i * 4.8 + rnd() * 6;
      let y;
      if (kind === 'pos') y = x + rnd() * 22;
      else if (kind === 'neg') y = 100 - x + rnd() * 22;
      else if (kind === 'none') y = 50 + rnd() * 80;
      else y = 95 - Math.pow((x - 50) / 50, 2) * 85 + rnd() * 10;
      pts.push([clamp(x), clamp(y)]);
    }
    drawPlay();
  }
  const clamp = v => Math.max(0, Math.min(100, Math.round(v * 10) / 10));

  function pointerPos(ev) {
    const svg = $('playBox').querySelector('svg');
    const rect = svg.getBoundingClientRect();
    const sx = W / rect.width, sy = H / rect.height;
    const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
    const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY) - rect.top;
    return [cx * sx, cy * sy];
  }
  function onDown(ev) {
    const t = ev.target;
    if (t.classList && t.classList.contains('pt')) {
      dragIdx = +t.dataset.i; t.classList.add('drag'); ev.preventDefault(); return;
    }
    const [px, py] = pointerPos(ev);
    if (px < M.l || px > M.l + IW || py < M.t || py > M.t + IH) return;
    if (pts.length >= 40) return;
    pts.push([clamp(invX(px)), clamp(invY(py))]);
    drawPlay();
  }
  function onMove(ev) {
    if (dragIdx < 0) return;
    ev.preventDefault();
    const [px, py] = pointerPos(ev);
    pts[dragIdx] = [clamp(invX(px)), clamp(invY(py))];
    drawPlay();
  }
  function onUp() { dragIdx = -1; }

  /* ---------- STEP3 ギャラリー ---------- */
  function gallery() {
    const box = $('gallery'); box.innerHTML = '';
    const defs = [
      { r: 0.98,  cap: 'ほぼ完全な正の相関' },
      { r: 0.80,  cap: '強い正の相関' },
      { r: 0.35,  cap: '弱い正の相関' },
      { r: 0.00,  cap: 'ほとんど相関なし' },
      { r: -0.85, cap: '強い負の相関' },
      { r: null,  cap: '曲がった関係（r ≒ 0）' }
    ];
    defs.forEach((d, gi) => {
      let p;
      if (d.r === null) {
        p = [];
        for (let i = 0; i < 22; i++) {
          const x = 6 + i * 4.2;
          p.push([clamp(x), clamp(95 - Math.pow((x - 50) / 50, 2) * 85 + (seeded(31, i) - .5) * 6)]);
        }
      } else p = ptsWithR(d.r, 22, gi * 13 + 3);
      const st = stats(p);
      const fig = document.createElement('figure');
      const div = document.createElement('div');
      fig.appendChild(div);
      const cap = document.createElement('figcaption');
      cap.textContent = 'r ＝ ' + (st.r >= 0 ? '+' : '') + st.r.toFixed(2);
      const cap2 = document.createElement('div');
      cap2.className = 'cap2'; cap2.textContent = d.cap;
      fig.appendChild(cap); fig.appendChild(cap2);
      box.appendChild(fig);
      C.scatter(div, { W: 230, H: 190, points: p, xMin: 0, xMax: 100, yMin: 0, yMax: 100, r: 3.4,
        margin: { t: 8, r: 8, b: 22, l: 26 } });
    });
  }
  function seeded(a, b) { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); }

  /* 目標の相関係数 r をもつ点列を作る（決定的） */
  function ptsWithR(target, n, seed) {
    n = n || 22;
    const xs = [], es = [];
    for (let i = 0; i < n; i++) {
      xs.push(i / (n - 1) * 2 - 1);
      es.push(seeded(seed, i) + seeded(seed + 7, i * 3 + 1) - 1);   // −1〜1 のばらつき
    }
    const std = arr => {
      const m = arr.reduce((a, b) => a + b, 0) / arr.length;
      const sd = Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length) || 1;
      return arr.map(v => (v - m) / sd);
    };
    const zx = std(xs);
    let ze = std(es);
    const c = zx.reduce((a, v, i) => a + v * ze[i], 0) / n;   // zx と ze の相関を取り除く
    ze = std(ze.map((v, i) => v - c * zx[i]));
    const t = Math.max(-1, Math.min(1, target));
    const k = Math.sqrt(Math.max(0, 1 - t * t));
    return zx.map((v, i) => [clamp(50 + v * 17), clamp(50 + (t * v + k * ze[i]) * 17)]);
  }


  /* ---------- STEP4 外れ値 ---------- */
  const BASE = [];
  for (let i = 0; i < 14; i++) { const x = 10 + i * 5; BASE.push([x, x + (seeded(9, i) - .5) * 12]); }
  function drawOut() {
    const ox = +$('outX').value, oy = +$('outY').value;
    $('outXv').textContent = ox; $('outYv').textContent = oy;
    const withOut = BASE.concat([[ox, oy]]);
    const sb = stats(BASE), sw = stats(withOut);
    $('rBase').textContent = sb.r.toFixed(3);
    $('rWith').textContent = sw.r.toFixed(3);
    C.scatter($('outChart'), { W: 420, H: 320, points: withOut, xMin: 0, xMax: 105, yMin: 0, yMax: 105,
      regression: true, colors: withOut.map((_, i) => i === withOut.length - 1 ? '#b3261e' : 'rgba(18,58,107,.7)'),
      xLabel: 'x', yLabel: 'y' });
    const d = sw.r - sb.r, n = $('outNote');
    if (Math.abs(d) < 0.03) {
      n.className = 'note info';
      n.innerHTML = 'この位置なら、r はほとんど変わりません（' + sb.r.toFixed(3) + ' → ' + sw.r.toFixed(3) + '）。他の点と同じ傾向の上にあるからです。';
    } else {
      n.className = 'note ng';
      n.innerHTML = '赤い点1つだけで r が <strong>' + sb.r.toFixed(3) + ' → ' + sw.r.toFixed(3) + '</strong>（' +
        (d > 0 ? '+' : '') + d.toFixed(3) + '）と動きました。<strong>点はたった1つ、全体の ' +
        (100 / withOut.length).toFixed(0) + '％にすぎません。</strong>' +
        '相関係数の数字だけを見て判断すると、こうした1点にだまされます。必ず散布図を確認しましょう。';
    }
  }

  /* ---------- STEP5 クイズ ---------- */
  const QUIZ = [
    { r: 0.92, t: 'この散布図の相関係数として最も近いものはどれか。', choices: ['+0.9', '+0.5', '0.0', '−0.9'], a: '+0.9',
      why: '点が右上がりの直線に近く並んでいるので、+1 に近い値になります。' },
    { r: -0.75, t: 'この散布図の相関係数として最も近いものはどれか。', choices: ['−0.8', '−0.3', '+0.8', '0.0'], a: '−0.8',
      why: '右下がりなので r は負。直線に近いので −1 寄りの値です。' },
    { r: 0.05, t: 'この散布図の相関係数として最も近いものはどれか。', choices: ['0.0', '+0.6', '−0.6', '+1.0'], a: '0.0',
      why: '点が全体に散らばっていて傾きが見えないので、r は 0 に近い値です。' },
    { r: 0.45, t: 'この散布図の相関係数として最も近いものはどれか。', choices: ['+0.5', '+0.9', '−0.5', '0.0'], a: '+0.5',
      why: 'ゆるやかに右上がり。傾向はあるがばらつきも大きいので、0.5 前後です。' }
  ];
  const TEXTQ = [
    { t: '相関係数について正しいものはどれか。', choices: ['単位を変えても値は変わらない', '身長をcmからmに変えるとrも変わる', 'rは0から1の値をとる', 'rが大きいほど因果関係が強い'],
      a: '単位を変えても値は変わらない',
      why: 'r は分母で標準化されているので単位に依存しません。範囲は −1〜1 です。因果関係の強さは表しません。' },
    { t: 'r が 0 に近いとき、必ず言えることはどれか。', choices: ['直線的な関係は弱い', '2つの変数は無関係', '曲線的な関係もない', 'データに誤りがある'],
      a: '直線的な関係は弱い',
      why: 'r が測るのは直線的な関係だけ。放物線のような関係があっても r は 0 に近くなります。' }
  ];
  let qList = [], qi = 0, qScore = 0;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function startQuiz() { qList = shuffle(QUIZ).slice(0, 3).concat(shuffle(TEXTQ)); qi = 0; qScore = 0; renderQ(); }
  function makePts(target) { return ptsWithR(target, 20, Math.round(Math.abs(target) * 100) + 5); }
  function renderQ() {
    if (qi >= qList.length) {
      $('qFigure').innerHTML = '';
      $('qText').textContent = qScore + ' / ' + qList.length + ' 問正解';
      $('qChoices').innerHTML = ''; $('qFb').hidden = true; $('qNext').disabled = true;
      $('qProgress').textContent = qList.length + ' / ' + qList.length; return;
    }
    const it = qList[qi];
    $('qProgress').textContent = (qi + 1) + ' / ' + qList.length;
    $('qScore').textContent = qScore;
    if (it.r != null) {
      $('qFigure').innerHTML = '<div class="panel"><div id="qIn"></div></div>';
      C.scatter(document.getElementById('qIn'), { W: 420, H: 280, points: makePts(it.r),
        xMin: 0, xMax: 100, yMin: 0, yMax: 100, xLabel: 'x', yLabel: 'y' });
    } else $('qFigure').innerHTML = '';
    $('qText').textContent = it.t;
    const box = $('qChoices'); box.className = 'choice4'; box.innerHTML = '';
    shuffle(it.choices).forEach(c => {
      const b = document.createElement('button');
      b.className = 'btn'; b.textContent = c; b.dataset.c = c;
      b.addEventListener('click', () => answerQ(c));
      box.appendChild(b);
    });
    $('qFb').hidden = true; $('qNext').disabled = true;
    $('qNext').textContent = (qi === qList.length - 1) ? '結果を見る' : '次の問題';
  }
  function answerQ(c) {
    const it = qList[qi], ok = c === it.a, box = $('qChoices');
    box.classList.add('locked');
    [...box.children].forEach(b => {
      if (b.dataset.c === it.a) b.classList.add('correct');
      else if (b.dataset.c === c) b.classList.add('wrong');
    });
    if (ok) qScore++;
    const fb = $('qFb');
    fb.className = 'note ' + (ok ? 'ok' : 'ng');
    fb.innerHTML = (ok ? '正解。' : '正解は <strong>' + it.a + '</strong>。') + it.why;
    fb.hidden = false;
    $('qScore').textContent = qScore; $('qNext').disabled = false;
  }


  /* ---------- STEP6 自分のデータ ---------- */
  let grid = null, gh = [];
  function refreshCols(rows, hdr) {
    gh = hdr;
    const nums = grid.numericColumns();
    [['mx', 0], ['my', 1]].forEach(([id, def]) => {
      const sel = $(id), prev = sel.value;
      sel.innerHTML = hdr.map((h, j) => '<option value="' + j + '"' + (nums.indexOf(j) < 0 ? ' disabled' : '') +
        '>' + h + (nums.indexOf(j) < 0 ? '（数値でない列）' : '') + '</option>').join('');
      if (prev !== '' && sel.querySelector('option[value="' + prev + '"]:not([disabled])')) sel.value = prev;
      else if (nums.length) sel.value = nums[Math.min(def, nums.length - 1)];
    });
    calcMine();
  }
  function corrOf(a, b) {
    const n = a.length;
    if (n < 3) return NaN;
    const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
    let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
    return (saa && sbb) ? sab / Math.sqrt(saa * sbb) : 0;
  }
  function calcMine() {
    if (!grid) return;
    const G = window.DataGrid;
    const xj = +$('mx').value, yj = +$('my').value;
    const rows = grid.getData();
    const pairs = rows.map(r => [G.strNum(r[xj]), G.strNum(r[yj])]).filter(p => p[0] != null && p[1] != null);
    const n = $('myNote');
    if (pairs.length < 3) {
      n.hidden = false; n.className = 'note ng';
      n.textContent = '数値の組が3つ以上必要です。2つの数値の列をえらんでください。';
      ['myStats', 'myChart', 'myMatrix', 'myTools'].forEach(i => $(i).innerHTML = '');
      return;
    }
    const xs = pairs.map(p => p[0]), ys2 = pairs.map(p => p[1]);
    const r = corrOf(xs, ys2);
    const N = pairs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / N, my = ys2.reduce((a, b) => a + b, 0) / N;
    let cov = 0; pairs.forEach(p => cov += (p[0] - mx) * (p[1] - my)); cov /= N;
    $('myStats').innerHTML =
      '<div class="metric"><div class="k">データ数</div><div class="v">' + N + '</div></div>' +
      '<div class="metric"><div class="k">相関係数 r</div><div class="v">' + (r >= 0 ? '+' : '') + r.toFixed(3) + '</div></div>' +
      '<div class="metric"><div class="k">共分散</div><div class="v">' + cov.toFixed(2) + '</div></div>' +
      '<div class="metric"><div class="k">' + (gh[xj] || 'x') + ' の平均</div><div class="v">' + mx.toFixed(2) + '</div></div>' +
      '<div class="metric"><div class="k">' + (gh[yj] || 'y') + ' の平均</div><div class="v">' + my.toFixed(2) + '</div></div>';
    C.scatter($('myChart'), { W: 460, H: 380, points: pairs, regression: $('myLine').checked,
      xLabel: gh[xj] || 'x', yLabel: gh[yj] || 'y' });
    // 相関行列
    const nums = grid.numericColumns();
    if (nums.length >= 2) {
      const cols = nums.map(j => ({ j, name: gh[j], v: rows.map(rr => G.strNum(rr[j])) }));
      const valid = cols.filter(c => c.v.filter(v => v != null).length >= 3);
      $('myMatrix').innerHTML = '<thead><tr><th></th>' + valid.map(c => '<th>' + c.name + '</th>').join('') +
        '</tr></thead><tbody>' + valid.map(a => '<tr><td>' + a.name + '</td>' + valid.map(b => {
          if (a.j === b.j) return '<td class="self">—</td>';
          const pp = rows.map(rr => [G.strNum(rr[a.j]), G.strNum(rr[b.j])]).filter(p => p[0] != null && p[1] != null);
          const rr2 = corrOf(pp.map(p => p[0]), pp.map(p => p[1]));
          return '<td class="' + (rr2 > 0 ? 'pos' : 'neg') + '">' + (rr2 >= 0 ? '+' : '') + rr2.toFixed(2) + '</td>';
        }).join('') + '</tr>').join('') + '</tbody>';
    } else $('myMatrix').innerHTML = '<tbody><tr><td>数値の列が2つ以上必要です</td></tr></tbody>';
    const ax = Math.abs(r);
    n.hidden = false;
    n.className = ax >= .7 ? 'note ok' : ax >= .4 ? 'note info' : 'note warn';
    n.innerHTML = '「' + (gh[xj] || 'x') + '」と「' + (gh[yj] || 'y') + '」の相関係数は <strong>' +
      (r >= 0 ? '+' : '') + r.toFixed(3) + '</strong>（' + word(r) + '）。' +
      (ax < .2 ? '直線的な関係は弱いですが、<strong>曲がった関係が隠れていないか散布図を必ず確認</strong>してください。'
               : '<strong>相関があっても因果関係があるとは限りません。</strong>かくれた第3の要因（交絡因子）がないか考えましょう。');
    $('myTools').innerHTML = '';
    $('myTools').appendChild(T.saveButton(() => $('myChart').querySelector('svg'), '散布図'));
    const sh = document.createElement('button');
    sh.className = 'btn sm ghost'; sh.textContent = 'このデータのURLを作る';
    sh.addEventListener('click', () => T.share({ d: grid.getRaw(), h: grid.getHeader(), x: xj, y: yj }, sh));
    $('myTools').appendChild(sh);
    const pr = document.createElement('button');
    pr.className = 'btn sm ghost'; pr.textContent = '印刷する';
    pr.addEventListener('click', T.printPage);
    $('myTools').appendChild(pr);
  }

  /* 本文の問題 */
  function drawBook() {
    if (!document.getElementById('bookBox')) return;
    window.Quiz.choice('bookBox', 'bookNote', [{"k": "ア", "q": "15歳未満人口と小学校数の散布図から読み取れることとして<strong>適当でない</strong>ものは。", "ch": ["小学校数が多い都道府県ほど、15歳未満人口も多い傾向にある", "小学校数が多い都道府県ほど、その小学校に在籍する児童数は必ず多い", "15歳未満の人口が多いほど、小学校数も多くなる傾向にある", "正の相関が見られるが、必ずしも因果関係があるとは限らない"], "a": 1, "why": "散布図から分かるのは<strong>2つの変量の関係</strong>だけ。「1校あたりの児童数」は、この散布図からは読み取れません。「必ず」という言い切りにも注意。"}, {"k": "イ", "q": "年間平均気温と梅の開花観測日の散布図から読み取れることとして<strong>適当でない</strong>ものは。", "ch": ["年間平均気温が高いほど、梅の開花観測日は早い傾向が見られる", "年間平均気温が18℃以上の地点では、梅の開花は2月中までに観測されている", "年間平均気温が24℃以上の地点では、梅の開花観測日は30日以内に収まっている", "梅の開花観測日は年間平均気温に関係なく、ほぼ一定の日数で観測されている"], "a": 3, "why": "散布図には<strong>右下がりの傾向（負の相関）</strong>がはっきり出ています。「関係なく一定」は読み取れません。"}, {"k": "ウ", "q": "「年間平均気温が第3四分位数より大きい」「開花観測日が第3四分位数より大きい」で分けたとき、最も多いのは。", "ch": ["気温が高めで、開花が遅めの地域", "気温が高めで、開花が遅めではない地域", "気温が高めではないが、開花が遅めの地域", "気温が高めではないが、開花が遅めではない地域"], "a": 3, "why": "第3四分位数より大きいのは<strong>全体の4分の1ずつ</strong>。負の相関があるので「気温が高め かつ 開花が遅め」はほとんどなく、逆に<strong>どちらも当てはまらない地域</strong>が最も多くなります。"}], "本文の答えは【ア】①　【イ】③　【ウ】③ です。");
  }

  function init() {
    const box = $('playBox');
    box.addEventListener('mousedown', onDown);
    box.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    document.querySelectorAll('[data-shape]').forEach(b => b.addEventListener('click', () => shape(b.dataset.shape)));
    $('clearPts').addEventListener('click', () => { pts = []; drawPlay(); });
    $('undoPt').addEventListener('click', () => { pts.pop(); drawPlay(); });
    $('showLine').addEventListener('change', drawPlay);
    $('showMean').addEventListener('change', drawPlay);
    $('outX').addEventListener('input', drawOut);
    $('outY').addEventListener('input', drawOut);
    $('qNext').addEventListener('click', () => { qi++; renderQ(); });
    $('qReset').addEventListener('click', startQuiz);
    ['mx', 'my', 'myLine'].forEach(i => $(i).addEventListener('change', calcMine));
    $('calcMine').addEventListener('click', calcMine);
    const shared = T.readShared();
    const initData = (shared && shared.d) ? shared.d : [
      ['1番','2.0','42','6.5'],['2番','3.0','48','7.0'],['3番','3.5','55','6.8'],['4番','4.0','58','6.2'],
      ['5番','4.5','61','6.0'],['6番','5.0','67','5.8'],['7番','5.5','66','6.1'],['8番','6.0','74','5.5'],
      ['9番','6.5','78','5.2'],['10番','7.0','81','5.0'],['11番','7.5','84','4.8'],['12番','8.0','88','4.5']
    ];
    const initHeader = (shared && shared.h) ? shared.h : ['生徒', '学習時間(時間)', '点数(点)', '睡眠時間(時間)'];
    grid = window.DataInput.create($('dataInput'), {
      header: initHeader, data: initData, minRows: 3, onChange: refreshCols
    });
    window.Terms.glossary($('glossBox'), ['相関係数', '共分散', '散布図', '正の相関', '負の相関', '外れ値', '相関関係', '因果関係']);
    shape('pos'); gallery(); drawOut(); startQuiz();
    refreshCols(grid.getData(), grid.getHeader());
    drawBook();
    window.Terms.attach();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
