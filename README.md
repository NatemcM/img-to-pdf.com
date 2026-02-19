# img-to-pdf.com

A privacy-first image-to-PDF converter that runs entirely in your browser. No uploads, no tracking, no servers touching your files.

## Features

- **100% Client-Side** — Images never leave your device. PDF generation happens in your browser using [pdf-lib](https://github.com/Hopding/pdf-lib) and the Canvas API.
- **Drag & Drop** — Upload JPG, PNG, or WebP files by dragging them in or clicking to browse. Reorder pages with drag-and-drop powered by [SortableJS](https://github.com/SortableJS/Sortable).
- **Page Size Options** — A4, US Letter, or Fit to Image.
- **Optional Email Confirmation** — If configured, users can receive a one-time confirmation email via [Resend](https://resend.com). No mailing lists, no follow-ups.
- **Security Hardened** — Rate-limited email endpoint, server-side input sanitization, CSP headers, and HTML escaping. See [SECURITY_AUDIT.md](SECURITY_AUDIT.md) for details.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit (Svelte 5) |
| Styling | Tailwind CSS v4 |
| PDF Engine | pdf-lib (client-side) |
| Image Processing | Canvas API (resize + JPEG compression) |
| Drag & Drop | SortableJS |
| Email | Resend (server-side, optional) |
| Deployment | Vercel |
| Testing | Vitest |

## Getting Started

```bash
# Clone the repo
git clone https://github.com/NatemcM/img-to-pdf.com.git
cd img-to-pdf.com

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```
RESEND_API_KEY=your_resend_api_key_here
```

The email feature is optional. If `RESEND_API_KEY` is not set, the email field is hidden and the app works fully without it.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npx vitest run` | Run security test suite |

## Project Structure

```
src/
├── app.html                          # Shell (Google Fonts, favicon)
├── app.css                           # Tailwind + custom theme
├── hooks.server.js                   # Security headers (CSP, etc.)
├── routes/
│   ├── +layout.svelte                # Header + Footer wrapper
│   ├── +page.svelte                  # Main converter page
│   ├── +page.server.js               # Server load (checks API key)
│   ├── how-it-works/+page.svelte     # How It Works page
│   ├── privacy/+page.svelte          # Privacy Policy
│   ├── terms/+page.svelte            # Terms & Conditions
│   └── api/send-email/+server.js     # Email endpoint (rate-limited)
└── lib/
    ├── components/                   # Svelte components
    ├── stores/app-state.svelte.js    # Reactive state (Svelte 5 runes)
    └── utils/                        # PDF generation, image processing, helpers
```

## How It Works

1. **Upload** — Images are loaded into browser memory via `URL.createObjectURL`.
2. **Process** — Each image is resized (max 1600px) and compressed to JPEG (quality 0.8) using the Canvas API.
3. **Build PDF** — `pdf-lib` creates a PDF document, embeds each processed image, and arranges them on pages.
4. **Download** — The finished PDF is downloaded directly from browser memory. Nothing touches a server.

## Deployment

The project is configured for Vercel out of the box:

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Set `RESEND_API_KEY` in Vercel Environment Variables (optional)
4. Deploy

## License

All rights reserved. See [Terms](https://img-to-pdf.com/terms) for usage terms.
