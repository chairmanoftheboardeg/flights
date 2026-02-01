# flights.emiratesgrouproblox.link — Frontend (Static)

This ZIP is a static HTML/CSS/JS site designed to be hosted on GitHub Pages.
It connects to Supabase using the **public anon key** (safe to ship).

## Pages included
- /index.html — Public weekly flight board (public flights only)
- /login.html — Staff login (invite-only, no sign-up UI)
- /staff/index.html — Staff dashboard (my roster + training requests)
- /occ/index.html — OCC stub (guarded)
- /instructors/index.html — Instructor stub (guarded)

## Supabase config
Edit:
- /assets/config.js

It currently contains the URL + anon key you provided.

IMPORTANT:
- Never place the **service_role** key in frontend code.
- Disable public signups in Supabase Auth (invite-only).

## GitHub Pages
1) Upload the contents of this folder to your repo root (or /docs).
2) Enable GitHub Pages for the repo.
3) Point your domain `flights.emiratesgrouproblox.link` to GitHub Pages (as you already do).

## Supabase Auth settings (required)
In Supabase dashboard:
Authentication → URL Configuration
- Site URL: https://flights.emiratesgrouproblox.link
- Redirect URLs: add
  - https://flights.emiratesgrouproblox.link/login.html
  - https://flights.emiratesgrouproblox.link/staff/index.html
  - https://flights.emiratesgrouproblox.link/occ/index.html
  - https://flights.emiratesgrouproblox.link/instructors/index.html

## Data prerequisites
For the public board to show flights, make sure you have rows in:
- flights (with visibility = 'public')

For the staff dashboard:
- roster_slots assigned_user must match the user's auth UID
- roster_role_templates should have the role list (active roles)

## Theme
There is a Light/Dark toggle that matches your main EGR site style.
Animations are CSS-based (smooth reveal + hover transitions).