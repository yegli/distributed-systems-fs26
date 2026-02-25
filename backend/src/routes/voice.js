'use strict';

const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const pool = require('../db/client');
const authenticate = require('../middleware/jwt');

const router = express.Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB — Whisper's max
});

const VALID_CATEGORIES = ['food', 'transport', 'accommodation', 'activities', 'other'];
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'THB'];

// Same static rates as frontend/src/utils/currency.js
const RATES_TO_USD = {
  USD: 1.0, EUR: 1.04, GBP: 1.25, CHF: 1.12,
  JPY: 0.0065, THB: 0.029, AUD: 0.63, CAD: 0.71, NOK: 0.089, ISK: 0.0071,
};

function convertToHome(amount, fromCurrency, homeCurrency) {
  const from = (fromCurrency || 'USD').trim().toUpperCase();
  const to   = (homeCurrency  || 'USD').trim().toUpperCase();
  if (from === to) return +amount;
  return (+amount * (RATES_TO_USD[from] ?? 1)) / (RATES_TO_USD[to] ?? 1);
}

// POST /api/voice
// Body: multipart/form-data — field "audio" (audio file) + optional field "trip_id"
router.post('/', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'audio file required (field: audio)' });
  }

  const activeTripId = req.body.trip_id ? parseInt(req.body.trip_id, 10) : null;
  const homeCurrency = VALID_CURRENCIES.includes(req.body.home_currency) ? req.body.home_currency : 'USD';

  try {
    // Always fetch user's trips for intent resolution context
    const { rows: trips } = await pool.query(
      'SELECT id, name, destination FROM trips WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    // Graceful degradation — no API key
    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        transcript: '(mock) Add 50 USD for food today',
        responseText:
          'Mock mode: OPENAI_API_KEY is not set. Set it in your .env to enable voice commands.',
        audioBase64: null,
        newExpense: null,
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ── Step 1: Whisper ──────────────────────────────────────────────────────
    const audioFile = new File([req.file.buffer], 'audio.webm', {
      type: req.file.mimetype || 'audio/webm',
    });
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });
    const transcript = transcription.text.trim();

    // ── Step 2: GPT intent parser ────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    const tripNames = trips.map(t => `"${t.name}" (id:${t.id})`).join(', ') || 'none';
    const intentPrompt = buildIntentPrompt(transcript, today, tripNames);

    const intentCompletion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: intentPrompt }],
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    let intent;
    try {
      intent = JSON.parse(intentCompletion.choices[0].message.content);
    } catch {
      const msg = "I couldn't understand that. Please try again.";
      return res.json({
        transcript,
        responseText: msg,
        audioBase64: await generateTTS(client, msg),
        newExpense: null,
      });
    }

    // ── Step 3: Execute intent ───────────────────────────────────────────────
    let responseText;
    let newExpense = null;

    if (intent.intent === 'add_expense') {
      const result = await handleAddExpense(intent, activeTripId, trips, req.user.id);
      responseText = result.responseText;
      newExpense = result.expense;
    } else if (intent.intent === 'query') {
      responseText = await handleQuery(intent, activeTripId, trips, req.user.id, homeCurrency);
    } else {
      responseText =
        "I didn't catch that. Try saying something like 'Add 50 dollars for dinner' or 'What did I spend on food?'";
    }

    // ── Step 4: TTS ──────────────────────────────────────────────────────────
    const audioBase64 = await generateTTS(client, responseText);

    res.json({ transcript, responseText, audioBase64, newExpense });
  } catch (err) {
    console.error('[voice]', err);
    if (err.status) {
      return res.status(502).json({ error: 'AI service unavailable — try again later' });
    }
    res.status(500).json({ error: 'internal server error' });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildIntentPrompt(transcript, today, tripNames) {
  return `You are an expense tracking assistant. The user spoke a command.
Extract the intent and return ONLY valid JSON, no other text.

Intent must be one of: "add_expense" or "query"

For add_expense return:
{ "intent": "add_expense", "amount": number, "currency": "THB|CHF|EUR|USD|GBP|JPY", "category": "food|transport|accommodation|activities|other", "date": "YYYY-MM-DD", "notes": "string", "trip_hint": "string or null" }

For query return:
{ "intent": "query", "type": "total_by_category|total_by_trip|expenses_by_date", "trip_hint": "string or null", "category": "string or null", "date": "YYYY-MM-DD or null" }

Rules:
- Today is ${today}. User's trips: ${tripNames}.
- If currency not mentioned, default to USD.
- If date not mentioned for add_expense, use today (${today}).
- Category must be exactly one of: food, transport, accommodation, activities, other.
- notes should be a short description from the user's words (can be empty string).

User said: "${transcript}"`;
}

async function handleAddExpense(intent, activeTripId, trips, userId) {
  // Resolve trip: active trip in UI → fuzzy hint match → most recent trip
  let tripId = activeTripId;
  if (!tripId && intent.trip_hint) {
    const hint = intent.trip_hint.toLowerCase();
    const match = trips.find(
      t =>
        t.name.toLowerCase().includes(hint) ||
        (t.destination && t.destination.toLowerCase().includes(hint))
    );
    if (match) tripId = match.id;
  }
  if (!tripId && trips.length > 0) tripId = trips[0].id;

  if (!tripId) {
    return { responseText: 'You have no trips yet. Create a trip first.', expense: null };
  }

  const tripName = trips.find(t => t.id === tripId)?.name || 'your trip';
  const category = VALID_CATEGORIES.includes(intent.category) ? intent.category : 'other';
  const currency = VALID_CURRENCIES.includes(intent.currency) ? intent.currency : 'USD';
  const amount = parseFloat(intent.amount);

  if (isNaN(amount) || amount <= 0) {
    return {
      responseText: "I couldn't understand the amount. Please say a number clearly.",
      expense: null,
    };
  }

  const { rows } = await pool.query(
    `INSERT INTO expenses (trip_id, user_id, amount, currency, category, date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, trip_id, amount, currency, category, date, notes, created_at`,
    [tripId, userId, amount, currency, category, intent.date, intent.notes || null]
  );

  const expense = rows[0];
  const responseText = `Added ${amount} ${currency} for ${category} on ${expense.date} to ${tripName}.`;
  return { responseText, expense };
}

async function handleQuery(intent, activeTripId, trips, userId, homeCurrency) {
  // Resolve trip: active trip in UI → fuzzy hint match → let query decide
  let tripId = activeTripId || null;
  if (!tripId && intent.trip_hint) {
    const hint = intent.trip_hint.toLowerCase();
    const match = trips.find(
      t =>
        t.name.toLowerCase().includes(hint) ||
        (t.destination && t.destination.toLowerCase().includes(hint))
    );
    if (match) tripId = match.id;
  }

  if (intent.type === 'total_by_trip') {
    const id = tripId || trips[0]?.id;
    if (!id) return 'You have no trips yet.';
    const tripName = trips.find(t => t.id === id)?.name || 'your trip';
    const { rows } = await pool.query(
      `SELECT SUM(amount) as total, currency FROM expenses
       WHERE trip_id = $1 AND user_id = $2 GROUP BY currency`,
      [id, userId]
    );
    if (rows.length === 0) return `No expenses found for ${tripName}.`;
    const total = rows.reduce((sum, r) => sum + convertToHome(parseFloat(r.total), r.currency, homeCurrency), 0);
    return `Your ${tripName} cost approximately ${total.toFixed(2)} ${homeCurrency}.`;
  }

  if (intent.type === 'total_by_category' && intent.category) {
    const params = [userId, intent.category];
    let query = `SELECT amount, currency, date, notes FROM expenses
                 WHERE user_id = $1 AND category = $2`;
    if (tripId) {
      query += ' AND trip_id = $3';
      params.push(tripId);
    }
    query += ' ORDER BY date ASC';
    const { rows } = await pool.query(query, params);
    if (rows.length === 0) return `No ${intent.category} expenses found.`;

    const total = rows.reduce((sum, r) => sum + convertToHome(parseFloat(r.amount), r.currency, homeCurrency), 0);
    const scope = tripId ? ` in ${trips.find(t => t.id === tripId)?.name}` : '';
    const cat = intent.category;

    if (rows.length <= 5) {
      const items = rows.map(r => {
        const d = new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        return r.notes ? `${r.amount} ${r.currency} for ${r.notes} on ${d}` : `${r.amount} ${r.currency} on ${d}`;
      }).join('; ');
      return `You spent ${total.toFixed(2)} ${homeCurrency} on ${cat}${scope}: ${items}.`;
    }

    return `You spent ${total.toFixed(2)} ${homeCurrency} on ${cat}${scope} across ${rows.length} expenses.`;
  }

  if (intent.type === 'expenses_by_date' && intent.date) {
    const { rows } = await pool.query(
      `SELECT amount, currency, category, notes FROM expenses
       WHERE user_id = $1 AND date = $2 ORDER BY created_at ASC`,
      [userId, intent.date]
    );
    if (rows.length === 0) return `No expenses found on ${intent.date}.`;
    const list = rows.map(r => `${r.amount} ${r.currency} for ${r.category}`).join(', ');
    return `On ${intent.date} you spent: ${list}.`;
  }

  return "I found your trips but couldn't answer that specific question. Try asking for a total or a category breakdown.";
}

async function generateTTS(client, text) {
  try {
    const speech = await client.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    return buffer.toString('base64');
  } catch {
    return null; // TTS failing is non-fatal — text response always present
  }
}

module.exports = router;
