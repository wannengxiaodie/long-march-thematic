/* ==========================================================================
   万水千山 · 交互与可视化
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* --------------------------------------------------------------
     1. 入场动画
     -------------------------------------------------------------- */
  const revealEls = $$('.reveal');
  revealEls.forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((n) => n.classList.contains('reveal'));
    const i = sibs.indexOf(el);
    el.style.transitionDelay = Math.min(i, 6) * 90 + 'ms';
  });

  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          revealObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  revealEls.forEach((el) => revealObs.observe(el));

  /* --------------------------------------------------------------
     2. 阅读进度 / 目录高亮 / 封面视差
     -------------------------------------------------------------- */
  const readbarFill = $('#readbarFill');
  const tocLinks = $$('.toc a');
  const tocTargets = tocLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);

  const tocObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          tocLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
        }
      });
    },
    { rootMargin: '-45% 0px -45% 0px' }
  );
  tocTargets.forEach((t) => tocObs.observe(t));

  const coverLayers = $$('.cover-parallax [data-depth]');
  let scrollTicking = false;
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      readbarFill.style.width = (docH > 0 ? (y / docH) * 100 : 0) + '%';

      if (y < window.innerHeight * 1.3) {
        coverLayers.forEach((el) => {
          const d = parseFloat(el.dataset.depth || '0');
          el.style.transform = 'translate3d(0,' + y * d + 'px,0)';
        });
      }
      scrollTicking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --------------------------------------------------------------
     3. 路线地图（滚动驱动）
     -------------------------------------------------------------- */
  const mapSection = $('#route');
  const routeMap = $('#routeMap');
  const routePath = $('#routePath');
  const routeBase = $('#routeBase');
  const nodesGroup = $('#routeNodes');
  const mapDot = $('#routeDot');
  const mapDotHalo = $('#routeDotHalo');
  const mapCaption = $('#mapCaption');
  const mapProgressBar = $('#mapProgressBar');

  const PROJECT = { lon0: 99, lonSpan: 19, lat0: 38.5, latSpan: 14, w: 1000, h: 740 };
  const px = (lon) => ((lon - PROJECT.lon0) / PROJECT.lonSpan) * PROJECT.w;
  const py = (lat) => ((PROJECT.lat0 - lat) / PROJECT.latSpan) * PROJECT.h;

  const mapSites = [
    { name: '瑞金', lon: 116.027, lat: 25.886, major: true, dx: -14, dy: -24, anchor: 'end', note: '1934.10.10 中共中央、中革军委机关自瑞金出发' },
    { name: '于都', lon: 115.411, lat: 25.956, major: true, dx: 6, dy: 28, anchor: 'middle', note: '1934.10.17—20 主力集结，于都河八处渡口渡河' },
    { name: '湘江', lon: 111.13, lat: 25.93, major: true, dx: -10, dy: 22, anchor: 'end', note: '1934.11 湘江战役，损失过半' },
    { name: '通道', lon: 109.784, lat: 26.159, major: false, dx: -12, dy: -12, anchor: 'end', note: '1934.12.12 通道会议，转兵贵州' },
    { name: '黎平', lon: 109.136, lat: 26.23, major: false, dx: 10, dy: 30, anchor: 'start', note: '1934.12.18 黎平会议' },
    { name: '遵义', lon: 106.928, lat: 27.725, major: true, dx: -14, dy: -14, anchor: 'end', note: '1935.01 遵义会议，生死攸关的转折点' },
    { name: '赤水', lon: 105.697, lat: 28.59, major: true, dx: -14, dy: 18, anchor: 'end', note: '1935.01—03 四渡赤水的机动区域' },
    { name: '金沙江', lon: 102.55, lat: 26.78, major: true, dx: 16, dy: 18, anchor: 'start', note: '1935.05 皎平渡等渡口渡过金沙江' },
    { name: '泸定桥', lon: 102.235, lat: 29.914, major: true, dx: 14, dy: -16, anchor: 'start', note: '1935.05.29 飞夺泸定桥' },
    { name: '夹金山', lon: 102.84, lat: 30.39, major: false, dx: 14, dy: 34, anchor: 'start', note: '1935.06 翻越第一座大雪山' },
    { name: '懋功', lon: 102.365, lat: 31.002, major: false, dx: -14, dy: -8, anchor: 'end', note: '1935.06.18 中央红军与红四方面军会师' },
    { name: '若尔盖', lon: 102.96, lat: 33.58, major: false, dx: 16, dy: 0, anchor: 'start', note: '1935.08 穿越松潘草地' },
    { name: '腊子口', lon: 103.962, lat: 34.188, major: true, dx: -14, dy: -12, anchor: 'end', note: '1935.09.17 突破腊子口' },
    { name: '哈达铺', lon: 104.218, lat: 34.016, major: false, dx: 16, dy: 20, anchor: 'start', note: '1935.09.18 整编并确定向陕北前进' },
    { name: '吴起', lon: 108.175, lat: 36.927, major: true, dx: 0, dy: -16, anchor: 'middle', note: '1935.10.19 到达吴起镇，落脚陕北' }
  ];

  const mapContextSites = [
    { name: '会宁', lon: 105.052, lat: 35.693, dx: 10, dy: -4, anchor: 'start', note: '1936.10 红一、红四方面军会师' },
    { name: '将台堡', lon: 106.283, lat: 35.67, dx: 10, dy: 16, anchor: 'start', note: '1936.10 红一、红二方面军会师' }
  ];

  function catmullRomPath(points) {
    if (points.length < 2) return '';
    let d = 'M' + points[0][0].toFixed(2) + ' ' + points[0][1].toFixed(2);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) + ',' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) + ',' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
    }
    return d;
  }

  let routeLen = 1;
  let nodeFractions = [];
  let mapInitialized = false;

  function initMap() {
    const pts = mapSites.map((s) => [px(s.lon), py(s.lat)]);
    const d = catmullRomPath(pts);
    routePath.setAttribute('d', d);
    routeBase.setAttribute('d', d);
    routeLen = routePath.getTotalLength();
    routePath.style.strokeDasharray = routeLen + ' 99999';
    routePath.style.strokeDashoffset = routeLen;
    routeBase.style.opacity = '.38';

    // 节点
    mapSites.forEach((s, i) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'route-node' + (s.major ? ' major' : ''));
      const x = px(s.lon);
      const y = py(s.lat);
      const lead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lead.setAttribute('x1', x);
      lead.setAttribute('y1', y);
      lead.setAttribute('x2', x + s.dx * 0.78);
      lead.setAttribute('y2', y + s.dy * 0.78);
      lead.setAttribute('class', 'node-lead');
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', x);
      c.setAttribute('cy', y);
      c.setAttribute('r', s.major ? 5.4 : 3.6);
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', x + s.dx);
      t.setAttribute('y', y + s.dy);
      t.setAttribute('text-anchor', s.anchor);
      t.textContent = s.name;
      g.appendChild(lead);
      g.appendChild(c);
      g.appendChild(t);
      nodesGroup.appendChild(g);
      // 与路径最近的进度位置
      nodeFractions.push(fractionAt(routePath, x, y));
    });

    // 全程结语节点（虚线相连）
    const ctxPts = mapContextSites.map((s) => [px(s.lon), py(s.lat)]);
    const ctxD = catmullRomPath(ctxPts);
    const ctxLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    ctxLine.setAttribute('d', ctxD);
    ctxLine.setAttribute('fill', 'none');
    ctxLine.setAttribute('stroke', '#9b6fb4');
    ctxLine.setAttribute('stroke-opacity', '.45');
    ctxLine.setAttribute('stroke-width', '1.4');
    ctxLine.setAttribute('stroke-dasharray', '5 5');
    routeMap.insertBefore(ctxLine, nodesGroup);
    mapContextSites.forEach((s) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'route-node');
      const x = px(s.lon);
      const y = py(s.lat);
      const lead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lead.setAttribute('x1', x);
      lead.setAttribute('y1', y);
      lead.setAttribute('x2', x + s.dx * 0.78);
      lead.setAttribute('y2', y + s.dy * 0.78);
      lead.setAttribute('class', 'node-lead');
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', x);
      c.setAttribute('cy', y);
      c.setAttribute('r', 3.2);
      c.setAttribute('stroke', '#9b6fb4');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', x + s.dx);
      t.setAttribute('y', y + s.dy);
      t.setAttribute('text-anchor', s.anchor);
      t.setAttribute('fill', '#b391c7');
      t.textContent = s.name;
      g.appendChild(lead);
      g.appendChild(c);
      g.appendChild(t);
      nodesGroup.appendChild(g);
    });

    mapInitialized = true;
    updateMapProgress(computeMapProgress());
  }

  function fractionAt(path, x, y) {
    const n = 500;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i <= n; i++) {
      const p = path.getPointAtLength((i / n) * routeLen);
      const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (d < bestD) { bestD = d; best = i / n; }
    }
    return best;
  }

  function computeMapProgress() {
    if (!mapSection) return 0;
    const rect = mapSection.getBoundingClientRect();
    const total = mapSection.offsetHeight - window.innerHeight;
    return clamp(-rect.top / Math.max(total, 1), 0, 1);
  }

  let lastMapP = -1;
  function updateMapProgress(p) {
    if (!mapInitialized || Math.abs(p - lastMapP) < 0.0006) return;
    lastMapP = p;
    const L = routeLen;
    const drawn = L * p;
    routePath.style.strokeDashoffset = (L - drawn).toFixed(1);
    mapProgressBar.style.width = (p * 100).toFixed(1) + '%';

    const pt = routePath.getPointAtLength(drawn);
    const visible = p > 0.008;
    mapDot.setAttribute('r', visible ? 4.2 : 0);
    mapDotHalo.setAttribute('r', visible ? 9 : 0);
    mapDot.setAttribute('cx', pt.x);
    mapDot.setAttribute('cy', pt.y);
    mapDotHalo.setAttribute('cx', pt.x);
    mapDotHalo.setAttribute('cy', pt.y);

    const nodeEls = $$('.route-node', nodesGroup);
    let activeNote = '';
    mapSites.forEach((s, i) => {
      const lit = p > 0.012 && nodeFractions[i] !== undefined && nodeFractions[i] <= p + 0.02;
      const el = nodeEls[i];
      if (el) el.classList.toggle('lit', lit);
      if (lit) activeNote = s.name + ' · ' + s.note;
    });
    if (activeNote) mapCaption.textContent = activeNote;
  }

  const mapScrollHandler = () => {
    if (!mapSection.getBoundingClientRect) return;
    updateMapProgress(computeMapProgress());
  };

  /* --------------------------------------------------------------
     4. 数字滚动
     -------------------------------------------------------------- */
  function animateNumber(el) {
    const target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    const sep = el.dataset.sep === '1';
    const dur = 1500;
    const start = performance.now();
    const fmt = (v) => (sep ? Math.round(v).toLocaleString('en-US') : Math.round(v).toString());
    function step(now) {
      const t = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(target * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const numObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateNumber(e.target);
          numObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  $$('[data-count]').forEach((el) => numObs.observe(el));

  /* --------------------------------------------------------------
     5. 四渡赤水 · Three.js 三维沙盘
     -------------------------------------------------------------- */
  const stage = $('#chishuiStage');
  const canvas = $('#chishuiCanvas');
  const fallback = $('#webglFallback');

  const STAGES = [
    {
      no: '一渡',
      date: '1935.01.29',
      title: '土城 · 元厚 → 川南',
      text: '土城战斗未能速决，红军于凌晨西渡赤水，改向川南古蔺、叙永地区前进。',
      from: { name: '土城', sub: '1.29 西渡' },
      to: { name: '川南古蔺', sub: '叙永方向' }
    },
    {
      no: '二渡',
      date: '1935.02.18 — 02.21',
      title: '太平渡 · 二郎滩 → 黔北',
      text: '红军回师黔北，再占桐梓、娄山关、遵义，取得长征以来最大的一次胜利。',
      from: { name: '川南', sub: '2.18 东渡' },
      to: { name: '黔北遵义', sub: '娄山关方向' }
    },
    {
      no: '三渡',
      date: '1935.03.16 — 03.17',
      title: '茅台 → 川南',
      text: '红军在茅台及附近渡口西渡赤水，佯装北渡长江，把敌军主力调向川南。',
      from: { name: '茅台', sub: '3.16 西渡' },
      to: { name: '川南', sub: '古蔺方向' }
    },
    {
      no: '四渡',
      date: '1935.03.21 — 03.22',
      title: '太平渡 · 二郎滩 → 乌江',
      text: '红军秘密东渡赤水，南渡乌江，兵锋直指贵阳，跳出数十万敌军的合围。',
      from: { name: '川南', sub: '3.21 东渡' },
      to: { name: '乌江', sub: '贵阳方向' }
    }
  ];

  function initChishui() {
    if (!canvas || !stage) return;
    if (typeof THREE === 'undefined') {
      showFallback();
      return;
    }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err) {
      showFallback();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    // 大气雾：远山偏青灰，拉开纵深
    scene.fog = new THREE.FogExp2(0x39473f, 0.0084);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 220);

    // 光源：主平行光 + 天光，冷调环境里保留一点暖阳
    scene.add(new THREE.AmbientLight(0x64756a, 0.3));
    scene.add(new THREE.HemisphereLight(0x91a698, 0x0d120c, 0.32));
    const sun = new THREE.DirectionalLight(0xf2f0e2, 1.05);
    sun.position.set(-30, 36, 14);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x54747a, 0.26);
    fill.position.set(26, 12, -20);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xb23a2c, 0.28);
    rim.position.set(0, 10, -40);
    scene.add(rim);
    const front = new THREE.DirectionalLight(0xbccfc4, 0.14);
    front.position.set(12, 18, 40);
    scene.add(front);

    /* ---------- 地形 ---------- */
    const SIZE_X = 64;
    const SIZE_Z = 46;
    const isNarrow = window.matchMedia('(max-width: 760px)').matches;
    const NX = isNarrow ? 152 : 220;
    const NZ = isNarrow ? 110 : 160;

    function hash2(x, y) {
      const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
      return s - Math.floor(s);
    }
    function vnoise(x, y) {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const xf = x - xi;
      const yf = y - yi;
      const u = xf * xf * (3 - 2 * xf);
      const v = yf * yf * (3 - 2 * yf);
      const a = hash2(xi, yi);
      const b = hash2(xi + 1, yi);
      const c = hash2(xi, yi + 1);
      const d = hash2(xi + 1, yi + 1);
      return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
    }
    function fbm(x, y, oct) {
      let val = 0;
      let amp = 0.5;
      let fr = 1;
      for (let i = 0; i < (oct || 3); i++) {
        val += amp * vnoise(x * fr, y * fr);
        fr *= 2.03;
        amp *= 0.5;
      }
      return val;
    }
    function ridged(x, y, oct) {
      let val = 0;
      let amp = 0.55;
      let fr = 1;
      for (let i = 0; i < (oct || 4); i++) {
        const n = 1 - Math.abs(2 * vnoise(x * fr, y * fr) - 1);
        val += amp * n * n;
        fr *= 2.05;
        amp *= 0.48;
      }
      return val;
    }

    // 赤水河：一条自西向东横贯场地的曲线
    const riverPts = [
      [-34, -4], [-27, -1.4], [-20, -3.2], [-13.5, -0.2], [-8, -2.4],
      [-2.4, -1.2], [3.6, -3.0], [10, -1.1], [16.2, -3.2], [23, -1.4], [34, -3.4]
    ];
    const riverCurve = new THREE.CatmullRomCurve3(
      riverPts.map((p) => new THREE.Vector3(p[0], 0, p[1])),
      false,
      'catmullrom',
      0.4
    );
    const riverSamples = [];
    for (let i = 0; i <= 220; i++) {
      const v = riverCurve.getPointAt(i / 220);
      riverSamples.push([v.x, v.z]);
    }

    function distToRiver(x, z) {
      let best = Infinity;
      for (let i = 0; i < riverSamples.length; i++) {
        const dx = x - riverSamples[i][0];
        const dz = z - riverSamples[i][1];
        const d = dx * dx + dz * dz;
        if (d < best) best = d;
      }
      return Math.sqrt(best);
    }

    function terrainH(x, z) {
      let h = (fbm(x * 0.042 + 7.3, z * 0.05 + 2.1, 3) - 0.46) * 11;
      h += (ridged(x * 0.044 + 2.4, z * 0.056 + 5.6, 4) - 0.55) * 8.6;
      h += (fbm(x * 0.2 + 1.2, z * 0.21 + 4.8, 2) - 0.5) * 2.2;
      // 河谷下切（较宽的谷地，保证河道可见）
      const d = distToRiver(x, z);
      h -= 8.6 * Math.exp(-(d * d) / 30);
      h = Math.max(h, -4.5);
      // 场地边缘略高，像沙盘围边
      const edge = Math.max(Math.abs(x) / SIZE_X, Math.abs(z) / SIZE_Z);
      h += edge * edge * 2.4;
      return h;
    }

    const geo = new THREE.PlaneGeometry(SIZE_X, SIZE_Z, NX, NZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainH(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();

    // 按高程 + 坡度分层：河谷青灰、山腰墨绿、高处石青，裸岩赭石点缀
    const colors = [];
    const cValley = new THREE.Color(0x2b4636);
    const cBank = new THREE.Color(0x3a533f);
    const cMid = new THREE.Color(0x1b3626);
    const cMidHigh = new THREE.Color(0x22422b);
    const cStone = new THREE.Color(0x384a40);
    const cRock = new THREE.Color(0x56452d);
    const sunDir = new THREE.Vector3(-0.42, 0.72, 0.30).normalize();
    const nrm = geo.attributes.normal;
    const ss = (a, b, v) => {
      const t = clamp((v - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    };

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = pos.getY(i);
      const e = clamp((h + 4.5) / 16.5, 0, 1);
      const nx = nrm.getX(i);
      const ny = nrm.getY(i);
      const nz = nrm.getZ(i);
      const slope = Math.min(2.4, Math.hypot(nx, nz) / Math.max(ny, 0.08));
      const d = distToRiver(x, z);

      const c = cValley.clone();
      c.lerp(cBank, clamp(1 - d / 9, 0, 1) * 0.7);
      c.lerp(cMid, ss(0.16, 0.52, e));
      c.lerp(cMidHigh, ss(0.5, 0.78, e));
      c.lerp(cStone, ss(0.72, 1.0, e));
      c.lerp(cStone, clamp((slope - 0.9) / 1.2, 0, 1) * 0.55);

      // 陡峭高处才会露出赭石色山脊，控制面积，避免整体发黄
      const rock = clamp((slope - 1.15) * 0.8, 0, 1) * (0.25 + 0.55 * ss(0.45, 0.85, e));
      if (rock > 0.02) c.lerp(cRock, Math.min(rock, 0.55));

      // 方向光烘焙明暗，背阴压深、向阳提亮
      const dot = Math.max(0, nx * sunDir.x + ny * sunDir.y + nz * sunDir.z);
      let shade = 0.3 + dot * 0.4 + (e - 0.5) * 0.06;
      shade *= 0.93 + hash2(i * 0.37, i * 1.13) * 0.14;
      c.multiplyScalar(shade);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const terrain = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.94,
        metalness: 0.02,
        flatShading: false
      })
    );
    scene.add(terrain);

    // 沙盘底座
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(SIZE_X + 2.4, 3.2, SIZE_Z + 2.4),
      new THREE.MeshStandardMaterial({ color: 0x171008, roughness: 1, metalness: 0 })
    );
    plinth.position.y = -9.2;
    scene.add(plinth);

    const rimLine = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(SIZE_X + 2.4, 0.1, SIZE_Z + 2.4)),
      new THREE.LineBasicMaterial({ color: 0x7c8a72, transparent: true, opacity: 0.26 })
    );
    rimLine.position.y = -7.6;
    scene.add(rimLine);

    /* ---------- 河流 ---------- */
    // 横截面细分，让水面贴合谷底，避免被河谷坡面遮住
    function ribbonGeometry(curve, halfWidth, yOffset, samples, across) {
      const n = samples || 240;
      const ac = across || 6;
      const positions = [];
      const indices = [];
      const uvs = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t);
        const nx = -tan.z;
        const nz = tan.x;
        const w = halfWidth * (0.72 + 0.4 * Math.sin(t * 9.2 + 1.4));
        for (let j = 0; j <= ac; j++) {
          const s = (j / ac) * 2 - 1;
          const x = p.x + nx * w * s;
          const z = p.z + nz * w * s;
          positions.push(x, terrainH(x, z) + yOffset, z);
          uvs.push(j / ac, t);
        }
      }
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < ac; j++) {
          const a = i * (ac + 1) + j;
          const b = a + 1;
          const c = a + ac + 1;
          const d = c + 1;
          indices.push(a, b, c, b, d, c);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(indices);
      g.computeVertexNormals();
      return g;
    }

    // 河岸浅滩：比河面更宽的半透明带，让水岸过渡不生硬
    const riverShallow = new THREE.Mesh(
      ribbonGeometry(riverCurve, 4.1, 0.42),
      new THREE.MeshBasicMaterial({ color: 0x4a6859, transparent: true, opacity: 0.3, depthWrite: false })
    );
    scene.add(riverShallow);

    const riverMesh = new THREE.Mesh(
      ribbonGeometry(riverCurve, 2.7, 1.1),
      new THREE.MeshStandardMaterial({
        color: 0x24514b,
        emissive: 0x1f5046,
        emissiveIntensity: 0.42,
        roughness: 0.26,
        metalness: 0.3,
        transparent: true,
        opacity: 0.94
      })
    );
    scene.add(riverMesh);

    const riverGlow = new THREE.Mesh(
      ribbonGeometry(riverCurve, 0.85, 1.18),
      new THREE.MeshBasicMaterial({ color: 0x8cc6b4, transparent: true, opacity: 0.22 })
    );
    scene.add(riverGlow);

    /* ---------- 渡口 ---------- */
    function riverZatX(x) {
      let best = Infinity;
      let z = 0;
      for (let i = 0; i < riverSamples.length; i++) {
        const d = Math.abs(riverSamples[i][0] - x);
        if (d < best) { best = d; z = riverSamples[i][1]; }
      }
      return z;
    }

    const ferries = [
      { id: 'tucheng', name: '土城', sub: '一渡 · 1.29', x: -13.6, stage: 0, ly: 1.9 },
      { id: 'yuanhou', name: '元厚', sub: '一渡 · 1.29', x: -9.0, stage: 0, ly: 3.2 },
      { id: 'erlang', name: '二郎滩', sub: '二渡 / 四渡', x: 3.4, stage: 1, ly: 4.4 },
      { id: 'taiping', name: '太平渡', sub: '二渡 / 四渡', x: 6.8, stage: 1, ly: 2.4 },
      { id: 'maotai', name: '茅台', sub: '三渡 · 3.16', x: 11.6, stage: 2, ly: 3.2 },
      { id: 'jiuxi', name: '九溪口', sub: '四渡 · 3.21', x: 15.0, stage: 3, noLabel: true }
    ].map((f) => {
      const z = riverZatX(f.x);
      return Object.assign(f, { x: f.x, z, y: terrainH(f.x, z) + 1.35 });
    });

    const ferryGroup = new THREE.Group();
    ferries.forEach((f) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.75, 0.09, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0xc9a961, transparent: true, opacity: 0.55 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(f.x, f.y + 0.5, f.z);
      ferryGroup.add(ring);

      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 2.2, 5),
        new THREE.MeshBasicMaterial({ color: 0xa8774a, transparent: true, opacity: 0.5 })
      );
      mast.position.set(f.x, f.y + 0.9, f.z);
      ferryGroup.add(mast);
    });
    scene.add(ferryGroup);

    /* ---------- 四渡路线 ---------- */
    function pathHeight(x, z) {
      return Math.max(terrainH(x, z) + 0.65, 1.75);
    }

    const ROUTES = [
      {
        no: 1, color: 0x86241b,
        pts: [[-15.8, 2.6], [-14.6, 1.2], [-13.6, 0.5], [-13.0, -2.6], [-14.8, -5.2], [-15.6, -6.2]],
        startLabel: null,
        endLabel: { name: '川南古蔺', sub: '叙永方向', at: [-15.0, -5.7] }
      },
      {
        no: 2, color: 0x9c2c20,
        pts: [[-2.6, -7.4], [-0.4, -4.4], [3.4, -0.5], [5.2, 2.4], [7.6, 5.6], [9.4, 7.2]],
        startLabel: { name: '川南', sub: '2.18 东渡', at: [-1.6, -6.6] },
        endLabel: { name: '黔北遵义', sub: '娄山关方向', at: [8.8, 8.2] }
      },
      {
        no: 3, color: 0x84231a,
        pts: [[14.2, 8.0], [13.2, 4.2], [11.6, 0.6], [10.4, -3.4], [7.4, -8.0]],
        startLabel: null,
        endLabel: { name: '川南', sub: '古蔺方向', at: [7.4, -8.2] }
      },
      {
        no: 4, color: 0x992b1f,
        pts: [[5.6, -8.6], [6.4, -4.4], [6.8, -1.2], [8.6, 2.4], [5.0, 6.0], [2.6, 9.4]],
        startLabel: { name: '川南', sub: '3.21 东渡', at: [5.8, -8.0] },
        endLabel: { name: '乌江', sub: '贵阳方向', at: [2.4, 9.0] }
      }
    ];

    // 红色立体箭头：沿路径生成带厚度的渐细箭身，箭头用四棱锥，指向前进方向
    const ARROW_SEGS = 132;
    function buildArrowShaft(curve, samples) {
      const n = samples || ARROW_SEGS;
      const positions = [];
      const indices = [];
      const halfTail = 0.64;
      const halfTip = 0.36;
      const thick = 0.52;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t);
        let nx = -tan.z;
        let nz = tan.x;
        const nl = Math.hypot(nx, nz) || 1;
        nx /= nl;
        nz /= nl;
        const half = halfTip + (halfTail - halfTip) * Math.pow(1 - t, 0.6);
        const y = pathHeight(p.x, p.z) + 0.62;
        positions.push(
          p.x + nx * half, y + thick / 2, p.z + nz * half,
          p.x - nx * half, y + thick / 2, p.z - nz * half,
          p.x - nx * half, y - thick / 2, p.z - nz * half,
          p.x + nx * half, y - thick / 2, p.z + nz * half
        );
      }
      for (let i = 0; i < n; i++) {
        const a = i * 4;
        const b = a + 4;
        // 上、右、下、左四个面，每段 24 个索引，按路径顺序排列以便生长
        indices.push(
          a, b, a + 1, a + 1, b, b + 1,
          a + 1, b + 1, a + 2, a + 2, b + 1, b + 2,
          a + 2, b + 2, a + 3, a + 3, b + 2, b + 3,
          a + 3, b + 3, a, a, b + 3, b
        );
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      return g;
    }

    // 箭头头部：平铺的三棱箭镞，从任何方向都能看清指向
    function buildArrowHead() {
      const W = 1.35;
      const L = 2.8;
      const top = 0.55;
      const bot = -0.02;
      const verts = [
        0, top, L,        // 0 顶尖
        -W, top, 0,       // 1 左后
        W, top, 0,        // 2 右后
        0, bot, L,        // 3 底尖
        -W, bot, 0,       // 4 左下
        W, bot, 0         // 5 右下
      ];
      const idx = [
        0, 2, 1,          // 上表面
        3, 4, 5,          // 下表面
        0, 1, 3, 1, 4, 3, // 左侧面
        0, 3, 2, 2, 3, 5  // 右侧面
      ];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }
    const arrowHeadGeo = buildArrowHead();

    const routeObjs = ROUTES.map((r) => {
      const vecs = r.pts.map((p) => new THREE.Vector3(p[0], pathHeight(p[0], p[1]), p[1]));
      const curve = new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0.35);
      const shaftGeo = buildArrowShaft(curve, ARROW_SEGS);
      const shaft = new THREE.Mesh(
        shaftGeo,
        new THREE.MeshStandardMaterial({
          color: r.color,
          emissive: 0x5f1712,
          emissiveIntensity: 0.55,
          roughness: 0.4,
          metalness: 0.14,
          flatShading: true,
          side: THREE.DoubleSide
        })
      );
      shaft.visible = false;
      shaftGeo.setDrawRange(0, 0);
      scene.add(shaft);

      // 立体箭头头部
      const head = new THREE.Mesh(
        arrowHeadGeo,
        new THREE.MeshStandardMaterial({
          color: r.color,
          emissive: 0x7a1e15,
          emissiveIntensity: 0.7,
          roughness: 0.34,
          metalness: 0.12,
          flatShading: true,
          side: THREE.DoubleSide
        })
      );
      head.visible = false;
      scene.add(head);

      // 头部尖兵光点
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe2b8 })
      );
      dot.visible = false;
      scene.add(dot);

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xd1533f, transparent: true, opacity: 0.16, depthWrite: false })
      );
      halo.visible = false;
      scene.add(halo);

      // 起终点标记
      const ends = [vecs[0], vecs[vecs.length - 1]].map((v) => {
        const m = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.3, 0),
          new THREE.MeshBasicMaterial({ color: 0xf0d6a8 })
        );
        m.position.copy(v);
        m.visible = false;
        scene.add(m);
        return m;
      });

      return {
        def: r,
        curve,
        shaft,
        segCount: ARROW_SEGS,
        head,
        dot,
        halo,
        ends,
        length: curve.getLength(),
        tan: new THREE.Vector3(),
        headPos: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        up: new THREE.Vector3(0, 1, 0)
      };
    });

    /* ---------- 标签 ---------- */
    const labelLayer = $('#chishuiLabels');
    const labelEls = [];
    function makeLabel(name, sub, kind, stageIdx) {
      const el = document.createElement('div');
      el.className = 'ferry-label' + (kind === 'ferry' ? ' is-ferry' : ' is-terminal');
      el.innerHTML = '<b></b><small></small>';
      el.querySelector('b').textContent = name;
      el.querySelector('small').textContent = sub;
      el.dataset.kind = kind;
      el.dataset.stage = String(stageIdx);
      labelLayer.appendChild(el);
      return el;
    }
    ferries.filter((f) => !f.noLabel).forEach((f) => {
      labelEls.push({ el: makeLabel(f.name, f.sub, 'ferry', f.stage), pos: new THREE.Vector3(f.x, f.y + (f.ly || 1.9), f.z), kind: 'ferry', stage: f.stage });
    });
    ROUTES.forEach((r, i) => {
      if (r.startLabel) {
        const s = new THREE.Vector3(r.startLabel.at[0], pathHeight(r.startLabel.at[0], r.startLabel.at[1]) + 1.3, r.startLabel.at[1]);
        labelEls.push({ el: makeLabel(r.startLabel.name, r.startLabel.sub, 'terminal', i), pos: s, kind: 'terminal', stage: i });
      }
      if (r.endLabel) {
        const e = new THREE.Vector3(r.endLabel.at[0], pathHeight(r.endLabel.at[0], r.endLabel.at[1]) + 1.3, r.endLabel.at[1]);
        labelEls.push({ el: makeLabel(r.endLabel.name, r.endLabel.sub, 'terminal', i), pos: e, kind: 'terminal', stage: i });
      }
    });

    /* ---------- 相机轨道 ---------- */
    const cam = {
      theta: -0.35,
      phi: 0.88,
      radius: 46,
      tx: 0,
      ty: 0.6,
      tz: -1,
      auto: true,
      dragging: false,
      px: 0,
      py: 0
    };
    function applyCamera() {
      const sp = Math.sin(cam.phi);
      camera.position.set(
        cam.tx + cam.radius * sp * Math.sin(cam.theta),
        cam.ty + cam.radius * Math.cos(cam.phi),
        cam.tz + cam.radius * sp * Math.cos(cam.theta)
      );
      camera.lookAt(cam.tx, cam.ty, cam.tz);
    }
    applyCamera();

    const btnRotate = $('#btnRotate');
    if (btnRotate) {
      btnRotate.addEventListener('click', () => {
        cam.auto = !cam.auto;
        btnRotate.setAttribute('aria-pressed', cam.auto ? 'true' : 'false');
      });
    }

    const zoomStep = (d) => {
      cam.radius = clamp(cam.radius + d, 25, 60);
      applyCamera();
    };
    const zin = $('#btnZoomIn');
    const zout = $('#btnZoomOut');
    if (zin) zin.addEventListener('click', () => zoomStep(-4));
    if (zout) zout.addEventListener('click', () => zoomStep(4));

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        cam.radius = clamp(cam.radius + (e.deltaY > 0 ? 3 : -3), 25, 60);
        applyCamera();
      },
      { passive: false }
    );

    const onPointerDown = (e) => {
      cam.dragging = true;
      cam.px = e.clientX;
      cam.py = e.clientY;
      if (cam.auto) {
        cam.auto = false;
        if (btnRotate) btnRotate.setAttribute('aria-pressed', 'false');
      }
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!cam.dragging) return;
      const dx = e.clientX - cam.px;
      const dy = e.clientY - cam.py;
      cam.px = e.clientX;
      cam.py = e.clientY;
      cam.theta -= dx * 0.006;
      cam.phi = clamp(cam.phi - dy * 0.004, 0.42, 1.32);
      applyCamera();
    };
    const onPointerUp = () => {
      cam.dragging = false;
      if (btnRotate && !cam.auto) btnRotate.setAttribute('aria-pressed', 'false');
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    /* ---------- 播放控制 ---------- */
    let stageIdx = 0;
    let stageProgress = 0;
    let playing = false;
    let stageStart = 0;
    let stageIndexAtStart = 0;
    let startedOnce = false;
    const DURATIONS = [2500, 2500, 2300, 2600];
    const GAP = 650;
    const totalDuration = DURATIONS.reduce((a, b) => a + b, 0) + GAP * 3;

    const btnPlay = $('#btnPlay');
    const caption = $('#chishuiCaption');
    const tlFill = $('#tlFill');
    const stops = $$('#tlStops button');
    const ferryItems = $$('#ferryList li');

    function setStageCaption(i) {
      const s = STAGES[i];
      if (!caption) return;
      caption.classList.add('fade');
      setTimeout(() => {
        caption.querySelector('.cap-date').textContent = s.date;
        caption.querySelector('h3').innerHTML = '<span class="cap-no">' + s.no + '</span>' + s.title;
        caption.querySelector('.cap-text').textContent = s.text;
        caption.classList.remove('fade');
      }, 150);
      stops.forEach((b, k) => {
        b.classList.toggle('active', k === i);
        b.classList.toggle('done', k < i);
      });
      ferryItems.forEach((li, k) => {
        li.classList.toggle('active', k === i);
        li.classList.toggle('done', k < i);
      });
      labelEls.forEach((l) => {
        const on = l.kind === 'ferry' ? true : l.stage === i;
        l.el.style.opacity = on ? '1' : '0';
      });
    }

    function setStage(i, instant) {
      stageIdx = clamp(i, 0, 3);
      stageProgress = instant ? 1 : 0;
      playing = false;
      if (btnPlay) {
        btnPlay.querySelector('span').textContent = '重播四渡';
        btnPlay.querySelector('i').textContent = '▶';
      }
      setStageCaption(stageIdx);
      renderRoutes();
    }

    function renderRoutes() {
      routeObjs.forEach((r, i) => {
        let prog = 0;
        if (i < stageIdx) prog = 1;
        else if (i === stageIdx) prog = stageProgress;
        const vis = prog > 0.001;
        r.shaft.visible = vis;
        r.ends.forEach((m) => { m.visible = vis; });
        r.shaft.geometry.setDrawRange(0, Math.floor(r.segCount * prog) * 24);

        const headOn = prog > 0.02;
        r.head.visible = headOn;
        r.dot.visible = headOn;
        r.halo.visible = headOn;
        if (headOn) {
          const t = clamp(prog, 0.01, 0.999);
          const p = r.curve.getPointAt(t);
          const tan = r.curve.getTangentAt(t);
          r.tan.copy(tan).normalize();
          r.head.position.set(
            p.x - r.tan.x * 0.2,
            pathHeight(p.x, p.z) + 0.58,
            p.z - r.tan.z * 0.2
          );
          r.head.rotation.y = Math.atan2(r.tan.x, r.tan.z);
          r.dot.position.set(
            p.x + r.tan.x * 3.2,
            pathHeight(p.x, p.z) + 0.9,
            p.z + r.tan.z * 3.2
          );
          r.halo.position.copy(r.dot.position);
          const pulse = 1 + Math.sin(performance.now() * 0.0026) * 0.18;
          r.halo.scale.setScalar(pulse);
        }
      });
      if (tlFill) {
        const pct = ((stageIdx + (playing ? stageProgress : 1)) / 4) * 100;
        tlFill.style.width = clamp(pct, 0, 100).toFixed(1) + '%';
      }
    }

    function startPlayback() {
      playing = true;
      stageIdx = 0;
      stageIndexAtStart = 0;
      stageStart = performance.now();
      stageProgress = 0;
      setStageCaption(0);
      if (btnPlay) {
        btnPlay.querySelector('span').textContent = '暂停四渡';
        btnPlay.querySelector('i').textContent = '❚❚';
      }
      renderRoutes();
    }

    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        if (playing) {
          playing = false;
          btnPlay.querySelector('span').textContent = '继续播放';
          btnPlay.querySelector('i').textContent = '▶';
        } else {
          startPlayback();
        }
      });
    }

    stops.forEach((b) => {
      b.addEventListener('click', () => setStage(parseInt(b.dataset.stage, 10), true));
    });
    ferryItems.forEach((li) => {
      li.addEventListener('click', () => setStage(parseInt(li.dataset.stage, 10), true));
    });

    let lastCaptionStage = 0;

    function updatePlayback(now) {
      if (!playing) return;
      let t = now - stageStart;
      let idx = 0;
      let acc = 0;
      for (let i = 0; i < DURATIONS.length; i++) {
        if (t < acc + DURATIONS[i]) { idx = i; stageProgress = (t - acc) / DURATIONS[i]; stageIdx = i; break; }
        acc += DURATIONS[i];
        if (t < acc + GAP) { idx = i; stageProgress = 1; stageIdx = i; break; }
        acc += GAP;
      }
      if (idx !== stageIndexAtStart) { stageIndexAtStart = idx; }
      if (t >= totalDuration) {
        playing = false;
        stageIdx = 3;
        stageProgress = 1;
        if (btnPlay) {
          btnPlay.querySelector('span').textContent = '重播四渡';
          btnPlay.querySelector('i').textContent = '▶';
        }
      }
      if (stageIdx !== lastCaptionStage) {
        lastCaptionStage = stageIdx;
        setStageCaption(stageIdx);
      }
      renderRoutes();
    }

    /* ---------- 渲染循环 ---------- */
    let visible = false;
    let rafId = 0;
    let lastTime = 0;

    function projectLabels() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const v = new THREE.Vector3();
      labelEls.forEach((l) => {
        v.copy(l.pos).project(camera);
        const onScreen = v.z < 1 && v.x > -0.9 && v.x < 0.9 && v.y > -1.0 && v.y < 0.92;
        if (!onScreen) { l.el.style.visibility = 'hidden'; return; }
        l.el.style.visibility = 'visible';
        l.el.style.left = (v.x * 0.5 + 0.5) * w + 'px';
        l.el.style.top = (-v.y * 0.5 + 0.5) * h + 'px';
      });
    }

    function frame(now) {
      if (!visible) { rafId = 0; return; }
      rafId = requestAnimationFrame(frame);
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;

      if (cam.auto && !cam.dragging) {
        cam.theta += dt * 0.00006;
        applyCamera();
      }
      // 相机目标缓慢跟随当前渡口
      if (!cam.dragging) {
        const f = ferries[Math.min(stageIdx, 2)];
        cam.tx += ((f.x * 0.28) - cam.tx) * 0.02;
        cam.ty += (0.8 - cam.ty) * 0.02;
        applyCamera();
      }

      updatePlayback(now);
      if (playing) renderRoutes();
      projectLabels();
      renderer.render(scene, camera);
    }

    const stageObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          visible = e.isIntersecting;
          if (visible) {
            lastTime = performance.now();
            if (!startedOnce) {
              startedOnce = true;
              startPlayback();
            }
            if (!rafId) frame(performance.now());
          }
        });
      },
      { threshold: 0.3 }
    );
    stageObs.observe(stage);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { /* rAF 自然暂停 */ }
    });

    function resize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // 窄屏时拉远一点，避免裁切
      if (w < 720) cam.radius = Math.max(cam.radius, 48);
      camera.updateProjectionMatrix();
      applyCamera();
    }
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(canvas.parentElement);
    } else {
      window.addEventListener('resize', resize);
    }
    resize();

    setStageCaption(0);
    renderRoutes();
    rafId = requestAnimationFrame(frame);

    // 暴露给调试
    window.__chishui = {
      startPlayback,
      setStage,
      get state() { return { stageIdx, stageProgress, playing }; }
    };
  }

  function showFallback() {
    if (fallback) fallback.hidden = false;
    if (canvas) canvas.style.display = 'none';
    const cap = $('#chishuiCaption');
    const ctl = $('.chishui-controls');
    if (cap) cap.style.display = 'none';
    if (ctl) ctl.style.display = 'none';
  }

  /* --------------------------------------------------------------
     6. 启动
     -------------------------------------------------------------- */
  function boot() {
    initMap();
    initChishui();
    window.addEventListener('scroll', mapScrollHandler, { passive: true });
    window.addEventListener('resize', mapScrollHandler);
    mapScrollHandler();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
