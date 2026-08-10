/**
 * Gamepix Integration Module
 * Dynamically loads games from Gamepix RSS feed
 * Provides pagination, search, filtering, and caching
 */

(function() {
  'use strict';

  const GAMEPIX_CONFIG = {
    sid: '1',
    baseUrl: 'https://feeds.gamepix.com/v2/json',
    defaults: {
      order: 'quality',
      pagination: 48,
      page: 1
    }
  };

  // Category mapping from Gamepix to our tags
  const CATEGORY_MAP = {
    'arcade': 'Arcade',
    'action': 'Action',
    'adventure': 'Adventure',
    'puzzle': 'Puzzle',
    'racing': 'Racing',
    'sports': 'Sports',
    'shooter': 'Shooter',
    'fighting': 'Fighting',
    'strategy': 'Strategy',
    'simulation': 'Simulation',
    'casual': 'Casual',
    'hyper-casual': 'Casual',
    'idle': 'Idle',
    'clicker': 'Idle',
    'card': 'Card',
    'board': 'Board',
    'trivia': 'Trivia',
    'educational': 'Educational',
    'kids': 'Kids',
    'memory': 'Puzzle',
    'math': 'Educational',
    'drawing': 'Casual',
    'music': 'Casual',
    'rhythm': 'Casual',
    'ball': 'Arcade',
    'match-3': 'Puzzle',
    '2048': 'Puzzle',
    'farming': 'Simulation',
    'battle': 'Action',
    'hidden-object': 'Puzzle',
    'io': 'Multiplayer',
    'stickman': 'Action',
    'zombie': 'Action',
    'building': 'Simulation',
    'block': 'Puzzle',
    'retro': 'Arcade',
    'cats': 'Casual',
    'animal': 'Casual',
    'fun': 'Casual',
    'first-person-shooter': 'Shooter',
    'car': 'Racing',
    'basketball': 'Sports',
    'golf': 'Sports',
    'runner': 'Arcade',
    'monster': 'Adventure',
    'platformer': 'Arcade',
    'snake': 'Arcade',
    'games-for-girls': 'Casual',
    'christmas': 'Seasonal',
    'brain': 'Puzzle'
  };

  // State
  let gamepixState = {
    cache: new Map(),
    currentPage: 1,
    currentCategory: '',
    currentSearch: '',
    isLoading: false,
    hasMore: true,
    totalLoaded: 0
  };

  // DOM Elements (will be initialized later)
  let gamepixElements = {
    section: null,
    grid: null,
    searchInput: null,
    categorySelect: null,
    loadMoreBtn: null,
    loadingIndicator: null,
    toggleSwitch: null
  };

  // Initialize Gamepix system
  function initGamepix() {
    createGamepixUI();
    bindEvents();
    loadSavedPreferences();
  }

  // Create Gamepix UI elements
  function createGamepixUI() {
    // Create the Gamepix section that will be shown/hidden
    const browseView = document.getElementById('browse-view');
    if (!browseView) return;

    // Insert Gamepix controls after the search bar
    const arcHero = browseView.querySelector('.arc-hero');
    if (!arcHero) return;

    // Create the toggle switch container
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'gamepix-toggle-container';
    toggleContainer.innerHTML = `
      <div class="gamepix-toggle-wrapper">
        <span class="gamepix-toggle-label" data-mode="local">Local Games</span>
        <label class="gamepix-toggle">
          <input type="checkbox" id="gamepix-mode-toggle" ${gamepixState.mode === 'gamepix' ? 'checked' : ''}>
          <span class="gamepix-toggle-slider"></span>
        </label>
        <span class="gamepix-toggle-label" data-mode="gamepix">Gamepix</span>
      </div>
      <div class="gamepix-controls" id="gamepix-controls" style="display: none;">
        <div class="gamepix-search">
          <input type="text" id="gamepix-search" placeholder="Search Gamepix games..." autocomplete="off">
        </div>
        <div class="gamepix-filter">
          <select id="gamepix-category" class="gamepix-category-select">
            <option value="">All Categories</option>
          </select>
        </div>
      </div>
    `;
    arcHero.appendChild(toggleContainer);

    // Create Gamepix grid section
    const gamepixSection = document.createElement('section');
    gamepixSection.className = 'gamepix-section';
    gamepixSection.id = 'gamepix-section';
    gamepixSection.style.display = 'none';
    gamepixSection.innerHTML = `
      <div class="gamepix-header">
        <h2>Gamepix Arcade</h2>
        <div class="gamepix-stats">
          <span id="gamepix-count">0 games</span>
        </div>
      </div>
      <div class="arc-grid" id="gamepix-grid"></div>
      <div class="gamepix-pagination">
        <button type="button" id="gamepix-load-more" class="gamepix-load-more-btn">Load More</button>
        <div class="gamepix-loading" id="gamepix-loading" style="display: none;">
          <div class="gamepix-spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
      <div class="gamepix-empty" id="gamepix-empty" style="display: none;">
        <p>No games found. Try adjusting your search or filter.</p>
      </div>
    `;
    browseView.appendChild(gamepixSection);

    // Store references
    gamepixElements.section = document.getElementById('gamepix-section');
    gamepixElements.grid = document.getElementById('gamepix-grid');
    gamepixElements.searchInput = document.getElementById('gamepix-search');
    gamepixElements.categorySelect = document.getElementById('gamepix-category');
    gamepixElements.loadMoreBtn = document.getElementById('gamepix-load-more');
    gamepixElements.loadingIndicator = document.getElementById('gamepix-loading');
    gamepixElements.toggleSwitch = document.getElementById('gamepix-mode-toggle');

    // Populate category dropdown
    populateCategories();
  }

  // Populate category dropdown with unique categories from Gamepix
  async function populateCategories() {
    try {
      const data = await fetchGamepixPage(1, 12);
      const categories = new Set();
      data.items?.forEach(item => {
        if (item.category) categories.add(item.category);
      });
      const sortedCategories = Array.from(categories).sort();
      sortedCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ');
        gamepixElements.categorySelect.appendChild(option);
      });
    } catch (e) {
      console.warn('Gamepix: Could not load categories', e);
    }
  }

  // Bind events
  function bindEvents() {
    // Toggle switch
    if (gamepixElements.toggleSwitch) {
      gamepixElements.toggleSwitch.addEventListener('change', handleToggleChange);
    }

    // Search input with debounce
    if (gamepixElements.searchInput) {
      let searchDebounce;
      gamepixElements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
          handleSearch(e.target.value);
        }, 300);
      });
    }

    // Category filter
    if (gamepixElements.categorySelect) {
      gamepixElements.categorySelect.addEventListener('change', (e) => {
        handleCategoryChange(e.target.value);
      });
    }

    // Load more button
    if (gamepixElements.loadMoreBtn) {
      gamepixElements.loadMoreBtn.addEventListener('click', loadMoreGames);
    }
  }

  // Load saved preferences from localStorage
  function loadSavedPreferences() {
    try {
      const saved = localStorage.getItem('gamepix-prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.mode) gamepixState.mode = prefs.mode;
        if (prefs.mode === 'gamepix' && gamepixElements.toggleSwitch) {
          gamepixElements.toggleSwitch.checked = true;
          handleToggleChange({ target: gamepixElements.toggleSwitch }, true);
        }
      }
    } catch (e) {
      console.warn('Gamepix: Could not load preferences', e);
    }
  }

  // Save preferences to localStorage
  function savePreferences() {
    try {
      localStorage.setItem('gamepix-prefs', JSON.stringify({
        mode: gamepixState.mode,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Gamepix: Could not save preferences', e);
    }
  }

  // Handle toggle change
  function handleToggleChange(e, isInitial = false) {
    const isGamepix = e.target.checked;
    gamepixState.mode = isGamepix ? 'gamepix' : 'local';

    const localGamesSection = document.getElementById('browse-view');
    const gamepixControls = document.getElementById('gamepix-controls');
    const localGrid = document.getElementById('game-grid');

    if (isGamepix) {
      // Show Gamepix, hide local
      gamepixElements.section.style.display = 'block';
      localGrid.style.display = 'none';
      if (gamepixControls) gamepixControls.style.display = 'flex';
      if (!isInitial && gamepixState.totalLoaded === 0) {
        loadGamepixGames(true);
      }
    } else {
      // Show local, hide Gamepix
      gamepixElements.section.style.display = 'none';
      localGrid.style.display = 'grid';
      if (gamepixControls) gamepixControls.style.display = 'none';
    }

    savePreferences();
    updateToggleLabels(isGamepix);
  }

  function updateToggleLabels(isGamepix) {
    const labels = document.querySelectorAll('.gamepix-toggle-label');
    labels.forEach(label => {
      const mode = label.dataset.mode;
      if ((mode === 'gamepix' && isGamepix) || (mode === 'local' && !isGamepix)) {
        label.style.fontWeight = '700';
        label.style.color = 'var(--arc-accent)';
      } else {
        label.style.fontWeight = '400';
        label.style.color = 'var(--arc-fg-mid)';
      }
    });
  }

  // Handle search
  function handleSearch(query) {
    gamepixState.currentSearch = query.toLowerCase().trim();
    gamepixState.currentPage = 1;
    gamepixState.hasMore = true;
    loadGamepixGames(true);
  }

  // Handle category change
  function handleCategoryChange(category) {
    gamepixState.currentCategory = category;
    gamepixState.currentPage = 1;
    gamepixState.hasMore = true;
    loadGamepixGames(true);
  }

  // Load Gamepix games
  async function loadGamepixGames(reset = false) {
    if (gamepixState.isLoading) return;
    if (reset) {
      gamepixElements.grid.innerHTML = '';
      gamepixState.currentPage = 1;
      gamepixState.totalLoaded = 0;
      gamepixState.hasMore = true;
    }
    if (!gamepixState.hasMore) return;

    gamepixState.isLoading = true;
    showLoading(true);
    hideEmpty();

    try {
      const data = await fetchGamepixPage(gamepixState.currentPage, GAMEPIX_CONFIG.defaults.pagination);
      if (!data.items || data.items.length === 0) {
        gamepixState.hasMore = false;
        showEmpty();
        return;
      }

      let games = data.items.map(convertGamepixItem);

      // Apply search filter locally (since API doesn't support search)
      if (gamepixState.currentSearch) {
        games = games.filter(g =>
          g.name.toLowerCase().includes(gamepixState.currentSearch) ||
          g.description.toLowerCase().includes(gamepixState.currentSearch) ||
          g.category.toLowerCase().includes(gamepixState.currentSearch)
        );
      }

      // Apply category filter locally
      if (gamepixState.currentCategory) {
        games = games.filter(g => g.rawCategory === gamepixState.currentCategory);
      }

      if (games.length === 0 && gamepixState.currentPage === 1) {
        showEmpty();
        gamepixState.hasMore = false;
      } else {
        renderGamepixGames(games);
        gamepixState.totalLoaded += games.length;
        gamepixState.currentPage++;
        gamepixState.hasMore = games.length >= GAMEPIX_CONFIG.defaults.pagination;
      }
    } catch (error) {
      console.error('Gamepix: Error loading games', error);
      if (gamepixState.currentPage === 1) {
        showEmpty();
      }
    } finally {
      gamepixState.isLoading = false;
      showLoading(false);
      updateLoadMoreButton();
    }
  }

  // Fetch a page from Gamepix API
  async function fetchGamepixPage(page, pagination) {
    const cacheKey = `page-${page}-${pagination}`;
    if (gamepixState.cache.has(cacheKey)) {
      return gamepixState.cache.get(cacheKey);
    }

    const params = new URLSearchParams({
      sid: GAMEPIX_CONFIG.sid,
      order: GAMEPIX_CONFIG.defaults.order,
      page: page.toString(),
      pagination: pagination.toString()
    });

    if (gamepixState.currentCategory) {
      params.append('category', gamepixState.currentCategory);
    }

    const url = `${GAMEPIX_CONFIG.baseUrl}?${params.toString()}`;
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Gamepix API error: ${response.status}`);
    }

    const data = await response.json();
    gamepixState.cache.set(cacheKey, data);
    return data;
  }

  // Convert Gamepix item to our game format
  function convertGamepixItem(item) {
    return {
      id: item.id,
      name: item.title,
      namespace: item.namespace,
      description: item.description || '',
      category: CATEGORY_MAP[item.category?.toLowerCase()] || 'Arcade',
      rawCategory: item.category,
      icon: item.image || item.banner_image,
      bannerImage: item.banner_image,
      url: item.url,
      source: 'gamepix'
    };
  }

  // Render games to grid
  function renderGamepixGames(games) {
    const html = games.map((game, index) => `
      <div class="arc-tile gamepix-tile" tabindex="0" data-namespace="${game.namespace}" data-index="${gamepixState.totalLoaded + index}" style="animation-delay:${(gamepixState.totalLoaded + index) * 30}ms">
        <div class="tile-thumb">
          <img class="tile-icon" src="${game.icon}" alt="${game.name}" loading="lazy" onerror="this.style.display='none'" />
          <span class="tile-source">☁️ Gamepix</span>
          <div class="tile-play-overlay">
            <button class="tile-play-btn" data-namespace="${game.namespace}" aria-label="Play ${game.name}">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
        </div>
        <div class="tile-caption">
          <span class="tile-name">${game.name}</span>
          <span class="tile-category">${game.category}</span>
        </div>
      </div>
    `).join('');

    gamepixElements.grid.insertAdjacentHTML('beforeend', html);

    // Bind click events for new tiles
    const newTiles = gamepixElements.grid.querySelectorAll('.gamepix-tile:not([data-bound])');
    newTiles.forEach(tile => {
      tile.dataset.bound = 'true';
      tile.addEventListener('click', () => openGamepixGame(tile.dataset.namespace, tile.querySelector('.tile-name').textContent));
      tile.addEventListener('keydown', (e) => { if (e.key === 'Enter') openGamepixGame(tile.dataset.namespace, tile.querySelector('.tile-name').textContent); });
    });
  }

  // Open Gamepix game in existing modal
  function openGamepixGame(namespace, name) {
    const game = {
      name: name,
      file: `https://play.gamepix.com/${namespace}/embed?sid=${GAMEPIX_CONFIG.sid}`,
      source: 'gamepix'
    };

    // Use the existing openGame function from script.js
    if (window.openGame) {
      window.openGame(game);
    } else {
      // Fallback if not available
      openGamepixModal(game);
    }
  }

  // Fallback modal for Gamepix games
  function openGamepixModal(game) {
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
          <iframe title="${game.name}"
            src="${game.file}"
            allow="fullscreen; gamepad; autoplay"
            allowfullscreen
            frameborder="0"
            scrolling="no"
            width="100%"
            height="100%"
            referrerpolicy="no-referrer"></iframe>
        </div>
      </div>`;
    document.body.appendChild(scrim);
    requestAnimationFrame(() => scrim.classList.add('open'));

    const modal = scrim.querySelector('.game-modal');
    const iframe = scrim.querySelector('iframe');
    const fsBtn = scrim.querySelector('#gm-fullscreen');
    const closeBtn = scrim.querySelector('#gm-close');

    // Handle Gamepix events
    window.addEventListener('message', handleGamepixMessage);

    const exitFullscreen = () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
    const close = () => {
      window.removeEventListener('message', handleGamepixMessage);
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

    closeBtn.addEventListener('click', close);
    fsBtn.addEventListener('click', toggleFullscreen);
    scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) close(); });

    const escHandler = (e) => {
      if (e.key !== 'Escape') return;
      if (document.fullscreenElement) { exitFullscreen(); return; }
      close();
    };
    document.addEventListener('keydown', escHandler);

    closeBtn.focus();
  }

  // Handle Gamepix postMessage events
  function handleGamepixMessage(e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'update_score') {
      console.log('Gamepix Score:', e.data.score);
      // Dispatch custom event for any score tracking system
      window.dispatchEvent(new CustomEvent('gamepix-score', { detail: { score: e.data.score } }));
    }
    if (e.data.type === 'update_level') {
      console.log('Gamepix Level:', e.data.level);
      window.dispatchEvent(new CustomEvent('gamepix-level', { detail: { level: e.data.level } }));
    }
  }

  // Load more games
  function loadMoreGames() {
    if (!gamepixState.isLoading && gamepixState.hasMore) {
      loadGamepixGames(false);
    }
  }

  // Update load more button visibility
  function updateLoadMoreButton() {
    if (gamepixElements.loadMoreBtn) {
      gamepixElements.loadMoreBtn.style.display = gamepixState.hasMore && !gamepixState.isLoading ? 'block' : 'none';
    }
  }

  // Show/hide loading indicator
  function showLoading(show) {
    if (gamepixElements.loadingIndicator) {
      gamepixElements.loadingIndicator.style.display = show ? 'flex' : 'none';
    }
    if (gamepixElements.loadMoreBtn) {
      gamepixElements.loadMoreBtn.style.display = show ? 'none' : (gamepixState.hasMore ? 'block' : 'none');
    }
  }

  // Show/hide empty state
  function showEmpty() {
    const empty = document.getElementById('gamepix-empty');
    if (empty) empty.style.display = 'block';
  }
  function hideEmpty() {
    const empty = document.getElementById('gamepix-empty');
    if (empty) empty.style.display = 'none';
  }

  // Expose to window for integration
  window.Gamepix = {
    init: initGamepix,
    loadMore: loadMoreGames,
    search: handleSearch,
    filterByCategory: handleCategoryChange,
    openGame: openGamepixGame
  };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGamepix);
  } else {
    initGamepix();
  }
})();