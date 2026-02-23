# Task 08 — Voice Module (Nice to Have)

> ⚠️ Only tackle this once tasks 01–07 are complete and working. A half-working voice feature hurts more than it helps in a demo.

## Goal
Allow users to add expenses and query their data via voice. Speak naturally, the system interprets intent and either writes to the DB or reads back a result.

## Example Interactions
- *"Add 500 baht for dinner last night in the Thailand trip"* → creates expense
- *"What did I spend on accommodation in Thailand?"* → reads back total
- *"Show me all my expenses from January 15th"* → reads back list

## Stack
All three OpenAI APIs — no new dependencies needed beyond what's already in the project:
- **Whisper** (`whisper-1`) — audio blob → transcript
- **GPT-4o-mini** — transcript → structured intent + data
- **TTS** (`tts-1`) — natural language response → audio played in browser

---

## Backend

### New Route
`POST /api/voice` (JWT protected)

### Flow
```
audio blob (multipart)
  → Whisper → transcript
  → GPT intent parser → { intent, data }
  → if "add_expense": INSERT → confirm response text
  → if "query": SELECT → format result as text
  → TTS → return audio/mpeg stream
```

### Intent Parser Prompt (starting point)
```
You are an expense tracking assistant. The user will speak a command.
Extract the intent and return ONLY valid JSON, no other text.

Intent must be one of: "add_expense" or "query"

For add_expense return:
{ "intent": "add_expense", "amount": number, "currency": "THB/CHF/EUR/USD",
  "category": "food/transport/accommodation/activities/other",
  "date": "YYYY-MM-DD or null", "notes": "string", "trip_hint": "string or null" }

For query return:
{ "intent": "query", "type": "total_by_trip/total_by_category/expenses_by_date",
  "trip_hint": "string or null", "category": "string or null", "date": "YYYY-MM-DD or null" }

Today's date is {today}. User's trips: {trip_names}.
If currency not mentioned, default to the trip's primary currency.
If date not mentioned for add_expense, default to today.
```

### Trip Hint Resolution
GPT returns a fuzzy `trip_hint` like "Thailand" — resolve it server-side by matching against the user's actual trip names (simple `ILIKE %hint%` query).

---

## Frontend

### New Component: `VoiceButton.vue`
- Microphone button — hold to record, release to send
- Uses `MediaRecorder` API (no library needed)
- Visual states: idle / recording (pulse animation) / processing / playing response
- On response: plays audio back via `Audio` API, also displays transcript + response as text fallback

### Where to place it
- Floating button on the Trip detail view (contextually aware of which trip is active)
- Pass the current `trip_id` with the request so the backend has context

---

## Graceful Degradation
- If browser doesn't support `MediaRecorder` → hide button, no error
- If Whisper/TTS call fails → return text response only, no audio
- If intent is ambiguous → return audio asking user to rephrase

---

## Acceptance Criteria
- "Add [amount] [currency] for [category]" reliably creates an expense
- "What did I spend on X in Y trip" returns a spoken + text answer
- Works end-to-end in under 5 seconds
- Fails gracefully if OpenAI is unavailable

---

## Demo Moment
Ask out loud during presentation: *"What did my Thailand trip cost in total?"* — system speaks back the answer. Strong closing to the demo.
