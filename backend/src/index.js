require('dotenv').config();
const express = require('express');
const authRouter = require('./routes/auth');
const tripsRouter = require('./routes/trips');
const expensesRouter = require('./routes/expenses');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = 3000;
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'api';

app.use(express.json());

// Identify which instance handled each request — useful for failover demo
app.use((_req, res, next) => {
  res.setHeader('X-Served-By', INSTANCE_NAME);
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', instance: INSTANCE_NAME });
});

app.use('/api/auth', authRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/trips', aiRouter);
app.use('/api/expenses', expensesRouter);

app.listen(PORT, () => {
  console.log(`[${INSTANCE_NAME}] listening on port ${PORT}`);
});
