# Cinema API & Web UI

A modern full-stack application for finding, downloading, and streaming movies, TV shows, and live TV. 

This repository contains both the high-performance Rust backend API and the beautiful React frontend web interface.

## System Architecture

- **Backend (`/src`)**: Written in Rust, using `axum` and `tokio`. It handles all the heavy lifting of scraping providers, fetching metadata, finding subtitles, and generating stream links.
- **Frontend (`/web-ui`)**: Written in React + TypeScript + Vite. It provides the user interface to search for media and stream it natively in the browser or via deep-links to mobile apps like VLC.

## Getting Started

### 1. Run the Backend API (Rust)
The frontend requires the backend API to be running to fetch media streams.

```bash
# Install dependencies and run the server
cargo run --release
```
The API will start locally at `http://127.0.0.1:8000`.

### 2. Run the Frontend Web UI (React)
Open a new terminal window to start the frontend.

```bash
cd web-ui
npm install
npm run dev
```
The Web UI will start locally at `http://localhost:5173`.

## Deployment

### Deploying the Frontend (Cloudflare Pages)
The `web-ui` is designed to be hosted globally on Cloudflare Pages.
```bash
cd web-ui
npx wrangler pages deploy dist
```

### Deploying the Backend (Render.com)
The Rust API is designed to be deployed on Render as a Web Service. Once deployed, you must update the `getApiBase()` URL inside `web-ui/src/components/DetailsModal.tsx` and `web-ui/src/App.tsx` to point to your live Render URL instead of `127.0.0.1`.

## Features
- **In-Browser Streaming:** Stream movies directly in your web browser.
- **VLC Mobile Deep-Linking:** Click a button to force open the VLC app on your phone with the stream URL.
- **Direct Downloads:** Download the raw movie files to your device.
- **Multiple Providers:** Automatically scrapes and aggregates streams from multiple sources.

## License
Licensed under either [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE).
