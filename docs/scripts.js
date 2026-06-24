const steps = Array.from(document.querySelectorAll('.step'));
const continueButtons = {
  0: document.getElementById('continueButton'),
  1: document.getElementById('continueButton1'),
  2: document.getElementById('continueButton2'),
  3: document.getElementById('continueButton3'),
  4: document.getElementById('continueButton4'),
  5: document.getElementById('continueButton5'),
};
const revealMemoryButton = document.getElementById('revealMemory');
const memoryImage = document.getElementById('memoryImage');
const showPlaylistButton = document.getElementById('showPlaylist');
const playlistLink = document.getElementById('playlistLink');
const playlistGrid = document.getElementById('playlistGrid');
const playlistEmbed = document.getElementById('playlistEmbed');
const playlistStatus = document.getElementById('playlistStatus');
const playlistHint = document.getElementById('playlistHint');
const surpriseReveal = document.getElementById('surpriseReveal');
const surpriseList = document.getElementById('surpriseList');
const quizOptions = document.getElementById('quizOptions');
const quizAnswer = document.getElementById('quizAnswer');
const quizButtons = Array.from(document.querySelectorAll('.quiz-options button'));

let currentStep = 0;

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
    currentlyFlippedCard.classList.remove('flipped', 'expanded');
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
  showElement(continueButtons[3]);
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
}

function showElement(element) {
  if (element) element.classList.remove('hidden');
}

function hideElement(element) {
  if (element) element.classList.add('hidden');
}

function resetInteractiveState() {
  hideElement(memoryImage);
  hideElement(playlistLink);
  hideElement(playlistGrid);
  hideElement(playlistEmbed);
  hideElement(playlistStatus);
  hideElement(playlistHint);
  hideElement(surpriseList);
  hideElement(quizAnswer);
  hideElement(revealMemoryButton);
  hideElement(showPlaylistButton);
  hideElement(surpriseReveal);
  Object.values(continueButtons).forEach(hideElement);
  quizButtons.forEach((button) => {
    button.classList.remove('correct', 'incorrect');
  });
  closeFlippedCard();
}

function goToStep(index) {
  const validIndex = Math.max(0, Math.min(index, steps.length - 1));
  currentStep = validIndex;
  setStep(currentStep);
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function typeText(element, text) {
  return new Promise((resolve) => {
    if (!element || !text) {
      resolve();
      return;
    }

    element.classList.add('typing');
    element.textContent = '';
    let position = 0;
    const speed = 50;

    const typeInterval = setInterval(() => {
      if (position < text.length) {
        element.textContent += text[position];
        position += 1;
      } else {
        clearInterval(typeInterval);
        element.classList.remove('typing');
        resolve();
      }
    }, speed);
  });
}

async function activateStep(stepIndex) {
  goToStep(stepIndex);
  resetInteractiveState();

  const activeStep = steps[stepIndex];
  const textElement = activeStep.querySelector('.typed-text');
  const text = textElement?.dataset.text || '';

  await typeText(textElement, text);

  switch (stepIndex) {
    case 0:
      showElement(continueButtons[0]);
      break;
    case 1:
      showElement(revealMemoryButton);
      break;
    case 2:
      showElement(continueButtons[2]);
      break;
    case 3:
      showElement(showPlaylistButton);
      break;
    case 4:
      showElement(surpriseReveal);
      break;
    case 5:
      showElement(quizOptions);
      break;
    default:
      break;
  }
}

function advanceStep() {
  activateStep(currentStep + 1);
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
    if (token) activateStep(1);
  });
}

const backButton = document.getElementById('backButton');
if (backButton) {
  backButton.addEventListener('click', () => {
    if (currentStep > 0) {
      activateStep(currentStep - 1);
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
    }
  });
}

if (revealMemoryButton) {
  revealMemoryButton.addEventListener('click', () => {
    showElement(memoryImage);
    hideElement(revealMemoryButton);
    showElement(continueButtons[1]);
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
      sessionStorage.setItem(AUTH_RESUME_STEP_KEY, '3');
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
      showElement(continueButtons[3]);

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

if (surpriseReveal) {
  surpriseReveal.addEventListener('click', () => {
    showElement(surpriseList);
    hideElement(surpriseReveal);
    showElement(continueButtons[4]);
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
      showElement(continueButtons[5]);
    }
  });
});

async function bootstrapBirthdayPage() {
  const token = await getAccessToken();
  if (token) {
    if (sdkReady) {
      initializePlayer(token);
    } else {
      pendingPlayerToken = token;
    }
  }

  const resumeStep = Number(sessionStorage.getItem(AUTH_RESUME_STEP_KEY) || 0);
  const shouldLoadPlaylist = sessionStorage.getItem(AUTH_RESUME_PLAYLIST_KEY) === '1';
  sessionStorage.removeItem(AUTH_RESUME_STEP_KEY);
  sessionStorage.removeItem(AUTH_RESUME_PLAYLIST_KEY);

  await activateStep(resumeStep || 0);
  if (shouldLoadPlaylist && currentStep === 3 && showPlaylistButton) {
    showPlaylistButton.click();
  }
}

bootstrapBirthdayPage();
