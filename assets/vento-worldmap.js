/* ──────────────────────────────────────────────────────────────
   VENTO · Interaktive Weltkarte
   - Burst beim Einblenden: alle Bögen schießen gleichzeitig aus
   - Danach: alle Bögen dauerhaft aktiv, alle Kometen Endlosschleife
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const VB_W = 1000, VB_H = 500;
  const LAT_TOP = 78, LAT_BOT = -56;
  const x = lon => ((lon + 180) / 360) * VB_W;
  const y = lat => ((LAT_TOP - lat) / (LAT_TOP - LAT_BOT)) * VB_H;

  const LAND = [
    [[-166,66],[-160,71],[-141,70],[-128,70],[-110,69],[-95,70],[-82,73],[-78,62],[-64,60],[-56,52],[-66,45],[-70,42],[-74,40],[-76,37],[-81,31],[-80,28],[-80,25],[-82,25.5],[-83,28],[-84,30],[-89,29],[-94,29],[-97,26],[-97.5,22],[-96,19],[-94,18],[-90,21],[-87,21],[-88,18],[-88,16],[-83,11],[-79,9],[-78,8],[-81,8],[-85,11],[-87,13],[-92,16],[-96,16],[-99,17],[-104,18],[-106,23],[-110,24],[-114,29],[-118,32.5],[-121,34],[-122,37],[-124,40],[-124,46],[-130,54],[-141,59],[-152,59],[-166,66]],
    [[-80,9],[-70,11],[-60,6],[-50,0],[-42,-5],[-37,-12],[-45,-23],[-56,-34],[-66,-45],[-73,-52],[-74,-42],[-71,-30],[-76,-16],[-81,-4],[-80,9]],
    [[-10,43],[-9,37],[-1,38],[4,43],[12,44],[16,40],[24,40],[28,45],[30,52],[28,60],[24,66],[14,65],[6,61],[-2,58],[-7,52],[-10,43]],
    [[-8,51],[-2,51],[-1,57],[-5,58],[-8,55],[-8,51]],
    [[-17,15],[-16,22],[-9,30],[2,34],[11,34],[24,32],[33,31],[43,12],[51,11],[44,-2],[40,-16],[33,-26],[25,-34],[18,-35],[12,-16],[9,3],[-6,5],[-13,9],[-17,15]],
    [[34,37],[44,39],[54,38],[60,30],[59,24],[52,17],[44,13],[39,16],[35,28],[34,37]],
    [[40,48],[55,52],[70,55],[88,60],[105,66],[128,70],[145,72],[162,69],[180,66],[180,60],[162,58],[150,48],[140,40],[123,33],[122,24],[110,20],[105,22],[100,14],[95,8],[92,21],[86,24],[80,14],[77,9],[72,21],[66,25],[58,28],[50,30],[44,33],[40,40],[40,48]],
    [[131,33],[138,35],[142,40],[140,44],[133,35],[131,33]],
    [[96,5],[104,2],[112,-2],[120,-4],[132,-3],[140,-4],[133,-8],[120,-9],[108,-8],[98,-1],[96,5]],
    [[114,-22],[122,-18],[131,-12],[142,-11],[150,-22],[153,-28],[147,-38],[138,-35],[129,-32],[118,-34],[114,-28],[114,-22]],
    [[167,-45],[172,-41],[176,-40],[174,-46],[167,-45]],
    [[44,-13],[50,-16],[50,-24],[45,-25],[44,-13]],
    [[-58,76],[-30,78],[-20,72],[-44,60],[-58,68],[-58,76]]
  ];

  function pointInPoly(lon, lat, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      const hit = ((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (hit) inside = !inside;
    }
    return inside;
  }
  const onLand = (lon, lat) => LAND.some(p => pointInPoly(lon, lat, p));

  // Hub = Europa (Ursprung aller Verbindungen, Heimat von VENTO)
  const HUB = { lon: 8.68, lat: 50.1 };

  // Standort-Labels: beschriftet, mit animiertem Bogen vom Hub
  const HOTSPOTS = [
    { id:'europa',     lon:8.68,   lat:50.1, hub:true, labelDy:-18 },
    { id:'usa',        lon:-99,    lat:39.5, labelAnchor:'middle', labelDy:-13 },
    { id:'mexico',     lon:-102,   lat:23.5, labelAnchor:'end',   labelDx:-9,  labelDy:18 },
    { id:'brasilien',  lon:-50,    lat:-12 },
    { id:'dubai',      lon:55.3,   lat:25.2, labelAnchor:'end',   labelDx:-8,  labelDy:6 },
    { id:'suedafrika', lon:25.0,   lat:-29.0, labelAnchor:'start', labelDx:8,  labelDy:6 },
    { id:'indien',     lon:78.5,   lat:22.0, labelAnchor:'end',   labelDx:-8,  labelDy:30 },
    { id:'china',      lon:104.0,  lat:35.0, labelAnchor:'start', labelDx:8,   labelDy:6 },
    { id:'suedkorea',  lon:127.5,  lat:37.0, labelAnchor:'start', labelDx:9,   labelDy:-8 },
    { id:'singapur',   lon:103.8,  lat:1.35, labelAnchor:'start', labelDx:8,   labelDy:12 }
  ];

  const LABELS = {
    europa:'Europa', usa:'USA', mexico:'Mexiko', brasilien:'Brasilien',
    dubai:'Dubai', suedafrika:'Südafrika', indien:'Indien',
    china:'China', suedkorea:'Südkorea', singapur:'Singapur'
  };

  // Keine sekundären Städte mehr – nur die Standort-Labels oben.
  const SECONDARY = [];

  const SVGNS = 'http://www.w3.org/2000/svg';
  const el = (n, a) => {
    const e = document.createElementNS(SVGNS, n);
    for (const k in a) e.setAttribute(k, a[k]);
    return e;
  };

  // Easing
  const eio = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

  function build(root) {
    const svg = el('svg', {
      viewBox: `0 0 ${VB_W} ${VB_H}`, class: 'vw-svg',
      preserveAspectRatio: 'xMidYMid meet', role: 'img',
      'aria-label': 'Weltkarte der internationalen Präsenz von VENTO Executive Search'
    });

    const gDots  = el('g', { class: 'vw-dots' });
    const gLines = el('g', { class: 'vw-lines' });
    const gSpots = el('g', { class: 'vw-spots' });

    // Punktraster
    const STEP = 2.7;
    for (let lat = LAT_TOP - 1; lat > LAT_BOT; lat -= STEP) {
      for (let lon = -179; lon < 180; lon += STEP) {
        if (onLand(lon, lat)) {
          gDots.appendChild(el('circle', {
            cx: x(lon).toFixed(1), cy: y(lat).toFixed(1), r: 1.45, class: 'vw-dot'
          }));
        }
      }
    }

    const hx = x(HUB.lon), hy = y(HUB.lat);
    const lineMap     = {};
    const travelerMap = {};

    HOTSPOTS.forEach((s, i) => {
      if (s.hub) return;
      const sx = x(s.lon), sy = y(s.lat);
      const mx = (hx + sx) / 2;
      const my = (hy + sy) / 2 - Math.abs(sx - hx) * 0.18 - 18;
      const path = el('path', {
        d: `M ${hx.toFixed(1)} ${hy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${sx.toFixed(1)} ${sy.toFixed(1)}`,
        class: 'vw-line', 'data-for': s.id
      });
      path.style.setProperty('--i', i);
      gLines.appendChild(path);
      lineMap[s.id] = path;

      const t = el('circle', { cx: hx, cy: hy, r: 3.0, class: 'vw-traveler', opacity: 0 });
      gLines.appendChild(t);
      travelerMap[s.id] = t;
    });

    // Bögen + Kometen auch zu allen sekundären Städten
    SECONDARY.forEach((s, i) => {
      const sx = x(s.lon), sy = y(s.lat);
      if (Math.abs(sx - hx) < 1 && Math.abs(sy - hy) < 1) return;
      const mx = (hx + sx) / 2;
      const my = (hy + sy) / 2 - Math.abs(sx - hx) * 0.18 - 18;
      const path = el('path', {
        d: `M ${hx.toFixed(1)} ${hy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${sx.toFixed(1)} ${sy.toFixed(1)}`,
        class: 'vw-line', 'data-for': s.id
      });
      path.style.setProperty('--i', i);
      gLines.appendChild(path);
      lineMap[s.id] = path;

      const t = el('circle', { cx: hx, cy: hy, r: 2.4, class: 'vw-traveler', opacity: 0 });
      gLines.appendChild(t);
      travelerMap[s.id] = t;
    });

    // Hotspots
    HOTSPOTS.forEach(s => {
      const sx = x(s.lon), sy = y(s.lat);
      const g = el('g', {
        class: 'vw-spot' + (s.hub ? ' is-hub' : ''),
        'data-id': s.id, tabindex: '-1', role: 'presentation'
      });
      g.appendChild(el('circle', { cx: sx, cy: sy, r: 16, class: 'vw-spot-hit' }));
      g.appendChild(el('circle', { cx: sx, cy: sy, r: 3.6, class: 'vw-spot-core' }));
      const label = el('text', {
        x: sx, y: sy - 13, class: 'vw-spot-label',
        'text-anchor': s.labelAnchor || (sx > VB_W - 150 ? 'end' : (sx < 120 ? 'start' : 'middle'))
      });
      if (s.labelDx) label.setAttribute('dx', s.labelDx);
      if (s.labelDy) label.setAttribute('dy', s.labelDy);
      label.textContent = LABELS[s.id] || s.id;
      g.appendChild(label);
      // Hub: "VENTO Executive Search" in Gold über dem Europa-Label
      if (s.hub) {
        const brand = el('text', {
          x: sx, y: sy - 13, dy: -46,
          'text-anchor': 'middle',
          class: 'vw-spot-label vw-hub-brand'
        });
        brand.textContent = 'VENTO Executive Search';
        g.appendChild(brand);
      }
      gSpots.appendChild(g);
    });

    // Sekundäre Städte: kleiner Punkt + Hover-Label
    const gCities = el('g', { class: 'vw-cities' });
    SECONDARY.forEach(c => {
      const cx = x(c.lon), cy = y(c.lat);
      const g = el('g', { class: 'vw-city' + (c.show ? ' is-shown' : ''), 'data-id': c.id, tabindex: '-1' });
      g.appendChild(el('circle', { cx, cy, r: 12, class: 'vw-city-hit' }));
      g.appendChild(el('circle', { cx, cy, r: 3.6, class: 'vw-city-core' }));
      const label = el('text', {
        x: cx, y: cy - 9, class: 'vw-city-label',
        'text-anchor': c.labelAnchor || (cx > VB_W - 130 ? 'end' : (cx < 110 ? 'start' : 'middle'))
      });
      if (c.labelDx) label.setAttribute('dx', c.labelDx);
      if (c.labelDy) label.setAttribute('dy', c.labelDy);
      label.textContent = c.label;
      g.appendChild(label);
      gCities.appendChild(g);
    });

    svg.appendChild(gDots);
    svg.appendChild(gLines);
    svg.appendChild(gCities);
    svg.appendChild(gSpots);
    root.appendChild(svg);
    return { svg, gLines, lineMap, travelerMap };
  }

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Komet: läuft einmal von Hub → Ziel, ruft sich dann nach Pause selbst
     wieder auf → Endlosschleife pro Bogen, unabhängig voneinander ── */
  function loopTraveler(tEl, line, cycleMs, phaseMs) {
    if (reduceMotion) return;
    const len = line.getTotalLength();
    let cancelled = false;
    let timer;

    function runOnce() {
      if (cancelled) return;
      const t0 = performance.now();
      function tick(now) {
        if (cancelled) return;
        const k = Math.min(1, (now - t0) / cycleMs);
        const e = eio(k);
        const pt = line.getPointAtLength(e * len);
        tEl.setAttribute('cx', pt.x.toFixed(1));
        tEl.setAttribute('cy', pt.y.toFixed(1));
        // Sinus: sanftes Ein- und Ausblenden
        tEl.setAttribute('opacity', (Math.sin(k * Math.PI) * 0.92).toFixed(3));
        if (k < 1) {
          requestAnimationFrame(tick);
        } else {
          tEl.setAttribute('opacity', 0);
          // Pause zwischen zwei Läufen (= unsichtbare Rückkehr zum Hub)
          timer = setTimeout(runOnce, phaseMs);
        }
      }
      requestAnimationFrame(tick);
    }

    // Phase-Versatz, damit nicht alle Kometen gleichzeitig starten
    timer = setTimeout(runOnce, phaseMs);
    return () => { cancelled = true; clearTimeout(timer); };
  }

  function wire(ctx) {
    const gLines      = ctx.gLines;
    const { lineMap, travelerMap } = ctx;
    const allLines    = gLines.querySelectorAll('.vw-line');
    const regionIds   = Object.keys(lineMap);  // alle Ziele (primär + sekundär)

    // Basis-Timing
    const BURST_DUR   = 850;    // ms — Impuls schiesst zügig zu den Endstationen
    const LOOP_DUR    = 3400;   // ms — Einzellauf im Loop
    const LOOP_PAUSE  = 1800;   // ms — Pause zwischen zwei Kometen-Läufen
    const PHASE_STEP  = 260;    // ms — Versatz zwischen den Bögen

    let burstFired = false;
    let revealed = false;
    const stoppers = [];

    /* ── Burst: alle Kometen schießen einmal langsam hinaus ── */
    function fireBurst() {
      // Alle Linien sofort aktiv (dauerhaft)
      allLines.forEach(ln => ln.classList.add('is-active'));

      let done = 0;
      regionIds.forEach((id, i) => {
        const line = lineMap[id];
        const tEl  = travelerMap[id];
        if (!line || !tEl) { done++; return; }

        const delay = i * 45;    // ms Versatz für optischen Eindruck
        const t0ref = { v: 0 };
        let started = false;
        const len = line.getTotalLength();

        function tick(now) {
          if (!started) { t0ref.v = now + delay; started = true; }
          const elapsed = now - t0ref.v;
          if (elapsed < 0) { requestAnimationFrame(tick); return; }
          const k = Math.min(1, elapsed / BURST_DUR);
          const e = eio(k);
          const pt = line.getPointAtLength(e * len);
          tEl.setAttribute('cx', pt.x.toFixed(1));
          tEl.setAttribute('cy', pt.y.toFixed(1));
          tEl.setAttribute('opacity', (Math.sin(k * Math.PI) * 0.95).toFixed(3));
          if (k < 1) {
            requestAnimationFrame(tick);
          } else {
            tEl.setAttribute('opacity', 0);
            done++;
            // Sobald der ERSTE Komet ankommt: alle Orte gemeinsam einblenden
            if (!revealed) {
              revealed = true;
              ctx.svg.classList.add('is-revealed');
            }
            // Wenn alle Burst-Kometen durch: Endlosschleife starten
            if (done === regionIds.length) startLoops();
          }
        }
        requestAnimationFrame(tick);
      });
    }

    /* ── Endlosschleife: alle 6 Bögen gleichzeitig, phasenverschoben ── */
    function startLoops() {
      regionIds.forEach((id, i) => {
        const line = lineMap[id];
        const tEl  = travelerMap[id];
        if (!line || !tEl) return;
        const stop = loopTraveler(tEl, line, LOOP_DUR, i * PHASE_STEP);
        if (stop) stoppers.push(stop);
      });
    }

    /* ── Auslöser: Hover ODER Scroll — was zuerst kommt ── */
    function trigger() {
      if (burstFired) return;
      burstFired = true;
      fireBurst();
    }
    // Hover über der Karte feuert den Impuls sofort
    ctx.svg.addEventListener('pointerenter', trigger);

    if (reduceMotion) {
      allLines.forEach(ln => ln.classList.add('is-active'));
      ctx.svg.classList.add('is-revealed');
    } else if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting && en.intersectionRatio > 0.12) {
            trigger();
            io.disconnect();
          }
        });
      }, { threshold: [0, 0.12, 0.4] });
      io.observe(ctx.svg);
    } else {
      trigger();
    }
  }

  function init() {
    const root = document.getElementById('vento-worldmap');
    if (!root || root.dataset.built) return;
    root.dataset.built = '1';
    const stage = root.querySelector('.vw-stage');
    if (!stage) return;
    const ctx = build(stage);
    wire(ctx);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.VentoWorldMap = { init };
})();
