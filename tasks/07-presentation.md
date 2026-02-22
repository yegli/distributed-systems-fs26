# Task 07 — Presentation Guide

## Format: 5 min arch · 5 min demo · 5 min Q&A

---

## Slide Structure (5 min)

1. **Title** — App name, your name, one-line description
2. **Architecture Diagram** — Show all containers, Traefik in the middle, Postgres at the bottom
3. **Tech Choices** — Why Node/Vue/Postgres/Traefik (brief, confident)
4. **Auth Flow** — Register → JWT issued → JWT verified on every protected call
5. **Design Decisions** — Stateless JWT enables seamless failover, single Postgres is intentional (scope), AI via OpenAI API

---

## Demo Script (5 min)

1. `docker compose up --build` — show it comes up clean from a fresh clone
2. Open app → register new user
3. Create a trip → add 3-4 expenses
4. Navigate to trip → click AI Summary — show generated text
5. Open Traefik dashboard → show both instances healthy, requests distributed
6. Run k6 load test — show throughput live
7. **LIVE FAILOVER:** `docker stop expense-tracker-api-2-1` while test runs
   - Point to Traefik dashboard — instance goes red
   - App still responds — show expense list still loads
   - `docker start expense-tracker-api-2-1` — Traefik re-adds it
8. Show footer instance indicator flipping between api-1 and api-2

---

## Likely Q&A Topics

- **Why not scale Postgres?** — Out of scope, but next step would be read replica or managed DB
- **Is JWT secure?** — Signed with HS256, secret in env var, short enough expiry
- **What if Postgres goes down?** — Single point of failure, acknowledged trade-off per requirements ("does not need to be scalable")
- **How does Traefik detect failure?** — Health check on `/health` endpoint, removes instance from rotation after N failures
- **Why gpt-4o-mini?** — Cost-efficient, fast, sufficient for summarization. Easy to swap model.
- **Could this scale?** — Add more API replicas with zero config changes (just more Compose services or switch to K8s)

---

## Checklist Before Presentation
- [ ] Fresh `git clone` + `docker compose up` works on a clean machine
- [ ] `.env` configured with real OpenAI key
- [ ] Seed data loaded (Thailand trip visible on login with demo user)
- [ ] Traefik dashboard accessible
- [ ] k6 installed or Docker available for load test
- [ ] Know which `docker stop` command to run by heart
- [ ] PDF of slides exported and ready to hand in
