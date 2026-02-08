# flights.emiratesgrouproblox.link (Public Flight Board)

## What this is
A static, GitHub Pages-friendly flight dashboard inspired by a weekly schedule layout.
- Weekly date strip
- Flight cards list
- Light/Dark toggle
- Buttons to Bookings, Staff Portal, and OCC Portal

## Backend requirement (Supabase)
This frontend calls a public RPC:
- `egr_get_public_flights(p_date date)` (parameter name defaults to `p_date`)

And for details:
- `egr_get_public_flight(p_flight_id uuid)`

If your RPCs use different names or parameter names, edit:
- `assets/js/config.js`

## Deploy
Upload these files to your GitHub Pages repo root and point your custom domain to it.
