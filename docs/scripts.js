const steps = Array.from(document.querySelectorAll('.step'));
const continueButtons = {
  0: document.getElementById('continueButton'),
  1: document.getElementById('continueButton1'),
  2: document.getElementById('continueButton2'),
  3: document.getElementById('continueButton3'),
  4: document.getElementById('continueButton4'),
};
const showPlaylistButton = document.getElementById('showPlaylist');
const playlistLink = document.getElementById('playlistLink');
const playlistGrid = document.getElementById('playlistGrid');
const playlistEmbed = document.getElementById('playlistEmbed');
const playlistStatus = document.getElementById('playlistStatus');
const playlistHint = document.getElementById('playlistHint');
const statsPanel = document.getElementById('statsPanel');
const overTimeChartEl = document.getElementById('overTimeChart');
const byHourChartEl = document.getElementById('byHourChart');
const byWeekdayChartEl = document.getElementById('byWeekdayChart');
const quizOptions = document.getElementById('quizOptions');
const quizAnswer = document.getElementById('quizAnswer');
const quizButtons = Array.from(document.querySelectorAll('.quiz-options button'));
const nextButton = document.getElementById('nextButton');
const preloaderEl = document.getElementById('preloader');
const heroRevealPrompt = document.getElementById('heroRevealPrompt');
const heroFloaters = document.getElementById('heroFloaters');
const heroBalloons = document.getElementById('heroBalloons');
const dayCounterEl = document.getElementById('dayCounter');
const ageCounterValueEl = document.getElementById('ageCounterValue');
const heroSongEmbed = document.getElementById('heroSongEmbed');

let currentStep = 0;
let typingRunId = 0;
let typingAudioContext = null;
let typingSoundEnabled = false;
let typingNoiseBuffer = null;
let lastTypingSoundAt = 0;
let isChangingStep = false;
let activationRunId = 0;

// Turn the keyboard typing sound up or down — 1 is the current volume,
// 0.5 is half as loud, 2 is twice as loud, 0 mutes it entirely.
const TYPING_SOUND_VOLUME = 1;

// Powers the "time since birth" counter under the headline. Exact moment
// she was born — used to build a live, to-the-second age readout.
const BIRTH_DATE = '2006-10-11';
const BIRTH_TIME = '00:24:00'; // 12:24 AM

// The song that plays the moment she taps to open the page. No Spotify
// login required for this one — it's just the public embed widget, so it
// works instantly for anyone, unlike the Premium-gated playback on the
// soundtrack page later.
const HERO_SONG_TRACK_ID = '4NpDZPwSXmL0cCTaJuVrCw';

// Minimum time the "loading something good…" preloader stays up on a fresh
// visit, so it doesn't flash by instantly if everything loads fast.
const HERO_PRELOADER_MIN_MS = 1800;

const AUTH_RESUME_STEP_KEY = 'sp_auth_resume_step';
const AUTH_RESUME_PLAYLIST_KEY = 'sp_auth_resume_playlist';

// =====================================================================
// SPOTIFY SETUP CHECKLIST — read this before testing
// =====================================================================
// 1. Host this over http(s). Spotify login does not work on file://.
//    (GitHub Pages, Netlify, Vercel, or `npx serve` locally all work.)
// 2. In the Spotify Developer Dashboard (developer.spotify.com/dashboard):
//    a. App Settings → Redirect URIs → add the EXACT URL this page is
//       served from (must match window.location.origin + pathname).
//    b. Settings → Users Management → Add new user → enter her name and
//       the email on her Spotify account. Apps in Development Mode are
//       capped at 5 allowlisted users, and logins from anyone NOT on that
//       list will fail with a 403 even though the login screen succeeds.
//    c. The Spotify account that owns this app (the dashboard account —
//       presumably yours) must have an active Premium subscription, or
//       the app stops working entirely. This is separate from her needing
//       Premium to actually stream.
// 3. She needs Spotify Premium to use the Web Playback SDK (you said she
//    has it — free accounts can't stream this way, full stop).
// 4. Fill in TRACK_LINKS and SONG_NOTES below.
// 5. Note: track info is fetched one song at a time (GET /tracks/{id}),
//    not via the batch endpoint or the playlist endpoint — Spotify removed/
//    restricted both of those for Development Mode apps in Feb 2026.
// =====================================================================

const SPOTIFY_CLIENT_ID = 'cca417449a7c41a9a24a2ee6eeb1cbd5'; // set from user input
const SPOTIFY_REDIRECT_URI = window.location.origin + window.location.pathname;
const SPOTIFY_SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state';

// Paste a Spotify link (or spotify:track:... URI) for each song, in the
// order you want them shown. Easiest way to get one: in Spotify, right-click
// a song → Share → Copy Song Link. We pull the track ID out automatically.
const TRACK_LINKS = [
  'https://open.spotify.com/track/6lrQo6KAYvb92MGk6ZuZlt?si=8d59831668b84543', //Say You Love Me
  'https://open.spotify.com/track/1C042FLYy7rP3MfnkOcnha?si=96b33daef49049d2', //Cherry Wine
  'https://open.spotify.com/track/3mwFncaI2HBczQ92GP9MQF?si=aabf0eb00e8445a7', //Lady Writer
  'https://open.spotify.com/track/4LrGrY6IyJUlkFu6Ms4myU?si=e11e6133f38c481e', //The Sweetest Taboo
  'https://open.spotify.com/track/3EUl8M6SzxZl03NPkB8mUd?si=6fc729d2e39b4e14', //Neon Moon
  'https://open.spotify.com/track/4KoNBTm9a55KgLMtEaf3n6?si=eec63f279ec248d2', //If you Could Only See
  'https://open.spotify.com/track/57MflfPN3ObQQAQtPUp0WF?si=754f96544c4946e3', //Romeo and Juliet
  'https://open.spotify.com/track/2pW5kNCx133MWWirxegvng?si=38b570c503474cb8', //Placeholder
  'https://open.spotify.com/track/4RY96Asd9IefaL3X4LOLZ8?si=c7097c9bf9474b2b', //Placeholder
];

// A personal note for each song, in the SAME ORDER as TRACK_LINKS above.
const SONG_NOTES = [
  'Song 1 — add your memory for this one here.',
  'Song 2 — add your memory for this one here.',
  'Song 3 — add your memory for this one here.',
  'Song 4 — add your memory for this one here.',
  'Song 5 — add your memory for this one here.',
  'Song 6 — add your memory for this one here.',
  'Song 7 — add your memory for this one here.',
  'Song 8 — add your memory for this one here.',
  'Song 9 — add your memory for this one here.',
];

function getTrackIdFromLink(link) {
  if (!link) return null;
  const m = link.match(/track[/:]([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

// --- PKCE auth helpers ---

function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  array.forEach((v) => (result += chars[v % chars.length]));
  return result;
}

async function sha256(buffer) {
  const enc = new TextEncoder();
  const data = enc.encode(buffer);
  return await window.crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makeCodeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64UrlEncode(hashed);
}

function redirectToSpotifyAuth() {
  const verifier = randomString(86);
  localStorage.setItem('sp_code_verifier', verifier);
  makeCodeChallenge(verifier).then((challenge) => {
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: SPOTIFY_REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      scope: SPOTIFY_SCOPES,
    });
    window.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
  });
}

function storeTokenResponse(data) {
  const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  localStorage.setItem('sp_token', data.access_token);
  localStorage.setItem('sp_token_expires', String(expiresAt));
  if (data.refresh_token) localStorage.setItem('sp_refresh_token', data.refresh_token);
  return data.access_token;
}

async function exchangeCodeForToken(code) {
  const verifier = localStorage.getItem('sp_code_verifier');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: verifier || '',
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error('Token exchange failed');
  const data = await res.json();
  return storeTokenResponse(data);
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  const data = await res.json();
  return storeTokenResponse(data);
}

// Returns a valid access token, refreshing or exchanging a code if needed.
// Returns null if the person still needs to go through the Spotify login.
async function getAccessToken() {
  const stored = localStorage.getItem('sp_token');
  const exp = Number(localStorage.getItem('sp_token_expires') || 0);
  if (stored && Date.now() < exp - 60000) return stored;

  const refreshToken = localStorage.getItem('sp_refresh_token');
  if (refreshToken) {
    try {
      return await refreshAccessToken(refreshToken);
    } catch (e) {
      console.warn('Refresh failed', e);
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    try {
      const token = await exchangeCodeForToken(code);
      window.history.replaceState({}, document.title, window.location.pathname);
      return token;
    } catch (e) {
      console.warn(e);
      return null;
    }
  }

  return null;
}

// --- Track metadata, fetched ONE AT A TIME by ID ---
//
// NOT via the playlist endpoint — Spotify's Feb 2026 changes mean playlist
// contents only come back for playlists the logged-in account owns or
// collaborates on, which her account won't for a playlist you made.
//
// ALSO not via the batch "Get Several Tracks" endpoint (GET /tracks?ids=...)
// — Spotify removed that for Development Mode apps in the same Feb 2026
// update (their migration guide: "Replace batch endpoints with individual
// fetch calls"). So we call GET /tracks/{id} once per song instead. If one
// song's fetch fails, the rest still load — that track's card is just
// skipped instead of breaking the whole grid.
async function fetchTracksWithNotes(token, ids, notes) {
  const settled = await Promise.allSettled(
    ids.map((id) =>
      fetch(`https://api.spotify.com/v1/tracks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (!res.ok) throw new Error(`Track ${id} failed (${res.status})`);
        return res.json();
      })
    )
  );

  const pairs = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      pairs.push({ track: result.value, note: notes[i] || 'This song reminds me of you.' });
    } else {
      console.warn(`Couldn't load track ${ids[i]}:`, result.reason);
    }
  });
  return pairs;
}

// --- Web Playback SDK ---

let spotifyPlayer = null;
let spotifyDeviceId = null;
let sdkReady = false;
let pendingPlayerToken = null;
let pendingPlayUri = null;

window.onSpotifyWebPlaybackSDKReady = () => {
  sdkReady = true;
  if (pendingPlayerToken) {
    initializePlayer(pendingPlayerToken);
    pendingPlayerToken = null;
  }
};

function initializePlayer(token) {
  if (spotifyPlayer || typeof Spotify === 'undefined') return;

  spotifyPlayer = new Spotify.Player({
    name: "Zor's Birthday Page",
    getOAuthToken: (callback) => {
      getAccessToken().then((t) => callback(t));
    },
    volume: 0.6,
  });

  spotifyPlayer.addListener('ready', ({ device_id }) => {
    spotifyDeviceId = device_id;
    hideElement(playlistStatus);
    if (pendingPlayUri) {
      const uri = pendingPlayUri;
      pendingPlayUri = null;
      playTrackOnDevice(uri);
    }
  });

  spotifyPlayer.addListener('not_ready', () => {
    spotifyDeviceId = null;
  });

  spotifyPlayer.addListener('account_error', () => {
    showFallbackEmbed("This Spotify account can't stream here — here's the playlist instead.");
  });

  spotifyPlayer.addListener('initialization_error', () => {
    showFallbackEmbed("This browser can't play music here — here's the playlist instead.");
  });

  spotifyPlayer.addListener('authentication_error', () => {
    localStorage.removeItem('sp_token');
    localStorage.removeItem('sp_token_expires');
    localStorage.removeItem('sp_refresh_token');
  });

  spotifyPlayer.connect();
}

async function playTrackOnDevice(uri) {
  if (!spotifyDeviceId) {
    pendingPlayUri = uri;
    return;
  }
  const token = await getAccessToken();
  if (!token) return;
  try {
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [uri] }),
    });
  } catch (e) {
    console.warn('Playback failed', e);
  }
}

async function pausePlayback() {
  if (!spotifyPlayer) return;
  try {
    await spotifyPlayer.pause();
  } catch (e) {
    // ignore — likely nothing was playing
  }
}

// --- Flip-card grid ---

let currentlyFlippedCard = null;
const songFocusBackdrop = document.createElement('div');
songFocusBackdrop.className = 'song-focus-backdrop';
songFocusBackdrop.setAttribute('aria-hidden', 'true');
document.body.appendChild(songFocusBackdrop);

songFocusBackdrop.addEventListener('click', closeFlippedCard);

function closeFlippedCard() {
  if (currentlyFlippedCard) {
    const placeholder = currentlyFlippedCard._placeholderEl;
    const originalParent = currentlyFlippedCard._originalParent;
    const originalNextSibling = currentlyFlippedCard._originalNextSibling;

    currentlyFlippedCard.classList.remove('flipped', 'expanded');

    if (originalParent) {
      if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
        originalParent.insertBefore(currentlyFlippedCard, originalNextSibling);
      } else {
        originalParent.appendChild(currentlyFlippedCard);
      }
    }

    if (placeholder) placeholder.remove();
    currentlyFlippedCard._placeholderEl = null;
    currentlyFlippedCard._originalParent = null;
    currentlyFlippedCard._originalNextSibling = null;
    currentlyFlippedCard = null;
    pausePlayback();
  }
  document.body.classList.remove('song-modal-open');
  songFocusBackdrop.classList.remove('visible');
  if (playlistGrid) playlistGrid.classList.remove('has-expanded');
  pendingPlayUri = null;
}

function handleCardClick(card, uri) {
  const wasOpen = card.classList.contains('flipped');
  closeFlippedCard();
  if (wasOpen) return; // clicking an open card just closes it

  card.classList.add('flipped', 'expanded');
  currentlyFlippedCard = card;
  card._originalParent = card.parentNode;
  card._originalNextSibling = card.nextSibling;
  card._placeholderEl = document.createElement('div');
  card._placeholderEl.className = 'song-card-placeholder';
  card._originalParent.insertBefore(card._placeholderEl, card);
  document.body.appendChild(card);
  document.body.classList.add('song-modal-open');
  songFocusBackdrop.classList.add('visible');
  if (playlistGrid) playlistGrid.classList.add('has-expanded');

  if (card._indicatorEl) {
    card._indicatorEl.textContent = spotifyDeviceId ? '♪ Now playing' : 'Connecting…';
  }

  if (uri) playTrackOnDevice(uri);
}

function populatePlaylist(pairs) {
  if (!playlistGrid) return;
  closeFlippedCard();
  playlistGrid.innerHTML = '';
  const count = Math.min(9, pairs.length);

  for (let i = 0; i < count; i++) {
    const t = pairs[i].track;
    const note = pairs[i].note;
    const artistNames = t.artists ? t.artists.map((a) => a.name).join(', ') : '';
    const coverUrl = t.album && t.album.images && t.album.images[0] ? t.album.images[0].url : '';
    const spotifyUrl = (t.external_urls && t.external_urls.spotify) || '';

    const card = document.createElement('div');
    card.className = 'flip-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${t.name}${artistNames ? ' by ' + artistNames : ''}. Tap to flip.`);

    const inner = document.createElement('div');
    inner.className = 'flip-card-inner';

    const closeButton = document.createElement('button');
    closeButton.className = 'song-close-button';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close song note');
    closeButton.textContent = 'x';
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      closeFlippedCard();
    });

    // Front face: album art + title/artist
    const front = document.createElement('div');
    front.className = 'flip-card-front';
    if (coverUrl) front.style.backgroundImage = `url(${coverUrl})`;
    const frontMeta = document.createElement('div');
    frontMeta.className = 'flip-card-front-meta';
    const h3 = document.createElement('h3');
    h3.textContent = t.name;
    const pArtist = document.createElement('p');
    pArtist.textContent = artistNames;
    frontMeta.appendChild(h3);
    frontMeta.appendChild(pArtist);
    front.appendChild(frontMeta);

    // Back face: the personal note + playback status + Spotify link fallback
    const back = document.createElement('div');
    back.className = 'flip-card-back';
    const pNote = document.createElement('p');
    pNote.className = 'flip-note';
    pNote.textContent = note;
    back.appendChild(pNote);

    const indicator = document.createElement('span');
    indicator.className = 'flip-audio-indicator';
    indicator.textContent = 'Tap to play';
    back.appendChild(indicator);
    card._indicatorEl = indicator;

    if (spotifyUrl) {
      const link = document.createElement('a');
      link.className = 'flip-spotify-link';
      link.href = spotifyUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = 'Open in Spotify';
      link.addEventListener('click', (e) => e.stopPropagation());
      back.appendChild(link);
    }

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);
    card.appendChild(closeButton);

    const uri = t.uri || '';
    const onActivate = () => handleCardClick(card, uri);
    card.addEventListener('click', onActivate);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    });

    playlistGrid.appendChild(card);
  }
}

function showFallbackEmbed(message) {
  hideElement(playlistGrid);
  hideElement(playlistStatus);
  if (message) {
    if (playlistStatus) {
      playlistStatus.textContent = message;
      showElement(playlistStatus);
    }
  }
  showElement(playlistEmbed);
  showElement(playlistLink);
  showElement(continueButtons[2]);
}

// --- Page flow (unrelated to Spotify) ---

function setStep(stepIndex) {
  steps.forEach((step, index) => {
    step.classList.toggle('active', index === stepIndex);
    if (index === stepIndex) {
      const bg = step.getAttribute('data-bg');
      if (bg) document.body.style.background = bg;
    }
  });
  document.body.classList.toggle('music-page', steps[stepIndex]?.classList.contains('music-step'));
  document.body.classList.toggle('letter-page', steps[stepIndex]?.classList.contains('letter-step'));
  document.body.classList.toggle('hero-page', steps[stepIndex]?.classList.contains('hero-step'));
  if (nextButton) nextButton.classList.toggle('hidden', stepIndex >= steps.length - 1);
}

function showElement(element) {
  if (element) element.classList.remove('hidden');
}

function hideElement(element) {
  if (element) element.classList.add('hidden');
}

function resetInteractiveState() {
  hideElement(playlistLink);
  hideElement(playlistGrid);
  hideElement(playlistEmbed);
  hideElement(playlistStatus);
  hideElement(playlistHint);
  hideElement(statsPanel);
  hideElement(quizAnswer);
  hideElement(showPlaylistButton);
  Object.values(continueButtons).forEach(hideElement);
  quizButtons.forEach((button) => {
    button.classList.remove('correct', 'incorrect');
  });
  closeFlippedCard();
  stopHeroSongEmbed();
  stopDayCounter();
}

// ── Chart helpers ─────────────────────────────────────────────────────
function renderBarChart(svgEl, points, color) {
  if (!svgEl) return;
  svgEl.innerHTML = '';
  const vb = svgEl.viewBox.baseVal;
  const W = vb.width || 320, H = vb.height || 130;
  const padB = 22, padT = 8;
  const chartH = H - padB - padT;
  const maxVal = Math.max(1, ...points.map((p) => p.value));
  const gap = points.length > 12 ? 3 : 8;
  const barW = (W - gap * (points.length - 1)) / points.length;
  const svgNS = 'http://www.w3.org/2000/svg';

  points.forEach((pt, i) => {
    const bh = (pt.value / maxVal) * chartH;
    const x = i * (barW + gap);
    const y = padT + (chartH - bh);
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', x.toFixed(1));
    rect.setAttribute('y', y.toFixed(1));
    rect.setAttribute('width', barW.toFixed(1));
    rect.setAttribute('height', Math.max(bh, 2).toFixed(1));
    rect.setAttribute('rx', Math.min(4, barW / 3).toFixed(1));
    rect.setAttribute('fill', pt.highlight ? '#ff9f0a' : (color || '#0a84ff'));
    rect.setAttribute('opacity', pt.highlight ? '1' : '0.75');
    svgEl.appendChild(rect);

    if (pt.label) {
      const lbl = document.createElementNS(svgNS, 'text');
      lbl.setAttribute('x', (x + barW / 2).toFixed(1));
      lbl.setAttribute('y', (H - 6).toFixed(1));
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('class', 'ios-bar-label');
      lbl.textContent = pt.label;
      svgEl.appendChild(lbl);
    }
  });
}

function renderLineChart(svgEl, points) {
  if (!svgEl || points.length === 0) return;
  svgEl.innerHTML = '';
  const vb = svgEl.viewBox.baseVal;
  const W = vb.width || 320, H = vb.height || 130;
  const padB = 24, padT = 12, padX = 8;
  const chartH = H - padB - padT;
  const maxVal = Math.max(1, ...points.map((p) => p.value));
  const stepX = points.length > 1 ? (W - padX * 2) / (points.length - 1) : 0;
  const svgNS = 'http://www.w3.org/2000/svg';

  const coords = points.map((pt, i) => ({
    x: padX + i * stepX,
    y: padT + (chartH - (pt.value / maxVal) * chartH),
    label: pt.label,
    value: pt.value,
  }));

  const defs = document.createElementNS(svgNS, 'defs');
  const gid = `g${Math.random().toString(36).slice(2, 7)}`;
  defs.innerHTML = `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#0a84ff" stop-opacity="0.4"/>
    <stop offset="100%" stop-color="#0a84ff" stop-opacity="0"/>
  </linearGradient>`;
  svgEl.appendChild(defs);

  const linePts = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPts = `${linePts} L${coords.at(-1).x.toFixed(1)},${(H - padB).toFixed(1)} L${coords[0].x.toFixed(1)},${(H - padB).toFixed(1)} Z`;

  const area = document.createElementNS(svgNS, 'path');
  area.setAttribute('d', areaPts);
  area.setAttribute('fill', `url(#${gid})`);
  svgEl.appendChild(area);

  const line = document.createElementNS(svgNS, 'path');
  line.setAttribute('d', linePts);
  line.setAttribute('class', 'ios-line-path');
  svgEl.appendChild(line);

  coords.forEach((c) => {
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('cx', c.x.toFixed(1));
    dot.setAttribute('cy', c.y.toFixed(1));
    dot.setAttribute('r', '3');
    dot.setAttribute('class', 'ios-line-dot');
    svgEl.appendChild(dot);

    if (c.label) {
      const lbl = document.createElementNS(svgNS, 'text');
      lbl.setAttribute('x', c.x.toFixed(1));
      lbl.setAttribute('y', (H - 7).toFixed(1));
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('class', 'ios-bar-label');
      lbl.textContent = c.label;
      svgEl.appendChild(lbl);
    }
  });
}

// ── Label helpers ─────────────────────────────────────────────────────

const ME_KEY = 'Me';
const HER_KEY = 'Her';

function n(val) {
  // Format a number with locale commas, or return the value as-is (strings like "5m")
  if (typeof val === 'number') return val.toLocaleString('en-US');
  return val ?? '—';
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function senderLabel(sender) {
  return sender === ME_KEY ? 'Me' : 'You';
}

function senderClass(sender) {
  return sender === ME_KEY ? 'ios-me' : 'ios-her';
}

// ── Award definitions ──────────────────────────────────────────────────

const AWARD_META = {
  speed_texter:  { emoji: '⚡', title: 'Speed Texter' },
  night_owl:     { emoji: '🌙', title: 'Night Owl' },
  wall_of_text:  { emoji: '📜', title: 'Wall of Text' },
  double_texter: { emoji: '💬', title: 'Double Texter' },
  emoji_master:  { emoji: '😂', title: 'Emoji Master' },
  yeller:        { emoji: '📢', title: 'Yeller' },
  dot_dot_dot:   { emoji: '…', title: 'Dot Dot Dot' },
};

// ── Main render ───────────────────────────────────────────────────────

async function loadAndRenderStats() {
  // Set every id-ed element to a loading placeholder first
  const ids = ['s-total','s-total-sub','s-streak','s-best-day-count','s-best-day-date',
               's-reply-me','s-reply-her','s-hour-note'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '…'; });

  let data;
  try {
    const resp = await fetch('stats.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    data = await resp.json();
  } catch (err) {
    console.error('Could not load stats.json:', err);
    if (statsPanel) {
      statsPanel.insertAdjacentHTML('afterbegin',
        `<div style="color:#ff375f;padding:12px;font-size:.85rem;">
          ⚠️ Could not load stats.json — make sure it's in the same folder as index.html.
        </div>`);
    }
    return;
  }

  const me  = data.per_person?.[ME_KEY]  ?? {};
  const her = data.per_person?.[HER_KEY] ?? {};
  const rt  = data.response_times       ?? {};

  // ── Hero total ────────────────────────────────────────────────────
  set('s-total', n(data.total_messages));
  const firstDate = data.milestones?.['1']?.timestamp
    ? fmtDate(data.milestones['1'].timestamp) : '';
  set('s-total-sub', firstDate ? `messages since ${firstDate}` : 'messages');

  // ── Who sent more ─────────────────────────────────────────────────
  const meSent  = me.messages_sent  ?? 0;
  const herSent = her.messages_sent ?? 0;
  const total   = meSent + herSent || 1;
  const mePct   = (meSent / total) * 100;
  const fillEl  = document.getElementById('s-sent-fill');
  if (fillEl) fillEl.style.width = `${mePct.toFixed(1)}%`;
  set('s-sent-me',  `<strong>${n(meSent)}</strong> Me`);
  set('s-sent-her', `<strong>${n(herSent)}</strong> You`);

  // ── Quick stat cards ──────────────────────────────────────────────
  set('s-streak', `${n(data.longest_daily_texting_streak_days)} days`);

  const bestDay = data.most_messages_in_one_day ?? {};
  set('s-best-day-count', n(bestDay.count));
  set('s-best-day-date', bestDay.date ? fmtDate(bestDay.date + 'T00:00:00') : '—');

  set('s-reply-me',  rt[ME_KEY]?.average_response_time_human  ?? '—');
  set('s-reply-her', rt[HER_KEY]?.average_response_time_human ?? '—');

  // ── Charts ────────────────────────────────────────────────────────
  // Over time
  const otRaw = data.messages_over_time_by_year_month ?? {};
  const otPoints = Object.entries(otRaw).map(([ym, v]) => {
    const [, mo] = ym.split('-');
    const shortMo = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mo];
    return { label: shortMo, value: v };
  });
  renderLineChart(overTimeChartEl, otPoints);

  // By hour
  const hourRaw = data.messages_by_hour ?? {};
  const maxHour = Math.max(...Object.values(hourRaw));
  const hourPoints = Object.entries(hourRaw).map(([h, v]) => {
    const hNum = +h;
    const label = hNum % 6 === 0
      ? (hNum === 0 ? '12a' : hNum === 6 ? '6a' : hNum === 12 ? '12p' : '6p')
      : '';
    return { label, value: v, highlight: v === maxHour };
  });
  renderBarChart(byHourChartEl, hourPoints, '#0a84ff');
  // Peak hour note
  const peakHour = +Object.entries(hourRaw).sort((a, b) => b[1] - a[1])[0]?.[0];
  const peakLabel = peakHour !== undefined
    ? (peakHour === 0 ? 'midnight' : peakHour < 12 ? `${peakHour}am` : peakHour === 12 ? 'noon' : `${peakHour - 12}pm`)
    : '';
  set('s-hour-note', peakLabel ? `peak: ${peakLabel} 🌙` : '');

  // By weekday
  const wdRaw = data.messages_by_weekday ?? {};
  const maxWd = Math.max(...Object.values(wdRaw));
  const wdPoints = Object.entries(wdRaw).map(([day, v]) => ({
    label: day.slice(0, 3),
    value: v,
    highlight: v === maxWd,
  }));
  renderBarChart(byWeekdayChartEl, wdPoints, '#34c759');

  // ── Who texts first ───────────────────────────────────────────────
  const convos = data.conversations_started ?? {};
  const meConvos  = convos[ME_KEY]  ?? 0;
  const herConvos = convos[HER_KEY] ?? 0;
  const convTotal = meConvos + herConvos || 1;
  const meCPct    = (meConvos / convTotal) * 100;
  const firstFill = document.getElementById('s-first-fill');
  if (firstFill) firstFill.style.width = `${meCPct.toFixed(1)}%`;
  set('s-first-me',  `<strong>${meCPct.toFixed(1)}%</strong> Me (${n(meConvos)})`);
  set('s-first-her', `<strong>${(100 - meCPct).toFixed(1)}%</strong> You (${n(herConvos)})`);

  // ── Awards ────────────────────────────────────────────────────────
  const awardsEl = document.getElementById('s-awards');
  if (awardsEl) {
    awardsEl.innerHTML = '';
    Object.entries(data.awards ?? {}).forEach(([key, award]) => {
      if (!award) return;
      const meta = AWARD_META[key] ?? { emoji: '🏆', title: key };
      const winner = senderLabel(award.winner);
      const card = document.createElement('div');
      card.className = 'ios-award-card';
      card.innerHTML = `
        <span class="ios-award-emoji">${meta.emoji}</span>
        <span class="ios-award-title">${meta.title}</span>
        <span class="ios-award-winner">${winner}</span>
        <span class="ios-award-detail">${award.detail}</span>
      `;
      awardsEl.appendChild(card);
    });
  }

  // ── Milestones ────────────────────────────────────────────────────
  const msEl = document.getElementById('s-milestones');
  if (msEl) {
    msEl.innerHTML = '';
    Object.entries(data.milestones ?? {}).forEach(([num, ms]) => {
      if (!ms) return;
      const cls = senderClass(ms.sender);
      const label = senderLabel(ms.sender);
      const row = document.createElement('div');
      row.className = 'ios-milestone';
      row.innerHTML = `
        <span class="ios-milestone-num">#${Number(num).toLocaleString()}</span>
        <div class="ios-milestone-body">
          <span class="ios-milestone-sender ${cls}">${label}</span>
          <span class="ios-milestone-text">"${ms.text.replace(/"/g, '&quot;').slice(0, 80)}"</span>
          <span class="ios-milestone-date">${fmtDate(ms.timestamp)}</span>
        </div>
      `;
      msEl.appendChild(row);
    });
  }

  // ── Firsts ────────────────────────────────────────────────────────
  const firstsEl = document.getElementById('s-firsts');
  if (firstsEl) {
    firstsEl.innerHTML = '';
    const firstsMap = {
      'i love you': 'First "I love you"',
      'sorry':      'First "sorry"',
      'Megoodnights': 'First goodnight (me)',
      'Hergoodnights': 'First goodnight (you)',
    };
    Object.entries(data.first_to_say ?? {}).forEach(([key, val]) => {
      if (!val || !firstsMap[key]) return;
      const cls = val.sender === ME_KEY ? 'ios-me-text' : 'ios-her-text';
      const who = senderLabel(val.sender);
      const row = document.createElement('div');
      row.className = 'ios-first-row';
      row.innerHTML = `
        <span class="ios-first-label">${firstsMap[key]}</span>
        <span class="ios-first-val ${cls}">${who} — ${fmtDate(val.timestamp)}</span>
      `;
      firstsEl.appendChild(row);
    });
  }

  // ── Top words ─────────────────────────────────────────────────────
  function renderWordCol(elId, words, headerClass, headerLabel) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<div class="ios-words-header ${headerClass}">${headerLabel}</div>`;
    (words ?? []).slice(0, 10).forEach(([word, count], i) => {
      const row = document.createElement('div');
      row.className = 'ios-word-row';
      row.innerHTML = `<span class="ios-word-rank">${i + 1}</span><span class="ios-word">${word}</span><span class="ios-word-count">${n(count)}</span>`;
      el.appendChild(row);
    });
  }
  renderWordCol('s-words-me',  me.top_50_words,  'ios-me-text',  'Me');
  renderWordCol('s-words-her', her.top_50_words, 'ios-her-text', 'You');

  // ── Top emojis ────────────────────────────────────────────────────
  function renderEmojiCol(elId, emojis, headerClass, headerLabel) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<div class="ios-words-header ${headerClass}">${headerLabel}</div>`;
    (emojis ?? []).slice(0, 7).forEach(([glyph, count]) => {
      const row = document.createElement('div');
      row.className = 'ios-emoji-row';
      row.innerHTML = `<span class="ios-emoji-glyph">${glyph}</span><span class="ios-emoji-count">${n(count)}</span>`;
      el.appendChild(row);
    });
  }
  renderEmojiCol('s-emoji-me',  me.top_emojis,  'ios-me-text',  'Me');
  renderEmojiCol('s-emoji-her', her.top_emojis, 'ios-her-text', 'You');

  // ── Fun facts ─────────────────────────────────────────────────────
  const factsEl = document.getElementById('s-facts');
  if (factsEl) {
    const ilyMe  = me.phrase_counts?.['i love you']  ?? 0;
    const ilyHer = her.phrase_counts?.['i love you'] ?? 0;
    const sryMe  = me.phrase_counts?.['sorry']       ?? 0;
    const sryHer = her.phrase_counts?.['sorry']      ?? 0;
    const msOne  = data.milestones?.['1'];

    const facts = [
      `📚 You have a vocabulary of <strong>${n(her.vocabulary_size)} unique words</strong>. I use ${n(me.vocabulary_size)}.`,
      `📏 Your average message is <strong>${her.average_message_length_chars} chars</strong>. Mine is ${me.average_message_length_chars}.`,
      `❤️ You've said "I love you" <strong>${n(ilyHer)} times</strong>. I've said it ${n(ilyMe)} times.`,
      `😈 You said sorry <strong>${n(sryHer)} times</strong>. I said sorry ${n(sryMe)} times.`,
      msOne ? `💛 Message #1 was ${senderLabel(msOne.sender) === 'You' ? 'you' : 'me'} asking <strong>"${msOne.text.slice(0, 60)}"</strong>` : null,
      `💬 We've sent an average of <strong>${Math.round(data.total_messages / Math.max(1, Object.keys(data.messages_over_time_by_year_month ?? {}).length))} messages per month</strong>.`,
    ].filter(Boolean);

    factsEl.innerHTML = facts.map(f => `<div class="ios-fact">${f}</div>`).join('');
  }
}

// Quick helper: set innerHTML on an element by id
function set(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function goToStep(index) {
  const validIndex = Math.max(0, Math.min(index, steps.length - 1));
  currentStep = validIndex;
  setStep(currentStep);
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function getBirthTimestamp() {
  const birth = new Date(`${BIRTH_DATE}T${BIRTH_TIME}`);
  if (Number.isNaN(birth.getTime())) return null;
  return birth.getTime();
}

// Breaks down milliseconds-since-birth into years (calendar-accurate, so
// it lines up with her actual birthdays) plus days/hours/min/sec remainder.
function getAgeBreakdown(birthMs, nowMs) {
  const birth = new Date(birthMs);
  const now = new Date(nowMs);

  let years = now.getFullYear() - birth.getFullYear();
  const anniversaryThisYear = new Date(birth);
  anniversaryThisYear.setFullYear(birth.getFullYear() + years);
  if (anniversaryThisYear.getTime() > nowMs) {
    years -= 1;
    anniversaryThisYear.setFullYear(birth.getFullYear() + years);
  }

  const remainderMs = nowMs - anniversaryThisYear.getTime();
  const days = Math.floor(remainderMs / 86400000);
  const hours = Math.floor((remainderMs % 86400000) / 3600000);
  const minutes = Math.floor((remainderMs % 3600000) / 60000);
  const seconds = Math.floor((remainderMs % 60000) / 1000);

  return { years, days, hours, minutes, seconds };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

let ageCounterIntervalId = null;

function startDayCounter() {
  if (!dayCounterEl || !ageCounterValueEl) return;
  const birthMs = getBirthTimestamp();
  if (birthMs === null) return;

  showElement(dayCounterEl);

  function render() {
    const { years, days, hours, minutes, seconds } = getAgeBreakdown(birthMs, Date.now());
    ageCounterValueEl.textContent =
      `${years}Y ${days}D ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }

  render();
  if (ageCounterIntervalId) window.clearInterval(ageCounterIntervalId);
  ageCounterIntervalId = window.setInterval(render, 1000);
}

function stopDayCounter() {
  if (ageCounterIntervalId) {
    window.clearInterval(ageCounterIntervalId);
    ageCounterIntervalId = null;
  }
}

// --- Hero background ambiance: falling confetti + drifting balloons ---

const HERO_CONFETTI_COLORS = ['#ff3d7f', '#ffb703', '#06d6a0', '#4cc9f0', '#9b5de5', '#ff8fab', '#ffffff'];
const HERO_BALLOON_COLORS = ['#ff3d7f', '#ffb703', '#06d6a0', '#4cc9f0', '#9b5de5'];
let heroAmbianceBuilt = false;

function buildHeroAmbiance() {
  if (heroAmbianceBuilt) return;
  heroAmbianceBuilt = true;

  if (heroFloaters) {
    const pieceCount = 80;
    for (let i = 0; i < pieceCount; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      const left = Math.random() * 100;
      const duration = 6 + Math.random() * 7;
      const delay = Math.random() * 10;
      const drift = (Math.random() - 0.5) * 160;
      const size = 7 + Math.random() * 7;
      const color = HERO_CONFETTI_COLORS[Math.floor(Math.random() * HERO_CONFETTI_COLORS.length)];
      const isCircle = Math.random() < 0.4;

      piece.style.left = `${left}%`;
      piece.style.width = `${size}px`;
      piece.style.height = `${size * (isCircle ? 1 : 0.4)}px`;
      piece.style.background = color;
      piece.style.borderRadius = isCircle ? '50%' : '2px';
      piece.style.animationDuration = `${duration}s`;
      piece.style.animationDelay = `${delay}s`;
      piece.style.setProperty('--confetti-drift', `${drift}px`);
      heroFloaters.appendChild(piece);
    }
  }

  if (heroBalloons) {
    const balloonCount = 13;
    for (let i = 0; i < balloonCount; i++) {
      const balloon = document.createElement('span');
      balloon.className = 'hero-balloon';
      const left = 4 + Math.random() * 92;
      const duration = 13 + Math.random() * 9;
      const delay = Math.random() * 12;
      const drift = (Math.random() - 0.5) * 120;
      const scale = 0.75 + Math.random() * 0.6;
      const color = HERO_BALLOON_COLORS[Math.floor(Math.random() * HERO_BALLOON_COLORS.length)];

      balloon.style.left = `${left}%`;
      balloon.style.animationDuration = `${duration}s`;
      balloon.style.animationDelay = `${delay}s`;
      balloon.style.setProperty('--balloon-drift', `${drift}px`);
      balloon.style.setProperty('--balloon-scale', scale);
      balloon.style.setProperty('--balloon-color', color);
      balloon.innerHTML = '<span class="hero-balloon-string"></span>';
      heroBalloons.appendChild(balloon);
    }
  }
}

// --- Hero song player, via Spotify's iFrame API ---
//
// The player widget is created as soon as the API is ready (paused, not
// autoplaying) so it already exists by the time she taps "CLICK ME PLS".
// The tap just calls .play() on the already-loaded controller — no src
// swap, no race with autoplay-blocking, since the gesture itself is what
// triggers play().

// How far into the song playback should begin once she taps, in seconds.
const HERO_SONG_START_SECONDS = 15;

let heroSongController = null;
let heroSongControllerReady = null; // resolves once the controller exists

function setupHeroSongController() {
  if (heroSongControllerReady) return heroSongControllerReady;

  heroSongControllerReady = new Promise((resolve) => {
    if (!heroSongEmbed) {
      resolve(null);
      return;
    }

    const onApiReady = (IFrameAPI) => {
      const options = {
        uri: `spotify:track:${HERO_SONG_TRACK_ID}`,
        width: '100%',
        height: '80',
        startAt: HERO_SONG_START_SECONDS,
      };
      IFrameAPI.createController(heroSongEmbed, options, (controller) => {
        heroSongController = controller;
        resolve(controller);
      });
    };

    if (window.Spotify && window.Spotify.Iframe) {
      // API script already loaded (e.g. fast connection / cached).
      onApiReady(window.Spotify.Iframe);
    } else {
      // Spotify calls this global once its iframe-api script finishes
      // loading. Don't clobber it if something else already set it.
      const previous = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        if (typeof previous === 'function') previous(IFrameAPI);
        onApiReady(IFrameAPI);
      };
    }
  });

  return heroSongControllerReady;
}

function showHeroSongEmbed() {
  if (heroSongEmbed) showElement(heroSongEmbed);
}

function playHeroSong() {
  showHeroSongEmbed();
  setupHeroSongController().then((controller) => {
    if (!controller) return;
    controller.seek(HERO_SONG_START_SECONDS);
    controller.play();
  });
}

function stopHeroSongEmbed() {
  if (heroSongController) {
    try {
      heroSongController.pause();
    } catch (e) {
      // ignore — controller may not be ready yet
    }
  }
  if (heroSongEmbed) hideElement(heroSongEmbed);
}

function hidePreloader() {
  if (preloaderEl) preloaderEl.classList.add('preloader-hidden');
}

// Resolves once she taps the "tap to open" prompt. The hero content behind
// it is already visible but blurred (via the hero-pending-reveal body
// class), so this is just waiting for the gesture before un-blurring it —
// that same gesture is also what lets the song embed autoplay with sound.
const confettiBurstLayer = document.getElementById('confettiBurstLayer');
const BURST_CONFETTI_COLORS = ['#ff3d7f', '#ffb703', '#06d6a0', '#4cc9f0', '#9b5de5', '#ff8fab', '#ffffff'];

// Fires a big burst of confetti from a screen point (the steak's center)
// that flies outward to cover the whole viewport. Returns a promise that
// resolves once the burst has had time to read as "the reveal moment."
function fireConfettiBurst(originX, originY) {
  return new Promise((resolve) => {
    if (!confettiBurstLayer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      resolve();
      return;
    }

    const pieceCount = 140;
    const maxDistance = Math.hypot(window.innerWidth, window.innerHeight) * 0.75;

    for (let i = 0; i < pieceCount; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-burst-piece';
      const angle = Math.random() * Math.PI * 2;
      const distance = maxDistance * (0.35 + Math.random() * 0.65);
      const burstX = Math.cos(angle) * distance;
      const burstY = Math.sin(angle) * distance;
      const size = 8 + Math.random() * 9;
      const isCircle = Math.random() < 0.4;
      const color = BURST_CONFETTI_COLORS[Math.floor(Math.random() * BURST_CONFETTI_COLORS.length)];
      const duration = 0.9 + Math.random() * 0.6;
      const delay = Math.random() * 0.18;

      piece.style.left = `${originX}px`;
      piece.style.top = `${originY}px`;
      piece.style.width = `${size}px`;
      piece.style.height = `${size * (isCircle ? 1 : 0.42)}px`;
      piece.style.background = color;
      piece.style.borderRadius = isCircle ? '50%' : '2px';
      piece.style.animationDuration = `${duration}s`;
      piece.style.animationDelay = `${delay}s`;
      piece.style.setProperty('--burst-x', `${burstX}px`);
      piece.style.setProperty('--burst-y', `${burstY}px`);
      piece.style.setProperty('--burst-r', `${(Math.random() - 0.5) * 900}deg`);

      confettiBurstLayer.appendChild(piece);
      piece.addEventListener('animationend', () => piece.remove());
    }

    window.setTimeout(resolve, 650);
  });
}

function waitForHeroTap() {
  return new Promise((resolve) => {
    document.body.classList.add('hero-pending-reveal');
    if (!heroRevealPrompt) {
      document.body.classList.remove('hero-pending-reveal');
      resolve();
      return;
    }

    const onTap = async () => {
      heroRevealPrompt.removeEventListener('click', onTap);
      playHeroSong();

      const steakButton = heroRevealPrompt.querySelector('.steak-button');
      const originRect = steakButton ? steakButton.getBoundingClientRect() : null;
      const originX = originRect ? originRect.left + originRect.width / 2 : window.innerWidth / 2;
      const originY = originRect ? originRect.top + originRect.height / 2 : window.innerHeight / 2;

      await fireConfettiBurst(originX, originY);

      heroRevealPrompt.classList.add('reveal-dismissed');
      document.body.classList.remove('hero-pending-reveal');
      window.setTimeout(() => heroRevealPrompt.classList.remove('reveal-dismissed'), 600);
      resolve();
    };

    heroRevealPrompt.addEventListener('click', onTap);
  });
}

// Cursor confetti trail — spawns little paper bits at the cursor that fall
// and drift down the screen, the same way the background confetti does,
// only while she's on the hero step. Capped and throttled since each piece
// now lives several seconds instead of fading out almost instantly.
const CONFETTI_COLORS = ['#ff3d7f', '#ffb703', '#06d6a0', '#4cc9f0', '#9b5de5', '#ff8fab'];
const CURSOR_CONFETTI_MAX_ON_SCREEN = 300;
let lastConfettiAt = 0;
let cursorConfettiOnScreen = 0;

document.addEventListener('pointermove', (event) => {
  if (!document.body.classList.contains('hero-page')) return;
  const now = performance.now();
  if (now - lastConfettiAt < 30) return;
  lastConfettiAt = now;
  if (cursorConfettiOnScreen >= CURSOR_CONFETTI_MAX_ON_SCREEN) return;

  const pieceCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement('span');
    piece.className = 'cursor-confetti';
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const size = 6 + Math.random() * 6;
    const isCircle = Math.random() < 0.4;
    const fallDistance = window.innerHeight - event.clientY + 40;
    const duration = 4 + Math.random() * 3;
    const drift = (Math.random() - 0.5) * 140;

    piece.style.left = `${event.clientX + (Math.random() - 0.5) * 18}px`;
    piece.style.top = `${event.clientY}px`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * (isCircle ? 1 : 0.4)}px`;
    piece.style.background = color;
    piece.style.borderRadius = isCircle ? '50%' : '2px';
    piece.style.animationDuration = `${duration}s`;
    piece.style.setProperty('--cursor-confetti-fall', `${fallDistance}px`);
    piece.style.setProperty('--cursor-confetti-drift', `${drift}px`);

    document.body.appendChild(piece);
    cursorConfettiOnScreen += 1;
    piece.addEventListener('animationend', () => {
      piece.remove();
      cursorConfettiOnScreen -= 1;
    });
  }
});

function createTypingNoiseBuffer(context) {
  const length = Math.max(1, Math.floor(context.sampleRate * 0.035));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const fade = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * fade;
  }

  return buffer;
}

function enableTypingSound() {
  if (typingSoundEnabled) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  typingAudioContext = typingAudioContext || new AudioContextClass();
  typingNoiseBuffer = typingNoiseBuffer || createTypingNoiseBuffer(typingAudioContext);
  if (typingAudioContext.state === 'suspended') {
    typingAudioContext.resume().catch(() => {});
  }
  typingSoundEnabled = true;
}

document.addEventListener('pointerdown', enableTypingSound, { once: true });
document.addEventListener('keydown', enableTypingSound, { once: true });

function playTypingClick(character, minIntervalMs) {
  if (!typingSoundEnabled || !typingAudioContext || character === ' ' || character === '\n') return;
  const nowMs = performance.now();
  if (nowMs - lastTypingSoundAt < minIntervalMs) return;
  lastTypingSoundAt = nowMs;

  try {
    const now = typingAudioContext.currentTime;
    const source = typingAudioContext.createBufferSource();
    const bodyGain = typingAudioContext.createGain();
    const bodyFilter = typingAudioContext.createBiquadFilter();
    const oscillator = typingAudioContext.createOscillator();
    const tapGain = typingAudioContext.createGain();
    const pitch = character.match(/[.,!?;:]/) ? 150 : 180 + Math.random() * 90;

    source.buffer = typingNoiseBuffer || createTypingNoiseBuffer(typingAudioContext);
    source.playbackRate.setValueAtTime(0.85 + Math.random() * 0.24, now);
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(1450 + Math.random() * 420, now);
    bodyFilter.Q.setValueAtTime(0.9, now);
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.13 * TYPING_SOUND_VOLUME), now + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042 + Math.random() * 0.015);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(pitch, now);
    tapGain.gain.setValueAtTime(0.0001, now);
    tapGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.04 * TYPING_SOUND_VOLUME), now + 0.003);
    tapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.026);

    source.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(typingAudioContext.destination);

    oscillator.connect(tapGain);
    tapGain.connect(typingAudioContext.destination);
    source.start(now);
    source.stop(now + 0.06);
    oscillator.start(now);
    oscillator.stop(now + 0.04);
  } catch (e) {
    typingSoundEnabled = false;
  }
}

function getTypingDelay(character, nextCharacter, speedMultiplier) {
  let delay = 28 + Math.random() * 52;

  if (character === ' ') delay += 18 + Math.random() * 38;
  if (/[,.]/.test(character)) delay += 130 + Math.random() * 120;
  if (/[!?]/.test(character)) delay += 210 + Math.random() * 180;
  if (character === ':' || character === ';') delay += 160 + Math.random() * 130;
  if (character === '\n') delay += 260;
  if (nextCharacter && /[A-Z]/.test(nextCharacter) && character === ' ') delay += 24;
  if (Math.random() < 0.035) delay += 160 + Math.random() * 260;

  return Math.max(14, delay * speedMultiplier);
}

function typeText(element, text, options = {}) {
  const runId = ++typingRunId;
  const speedMultiplier = options.speedMultiplier || 1;
  const soundMinInterval = options.soundMinInterval *1.3 || 58;

  return new Promise((resolve) => {
    if (!element || !text) {
      resolve();
      return;
    }

    element.classList.add('typing');
    element.textContent = '';
    let position = 0;

    const typeNext = () => {
      if (runId !== typingRunId) {
        element.classList.remove('typing');
        resolve();
        return;
      }

      if (position >= text.length) {
        window.setTimeout(() => {
          if (runId === typingRunId) element.classList.remove('typing');
          resolve();
        }, 260);
        return;
      }

      const character = text[position];
      const nextCharacter = text[position + 1];
      element.textContent += character;
      position += 1;
      playTypingClick(character, soundMinInterval);

      window.setTimeout(typeNext, getTypingDelay(character, nextCharacter, speedMultiplier));
    };

    window.setTimeout(typeNext, 220 + Math.random() * 180);
  });
}

function getTypingOptions(step) {
  if (step?.classList.contains('letter-step')) {
    return {
      speedMultiplier: 0.48,
      soundMinInterval: 92,
    };
  }

  return {
    speedMultiplier: 1,
    soundMinInterval: 58,
  };
}

async function activateStep(stepIndex) {
  const activationId = ++activationRunId;
  goToStep(stepIndex);
  resetInteractiveState();

  const activeStep = steps[stepIndex];
  const textElement = activeStep.querySelector('.typed-text');
  const text = (textElement?.dataset.text || '').replace(/\\n/g, '\n');

  await typeText(textElement, text, getTypingOptions(activeStep));
  if (activationId !== activationRunId) return;

  switch (stepIndex) {
    case 0:
      showElement(continueButtons[0]);
      break;
    case 1:
      showElement(continueButtons[1]);
      break;
    case 2:
      showElement(showPlaylistButton);
      break;
    case 3:
      showElement(statsPanel);
      loadAndRenderStats();
      showElement(continueButtons[3]);
      break;
    case 4:
      showElement(quizOptions);
      break;
    default:
      break;
  }
}

function getExitClass(step, direction) {
  if (direction === 'back') return 'exit-back';
  if (step?.classList.contains('letter-step')) return 'exit-send';
  if (step?.classList.contains('music-step')) return 'exit-record';
  if (step?.dataset.transition === 'drift') return 'exit-spiral';
  return 'exit-burst';
}

function animateStepExit(stepIndex, direction) {
  const step = steps[stepIndex];
  if (!step) return Promise.resolve();
  const exitClass = getExitClass(step, direction);
  step.classList.add(exitClass);

  return new Promise((resolve) => {
    window.setTimeout(() => {
      step.classList.remove(exitClass);
      resolve();
    }, 620);
  });
}

function navigateToStep(index, direction = 'forward') {
  const validIndex = Math.max(0, Math.min(index, steps.length - 1));
  if (isChangingStep || validIndex === currentStep) return;

  isChangingStep = true;
  activationRunId += 1;
  typingRunId += 1;
  closeFlippedCard();

  animateStepExit(currentStep, direction).then(() => {
    isChangingStep = false;
    activateStep(validIndex);
  });
}

async function navigateForward() {
  if (currentStep >= steps.length - 1) return;
  if (currentStep === 0) {
    const token = await ensureSpotifyAuthWithResume(1, false);
    if (token) navigateToStep(1);
    return;
  }

  navigateToStep(currentStep + 1);
}

function advanceStep() {
  navigateForward();
}

Object.entries(continueButtons).forEach(([step, button]) => {
  if (!button || Number(step) === 0) return;
  button.addEventListener('click', advanceStep);
});

async function ensureSpotifyAuthWithResume(resumeStep, shouldLoadPlaylist) {
  const token = await getAccessToken();
  if (token) {
    if (sdkReady) {
      initializePlayer(token);
    } else {
      pendingPlayerToken = token;
    }
    return token;
  }

  sessionStorage.setItem(AUTH_RESUME_STEP_KEY, String(resumeStep));
  sessionStorage.setItem(AUTH_RESUME_PLAYLIST_KEY, shouldLoadPlaylist ? '1' : '0');
  redirectToSpotifyAuth();
  return null;
}

if (continueButtons[0]) {
  continueButtons[0].addEventListener('click', async () => {
    const token = await ensureSpotifyAuthWithResume(1, false);
    if (token) navigateToStep(1);
  });
}

if (nextButton) {
  nextButton.addEventListener('click', navigateForward);
}

const backButton = document.getElementById('backButton');
if (backButton) {
  backButton.addEventListener('click', () => {
    if (currentStep > 0) {
      navigateToStep(currentStep - 1, 'back');
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
    }
  });
}

if (showPlaylistButton) {
  showPlaylistButton.addEventListener('click', async () => {
    hideElement(showPlaylistButton);

    const ids = TRACK_LINKS.map(getTrackIdFromLink).filter(Boolean);

    if (!SPOTIFY_CLIENT_ID || ids.length === 0) {
      showFallbackEmbed();
      return;
    }

    showElement(playlistStatus);
    if (playlistStatus) playlistStatus.textContent = 'Connecting to Spotify…';

    const token = await getAccessToken();
    if (!token) {
      sessionStorage.setItem(AUTH_RESUME_STEP_KEY, '2');
      sessionStorage.setItem(AUTH_RESUME_PLAYLIST_KEY, '1');
      redirectToSpotifyAuth(); // redirects away to Spotify login
      return;
    }

    try {
      const pairs = await fetchTracksWithNotes(token, ids, SONG_NOTES);
      if (pairs.length === 0) throw new Error('No tracks could be loaded');
      populatePlaylist(pairs);
      showElement(playlistGrid);
      showElement(playlistHint);
      showElement(continueButtons[2]);

      // Status stays visible (e.g. "Connecting to Spotify…") until the
      // Web Playback SDK reports its device is ready, then it hides itself.
      if (sdkReady) {
        initializePlayer(token);
      } else {
        pendingPlayerToken = token;
      }
    } catch (e) {
      console.warn('Spotify setup failed, falling back to embed', e);
      showFallbackEmbed("Couldn't load your songs — here's the playlist instead.");
    }
  });
}

quizButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const isCorrect = button.textContent.trim() === 'Music';

    quizButtons.forEach((btn) => {
      btn.classList.remove('correct', 'incorrect');
    });

    button.classList.add(isCorrect ? 'correct' : 'incorrect');
    if (quizAnswer) {
      quizAnswer.textContent = isCorrect
        ? 'Yes! It was music and our late-night messages that made us click.'
        : 'Close! Our first connection really sparked over talking about music.';
      showElement(quizAnswer);
      showElement(continueButtons[4]);
    }
  });
});

async function bootstrapBirthdayPage() {
  const bootStartedAt = performance.now();

  const token = await getAccessToken();

  if (!token) {
    // No usable token at all (first-ever visit, or storage was cleared) —
    // send her to Spotify login right now, before she's seen or clicked
    // anything, so this never has to interrupt her once she's actually
    // reading the page. A short pause first so the preloader doesn't just
    // flash and vanish — it reads as "getting things ready" rather than a
    // glitch.
    sessionStorage.setItem(AUTH_RESUME_STEP_KEY, '0');
    sessionStorage.setItem(AUTH_RESUME_PLAYLIST_KEY, '0');
    const elapsedBeforeRedirect = performance.now() - bootStartedAt;
    await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, 500 - elapsedBeforeRedirect)));
    redirectToSpotifyAuth();
    return;
  }

  if (sdkReady) {
    initializePlayer(token);
  } else {
    pendingPlayerToken = token;
  }

  const resumeStep = Number(sessionStorage.getItem(AUTH_RESUME_STEP_KEY) || 0);
  const shouldLoadPlaylist = sessionStorage.getItem(AUTH_RESUME_PLAYLIST_KEY) === '1';
  sessionStorage.removeItem(AUTH_RESUME_STEP_KEY);
  sessionStorage.removeItem(AUTH_RESUME_PLAYLIST_KEY);

  // A fresh visit (no saved resume step) gets the full preloader + tap-to-
  // reveal intro moment. Bouncing back from the Spotify login redirect mid-
  // flow does not — she's already past that moment, so just get her back
  // to where she was as quickly as possible.
  const isFreshLanding = resumeStep === 0;
  const minDelay = isFreshLanding ? HERO_PRELOADER_MIN_MS : 400;
  const elapsed = performance.now() - bootStartedAt;
  await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, minDelay - elapsed)));
  hidePreloader();

  if (isFreshLanding) {
    goToStep(0);
    buildHeroAmbiance();
    setupHeroSongController();
    await waitForHeroTap();
    await activateStep(0);
    startDayCounter();
  } else {
    await activateStep(resumeStep);
  }

  if (shouldLoadPlaylist && currentStep === 2 && showPlaylistButton) {
    showPlaylistButton.click();
  }
}

bootstrapBirthdayPage();
