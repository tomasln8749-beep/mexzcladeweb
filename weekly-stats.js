const LASTFM_USER = "Tomkrar874";
const LASTFM_API_KEY = "27093a8f646a5cb5eee222957c70e33c";

const LASTFM_ENDPOINT = 'https://ws.audioscrobbler.com/2.0/';
const LIST_PERIOD = '7day';
const LIST_LIMIT = 3;

function getElement(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

async function fetchLastfm(method, params = {}) {
  const query = new URLSearchParams({
    method,
    user: LASTFM_USER,
    api_key: LASTFM_API_KEY,
    format: 'json',
    ...params
  });
  const response = await fetch(`${LASTFM_ENDPOINT}?${query.toString()}`);
  if (!response.ok) throw new Error(`Last.fm respondió ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.message || 'Error de Last.fm');
  return data;
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function bestImage(images) {
  if (!Array.isArray(images)) return '';
  for (const size of ['mega', 'extralarge', 'large', 'medium', 'small']) {
    const match = images.find((image) => image.size === size && image['#text']);
    if (match) return match['#text'];
  }
  const fallback = images.filter((image) => image['#text']).pop();
  return fallback ? fallback['#text'] : '';
}

function formatPlays(count) {
  const number = Number(count);
  if (!Number.isFinite(number)) return '';
  return `${number.toLocaleString('es-AR')} ${number === 1 ? 'play' : 'plays'}`;
}

function formatScrobbleDate(uts) {
  const timestamp = Number(uts);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(timestamp * 1000));
}

function setFallback(containerId, message) {
  const container = getElement(containerId);
  if (container) container.innerHTML = `<li class="weekly-empty">${escapeHtml(message)}</li>`;
}

function renderNowPlaying(track) {
  const container = getElement('weeklyNowPlaying');
  if (!container) return;

  if (!track) {
    container.innerHTML = '<p class="weekly-empty">Sin reproducciones recientes.</p>';
    return;
  }

  const isLive = track['@attr'] && track['@attr'].nowplaying === 'true';
  const artist = typeof track.artist === 'object' ? track.artist['#text'] : track.artist;
  const title = track.name || 'Tema desconocido';
  const url = track.url || '#';
  const cover = bestImage(track.image);
  const playedAt = isLive ? '' : formatScrobbleDate(track.date && track.date.uts);
  const badge = isLive
    ? '<span class="weekly-now-badge is-live">Sonando ahora</span>'
    : '<span class="weekly-now-badge">Última reproducida</span>';
  const meta = [playedAt ? `<span>${escapeHtml(playedAt)}</span>` : '', `<span>${escapeHtml(artist || '')}</span>`].filter(Boolean).join('');

  container.innerHTML = `
    <a class="weekly-now-card" href="${escapeHtml(url)}" target="_blank" rel="noopener">
      ${cover ? `<img src="${escapeHtml(cover)}" alt="Portada de ${escapeHtml(title)}" loading="lazy">` : ''}
      <span class="weekly-now-main">
        ${badge}
        <strong class="weekly-now-title">${escapeHtml(title)}</strong>
        <span class="weekly-now-sub">${meta}</span>
      </span>
      <i class="fa-solid fa-arrow-up-right-from-square weekly-now-icon" aria-hidden="true"></i>
    </a>`;
}

function renderRankedList(containerId, items, buildItem) {
  const container = getElement(containerId);
  if (!container) return;

  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<li class="weekly-empty">Sin datos esta semana.</li>';
    return;
  }

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = buildItem(item, index + 1);
    container.appendChild(li);
  });
}

function placeholderIconHtml(iconClass) {
  return `<i class="fa-solid ${iconClass}"></i>`;
}

window.weeklyThumbError = function (img) {
  const fallback = img.dataset.fallback;
  if (fallback && img.dataset.fallbackUsed !== '1') {
    img.dataset.fallbackUsed = '1';
    img.src = fallback;
    return;
  }
  const iconClass = img.dataset.icon || 'fa-user';
  const placeholder = document.createElement('span');
  placeholder.className = 'weekly-thumb weekly-thumb-empty';
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.innerHTML = placeholderIconHtml(iconClass);
  img.replaceWith(placeholder);
};

function thumbHtml(cover, alt = '', iconClass = 'fa-user', fallbackSrc = '') {
  if (cover) {
    return `<img class="weekly-thumb" src="${escapeHtml(cover)}" alt="${escapeHtml(alt)}" loading="lazy" data-icon="${iconClass}" data-fallback="${escapeHtml(fallbackSrc)}" onerror="weeklyThumbError(this)">`;
  }
  return `<span class="weekly-thumb weekly-thumb-empty" aria-hidden="true">${placeholderIconHtml(iconClass)}</span>`;
}


function artistItemHtml(artist, rank) {
  const name = artist.name || 'Artista desconocido';
  const url = artist.url || '#';
  const cover = bestImage(artist.image);
  return `
    <span class="weekly-rank">${rank}</span>
    ${thumbHtml(cover, '', 'fa-user')}
    <span class="weekly-item-main">
      <a class="weekly-item-title" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(name)}</a>
    </span>
    <span class="weekly-count">${escapeHtml(formatPlays(artist.playcount))}</span>`;
}

async function enrichArtistImages(artists) {
  return Promise.all(artists.map(async (artist) => {
    if (!artist.name) return artist;
    try {
      const info = await fetchLastfm('artist.getinfo', { artist: artist.name });
      const remote = info?.artist;
      if (remote && remote.image) artist.image = remote.image;
      if (!artist.url && remote && remote.url) artist.url = remote.url;
    } catch (error) {
      console.warn(`No se pudo obtener imagen de ${artist.name}:`, error);
    }
    return artist;
  }));
}

async function loadWeeklyStats() {
  try {
    const [recent, topArtists] = await Promise.all([
      fetchLastfm('user.getrecenttracks', { limit: 1 }),
      fetchLastfm('user.gettopartists', { period: LIST_PERIOD, limit: LIST_LIMIT })
    ]);

    const recentTrack = asArray(recent?.recenttracks?.track)[0] || null;
    renderNowPlaying(recentTrack);

    const artists = await enrichArtistImages(asArray(topArtists?.topartists?.artist).slice(0, LIST_LIMIT));
    renderRankedList('weeklyTopArtists', artists, artistItemHtml);
  } catch (error) {
    console.error('Error cargando estadísticas de Last.fm:', error);
    const nowPlaying = getElement('weeklyNowPlaying');
    if (nowPlaying) nowPlaying.innerHTML = '<p class="weekly-empty">No se pudieron cargar las estadísticas.</p>';
    setFallback('weeklyTopArtists', 'No se pudieron cargar los artistas.');
  }
}

document.addEventListener('DOMContentLoaded', loadWeeklyStats);
