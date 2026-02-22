# Task 03 — Trips & Expenses API

## Goal
Full CRUD for trips and expenses, all JWT-protected. Users only see their own data.

## Deliverables
- `backend/src/routes/trips.js`
- `backend/src/routes/expenses.js`
- Routes registered in `index.js` under `/api/trips` and `/api/expenses`
- All routes protected with `jwt.js` middleware
- All queries scoped to `req.user.sub` (no cross-user data leakage)

## Endpoints

### Trips
```
GET    /api/trips          → list all trips for current user
POST   /api/trips          → create trip { name, destination, start_date, end_date }
GET    /api/trips/:id      → single trip + all its expenses
DELETE /api/trips/:id      → delete trip (and cascade expenses)
```

### Expenses
```
GET    /api/expenses              → all expenses for current user (optional ?trip_id= filter)
POST   /api/expenses              → create { trip_id, amount, currency, category, date, notes }
DELETE /api/expenses/:id          → delete single expense
```

## Categories (enforce on backend)
`food`, `transport`, `accommodation`, `activities`, `other`

## Acceptance Criteria
- All endpoints return correct HTTP status codes (200, 201, 400, 401, 404)
- User A cannot access User B's trips or expenses
- `GET /api/trips/:id` returns trip details + array of expenses in one response
- Input validation on POST routes (required fields, valid category, valid amounts)
