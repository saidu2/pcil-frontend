import { quizQuestions } from '../data/mockData'

// answers: array of selected option INDEXES (0-based), one per question in
// quizQuestions order. Score = sum of (index + 1) across all answers,
// matching the source document's own 1/2/3(/4) ascending risk ordering —
// nothing invented, just totalled and bucketed into thirds.
//
// products param: live products fetched from API, passed in from Quiz.jsx
export const getInvestorProfile = (answers, products = []) => {

  // Normalise product fields (handle snake_case and camelCase)
  const normalise = (p) => ({
    ...p,
    name:             p.product_name || p.name || '',
    roi:              p.product_roi  || p.roi  || '',
    minAmountDisplay: p.min_amount_display || p.minAmountDisplay || '',
    category:         p.product_category  || p.category || '',
    risk:             p.risk || '',
  })
  const all = products.map(normalise)

  // ── Score ────────────────────────────────────────────────────────────
  const score = answers.reduce((sum, idx) => sum + (Number(idx) + 1), 0)
  const minScore = quizQuestionsScoreBounds().min
  const maxScore = quizQuestionsScoreBounds().max
  const pct = maxScore > minScore ? (score - minScore) / (maxScore - minScore) : 0

  let tier
  if (pct < 1 / 3) tier = 'Conservative'
  else if (pct < 2 / 3) tier = 'Balanced'
  else tier = 'Aggressive'

  // ── Indicative split — adjustable with a portfolio manager, not fixed ──
  const SPLITS = {
    Conservative: { fixedIncome: 80, equities: 20 },
    Balanced:     { fixedIncome: 50, equities: 50 },
    Aggressive:   { fixedIncome: 20, equities: 80 },
  }
  const split = SPLITS[tier]

  const TIER_META = {
    Conservative: {
      color: '#4ade80',
      emoji: '🛡️',
      desc: 'Your answers suggest capital preservation and stability matter most to you, with a lower tolerance for short-term declines in value.',
    },
    Balanced: {
      color: '#facc15',
      emoji: '⚖️',
      desc: 'Your answers suggest you\'re comfortable balancing growth with some short-term fluctuation, without taking on the highest levels of risk.',
    },
    Aggressive: {
      color: '#f87171',
      emoji: '🚀',
      desc: 'Your answers suggest you\'re focused on long-term capital growth and are comfortable with significant short-term fluctuation in pursuit of it.',
    },
  }
  const meta = TIER_META[tier]

  // Products at a matching risk tier, shown as concrete real examples
  // alongside the generic indicative split above.
  const suggested = all.filter(p => (p.risk || '').toLowerCase() === tier.toLowerCase()).slice(0, 3)

  return {
    label: tier,
    color: meta.color,
    emoji: meta.emoji,
    desc: meta.desc,
    split,
    suggested,
  }
}

// Total possible score range across every quiz question — computed from
// quizQuestions itself rather than hardcoded, so it stays correct
// automatically if a question is ever added, removed, or given more
// options.
function quizQuestionsScoreBounds() {
  const min = quizQuestions.length * 1
  const max = quizQuestions.reduce((sum, q) => sum + q.options.length, 0)
  return { min, max }
}

export const formatNGN = (v) =>
  '₦' + Number(v).toLocaleString('en-NG')

export const formatUSD = (v) =>
  'USD ' + Number(v).toLocaleString('en-US')
