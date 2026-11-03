(() => {
  'use strict';

  const root = document.documentElement;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const svgEl = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduced;

  /* ---------- Plain page behaviour: works with or without the motion layer ---------- */

  $('#year').textContent = new Date().getFullYear();

  const nav = $('#nav');
  const navToggle = $('#navToggle');
  const setNav = open => {
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    root.style.overflow = open ? 'hidden' : '';
  };
  navToggle.addEventListener('click', () => setNav(navToggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setNav(false); });

  // In-page links land on the pinned section's real start, which a plain anchor jump can miss.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    setNav(false);
    let top = target.id === 'top' ? 0 : target.getBoundingClientRect().top + scrollY;
    if (hasGsap) {
      const st = ScrollTrigger.getAll().find(t => t.pin && (t.pin === target || t.trigger === target));
      if (st) top = st.start;
    }
    scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', a.getAttribute('href'));
  });

  // Contact form: this is a static site, so it hands the message to the visitor's email app.
  const form = $('#contactForm');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const f = form.elements;
    const subject = f.subject.value.trim() || `Project enquiry from ${f.name.value.trim()}`;
    const body = `${f.message.value}\n\nFrom: ${f.name.value} <${f.email.value}>`;
    location.href = `mailto:gmcloud45@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $('#formNote').textContent = 'Your email app should now be open with your message. If nothing happened, write to gmcloud45@gmail.com directly.';
  });

  // Project detail dialog
  const pd = $('#pd');
  const pdImg = $('#pdImg');
  const pdThumbs = $('#pdThumbs');
  function openProject(card) {
    const title = $('strong', card).textContent;
    const images = card.dataset.images.split('|');
    const show = src => {
      pdImg.src = src;
      pdImg.alt = `${title} screenshot`;
      $$('button', pdThumbs).forEach(b => b.setAttribute('aria-current', String(b.dataset.src === src)));
    };
    $('#pdTitle').textContent = title;
    $('#pdCat').textContent = $('.pcard__cat', card).textContent;
    $('#pdDesc').textContent = $('.pcard__desc', card).textContent;
    $('#pdStack').textContent = $('.pcard__stack', card).textContent;
    const link = $('#pdLink');
    link.hidden = !card.dataset.link;
    if (card.dataset.link) link.href = card.dataset.link;
    pdThumbs.textContent = '';
    if (images.length > 1) {
      images.forEach((src, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.src = src;
        b.setAttribute('aria-label', `Show screenshot ${i + 1} of ${images.length}`);
        const im = document.createElement('img');
        im.src = src;
        im.alt = '';
        b.appendChild(im);
        b.addEventListener('click', () => show(src));
        pdThumbs.appendChild(b);
      });
    }
    show(images[0]);
    document.body.style.paddingRight = (innerWidth - root.clientWidth) + 'px';
    root.style.overflow = 'hidden';
    pd.showModal();
    if (motion) gsap.fromTo('.pd__panel', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: 'power3.out' });
  }
  pd.addEventListener('close', () => { root.style.overflow = ''; document.body.style.paddingRight = ''; });
  $('#pdClose').addEventListener('click', () => pd.close());
  pd.addEventListener('click', e => { if (e.target === pd) pd.close(); });
  $$('.pcard').forEach(card => $('.pcard__open', card).addEventListener('click', () => openProject(card)));
  $$('.reel__item').forEach(item => $('.reel__visual', item).addEventListener('click', () => openProject($('#' + item.dataset.open))));

  // Project filter
  const cards = $$('.pcard');
  $('#chips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    $$('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
    const cat = chip.dataset.filter;
    const apply = () => cards.forEach(c => { c.hidden = !(cat === 'all' || c.dataset.cat === cat); });
    const finish = () => {
      $('#indexCount').textContent = cards.filter(c => !c.hidden).length;
      if (hasGsap) ScrollTrigger.refresh();
    };
    if (motion && window.Flip) {
      const state = Flip.getState(cards);
      apply();
      Flip.from(state, {
        duration: .65, ease: 'power3.inOut', stagger: .015, absolute: true, simple: true,
        onEnter: els => gsap.fromTo(els, { opacity: 0, scale: .94 }, { opacity: 1, scale: 1, duration: .45, delay: .15 }),
        onLeave: els => gsap.to(els, { opacity: 0, scale: .94, duration: .3 }),
        onComplete: finish
      });
    } else { apply(); finish(); }
  });

  /* ---------- System diagrams ---------- */

  const pathHV = (x1, y1, x2, y2, mx, r = 10) => {
    if (Math.abs(y2 - y1) < 1) return `M${x1} ${y1}H${x2}`;
    const s = y2 > y1 ? 1 : -1;
    r = Math.min(r, Math.abs(y2 - y1) / 2, Math.abs(mx - x1), Math.abs(x2 - mx));
    return `M${x1} ${y1}H${mx - r}Q${mx} ${y1} ${mx} ${y1 + s * r}V${y2 - s * r}Q${mx} ${y2} ${mx + r} ${y2}H${x2}`;
  };
  const pathVH = (x1, y1, x2, y2, my, r = 10) => {
    if (Math.abs(x2 - x1) < 1) return `M${x1} ${y1}V${y2}`;
    const s = x2 > x1 ? 1 : -1;
    r = Math.min(r, Math.abs(x2 - x1) / 2, Math.abs(my - y1), Math.abs(y2 - my));
    return `M${x1} ${y1}V${my - r}Q${x1} ${my} ${x1 + s * r} ${my}H${x2 - s * r}Q${x2} ${my} ${x2} ${my + r}V${y2}`;
  };

  const SCENES = {
    tgi: {
      cols: [
        [{ id: 'stores', t: '200+ stores' }, { id: 'corp', t: 'Corporate offices', s: 'Corporate' }],
        [{ id: 'ctrl', t: 'Business process', sub: 'Risk and control', s2: 'Risk and control', hub: 1 }],
        [{ id: 'pos', t: 'POS and sales', s: 'POS' }, { id: 'acc', t: 'Accounting', s: 'Acctg.' }, { id: 'stk', t: 'Inventory', s: 'Stock' }, { id: 'dat', t: 'Data analytics', s: 'Data' }, { id: 'rew', t: 'Rewards app', s: 'Rewards' }]
      ],
      routes: [['stores', 'ctrl', 'pos'], ['corp', 'ctrl', 'acc'], ['stores', 'ctrl', 'stk'], ['corp', 'ctrl', 'dat'], ['stores', 'ctrl', 'rew']]
    },
    serve: {
      cols: [
        [{ id: 'm1', t: 'Lab machine' }, { id: 'm2', t: 'Lab machine' }, { id: 'm3', t: 'Lab machine' }],
        [{ id: 'lis', t: 'LIS', sub: 'Lab information system', s2: 'Lab info system', hub: 1 }],
        [{ id: 'res', t: 'Patient results' }],
        [{ id: 'c1', t: 'Qualicare' }, { id: 'c2', t: 'Philcare' }, { id: 'c3', t: 'Government' }]
      ],
      routes: [['m1', 'lis', 'res', 'c1'], ['m2', 'lis', 'res', 'c2'], ['m3', 'lis', 'res', 'c3']]
    },
    infinite: {
      cols: [
        [{ id: 'i1', t: 'Manufacturing', s: 'Mfg.' }, { id: 'i2', t: 'Retail' }, { id: 'i3', t: 'Construction' }, { id: 'i4', t: 'Medical' }],
        [{ id: 'erp', t: 'Custom ERP', hub: 1 }],
        [{ id: 'o1', t: 'Purchasing' }, { id: 'o2', t: 'Inventory' }, { id: 'o3', t: 'Sales' }, { id: 'o4', t: 'Receivables' }]
      ],
      routes: [['i1', 'erp', 'o1'], ['i2', 'erp', 'o3'], ['i3', 'erp', 'o2'], ['i4', 'erp', 'o4']]
    },
    optical: {
      field: { t: '200+ branches', rows: 12, cols: 8 },
      cols: [
        [],
        [{ id: 'ticket', t: 'Ticketing system', s2: 'Ticketing', hub: 1 }],
        [{ id: 'support', t: 'Technical support', s: 'Tech support' }]
      ],
      routes: []
    },
    asiapro: {
      cols: [
        [{ id: 'bill', t: 'Billing' }, { id: 'inv', t: 'Inventory' }],
        [{ id: 'coll', t: 'Collection' }, { id: 'ret', t: 'Retail' }],
        [{ id: 'bcms', t: 'BCMS', hub: 1 }, { id: 'asp', t: 'ASPIRE', hub: 1 }],
        [{ id: 'a', t: 'Alaska Milk', s: 'Alaska' }, { id: 'b', t: 'SYSU Intl.', s: 'SYSU' }, { id: 'c', t: 'Getz Bros.', s: 'Getz' }, { id: 'd', t: 'Makati Dev.', s: 'MDC' }]
      ],
      routes: [['bill', 'coll', 'bcms'], ['inv', 'ret', 'asp', 'a'], ['inv', 'ret', 'asp', 'b'], ['inv', 'ret', 'asp', 'c'], ['inv', 'ret', 'asp', 'd']]
    }
  };

  function pulse(node) {
    if (!node || !node.pulseEl) return;
    const { w, h } = node;
    gsap.fromTo(node.pulseEl,
      { opacity: .95, attr: { x: 0, y: 0, width: w, height: h } },
      { opacity: 0, attr: { x: -7, y: -7, width: w + 14, height: h + 14 }, duration: .6, ease: 'power2.out', overwrite: true });
  }

  // One moving packet along one path, sequenced into a route timeline. Returns when it reaches the far end.
  function addHop(tl, d, group, t, speed, target) {
    const flow = svgEl('path', { d, class: 'flow' }, group);
    const len = flow.getTotalLength();
    const tail = Math.min(44, len * .6);
    gsap.set(flow, { strokeDasharray: `${tail} ${len + tail + 24}`, strokeDashoffset: tail, opacity: 0 });
    const dur = (len + tail) / speed;
    tl.set(flow, { opacity: 1 }, t);
    tl.fromTo(flow, { strokeDashoffset: tail }, { strokeDashoffset: -len, duration: dur, ease: 'none', immediateRender: false }, t);
    tl.set(flow, { opacity: 0 }, t + dur);
    if (target) tl.call(pulse, [target], t + len / speed);
    return t + len / speed;
  }

  function drawNode(parent, n, compact) {
    const g = svgEl('g', { class: 'node' + (n.hub ? ' node--hub' : ''), transform: `translate(${n.x} ${n.y})` }, parent);
    const inner = svgEl('g', {}, g);
    svgEl('rect', { class: 'node__box', width: n.w, height: n.h }, inner);
    const label = compact && n.s ? n.s : n.t;
    const sub = compact ? n.s2 && n.sub ? n.s2 : '' : n.sub;
    const main = svgEl('text', { x: n.w / 2, y: sub ? n.h / 2 - 9 : n.h / 2 }, inner);
    main.textContent = label;
    if (sub) { const st = svgEl('text', { class: 'node__sub', x: n.w / 2, y: n.h / 2 + 11 }, inner); st.textContent = sub; }
    n.inner = inner;
    n.pulseEl = svgEl('rect', { class: 'node__pulse', x: 0, y: 0, width: n.w, height: n.h }, g);
    return g;
  }

  // Builds one role's diagram. `lr` flows left to right for wide stages; otherwise top to bottom for phones.
  function buildScene(li, lr) {
    const data = SCENES[li.dataset.scene];
    const svg = $('svg', li);
    svg.textContent = '';
    svg.classList.toggle('is-tb', !lr);
    const W = lr ? 860 : 380;
    const H = lr ? 580 : 560;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const gE = svgEl('g', {}, svg);
    const gF = svgEl('g', {}, svg);
    const gN = svgEl('g', {}, svg);

    const nodes = {};
    const n = data.cols.length;
    data.cols.forEach((col, i) => {
      const k = col.length;
      col.forEach((src, j) => {
        const node = { ...src, col: i };
        if (lr) {
          const cx = 80 + i * (W - 160) / (n - 1);
          const gap = Math.min(136, (H - 30) / Math.max(k, 1));
          const cy = H / 2 + (j - (k - 1) / 2) * gap;
          node.w = src.hub ? 176 : 156;
          node.h = src.hub ? 106 : 64;
          node.x = cx - node.w / 2;
          node.y = cy - node.h / 2;
        } else {
          const cy = 34 + i * (H - 68) / (n - 1);
          const cell = (W - 8) / k;
          node.w = Math.min(src.hub ? 210 : 160, cell - 8);
          node.h = src.hub ? 62 : 44;
          node.x = 4 + cell * (j + .5) - node.w / 2;
          node.y = cy - node.h / 2;
        }
        nodes[src.id] = node;
        drawNode(gN, node, !lr);
      });
    });

    const edges = [];
    const edgeD = {};
    const addEdge = (a, b, d, col) => {
      const key = `${a}>${b}`;
      edgeD[key] = d;
      edges.push({ el: svgEl('path', { d, class: 'edge' }, gE), col });
    };
    const link = (a, b) => {
      const key = `${a}>${b}`;
      if (edgeD[key]) return;
      const A = nodes[a], B = nodes[b];
      const d = lr
        ? pathHV(A.x + A.w, A.y + A.h / 2, B.x, B.y + B.h / 2, (A.x + A.w + B.x) / 2)
        : pathVH(A.x + A.w / 2, A.y + A.h, B.x + B.w / 2, B.y, (A.y + A.h + B.y) / 2);
      addEdge(a, b, d, A.col);
    };

    // The branch field: one dot per branch position, wired into a single ticketing bus.
    const dots = [];
    const wires = [];
    if (data.field) {
      const f = data.field;
      const hub = nodes.ticket;
      const rows = lr ? f.rows : 5;
      const colsN = lr ? f.cols : 18;
      const x0 = lr ? 8 : 12, y0 = lr ? 124 : 46;
      const dx = lr ? 24 : 21, dy = lr ? 31 : 17;
      const g = svgEl('g', {}, gN);
      for (let r = 0; r < rows; r++) for (let c = 0; c < colsN; c++) dots.push(svgEl('circle', { class: 'dot', cx: x0 + c * dx, cy: y0 + r * dy, r: lr ? 3 : 2.4 }, g));
      const label = svgEl('text', { class: 'field-label', x: lr ? x0 + (colsN - 1) * dx / 2 : W / 2, y: lr ? y0 - 26 : 18 }, gN);
      label.textContent = f.t;
      if (lr) {
        const bus = (x0 + (colsN - 1) * dx + hub.x) / 2 + 26;
        for (let r = 0; r < rows; r++) {
          const c = (r * 5 + 3) % colsN;
          const x = x0 + c * dx, y = y0 + r * dy;
          const key = `w${r}`;
          nodes[key] = { col: 0 };
          wires.push(key);
          addEdge(key, 'ticket', pathHV(x, y, hub.x, hub.y + hub.h / 2, bus), 0);
        }
      } else {
        const bus = y0 + (rows - 1) * dy + 22;
        for (let c = 1; c < colsN; c += 2) {
          const r = (c * 3) % rows;
          const x = x0 + c * dx, y = y0 + r * dy;
          const key = `w${c}`;
          nodes[key] = { col: 0 };
          wires.push(key);
          addEdge(key, 'ticket', pathVH(x, y, hub.x + hub.w / 2, hub.y, bus), 0);
        }
      }
    }

    const routeIds = data.field ? wires.filter((_, i) => i % 2 === 0).map(w => [w, 'ticket', 'support']) : data.routes;
    if (data.field) link('ticket', 'support');
    routeIds.forEach(r => r.forEach((id, i) => { if (i && !id.startsWith('w') && !edgeD[`${r[i - 1]}>${id}`]) link(r[i - 1], id); }));

    const api = { li, copy: $('.scene__copy', li), kids: $$('.scene__copy > *', li), stage: $('.scene__stage', li) };
    if (!motion) {
      api.start = api.halt = api.resume = () => {};
      return api;
    }

    edges.forEach(e => { const len = e.el.getTotalLength(); e.len = len; gsap.set(e.el, { strokeDasharray: len, strokeDashoffset: len }); });

    const draw = gsap.timeline({ paused: true });
    if (dots.length) draw.fromTo(dots, { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .3, stagger: { amount: .45, from: 'random' } }, 0);
    data.cols.forEach((col, i) => {
      const els = col.map(s => nodes[s.id].inner);
      if (els.length) draw.fromTo(els, { opacity: 0, scale: .84, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .45, stagger: .05, ease: 'back.out(1.6)' }, i * .2 + (dots.length ? .25 : 0));
    });
    edges.forEach(e => draw.to(e.el, { strokeDashoffset: 0, duration: .55, ease: 'power2.inOut' }, e.col * .2 + .14));

    const speed = lr ? 280 : 170;
    const routes = routeIds.map((ids, k) => {
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: .5 + (k % 3) * .35 });
      let t = 0;
      for (let i = 1; i < ids.length; i++) t = addHop(tl, gF, ids[i - 1], ids[i], t);
      return tl;
      function addHop(line, group, a, b, at) {
        const d = edgeD[`${a}>${b}`];
        return hop(line, d, group, at, speed, nodes[b]);
      }
    });
    const flows = $$('.flow', gF);

    const run = () => routes.forEach((tl, k) => { tl.delay(k * .6); tl.restart(true); });
    api.start = (delay = 0) => {
      routes.forEach(tl => tl.pause(0));
      gsap.set(flows, { opacity: 0 });
      draw.eventCallback('onComplete', run);
      draw.delay(delay);
      draw.restart(true);
    };
    api.halt = () => {
      draw.pause();
      routes.forEach(tl => tl.pause(0));
      gsap.set(flows, { opacity: 0 });
    };
    api.resume = () => { if (draw.progress() === 1) run(); else draw.play(); };
    return api;
  }
  const hop = (...a) => addHop(...a);

  /* ---------- No motion: everything is simply drawn and readable ---------- */

  if (!motion) {
    root.classList.remove('is-loading');
    if (hasGsap) gsap.registerPlugin(ScrollTrigger);
    const wide = () => matchMedia('(min-width: 720px)').matches;
    if (hasGsap) $$('.scene').forEach(li => buildScene(li, wide()));
    return;
  }

  /* ---------- Motion ---------- */

  gsap.registerPlugin(ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(Flip);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ overwrite: 'auto' });

  const hero = $('.hero');
  const heroSvg = $('#heroTraces');
  const portrait = $('.hero__portrait');
  let heroRoutes = [];
  let heroVisible = true;

  function splitLetters(line) {
    const text = line.textContent;
    line.textContent = '';
    [...text].forEach(ch => {
      const wrap = document.createElement('span');
      wrap.className = 'ch';
      const i = document.createElement('i');
      i.textContent = ch === ' ' ? ' ' : ch;
      wrap.appendChild(i);
      line.appendChild(wrap);
    });
    return $$('i', line);
  }

  // Three real input-to-output channels running behind the portrait, placed around the live layout.
  function buildHero() {
    heroRoutes.forEach(t => t.kill());
    heroRoutes = [];
    heroSvg.textContent = '';
    const hr = hero.getBoundingClientRect();
    const W = hr.width, H = hr.height;
    heroSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const rel = e => { const r = e.getBoundingClientRect(); return { l: r.left - hr.left, t: r.top - hr.top, r: r.right - hr.left, b: r.bottom - hr.top, w: r.width, h: r.height }; };
    const gE = svgEl('g', {}, heroSvg), gF = svgEl('g', {}, heroSvg), gN = svgEl('g', {}, heroSvg);
    const port = rel(portrait), tb = rel($('.titleblock')), lede = rel($('.hero__lede'));
    const edges = [], nodes = [];
    const speed = 320;
    const channels = [];
    const gutter = parseFloat(getComputedStyle(root).getPropertyValue('--gutter')) || parseFloat(getComputedStyle($('.hero__inner')).paddingLeft);
    const nodeW = 124, nodeH = 38;
    const gap = port.l - lede.r;

    if (getComputedStyle(hero).position === 'sticky' && gap > nodeW + 28) {
      const IN = [['Lab machines', 'Patient results'], ['200+ branches', 'Tech support'], ['Billing', 'Collections']];
      const inX = lede.r + (gap - nodeW) / 2;
      const outX = W - parseFloat(getComputedStyle($('.hero__inner')).paddingLeft) - nodeW;
      const inTop = lede.t + 8, inBot = tb.t - nodeH - 26;
      const outTop = port.t + port.h * .07, outBot = tb.t - nodeH - 26;
      IN.forEach(([a, b], i) => {
        const yA = inTop + (inBot - inTop) * i / 2;
        const yB = outTop + (outBot - outTop) * i / 2;
        const A = { t: a, x: inX, y: yA, w: nodeW, h: nodeH };
        const B = { t: b, x: outX, y: yB, w: nodeW, h: nodeH };
        drawNode(gN, A); drawNode(gN, B);
        nodes.push(A, B);
        channels.push({ from: A, to: B, d: pathHV(inX + nodeW, yA + nodeH / 2, outX, yB + nodeH / 2, outX - 26 - i * 13), out: `M${outX + nodeW} ${yB + nodeH / 2}H${W}` });
      });
    } else {
      [.46, .63, .8].forEach((f, i) => {
        const y = port.t + port.h * f;
        const y2 = y + (i === 1 ? -22 : 22);
        channels.push({ d: pathHV(0, y, W, y2, W * (.82 - i * .04)), out: null });
      });
    }

    channels.forEach((c, k) => {
      edges.push(svgEl('path', { d: c.d, class: 'edge' }, gE));
      if (c.out) edges.push(svgEl('path', { d: c.out, class: 'edge' }, gE));
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: .7 + k * .3 });
      const t = addHop(tl, c.d, gF, 0, speed, c.to);
      if (c.out) addHop(tl, c.out, gF, t, speed);
      heroRoutes.push(tl);
    });

    return { edges, nodes };
  }
  const runHero = () => { if (!heroVisible) return; heroRoutes.forEach((tl, k) => { tl.delay(k * .9); tl.restart(true); }); };

  function intro() {
    const { edges, nodes } = buildHero();
    const letters = splitLetters($('.hero__name .line:nth-child(1)')).concat(splitLetters($('.hero__name .line:nth-child(2)')));
    const color = $('.p-color');
    const scan = $('.scan');
    edges.forEach(e => { const l = e.getTotalLength(); gsap.set(e, { strokeDasharray: l, strokeDashoffset: l }); });
    gsap.set(portrait, { clipPath: 'inset(100% -10% 0% -10%)' });
    gsap.set(color, { clipPath: 'inset(0% 0% 100% 0%)' });
    gsap.set('.hero__grid', { clipPath: 'circle(0% at 72% 55%)' });
    gsap.set(letters, { yPercent: 112 });
    gsap.set(['.hero__hello', '.hero__tagline', '.hero__sub', '.hero__cta'], { y: 20, opacity: 0 });
    gsap.set('.titleblock > div', { opacity: 0, y: 14 });
    if (nodes.length) gsap.set(nodes.map(n => n.inner), { opacity: 0, scale: .84, transformOrigin: '50% 50%' });
    root.classList.remove('is-loading');

    const tl = gsap.timeline({ defaults: { ease: 'expo.out', overwrite: false }, onComplete: () => gsap.set(portrait, { clearProps: 'clipPath' }) });
    tl.to('.hero__grid', { clipPath: 'circle(150% at 72% 55%)', duration: 1.7, ease: 'power3.inOut' }, 0)
      .to('.hero__hello', { y: 0, opacity: 1, duration: .7 }, .25)
      .to(letters, { yPercent: 0, duration: 1.05, stagger: .026 }, .3)
      .to(portrait, { clipPath: 'inset(0% -10% 0% -10%)', duration: 1, ease: 'power3.inOut' }, .55)
      .fromTo(scan, { top: '100%', opacity: 1 }, { top: '0%', duration: 1, ease: 'power3.inOut' }, .55)
      .to(['.hero__tagline', '.hero__sub', '.hero__cta'], { y: 0, opacity: 1, duration: .8, stagger: .09 }, .95)
      .to('.titleblock > div', { opacity: 1, y: 0, duration: .6, stagger: .06, ease: 'power3.out' }, 1.1)
      .to(edges, { strokeDashoffset: 0, duration: 1.1, stagger: .1, ease: 'power2.inOut' }, 1.15)
      .to(color, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power2.inOut' }, 1.6)
      .fromTo(scan, { top: '0%' }, { top: '100%', duration: 1.2, ease: 'power2.inOut', immediateRender: false }, 1.6)
      .to(scan, { opacity: 0, duration: .25 }, 2.7);
    if (nodes.length) tl.to(nodes.map(n => n.inner), { opacity: 1, scale: 1, duration: .5, stagger: .07, ease: 'back.out(1.6)' }, 1.5);
    tl.call(runHero, null, 2.5);
  }

  /* CAD crosshair and a slight depth shift, for mouse users */
  if (finePointer) {
    const cross = $('#cross');
    const setX = gsap.quickSetter('.cross__y', 'x', 'px');
    const setY = gsap.quickSetter('.cross__x', 'y', 'px');
    const read = $('.cross__read');
    const moveP = gsap.quickTo(portrait, 'x', { duration: .9, ease: 'power3' });
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const x = Math.round(e.clientX - r.left), y = Math.round(e.clientY - r.top);
      cross.classList.add('is-on');
      setX(x); setY(y);
      read.textContent = `X ${String(x).padStart(4, '0')}  Y ${String(y).padStart(4, '0')}`;
      gsap.set(read, { x: x + (x > r.width - 140 ? -128 : 10), y: y + 10 });
      moveP((x / r.width - .5) * -14);
    });
    hero.addEventListener('pointerleave', () => { cross.classList.remove('is-on'); moveP(0); });

    $$('.btn').forEach(btn => {
      const xTo = gsap.quickTo(btn, 'x', { duration: .5, ease: 'power3' });
      const yTo = gsap.quickTo(btn, 'y', { duration: .5, ease: 'power3' });
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .22);
        yTo((e.clientY - r.top - r.height / 2) * .32);
      });
      btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* Hero scroll-out: About slides over it like the next drawing sheet */
  const about = $('#about');
  ScrollTrigger.create({
    trigger: about, start: 'top top',
    onEnter: () => { heroVisible = false; heroRoutes.forEach(t => t.pause()); hero.style.visibility = 'hidden'; },
    onLeaveBack: () => { heroVisible = true; hero.style.visibility = ''; heroRoutes.forEach(t => t.play()); }
  });
  const heroOut = { trigger: about, start: 'top bottom', end: 'top top', scrub: true };
  gsap.to('.hero__inner', { y: -46, ease: 'none', scrollTrigger: heroOut });
  gsap.to(portrait, { y: -30, ease: 'none', scrollTrigger: heroOut });
  gsap.to(heroSvg, { opacity: .25, ease: 'none', scrollTrigger: heroOut });

  /* Header */
  ScrollTrigger.create({ start: 60, end: 1e9, toggleClass: { targets: '#hdr', className: 'is-solid' } });
  const setProgress = gsap.quickSetter('#progress', 'scaleX');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => setProgress(s.progress) });

  /* Sheet rules and simple reveals */
  $$('.sheet__rule').forEach(rule => {
    if (rule.closest('.exp')) return;
    gsap.from(rule, { scaleX: 0, duration: 1.2, ease: 'power3.inOut', scrollTrigger: { trigger: rule, start: 'top 92%', once: true } });
  });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%', once: true,
    onEnter: els => gsap.fromTo(els, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .09, ease: 'power3.out' })
  });

  /* About: the statement lights up word by word as you read down */
  const st = $('#statement');
  const words = st.textContent.trim().split(/\s+/);
  st.textContent = '';
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.textContent = w;
    st.appendChild(s);
    if (i < words.length - 1) st.appendChild(document.createTextNode(' '));
  });
  gsap.fromTo($$('span', st), { opacity: .16 }, {
    opacity: 1, stagger: .05, ease: 'none',
    scrollTrigger: { trigger: st, start: 'top 82%', end: 'bottom 52%', scrub: .4 }
  });

  const photo = $('[data-photo]');
  gsap.fromTo('.about__photoclip', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power3.inOut', scrollTrigger: { trigger: photo, start: 'top 82%', once: true } });
  gsap.fromTo('.about__photoclip img', { scale: 1.16 }, { scale: 1, duration: 1.7, ease: 'power3.out', scrollTrigger: { trigger: photo, start: 'top 82%', once: true } });
  gsap.from($$('.crop', photo), { opacity: 0, scale: 2.2, duration: .6, stagger: .06, ease: 'power2.out', delay: .4, scrollTrigger: { trigger: photo, start: 'top 82%', once: true } });

  /* Odometer numbers */
  function odoBuild(host, value) {
    host.textContent = '';
    host.classList.add('odo');
    return [...String(value)].map(ch => {
      if (!/\d/.test(ch)) { const s = document.createElement('span'); s.textContent = ch; host.appendChild(s); return null; }
      const col = document.createElement('span');
      col.className = 'odo__col';
      for (let d = 0; d < 10; d++) { const n = document.createElement('span'); n.textContent = d; col.appendChild(n); }
      host.appendChild(col);
      return { col, digit: +ch };
    }).filter(Boolean);
  }
  $$('[data-count]').forEach(dd => {
    const value = dd.dataset.count + (dd.dataset.suffix || '');
    dd.setAttribute('aria-label', value);
    const cols = odoBuild(dd, value);
    gsap.set(cols.map(c => c.col), { yPercent: 0 });
    ScrollTrigger.create({
      trigger: dd, start: 'top 90%', once: true,
      onEnter: () => cols.forEach((c, i) => gsap.to(c.col, { yPercent: -10 * c.digit, duration: 1.5, delay: i * .08, ease: 'power3.inOut' }))
    });
  });

  /* Experience */
  const exp = $('#experience');
  const lis = $$('.scene');
  const YEARS = ['2026', '2024', '2022', '2021', '2005'];
  const TO = ['to Present', 'to 2026', 'to 2024', 'to 2022', 'to 2021'];
  const mm = gsap.matchMedia();

  mm.add('(min-width: 1000px) and (min-height: 620px)', () => {
    exp.classList.add('is-pinned');
    const scenes = lis.map(li => buildScene(li, true));
    const yearCols = odoBuild($('#expYear'), YEARS[0]);
    const toEl = $('#expTo');
    const stepBtns = $$('#expSteps button');
    const bar = gsap.quickSetter('#expBar', 'scaleX');
    let cur = -1;
    const N = scenes.length;

    function setYear(i) {
      [...YEARS[i]].forEach((d, k) => gsap.to(yearCols[k].col, { yPercent: -10 * +d, duration: .8, delay: k * .04, ease: 'power3.inOut' }));
      toEl.textContent = TO[i];
      stepBtns.forEach((b, k) => b.classList.toggle('is-on', k === i));
    }
    function goTo(i) {
      if (i === cur) return;
      const dir = i > cur ? 1 : -1;
      const prev = scenes[cur], next = scenes[i];
      if (prev) {
        prev.halt();
        prev.li.classList.remove('is-current');
        gsap.to([prev.copy, prev.stage], { opacity: 0, y: -22 * dir, duration: .28, ease: 'power2.in', overwrite: true });
      }
      next.li.classList.add('is-current');
      gsap.set([next.copy, next.stage], { y: 0, overwrite: true });
      gsap.to([next.copy, next.stage], { opacity: 1, duration: .01, delay: prev ? .26 : 0, overwrite: true });
      gsap.fromTo(next.kids, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .06, ease: 'power3.out', delay: prev ? .26 : 0, overwrite: true });
      next.start(prev ? .26 : 0);
      setYear(i);
      cur = i;
    }

    const pin = ScrollTrigger.create({
      trigger: exp, start: 'top top', end: () => '+=' + innerHeight * N * .9,
      pin: true, anticipatePin: 1,
      onUpdate: s => { bar(s.progress); goTo(Math.min(N - 1, Math.floor(s.progress * N))); }
    });
    ScrollTrigger.create({ trigger: exp, start: 'top 60%', onEnter: () => { if (cur < 0) goTo(0); } });
    ScrollTrigger.create({
      trigger: exp, start: 'top bottom', end: () => pin.end + innerHeight,
      onToggle: s => { if (cur >= 0) { if (s.isActive) scenes[cur].resume(); else scenes[cur].halt(); } }
    });
    stepBtns.forEach((b, i) => b.addEventListener('click', () => scrollTo({ top: pin.start + (i + .5) / N * (pin.end - pin.start), behavior: 'smooth' })));
    gsap.from('.exp .sheet__rule', { scaleX: 0, duration: 1.2, ease: 'power3.inOut', scrollTrigger: { trigger: exp, start: 'top 70%', once: true } });

    return () => {
      exp.classList.remove('is-pinned');
      lis.forEach(li => li.classList.remove('is-current'));
      scenes.forEach(s => s.halt());
    };
  });

  mm.add('(max-width: 999.98px), (max-height: 619.98px)', () => {
    const narrow = matchMedia('(max-width: 719.98px)').matches;
    lis.forEach(li => {
      const scene = buildScene(li, !narrow);
      ScrollTrigger.create({
        trigger: scene.stage, start: 'top 82%', end: 'bottom 5%',
        onEnter: () => scene.start(),
        onEnterBack: () => scene.resume(),
        onLeave: () => scene.halt(),
        onLeaveBack: () => scene.halt()
      });
      gsap.from(scene.kids, { y: 22, opacity: 0, duration: .7, stagger: .06, ease: 'power3.out', scrollTrigger: { trigger: scene.copy, start: 'top 85%', once: true } });
    });
  });

  /* Projects: pinned horizontal reel on large screens */
  const reel = $('#reel');
  const track = $('#reelTrack');
  mm.add('(min-width: 1000px) and (min-height: 560px)', () => {
    reel.classList.add('is-pinned');
    const dist = () => Math.max(0, track.offsetWidth - innerWidth);
    const setRail = gsap.quickSetter('#reelBar', 'scaleX');
    const slide = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: reel, pin: true, start: 'top top', end: () => '+=' + dist(), scrub: .6,
        invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: s => setRail(s.progress)
      }
    });
    $$('.reel__item', track).forEach(item => {
      const across = { trigger: item, containerAnimation: slide, start: 'left right', end: 'right left', scrub: true };
      $$('.phone', item).forEach((p, j) => gsap.fromTo(p, { y: 34 + j * 16 }, { y: -8, ease: 'none', scrollTrigger: across }));
      $$('.shot__view img', item).forEach(img => {
        gsap.set(img, { scale: 1.05, transformOrigin: '0% 0%' });
        gsap.fromTo(img, { xPercent: 0 }, { xPercent: -4, ease: 'none', scrollTrigger: across });
      });
      gsap.from($$('.reel__meta > *', item), {
        y: 18, opacity: 0, duration: .7, stagger: .05, ease: 'power3.out',
        scrollTrigger: { trigger: item, containerAnimation: slide, start: 'left 78%', toggleActions: 'play none none reverse' }
      });
    });
    return () => reel.classList.remove('is-pinned');
  });
  mm.add('(max-width: 999.98px), (max-height: 559.98px)', () => {
    $$('.reel__item', track).forEach(item => gsap.from(item, { y: 30, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: item, start: 'top 88%', once: true } }));
  });

  /* Nav highlights: created after the pins so they measure the real scroll distances */
  $$('.hdr__nav a').forEach(a => {
    const sec = $(a.getAttribute('href'));
    if (sec) ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', toggleClass: { targets: a, className: 'is-active' } });
  });

  /* Index cards */
  ScrollTrigger.batch('.pcard', {
    start: 'top 92%', once: true,
    onEnter: els => gsap.fromTo(els, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .06, ease: 'power3.out', clearProps: 'transform,opacity' })
  });

  /* Services: three small loops that only run on screen */
  const whenVisible = (el, tl) => ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: s => (s.isActive ? tl.play() : tl.pause()) });

  const artS = $('#artSystems');
  const artFlows = $$('.art-flow', artS);
  const systems = gsap.timeline({ paused: true, repeat: -1, repeatDelay: .35 });
  const flowOf = (path, at) => {
    const len = path.getTotalLength(), tail = Math.min(26, len * .6), dur = (len + tail) / 120;
    gsap.set(path, { strokeDasharray: `${tail} ${len + tail + 10}`, strokeDashoffset: tail });
    systems.set(path, { opacity: 1 }, at)
      .fromTo(path, { strokeDashoffset: tail }, { strokeDashoffset: -len, duration: dur, ease: 'none', immediateRender: false, overwrite: false }, at)
      .set(path, { opacity: 0 }, at + dur);
    return at + len / 120;
  };
  const endA = flowOf(artFlows[0], 0);
  const endB = flowOf(artFlows[1], .55);
  flowOf(artFlows[2], Math.max(endA, endB));
  whenVisible(artS, systems);

  const artW = $('#artWeb');
  const web = gsap.timeline({ paused: true, repeat: -1, yoyo: true, repeatDelay: 1.1, defaults: { overwrite: false } });
  web.fromTo($$('.art-fill', artW), { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: .55, stagger: .12, ease: 'power3.inOut' });
  whenVisible(artW, web);

  const curve = { ax: 96, ay: 8, bx: 226, by: 142 };
  const paintCurve = () => {
    $('#dCurve').setAttribute('d', `M40 116C${curve.ax} ${curve.ay} ${curve.bx} ${curve.by} 280 34`);
    gsap.set('#dh1', { attr: { x1: 40, y1: 116, x2: curve.ax, y2: curve.ay }, overwrite: false });
    gsap.set('#dh2', { attr: { x1: 280, y1: 34, x2: curve.bx, y2: curve.by }, overwrite: false });
    gsap.set('#dk1', { attr: { cx: curve.ax, cy: curve.ay }, overwrite: false });
    gsap.set('#dk2', { attr: { cx: curve.bx, cy: curve.by }, overwrite: false });
  };
  paintCurve();
  const design = gsap.timeline({ paused: true, repeat: -1, repeatDelay: .3, defaults: { overwrite: false } });
  design.to(curve, { ax: 170, ay: 136, bx: 150, by: 12, duration: 1.7, ease: 'power2.inOut', onUpdate: paintCurve })
    .to(curve, { ax: 60, ay: 40, bx: 250, by: 96, duration: 1.5, ease: 'power2.inOut', onUpdate: paintCurve }, '+=.3')
    .to(curve, { ax: 96, ay: 8, bx: 226, by: 142, duration: 1.4, ease: 'power2.inOut', onUpdate: paintCurve }, '+=.3');
  whenVisible($('#artDesign'), design);

  /* Stack rows */
  gsap.from('.bom tbody tr', { opacity: 0, x: -16, duration: .6, stagger: .05, ease: 'power3.out', scrollTrigger: { trigger: '.bom', start: 'top 86%', once: true } });

  /* Contact */
  const contact = $('#contact');
  const contactLetters = $$('.contact__title .line').flatMap(splitLetters);
  gsap.from(contactLetters, { yPercent: 112, duration: 1, stagger: .022, ease: 'expo.out', scrollTrigger: { trigger: '.contact__title', start: 'top 85%', once: true } });

  let contactRoutes = [];
  function buildContact() {
    contactRoutes.forEach(t => t.kill());
    contactRoutes = [];
    const svg = $('#contactTraces');
    svg.textContent = '';
    if (innerWidth < 900) return;
    const cr = contact.getBoundingClientRect();
    const fr = $('#contactForm').getBoundingClientRect();
    const W = cr.width, H = cr.height;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const gE = svgEl('g', {}, svg), gF = svgEl('g', {}, svg);
    const fl = fr.left - cr.left, fb = fr.bottom - cr.top;
    const room = H - fb;
    if (room < 56) return;
    [0, 1, 2].forEach(i => {
      const y = fb + room * (.34 + i * .2);
      const x = fl + 40 + i * 70;
      const d = pathHV(0, y, x, y, x).replace(/H[\d.]+$/, '') + `H${x - 12}Q${x} ${y} ${x} ${y - 12}V${fb}`;
      svgEl('path', { d, class: 'edge' }, gE);
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: .6 + i * .4 });
      addHop(tl, d, gF, 0, 420);
      contactRoutes.push(tl);
    });
    contactRoutes.forEach((tl, k) => { tl.delay(k * .7); });
    whenVisible(svg, { play: () => contactRoutes.forEach(t => t.play()), pause: () => contactRoutes.forEach(t => t.pause()) });
  }

  /* Start once fonts have settled, since the hero diagram is placed around the real text */
  let lastW = innerWidth;
  const onResize = debounce(() => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    buildHero();
    runHero();
    buildContact();
    ScrollTrigger.refresh();
  }, 220);

  Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(() => {
    intro();
    buildContact();
    ScrollTrigger.refresh();
    addEventListener('resize', onResize);
    addEventListener('load', () => ScrollTrigger.refresh());
  });
})();
