# Task 04 — Frontend (Vue 3 + Vite)

## Goal
Clean, functional UI. Not a design showcase — just clear and demo-able.

## Deliverables
- Vue 3 app with Vite, Vue Router, Pinia, Axios
- JWT stored in Pinia auth store (localStorage fallback for page reload)
- Axios instance with base URL from env var, auto-attaches `Authorization: Bearer` header
- `frontend/Dockerfile` — build with Vite, serve with Nginx

## Views / Routes

| Route | View | Description |
|---|---|---|
| `/login` | LoginView | Email + password form, redirects on success |
| `/register` | RegisterView | Same but register endpoint |
| `/` | DashboardView | List of user's trips, total spend per trip |
| `/trips/:id` | TripView | Trip detail: expense list + category breakdown + AI summary button |

## Components
- `ExpenseForm.vue` — modal/inline form to add an expense to a trip
- `ExpenseList.vue` — table of expenses with delete button
- `TripCard.vue` — card on dashboard showing trip name, destination, total spend
- `AISummary.vue` — button + display area for AI-generated trip summary

## Notes
- Show which backend instance is serving (`X-Served-By` header) — small indicator in footer, great for failover demo
- Handle 401 globally (Axios interceptor) → redirect to `/login`
- No CSS framework required — plain CSS or minimal utility classes fine
- Forms should show validation errors from API

## Acceptance Criteria
- Full auth flow works (register, login, logout clears store)
- Can create a trip, add expenses, see them listed
- AI summary button calls API and displays result
- Instance indicator in footer updates per request (demonstrates load balancing)
- App works after killing one backend container
