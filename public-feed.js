document.addEventListener('DOMContentLoaded', async () => {
  const feed = document.getElementById('publicEntries');
  const musicFeed = document.getElementById('musicRecommendations');
  if (!feed && !musicFeed) return;

  const targets = [feed, musicFeed].filter(Boolean);
  targets.forEach((target) => { target.textContent = 'Cargando publicaciones...'; });

  const publicImageUrl = (path) => path
    ? supabaseClient.storage.from('media').getPublicUrl(path).data.publicUrl
    : null;

  const formatDate = (value) => new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium'
  }).format(new Date(value));

  const renderEntry = (entry) => {
    const card = document.createElement('article');
    card.className = `public-entry public-entry-${entry.kind}`;

    const title = document.createElement('h2');
    title.textContent = entry.title;
    card.appendChild(title);

    const date = document.createElement('time');
    date.dateTime = entry.created_at;
    date.textContent = formatDate(entry.created_at);
    card.appendChild(date);

    const imageSource = entry.image_url || publicImageUrl(entry.image_path);
    if (imageSource) {
      const image = document.createElement('img');
      image.src = imageSource;
      image.alt = entry.title;
      image.loading = 'lazy';
      card.appendChild(image);
    }

    if (entry.body) {
      const body = document.createElement('p');
      body.textContent = entry.body;
      card.appendChild(body);
    }

    if (entry.rating !== null) {
      const rating = document.createElement('p');
      rating.className = 'entry-rating';
      rating.textContent = `Puntuación: ${entry.rating}/5`;
      card.appendChild(rating);
    }

    if (entry.external_url) {
      const link = document.createElement('a');
      link.href = entry.external_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = entry.kind === 'musica' ? 'Escuchar / abrir enlace' : 'Abrir enlace';
      card.appendChild(link);
    }

    return card;
  };

  const renderTarget = (target, targetEntries) => {
    target.replaceChildren();
    if (!targetEntries.length) {
      target.textContent = 'Todavía no hay publicaciones.';
      return;
    }
    targetEntries.forEach((entry) => target.appendChild(renderEntry(entry)));
  };

  async function loadEntries() {
    const { data: entries, error } = await supabaseClient
      .from('entries')
      .select('id, kind, title, body, image_path, image_url, external_url, rating, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      targets.forEach((target) => { target.textContent = 'No se pudieron cargar las publicaciones.'; });
      return;
    }

    renderTarget(feed, entries.filter((entry) => ['post', 'foto', 'letterboxd'].includes(entry.kind)));
    renderTarget(musicFeed, entries.filter((entry) => entry.kind === 'musica'));
  }

  await loadEntries();

  supabaseClient
    .channel('public-entries-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, loadEntries)
    .subscribe();
});
