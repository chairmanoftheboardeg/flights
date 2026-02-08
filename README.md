# flights.emiratesgrouproblox.link (Public Flight Board)

## What this is
A static, GitHub Pages-friendly public flight board that reads from your Supabase backend using a public RPC.

## Required backend RPC
This frontend expects an RPC named `egr_get_public_flights` (configurable in `assets/js/config.js`).

Optional (for flight details):
- `egr_get_public_flight(p_flight_id uuid)`.

If the single-flight RPC is missing, the site will fall back to loading the list and filtering client-side.

## Deploy
### GitHub Pages (recommended)
1) Upload all files in this folder into a GitHub repo (root).
2) Settings → Pages → Deploy from branch.
3) Add custom domain: `flights.emiratesgrouproblox.link`.
4) Ensure your DNS CNAME points to the GitHub Pages host.

## Config
Edit:
- `assets/js/config.js`
