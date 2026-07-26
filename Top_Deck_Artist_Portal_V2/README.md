# Top Deck Artist Portal V2

## What is included

- Artist signup and login
- Artist profile editing
- Streaming link management
- Release submissions
- Artist submission history
- Admin review screen
- Supabase database SQL
- Black-and-gold Top Deck styling

## Install into GitHub

1. Extract this ZIP.
2. Open the `public` folder inside this package.
3. Upload the contents into your website repository's existing `public` folder.
4. Keep the folder names exactly as provided:
   - `artist-portal`
   - `admin-portal`
5. Upload `portal-shared.css` and `supabase-config.js` into the main `public` folder.
6. Commit with: `Add Artist Portal V2`
7. Netlify should redeploy automatically.

## Supabase setup

1. Create a free Supabase project.
2. Open SQL Editor.
3. Run `supabase-setup.sql`.
4. In Supabase, open Project Settings > API.
5. Copy the Project URL and anon public key.
6. Open `public/supabase-config.js`.
7. Replace both placeholder values.
8. In `public/admin-portal/admin.js`, replace:
   `YOUR_ADMIN_EMAIL@example.com`
   with your real admin email.
9. Commit those edits to GitHub.

## Portal URLs

- Artist portal:
  `/artist-portal/`

- Admin portal:
  `/admin-portal/`

## Important launch note

The artist side uses Supabase Row Level Security so artists only see their own records.

The included admin screen is a starter. Before giving admin access to other people, upgrade it to a secure server-side role check using Supabase custom claims or an Edge Function.
