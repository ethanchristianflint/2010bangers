/**
 * Undisputed Bangers - Application State & Logic
 * Features: Multi-slider filtering, Instant Search, Vibe Presets, Era/BPM filters, 
 * Vibe Roulette, Wikipedia Links, Scrubber Timeline, Favorites System, Prev/Volume controls, and Beat Pulse Visualizer.
 */

// Global State Object
let appState = {
  isInitialized: false,
  filters: {
    minEnergy: 0,
    minValence: 0,
    minDanceability: 0,
    searchQuery: '',
    year: 'all',
    tempoRange: 'all',
    activePreset: 'all'
  },
  filteredPlaylist: [], // Array of song objects matching current filters
  currentSongIndex: 0,  // Index within filteredPlaylist
  isPlaying: false,
  playerStatus: 'UNSTARTED'
};

// Expose state globally
window.appState = appState;

// Vibe preset definitions
const PRESET_CONFIGS = {
  all: { minEnergy: 0, minValence: 0, minDanceability: 0 },
  favorites: { minEnergy: 0, minValence: 0, minDanceability: 0 },
  club: { minEnergy: 82, minValence: 65, minDanceability: 75 },
  euphoria: { minEnergy: 75, minValence: 80, minDanceability: 70 },
  rnb: { minEnergy: 45, minValence: 55, minDanceability: 60 },
  chill: { minEnergy: 35, minValence: 40, minDanceability: 45 }
};

// --------------------------------------------------------------------------
// Favorites System (Local Storage Persistence)
// --------------------------------------------------------------------------
function getFavorites() {
  try {
    const raw = localStorage.getItem('vibe_check_favorites');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function toggleFavorite(songId) {
  const favs = getFavorites();
  const index = favs.indexOf(songId);
  if (index !== -1) {
    favs.splice(index, 1);
  } else {
    favs.push(songId);
  }
  try {
    localStorage.setItem('vibe_check_favorites', JSON.stringify(favs));
  } catch (e) {}

  updateFavBadgeCount();

  if (appState.filters.activePreset === 'favorites') {
    applyFilters();
  } else {
    renderTrackFeed();
  }
}

function updateFavBadgeCount() {
  const badge = document.getElementById('fav-count-badge');
  if (badge) {
    badge.textContent = getFavorites().length;
  }
}

// --------------------------------------------------------------------------
// Filtering Engine
// --------------------------------------------------------------------------
function applyFilters() {
  const songs = window.SONG_DATA || [];
  const { minEnergy, minValence, minDanceability, searchQuery, year, tempoRange, activePreset } = appState.filters;

  const previousSelectedSong = appState.filteredPlaylist[appState.currentSongIndex];
  const query = (searchQuery || '').trim().toLowerCase();
  const favList = getFavorites();

  appState.filteredPlaylist = songs.filter((song) => {
    // 0. Favorites Preset
    if (activePreset === 'favorites') {
      if (!favList.includes(song.id)) return false;
    }

    const { energy, valence, danceability, tempo } = song.attributes;

    // 1. Core Slider Filters
    if (energy < minEnergy || valence < minValence || danceability < minDanceability) {
      return false;
    }

    // 2. Instant Search Filter (Title, Artist)
    if (query) {
      const matchTitle = song.title.toLowerCase().includes(query);
      const matchArtist = song.artist.toLowerCase().includes(query);
      if (!matchTitle && !matchArtist) return false;
    }

    // 3. Era / Year Filter
    if (year !== 'all') {
      if (song.year !== parseInt(year, 10)) return false;
    }

    // 4. Tempo / BPM Filter
    if (tempoRange === 'chill' && tempo >= 100) return false;
    if (tempoRange === 'mid' && (tempo < 100 || tempo >= 120)) return false;
    if (tempoRange === 'fast' && tempo < 120) return false;

    return true;
  });

  // Preserve selected song index if still present in filtered playlist
  if (previousSelectedSong) {
    const newIdx = appState.filteredPlaylist.findIndex((s) => s.id === previousSelectedSong.id);
    if (newIdx !== -1) {
      appState.currentSongIndex = newIdx;
    } else {
      appState.currentSongIndex = 0;
    }
  } else {
    appState.currentSongIndex = 0;
  }

  // Update match counter UI
  const matchCountEl = document.getElementById('match-count');
  if (matchCountEl) {
    const count = appState.filteredPlaylist.length;
    matchCountEl.textContent = `${count} anthem${count === 1 ? '' : 's'} found`;
  }

  // Render cards & update bottom player
  renderTrackFeed();
  updatePlayerUI();
}

// --------------------------------------------------------------------------
// Track Feed Rendering
// --------------------------------------------------------------------------
function renderTrackFeed() {
  const feedEl = document.getElementById('track-feed');
  if (!feedEl) return;

  if (appState.filteredPlaylist.length === 0) {
    feedEl.innerHTML = `
      <div class="empty-feed">
        <span class="empty-icon">🎵</span>
        <h3 class="empty-title">No matching bangers found</h3>
        <p class="empty-desc">Try easing down the Energy, Mood, or Danceability sliders, or reset your filters!</p>
        <button class="filter-chip" onclick="resetAllFilters()" style="margin-top: 10px; padding: 6px 14px;">Reset All</button>
      </div>
    `;
    return;
  }

  const currentSong = appState.filteredPlaylist[appState.currentSongIndex];
  const favList = getFavorites();

  const html = appState.filteredPlaylist.map((song, index) => {
    const isCurrent = currentSong && currentSong.id === song.id;
    const isPlayingCurrent = isCurrent && appState.isPlaying;
    const isFav = favList.includes(song.id);

    // Wikipedia search URL
    const searchQuery = encodeURIComponent(song.artist + ' ' + song.title);
    const wikiLink = 'https://en.wikipedia.org/w/index.php?search=' + searchQuery;

    return `
      <article 
        class="song-card ${isCurrent ? 'is-active' : ''} ${isPlayingCurrent ? 'is-playing' : ''}" 
        data-index="${index}"
        data-id="${song.id}"
        role="button"
        tabindex="0"
        aria-label="Play ${escapeHtml(song.title)} by ${escapeHtml(song.artist)}"
      >
        <div class="card-main">
          <div class="card-title-row">
            <h3 class="card-title">${escapeHtml(song.title)}</h3>
          </div>
          <p class="card-artist">${escapeHtml(song.artist)} • ${song.year} (${song.attributes.tempo} BPM)</p>
          <div class="card-badges">
            <span class="attr-pill ruby" title="Energy">
              <span class="jewel-dot ruby"></span> ${song.attributes.energy}% Energy
            </span>
            <span class="attr-pill sapphire" title="Mood">
              <span class="jewel-dot sapphire"></span> ${song.attributes.valence}% Mood
            </span>
            <span class="attr-pill emerald" title="Danceability">
              <span class="jewel-dot emerald"></span> ${song.attributes.danceability}% Dance
            </span>
          </div>
        </div>
        <div class="card-actions">
          <!-- Favorite Heart Button -->
          <button 
            class="btn-card-fav ${isFav ? 'is-fav' : ''}" 
            type="button" 
            data-fav-id="${song.id}"
            title="${isFav ? 'Favorited' : 'Add to Favorites'}"
            aria-label="${isFav ? 'Unfavorite' : 'Favorite'} ${escapeHtml(song.title)}"
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>

          <!-- Wikipedia Link -->
          <a 
            href="${wikiLink}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="wiki-btn"
            title="Read about ${escapeHtml(song.title)} on Wikipedia"
            aria-label="Learn more about ${escapeHtml(song.title)} on Wikipedia"
          >
            <span>Learn More</span>
            <svg class="wiki-icon" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
              <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
            </svg>
          </a>

          <!-- Play Button -->
          <button 
            class="btn-card-play" 
            type="button" 
            aria-label="${isPlayingCurrent ? 'Pause' : 'Play'} ${escapeHtml(song.title)}"
          >
            ${isPlayingCurrent ? pauseIconSvg() : playIconSvg()}
          </button>
        </div>
      </article>
    `;
  }).join('');

  feedEl.innerHTML = html;

  // Bind click handlers to cards
  const cards = feedEl.querySelectorAll('.song-card');
  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      // 1. Click on Favorite Heart
      if (e.target.closest('.btn-card-fav')) {
        const favBtn = e.target.closest('.btn-card-fav');
        const songId = favBtn.getAttribute('data-fav-id');
        toggleFavorite(songId);
        return;
      }

      // 2. Click on Wikipedia Link
      if (e.target.closest('.wiki-btn')) {
        return;
      }

      // 3. Click elsewhere -> Track selection
      const idx = parseInt(card.getAttribute('data-index'), 10);
      handleTrackSelection(idx);
    });
  });
}

/**
 * Handle user click on a track card or play button
 */
function handleTrackSelection(index) {
  if (index < 0 || index >= appState.filteredPlaylist.length) return;

  if (appState.currentSongIndex === index && appState.isPlaying) {
    // If currently playing, toggle pause
    if (window.YouTubeEngine && typeof window.YouTubeEngine.pause === 'function') {
      window.YouTubeEngine.pause();
    } else {
      appState.isPlaying = false;
      updatePlayerUI();
      renderTrackFeed();
    }
  } else {
    // Switch to selected track and play
    appState.currentSongIndex = index;
    appState.isPlaying = true;
    if (window.YouTubeEngine && typeof window.YouTubeEngine.playTrack === 'function') {
      const song = appState.filteredPlaylist[index];
      window.YouTubeEngine.playTrack(song.youtube_id);
    } else {
      updatePlayerUI();
      renderTrackFeed();
    }
  }
}

/**
 * Update sticky persistent bottom player UI
 */
function updatePlayerUI() {
  const currentSong = appState.filteredPlaylist[appState.currentSongIndex];
  const titleEl = document.getElementById('current-title');
  const artistEl = document.getElementById('current-artist');
  const playerBarEl = document.getElementById('persistent-player');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');

  if (currentSong) {
    if (titleEl) titleEl.textContent = currentSong.title;
    if (artistEl) artistEl.textContent = `${currentSong.artist} (${currentSong.year})`;

    // Ambient BPM Visualizer Glow Sync
    const bpm = (currentSong.attributes && currentSong.attributes.tempo) ? currentSong.attributes.tempo : 124;
    const pulseSec = (60 / bpm).toFixed(2);
    document.documentElement.style.setProperty('--bpm-pulse-duration', `${pulseSec}s`);
  } else {
    if (titleEl) titleEl.textContent = 'Ready to Play';
    if (artistEl) artistEl.textContent = 'Select an anthem above';
  }

  // Play/Pause icon toggling
  if (iconPlay && iconPause) {
    if (appState.isPlaying) {
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
    } else {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
    }
  }

  // Bottom player equalizer animation & background pulse toggle
  if (playerBarEl) {
    if (appState.isPlaying) {
      playerBarEl.classList.add('is-playing');
      document.body.classList.add('is-playing');
    } else {
      playerBarEl.classList.remove('is-playing');
      document.body.classList.remove('is-playing');
    }
  }
}

/**
 * Skip to next track in filteredPlaylist
 */
function playNextTrack() {
  if (appState.filteredPlaylist.length === 0) return;

  appState.currentSongIndex = (appState.currentSongIndex + 1) % appState.filteredPlaylist.length;
  appState.isPlaying = true;

  if (window.YouTubeEngine && typeof window.YouTubeEngine.playTrack === 'function') {
    const song = appState.filteredPlaylist[appState.currentSongIndex];
    window.YouTubeEngine.playTrack(song.youtube_id);
  } else {
    updatePlayerUI();
    renderTrackFeed();
  }
}

/**
 * Skip to previous track (or restart current if > 3s)
 */
function playPrevTrack() {
  if (appState.filteredPlaylist.length === 0) return;

  // If track has been playing for more than 3 seconds, restart it first
  if (window.YouTubeEngine && typeof window.YouTubeEngine.getCurrentTime === 'function') {
    const curTime = window.YouTubeEngine.getCurrentTime();
    if (curTime > 3) {
      window.YouTubeEngine.seekTo(0);
      return;
    }
  }

  appState.currentSongIndex = (appState.currentSongIndex - 1 + appState.filteredPlaylist.length) % appState.filteredPlaylist.length;
  appState.isPlaying = true;

  if (window.YouTubeEngine && typeof window.YouTubeEngine.playTrack === 'function') {
    const song = appState.filteredPlaylist[appState.currentSongIndex];
    window.YouTubeEngine.playTrack(song.youtube_id);
  } else {
    updatePlayerUI();
    renderTrackFeed();
  }
}

/**
 * Vibe Roulette: Pick and play a random anthem from current filtered playlist
 */
function triggerVibeRoulette() {
  if (appState.filteredPlaylist.length === 0) return;

  let nextIdx = Math.floor(Math.random() * appState.filteredPlaylist.length);
  if (appState.filteredPlaylist.length > 1 && nextIdx === appState.currentSongIndex) {
    nextIdx = (nextIdx + 1) % appState.filteredPlaylist.length;
  }

  appState.currentSongIndex = nextIdx;
  appState.isPlaying = true;

  // Pulse animation on shuffle button
  const shuffleBtn = document.getElementById('btn-shuffle');
  if (shuffleBtn) {
    shuffleBtn.style.transform = 'scale(0.85) rotate(180deg)';
    setTimeout(() => {
      shuffleBtn.style.transform = '';
    }, 250);
  }

  if (window.YouTubeEngine && typeof window.YouTubeEngine.playTrack === 'function') {
    const song = appState.filteredPlaylist[nextIdx];
    window.YouTubeEngine.playTrack(song.youtube_id);
  } else {
    updatePlayerUI();
    renderTrackFeed();
  }
}

/**
 * Apply one-tap vibe preset
 */
function applyPreset(presetKey) {
  const config = PRESET_CONFIGS[presetKey];
  if (!config) return;

  appState.filters.minEnergy = config.minEnergy;
  appState.filters.minValence = config.minValence;
  appState.filters.minDanceability = config.minDanceability;
  appState.filters.activePreset = presetKey;

  // Sync range inputs & text displays
  const energySlider = document.getElementById('energy-slider');
  const valenceSlider = document.getElementById('valence-slider');
  const danceabilitySlider = document.getElementById('danceability-slider');

  const energyVal = document.getElementById('energy-val');
  const valenceVal = document.getElementById('valence-val');
  const danceabilityVal = document.getElementById('danceability-val');

  if (energySlider && energyVal) {
    energySlider.value = config.minEnergy;
    energyVal.textContent = `${config.minEnergy}%`;
  }
  if (valenceSlider && valenceVal) {
    valenceSlider.value = config.minValence;
    valenceVal.textContent = `${config.minValence}%`;
  }
  if (danceabilitySlider && danceabilityVal) {
    danceabilitySlider.value = config.minDanceability;
    danceabilityVal.textContent = `${config.minDanceability}%`;
  }

  // Update active pill UI
  const presetPills = document.querySelectorAll('.preset-pill');
  presetPills.forEach((pill) => {
    if (pill.getAttribute('data-preset') === presetKey) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  applyFilters();
}

/**
 * Reset all sliders and filters back to default
 */
function resetAllFilters() {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  if (searchInput) searchInput.value = '';
  if (searchClear) searchClear.classList.add('hidden');
  appState.filters.searchQuery = '';

  appState.filters.year = 'all';
  document.querySelectorAll('#year-filters .filter-chip').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-year') === 'all');
  });

  appState.filters.tempoRange = 'all';
  document.querySelectorAll('#tempo-filters .filter-chip').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-tempo') === 'all');
  });

  applyPreset('all');
}

/**
 * Audio Scrubber & Timeline Initializer
 */
function initScrubber() {
  const timeline = document.getElementById('player-timeline');
  const progress = document.getElementById('timeline-progress');
  const thumb = document.getElementById('timeline-thumb');
  const timeCur = document.getElementById('time-current');
  const timeDur = document.getElementById('time-duration');

  if (!timeline) return;

  function seekFromEvent(e) {
    const rect = timeline.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    
    if (window.YouTubeEngine && typeof window.YouTubeEngine.getDuration === 'function') {
      const dur = window.YouTubeEngine.getDuration() || 0;
      if (dur > 0) {
        window.YouTubeEngine.seekTo(ratio * dur);
        if (progress) progress.style.width = `${ratio * 100}%`;
        if (thumb) thumb.style.left = `${ratio * 100}%`;
        if (timeCur) timeCur.textContent = formatTime(ratio * dur);
      }
    }
  }

  let isDragging = false;
  timeline.addEventListener('mousedown', (e) => {
    isDragging = true;
    seekFromEvent(e);
  });
  window.addEventListener('mousemove', (e) => {
    if (isDragging) seekFromEvent(e);
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch support for iOS mobile
  timeline.addEventListener('touchstart', (e) => {
    seekFromEvent(e);
  }, { passive: true });
  timeline.addEventListener('touchmove', (e) => {
    seekFromEvent(e);
  }, { passive: true });

  // Periodic Scrubber updater
  setInterval(() => {
    if (!window.YouTubeEngine || !appState.isPlaying || isDragging) return;

    const cur = window.YouTubeEngine.getCurrentTime() || 0;
    const dur = window.YouTubeEngine.getDuration() || 0;

    if (dur > 0) {
      const pct = Math.min(100, (cur / dur) * 100);
      if (progress) progress.style.width = `${pct}%`;
      if (thumb) thumb.style.left = `${pct}%`;
      if (timeCur) timeCur.textContent = formatTime(cur);
      if (timeDur) timeDur.textContent = formatTime(dur);
    }
  }, 250);
}

function formatTime(seconds) {
  const s = Math.floor(seconds || 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * UI SVG Helpers
 */
function playIconSvg() {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
}

function pauseIconSvg() {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/**
 * Setup event listeners for UI buttons, sliders, search, and chips
 */
function setupUIListeners() {
  // Sliders
  const energySlider = document.getElementById('energy-slider');
  const valenceSlider = document.getElementById('valence-slider');
  const danceabilitySlider = document.getElementById('danceability-slider');

  const energyVal = document.getElementById('energy-val');
  const valenceVal = document.getElementById('valence-val');
  const danceabilityVal = document.getElementById('danceability-val');

  if (energySlider && energyVal) {
    energySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 0;
      appState.filters.minEnergy = val;
      energyVal.textContent = `${val}%`;
      document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
      applyFilters();
    });
  }

  if (valenceSlider && valenceVal) {
    valenceSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 0;
      appState.filters.minValence = val;
      valenceVal.textContent = `${val}%`;
      document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
      applyFilters();
    });
  }

  if (danceabilitySlider && danceabilityVal) {
    danceabilitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 0;
      appState.filters.minDanceability = val;
      danceabilityVal.textContent = `${val}%`;
      document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
      applyFilters();
    });
  }

  // Instant Search
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      appState.filters.searchQuery = val;
      if (searchClear) {
        if (val.length > 0) {
          searchClear.classList.remove('hidden');
        } else {
          searchClear.classList.add('hidden');
        }
      }
      applyFilters();
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchClear.classList.add('hidden');
      appState.filters.searchQuery = '';
      applyFilters();
    });
  }

  // Preset Pills
  const presetPills = document.querySelectorAll('.preset-pill');
  presetPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const presetKey = pill.getAttribute('data-preset');
      applyPreset(presetKey);
    });
  });

  // Reset Button
  const btnReset = document.getElementById('btn-reset-filters');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      resetAllFilters();
    });
  }

  // Year Filter Chips
  const yearChips = document.querySelectorAll('#year-filters .filter-chip');
  yearChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      yearChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      appState.filters.year = chip.getAttribute('data-year');
      applyFilters();
    });
  });

  // Tempo Filter Chips
  const tempoChips = document.querySelectorAll('#tempo-filters .filter-chip');
  tempoChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      tempoChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      appState.filters.tempoRange = chip.getAttribute('data-tempo');
      applyFilters();
    });
  });

  // Persistent Player Play/Pause Button
  const btnPlayPause = document.getElementById('btn-play-pause');
  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      if (appState.filteredPlaylist.length === 0) return;

      if (appState.isPlaying) {
        if (window.YouTubeEngine && typeof window.YouTubeEngine.pause === 'function') {
          window.YouTubeEngine.pause();
        } else {
          appState.isPlaying = false;
          updatePlayerUI();
          renderTrackFeed();
        }
      } else {
        appState.isPlaying = true;
        if (window.YouTubeEngine && typeof window.YouTubeEngine.play === 'function') {
          window.YouTubeEngine.play();
        } else {
          updatePlayerUI();
          renderTrackFeed();
        }
      }
    });
  }

  // Persistent Player Previous Button
  const btnPrev = document.getElementById('btn-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      playPrevTrack();
    });
  }

  // Persistent Player Next Button
  const btnNext = document.getElementById('btn-next');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (appState.filteredPlaylist.length === 0) return;
      playNextTrack();
    });
  }

  // Persistent Player Volume / Mute Button
  const btnVolume = document.getElementById('btn-volume');
  const iconVolOn = document.getElementById('icon-volume-on');
  const iconVolMute = document.getElementById('icon-volume-mute');
  if (btnVolume) {
    btnVolume.addEventListener('click', () => {
      if (!window.YouTubeEngine) return;
      if (window.YouTubeEngine.isMuted()) {
        window.YouTubeEngine.unMute();
        btnVolume.classList.remove('is-muted');
        if (iconVolOn) iconVolOn.classList.remove('hidden');
        if (iconVolMute) iconVolMute.classList.add('hidden');
      } else {
        window.YouTubeEngine.mute();
        btnVolume.classList.add('is-muted');
        if (iconVolOn) iconVolOn.classList.add('hidden');
        if (iconVolMute) iconVolMute.classList.remove('hidden');
      }
    });
  }

  // Vibe Roulette (Shuffle Button)
  const btnShuffle = document.getElementById('btn-shuffle');
  if (btnShuffle) {
    btnShuffle.addEventListener('click', () => {
      triggerVibeRoulette();
    });
  }

  // "Start Vibe Check" First-Click Overlay Button
  const startBtn = document.getElementById('start-btn');
  const startOverlay = document.getElementById('start-overlay');
  if (startBtn && startOverlay) {
    startBtn.addEventListener('click', () => {
      startOverlay.classList.add('is-hidden');
      appState.isInitialized = true;
      console.log('[Vibe Check] Audio initialized via first-click overlay.');

      if (window.YouTubeEngine && typeof window.YouTubeEngine.initAndUnlock === 'function') {
        window.YouTubeEngine.initAndUnlock();
      }
    });
  }

  // Initialize Audio Scrubber
  initScrubber();

  // Initialize Favorite Badge
  updateFavBadgeCount();
}

// Expose global methods
window.playNextTrack = playNextTrack;
window.playPrevTrack = playPrevTrack;
window.triggerVibeRoulette = triggerVibeRoulette;
window.handleTrackSelection = handleTrackSelection;
window.updatePlayerUI = updatePlayerUI;
window.renderTrackFeed = renderTrackFeed;
window.resetAllFilters = resetAllFilters;
window.toggleFavorite = toggleFavorite;

// Initialize app when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupUIListeners();
      applyFilters();
    });
  } else {
    setupUIListeners();
    applyFilters();
  }
}
