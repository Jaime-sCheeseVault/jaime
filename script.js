(function(){
  (function fx(){
    const cv = document.getElementById('fx');
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1;
    let mode = 'off', density = 1;
    let parts = [], drops = [], flakes = [], cols = [], stars = [];
    let running = false, raf = 0, last = 0;
    const GLYPHS = 'アィウェエオカキクケコサシスセソタチツテトナニヌネノ01ABCDEF'.split('');

    function hexToRgb(h){
      h = (h || '').replace('#', '');
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      const n = parseInt(h || 'b8f4e0', 16);
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    function getColor(){
      const cs = getComputedStyle(document.documentElement);
      return cs.getPropertyValue('--phosphor').trim() || '#b8f4e0';
    }
    function getMatrixColors(){
      // Theme the characters to the currently selected theme
      const cs = getComputedStyle(document.documentElement);
      const base = hexToRgb(cs.getPropertyValue('--phosphor').trim() || '#b8f4e0');
      const dim = hexToRgb(cs.getPropertyValue('--phosphor-dim').trim() || '#4a9c85');
      const lum = 0.299 * base[0] + 0.587 * base[1] + 0.114 * base[2];
      const headBlend = lum > 140 ? 0.25 : 0.8;
      return {
        head: [
          Math.round(base[0] + (255 - base[0]) * headBlend),
          Math.round(base[1] + (255 - base[1]) * headBlend),
          Math.round(base[2] + (255 - base[2]) * headBlend)
        ],
        bright: [
          Math.min(255, Math.round(base[0] * 1.18)),
          Math.min(255, Math.round(base[1] * 1.18)),
          Math.min(255, Math.round(base[2] * 1.18))
        ],
        dim
      };
    }
    function lerpRgb(a, b, t){
      return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t)
      ];
    }
    function count(base){
      return Math.max(8, Math.round(base * density * (W * H) / 1200000));
    }
    function build(){
      parts = []; drops = []; flakes = []; cols = []; stars = [];
      if (mode === 'stars' || mode === 'constellations'){
        const n = Math.min(count(mode === 'constellations' ? 260 : 500), 900);
        for (let i = 0; i < n; i++){
          stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + 0.3, tw: Math.random() * Math.PI * 2, sp: Math.random() * 0.02 + 0.006 });
        }
      } else if (mode === 'rain'){
        const n = count(300);
        for (let i = 0; i < n; i++){
          drops.push({ x: Math.random() * W, y: Math.random() * H, l: 8 + Math.random() * 14, s: 9 + Math.random() * 7 });
        }
      } else if (mode === 'snow'){
        const n = count(220);
        for (let i = 0; i < n; i++){
          flakes.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.5, vy: 0.4 + Math.random() * 0.9, sw: 0.01 + Math.random() * 0.02, ph: Math.random() * Math.PI * 2 });
        }
      } else if (mode === 'matrix'){
        const size = 14;
        const totalCols = Math.floor(W / size);
        // Multiple streams across the whole screen; keep a mild cap on very large displays
        const cap = W * H > 2200000 ? 0.6 : 0.9;
        const streamCount = Math.min(totalCols, Math.max(12, Math.floor(totalCols * cap * density)));
        const usedCols = new Set();
        for (let i = 0; i < streamCount; i++){
          let col;
          do { col = Math.floor(Math.random() * totalCols); } while (usedCols.has(col) && usedCols.size < totalCols);
          usedCols.add(col);
          cols.push({
            x: col * size,
            headRow: -Math.floor(Math.random() * (H / size)),
            tailLen: 18 + Math.floor(Math.random() * 20),
            interval: 10 + Math.floor(Math.random() * 15),
            timer: 0
          });
        }
      } else if (mode === 'particles'){
        const n = count(500);
        for (let i = 0; i < n; i++){
          parts.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.2, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4 });
        }
      }
    }

    function tick(now){
      if (!running) return;
      const dt = Math.min(50, now - last); last = now;
      const rgb = hexToRgb(getColor());
      const A = (o) => 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + o + ')';
      if (mode !== 'matrix') ctx.clearRect(0, 0, W, H);

      if (mode === 'rain'){
        ctx.strokeStyle = A(0.45); ctx.lineWidth = 1;
        for (const d of drops){
          d.y += d.s * (dt / 16.7);
          d.x -= d.s * 0.25;
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 1.5, d.y - d.l); ctx.stroke();
          if (d.y > H + d.l){ d.y = -d.l - 20; d.x = Math.random() * W; }
        }
      } else if (mode === 'snow'){
        for (const f of flakes){
          f.ph += f.sw * (dt / 16.7);
          f.x += Math.sin(f.ph) * 0.8;
          f.y += f.vy * (dt / 16.7);
          if (f.y > H + 4){ f.y = -4; f.x = Math.random() * W; }
          if (f.x < -6) f.x = W + 6; if (f.x > W + 6) f.x = -6;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.2832); ctx.fillStyle = A(0.85); ctx.fill();
        }
      } else if (mode === 'matrix'){
        const size = 14;
        const totalRows = Math.ceil(H / size);
        const bgRgb = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue('--void').trim() || '#000000');
        const mc = getMatrixColors();
        ctx.fillStyle = 'rgba(' + bgRgb[0] + ',' + bgRgb[1] + ',' + bgRgb[2] + ',0.08)';
        ctx.fillRect(0, 0, W, H);
        ctx.font = size + 'px "Courier New", Courier, monospace';

        for (const c of cols){
          c.timer += dt;
          if (c.timer < c.interval) continue;
          c.timer -= c.interval;
          c.headRow++;

          for (let i = 0; i <= c.tailLen; i++){
            const tailRow = c.headRow - i;
            const tailY = tailRow * size;
            if (tailY >= 0 && tailY <= H + size){
              const progress = 1 - (i / c.tailLen);
              let rgb, alpha;

              if (i === 0){
                rgb = mc.head;
                alpha = 1;
                ctx.shadowColor = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.85)';
                ctx.shadowBlur = 10;
              } else if (progress > 0.55){
                const t = (progress - 0.55) / 0.45;
                rgb = lerpRgb(mc.bright, mc.head, t);
                alpha = 0.75 + 0.25 * t;
                ctx.shadowBlur = 0;
              } else if (progress > 0.2){
                const t = (progress - 0.2) / 0.35;
                rgb = lerpRgb(mc.dim, mc.bright, t);
                alpha = 0.35 + 0.4 * t;
                ctx.shadowBlur = 0;
              } else {
                const t = progress / 0.2;
                rgb = lerpRgb([0, 0, 0], mc.dim, t);
                alpha = 0.08 + 0.27 * t;
                ctx.shadowBlur = 0;
              }

              ctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
              // Use deterministic glyph selection to prevent shaking
              // Hash the column position and row to get a consistent character
              const glyphIndex = Math.floor(Math.abs(Math.sin(c.x * 0.123 + tailRow * 0.456) * 10000)) % GLYPHS.length;
              ctx.fillText(GLYPHS[glyphIndex], c.x, tailY);
            }
          }
          ctx.shadowBlur = 0;

          if (c.headRow - c.tailLen > totalRows){
            const usedCols = new Set(cols.map(s => Math.round(s.x / size)));
            const totalCols = Math.floor(W / size);
            const freeCols = [];
            for (let i = 0; i < totalCols; i++) if (!usedCols.has(i)) freeCols.push(i);
            const newCol = freeCols.length
              ? freeCols[Math.floor(Math.random() * freeCols.length)]
              : Math.floor(Math.random() * totalCols);
            c.x = newCol * size;
            c.headRow = -Math.floor(Math.random() * 4);
            c.tailLen = 18 + Math.floor(Math.random() * 20);
            c.interval = 10 + Math.floor(Math.random() * 15);
          }
        }
      } else if (mode === 'stars' || mode === 'constellations'){
        for (const s of stars){
          s.tw += s.sp * (dt / 16.7);
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.tw));
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fillStyle = A(tw); ctx.fill();
        }
        if (mode === 'constellations'){
          ctx.lineWidth = 0.6;
          for (let i = 0; i < stars.length; i++){
            const s = stars[i];
            let links = 0;
            for (let j = i + 1; j < stars.length && links < 3; j++){
              const o = stars[j];
              const dx = s.x - o.x, dy = s.y - o.y;
              if (dx * dx + dy * dy < 70 * 70){
                ctx.strokeStyle = A(0.12);
                ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(o.x, o.y); ctx.stroke();
                links++;
              }
            }
          }
        }
      } else if (mode === 'particles'){
        for (const p of parts){
          p.x += p.vx * (dt / 16.7);
          p.y += p.vy * (dt / 16.7);
          if (p.x < -4) p.x = W + 4; if (p.x > W + 4) p.x = -4;
          if (p.y < -4) p.y = H + 4; if (p.y > H + 4) p.y = -4;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fillStyle = A(0.7); ctx.fill();
        }
      }

      raf = requestAnimationFrame(tick);
    }

    function start(){ if (running) return; running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    function stop(){ running = false; cancelAnimationFrame(raf); }
    function setMode(m){ mode = m; build(); if (mode === 'off') stop(); else start(); }
    function setDensity(d){ density = d; build(); }

    function resize(){
      DPR = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      build();
    }

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else if (mode !== 'off') start();
    });

    resize();
    window.__fx = { setMode, setDensity };
  })()

  const eduSite = document.getElementById('edu-site');
  const archiveRoot = document.getElementById('archive-root');
  const archiveSite = document.getElementById('archive-site');
  const flash = document.getElementById('flash');
  const grid = document.getElementById('game-grid');

  const TRIGGER_KEY = 'e';
  let activated = false;

  const SKEY = 'thearchive.settings';
  const DEFAULTS = {
    theme: 'default', fx: 'off', fxDensity: 1,
    gridSize: 180, fullscreenOnPlay: false, confirmBeforeClose: false, reduceMotion: false,
    cloakEnabled: false, cloakTitle: 'Classes', cloakFavicon: 'https://www.gstatic.com/classroom/logo_square_rounded.svg',
  };
  let state;
  try { state = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(SKEY) || '{}')); }
  catch (e) { state = Object.assign({}, DEFAULTS); }
  function save(){ try { localStorage.setItem(SKEY, JSON.stringify(state)); } catch (e) {} }

  const games = [
    { tag:'Arcade',   name:'Slope',             file:'./g/slope.html',             icon:'./g/assets/slope.png' },
    { tag:'Shooter',  name:'1v1.LOL',           file:'./g/1v1.lol.html',           icon:'./g/assets/1v1.lol.png' },
    { tag:'Sports',   name:'Basket Bros',       file:'./g/basket-bros.html',       icon:'./g/assets/basket-bros.png' },
    { tag:'Arcade',   name:'Moto X3M',          file:'./g/moto-x3m.html',          icon:'./g/assets/moto-x3m.png' },
    { tag:'Puzzle',   name:'Cookie Clicker',    file:'./g/cookie-clicker.html',    icon:'./g/assets/cookie-clicker.png' },
    { tag:'Arcade',   name:'Escape Road City 2', file:'./g/escape-road-city-2.html', icon:'./g/assets/escape-road-city-2.png' },
    { tag:'Arcade',   name:'Tomb Of The Mask', file:'./g/tomb-of-the-mask.html', icon:'./g/assets/tomb-of-the-mask.png' },
  ];

  function renderGrid(){
    grid.innerHTML = games.map((g, i) => `
      <div class="arc-tile" tabindex="0" data-index="${i}" style="animation-delay:${i * 45}ms">
        <div class="tile-thumb">
          <img class="tile-icon" src="${g.icon}" alt="${g.name}" onerror="this.style.display='none'" />
          <div class="tile-play-overlay">
            <button class="tile-play-btn" data-index="${i}" aria-label="Play ${g.name}">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
        </div>
        <div class="tile-caption">
          <span class="tile-name">${g.name}</span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.arc-tile').forEach(tile => {
      const open = () => openGame(games[tile.dataset.index]);
      tile.addEventListener('click', open);
      tile.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    });
    grid.querySelectorAll('.tile-play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openGame(games[btn.dataset.index]); });
    });
  }
  renderGrid();

  function openGame(game){
    const scrim = document.createElement('div');
    scrim.className = 'game-scrim';
    scrim.innerHTML = `
      <div class="game-modal" role="dialog" aria-modal="true" aria-label="Play ${game.name}">
        <div class="game-modal-bar">
          <span class="game-modal-title">${game.name}</span>
          <div class="game-modal-actions">
            <button type="button" class="game-btn" id="gm-fullscreen" title="Toggle fullscreen">⛶ full</button>
            <button type="button" class="game-btn" id="gm-close">close [esc]</button>
          </div>
        </div>
        <div class="game-modal-frame">
          <iframe src="${game.file}" title="${game.name}"
            allow="fullscreen; gamepad; autoplay" allowfullscreen></iframe>
        </div>
      </div>`;
    document.body.appendChild(scrim);
    requestAnimationFrame(() => scrim.classList.add('open'));

    const modal = scrim.querySelector('.game-modal');
    const fsBtn = scrim.querySelector('#gm-fullscreen');
    const closeBtn = scrim.querySelector('#gm-close');

    const exitFullscreen = () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
    const close = () => {
      if (state.confirmBeforeClose && !window.confirm('Exit this game?')) return;
      exitFullscreen();
      scrim.classList.remove('open');
      setTimeout(() => scrim.remove(), 200);
    };
    const toggleFullscreen = () => {
      if (document.fullscreenElement) exitFullscreen();
      else if (modal.requestFullscreen) modal.requestFullscreen().catch(() => {});
    };
    const syncFsLabel = () => {
      fsBtn.textContent = document.fullscreenElement ? '⤢ exit full' : '⛶ full';
    };
    document.addEventListener('fullscreenchange', syncFsLabel);

    if (state.fullscreenOnPlay && modal.requestFullscreen){
      setTimeout(() => modal.requestFullscreen().catch(() => {}), 350);
    }

    closeBtn.addEventListener('click', close);
    fsBtn.addEventListener('click', toggleFullscreen);
    scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) close(); });

    const escHandler = (e) => {
      if (e.key !== 'Escape') return;
      if (document.fullscreenElement){ exitFullscreen(); return; }
      close();
    };
    document.addEventListener('keydown', escHandler);

    const observer = new MutationObserver(() => {
      if (!scrim.isConnected){
        document.removeEventListener('keydown', escHandler);
        document.removeEventListener('fullscreenchange', syncFsLabel);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });

    closeBtn.focus();
  }

  function activateArchive(){
    if (activated) return;
    activated = true;

    flash.style.transition = 'opacity 0.15s ease';
    flash.style.opacity = '1';

    setTimeout(() => {
      eduSite.style.display = 'none';
      flash.style.opacity = '0';
      archiveRoot.classList.add('active');
      archiveRoot.setAttribute('aria-hidden', 'false');

      setTimeout(() => {
        archiveRoot.classList.remove('active');
        archiveSite.classList.add('active');
        // now that the archive is actually visible, it's safe to start
        // the background fx loop (if a mode was previously selected)
        applyFx();
      }, 2450);
    }, 160);
  }

  window.addEventListener('keydown', (e) => {
    if (activated) return;
    if (e.key && e.key.toLowerCase() === TRIGGER_KEY) activateArchive();
  });

  // ---- Settings (embedded in-page view — no navigation, no overlay) ----
  const settingsBtn = document.getElementById('settings-btn');
  const settingsBack = document.getElementById('settings-back');
  const themeRow = document.getElementById('theme-row');
  const fxSelect = document.getElementById('fx-select');
  const fxDensity = document.getElementById('fx-density');
  const gridSizeSelect = document.getElementById('grid-size-select');
  const toggleFullscreen = document.getElementById('toggle-fullscreen');
  const toggleConfirmClose = document.getElementById('toggle-confirm-close');
  const toggleReduceMotion = document.getElementById('toggle-reduce-motion');
  const toggleCloakEnabled = document.getElementById('toggle-cloak');
  const cloakTitleInput = document.getElementById('cloak-title');
  const cloakFaviconInput = document.getElementById('cloak-favicon');

  if (settingsBtn){
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      archiveSite.classList.add('settings-open');
    });
  }
  if (settingsBack){
    settingsBack.addEventListener('click', () => {
      archiveSite.classList.remove('settings-open');
    });
  }

  function applyTheme(){
    if (state.theme === 'default') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', state.theme);
    if (themeRow){
      themeRow.querySelectorAll('.theme-swatch').forEach(s =>
        s.classList.toggle('selected', s.dataset.theme === state.theme));
    }
  }
  if (themeRow){
    themeRow.querySelectorAll('.theme-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        state.theme = swatch.dataset.theme;
        applyTheme();
        save();
      });
    });
  }

  function applyFx(){
    window.__fx.setDensity(state.fxDensity);
    if (state.reduceMotion) window.__fx.setMode('off');
    else window.__fx.setMode(state.fx);
  }
  if (fxSelect){
    fxSelect.value = state.fx;
    fxSelect.addEventListener('change', () => { state.fx = fxSelect.value; save(); applyFx(); });
  }
  if (fxDensity){
    fxDensity.value = String(state.fxDensity);
    fxDensity.addEventListener('change', () => { state.fxDensity = parseFloat(fxDensity.value) || 1; save(); applyFx(); });
  }

  grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${state.gridSize}px, 1fr))`;
  if (gridSizeSelect){
    gridSizeSelect.value = String(state.gridSize);
    gridSizeSelect.addEventListener('change', () => {
      state.gridSize = parseInt(gridSizeSelect.value, 10);
      grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${state.gridSize}px, 1fr))`;
      save();
    });
  }

  function bindToggle(el, key){
    if (!el) return;
    el.classList.toggle('on', !!state[key]);
    el.addEventListener('click', () => {
      state[key] = !state[key];
      el.classList.toggle('on', state[key]);
      save();
    });
  }
  bindToggle(toggleFullscreen, 'fullscreenOnPlay');
  bindToggle(toggleConfirmClose, 'confirmBeforeClose');

  if (toggleReduceMotion){
    toggleReduceMotion.classList.toggle('on', !!state.reduceMotion);
    toggleReduceMotion.addEventListener('click', () => {
      state.reduceMotion = !state.reduceMotion;
      toggleReduceMotion.classList.toggle('on', state.reduceMotion);
      document.body.classList.toggle('reduce-motion', state.reduceMotion);
      save();
      applyFx();
    });
  }

  // Tab Cloaking
  function applyCloak(){
    if (state.cloakEnabled){
      document.title = state.cloakTitle || 'Classes';
      // Remove existing favicons
      const existingIcons = document.querySelectorAll('link[rel*="icon"]');
      existingIcons.forEach(icon => icon.remove());
      // Add new favicon
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/x-icon';
      link.href = state.cloakFavicon || 'https://www.gstatic.com/classroom/logo_square_rounded.svg';
      document.head.appendChild(link);
    } else {
      // Check if archive is activated
      if (activated){
        document.title = 'The Archive';
      } else {
        document.title = 'Fairview Unified — Digital Learning Portal';
      }
      // Restore original favicon
      const existingIcons = document.querySelectorAll('link[rel*="icon"]');
      existingIcons.forEach(icon => icon.remove());
      
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/x-icon';
      link.href = 'https://www.gstatic.com/classroom/logo_square_rounded.svg';
      document.head.appendChild(link);
    }
  }

  if (toggleCloakEnabled){
    toggleCloakEnabled.classList.toggle('on', !!state.cloakEnabled);
    toggleCloakEnabled.addEventListener('click', () => {
      state.cloakEnabled = !state.cloakEnabled;
      toggleCloakEnabled.classList.toggle('on', state.cloakEnabled);
      save();
      applyCloak();
    });
  }

  if (cloakTitleInput){
    cloakTitleInput.value = state.cloakTitle;
    cloakTitleInput.addEventListener('input', () => {
      state.cloakTitle = cloakTitleInput.value;
      save();
      if (state.cloakEnabled) applyCloak();
    });
  }

  if (cloakFaviconInput){
    cloakFaviconInput.value = state.cloakFavicon;
    cloakFaviconInput.addEventListener('input', () => {
      state.cloakFavicon = cloakFaviconInput.value;
      save();
      if (state.cloakEnabled) applyCloak();
    });
  }

  // Apply cloak on page load if enabled
  applyCloak();

  // Apply the saved theme immediately, but hold off starting the FX particle loop
  // until the archive is actually unlocked — otherwise a previously-saved fx choice
  // (rain/matrix/etc) would start animating behind the educational disguise on load.
  applyTheme();
  document.body.classList.toggle('reduce-motion', state.reduceMotion);

  const crest = document.querySelector('.edu-crest');
  let tapCount = 0, tapTimer = null;
  if (crest){
    crest.addEventListener('touchstart', () => {
      tapCount++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { tapCount = 0; }, 1200);
      if (tapCount >= 5) activateArchive();
    }, { passive: true });
  }

})();