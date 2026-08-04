(function(){
  const SKEY = 'thearchive.settings';
  const DEFAULTS = {
    theme: 'default', fx: 'off', fxDensity: 1,
    gridSize: 180, fullscreenOnPlay: false, confirmBeforeClose: false, reduceMotion: false,
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

  applyTheme();
})();