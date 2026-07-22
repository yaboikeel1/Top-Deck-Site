# Top Deck Music Group LLC Website

Official website repository for Top Deck Music Group LLC.

> Built from the Bottom. Driven by Purpose. Destined for the Top.

## Website structure

```text
Top-Deck-Site/
├── .github/
│   └── pull_request_template.md
├── docs/
│   └── BRANCHING.md
├── public/
│   ├── admin/
│   ├── assets/
│   │   ├── audio/
│   │   ├── covers/
│   │   └── images/
│   ├── data/
│   │   └── site-data.json
│   ├── netlify/functions/
│   ├── index.html
│   ├── artists.html
│   ├── music.html
│   ├── radio.html
│   ├── merch.html
│   ├── booking.html
│   ├── contact.html
│   └── success.html
├── .gitignore
├── CONTRIBUTING.md
├── netlify.toml
└── README.md
```

## Branches

- `main` — stable production website deployed by Netlify
- `develop` — active development and testing
- `feature/...` — optional short-lived branches for individual features

See [`docs/BRANCHING.md`](docs/BRANCHING.md) for the complete workflow.

## Main content file

Most editable website content is stored in:

```text
public/data/site-data.json
```

It controls artists, releases, radio settings, merchandise products, and news posts.

## Admin content manager

Open:

```text
public/admin/index.html
```

Use it to edit content and download a refreshed `site-data.json` file.

## Local preview

From the project folder:

```bash
cd public
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Netlify configuration

Netlify uses:

- Publish directory: `public`
- Functions directory: `public/netlify/functions`
- Production branch: `main`

## Security

Never commit passwords, Stripe secret keys, or `.env` files. Store secrets in Netlify environment variables.

## Launch checklist

- Add final logo and brand imagery
- Add artist photos and release artwork
- Add streaming links
- Confirm booking and contact information
- Add radio stream URL or embed
- Configure Stripe products and environment variables
- Connect the final domain
