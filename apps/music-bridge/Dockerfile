FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ffmpeg ca-certificates \
    && python3 -m venv /opt/yt && /opt/yt/bin/pip install --no-cache-dir "yt-dlp[default]" \
    && rm -rf /var/lib/apt/lists/*
ENV MUSIC_YTDLP_PATH=/opt/yt/bin/yt-dlp
WORKDIR /app
COPY server.mjs ./
RUN mkdir -p /app/.music-cache && chown -R node:node /app
USER node
EXPOSE 8787
CMD ["node", "server.mjs"]
