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
const surpriseReveal = document.getElementById('surpriseReveal');
const surpriseList = document.getElementById('surpriseList');
const quizOptions = document.getElementById('quizOptions');
const quizAnswer = document.getElementById('quizAnswer');
const quizButtons = Array.from(document.querySelectorAll('.quiz-options button'));

let currentStep = 0;

// --- Spotify Web API / PKCE config ---
// Set `SPOTIFY_CLIENT_ID` to your Spotify Developer App's client id to enable in-page track previews.
// If left empty the code will fall back to showing the Spotify embed player.
const SPOTIFY_CLIENT_ID = 'cca417449a7c41a9a24a2ee6eeb1cbd5'; // set from user input
const SPOTIFY_REDIRECT_URI = window.location.origin + window.location.pathname;

function getPlaylistIdFromUrl(url) {
  try {
    const m = url && url.match(/playlist\/([a-zA-Z0-9]+)(\?|$)/);
    return m ? m[1] : null;
  } catch (e) { return null; }
}

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
    });
    window.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
  });
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
  const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  localStorage.setItem('sp_token', data.access_token);
  localStorage.setItem('sp_token_expires', String(expiresAt));
  return data.access_token;
}

async function getAccessTokenFromStorageOrAuth() {
  const stored = localStorage.getItem('sp_token');
  const exp = Number(localStorage.getItem('sp_token_expires') || 0);
  if (stored && Date.now() < exp - 60000) return stored;

  // if code present in URL, exchange it
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    try {
      const token = await exchangeCodeForToken(code);
      // remove code from url
      urlParams.delete('code');
      window.history.replaceState({}, document.title, window.location.pathname);
      return token;
    } catch (e) {
      console.warn(e);
      return null;
    }
  }

  return null;
}

async function fetchPlaylistTracks(token, playlistId) {
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch playlist');
  const data = await res.json();
  return data.items.map((it) => it.track).filter(Boolean);
}

function ensureAudioPlayer() {
  let player = document.getElementById('trackPlayer');
  if (!player) {
    player = document.createElement('audio');
    player.id = 'trackPlayer';
    player.controls = true;
    player.preload = 'none';
    player.className = 'player-bar hidden';
    document.body.appendChild(player);
  }
  return player;
}

function populatePlaylist(tracks) {
  if (!playlistGrid) return;
  playlistGrid.innerHTML = '';
  const count = Math.min(9, tracks.length);
  for (let i = 0; i < count; i++) {
    const t = tracks[i];
    const card = document.createElement('div');
    card.className = 'song-card';
    card.dataset.src = t.preview_url || '';

    const cover = document.createElement('div');
    cover.className = 'song-cover';
    if (t.album && t.album.images && t.album.images[0]) {
      cover.style.backgroundImage = `url(${t.album.images[0].url})`;
      cover.style.backgroundSize = 'cover';
      cover.style.backgroundPosition = 'center';
    }

    const copy = document.createElement('div');
    copy.className = 'song-copy';
    const h3 = document.createElement('h3');
    h3.textContent = t.name + (t.artists ? ' — ' + t.artists.map(a=>a.name).join(', ') : '');
    const p = document.createElement('p');
    p.textContent = t.album ? t.album.name : '';

    copy.appendChild(h3);
    copy.appendChild(p);
    card.appendChild(cover);
    card.appendChild(copy);

    card.addEventListener('click', () => {
      const src = card.dataset.src;
      const player = ensureAudioPlayer();
      if (!src) {
        // fall back to showing embed
        if (playlistEmbed) showElement(playlistEmbed);
        return;
      }
      player.src = src;
      player.classList.remove('hidden');
      player.play().catch(() => {});
    });

    playlistGrid.appendChild(card);
  }
}


function setStep(stepIndex) {
  steps.forEach((step, index) => {
    step.classList.toggle('active', index === stepIndex);
    if (index === stepIndex) {
      const bg = step.getAttribute('data-bg');
      if (bg) document.body.style.background = bg;
    }
  });
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
  hideElement(surpriseList);
  hideElement(quizAnswer);
  hideElement(revealMemoryButton);
  hideElement(showPlaylistButton);
  hideElement(surpriseReveal);
  Object.values(continueButtons).forEach(hideElement);
  quizButtons.forEach((button) => {
    button.classList.remove('correct', 'incorrect');
  });
}

function goToStep(index) {
  const validIndex = Math.max(0, Math.min(index, steps.length - 1));
  currentStep = validIndex;
  setStep(currentStep);
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

Object.values(continueButtons).forEach((button) => {
  if (!button) return;
  button.addEventListener('click', advanceStep);
});

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
    const playlistUrl = playlistLink?.href || '';
    const playlistId = getPlaylistIdFromUrl(playlistUrl);

    if (SPOTIFY_CLIENT_ID && playlistId) {
      // try to get or obtain an access token (PKCE)
      const token = await getAccessTokenFromStorageOrAuth();
      if (!token) {
        // start auth flow (this redirects away)
        redirectToSpotifyAuth();
        return;
      }

      try {
        const tracks = await fetchPlaylistTracks(token, playlistId);
        populatePlaylist(tracks);
        showElement(playlistGrid);
        showElement(continueButtons[3]);
        return;
      } catch (e) {
        console.warn('Spotify API failed, falling back to embed', e);
      }
    }

    // fallback: show embed + link
    showElement(playlistGrid);
    showElement(playlistEmbed);
    showElement(playlistLink);
    showElement(continueButtons[3]);
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

activateStep(0);
