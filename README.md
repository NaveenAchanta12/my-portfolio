# Naveen Achanta — My Portfolio

An interactive software-engineering portfolio with a scroll-driven laptop introduction, a city journey, and a responsive reading mode.

## Run locally

This is a static HTML, CSS and JavaScript website. There is no npm build step, backend service, database, or required secret.

```sh
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080 in a modern browser. Serve over HTTP rather than opening HTML directly because the site uses JavaScript modules and model assets. WebGL-capable browsers render the 3D city; a fallback is included.

## Deploy on your server

Upload **the contents of `dist/`** to your web server's public document root. Preserve every subdirectory, including `assets/` and `vendor/`. `dist/index.html` must be the entry page. No server-side compilation is required.

For Nginx, set `root` to the uploaded directory, `index index.html`, and use `try_files $uri $uri/ =404;`. Enable the normal MIME types configuration so JavaScript modules are served as JavaScript. Enable HTTPS and compression. Cache versioned assets; avoid long caching for HTML when releasing updates.

For static hosting platforms, use `dist` as the publish/output directory and leave the build command empty. All production assets, models, textures, icons and the updated downloadable résumé are bundled.

## Connect your own domain

1. Deploy `dist/` and verify the provider's preview address or your server first.
2. Add your chosen domain in the hosting provider, or configure the hostname in your server.
3. Set the DNS records the provider specifies. A server commonly uses an A record for its public IPv4 address; managed hosts commonly use a CNAME for `www`. Do not guess these values.
4. Enable an HTTPS certificate for the hostname and choose your preferred root/`www` redirect.
5. Test the landing animation, both modes, navigation, project links and résumé download on desktop and mobile.

This repository does not provision a server, change DNS, or modify the currently published site.

## Source layout

- Root HTML/CSS/JS: editable source.
- `dist/`: complete ready-to-host snapshot of release V77.
- `assets/`, `vendor/`: source assets and bundled dependencies; retain their license and provenance files.
- `render-source/`: original laptop rendering script.
- `*.test.cjs`, `*.test.mjs`: existing regression checks; run with Node.js, e.g. `node test.cjs` or `node --test *.test.cjs *.test.mjs`.

Source and `dist` are intentionally separate. After source edits, synchronize the changed production files into `dist` before deploying; there is no automatic bundler. Historical checks may target superseded visual designs, so review failures against the current UI rather than assuming every old expectation still applies.

The résumé in both asset trees is the approved version without the bachelor's-degree entry. Internal development notes, deployment credentials, and historical git data are excluded from this public export. Third-party assets retain their own licenses; this repository does not grant additional rights to trademarks or personal materials.
