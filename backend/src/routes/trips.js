'use strict';

const express = require('express');
const pool = require('../db/client');
const authenticate = require('../middleware/jwt');

const router = express.Router();
router.use(authenticate);

// GET /api/trips — list all trips for current user
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, destination, start_date, end_date, created_at FROM trips WHERE user_id = $1 ORDER BY start_date DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/trips — create a new trip
router.post('/', async (req, res) => {
  const { name, destination, start_date, end_date } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO trips (user_id, name, destination, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, destination, start_date, end_date, created_at',
      [req.user.id, name, destination || null, start_date || null, end_date || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// GET /api/trips/:id — single trip with its expenses
router.get('/:id', async (req, res) => {
  const tripId = parseInt(req.params.id, 10);
  if (isNaN(tripId)) {
    return res.status(400).json({ error: 'invalid trip id' });
  }

  try {
    const tripResult = await pool.query(
      'SELECT id, name, destination, start_date, end_date, created_at FROM trips WHERE id = $1 AND user_id = $2',
      [tripId, req.user.id]
    );
    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'trip not found' });
    }

    const expensesResult = await pool.query(
      'SELECT id, amount, currency, category, date, notes, created_at FROM expenses WHERE trip_id = $1 ORDER BY date ASC',
      [tripId]
    );

    res.json({ ...tripResult.rows[0], expenses: expensesResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// DELETE /api/trips/:id — delete trip (cascades expenses via FK)
router.delete('/:id', async (req, res) => {
  const tripId = parseInt(req.params.id, 10);
  if (isNaN(tripId)) {
    return res.status(400).json({ error: 'invalid trip id' });
  }

  try {
    const { rowCount } = await pool.query(
      'DELETE FROM trips WHERE id = $1 AND user_id = $2',
      [tripId, req.user.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'trip not found' });
    }
    res.status(200).json({ message: 'trip deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
