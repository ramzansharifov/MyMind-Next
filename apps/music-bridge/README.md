# MyMind Music Bridge (Desktop + PWA)

YouTube/SoundCloud are served by **yt-dlp**, not paid provider APIs. This is an optional **self-hosted companion** specifically for MyMind PWA. Desktop has its own embedded local audio server and automatically downloads verified yt-dlp; Android is not modified.

## What it does

- `POST /api/search`: SoundCloud `scsearch25:` through yt-dlp.
- `POST /api/radio`: YouTube automatic `RD<videoId>` mix.
- `POST /api/resolve`: extract short-lived audio URL; return session URL.
- `GET /audio/<random-token>`: stream with byte ranges; cache successful complete responses up to 45MB; use FFmpeg for HLS-only SoundCloud.
- `GET /health`: readiness.

It does **not** require paid API keys. YouTube search comes from PWA's direct InnerTube metadata route. Bridge control requests require a secret Bearer token. Audio links are unguessable and expire after one hour.

## Deploy

1. Use a trusted personal VPS or a computer reachable through **HTTPS** (e.g. a reverse proxy + your domain). This is **not** a Vercel function.
2. Copy `.env.example` to `.env`, set a long random `MUSIC_BRIDGE_TOKEN`, and your real HTTPS `MUSIC_BRIDGE_PUBLIC_URL` (no trailing slash).
3. Run `docker compose up -d --build` inside `apps/music-bridge`.
4. Configure a TLS reverse proxy from `https://your-domain.example` to `http://127.0.0.1:8787`. Keep 8787 bound only to localhost. Allow range requests, long-lived chunked responses and streaming.
5. Add to your **PWA Vercel project** environment variables:
   `MYMIND_MUSIC_BRIDGE_URL=https://your-domain.example`
   `MYMIND_MUSIC_BRIDGE_TOKEN=THE_SAME_SECRET`
6. Redeploy PWA. Only server-side routes read the secret; it is never exposed to the browser.

For local development, you can use an HTTPS tunnel with a private hostname. An arbitrary public shared bridge is discouraged; it could be abused for bandwidth. Restrict access to your own deployment as appropriate.

## Desktop

No bridge is needed. The Electron main process downloads the official standalone `yt-dlp` release, verifies SHA256 against official release checksums, and checks for updates every seven days. Node.js runtime must be available on PATH for YouTube JS challenges (Deno also supported by yt-dlp). You may override `MYMIND_YTDLP_PATH` and `MYMIND_FFMPEG_PATH` if already installed. FFmpeg is required for SoundCloud HLS streams; desktop audio streams in compatible codecs work without it.

## Important limitations

YouTube's WEB InnerTube is not a public supported API; search, streams and mixes can change. Some streams require signed-in sessions, regional availability, JS challenge solving or permission from the rights holder. The bridge does not handle DRM-protected content. Use only content you are allowed to stream/cache. HTTPS deployment and the Vercel env variables are **required** for PWA playback of YouTube/SoundCloud; without them only YouTube discovery and the existing Audius/Jamendo streaming are available.
