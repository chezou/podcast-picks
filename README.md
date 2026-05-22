# podcast-picks

Share your top 3 podcast picks as a beautiful card — no server required.

## Features

- **Title-only input** — artwork is auto-fetched from iTunes Search
- **Auto-generated links** — Apple Podcasts (direct) + Spotify (search) + optional custom URL
- **Light / Dark mode** — follows OS `prefers-color-scheme`, with manual toggle
- **Name-based color palettes** — each person gets a unique accent color
- **Shareable via URL** — all data is encoded in the hash fragment, zero backend

## Usage

1. Enter your display name
2. Add up to 3 podcast titles (and optional reasons / links)
3. Preview → Copy link → Share anywhere

## Development

```bash
npm install
npm run dev
```

## Tech

React + Vite, single `App.jsx`, no CSS files, no backend.
