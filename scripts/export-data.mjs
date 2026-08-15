// Genera public/data/{movies,series}.json a partir del Jellyfin local + Seerr local.
// Se corre a mano (npm run export-data) ANTES de buildear/deployar — el sitio publicado
// nunca pega contra Jellyfin ni Seerr en runtime, solo lee estos JSON estáticos.

import { writeFile, mkdir } from 'node:fs/promises';

const JELLYFIN_URL = process.env.JELLYFIN_URL ?? 'http://localhost:8096';
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY;
const JELLYFIN_MOVIES_LIBRARY_ID = process.env.JELLYFIN_MOVIES_LIBRARY_ID;
const JELLYFIN_SERIES_LIBRARY_ID = process.env.JELLYFIN_SERIES_LIBRARY_ID;

const SEERR_URL = process.env.SEERR_URL ?? 'http://localhost:5055';
const SEERR_API_KEY = process.env.SEERR_API_KEY;

if (!JELLYFIN_API_KEY || !SEERR_API_KEY || !JELLYFIN_MOVIES_LIBRARY_ID || !JELLYFIN_SERIES_LIBRARY_ID) {
  console.error(
    'Faltan variables de entorno. Copiá .env.example a .env y completá JELLYFIN_API_KEY, ' +
      'SEERR_API_KEY, JELLYFIN_MOVIES_LIBRARY_ID y JELLYFIN_SERIES_LIBRARY_ID.'
  );
  process.exit(1);
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

async function fetchJellyfinItems(libraryId, itemType) {
  const url = new URL(`${JELLYFIN_URL}/Items`);
  url.searchParams.set('ParentId', libraryId);
  url.searchParams.set('Recursive', 'true');
  url.searchParams.set('IncludeItemTypes', itemType);
  url.searchParams.set('Fields', 'Genres,ProviderIds,ProductionYear,Overview');
  url.searchParams.set('api_key', JELLYFIN_API_KEY);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Jellyfin ${itemType} fetch falló: ${res.status}`);
  const data = await res.json();
  return data.Items;
}

const posterCache = new Map();

async function fetchPosterPath(tmdbId, mediaType) {
  const cacheKey = `${mediaType}:${tmdbId}`;
  if (posterCache.has(cacheKey)) return posterCache.get(cacheKey);

  const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
  const res = await fetch(`${SEERR_URL}/api/v1/${endpoint}/${tmdbId}`, {
    headers: { 'X-Api-Key': SEERR_API_KEY },
  });
  if (!res.ok) {
    posterCache.set(cacheKey, null);
    return null;
  }
  const data = await res.json();
  const posterUrl = data.posterPath ? `${TMDB_IMAGE_BASE}${data.posterPath}` : null;
  posterCache.set(cacheKey, posterUrl);
  return posterUrl;
}

async function buildEntries(items, mediaType) {
  const entries = [];
  for (const item of items) {
    const tmdbId = item.ProviderIds?.Tmdb;
    const posterUrl = tmdbId ? await fetchPosterPath(tmdbId, mediaType) : null;
    entries.push({
      title: item.Name,
      year: item.ProductionYear ?? null,
      genres: item.Genres ?? [],
      posterUrl,
    });
  }
  return entries.sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

async function main() {
  console.log('Bajando películas de Jellyfin...');
  const movieItems = await fetchJellyfinItems(JELLYFIN_MOVIES_LIBRARY_ID, 'Movie');
  console.log(`  ${movieItems.length} películas encontradas, resolviendo carátulas...`);
  const movies = await buildEntries(movieItems, 'movie');

  console.log('Bajando series de Jellyfin...');
  const seriesItems = await fetchJellyfinItems(JELLYFIN_SERIES_LIBRARY_ID, 'Series');
  console.log(`  ${seriesItems.length} series encontradas, resolviendo carátulas...`);
  const series = await buildEntries(seriesItems, 'tv');

  await mkdir('public/data', { recursive: true });
  await writeFile('public/data/movies.json', JSON.stringify(movies, null, 2));
  await writeFile('public/data/series.json', JSON.stringify(series, null, 2));

  console.log(`Listo: ${movies.length} películas, ${series.length} series.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
