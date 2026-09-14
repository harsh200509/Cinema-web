# Cinema Deployment Guide

This guide explains how to host your **Cinema** web app and API backend for free, while configuring it to prevent copyright blocking and takedowns.

> [!NOTE]
> The Cinema backend operates entirely as a **proxy and scraper**. It does not host any media files itself. Instead, it aggregates links from external providers and securely proxies the data streams.

---

## 1. Free Hosting Setup

We recommend splitting the deployment into two parts: the frontend (Web UI) and the backend (Rust API).

### Backend (Rust API)
Host the backend on **Render**, **Koyeb**, or **Railway**. 

> [!WARNING]
> **Render's free tier spins down (goes to sleep) after 15 minutes of inactivity.** When the next user visits, it will take 30-50 seconds to wake up (a "cold start"). 
> 
> **Solutions:**
> 1. Use [Koyeb](https://www.koyeb.com/) instead, which gives you 1 free "always-on" web service.
> 2. Or, use a free pinging service like [cron-job.org](https://cron-job.org/) to ping your Render URL every 10 minutes to keep it awake permanently.

**Deploying to Render:**
1. Push your `Cinema` code to GitHub.
2. Sign up for [Render](https://render.com/).
3. Create a **New Web Service** and connect your GitHub repository.
4. Set the following settings:
   - **Environment:** `Rust`
   - **Build Command:** `cargo build --release`
   - **Start Command:** `./target/release/cinema --port $PORT`
5. Click **Deploy**.

> [!TIP]
> Make sure to note down the backend URL (e.g., `https://cinema-api.onrender.com`). You will need this for the frontend!

### Frontend (Web UI)
Host the frontend on **Vercel**, **Netlify**, or **Cloudflare Pages**. 

1. Sign up for [Vercel](https://vercel.com/).
2. Create a **New Project** and select the `web-ui` directory from your repository.
3. Vercel will automatically detect the Vite framework.
4. Add the following Environment Variable:
   - `VITE_API_URL`: The URL of your deployed backend (e.g., `https://cinema-api.onrender.com`).
5. Click **Deploy**.

---

## 2. Preventing Copyright Blocking

Since the backend acts as a proxy, it is highly resilient to DMCA claims (as you do not host the files). However, ISPs or copyright trolls might still try to block the domain name.

### Use Cloudflare (Strictly Recommended)
1. Register a cheap or free domain name (e.g., `.tk`, `.ml`, or a cheap `.icu` domain).
2. Create a free account on [Cloudflare](https://dash.cloudflare.com/) and add your domain.
3. Update your domain's nameservers to point to Cloudflare.
4. Go to the **DNS** settings in Cloudflare and add a `CNAME` record pointing to your frontend (e.g., Vercel URL).
5. **CRITICAL:** Ensure the orange cloud icon (Proxied) is turned **ON**. 

> [!IMPORTANT]
> When Cloudflare proxying is enabled, your actual server IP is completely hidden. ISPs and automated bots will only see Cloudflare's IP addresses, making it nearly impossible for them to find your origin server or issue a direct takedown.

### Keep the TUI Removed
By deleting the TUI and shipping only the web UI and proxy backend, you maintain full control over the distribution of the client, and the backend simply becomes a generic "stream proxy" service, further detaching it from explicit copyright infringement on the server level.

Enjoy your own personal, unblockable cinema!
