const steps = Array.from(document.querySelectorAll('.step'));
const continueButtons = {
  0: document.getElementById('continueButton'),
  1: document.getElementById('continueButton1'),
  2: document.getElementById('continueButton2'),
  3: document.getElementById('continueButton3'),
  4: document.getElementById('continueButton4'),
  5: document.getElementById('continueButton5'),
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
// quiz removed — step 4 is now the digicam page
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

const TYPING_SOUND_VOLUME = 0.3;

const BIRTH_DATE = '2006-10-11';
const BIRTH_TIME = '00:24:00'; // 12:24 AM

const HERO_SONG_TRACK_ID = '4NpDZPwSXmL0cCTaJuVrCw';

const HERO_PRELOADER_MIN_MS = 1800;

const AUTH_RESUME_STEP_KEY = 'sp_auth_resume_step';
const AUTH_RESUME_PLAYLIST_KEY = 'sp_auth_resume_playlist';

const SPOTIFY_CLIENT_ID = 'cca417449a7c41a9a24a2ee6eeb1cbd5'; 
const SPOTIFY_REDIRECT_URI = window.location.origin + window.location.pathname;
const SPOTIFY_SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state';

const TRACK_LINKS = [
  'https://open.spotify.com/track/6lrQo6KAYvb92MGk6ZuZlt?si=8d59831668b84543', //Say You Love Me
  'https://open.spotify.com/track/28jCwARf1gYfHtTHmJJNHQ?si=93489632a3224616', //In a week
  'https://open.spotify.com/track/3mwFncaI2HBczQ92GP9MQF?si=aabf0eb00e8445a7', //Lady Writer
  'https://open.spotify.com/track/3EUl8M6SzxZl03NPkB8mUd?si=6fc729d2e39b4e14', //Neon Moon
  'https://open.spotify.com/track/09RamrocZneYcLYLRIxYha?si=c0cb332c8a5c4e41', //Steeeeam
  'https://open.spotify.com/track/1RPsOAaHaRu8JlVdeaciuL?si=cfbb9d59a0144b34', //lana
  'https://open.spotify.com/track/4KoNBTm9a55KgLMtEaf3n6?si=eec63f279ec248d2', //If you Could Only See
  'https://open.spotify.com/track/608xszaAxVh4m7NcKJiAbF?si=49b535f3b1564fe7', //one of these nights
  'https://open.spotify.com/track/5TpPSTItCwtZ8Sltr3vdzm?si=8ec89429283245f7', //last night on earth
  'https://open.spotify.com/track/4OJ3lHcyZdUaYNyhFQdbax?si=249525887836429e', //summer
  'https://open.spotify.com/track/5j2kEBaonl3vDg1BvnYFtA?si=4514ec3e621c4210', //EDM
  'https://open.spotify.com/track/4LrGrY6IyJUlkFu6Ms4myU?si=e11e6133f38c481e', //The Sweetest Taboo 
];

const SONG_NOTES = [
  'It\'s the first song on the list so I gotta start it off with a bang. This is the ultimate you song. Now don\'t get me wrong, I have always loved Fleetwood Mac, but prior to meeting you, I hadn\'t listened to them in a hot minute. They were mainly reserved for family events and long road trips. Once you told me they were your favorite band though I knew I had to shape up and get back on the grind. This song was your favorite FLeetwood Mac song and soon became mine.', //Say You Love Me
  'I was going to get super sappy with this one, but I think you know exactly what this song means to me/us. It was one of the first songs I recommended you and was also the music for our hard launch. Don\'t ever tell Lev though...can\'t give him the satisfaction of knowing I like a Hozier song this much', //In a week
  '"Is that Putin??" - you', //Lady Writer
  'I\'m really getting overwhelmed by the white culture with this one. And I know you said this was the only country song you liked, but given that you love horses, eat jello salad, and turn into a tomato with 5 minutes of sun exposure, I think that must be a lie. Embrace your cultural background zor!', //Neon Moon
  'performative ass.', //Steeeeam
  'toxic ass.', //lana
  'This is truly one of the songs that reminds me of you the most. It was in that first Queasan\'s mix, and was one that I specifically pointed out as my favorite. It was one of my first impressions of your so called "superior music taste" and you didn\'t disappoint :)', //If you Could Only See
  'I feel like I had to add some 70s song, it would be doing you an injustice to not include one, so I picked a classic ', //one of these nights
  '👀', //last night on earth
  'I remember you telling me at some point there are two artists whom which you gatekeep from others, Landon Conrath and the Volunteers. While I don\'t fully understand the Conrath glaze, I must admit the Volunteers are pretty awesome', //summer
  'A little birdy (you) once told me you had a big EDM phase. Until you show me that playlist this is what I imagine elementary school zoe was rocking out to.', //EDM
  'Of course I can\'t complete this list without including a Sade song. I was debating which one to include and ultimately landed on The Sweetest Taboo. Not only is it one of your favorites but it\'s themes are also quite apt. And not to be tooo dramatic or cringey but I couldn\'t express my love for you in better terms. The song talks about the complexity and intensity of relationships. About passionate, dangerous feelings that foster both devotion and sacrifice. It acknowledges a love that is too good for them, and disbelief that they have found someone who brings out the best in them. And that\'s exactly what you do, Zoe, you bring out the best in the ones you love', //The Sweetest Taboo 
];

const GALLERY_PHOTOS = [
  'photos/_DSC7146.jpeg',
  'photos/_DSC7503.jpg',
  'photos/_DSC7507.jpg',
  'photos/_DSC7517.jpg',
  'photos/_DSC8348.jpg',
  'photos/_DSC8380.jpg',
  'photos/_DSC8383.jpg',
  'photos/_DSC8386.jpg',
  'photos/_DSC8391.jpg',
  'photos/_DSC8402.jpg',
  'photos/_DSC8521.jpg',
  'photos/_DSC8565.jpg',
  'photos/_DSC8590.jpg',
  'photos/_DSC8594.jpg',
  'photos/_DSC8651.jpg',
  'photos/_DSC8671.jpg',
  'photos/5269462785449040391.jpg',
  'photos/DSCI1337.jpg',
  'photos/DSCI1366.jpg',
  'photos/IMG_1114.jpg',
  'photos/IMG_1117.jpg',
  'photos/IMG_1122.jpg',
  'photos/IMG_1382.jpg',
  'photos/IMG_1531.jpg',
  'photos/IMG_1536.jpg',
  'photos/IMG_1541.jpg',
  'photos/IMG_1552.jpg',
  'photos/IMG_1571.jpg',
  'photos/IMG_1576.jpg',
  'photos/IMG_0785.png',
  'photos/IMG_1579.png',
  'photos/IMG_1583.jpg',
  'photos/IMG_1585.jpg',
  'photos/IMG_1601.jpg',
  'photos/IMG_1602.jpg',
  'photos/IMG_1628.jpg',
  'photos/IMG_2803.png',
  'photos/IMG_7622.jpg',
  'photos/IMG_8280.jpg',
  'photos/IMG_9839.jpg', 
  'photos/IMG_20251126_100024.png',
  'photos/IMG_20260901_202333.png',
  'photos/IMG_20260901_202338.jpg',
  'photos/IMG_20260901_202553.png',
  'photos/IMG_20260901_202554.jpg',
  'photos/IMG_20260901_202555.jpg', 
  'photos/IMG_20260901_202559.jpg',
  'photos/IMG_20260901_202606.jpg',
  'photos/PXL_20250910_233219554.jpg',
  'photos/PXL_20250911_024152992.jpg',
  'photos/PXL_20250913_052734646.jpg',
  'photos/PXL_20250914_011325184.jpg',
  'photos/PXL_20251126_065335204.jpg',
  'photos/PXL_20260325_214307241.jpg',
  'photos/PXL_20260702_033527877.jpg',
  'photos/PXL_20260728_052043754.MP.jpg',
  'photos/Screenshot_20260922-220009.png',
  'photos/IMG_20260901_202655.jpg',
  'photos/IMG_20260901_203126.jpg',
  'photos/IMG_20260901_204006.jpg',
  'photos/IMG_20260901_204008.jpg',
  'photos/IMG_20260913_162339_601.jpg',
  'photos/IMG_20260913_162339_782.jpg',
  'photos/IMG_20260913_162427_418.jpg',
  'photos/IMG_20260913_162427_531.jpg',
  'photos/IMG_20260913_162427_549.jpg',
  'photos/IMG_20260913_162427_556.jpg',
  'photos/IMG_20260913_162427_595.jpg',
  'photos/IMG_20260913_162427_612.jpg',
  'photos/IMG_20260913_162427_638.jpg',
  'photos/IMG_20260913_162427_710.jpg',
  'photos/IMG_20260913_162427_717.jpg',
  'photos/IMG_20260913_162427_795.jpg',
  'photos/IMG_20260913_162442_742.jpg',
  'photos/IMG_20260913_162442_751.jpg',
  'photos/IMG_20260913_162442_817.jpg',
  'photos/IMG_20260913_162442_820.jpg',
  'photos/IMG_20260913_162442_872.jpg',
  'photos/IMG_20260913_162521_108.jpg',
  'photos/IMG_20260913_162528_408.jpg',
  'photos/IMG_20260914_093657_619.jpg',
  'photos/IMG_20260914_093657_823.jpg',
  'photos/IMG_20260914_093657_894.jpg',
  'photos/IMG_20260914_093657_931.jpg',
  'photos/IMG_20260914_093658_122.jpg',
  'photos/IMG_20260914_093658_322.jpg',
  'photos/IMG_20260914_144801_283.jpg',
  'photos/IMG_20260914_144801_407.jpg',
  'photos/IMG_20260914_144801_438.jpg',
  'photos/IMG_20260914_144807_235.jpg',
];

const POLAROID_PHOTOS = [
  { src: 'photos/gallery/_DSC6503.jpg', caption: '' },
  { src: 'photos/_DSC7146.jpeg', caption: '' },
  { src: 'photos/_DSC7503.jpg', caption: '' },
  { src: 'photos/_DSC7507.jpg', caption: '' },
  { src: 'photos/_DSC7517.jpg', caption: '' },
  { src: 'photos/_DSC8348.jpg', caption: '' },
  { src: 'photos/_DSC8380.jpg', caption: '' },
  { src: 'photos/_DSC8383.jpg', caption: '' },
  { src: 'photos/_DSC8386.jpg', caption: '' },
  { src: 'photos/_DSC8391.jpg', caption: '' },
  { src: 'photos/_DSC8402.jpg', caption: '' },
  { src: 'photos/_DSC8521.jpg', caption: '' },
  { src: 'photos/_DSC8565.jpg', caption: '' },
  { src: 'photos/_DSC8590.jpg', caption: '' },
  { src: 'photos/_DSC8594.jpg', caption: '' },
  { src: 'photos/_DSC8651.jpg', caption: '' },
  { src: 'photos/_DSC8671.jpg', caption: '' },
  { src: 'photos/5269462785449040391.jpg', caption: '' },
  { src: 'photos/DSCI1337.jpg', caption: '' },
  { src: 'photos/DSCI1366.jpg', caption: '' },
  { src: 'photos/IMG_1114.jpg', caption: '' },
  { src: 'photos/IMG_1117.jpg', caption: '' },
  { src: 'photos/IMG_1122.jpg', caption: '' },
  { src: 'photos/IMG_1382.jpg', caption: '' },
  { src: 'photos/IMG_1531.jpg', caption: '' },
  { src: 'photos/IMG_1536.jpg', caption: '' },
  { src: 'photos/IMG_1541.jpg', caption: '' },
  { src: 'photos/IMG_1552.jpg', caption: '' },
  { src: 'photos/IMG_1571.jpg', caption: '' },
  { src: 'photos/IMG_1576.jpg', caption: '' },
  { src: 'photos/IMG_0785.png', caption: '' },
  { src: 'photos/IMG_1579.png', caption: '' },
  { src: 'photos/IMG_1583.jpg', caption: '' },
  { src: 'photos/IMG_1585.jpg', caption: '' },
  { src: 'photos/IMG_1601.jpg', caption: '' },
  { src: 'photos/IMG_1602.jpg', caption: '' },
  { src: 'photos/IMG_1628.jpg', caption: '' },
  { src: 'photos/IMG_2803.png', caption: '' },
  { src: 'photos/IMG_7622.jpg', caption: '' },
  { src: 'photos/IMG_8280.jpg', caption: '' },
  { src: 'photos/IMG_9839.jpg', caption: '' },
  { src: 'photos/IMG_20251126_100024.png', caption: '' },
  { src: 'photos/IMG_20260901_202333.png', caption: '' },
  { src: 'photos/IMG_20260901_202338.jpg', caption: '' },
  { src: 'photos/IMG_20260901_202553.png', caption: '' },
  { src: 'photos/IMG_20260901_202554.jpg', caption: '' },
  { src: 'photos/IMG_20260901_202555.jpg', caption: '' },
  { src: 'photos/IMG_20260901_202559.jpg', caption: '' },
  { src: 'photos/IMG_20260901_202606.jpg', caption: '' },
  { src: 'photos/PXL_20250910_233219554.jpg', caption: '' },
  { src: 'photos/PXL_20250911_024152992.jpg', caption: '' },
  { src: 'photos/PXL_20250913_052734646.jpg', caption: '' },
  { src: 'photos/PXL_20250914_011325184.jpg', caption: '' },
  { src: 'photos/PXL_20251126_065335204.jpg', caption: '' },
  { src: 'photos/PXL_20260325_214307241.jpg', caption: '' },
  { src: 'photos/PXL_20260702_033527877.jpg', caption: '' },
  { src: 'photos/PXL_20260728_052043754.MP.jpg', caption: '' },
  { src: 'photos/Screenshot_20260922-220009.png', caption: '' },
  { src: 'photos/IMG_20260901_202655.jpg', caption: '' },
  { src: 'photos/IMG_20260901_203126.jpg', caption: '' },
  { src: 'photos/IMG_20260901_204006.jpg', caption: '' },
  { src: 'photos/IMG_20260901_204008.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162339_601.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162339_782.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162427_418.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162427_531.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162427_549.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162427_556.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162427_595.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162427_612.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162427_638.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162427_710.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162427_717.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162427_795.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162442_742.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162442_751.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162442_817.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162442_820.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162442_872.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162521_108.jpg', caption: '' },
  { src: 'photos/IMG_20260913_162528_408.jpg', caption: '' },
  { src: 'photos/IMG_20260914_093657_619.jpg', caption: '' },
  { src: 'photos/IMG_20260914_093657_823.jpg', caption: '' },
  { src: 'photos/IMG_20260914_093657_894.jpg', caption: '' },
  { src: 'photos/IMG_20260914_093657_931.jpg', caption: '' },
  { src: 'photos/IMG_20260914_093658_122.jpg', caption: '' },
  { src: 'photos/IMG_20260914_093658_322.jpg', caption: '' },
  { src: 'photos/IMG_20260914_144801_283.jpg', caption: '' },
  { src: 'photos/IMG_20260914_144801_407.jpg', caption: '' },
  { src: 'photos/IMG_20260914_144801_438.jpg', caption: '' },
  { src: 'photos/IMG_20260914_144807_235.jpg', caption: '' },
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
  if (wasOpen) return; 

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
    card._indicatorEl.textContent = spotifyDeviceId ? '' : 'Connecting…';
  }

  if (uri) playTrackOnDevice(uri);
}

function populatePlaylist(pairs) {
  if (!playlistGrid) return;
  closeFlippedCard();
  playlistGrid.innerHTML = '';
  const count = Math.min(12, pairs.length);

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


function setStep(stepIndex) {
  steps.forEach((step, index) => {
    step.classList.toggle('active', index === stepIndex);
    if (index === stepIndex) {
      const bg = step.getAttribute('data-bg');
      if (bg) document.body.style.background = bg;
    }
  });
  document.body.classList.toggle('music-page',   steps[stepIndex]?.classList.contains('music-step'));
  document.body.classList.toggle('letter-page',  steps[stepIndex]?.classList.contains('letter-step'));
  document.body.classList.toggle('hero-page',    steps[stepIndex]?.classList.contains('hero-step'));
  document.body.classList.toggle('code-page', steps[stepIndex]?.classList.contains('code-step'));
  document.body.classList.toggle('invite-page', steps[stepIndex]?.classList.contains('invite-step'));
  document.body.classList.toggle('digicam-page', steps[stepIndex]?.classList.contains('digicam-step'));
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
  hideElement(showPlaylistButton);
  Object.values(continueButtons).forEach(hideElement);
  closeFlippedCard();
  stopHeroSongEmbed();
  stopDayCounter();
  stopCamTimecode();
  clearGalleryBg();
  // Reset polaroid so it's fresh on re-entry
  if (polaroidFrame)   polaroidFrame.classList.remove('hidden');
  if (polaroidBtn)     polaroidBtn.textContent = 'Click to roll!';
  _lastPolaroidIdx = -1;
}


function renderBarChart(svgEl, points, color) {
  if (!svgEl) return;
  svgEl.innerHTML = '';
  const vb = svgEl.viewBox.baseVal;
  const W = vb.width || 320, H = vb.height || 130;
  const padB = 22, padT = 24, padL = 34, padR = 6;
  const chartW = W - padL - padR;
  const chartH = H - padB - padT;
  const maxVal = Math.max(1, ...points.map((p) => p.value));
  const gap = points.length > 12 ? 2 : 6;
  const barW = (chartW - gap * (points.length - 1)) / points.length;
  const svgNS = 'http://www.w3.org/2000/svg';

  const gridSteps = 4;
  for (let g = 0; g <= gridSteps; g++) {
    const frac = g / gridSteps;
    const gy = padT + chartH - frac * chartH;
    const gridVal = Math.round(maxVal * frac);

    // horizontal gridline
    const gridLine = document.createElementNS(svgNS, 'line');
    gridLine.setAttribute('x1', padL.toFixed(1));
    gridLine.setAttribute('x2', (padL + chartW).toFixed(1));
    gridLine.setAttribute('y1', gy.toFixed(1));
    gridLine.setAttribute('y2', gy.toFixed(1));
    gridLine.setAttribute('class', 'st-grid-line');
    svgEl.appendChild(gridLine);

    // Y-axis label
    const yLbl = document.createElementNS(svgNS, 'text');
    yLbl.setAttribute('x', (padL - 4).toFixed(1));
    yLbl.setAttribute('y', (gy + 3).toFixed(1));
    yLbl.setAttribute('text-anchor', 'end');
    yLbl.setAttribute('class', 'st-axis-label');
    yLbl.textContent = gridVal >= 1000 ? `${(gridVal / 1000).toFixed(gridVal >= 10000 ? 0 : 1)}k` : gridVal;
    svgEl.appendChild(yLbl);
  }

  points.forEach((pt, i) => {
    const bh = Math.max((pt.value / maxVal) * chartH, 2);
    const x  = padL + i * (barW + gap);
    const y  = padT + chartH - bh;

    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', x.toFixed(1));
    rect.setAttribute('y', y.toFixed(1));
    rect.setAttribute('width', barW.toFixed(1));
    rect.setAttribute('height', bh.toFixed(1));
    rect.setAttribute('rx', Math.min(1.5, barW / 3).toFixed(1));
    rect.setAttribute('fill', pt.highlight ? '#f5b94a' : (color || '#8f8a80'));
    rect.setAttribute('opacity', pt.highlight ? '1' : '0.7');
    svgEl.appendChild(rect);


    if (pt.highlight) {
      const valLbl = document.createElementNS(svgNS, 'text');
      valLbl.setAttribute('x', (x + barW / 2).toFixed(1));
      valLbl.setAttribute('y', (y - 3).toFixed(1));
      valLbl.setAttribute('text-anchor', 'middle');
      valLbl.setAttribute('class', pt.highlight ? 'st-bar-val-highlight' : 'st-bar-val');
      const display = pt.value >= 1000
        ? `${(pt.value / 1000).toFixed(pt.value >= 10000 ? 0 : 1)}k`
        : pt.value;
      valLbl.textContent = display;
      svgEl.appendChild(valLbl);
    }

    // X-axis label
    if (pt.label) {
      const lbl = document.createElementNS(svgNS, 'text');
      lbl.setAttribute('x', (x + barW / 2).toFixed(1));
      lbl.setAttribute('y', (H - 6).toFixed(1));
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('class', pt.highlight ? 'st-bar-label-highlight' : 'st-bar-label');
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
  const padB = 24, padT = 20, padL = 36, padR = 8;
  const chartW = W - padL - padR;
  const chartH = H - padB - padT;
  const maxVal = Math.max(1, ...points.map((p) => p.value));
  const stepX = points.length > 1 ? chartW / (points.length - 1) : 0;
  const svgNS = 'http://www.w3.org/2000/svg';


  const defs = document.createElementNS(svgNS, 'defs');
  const gid = `g${Math.random().toString(36).slice(2, 7)}`;
  defs.innerHTML = `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#efeae2" stop-opacity="0.16"/>
    <stop offset="100%" stop-color="#efeae2" stop-opacity="0"/>
  </linearGradient>`;
  svgEl.appendChild(defs);


  const gridSteps = 4;
  for (let g = 0; g <= gridSteps; g++) {
    const frac = g / gridSteps;
    const gy = padT + chartH - frac * chartH;
    const gridVal = Math.round(maxVal * frac);

    const gridLine = document.createElementNS(svgNS, 'line');
    gridLine.setAttribute('x1', padL.toFixed(1));
    gridLine.setAttribute('x2', (padL + chartW).toFixed(1));
    gridLine.setAttribute('y1', gy.toFixed(1));
    gridLine.setAttribute('y2', gy.toFixed(1));
    gridLine.setAttribute('class', 'st-grid-line');
    svgEl.appendChild(gridLine);

    const yLbl = document.createElementNS(svgNS, 'text');
    yLbl.setAttribute('x', (padL - 4).toFixed(1));
    yLbl.setAttribute('y', (gy + 3).toFixed(1));
    yLbl.setAttribute('text-anchor', 'end');
    yLbl.setAttribute('class', 'st-axis-label');
    yLbl.textContent = gridVal >= 1000 ? `${(gridVal / 1000).toFixed(gridVal >= 10000 ? 0 : 1)}k` : gridVal;
    svgEl.appendChild(yLbl);
  }


  const coords = points.map((pt, i) => ({
    x: padL + i * stepX,
    y: padT + chartH - (pt.value / maxVal) * chartH,
    label: pt.label,
    value: pt.value,
  }));

  // Find the peak point
  const peakIdx = coords.reduce((best, c, i) => c.value > coords[best].value ? i : best, 0);

  
  const linePts  = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const baseY    = (padT + chartH).toFixed(1);
  const areaPts  = `${linePts} L${coords.at(-1).x.toFixed(1)},${baseY} L${coords[0].x.toFixed(1)},${baseY} Z`;

  const area = document.createElementNS(svgNS, 'path');
  area.setAttribute('d', areaPts);
  area.setAttribute('fill', `url(#${gid})`);
  svgEl.appendChild(area);

  const line = document.createElementNS(svgNS, 'path');
  line.setAttribute('d', linePts);
  line.setAttribute('class', 'st-line-path');
  svgEl.appendChild(line);

 
  coords.forEach((c, i) => {
    const isPeak = i === peakIdx;

    // Dot
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('cx', c.x.toFixed(1));
    dot.setAttribute('cy', c.y.toFixed(1));
    dot.setAttribute('r',  isPeak ? '4.5' : '2.5');
    dot.setAttribute('class', isPeak ? 'st-line-dot-peak' : 'st-line-dot');
    svgEl.appendChild(dot);

    // Value callout — show on peak, and every Nth point to avoid crowding
    const showVal = isPeak;
    if (showVal) {
      const vLbl = document.createElementNS(svgNS, 'text');
      vLbl.setAttribute('x', c.x.toFixed(1));
      vLbl.setAttribute('y', (c.y - 7).toFixed(1));
      vLbl.setAttribute('text-anchor', 'middle');
      vLbl.setAttribute('class', isPeak ? 'st-bar-val-highlight' : 'st-bar-val');
      const display = c.value >= 1000
        ? `${(c.value / 1000).toFixed(c.value >= 10000 ? 0 : 1)}k`
        : c.value;
      vLbl.textContent = display;
      svgEl.appendChild(vLbl);
    }

    // X-axis label
    if (c.label) {
      const lbl = document.createElementNS(svgNS, 'text');
      lbl.setAttribute('x', c.x.toFixed(1));
      lbl.setAttribute('y', (H - 7).toFixed(1));
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('class', 'st-bar-label');
      lbl.textContent = c.label;
      svgEl.appendChild(lbl);
    }
  });
}



const ME_KEY = 'Me';
const HER_KEY = 'Her';

function n(val) {

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
  return sender === ME_KEY ? 'st-me' : 'st-her';
}



const AWARD_META = {
  speed_texter:  { emoji: '⚡', title: 'Speed Texter' },
  night_owl:     { emoji: '🌙', title: 'No Sleep Schedule' },
  wall_of_text:  { emoji: '📜', title: 'Wall of Text' },
  double_texter: { emoji: '💬', title: 'Double Texter' },
  emoji_master:  { emoji: '😂', title: 'Emoji Spammer' },
  yeller:        { emoji: '📢', title: 'Yeller' },
  dot_dot_dot:   { emoji: '…', title: 'Dot Dot Dot' },
};


async function loadAndRenderStats() {
  
  const ids = ['s-total','s-total-sub','s-streak','s-best-day-count','s-best-day-date',
               's-reply-me','s-reply-her','s-hour-note'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '…'; });

  let data;
  try {
    const resp = await fetch('stats.json?v=' + Date.now());
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

 
  set('s-total', n(data.total_messages));
  const firstDate = data.milestones?.['1']?.timestamp
    ? fmtDate(data.milestones['1'].timestamp) : '';
  set('s-total-sub', firstDate ? `messages since ${firstDate}` : 'messages');

  const meSent  = me.messages_sent  ?? 0;
  const herSent = her.messages_sent ?? 0;
  const total   = meSent + herSent || 1;
  const mePct   = (meSent / total) * 100;
  const fillEl  = document.getElementById('s-sent-fill');
  if (fillEl) fillEl.style.width = `${mePct.toFixed(1)}%`;
  set('s-sent-me',  `<strong>${n(meSent)}</strong> Me`);
  set('s-sent-her', `<strong>${n(herSent)}</strong> You`);

  
  set('s-streak', `${n(data.longest_daily_texting_streak_days)} days`);

  const bestDay = data.most_messages_in_one_day ?? {};
  set('s-best-day-count', n(bestDay.count));
  set('s-best-day-date', bestDay.date ? fmtDate(bestDay.date + 'T00:00:00') : '—');

  set('s-reply-me',  rt[ME_KEY]?.average_response_time_human  ?? '—');
  set('s-reply-her', rt[HER_KEY]?.average_response_time_human ?? '—');

  
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
  renderBarChart(byHourChartEl, hourPoints, '#8f8a80');
  // Peak hour note
  const peakHour = +Object.entries(hourRaw).sort((a, b) => b[1] - a[1])[0]?.[0];
  const peakLabel = peakHour !== undefined
    ? (peakHour === 0 ? 'midnight' : peakHour < 12 ? `${peakHour}am` : peakHour === 12 ? 'noon' : `${peakHour - 12}pm`)
    : '';
  set('s-hour-note', peakLabel ? `Busiest around ${peakLabel}.` : '');

  // By weekday
  const wdRaw = data.messages_by_weekday ?? {};
  const maxWd = Math.max(...Object.values(wdRaw));
  const wdPoints = Object.entries(wdRaw).map(([day, v]) => ({
    label: day.slice(0, 3),
    value: v,
    highlight: v === maxWd,
  }));
  renderBarChart(byWeekdayChartEl, wdPoints, '#8f8a80');

  
  const convos = data.conversations_started ?? {};
  const meConvos  = convos[ME_KEY]  ?? 0;
  const herConvos = convos[HER_KEY] ?? 0;
  const convTotal = meConvos + herConvos || 1;
  const meCPct    = (meConvos / convTotal) * 100;
  const firstFill = document.getElementById('s-first-fill');
  if (firstFill) firstFill.style.width = `${meCPct.toFixed(1)}%`;
  set('s-first-me',  `<strong>${meCPct.toFixed(1)}%</strong> Me (${n(meConvos)})`);
  set('s-first-her', `<strong>${(100 - meCPct).toFixed(1)}%</strong> You (${n(herConvos)})`);

  
  const awardsEl = document.getElementById('s-awards');
  if (awardsEl) {
    awardsEl.innerHTML = '';
    Object.entries(data.awards ?? {}).forEach(([key, award]) => {
      if (!award) return;
      const meta = AWARD_META[key] ?? { emoji: '🏆', title: key };
      const winner = senderLabel(award.winner);
      const card = document.createElement('div');
      card.className = 'st-award';
      card.innerHTML = `
        <span class="st-award-title">${meta.title}</span>
        <span class="st-award-winner ${award.winner === ME_KEY ? 'st-me' : 'st-her'}">${winner}</span>
        <span class="st-award-detail">${award.detail}</span>
      `;
      awardsEl.appendChild(card);
    });
  }

 
  const msEl = document.getElementById('s-milestones');
  if (msEl) {
    msEl.innerHTML = '';
    Object.entries(data.milestones ?? {}).forEach(([num, ms]) => {
      if (!ms) return;
      const cls = senderClass(ms.sender);
      const label = senderLabel(ms.sender);
      const row = document.createElement('div');
      row.className = 'st-msg ' + (ms.sender === ME_KEY ? 'st-msg-me' : 'st-msg-her');
      row.innerHTML = `
        <span class="st-bubble">${esc(String(ms.text).slice(0, 90))}</span>
        <span class="st-msg-meta">#${Number(num).toLocaleString()} · ${fmtDate(ms.timestamp)}</span>
      `;
      msEl.appendChild(row);
    });
  }

  
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
      const cls = val.sender === ME_KEY ? 'st-me' : 'st-her';
      const who = senderLabel(val.sender);
      const row = document.createElement('div');
      row.className = 'st-first-row';
      row.innerHTML = `
        <span class="st-first-label">${firstsMap[key]}</span>
        <span class="st-first-val ${cls}">${who} — ${fmtDate(val.timestamp)}</span>
      `;
      firstsEl.appendChild(row);
    });
  }

  function renderWordCol(elId, words, headerClass, headerLabel) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<div class="st-col-head ${headerClass}">${headerLabel}</div>`;
    (words ?? []).slice(0, 10).forEach(([word, count], i) => {
      const row = document.createElement('div');
      row.className = 'st-word-row';
      row.innerHTML = `<span class="st-word-rank">${i + 1}</span><span class="st-word">${word}</span><span class="st-word-count">${n(count)}</span>`;
      el.appendChild(row);
    });
  }
  renderWordCol('s-words-me',  me.top_50_words,  'st-me',  'Me');
  renderWordCol('s-words-her', her.top_50_words, 'st-her', 'You');

  function renderEmojiCol(elId, emojis, headerClass, headerLabel) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<div class="st-col-head ${headerClass}">${headerLabel}</div>`;
    (emojis ?? []).slice(0, 7).forEach(([glyph, count]) => {
      const row = document.createElement('div');
      row.className = 'st-emoji-row';
      row.innerHTML = `<span class="st-emoji-glyph">${glyph}</span><span class="st-emoji-count">${n(count)}</span>`;
      el.appendChild(row);
    });
  }
  renderEmojiCol('s-emoji-me',  me.top_emojis,  'st-me',  'Me');
  renderEmojiCol('s-emoji-her', her.top_emojis, 'st-her', 'You');

  const factsEl = document.getElementById('s-facts');
  if (factsEl) {
    const ilyMe  = me.phrase_counts?.['i love you']  ?? 0;
    const ilyHer = her.phrase_counts?.['i love you'] ?? 0;
    const sryMe  = me.phrase_counts?.['sorry']       ?? 0;
    const sryHer = her.phrase_counts?.['sorry']      ?? 0;
    const msOne  = data.milestones?.['1'];

    const facts = [
      `You have a vocabulary of <strong>${n(her.vocabulary_size)} unique words</strong>. I use ${n(me.vocabulary_size)}.`,
      `Your average message is <strong>${her.average_message_length_chars} chars</strong>. Mine is ${me.average_message_length_chars}.`,
      `You've said "I love you" <strong>${n(ilyHer)} times</strong>. I've said it ${n(ilyMe)} times.`,
      `You said sorry <strong>${n(sryHer)} times</strong>. I said sorry ${n(sryMe)} times.`,
      msOne ? `Message #1 was ${senderLabel(msOne.sender) === 'You' ? 'you' : 'me'} asking <strong>"${msOne.text.slice(0, 60)}"</strong>` : null,
      `We've sent an average of <strong>${Math.round(data.total_messages / Math.max(1, Object.keys(data.messages_over_time_by_year_month ?? {}).length))} messages per month</strong>.`,
    ].filter(Boolean);

    factsEl.innerHTML = facts.map(f => `<div class="st-fact">${f}</div>`).join('');
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
     
      onApiReady(window.Spotify.Iframe);
    } else {
      
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
      
    }
  }
  if (heroSongEmbed) hideElement(heroSongEmbed);
}

function hidePreloader() {
  if (preloaderEl) preloaderEl.classList.add('preloader-hidden');
}


const confettiBurstLayer = document.getElementById('confettiBurstLayer');
const BURST_CONFETTI_COLORS = ['#ff3d7f', '#ffb703', '#06d6a0', '#4cc9f0', '#9b5de5', '#ff8fab', '#ffffff'];

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
      speedMultiplier: 0.00001,
      soundMinInterval: 50,
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
      initCrossword();
      showElement(continueButtons[4]);
      break;
    case 5:
      buildGalleryBg();
      startCamTimecode();
      showElement(continueButtons[5]);
      break;
    case 6:
      initInvite();
      break;
    case 7:
      initCode();
      break;
    default:
      break;
  }
}

function buildGalleryBg() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!GALLERY_PHOTOS.length) return;   // nothing to show; dark bg is the fallback

  // Fill enough cells to cover any screen size, cycling photos if needed
  const CELL = 190;
  const cols = Math.ceil(window.innerWidth  / CELL) + 1;
  const rows = Math.ceil(window.innerHeight / CELL) + 1;
  // Shuffle the photo list so the mosaic isn't in insertion order
  const shuffled = [...GALLERY_PHOTOS].sort(() => Math.random() - 0.5);

  for (let i = 0; i < cols * rows; i++) {
    const img = document.createElement('img');
    img.className = 'gallery-photo';
    img.src       = shuffled[i % shuffled.length];
    img.alt       = '';
    img.loading   = 'lazy';
    // Slight per-tile scale + rotation keeps it from feeling like a plain grid
    const rot   = (Math.random() - 0.5) * 5;
    img.style.transform = `rotate(${rot}deg) scale(1.06)`;
    grid.appendChild(img);
  }
}

function clearGalleryBg() {
  const grid = document.getElementById('galleryGrid');
  if (grid) grid.innerHTML = '';
}

let _camTimecodeInterval = null;

function startCamTimecode() {
  const el = document.getElementById('camTimecode');
  if (!el) return;
  const start = Date.now();
  el.textContent = '00:00:00';
  _camTimecodeInterval = setInterval(() => {
    const s   = Math.floor((Date.now() - start) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    el.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  }, 1000);
}

function stopCamTimecode() {
  if (_camTimecodeInterval) {
    clearInterval(_camTimecodeInterval);
    _camTimecodeInterval = null;
  }
  const el = document.getElementById('camTimecode');
  if (el) el.textContent = '00:00:00';
}

const polaroidBtn     = document.getElementById('polaroidBtn');
const polaroidFrame   = document.getElementById('polaroidFrame');
const polaroidImg     = document.getElementById('polaroidImg');
const polaroidCaption = document.getElementById('polaroidCaption');

let _lastPolaroidIdx = -1;

if (polaroidBtn) {
  polaroidBtn.addEventListener('click', () => {
    if (!POLAROID_PHOTOS.length) return;

    let idx;
    do {
      idx = Math.floor(Math.random() * POLAROID_PHOTOS.length);
    } while (idx === _lastPolaroidIdx && POLAROID_PHOTOS.length > 1);
    _lastPolaroidIdx = idx;

    const photo    = POLAROID_PHOTOS[idx];
    const rotation = (Math.random() - 0.5) * 10;  // -5° to +5°

    // Restart the CSS animation on each click (developing effect)
    polaroidFrame.style.animation = 'none';
    polaroidFrame.offsetHeight;           // force reflow
    polaroidFrame.style.animation = '';

    polaroidFrame.style.setProperty('--pol-rotate', `${rotation}deg`);
    polaroidFrame.classList.remove('hidden');

    polaroidImg.src = photo.src;
    polaroidImg.alt = photo.caption || '';

    if (photo.caption) {
      polaroidCaption.textContent = photo.caption;
      polaroidCaption.style.display = 'block';
    } else {
      polaroidCaption.style.display = 'none';
    }

    polaroidBtn.textContent = '📸 Another one';
  });
}

function getExitClass(step, direction) {
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

async function bootstrapBirthdayPage() {
  const bootStartedAt = performance.now();

  const token = await getAccessToken();

  if (!token) {
    
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

const XW_GRID = [
//  0     1     2     3     4     5     6     7     8     9    10    11    12    13    14    15    16    17    18
  [null, null, null, null, null, null, 'S',  'E',  'X',  'Y',  null, null, null, 'C',  null, null, null, null, null],
  [null, null, null, null, null, null, 'P',  null, null, 'O',  null, null, null, 'O',  null, 'W',  null, null, null],
  ['C',  'O',  'L',  'E',  'S',  'L',  'A',  'W',  null, 'U',  'N',  'D',  'E',  'R',  'B',  'A',  'K',  'E',  'D'],
  [null, 'F',  null, null, null, null, 'D',  null, null, 'N',  null, 'I',  null, 'O',  null, 'H',  null, null, null],
  [null, 'M',  null, null, null, null, 'E',  null, null, 'G',  'A',  'S',  null, 'N',  null, 'W',  null, null, null],
  [null, 'Y',  null, 'P',  'O',  'R',  'S',  'C',  'H',  'E',  null, 'C',  null, 'A',  null, 'A',  null, null, null],
  [null, 'L',  null, 'I',  null, 'I',  null, 'O',  null, 'S',  null, 'U',  null, null, null, 'H',  null, null, null],
  [null, 'A',  null, 'N',  null, 'B',  null, 'L',  null, 'T',  null, 'S',  'A',  'N',  'D',  'W',  'I',  'C',  'H'],
  [null, 'B',  'A',  'G',  'U',  'E',  'T',  'T',  'E',  null, null, null, null, null, null, 'A',  null, null, null],
  [null, 'O',  null, null, null, 'Y',  null, null, null, null, null, null, null, null, null, 'H',  null, null, null],
  [null, 'R',  null, null, null, 'E',  null, null, null, null, null, null, null, null, null, null, null, null, null],
];

const XW_CLUES = {
  across: {
    1:  { answer: 'SEXY',       clue: '\"ahaha, no, don\'t kill yourself, you\'re so ____\"' },
    5:  { answer: 'COLESLAW',   clue: 'The perfect cabbage dish to go with your unseasoned chicken and jello salad' },
    7:  { answer: 'UNDERBAKED', clue: 'How you like your brownies' },
    9:  { answer: 'GAS',        clue: 'What you pass all the time (Hint: stinky)' },
    10: { answer: 'PORSCHE',    clue: 'Your dream car' },
    13: { answer: 'SANDWICH',   clue: 'You had your favorite one of these in Italy' },
    14: { answer: 'BAGUETTE',   clue: 'Oui, Oui, \"________\" ' },
  },
  down: {
    1:  { answer: 'SPADES',    clue: 'The type of queen you take all the time :)' },
    2:  { answer: 'YOUNGEST',  clue: 'You are the ________ person ever!' },
    3:  { answer: 'CORONA',    clue: 'What you might find in Ryan\'s hand at one of your house parties' },
    4:  { answer: 'WAHWAHWAH', clue: 'Your response to me complaining about something you did' },
    6:  { answer: 'OFMYLABOR', clue: '\"STAND BY ME AND ENJOY THE FRUITS __ __ _____, OR BE GONE!!\"' },
    8:  { answer: 'DISCUS',    clue: 'The coolest sport ever' },
    10: { answer: 'PING',      clue: 'The name of both a little chinese boy and a hippo' },
    11: { answer: 'RIBEYE',    clue: 'Your favorite cut (of beef)' },
    12: { answer: 'COLT',      clue: 'A young male horse (i think?)' },
  },
};

function computeXwLayout() {
  const ROWS = XW_GRID.length;
  const COLS = XW_GRID[0].length;

  const startsAcross = (r, c) =>
    !!XW_GRID[r][c] &&
    (c === 0 || !XW_GRID[r][c - 1]) &&
    c + 1 < COLS && !!XW_GRID[r][c + 1];

  const startsDown = (r, c) =>
    !!XW_GRID[r][c] &&
    (r === 0 || !XW_GRID[r - 1][c]) &&
    r + 1 < ROWS && !!XW_GRID[r + 1][c];

  const cellNum = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let num = 1;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (startsAcross(r, c) || startsDown(r, c)) cellNum[r][c] = num++;

  const cellAcross = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const cellDown   = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  for (let r = 0; r < ROWS; r++) {
    let cur = null;
    for (let c = 0; c < COLS; c++) {
      if (!XW_GRID[r][c]) { cur = null; continue; }
      if (startsAcross(r, c)) cur = cellNum[r][c];
      if (cur) cellAcross[r][c] = cur;
    }
  }
  for (let c = 0; c < COLS; c++) {
    let cur = null;
    for (let r = 0; r < ROWS; r++) {
      if (!XW_GRID[r][c]) { cur = null; continue; }
      if (startsDown(r, c)) cur = cellNum[r][c];
      if (cur) cellDown[r][c] = cur;
    }
  }

  return { cellNum, cellAcross, cellDown, ROWS, COLS };
}

let xwLayout   = null;
let xwSelected = null;
let xwDir      = 'across';
let xwInputs   = null;

function initCrossword() {
  const grid = document.getElementById('xwGrid');
  if (!grid || grid.dataset.built === '1') return;
  grid.dataset.built = '1';

  xwLayout = computeXwLayout();
  const { cellNum, cellAcross, cellDown, ROWS, COLS } = xwLayout;
  xwInputs = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  grid.style.gridTemplateColumns = `repeat(${COLS}, var(--xw-cell))`;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'xw-cell';
      if (!XW_GRID[r][c]) {
        cell.classList.add('xw-black');
      } else {
        if (cellNum[r][c]) {
          const n = document.createElement('span');
          n.className = 'xw-num';
          n.textContent = cellNum[r][c];
          cell.appendChild(n);
        }
        const inp = document.createElement('input');
        inp.type = 'text'; inp.maxLength = 1;
        inp.autocomplete = 'off'; inp.autocorrect = 'off';
        inp.autocapitalize = 'characters'; inp.spellcheck = false;
        inp.dataset.r = r; inp.dataset.c = c;
        inp.className = 'xw-input';
        inp.addEventListener('focus',   () => xwSelectCell(r, c, null));
        inp.addEventListener('keydown', (e) => xwHandleKey(e, r, c));
        inp.addEventListener('input',   (e) => xwHandleInput(e, r, c));
        cell.appendChild(inp);
        xwInputs[r][c] = inp;
      }
      grid.appendChild(cell);
    }
  }
  xwBuildClueLists();
  document.getElementById('xwCheck')?.addEventListener('click',  xwCheckAnswers);
  document.getElementById('xwReveal')?.addEventListener('click', xwRevealSelected);
  document.getElementById('xwClear')?.addEventListener('click',  xwClearAll);
}

function xwSelectCell(r, c, forceDir) {
  const { cellAcross, cellDown } = xwLayout;
  if (xwSelected?.r === r && xwSelected?.c === c && forceDir === null) {
    if (cellAcross[r][c] && cellDown[r][c])
      xwDir = xwDir === 'across' ? 'down' : 'across';
  } else {
    if (forceDir) xwDir = forceDir;
    else if (!cellAcross[r][c] && cellDown[r][c]) xwDir = 'down';
    else if (cellAcross[r][c] && !cellDown[r][c]) xwDir = 'across';
  }
  xwSelected = { r, c };
  xwHighlight();
  xwInputs[r][c]?.focus({ preventScroll: true });
}

function xwHighlight() {
  if (!xwLayout || !xwSelected) return;
  const { cellAcross, cellDown, ROWS, COLS } = xwLayout;
  const { r, c } = xwSelected;
  const activeClue = xwDir === 'across' ? cellAcross[r]?.[c] : cellDown[r]?.[c];
  for (let rr = 0; rr < ROWS; rr++) {
    for (let cc = 0; cc < COLS; cc++) {
      const inp = xwInputs[rr]?.[cc];
      if (!inp) continue;
      const inWord = xwDir === 'across'
        ? cellAcross[rr][cc] === activeClue
        : cellDown[rr][cc] === activeClue;
      inp.parentElement.classList.toggle('xw-word',   inWord);
      inp.parentElement.classList.toggle('xw-cursor', rr === r && cc === c);
    }
  }
  document.querySelectorAll('.xw-clue-item').forEach((li) => {
    const isActive = li.dataset.dir === xwDir && Number(li.dataset.num) === activeClue;
    li.classList.toggle('xw-clue-active', isActive);
    if (isActive) li.scrollIntoView({ block: 'nearest' });
  });
}

function xwHandleKey(e, r, c) {
  const { ROWS, COLS } = xwLayout;
  const dr = xwDir === 'down'   ? 1 : 0;
  const dc = xwDir === 'across' ? 1 : 0;
  if (e.key === 'Backspace') {
    e.preventDefault();
    if (xwInputs[r][c].value) {
      xwInputs[r][c].value = '';
    } else {
      const pr = r - dr, pc = c - dc;
      if (pr >= 0 && pc >= 0 && xwInputs[pr]?.[pc]) {
        xwInputs[pr][pc].value = '';
        xwSelectCell(pr, pc, xwDir);
      }
    }
    return;
  }
  if (e.key === 'Tab')        { e.preventDefault(); xwNextWord(e.shiftKey); return; }
  if (e.key === 'ArrowRight') { e.preventDefault(); xwMove(r, c, 0,  1); return; }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); xwMove(r, c, 0, -1); return; }
  if (e.key === 'ArrowDown')  { e.preventDefault(); xwMove(r, c,  1, 0); return; }
  if (e.key === 'ArrowUp')    { e.preventDefault(); xwMove(r, c, -1, 0); return; }
}

function xwHandleInput(e, r, c) {
  const { ROWS, COLS } = xwLayout;
  const dr = xwDir === 'down'   ? 1 : 0;
  const dc = xwDir === 'across' ? 1 : 0;
  const raw = e.target.value.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase();
  e.target.value = raw;
  e.target.classList.remove('xw-correct', 'xw-wrong', 'xw-revealed');
  if (raw) {
    const nr = r + dr, nc = c + dc;
    if (nr < ROWS && nc < COLS && xwInputs[nr]?.[nc]) xwSelectCell(nr, nc, xwDir);
  }
}

function xwMove(r, c, dr, dc) {
  const { ROWS, COLS } = xwLayout;
  const nr = r + dr, nc = c + dc;
  if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && xwInputs[nr]?.[nc]) {
    if (dr !== 0) xwDir = 'down';
    if (dc !== 0) xwDir = 'across';
    xwSelectCell(nr, nc, xwDir);
  }
}

function xwNextWord(backwards) {
  const words = [
    ...Object.keys(XW_CLUES.across).map(n => ({ num: +n, dir: 'across' })),
    ...Object.keys(XW_CLUES.down).map(n => ({ num: +n, dir: 'down' })),
  ].sort((a, b) => a.num - b.num || (a.dir === 'across' ? -1 : 1));
  const { cellAcross, cellDown } = xwLayout;
  const { r, c } = xwSelected || { r: 0, c: 0 };
  const curClue = xwDir === 'across' ? cellAcross[r]?.[c] : cellDown[r]?.[c];
  const curIdx  = words.findIndex(w => w.dir === xwDir && w.num === curClue);
  const next    = words[(curIdx + (backwards ? -1 : 1) + words.length) % words.length];
  xwDir = next.dir;
  for (let rr = 0; rr < XW_GRID.length; rr++)
    for (let cc = 0; cc < XW_GRID[0].length; cc++) {
      const clue = next.dir === 'across' ? xwLayout.cellAcross[rr][cc] : xwLayout.cellDown[rr][cc];
      if (clue === next.num) { xwSelectCell(rr, cc, next.dir); return; }
    }
}

function xwCheckAnswers() {
  const { ROWS, COLS } = xwLayout;
  let correct = 0, total = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const inp = xwInputs[r]?.[c];
      if (!inp || inp.classList.contains('xw-revealed') || !inp.value) continue;
      total++;
      if (inp.value.toUpperCase() === XW_GRID[r][c]) {
        inp.classList.replace('xw-wrong', 'xw-correct') || inp.classList.add('xw-correct');
        correct++;
      } else {
        inp.classList.replace('xw-correct', 'xw-wrong') || inp.classList.add('xw-wrong');
      }
    }
  const s = document.getElementById('xwStatus');
  if (s) s.textContent = total === 0
    ? 'Fill in some letters first!'
    : `${correct} of ${total} filled letters correct.`;
}

function xwRevealSelected() {
  if (!xwSelected) return;
  const { r, c } = xwSelected;
  const inp = xwInputs[r]?.[c];
  if (!inp) return;
  inp.value = XW_GRID[r][c];
  inp.classList.remove('xw-correct', 'xw-wrong');
  inp.classList.add('xw-revealed');
}

function xwClearAll() {
  const { ROWS, COLS } = xwLayout;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const inp = xwInputs[r]?.[c];
      if (inp) { inp.value = ''; inp.classList.remove('xw-correct', 'xw-wrong', 'xw-revealed'); }
    }
  const s = document.getElementById('xwStatus');
  if (s) s.textContent = '';
}

function xwBuildClueLists() {
  const acrossList = document.getElementById('xwAcrossClues');
  const downList   = document.getElementById('xwDownClues');
  if (!acrossList || !downList) return;
  const { cellAcross, cellDown, ROWS, COLS } = xwLayout;

  const makeItem = (num, data, dir) => {
    const li = document.createElement('li');
    li.className = 'xw-clue-item';
    li.dataset.num = num; li.dataset.dir = dir;
    const ns = document.createElement('span'); ns.className = 'xw-clue-num'; ns.textContent = `${num}.`;
    const ts = document.createElement('span'); ts.className = 'xw-clue-text';
    ts.textContent = data.clue || `(${data.answer.length} letters)`;
    li.appendChild(ns); li.appendChild(ts);
    li.addEventListener('click', () => {
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const cl = dir === 'across' ? cellAcross[r][c] : cellDown[r][c];
          if (cl === +num) { xwDir = dir; xwSelectCell(r, c, dir); return; }
        }
    });
    return li;
  };

  Object.entries(XW_CLUES.across).sort((a,b)=>+a[0]-+b[0]).forEach(([n,d]) => acrossList.appendChild(makeItem(n, d, 'across')));
  Object.entries(XW_CLUES.down).sort((a,b)=>+a[0]-+b[0]).forEach(([n,d]) => downList.appendChild(makeItem(n, d, 'down')));
}

const INVITE = {
  guest: 'Zoe Roberts',
  host: 'Chef Easan',
  hostEmail: 'easanhamkins@gmail.com',   
  formEndpoint: 'https://formspree.io/f/xgaoyvzg',               // OPTIONAL: paste a Formspree URL (https://formspree.io/f/xxxx) so it emails you automatically
  details: [
    ['When', 'Saturday, October 17th, 2026'],
    ['Arrival', '7:30 PM · Dinner served at 8:00 PM'],
    ['Attire', 'Cocktail attire — dress fancy'],
    ['Where', '3407 Markridge Rd., La Crescenta, CA 91214'],
  ],
  rsvpBy: 'October 12th',
  courses: [
    { key: 'starter', title: 'Hors d\'Oeuvres', items: [
      { id: 'Tuna', name: 'Tuna on Crispy Rice', desc: 'Blue fin tuna, avocado, citrus vinaigrette.', icon: '🐟', img: 'images/menu/crispy-tuna.png' },
      { id: 'Balls', name: 'Mac and Cheese Balls', desc: 'Creamy mac and cheese, rolled and fried in panko breadcrumbs.', icon: '🧀', img: 'images/menu/mac-and-cheese-balls.png' },
      { id: 'Brie', name: 'Baked Brie with Charcoochie Board', desc: 'Baked brie wheel served with a charcoochie board.', icon: '🥬', img: 'images/menu/brie.jpg' },
    ]},
    { key: 'main', title: 'Entrées', items: [
      { id: 'Ribeye', name: '12oz. Ribeye', desc: 'Classic steak, garlic-herb butter, crispy potatoes.', icon: '🥩', img: 'images/menu/ribeye.jpg' },
      { id: 'Short-rib', name: 'Braised Beef Short Rib', desc: 'Slow-braised beef short rib, red wine reduction, creamy mashed potatoes.', icon: '🍗', img: 'images/menu/short-rib.jpg' },
      { id: 'Ragu', name: 'Pappardelle White-Sausage Ragu', desc: 'Fresh pasta topped with a rich white-sausage cream sauce and fried breadcrumbs.', icon: '🍝', img: 'images/menu/pappardelle.jpg' },
      { id: 'Duck', name: 'Fig and Port Duck Breast', desc: 'Pan-seared duck breast with fig and port reduction.', icon: '🍝', img: 'images/menu/duck.jpg' },
    ]},
    { key: 'dessert', title: 'Desserté', items: [
      { id: 'Lemon', name: 'Lemon Brulée', desc: 'Sweet, tangy lemon custard with a crackling caramel top.', icon: '🍫', img: 'images/menu/lemon.jpg' },
      { id: 'Blackberry', name: 'Blackberry Crumble with Custard', desc: 'Tender blackberries baked with a spiced crumble topping and a creamy vanilla custard.', icon: '☕', img: 'images/menu/blackberry.jpg' },
      { id: 'Cake', name: 'Chocolate Cake', desc: 'Rich, gooey chocolate cake with Tillamook Vanilla Bean ice cream.', icon: '🍮', img: 'images/menu/cake.jpg' },
    ]},
  ],
};

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function initInvite() {
  const root = document.getElementById('inviteRoot');
  if (!root || root.dataset.built === '1') return;
  root.dataset.built = '1';
  const I = INVITE;

  root.innerHTML = `
    <div id="invMain">
      <header class="inv-card">
        <p class="inv-small">The pleasure of your company is requested</p>
        <h2 class="inv-script">${esc(I.guest)}</h2>
        <p class="inv-small">at a private dinner prepared by</p>
        <p class="inv-host">${esc(I.host)}</p>
        <div class="inv-rule"><span>✦</span></div>
        <dl class="inv-details">${I.details.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <p class="inv-small">Kindly reply by end of day — choose your menu below</p>
      </header>

      <h3 class="inv-menu-title">Le Menu</h3>
      ${I.courses.map((c, n) => `
        <section class="inv-course">
          <h4><em>${['First','Second','Third'][n]} Course</em> ${c.title}</h4>
          <p class="inv-pick">Select one</p>
          <div class="inv-dishes">${c.items.map((d) => `
            <label class="inv-dish">
              <input type="radio" name="${c.key}" value="${esc(d.id)}">
              <span class="inv-photo"><b>${d.icon}</b><img src="${esc(d.img)}" alt="${esc(d.name)}" loading="lazy"></span>
              <span class="inv-dish-name">${esc(d.name)}</span>
              <span class="inv-dish-desc">${esc(d.desc)}</span>
              <span class="inv-check">✓ Chosen</span>
            </label>`).join('')}
          </div>
        </section>`).join('')}

      <section class="inv-form">
        <h4><em>Final Details</em> Reserve Your Table</h4>
        <label>Name<input id="invName" type="text" value="${esc(I.guest)}"></label>
        <label>Allergies, dislikes, or special requests<textarea id="invNotes" rows="3" placeholder="Anything I should know?"></textarea></label>
        <p class="inv-error" id="invError" role="alert"></p>
        <button type="button" class="inv-btn" id="invSubmit">Reserve My Table</button>
      </section>
    </div>

    <div id="invConfirm" class="inv-card hidden">
      <p class="inv-small">Reservation confirmed</p>
      <h2 class="inv-script">À bientôt</h2>
      <div class="inv-rule"><span>✦</span></div>
      <div id="invSummary" class="inv-summary"></div>
      <p class="inv-small" id="invConfirmNote"></p>
      <button type="button" class="inv-btn inv-btn-ghost" id="invEdit">Change my selections</button>
    </div>

    <p class="inv-footer">Happy Birthday, Zor — I love you, near or far.</p>
    <button type="button" class="inv-btn inv-btn-ghost inv-more" id="invMore">Easter Egg →</button>`;

  root.querySelectorAll('.inv-photo img').forEach((img) => img.addEventListener('error', () => img.remove()));
  root.querySelectorAll('.inv-dish input').forEach((inp) => inp.addEventListener('change', () => {
    root.querySelectorAll(`input[name="${inp.name}"]`).forEach((o) => o.closest('.inv-dish').classList.toggle('selected', o.checked));
    document.getElementById('invError').textContent = '';
  }));
  document.getElementById('invSubmit').addEventListener('click', submitInvite);
  document.getElementById('invMore').addEventListener('click', () => navigateToStep(7));
  document.getElementById('invEdit').addEventListener('click', () => {
    document.getElementById('invConfirm').classList.add('hidden');
    document.getElementById('invMain').classList.remove('hidden');
    window.scrollTo({ top: 0 });
  });
}

async function submitInvite() {
  const I = INVITE, root = document.getElementById('inviteRoot');
  const picks = I.courses.map((c) => {
    const v = root.querySelector(`input[name="${c.key}"]:checked`);
    return { course: c.title, dish: v ? c.items.find((d) => d.id === v.value).name : null };
  });
  const missing = picks.find((p) => !p.dish);
  if (missing) { document.getElementById('invError').textContent = `Please choose a dish for "${missing.course}".`; return; }

  const name = document.getElementById('invName').value.trim() || I.guest;
  const notes = document.getElementById('invNotes').value.trim() || 'None';
  const message = `${name} has reserved a table!\n\n` + picks.map((p) => `${p.course}: ${p.dish}`).join('\n') + `\n\nNotes: ${notes}`;
  const btn = document.getElementById('invSubmit');
  btn.disabled = true; btn.textContent = 'Sending…';

  let sent = false;
  if (I.formEndpoint) {
    try {
      const res = await fetch(I.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ name, message, _subject: `Dinner reservation: ${name}` }) });
      sent = res.ok;
    } catch (e) { /* fall through to email */ }
  }
  const mailto = `mailto:${I.hostEmail}?subject=${encodeURIComponent('Dinner reservation: ' + name)}&body=${encodeURIComponent(message)}`;
  if (!sent) window.location.href = mailto;

  document.getElementById('invSummary').innerHTML = picks.map((p) => `<p><span>${esc(p.course)}</span>${esc(p.dish)}</p>`).join('') + `<p><span>Notes</span>${esc(notes)}</p>`;
  document.getElementById('invConfirmNote').innerHTML = sent
    ? `Your selections have been sent to ${esc(I.host)}. See you ${esc(I.details[0][1])}.`
    : `Your email app should have opened — press send to confirm. <a href="${mailto}">Didn't open? Tap here.</a>`;
  btn.disabled = false; btn.textContent = 'Reserve My Table';
  document.getElementById('invMain').classList.add('hidden');
  document.getElementById('invConfirm').classList.remove('hidden');
  window.scrollTo({ top: 0 });
}

// ═══════════════════════════════════════════════════════════════════════
// EASTER EGG: FAKE CODE EDITOR — shows the real source files
// ═══════════════════════════════════════════════════════════════════════
const CODE_FILES = { 'index.html': 'html', 'scripts.js': 'js', 'styles.css': 'css' };
const CODE_LINE_H = 20;
const CODE_HIGHLIGHTS = [
  { label: 'Spotify login', file: 'scripts.js', find: 'const SPOTIFY_CLIENT_ID', note: 'I used a Spotify API that connects directly to your computer app. You can see all the tracks and my comments below.' },
  { label: 'Keyboard sounds', file: 'scripts.js', find: 'function playTypingClick', note: 'Bro you don\'t understand how long it took me to generate the keyboard typing sound. There\'s a lot of cool Electrical Engineering behind it tho :)' },
  { label: 'Text stats', file: 'scripts.js', find: 'async function loadAndRenderStats', note: 'For the stats page, I exported our entire message history across texts and insta and wrote a script that counts and catagorizes each message. ' },
  { label: 'Crossword engine', file: 'scripts.js', find: 'const XW_GRID', note: 'Here you can see the layout for the crossword. Lowkey didn\'t realize how hard they are to make...' },
  { label: 'Confetti', file: 'scripts.js', find: 'function fireConfettiBurst', note: 'confetti physics!' },
  { label: 'The invitation', file: 'scripts.js', find: 'async function submitInvite', note: 'I\'m pretty proud of this invitation code, your selections are automatically emailed to me using a custom freeform url.' },
  { label: 'Pure CSS pain', file: 'styles.css', find: 'body.invite-page', note: 'Bro idk what Ethan Lee is learning, this graphic design shit is easy.' },
];
const CODE_COMMITS = [
  ['a1f3c9e', 'feat: added steak (it glows)'],
  ['b72d0aa', 'fix: bro why is the confetti everywhere'],
  ['c9e41b7', 'feat: hehehe cool ass crossword'],
  ['d0a85f2', 'fix: spotify said no. spotify said no again.'],
  ['e51c7d3', 'style: made the letter look like gmail '],
  ['f8b2e60', 'feat: ahaha you have a reservation in my heart'],
  ['9c3d1ab', 'chore: grahhhhhhhhh finally done'],
];
let codeBuilt = false, codeTermRun = 0, codeCache = {}, codeCurrent = 'index.html';

function codeHighlight(src, lang) {
  const L = {
    js: { re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\[\s\S]|[^`\\])*`)|\b(const|let|var|function|async|await|return|if|else|for|while|new|class|switch|case|break|default|try|catch|throw|typeof|this|null|true|false)\b|(\b\d+(?:\.\d+)?\b)/g, cls: ['c', 's', 'k', 'n'] },
    css: { re: /(\/\*[\s\S]*?\*\/)|("[^"\n]*"|'[^'\n]*')|(#[0-9a-fA-F]{3,8}\b|\b\d*\.?\d+(?:px|rem|em|vh|vw|%|s|ms|deg)?\b)|([\w-]+)(?=\s*:)/g, cls: ['c', 's', 'n', 'k'] },
    html: { re: /(<!--[\s\S]*?-->)|("[^"\n]*")|(<\/?[\w-]+)/g, cls: ['c', 's', 'k'] },
  }[lang];
  let out = '', last = 0, m;
  L.re.lastIndex = 0;
  while ((m = L.re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const g = m.slice(1).findIndex((x) => x !== undefined);
    out += `<span class="t-${L.cls[g]}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
    if (m[0].length === 0) L.re.lastIndex++;
  }
  return out + esc(src.slice(last));
}

async function codeShow(file, line, note) {
  codeCurrent = file;
  document.querySelectorAll('.cd-tab, .cd-file').forEach((el) => el.classList.toggle('active', el.dataset.file === file));
  const gutter = document.getElementById('cdGutter'), srcEl = document.getElementById('cdSrc'), hl = document.getElementById('cdLineHl'), code = document.getElementById('cdCode');
  if (codeCache[file] === undefined) {
    srcEl.textContent = 'Loading…';
    try {
      const res = await fetch(file + '?v=' + Date.now());
      if (!res.ok) throw new Error(res.status);
      codeCache[file] = (await res.text()).replace(/\r/g, '');
    } catch (e) {
      srcEl.textContent = '// Could not load ' + file + ' — this page needs to be served over http(s).';
      return;
    }
  }
  const text = codeCache[file];
  if (srcEl.dataset.file !== file) {
    srcEl.innerHTML = codeHighlight(text, CODE_FILES[file]);
    srcEl.dataset.file = file;
    gutter.textContent = Array.from({ length: text.split('\n').length }, (_, i) => i + 1).join('\n');
  }
  hl.style.display = 'none';
  if (line) {
    hl.style.top = 10 + (line - 1) * CODE_LINE_H + 'px';
    hl.style.display = 'block';
    code.scrollTo({ top: Math.max(0, (line - 4) * CODE_LINE_H), behavior: 'smooth' });
  } else code.scrollTop = 0;
  if (note) document.getElementById('cdNote').textContent = '💬 ' + note;
}

function codeJump(h) {
  const text = codeCache[h.file];
  const go = (t) => { const idx = t.indexOf(h.find); codeShow(h.file, idx < 0 ? 0 : t.slice(0, idx).split('\n').length, h.note); };
  if (text !== undefined) return go(text);
  codeShow(h.file, 0, h.note).then(() => codeCache[h.file] && go(codeCache[h.file]));
}

async function runCodeTerminal() {
  const term = document.getElementById('cdTerm');
  const run = ++codeTermRun;
  term.textContent = '';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const type = async (s) => { for (const ch of s) { if (run !== codeTermRun) return false; term.textContent += ch; term.scrollTop = term.scrollHeight; await sleep(35); } return true; };
  const print = async (s, ms = 140) => { if (run !== codeTermRun) return false; term.textContent += s + '\n'; term.scrollTop = term.scrollHeight; await sleep(ms); return true; };
  const counts = {};
  for (const f of Object.keys(CODE_FILES)) {
    try { counts[f] = (await (await fetch(f)).text()).split('\n').length; } catch (e) { counts[f] = '?'; }
  }
  const total = Object.values(counts).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  if (!(await type('$ wc -l index.html scripts.js styles.css'))) return;
  await print('', 300);
  for (const f of Object.keys(counts)) await print(String(counts[f]).padStart(6) + ' ' + f, 120);
  await print(String(total).padStart(6) + ' total', 500);
  if (!(await type('$ git log --oneline'))) return;
  await print('', 300);
  for (const [hash, msg] of CODE_COMMITS) if (!(await print(hash + ' ' + msg, 260))) return;
  if (!(await type('$ npm run love'))) return;
  await print('', 600);
  await print('✔ compiled with 0 errors, 1 very large heart');
  await print('Happy Birthday, Zor. ♥ I love you, near or far.');
}

function initCode() {
  if (!codeBuilt) {
    codeBuilt = true;
    const tabs = document.getElementById('cdTabs'), files = document.getElementById('cdFiles'), hls = document.getElementById('cdHighlights');
    Object.keys(CODE_FILES).forEach((f) => {
      const tab = Object.assign(document.createElement('button'), { className: 'cd-tab', textContent: f });
      const item = Object.assign(document.createElement('button'), { className: 'cd-file', textContent: '📄 ' + f });
      tab.dataset.file = item.dataset.file = f;
      tab.addEventListener('click', () => codeShow(f));
      item.addEventListener('click', () => codeShow(f));
      tabs.appendChild(tab); files.appendChild(item);
    });
    CODE_HIGHLIGHTS.forEach((h) => {
      const b = Object.assign(document.createElement('button'), { className: 'cd-hl', textContent: '★ ' + h.label });
      b.addEventListener('click', () => codeJump(h));
      hls.appendChild(b);
    });
    codeShow('index.html');
  }
  runCodeTerminal();
}
