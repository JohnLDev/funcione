# PWA Installability Design

## Objective

Make Funcione installable as a Progressive Web App using the generated Funcione MileX app icons, while keeping athlete data and authenticated API responses out of browser caches.

## Decisions

- Use `vite-plugin-pwa` in the frontend Vite build.
- Keep the web app manifest as `apps/frontend/public/manifest.webmanifest`, referenced explicitly in `index.html`.
- Use the generated shield/MX icons as installation assets.
- Keep PWA behavior focused on app shell installability and static asset caching.
- Do not add offline-first data behavior for profile, terms, privacy, or training plans in this phase.
- Do not runtime-cache `/api`, `/documentation`, or `/healthz`.
- Register the service worker in controlled update mode so a future UI can prompt users before applying a new build.
- Do not register or generate the development service worker in Vite dev. Development validates manifest/icons only; production build validates `dist/sw.js`.
- In Vite dev, unregister stale service workers for the current origin so old local browser state does not keep requesting `/dev-sw.js?dev-sw`.

## App Metadata

- App name: `Funcione`
- Short name: `Funcione`
- Description: `Treinos personalizados para atletas Funcione, by MileX.`
- Language: `pt-BR`
- Display mode: `standalone`
- Start URL: `/`
- Scope: `/`
- Theme color: `#0088ff`
- Background color: `#02040a`

## Assets

Store app icons under `apps/frontend/public/icons/`.

Required assets:

- `funcione-milex-app-icon-48.png`
- `funcione-milex-app-icon-180.png`
- `funcione-milex-app-icon-192.png`
- `funcione-milex-app-icon-512.png`
- `funcione-milex-app-icon-1024.png`
- `funcione-milex-app-icon.png`

Manifest icons:

- `192x192` PNG with purpose `any`
- `512x512` PNG with purpose `any maskable`

HTML head assets:

- `rel="manifest"` pointing to `/manifest.webmanifest`.
- `rel="icon"` pointing to the `48x48` PNG.
- `rel="apple-touch-icon"` pointing to the `180x180` PNG.
- `theme-color` matching the manifest.

## Testing

- Add Playwright E2E coverage that:
  - opens the app;
  - verifies manifest link and core manifest fields;
  - verifies required icon assets are available as PNG files;
  - verifies the manifest link and core manifest fields;
  - verifies required installation icons are available as PNG files.

The production build must also be checked for generated `dist/sw.js` because
development does not register `/dev-sw.js?dev-sw`. E2E also guards against the
app shell registering a development service worker, which avoids stale
`apps/frontend/dev-dist/*` failures while the Vite server is running.
Another E2E guard validates stale service workers are unregistered in
development.

## Operational Notes

- Installation requires HTTPS in production. Local testing can use `localhost` or `127.0.0.1`.
- Docker already copies `apps/frontend/dist`, so generated PWA files are included in the existing frontend runtime image.
- Future offline mode for training plans must be designed separately because it involves sensitive authenticated data.
