'use strict';

const express = require('express');
const multer = require('multer');
const pool = require('../db/client');
const authenticate = require('../middleware/jwt');

const router = express.Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const RATES_TO_USD = {
  USD: 1.0, EUR: 1.04, GBP: 1.25, CHF: 1.12,
  JPY: 0.0065, THB: 0.029, AUD: 0.63, CAD: 0.71, NOK: 0.089, ISK: 0.0071,
};

function toChf(amount, currency) {
  const from = (currency || 'USD').trim().toUpperCase();
  return (+amount * (RATES_TO_USD[from] ?? 1)) / RATES_TO_USD.CHF;
}

// POST /api/voice
// Body: multipart/form-data — field "audio" (wav) + field "trip_id"
router.post('/', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'audio file required (field: audio)' });
  }

  const tripId = req.body.trip_id ? parseInt(req.body.trip_id, 10) : null;
  if (!tripId) {
    return res.status(400).json({ error: 'trip_id required' });
  }

  // Graceful degradation — no API key
  if (!process.env.OPENAI_API_KEY) {
    return res.json({
      transcript: '(mock)',
      responseText: 'Mock mode: OPENAI_API_KEY is not set.',
    });
  }

  try {
    // ── Step 1: Whisper transcription ─────────────────────────────────────────
    const form = new FormData();
    form.append('file', new Blob([req.file.buffer], { type: 'audio/wav' }), 'audio.wav');
    form.append('model', 'Flurin17/whisper-large-v3-turbo-swiss-german');
    form.append('language', 'de');

    const whisperRes = await fetch('https://api.llmhub.infs.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    const whisperJson = await whisperRes.json();
    if (!whisperRes.ok || whisperJson.error) {
      throw Object.assign(
        new Error(`Whisper error: ${JSON.stringify(whisperJson.error ?? whisperJson)}`),
        { status: whisperRes.status }
      );
    }
    const transcript = (whisperJson.text ?? '').trim();

    // ── Step 2: Query trip total in CHF ───────────────────────────────────────
    const { rows } = await pool.query(
      `SELECT SUM(amount) AS total, currency
       FROM expenses
       WHERE trip_id = $1 AND user_id = $2
       GROUP BY currency`,
      [tripId, req.user.id]
    );

    const totalChf = rows.reduce((sum, r) => sum + toChf(parseFloat(r.total), r.currency), 0);
    const responseText = `Ihri Reis het ${totalChf.toFixed(2)} Franke kostet.`;

    res.json({ transcript, responseText });
  } catch (err) {
    console.error('[voice]', err);
    if (err.status) {
      return res.status(502).json({ error: 'AI service unavailable — try again later' });
    }
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
