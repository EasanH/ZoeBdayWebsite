# GitHub Pages Deployment Guide

This birthday website is ready to deploy to GitHub Pages for free hosting!

## Steps to Deploy

### 1. **Create a GitHub Repository**
- Go to [github.com/new](https://github.com/new)
- Name it `ZoeBdayWebsite` (or any name you prefer)
- Select "Public" so it can be hosted
- Click "Create repository"

### 2. **Push Your Code to GitHub**
Open PowerShell in this project folder and run:

```powershell
git init
git add .
git commit -m "Birthday website for Zor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ZoeBdayWebsite.git
git push -u origin main
```

(Replace `YOUR_USERNAME` with your GitHub username)

### 3. **Enable GitHub Pages**
- Go to your repository on GitHub
- Click **Settings** (top right)
- Scroll to **Pages** section (left sidebar)
- Under "Build and deployment":
  - Source: Select "Deploy from a branch"
  - Branch: Select `main` and `/docs` folder
  - Click **Save**

GitHub will build and deploy within a few minutes!

### 4. **Get Your Live Link**
Once deployed, you'll see:
> "Your site is published at: `https://YOUR_USERNAME.github.io/ZoeBdayWebsite/`"

Share this link with Zor! 🎉

## Customization Tips

### Add Your Spotify Playlist
1. Open [docs/index.html](docs/index.html)
2. Find: `https://open.spotify.com/playlist/PLACEHOLDER`
3. Replace `PLACEHOLDER` with your actual Spotify playlist ID
4. Commit and push changes — GitHub will auto-update

### Replace Placeholder Images
1. Add your photos to the `docs/images/` folder (create if needed)
2. Update image references in `docs/index.html`
3. Push changes

### Update Content
Edit any text in [docs/index.html](docs/index.html), then push — GitHub Pages updates automatically!

## Support

For GitHub Pages troubleshooting, visit: [docs.github.com/en/pages](https://docs.github.com/en/pages)
