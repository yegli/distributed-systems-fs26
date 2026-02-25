'use strict';

/**
 * Builds the OpenAI prompt for a trip expense summary.
 * Edit this file to change the tone/format of the AI output.
 */
function buildPrompt({ name, destination, start_date, end_date, tripDays, expenseCount, dailyAvgInUSD, currencies, breakdown, topExpense, unusedCategories }) {
  const breakdownStr = Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
    .join(', ');

  const topExpenseStr = topExpense
    ? `${topExpense.amount} ${topExpense.currency} — ${topExpense.category}${topExpense.notes ? ` (${topExpense.notes})` : ''}`
    : 'n/a';

  const unusedStr = unusedCategories.length > 0 ? unusedCategories.join(', ') : 'none';

  return `You are a sharp travel finance analyst. Respond in exactly these four sections.
Use the marker lines exactly as shown (they are parsed programmatically).

[OVERVIEW]
One sentence: total spend, currencies used, trip duration, and daily average.

[TOP CATEGORIES]
Three bullet points (•) for the three highest-spending categories.
Each bullet: category name, total in original currency, percentage of trip total.

[INSIGHTS]
Two or three observations the traveller might not notice from the raw numbers.
Examples: unusually high single-day spend, categories that are suspiciously absent,
whether spend is front- or back-loaded across the trip dates.

[BUDGET TIP]
One specific, actionable tip for this exact trip — not generic advice.
Base it on the actual numbers (e.g. "Your accommodation was 48 % of your budget —
booking 2 weeks earlier typically saves 15–20 % on this route.").

--- data ---
Trip: ${name} to ${destination || 'an undisclosed destination'}
Dates: ${start_date || 'unknown'} to ${end_date || 'unknown'} (${tripDays ? `${tripDays} days` : 'unknown duration'}, ${expenseCount} expenses)
Daily average: ~$${dailyAvgInUSD || 'n/a'}/day (USD equivalent)
Currencies: ${currencies.join(', ')}
Breakdown: ${breakdownStr}
Highest single expense: ${topExpenseStr}
Categories with zero spend: ${unusedStr}`;
}

/**
 * Returns a mock summary when OPENAI_API_KEY is not set.
 * Uses the same four-section format so the frontend always gets identical structure.
 */
function buildMockSummary({ destination, tripDays, expenseCount, dailyAvgInUSD, breakdown, unusedCategories }) {
  const sorted = Object.entries(breakdown).sort(([, a], [, b]) => b - a);
  const totalLocal = sorted.reduce((sum, [, v]) => sum + v, 0);

  const top3 = sorted.slice(0, 3).map(([cat, amt]) => {
    const pct = totalLocal > 0 ? ((amt / totalLocal) * 100).toFixed(0) : 0;
    return `• ${cat.charAt(0).toUpperCase() + cat.slice(1)}: $${amt.toFixed(2)} (${pct}% of total)`;
  });

  const [topCat, topAmt] = sorted[0] || ['expenses', 0];
  const topCatPct = totalLocal > 0 ? ((topAmt / totalLocal) * 100).toFixed(0) : 0;
  const unusedStr = unusedCategories.length > 0 ? unusedCategories.join(' and ') : null;

  return [
    '[OVERVIEW]',
    `This ${destination ? `trip to ${destination}` : 'trip'} spanned ${tripDays || '?'} days with ${expenseCount} expenses totalling ~$${totalLocal.toFixed(2)} (USD equivalent), averaging ~$${dailyAvgInUSD || '?'}/day. (Mock mode — set OPENAI_API_KEY in your .env for real AI analysis.)`,
    '',
    '[TOP CATEGORIES]',
    ...top3,
    '',
    '[INSIGHTS]',
    `${topCat.charAt(0).toUpperCase() + topCat.slice(1)} dominates at ${topCatPct}% of total spend — worth reviewing if you want to cut costs on future trips.${unusedStr ? ` No spend was recorded in ${unusedStr}, which may indicate those costs were covered separately.` : ''}`,
    '',
    '[BUDGET TIP]',
    `Since ${topCat} accounts for ${topCatPct}% of your budget, focusing savings efforts here will have the biggest impact on your overall trip cost.`,
  ].join('\n');
}

module.exports = { buildPrompt, buildMockSummary };
