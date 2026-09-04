# Catálogo Cachencho — página para compartir con amigos

## Índice
- [Spec](#spec)
- [Sesión 1 — 2026-08-15](#sesión-1--2026-08-15)
- [Sesión 2 — 2026-08-25](#sesión-2--2026-08-25)
- [Sesión 3 — 2026-08-26](#sesión-3--2026-08-26)
- [Sesión 4 — 2026-09-03](#sesión-4--2026-09-03)

## Spec

**Objetivo**: página estática (Astro) con el catálogo de películas (agrupadas por género) y series disponibles en el Jellyfin del usuario (server "cachencho"), para compartir un link con amigos durante ~3 días.

**Quién la usa**: Lalo + un grupo de amigos, solo lectura (sin cuentas, sin login).

**Restricciones**:
- No exponer la IP/PC del servidor casero. La página no debe pegarle en runtime a Jellyfin ni a ningún servicio corriendo en la LAN del usuario.
- Los datos (JSON de películas/series/sugerencias) se generan una vez de forma local y se dejan **estáticos** — commiteados al repo de GitHub del sitio, no fetched en vivo. Única excepción, agregada en Sesión 3: el conteo de votos de "Sugerencias de Cachencho" es dinámico (Netlify Function + Blobs) — el sitio dejó de ser 100% estático a partir de ahí, ver esa sesión.
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

---

## Sesión 3 — 2026-08-26

### Contexto

Al día siguiente de la Sesión 2, el usuario miró el catálogo con calma y encontró dos problemas de fondo: la agrupación por género (heredada del diseño original) repetía cada ítem una vez por cada género que tenía, haciendo la página larguísima, y las series quedaban mezcladas entre bloques de género en vez de estar todas juntas. Además pidió que el voto de "Sugerencias de Cachencho" (hasta ahora solo local, Sesión 2) pasara a ser un conteo real compartido entre todos los que entran al sitio.

### Reorganización: grilla única + filtro por chip

- Se le presentaron 3 opciones al usuario (grilla+filtro, grilla sin filtro, agrupado sin repetir); eligió grilla única + chips de filtro por género.
- `groupByGenre` (que devolvía cada género con sus items, duplicando ítems multi-género) reemplazada por `uniqueGenres` (solo la lista de géneros para los chips). Películas y series ahora se renderizan en **una sola grilla cada una**, ordenadas alfabéticamente (ya venían así del JSON), con los géneros como texto chico debajo del título en vez de headers de sección.
- Chips de género (`Todos` + cada género, 17 en películas + 8 en series) filtran client-side por `data-genres` en cada tarjeta — sin recargar la página. Misma sección de Sugerencias sigue agrupada por categoría (son solo 9 títulos, no hace falta la grilla ahí).
- **Bug encontrado al probar en local**: las carátulas se veían gigantes (cientos de px de alto) en vez de mantener proporción 2:3. Es el **mismo bug ya documentado en la Sesión 1** con la imagen de invitación — el atributo HTML `height="750"` del `<img>` le gana a `aspect-ratio: 2/3` en CSS si no se pone `height: auto` explícito. Arreglado agregando esa línea. De paso se topó el ancho máximo de columna de la grilla (`minmax(140px, 165px)` en vez de `minmax(140px, 1fr)`) porque con `1fr` las carátulas se estiraban de más cuando una fila no se llenaba del todo.
- Verificado en local (`astro dev`) antes de publicar: 95 tarjetas en total (74+21, cada una una sola vez), chip "Terror" filtrando correctamente, carátulas ya con proporción correcta.

### Voto compartido: Netlify Function + Blobs

- El usuario preguntó si se podía guardar el voto "por GitHub" para no exponer nada. Se le explicó por qué esa no es la ruta correcta acá (cada voto sería un commit al repo → dispara un rebuild de Netlify por click, gasta créditos y ensucia el historial) y se propuso la alternativa real: **Netlify Function + Netlify Blobs**, sin exponer ninguna credencial al navegador (el acceso a Blobs lo inyecta Netlify automáticamente del lado del servidor).
- `netlify/functions/votes.mts`: función server-side (Netlify Functions v2, formato `Request`/`Response`), expone `GET /api/votes` (devuelve el objeto de conteos) y `POST /api/votes` con `{id, delta}` (`delta` ±1) para sumar/restar, validando el `id` contra la lista fija de las 9 sugerencias. Guarda todo en un único blob JSON (`votes` store, key `counts`).
- Dependencia nueva: `@netlify/blobs` (`^10.7.13` — la versión que ya traía `astro`/`unstorage` como dependencia transitiva; la última (`11.x`) pide Node ≥22.19 y el server sigue en Node 20.19.2, mismo techo de siempre en este proyecto).
- Front-end (`index.astro`): el `localStorage` (`cachencho-votados`) pasó a guardar **solo si esta persona ya votó** (para no dejarla votar dos veces desde el mismo navegador) — el número que se muestra siempre viene de `GET /api/votes` al cargar, y cada click hace `POST` con el delta y actualiza con el conteo real que devuelve el servidor (optimista mientras espera la respuesta).
- **Probado local con `netlify dev`** (no `astro dev` — ese no simula Functions): ojo, `netlify dev --port 4321` choca porque Astro ya usa ese puerto internamente; corrió bien sin forzar `--port` (Netlify eligió 8888, Astro atrás en 4321). Confirmado end-to-end: votar sube el conteo, `curl http://localhost:8888/api/votes` lo confirma independiente del navegador, reload persiste, des-votar vuelve a 0.
- Deploy a producción: `netlify deploy --prod --dir=dist` empaqueta la función automáticamente desde `netlify/functions/` (no hace falta nada especial, se ve "Functions bundling" en el log). Confirmado en `catalogo-cachencho.netlify.app`: `/api/votes` responde `{}` (store real de producción, separado del sandbox local) — no se votó nada a propósito para no ensuciar el conteo real de los amigos.
- Efecto colateral en la spec del proyecto: el sitio **dejó de ser 100% estático** a partir de acá (ver nota en Restricciones). Sigue sin exponer nada de la LAN del usuario ni tocar Jellyfin/Seerr en runtime — el único componente dinámico es el conteo de votos, autocontenido en Netlify.

### Estado al cierre ✅ SESIÓN 3 COMPLETA — catálogo reorganizado en grilla única + filtro por chip (sin repetir ítems, series y películas cada una junta), bug de carátulas gigantes encontrado y arreglado antes de publicar, y voto de sugerencias pasado de local-only a conteo real compartido vía Netlify Function + Blobs sin exponer ninguna credencial. Todo verificado en local antes de cada deploy y confirmado en producción después.

---

## Sesión 4 — 2026-09-03

### Contexto

8 días después de la Sesión 3. Pedido del usuario: actualizar el catálogo con lo nuevo en Jellyfin, sumar sugerencias nuevas de películas para bajar, y chequear la cuota de Netlify antes de publicar (por la misma preocupación de la Sesión 1 sobre límites del free tier).

### Cuota de Netlify y token

- Chequeada en `app.netlify.com/teams/soloappmotorola/billing/general` (entrando por navegador, logueado como la cuenta dueña real — el CLI local seguía logueado como `NodoPropio Servidores`, la cuenta equivocada, mismo patrón de la Sesión 2): **224.8/300 créditos disponibles**, ciclo Aug 13–Sep 12, 5 deploys de producción = 75 créditos consumidos. Sin riesgo para lo que resta del ciclo.
- Los dos personal access tokens anteriores (Sesión 1 y Sesión 2) estaban **ambos vencidos** (22/ago y 1/sep respectivamente, confirmado en `app.netlify.com/user/applications`). Se generó uno nuevo (`catalogo-cachencho CLI deploy (sesión 4)`, 7 días — vence el **2026-09-10**), usado vía `NETLIFY_AUTH_TOKEN` en el entorno para `netlify dev` y `netlify deploy --prod --site=<siteId>`, sin guardarlo en ningún archivo del repo.

### Catálogo actualizado

- `npm run export-data`: 79 películas (74→79), 23 series (21→23) — la librería de Jellyfin siguió creciendo. Sin incidentes, Seerr resolviendo carátulas al 100% (el 403 de la Sesión 2 no volvió a aparecer).

### Sugerencias: de dónde salieron y por qué no las inventé yo

- Primer intento: se armaron 8 sugerencias nuevas a criterio propio (Kurosawa fuera del samurái, Nouvelle vague, found footage/horror analógico) — **descartadas** cuando el usuario avisó que ya había una lista curada esperando en `~/Documentos/mediaserver/pendientes-revisar.md` (sección "Rarezas destacadas" al final del archivo), armada en una sesión previa de ese otro proyecto y pensada explícitamente para encajar en las categorías ya existentes de "Sugerencias de Cachencho".
- **Lección para la próxima**: antes de curar contenido nuevo para las sugerencias a criterio propio, revisar primero si hay algo ya preparado en `mediaserver/pendientes-revisar.md` — es la fuente que el usuario arma de antemano para esto.
- Se tomaron 12 títulos de esa lista (de las secciones que coinciden con las 4 categorías existentes — se dejaron afuera "Otras rarezas de autor mayor", "Imprescindibles fuera del perfil" y "Lo más marginal" por no tener categoría propia en el sitio, y se excluyó **Kill List**, que ya está en el catálogo real): La vida de los otros, 13 Minutes y Sorcerer (Thriller político paranoico); El hombre de Londres, Adieu l'ami y The Comfort of Strangers (Noir de precisión); Berberian Sound Studio, Two Evil Eyes y Phenomena (Giallo); El espinazo del diablo, The Dybbuk (1937) y The Reflecting Skin (Horror elevado / folk).
- Metadata resuelta vía Seerr (`/api/v1/search` + `/api/v1/movie/{tmdbId}`), sin necesitar Radarr esta vez. `netlify/functions/votes.mts` actualizado con los 12 ids nuevos en `VALID_IDS` (si no, el voto en las tarjetas nuevas hubiera devuelto 400). Sugerencias totales: 9→21.
- Un error propio detectado y corregido antes de publicar: la descripción de "Two Evil Eyes" decía que "Zombie" (de Romero) ya estaba en el catálogo — falso, se verificó contra `movies.json` y no hay ningún título de Romero. Corregida antes del commit.

### Verificación y deploy

- Probado local con `netlify dev` (necesario para la función de votos, no alcanza `astro dev`): las 21 carátulas de sugerencias responden 200, `POST /api/votes` sube y baja el conteo correctamente, la grilla de películas muestra "Películas (79)". Revisado visualmente en navegador antes de tocar producción.
- Confirmación explícita del usuario antes de deployar (commit+push a GitHub y `netlify deploy --prod`). Deploy confirmado en `catalogo-cachencho.netlify.app`: `/data/suggestions.json` devuelve 21 ítems, `/data/movies.json` devuelve 79, y `/api/votes` en producción ya tenía un voto real de un amigo en "Le Cercle Rouge" (sin tocar, es dato real).

### Pendiente (decisión del usuario)
- El token nuevo vence el 2026-09-10 — mismo procedimiento que las veces anteriores: generar uno nuevo desde `app.netlify.com/user/applications` con la cuenta `soloappmotorola` si hace falta deployar después de esa fecha.
- La página ya lleva más de dos semanas viva contra la spec original de ~3 días — sigue sin resolverse si tiene fecha de baja real (mismo pendiente abierto desde la Sesión 2).

### Estado al cierre ✅ SESIÓN 4 COMPLETA — catálogo actualizado (79 películas / 23 series), 12 sugerencias nuevas sumadas desde la lista curada de `mediaserver/pendientes-revisar.md` (no inventadas desde cero), cuota de Netlify chequeada (224.8/300 créditos, sin riesgo), token vencido renovado, todo verificado en local antes del deploy y confirmado en producción.
