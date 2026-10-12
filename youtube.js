/**
 * 2010s Vibe Check - YouTube Audio Engine (youtube.js)
 * Conforms to PRD Section 5: Audio Engine Integration
 * Bypasses iOS mobile autoplay restrictions using strict first-click unlock protocols.
 */

(function () {
  'use strict';

  let player = null;
  let isApiLoaded = false;
  let pendingVideoId = null;

  const YouTubeEngine = {
    player: null,
    apiReady: false,
    isUnlocked: false,

    /**
     * Pre-inject the YouTube IFrame API script tag
     */
    initApi() {
      if (window.YT && window.YT.Player) {
        this.apiReady = true;
        isApiLoaded = true;
        return;
      }

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    },

    /**
     * Strict "First Click" unlock protocol (PRD Section 5.1).
     * Called directly inside the 'Start Vibe Check' click handler.
     */
    initAndUnlock() {
      this.isUnlocked = true;

      const initialSong = (window.appState && window.appState.filteredPlaylist && window.appState.filteredPlaylist[0])
        ? window.appState.filteredPlaylist[0]
        : (window.SONG_DATA && window.SONG_DATA[0]);

      const initialVideoId = initialSong ? initialSong.youtube_id : 'PWgvGjAhvIw';

      if (window.appState) {
        window.appState.currentSongIndex = 0;
        window.appState.isPlaying = true;
      }

      if (!player) {
        this.createPlayer(initialVideoId, true);
      } else {
        try {
          player.loadVideoById(initialVideoId);
          player.playVideo();
        } catch (e) {
          console.warn('[YouTubeEngine] Error playing initial track:', e);
        }
      }

      if (typeof window.updatePlayerUI === 'function') {
        window.updatePlayerUI();
      }
      if (typeof window.renderTrackFeed === 'function') {
        window.renderTrackFeed();
      }
    },

    /**
     * Create the hidden YouTube IFrame player with strict playerVars (PRD Section 5.2)
     */
    createPlayer(videoId, autoPlayImmediately = false) {
      if (!window.YT || !window.YT.Player) {
        pendingVideoId = videoId;
        return;
      }

      const container = document.getElementById('yt-player');
      if (!container) {
        console.error('[YouTubeEngine] Target container #yt-player not found in DOM.');
        return;
      }

      player = new window.YT.Player('yt-player', {
        height: '1',
        width: '1',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          playsinline: 1, // CRITICAL for iOS Safari to prevent fullscreen takeover
          rel: 0
        },
        events: {
          onReady: (event) => {
            console.log('[YouTubeEngine] Player ready.');
            this.player = player;
            if (autoPlayImmediately || this.isUnlocked) {
              try {
                event.target.playVideo();
              } catch (err) {
                console.warn('[YouTubeEngine] Autoplay initial kick error:', err);
              }
            }
          },
          onStateChange: (event) => {
            this.handleStateChange(event);
          },
          onError: (event) => {
            this.handleError(event);
          }
        }
      });

      this.player = player;
    },

    /**
     * Playback Lifecycle Handler (PRD Section 5.3)
     */
    handleStateChange(event) {
      if (!window.appState) return;

      const state = event.data;

      if (state === window.YT.PlayerState.PLAYING) {
        console.log('[YouTubeEngine] State: PLAYING');
        window.appState.isPlaying = true;
        window.appState.playerStatus = 'PLAYING';
      } else if (state === window.YT.PlayerState.PAUSED) {
        console.log('[YouTubeEngine] State: PAUSED');
        window.appState.isPlaying = false;
        window.appState.playerStatus = 'PAUSED';
      } else if (state === window.YT.PlayerState.BUFFERING) {
        console.log('[YouTubeEngine] State: BUFFERING');
        window.appState.playerStatus = 'BUFFERING';
      } else if (state === window.YT.PlayerState.ENDED) {
        console.log('[YouTubeEngine] State: ENDED -> Advancing to next track.');
        window.appState.playerStatus = 'ENDED';
        // Auto-advance to next track in queue (PRD Section 5.3)
        if (typeof window.playNextTrack === 'function') {
          window.playNextTrack();
        }
      }

      if (typeof window.updatePlayerUI === 'function') {
        window.updatePlayerUI();
      }
      if (typeof window.renderTrackFeed === 'function') {
        window.renderTrackFeed();
      }
    },

    /**
     * Error Handler (PRD Section 5.3)
     * Automatically skips to the next track if video is blocked or unavailable
     */
    handleError(event) {
      console.warn('[YouTubeEngine] Player Error encountered (code ' + event.data + '). Auto-skipping track...');
      clearTimeout(this._skipTimer);
      this._skipTimer = setTimeout(() => {
        if (typeof window.playNextTrack === 'function') {
          window.playNextTrack();
        }
      }, 400);
    },

    /**
     * Play current track
     */
    play() {
      if (player && typeof player.playVideo === 'function') {
        try {
          player.playVideo();
        } catch (e) {
          console.warn('[YouTubeEngine] playVideo failed:', e);
        }
      }
      if (window.appState) {
        window.appState.isPlaying = true;
      }
      if (typeof window.updatePlayerUI === 'function') window.updatePlayerUI();
      if (typeof window.renderTrackFeed === 'function') window.renderTrackFeed();
    },

    /**
     * Pause current track
     */
    pause() {
      if (player && typeof player.pauseVideo === 'function') {
        try {
          player.pauseVideo();
        } catch (e) {
          console.warn('[YouTubeEngine] pauseVideo failed:', e);
        }
      }
      if (window.appState) {
        window.appState.isPlaying = false;
      }
      if (typeof window.updatePlayerUI === 'function') window.updatePlayerUI();
      if (typeof window.renderTrackFeed === 'function') window.renderTrackFeed();
    },

    /**
     * Load and play a specific YouTube video ID
     */
    playTrack(youtubeId) {
      if (!youtubeId) return;

      if (!player) {
        this.createPlayer(youtubeId, true);
        return;
      }

      try {
        if (typeof player.loadVideoById === 'function') {
          player.loadVideoById(youtubeId);
          player.playVideo();
        }
      } catch (e) {
        console.warn('[YouTubeEngine] loadVideoById error:', e);
      }

      if (window.appState) {
        window.appState.isPlaying = true;
      }
      if (typeof window.updatePlayerUI === 'function') window.updatePlayerUI();
      if (typeof window.renderTrackFeed === 'function') window.renderTrackFeed();
    },

    /**
     * Seek to a specific timestamp in seconds
     */
    seekTo(seconds) {
      if (player && typeof player.seekTo === 'function') {
        try {
          player.seekTo(seconds, true);
        } catch (e) {
          console.warn('[YouTubeEngine] seekTo error:', e);
        }
      }
    },

    /**
     * Get current playback time in seconds
     */
    getCurrentTime() {
      if (player && typeof player.getCurrentTime === 'function') {
        try {
          return player.getCurrentTime() || 0;
        } catch (e) {
          return 0;
        }
      }
      return 0;
    },

    /**
     * Get total duration in seconds
     */
    getDuration() {
      if (player && typeof player.getDuration === 'function') {
        try {
          return player.getDuration() || 0;
        } catch (e) {
          return 0;
        }
      }
      return 0;
    },

    /**
     * Mute audio
     */
    mute() {
      if (player && typeof player.mute === 'function') {
        try {
          player.mute();
        } catch (e) {
          console.warn('[YouTubeEngine] mute error:', e);
        }
      }
    },

    /**
     * Unmute audio
     */
    unMute() {
      if (player && typeof player.unMute === 'function') {
        try {
          player.unMute();
        } catch (e) {
          console.warn('[YouTubeEngine] unMute error:', e);
        }
      }
    },

    /**
     * Check if player is muted
     */
    isMuted() {
      if (player && typeof player.isMuted === 'function') {
        try {
          return player.isMuted();
        } catch (e) {
          return false;
        }
      }
      return false;
    },

    /**
     * Set volume level (0-100)
     */
    setVolume(volume) {
      if (player && typeof player.setVolume === 'function') {
        try {
          player.setVolume(volume);
        } catch (e) {
          console.warn('[YouTubeEngine] setVolume error:', e);
        }
      }
    }
  };

  // Expose global callback required by YouTube IFrame API
  window.onYouTubeIframeAPIReady = function () {
    console.log('[YouTubeEngine] YouTube IFrame API loaded and ready.');
    YouTubeEngine.apiReady = true;

    if (pendingVideoId) {
      YouTubeEngine.createPlayer(pendingVideoId, YouTubeEngine.isUnlocked);
      pendingVideoId = null;
    }
  };

  // Expose engine to window
  window.YouTubeEngine = YouTubeEngine;

  // Initialize YouTube API script loading
  if (typeof document !== 'undefined') {
    YouTubeEngine.initApi();
  }
})();
