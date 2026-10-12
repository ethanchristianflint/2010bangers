# Undisputed Bangers 🎵

> A mobile-first Progressive Web App (PWA) vibe-based 2010s music finder & audio engine powered by the YouTube IFrame Player API.

![Platform](https://img.shields.io/badge/Platform-iOS%20PWA%20%2F%20Modern%20Web-ff75a0?style=flat-square)
![Stack](https://img.shields.io/badge/Stack-Vanilla%20HTML5%20%2F%20CSS3%20%2F%20ES6-00f5d4?style=flat-square)
![Audio Engine](https://img.shields.io/badge/Audio-YouTube%20IFrame%20API-feca57?style=flat-square)
![Tracks](https://img.shields.io/badge/Library-164%20Anthems-a55eea?style=flat-square)

---

## ✨ Features

* **164 Undisputed Anthems (2008–2012):** Comprehensive catalog calibrated across acoustic attributes (Tempo/BPM, Energy, Mood/Valence, Danceability).
* **Multi-Slider Vibe Engine:** Live filtering by minimum Energy, Mood, and Danceability with instantaneous reactive UI updates.
* **One-Tap Vibe Presets:**
  * `All Vibes` — Explore the full 164-song catalog.
  * `❤️ My Bangers` — Instantly filter to your bookmarked favorite tracks.
  * `🔥 Club Bangers` — High-octane anthems (David Guetta, LMFAO, Avicii).
  * `☀️ Euphoria` — Feel-good, high-valence pop hits (Carly Rae Jepsen, Katy Perry).
  * `🌙 Late Night R&B` — Smooth tempo, melodic grooves (Drake, Rihanna, Trey Songz).
  * `🌊 Chill & Groove` — Mellow throwback vibes (Jason Mraz, Bruno Mars, Colbie Caillat).
* **Era & BPM Ribbon Filters:** Filter by release year ('08, '09, '10, '11, '12) or tempo bracket (Chill <100, Mid 100–120, Fast 120+ BPM).
* **Interactive Timeline Scrubber:** Real-time audio scrubber with elapsed/duration timestamps and touch-friendly drag-to-seek functionality.
* **Favorites System:** Persistent bookmarks using `localStorage` with header badge counter.
* **Playback Controls:** Previous track (with >3s track restart), Play/Pause, Next track auto-advancement with debounced error recovery, and Mute/Unmute audio toggle.
* **Vibe Roulette (Shuffle):** One-tap randomized selection from matching filter results with spin micro-animation.
* **Dynamic Wikipedia Integration:** "Learn More" links dynamically generated for each anthem (`artist + title`) opening directly in external tabs.
* **Beat-Synced BPM Visualizer:** Dynamic ambient pulse glow synchronized to the active track's BPM.
* **Strict iOS Safari PWA Experience:** Offline application shell caching via Service Worker (`vibecheck-shell-v9`), viewport-fit cover support, translucent status bar, and custom home screen icons.

---

## 📁 Repository Structure

```
UndisputedBangers/
├── index.html              # Core application shell & PWA meta tags
├── style.css               # Glassmorphic UI design tokens & micro-animations
├── app.js                  # State management, filter logic, and UI bindings
├── youtube.js              # YouTube IFrame API audio engine & queue manager
├── data.js                 # 164-track calibrated dataset (window.SONG_DATA)
├── sw.js                   # Service Worker offline shell cache (vibecheck-shell-v9)
├── manifest.json           # Web App Manifest configuration
├── Lil arielagrande.jpg    # Fullscreen responsive background artwork
├── icons/                  # PWA application icons & touch icons
│   ├── favicon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── scripts/                # Data parsing & ingestion utilities
│   ├── parse_playlist.py   # Raw JSON inspection & validation script
│   └── build_data.py       # Attribute extrapolation & data.js compiler
├── vibe_playlist.json      # Original raw source playlist JSON
├── MAD.md                  # System & Architecture Specification
├── ROADMAP.md              # Milestone tracking & feature execution plan
├── .gitignore              # Ignored files (OS, IDE, Python artifacts)
└── .gitattributes          # Line ending normalization
```

---

## 🚀 Getting Started

### Prerequisites
Any standard local HTTP server (Python, Node, or VS Code Live Server). Direct `file://` execution will block Service Worker registration and YouTube API postMessage communication due to browser security restrictions.

### Running Locally

Using Python 3:
```bash
python -m http.server 8080
```

Using Node (`npx serve` or `http-server`):
```bash
npx serve .
```

Open your browser to:
```
http://localhost:8080/
```

---

## 📱 iOS Safari "Add to Home Screen" Setup

1. Open `http://<your-host-ip>:8080/` in **Safari** on iOS.
2. Tap the **Share** button in the bottom navigation bar.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **"Add"** in the top-right corner.
5. Launch **Undisputed Bangers** directly from your iOS Home Screen for full fullscreen, standalone PWA playback.
