'use strict';

const express = require('express');
const pool = require('../db/client');
const authenticate = require('../middleware/jwt');

const router = express.Router();
router.use(authenticate);

const VALID_CATEGORIES = ['food', 'transport', 'accommodation', 'activities', 'other'];

// GET /api/expenses — all expenses for current user, optional ?trip_id= filter
router.get('/', async (req, res) => {
  const tripId = req.query.trip_id ? parseInt(req.query.trip_id, 10) : null;
  if (req.query.trip_id !== undefined && isNaN(tripId)) {
    return res.status(400).json({ error: 'invalid trip_id' });
  }

  try {
    let query, params;
    if (tripId !== null) {
      query = `
        SELECT e.id, e.trip_id, e.amount, e.currency, e.category, e.date, e.notes, e.created_at
        FROM expenses e
        JOIN trips t ON t.id = e.trip_id
        WHERE e.trip_id = $1 AND e.user_id = $2
        ORDER BY e.date ASC`;
      params = [tripId, req.user.id];
    } else {
      query = `
        SELECT e.id, e.trip_id, e.amount, e.currency, e.category, e.date, e.notes, e.created_at
        FROM expenses e
        WHERE e.user_id = $1
        ORDER BY e.date ASC`;
      params = [req.user.id];
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/expenses — create a new expense
router.post('/', async (req, res) => {
  const { trip_id, amount, currency, category, date, notes } = req.body;

  if (!trip_id || amount === undefined || !category || !date) {
    return res.status(400).json({ error: 'trip_id, amount, category, and date are required' });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  try {
    // Verify the trip belongs to the current user
    const tripCheck = await pool.query(
      'SELECT id FROM trips WHERE id = $1 AND user_id = $2',
      [trip_id, req.user.id]
    );
    if (tripCheck.rows.length === 0) {
      return res.status(404).json({ error: 'trip not found' });
    }

    const { rows } = await pool.query(
      `INSERT INTO expenses (trip_id, user_id, amount, currency, category, date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, trip_id, amount, currency, category, date, notes, created_at`,
      [trip_id, req.user.id, parsedAmount, currency || 'USD', category, date, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// DELETE /api/expenses/:id — delete a single expense
router.delete('/:id', async (req, res) => {
  const expenseId = parseInt(req.params.id, 10);
  if (isNaN(expenseId)) {
    return res.status(400).json({ error: 'invalid expense id' });
  }

  try {
    const { rowCount } = await pool.query(
      'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
      [expenseId, req.user.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'expense not found' });
    }
    res.status(200).json({ message: 'expense deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
