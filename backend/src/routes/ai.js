'use strict';

const express = require('express');
const OpenAI = require('openai');
const pool = require('../db/client');
const authenticate = require('../middleware/jwt');
const { buildPrompt, buildMockSummary } = require('../prompts/tripSummary');

const router = express.Router();
router.use(authenticate);

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

    // Fetch expenses
    const { rows: expenses } = await pool.query(
      'SELECT amount, currency, category FROM expenses WHERE trip_id = $1',
      [tripId]
    );

    // Aggregate
    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const currencies = [...new Set(expenses.map(e => e.currency.trim()))];
    const breakdown = {};
    for (const e of expenses) {
      breakdown[e.category] = (breakdown[e.category] || 0) + parseFloat(e.amount);
    }

    // Graceful degradation — no API key
    if (!process.env.OPENAI_API_KEY) {
      return res.json({ summary: buildMockSummary({ ...trip, total, breakdown }) });
    }

    // Call OpenAI
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = buildPrompt({ ...trip, total, currencies, breakdown });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    res.json({ summary: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    // OpenAI SDK errors have a .status property
    if (err.status) {
      return res.status(502).json({ error: 'AI service unavailable — try again later' });
    }
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
