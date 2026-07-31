# PRD — SemaKazi

## Problem

Kenya's informal economy employs the majority of its young, fast-growing
workforce. Skilled fundis (electricians, carpenters, mechanics, tailors, etc.)
have no digital way to prove their competence to clients outside their
existing social network — trust is entirely word-of-mouth. This limits
income opportunities for skilled workers and gives clients no way to
vet quality before hiring a stranger.

## Goals

1. Let fundis build a public profile that proves real, verifiable skill
2. Let clients search and evaluate fundis before making contact
3. Keep the trust system lightweight enough for an MVP — no heavy
   verification bureaucracy, but enough friction to deter fake claims

## User stories

**As a fundi, I want to...**
- Register an account and set my trade and location, so clients can find me
- Upload photos/videos of completed jobs, so I have visible proof of my work
- Receive ratings from clients I've worked for, so my reputation is
  reflected on my profile
- Receive skill badges from peers/community, so specific competencies are
  independently recognized, not just self-claimed

**As a client, I want to...**
- Search for fundis by trade and location, so I find someone near me
  who does the job I need
- View a fundi's proof-of-work, ratings, and badges before contacting them,
  so I can make an informed hiring decision
- Leave a rating and comment after a job, so future clients benefit from
  my experience

## Out of scope (MVP)

- **Payments / escrow** — no in-app money movement; contact happens
  off-platform for now
- **In-app booking/scheduling** — no calendar or job-request workflow yet
- **SMS/USSD access** — smartphone/web only for MVP, despite this being a
  realistic need for full market reach later
- **Admin moderation tools** — no dashboard to remove fake profiles/reviews
  in this version
- **Real-time chat** — clients and fundis connect via the phone number on
  the profile, not an in-app messaging system
- **Review verification** — MVP does not confirm a review came from someone
  who actually hired the fundi (documented as a known trust gap)

## Success criteria for MVP

- A fundi can register, build a profile, and have it be publicly viewable
- A client can search, view a full profile, and leave a review
- The rating shown on search results accurately reflects average of reviews
- Core flows work end-to-end on a deployed instance, not just locally
