'use strict';

const express = require('express');
const OpenAI = require('openai');
const pool = require('../db/client');
const authenticate = require('../middleware/jwt');
const { buildPrompt, buildMockSummary } = require('../prompts/tripSummary');

const router = express.Router();
router.use(authenticate);

const ALL_CATEGORIES = ['food', 'transport', 'accommodation', 'activities', 'other'];

const RATES_TO_USD = {
  USD: 1.0, EUR: 1.04, GBP: 1.25, CHF: 1.12,
  JPY: 0.0065, THB: 0.029, AUD: 0.63, CAD: 0.71, NOK: 0.089, ISK: 0.0071,
};
const toUSD = (amount, currency) =>
  parseFloat(amount) * (RATES_TO_USD[(currency || 'USD').trim().toUpperCase()] ?? 1);

// GET /api/trips/:id/summary
router.get('/:id/summary', async (req, res) => {
  const tripId = parseInt(req.params.id, 10);
  if (isNaN(tripId)) {
    return res.status(400).json({ error: 'invalid trip id' });
  }

  try {
    // Verify ownership
    const tripResult = await pool.query(
      'SELECT id, name, destination, start_date, end_date FROM trips WHERE id = $1 AND user_id = $2',
      [tripId, req.user.id]
    );
    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'trip not found' });
    }
    const trip = tripResult.rows[0];

    // Fetch expenses — include date + notes for richer context
    const { rows: expenses } = await pool.query(
      'SELECT amount, currency, category, date, notes FROM expenses WHERE trip_id = $1',
      [tripId]
    );

    // Base aggregates
    const currencies = [...new Set(expenses.map(e => e.currency.trim()))];
    const breakdown = {};
    for (const e of expenses) {
      breakdown[e.category] = (breakdown[e.category] || 0) + parseFloat(e.amount);
    }

    // Extended aggregates
    const expenseCount = expenses.length;
    const s  = trip.start_date ? new Date(trip.start_date) : null;
    const en = trip.end_date   ? new Date(trip.end_date)   : null;
    const tripDays = s && en ? Math.round((en - s) / 86400000) + 1 : null;

    const totalUSD = expenses.reduce((sum, e) => sum + toUSD(e.amount, e.currency), 0);
    const dailyAvgInUSD = tripDays ? (totalUSD / tripDays).toFixed(2) : null;

    const topExpense = expenses.length > 0
      ? expenses.reduce((top, e) => toUSD(e.amount, e.currency) > toUSD(top.amount, top.currency) ? e : top)
      : null;

    const unusedCategories = ALL_CATEGORIES.filter(c => !breakdown[c]);

    const ctx = { ...trip, expenseCount, tripDays, dailyAvgInUSD, currencies, breakdown, topExpense, unusedCategories };

    // Graceful degradation — no API key
    if (!process.env.OPENAI_API_KEY) {
      return res.json({ summary: buildMockSummary(ctx) });
    }

    // Call OpenAI
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = buildPrompt(ctx);

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.65,
    });

    res.json({ summary: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    if (err.status) {
      return res.status(502).json({ error: 'AI service unavailable — try again later' });
    }
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
