document.addEventListener('DOMContentLoaded', async () => {
  const feed = document.getElementById('publicEntries');
  const musicFeed = document.getElementById('musicRecommendations');
  if (!feed && !musicFeed) return;

  const targets = [feed, musicFeed].filter(Boolean);
  targets.forEach((target) => { target.textContent = 'Cargando publicaciones...'; });

  const formatDate = (value) => new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium'
  }).format(new Date(value));

  const renderPost = (post) => {
    const card = document.createElement('article');
    card.className = `public-entry public-entry-${post.tipo}`;

    const title = document.createElement('h2');
    title.textContent = post.titulo || 'Sin título';
    card.appendChild(title);

    const date = document.createElement('time');
    date.dateTime = post.created_at;
    date.textContent = formatDate(post.created_at);
    card.appendChild(date);

    if (post.imagen_url) {
      const image = document.createElement('img');
      image.src = post.imagen_url;
      image.alt = post.titulo || 'Imagen de la publicación';
      image.loading = 'lazy';
      card.appendChild(image);
    }

    if (post.contenido) {
      const body = document.createElement('p');
      body.textContent = post.contenido;
      card.appendChild(body);
    }

    return card;
  };

  const renderTarget = (target, targetEntries) => {
    target.replaceChildren();
    if (!targetEntries.length) {
      target.textContent = 'Todavía no hay publicaciones.';
      return;
    }
    targetEntries.forEach((post) => target.appendChild(renderPost(post)));
  };

  async function loadPosts() {
    const { data: posts, error } = await supabaseClient
      .from('posts')
      .select('id, tipo, titulo, contenido, imagen_url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      targets.forEach((target) => { target.textContent = 'No se pudieron cargar las publicaciones.'; });
      return;
    }

    renderTarget(feed, musicFeed ? posts.filter((post) => ['post', 'foto', 'letterboxd'].includes(post.tipo)) : posts);
    renderTarget(musicFeed, posts.filter((post) => post.tipo === 'musica'));
  }

  await loadPosts();

  supabaseClient
    .channel('public-post-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, loadPosts)
    .subscribe();
});
