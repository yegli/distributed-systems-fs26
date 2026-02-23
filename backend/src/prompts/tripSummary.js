'use strict';

/**
 * Builds the OpenAI prompt for a trip expense summary.
 * Edit this file to change the tone/format of the AI output.
 */
function buildPrompt({ name, destination, start_date, end_date, total, currencies, breakdown }) {
  const breakdownStr = Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
    .join(', ');

  return `You are a friendly travel finance assistant. Summarize the following trip expenses in 3-4 sentences. Be specific about amounts, highlight the biggest spending category, and add one lighthearted observation.

Trip: ${name} to ${destination || 'an undisclosed destination'}
Dates: ${start_date || 'unknown'} to ${end_date || 'unknown'}
Total spent: $${total.toFixed(2)} (currencies used: ${currencies.join(', ')})
Breakdown by category: ${breakdownStr}`;
}

/**
 * Returns a mock summary when OPENAI_API_KEY is not set.
 * Derived from real trip data so it still looks plausible in demo.
 */
function buildMockSummary({ name, destination, total, breakdown }) {
  const sorted = Object.entries(breakdown).sort(([, a], [, b]) => b - a);
  const [topCat, topAmt] = sorted[0] || ['expenses', 0];
  const categoryCount = sorted.length;

  return (
    `Your trip "${name}"${destination ? ` to ${destination}` : ''} totalled ` +
    `$${total.toFixed(2)} across ${categoryCount} spending ` +
    `${categoryCount === 1 ? 'category' : 'categories'}. ` +
    `The biggest spend was ${topCat} at $${topAmt.toFixed(2)} — clearly a priority! ` +
    `(This is a mock summary — set OPENAI_API_KEY in your .env for a real AI-generated version.)`
  );
}

module.exports = { buildPrompt, buildMockSummary };
