# Catálogo Cachencho — página para compartir con amigos

## Índice
- [Spec](#spec)
- [Sesión 1 — 2026-08-15](#sesión-1--2026-08-15)

## Spec

**Objetivo**: página estática (Astro) con el catálogo de películas (agrupadas por género) y series disponibles en el Jellyfin del usuario (server "cachencho"), para compartir un link con amigos durante ~3 días.

**Quién la usa**: Lalo + un grupo de amigos, solo lectura (sin cuentas, sin login).

**Restricciones**:
- No exponer la IP/PC del servidor casero. La página no debe pegarle en runtime a Jellyfin ni a ningún servicio corriendo en la LAN del usuario.
- Los datos (JSON de películas/series) se generan una vez de forma local y se dejan **estáticos** — commiteados al repo de GitHub del sitio, no fetched en vivo.
- Carátulas: se usan URLs del CDN público de TMDB (`image.tmdb.org`), no imágenes servidas por Jellyfin. El `tmdbId` de cada ítem sale de la metadata de Jellyfin; el `posterPath` se resuelve contra la API de Seerr local (que ya proxea TMDB) al momento de generar el JSON, no en runtime del sitio.
- Link **no listado**: `robots.txt` bloqueando indexación, sin sitemap. No público en el sentido de buscable.
- Deploy: probar local con Astro dev server primero. Netlify para servirlo de verdad — pendiente de confirmación explícita del usuario antes de crear el repo remoto en GitHub y antes de conectar/desplegar en Netlify (acciones visibles hacia afuera).

**No-goals**:
- Sin reproducción/streaming de contenido — es un catálogo, no un cliente de Jellyfin.
- Sin pedidos ni integración con Seerr/Radarr/Sonarr desde el sitio público.
- Sin exponer URLs, puertos, ni IP del servidor casero en ningún archivo del repo del sitio.
- No pensado como algo permanente — vida útil de la página es de días, no un producto a mantener.

## Sesión 1 — 2026-08-15

Arranque del proyecto (Día 0) y primera versión funcional.

- **Astro scaffoldeado a mano**: `create-astro` (el wizard oficial) exige Node ≥22.12 y el server corre Node 20.19.2 — no upgradeable sin evaluarlo aparte. Se armó el proyecto a mano (`package.json`, `astro.config.mjs`, `tsconfig.json`) pineando `astro@5.18.2`, la última versión de la rama 5.x compatible con Node `^20.3.0` (Astro 6/7 ya piden Node 22). Confirmado que corre: `npx astro build` y `npx astro dev` ambos OK.
- **Export de datos** (`scripts/export-data.mjs`, `npm run export-data`): pega contra Jellyfin local (`/Items` por librería, trae `Genres` + `ProviderIds.Tmdb`) y contra Seerr local (`/api/v1/movie/{tmdbId}` y `/api/v1/tv/{tmdbId}`, que ya proxea TMDB) para resolver el `posterPath` de cada título sin necesitar una API key de TMDB propia. Las URLs de carátula final apuntan directo a `image.tmdb.org` (CDN público) — el sitio publicado nunca pega contra Jellyfin ni Seerr en runtime, solo lee los JSON generados. Credenciales en `.env` (gitignoreado), `.env.example` como plantilla sin valores. Corrida de prueba: 74 películas / 20 series, carátula resuelta en el 100% de los casos.
- **Página** (`src/pages/index.astro`): agrupa por género (un ítem puede aparecer en más de un género si tiene varios), scroll horizontal por sección, dark theme. `robots.txt` con `Disallow: /` + meta `noindex,nofollow` en el head — no listado, según lo pedido.
- Duplicados reales detectados y resueltos: "El acorazado Potemkin" y "La leyenda de Aang: El último Airbender" tenían dos carpetas distintas en `/mnt/media/data/media/movies/` cada uno (mismo tmdbId, releases distintas). Verificado antes de tocar nada: sin hardlink a `torrents/` (sin riesgo de romper seeding) y Radarr solo gestiona una de las dos copias en cada caso (la de mejor calidad — Kino BluRay x265 para Potemkin, WEB-DL Atmos "FLU" para Aang). Se borraron las carpetas huérfanas no gestionadas por Radarr (YTS.AM de Potemkin, 1.24GB; "LEAK" WEBRip de Aang, 3.4GB — ~4.6GB liberados) y se re-escaneó Jellyfin (`POST /Library/Refresh`). Confirmado post-scan: 72 películas, cero duplicados. JSON re-generado.
- Probado en el dev server local (`npm run dev`, puerto 4321) vía navegador — carga bien, carátulas y agrupación por género funcionando en ambas secciones (Películas/Series).

### Pendiente (decisión del usuario)
- Crear el repo en GitHub y hacer el primer push — no hecho todavía, requiere confirmación explícita antes de una acción visible hacia afuera.
- Conectar y deployar en Netlify — ídem, pendiente de confirmación.
- Decidir cuándo bajar la página pasados los ~3 días de vida útil pensados.
