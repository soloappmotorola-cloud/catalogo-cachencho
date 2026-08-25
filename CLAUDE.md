# Catálogo Cachencho — página para compartir con amigos

## Índice
- [Spec](#spec)
- [Sesión 1 — 2026-08-15](#sesión-1--2026-08-15)
- [Sesión 2 — 2026-08-25](#sesión-2--2026-08-25)

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

- **Netlify revisado antes de deployar** (a pedido del usuario, por el miedo a que el sitio "se caiga" por límites): confirmado en la doc oficial de Netlify que el plan Free es de 300 créditos/mes con **límite duro, sin auto-recharge** — al agotarse, los sitios quedan pausados ("Site not available"), sin cobro sorpresa. Cálculo para este proyecto: build pesa 88KB (`dist/index.html`, todo inline, sin JS) porque las carátulas nunca pasan por Netlify — bandwidth cuesta 20 créditos/GB, o sea ~12.000 cargas de página por GB. Con ~250 créditos libres después de deploys, alcanza para >100.000 cargas — total no-riesgo para compartir con un puñado de amigos 3 días.
- **Repo en GitHub creado y pusheado**: `github.com/soloappmotorola-cloud/catalogo-cachencho`, público (decisión del usuario). Se agregó la clave pública `~/.ssh/id_ed25519` (ya existía local, sin usar) a la cuenta `soloappmotorola-cloud` vía GitHub (Settings → SSH and GPG keys) para poder pushear por SSH sin manejar tokens. Primer commit y push hechos — `.env` correctamente afuera (gitignoreado), solo quedó adentro `.env.example` sin valores.
- **Pasada de revisión antes de publicar** (a pedido del usuario, "vamos muy apurado"): se encontraron y corrigieron tres cosas reales antes del deploy — géneros de series sin traducir (TMDB TV devuelve "Action & Adventure"/"Sci-Fi & Fantasy"/"War & Politics" en inglés aunque Jellyfin ya trae los géneros de película en español; se agregó diccionario de traducción en `export-data.mjs`), el nav sin `flex-wrap` con el link nuevo (podía desbordar en celular angosto), y una imagen estirada (el atributo HTML `height="850"` le ganaba al `aspect-ratio` en CSS porque nunca se puso `height: auto` — el box quedaba 220px de ancho x 850 de alto).
- **Sección "No se olviden"** agregada a pedido del usuario: invitación a la presentación de un libro de un amigo del grupo (Ignacio González Lowy, "Los distintos", Paraná Lee), imagen en `public/img/invitacion.jpeg`, sección propia con link en el nav.

## Sesión 2 — 2026-08-25

### Contexto

10 días después de la Sesión 1. El sitio seguía vivo y publicado (`catalogo-cachencho.netlify.app`), pese a que la spec original lo pensaba para ~3 días de vida útil. Pedido del usuario: completar el catálogo con lo que faltara, sacar la sección de invitación al libro (ya cumplió su fecha) y agregar una sección de sugerencias de películas para votar.

### Catálogo actualizado y sección de sugerencias

- `npm run export-data` corrido de nuevo: 72→74 películas, 20→21 series (la biblioteca de Jellyfin creció desde la Sesión 1).
- Sección "No se olviden" (invitación al libro de Ignacio) eliminada — nav, sección HTML e imagen `public/img/invitacion.jpeg` borrados.
- Nueva sección **"Sugerencias de Cachencho"**: 9 títulos fuera de la biblioteca actual, agrupados en 4 categorías (thriller político paranoico, noir de precisión, giallo, horror elevado/folk), cada uno con póster, director y descripción corta. Data en `public/data/suggestions.json` (mismo patrón que `movies.json`/`series.json`, estático, no runtime).
  - **Metadata resuelta vía Radarr** (`/api/v3/movie/lookup`), no Seerr — el endpoint `/api/v1/movie/{tmdbId}` de Seerr empezó a devolver 403 "You do not have permission to access this endpoint" para cualquier tmdbId (incluso los que habían funcionado minutos antes para el export de movies.json), mientras `/api/v1/status` seguía respondiendo 200 con la misma key. No se investigó la causa raíz — quedó pendiente. Radarr lookup fue el workaround, ya usado en session 2 del mediaserver para el chequeo de KATSEYE.
- **Voto 👌 por sugerencia**: local únicamente (`localStorage`, clave `cachencho-votos`), sin backend compartido — decisión explícita del usuario al preguntarle, porque el sitio es estático en Netlify sin backend y no valía la pena meter Supabase para esto. Cada visitante vota solo para sí mismo; no hay conteo agregado entre amigos.
- Probado en local (`npx astro build` + `npx astro dev` puerto 4321, navegador) antes de tocar Netlify — carátulas cargando (200 en los 9 posters de TMDB), voto persistiendo tras reload, sección de invitación confirmada ausente.

### Incidente de deploy: token de Netlify vencido, casi se crea un sitio duplicado

- Al ir a deployar, `netlify deploy --prod` tiraba `JSONHTTPError: Not Found` y `netlify sites:list` no mostraba el proyecto `catalogo-cachencho` en absoluto. Diagnóstico apresurado (equivocado): se asumió que el sitio se había dado de baja solo, coincidiendo con que ya habían pasado los ~3 días de vida útil planeados.
- **Antes de actuar sobre esa asunción se creó por error un sitio nuevo** (`catalogo-cachencho-caf021f1.netlify.app`) bajo una cuenta de Netlify distinta (`NodoPropio Servidores`, la que tenía el CLI logueado localmente en esa sesión) — el usuario cortó esto a tiempo ("estás improvisando, entra a Netlify en el navegador").
- **Causa real, encontrada entrando a `app.netlify.com` con el navegador** (logueado como `soloappmotorola`, la cuenta dueña real del proyecto — misma cuenta que el repo de GitHub): el sitio **nunca se cayó**, seguía publicado y sirviendo 200 OK todo el tiempo. Lo que pasó fue que el **personal access token `catalogo-cachencho CLI deploy` (creado en la Sesión 1) expiró el 22 de agosto** — el CLI perdió acceso a esa cuenta y silenciosamente cayó a otra sesión logueada en la máquina, sin avisar de ningún error de autenticación real (el mensaje "Not Found" no lo dejaba ver).
- **Arreglo real**: token nuevo generado desde el navegador (`app.netlify.com/user/applications`, 7 días de expiración — mismo criterio que el original), usado como `NETLIFY_AUTH_TOKEN` para un `netlify deploy --prod` puntual apuntando al `siteId` real (`a7760ed3-8a57-408d-9207-dd4ef7ec6310`). Deploy confirmado en vivo en la URL original, `catalogo-cachencho.netlify.app` — el link que ya tenían los amigos sigue siendo el mismo, no cambió nada para ellos.
- El sitio de más creado por el error (`catalogo-cachencho-caf021f1`) fue borrado a pedido del usuario (`netlify sites:delete`).
- **Lección para la próxima**: si `netlify deploy`/`sites:list` no encuentra el proyecto, chequear primero `app.netlify.com` en el navegador (qué cuenta está logueada ahí, si el token vigente venció) antes de asumir que el sitio se cayó o de crear uno nuevo. Un `JSONHTTPError: Not Found` del CLI de Netlify puede ser simplemente "estás autenticado como la cuenta equivocada", no "el recurso no existe".

### Pendiente (decisión del usuario)
- El token de Netlify nuevo vence el 2026-09-01 (7 días) — para el próximo deploy después de esa fecha, generar uno nuevo desde `app.netlify.com/user/applications` con la cuenta `soloappmotorola`.
- Seguir sin resolver: por qué `/api/v1/movie/{tmdbId}` de Seerr empezó a devolver 403 para tmdbIds arbitrarios. No bloqueó nada (se usó Radarr de workaround) pero si se necesita de nuevo el proxy de Seerr a TMDB, hay que investigarlo.
- Decidir si la página sigue viva indefinidamente o se le pone una fecha real de baja — la spec original la pensaba para ~3 días y ya lleva 10.
