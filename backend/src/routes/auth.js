const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/client');

const router = express.Router();
const SALT_ROUNDS = 12;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
  );
}

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const { exp } = jwt.decode(refreshToken);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, hashToken(refreshToken), new Date(exp * 1000)]
  );

  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );
    const { accessToken, refreshToken } = await issueTokens(rows[0]);
    res.status(201).json({ token: accessToken, refreshToken });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'email already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const { accessToken, refreshToken } = await issueTokens(user);
    res.json({ token: accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    return res.status(401).json({ error: 'invalid or expired refresh token' });
  }

  try {
    // Rotate: delete the old token and verify it existed and wasn't expired
    const { rows } = await pool.query(
      'DELETE FROM refresh_tokens WHERE token_hash = $1 AND user_id = $2 AND expires_at > NOW() RETURNING user_id',
      [hashToken(refreshToken), payload.sub]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'refresh token not found or expired' });
    }

    const { rows: userRows } = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [payload.sub]
    );
    if (!userRows.length) {
      return res.status(401).json({ error: 'user not found' });
    }

    const { accessToken, refreshToken: newRefreshToken } = await issueTokens(userRows[0]);
    res.json({ token: accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      await pool.query(
        'DELETE FROM refresh_tokens WHERE token_hash = $1',
        [hashToken(refreshToken)]
      );
    } catch (err) {
      console.error(err);
    }
  }
  res.status(204).end();
});

module.exports = router;
