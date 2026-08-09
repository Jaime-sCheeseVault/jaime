(function(){
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

  function applyTheme(){
    if (state.theme === 'default') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', state.theme);
    themeRow.querySelectorAll('.theme-swatch').forEach(s =>
      s.classList.toggle('selected', s.dataset.theme === state.theme));
  }
  themeRow.querySelectorAll('.theme-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      state.theme = swatch.dataset.theme;
      applyTheme();
      save();
    });
  });

  fxSelect.value = state.fx;
  fxSelect.addEventListener('change', () => { state.fx = fxSelect.value; save(); });

  fxDensity.value = String(state.fxDensity);
  fxDensity.addEventListener('change', () => { state.fxDensity = parseFloat(fxDensity.value) || 1; save(); });

  gridSizeSelect.value = String(state.gridSize);
  gridSizeSelect.addEventListener('change', () => {
    state.gridSize = parseInt(gridSizeSelect.value, 10);
    save();
  });

  function bindToggle(el, key){
    el.classList.toggle('on', !!state[key]);
    el.addEventListener('click', () => {
      state[key] = !state[key];
      el.classList.toggle('on', state[key]);
      save();
    });
  }
  bindToggle(toggleFullscreen, 'fullscreenOnPlay');
  bindToggle(toggleConfirmClose, 'confirmBeforeClose');
  bindToggle(toggleReduceMotion, 'reduceMotion');

  // Tab Cloaking
  const CLOAK_FAV = 'https://www.gstatic.com/classroom/logo_square_rounded.svg';
  function setFavicon(href){
    try {
      document.querySelectorAll('link[rel*="icon"]').forEach(icon => icon.remove());
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = href;
      document.head.appendChild(link);
    } catch (e) {}
  }
  function setParentFavicon(href){
    try {
      if (window.top === window) return;
      const pd = parent.document;
      pd.querySelectorAll('link[rel*="icon"]').forEach(i => i.remove());
      const link = pd.createElement('link');
      link.rel = 'icon';
      link.type = 'image/x-icon';
      link.href = href;
      pd.head.appendChild(link);
    } catch (e) {}
  }
  function syncCloak(){
    try {
      if (state.cloakEnabled){
        const t = state.cloakTitle || 'Classes';
        try { document.title = t; } catch (e) {}
        try { if (window.top !== window && parent.document) parent.document.title = t; } catch (e) {}
        setFavicon(state.cloakFavicon || CLOAK_FAV);
        setParentFavicon(state.cloakFavicon || CLOAK_FAV);
        try {
          if (window === window.top && /^https?:/.test(location.protocol) && history.replaceState){
            history.replaceState(history.state || {}, t, 'about:blank');
          }
        } catch (e) {}
      } else {
        document.title = 'Settings — The Archive';
        setFavicon('./g/assets/favicon-96x96.png');
        setParentFavicon('./g/assets/favicon-96x96.png');
      }
    } catch (e) {}
  }
  function applyCloak(){ syncCloak(); }
  setInterval(() => { try { syncCloak(); } catch (e) {} }, 1200);
  window.addEventListener('focus', () => { try { syncCloak(); } catch (e) {} });
  document.addEventListener('visibilitychange', () => { try { if (!document.hidden) syncCloak(); } catch (e) {} });

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

  applyTheme();
})();