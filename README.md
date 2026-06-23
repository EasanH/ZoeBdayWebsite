# Zor's Birthday Website

A beautiful long-distance birthday celebration site with personalized memories, love letters, music, and interactive surprises.

## 🎉 Features

- **Hero Landing** — Warm welcome message
- **Memory Gallery** — Photo cards with captions (placeholder ready for your photos)
- **Gmail-Styled Love Letter** — Personalized message from you
- **Spotify Playlist** — Link to your curated birthday playlist
- **Surprise Reveal** — Hidden love notes that unfold
- **Relationship Quiz** — Fun trivia about your relationship
- **Responsive Design** — Beautiful on desktop and mobile
- **No Software Required** — She just clicks a link!

## 🚀 Deployment

This site is hosted on **GitHub Pages** — completely free and no complicated setup for the recipient.

### Quick Deploy
Follow the step-by-step guide in [DEPLOYMENT.md](DEPLOYMENT.md)

### Local Testing (optional)
If you want to preview locally before deploying:
1. Open `docs/index.html` in your browser
2. Everything works offline!

## 📝 Customization

### Add Your Spotify Playlist
Edit `docs/index.html` and replace:
```html
href="https://open.spotify.com/playlist/PLACEHOLDER"
```
with your actual Spotify playlist link.

### Update Love Letter
Edit the email body in `docs/index.html` — change the message to something personal!

### Replace Photos
1. Add image files to `docs/images/` folder
2. Update image paths in `docs/index.html`

### Customize Quiz
Edit the trivia question and answers in `docs/index.html`

### Edit Reveal Notes
Update the five reasons in `docs/index.html` — make them as personal as you like!

## 🎨 Colors & Styling

The design uses soft pastel green and pink tones with elegant cards and animations. Edit `docs/styles.css` to customize colors:
- Primary gradient: `#8dcbff` to `#7487ff` (blue)
- Accent: `#ff95d4` to `#ffcd7f` (pink/gold)
- Background: Pastel green/purple radials

## 📱 Browser Support

Works on all modern browsers (Chrome, Safari, Firefox, Edge). No downloads or plugins needed.

## 🛠️ File Structure

```
docs/                  # Everything Zor sees
├── index.html        # Main page
├── styles.css        # Design
└── scripts.js        # Interactions

DEPLOYMENT.md        # GitHub Pages setup guide
README.md            # This file
```

## 💡 Tips

- Test everything in `docs/index.html` before pushing to GitHub
- Keep file names consistent (case-sensitive)
- Keep image file sizes reasonable for fast loading
- Update your Spotify playlist link before sharing

## 🎁 Ready to Go

Once deployed, simply share the GitHub Pages link with Zor. No login, no downloads, just pure birthday magic!

---

*Made with 💚 for a long-distance celebration*
