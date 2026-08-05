# SemaKazi

> A verified skills & reputation platform for Kenya's informal-sector workers (fundis).

## Problem statement

Kenya has one of the youngest populations in the world (median age ~20), and
the overwhelming majority of its workforce is employed in the informal sector
— artisans, electricians, carpenters, mechanics, tailors, and other skilled
tradespeople known locally as "fundis." Despite real skill, these workers have
no digital way to prove their competence to someone outside their existing
social network. Clients rely entirely on word-of-mouth, which:

- Limits skilled fundis to a small, slow-growing client base
- Lets unskilled or dishonest workers pose as experienced professionals
- Gives clients no way to compare or verify quality before hiring

SemaKazi solves this by giving fundis a public, verifiable profile built from
three trust signals: **proof-of-work** (photo/video of completed jobs),
**client ratings**, and **peer-endorsed skill badges**.

## Who it's for

- **Fundis** — skilled informal-sector workers who want to build a
  discoverable reputation and reach clients beyond their existing network
- **Clients** — people who need a trade done and want some evidence of
  quality before they hire a stranger

## MVP scope (what this build actually covers)

- Fundi and client registration/login
- Fundi profile: trade, location, bio, contact
- Proof-of-work uploads (media + caption)
- Client ratings & reviews per fundi
- Peer skill-badge endorsements
- Search/filter fundis by trade and location

## Out of scope for MVP

- Payments or in-app job booking/escrow
- SMS/USSD access for non-smartphone users
- Admin moderation dashboard
- Real-time chat between client and fundi

(See `docs/PRD.md` for the full breakdown, including user stories.)

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt |
| Frontend | HTML/CSS/JS (Phase 2) |
| Media storage | Cloudinary/S3 (Phase 2) |
| Deployment | Render/Railway (backend), Vercel or static host (frontend) |

## Project status

| Phase | Scope | Status |
|---|---|---|
| 0 | Planning, README, PRD, repo setup | ✅ |
| 1 | Backend foundation: models, auth, core APIs | ✅ |
| 2 | Frontend: auth pages, search, profile, dashboard | ✅ |
| 3 | Ratings/trust logic, search filtering | ✅ (delivered as part of Phases 1–2) |
| 4 | Tests, polish | ✅ |
| 5 | Deployment | ⏳ |

## Repo structure

```
semakazi/
├── docs/
│   └── PRD.md
├── semakazi-backend/       # Phase 1 (see its own README for setup)
│   └── src/
│       ├── db/
│       ├── middleware/
│       └── routes/
└── semakazi-frontend/      # Phase 2
    ├── css/
    ├── js/
    │   ├── config.js
    │   ├── api.js
    │   └── nav.js
    └── pages/
        ├── register.html
        ├── login.html
        ├── search.html
        ├── profile.html
        └── dashboard.html
```

## Local setup

See `semakazi-backend/README.md` for backend setup instructions.

Once the backend is running (`npm run dev` on port 4000), serve the frontend
with any static file server, e.g.:

```bash
cd semakazi-frontend
python3 -m http.server 8080
```

Then visit `http://localhost:8080` in your browser.

Verified working end-to-end locally: registration, login, fundi search,
profile view with reviews, and the dashboard flow (edit profile, add
proof-of-work).
