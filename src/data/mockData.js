// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export const products = [

  // ── ETHICAL (SHARIA) ──────────────────────────────────────────────────
  {
    id: 1,
    name: 'Prime Al-Amanah (Al-Wakala)',
    category: 'Ethical',
    type: 'Sharia',
    currency: 'NGN',
    discretionary: 'Non-Discretionary',
    minAmount: 500_000_000,
    minAmountDisplay: '₦500,000,000',
    roi: '~12-16% p.a. (indicative)',
    duration: 'Customised',
    risk: 'Custom',
    targetInvestors: 'HNI | Institutional',
    description:
      'A premium non-collective Wakala investment structured for high net worth individuals and institutional investors. Assets are managed under an Islamic agency arrangement with a fully customised mandate aligned to client objectives.',
    features: ['Wakala structure', 'Customised portfolio mandate', 'Shariah-compliant assets', 'Premium wealth management'],
  },
  {
    id: 2,
    name: 'Prime Al-Barakah (Non-Discretionary)',
    category: 'Ethical',
    type: 'Sharia',
    currency: 'NGN',
    discretionary: 'Non-Discretionary',
    minAmount: 50_000_000,
    minAmountDisplay: '₦50,000,000',
    roi: '~10-14% p.a. (indicative)',
    duration: 'Flexible',
    risk: 'Balanced',
    targetInvestors: 'HNI | Institutional',
    description:
      'A Mudarabah-based non-discretionary investment product for HNIs and institutional investors seeking ethical, non-interest investment opportunities. Investments are placed in approved Shariah-compliant instruments aligned to client direction.',
    features: ['Mudarabah structure', 'Non-discretionary mandate', 'Shariah-compliant', 'No riba (interest)'],
  },
  {
    id: 3,
    name: 'Prime Al-Barakah (Discretionary)',
    category: 'Ethical',
    type: 'Sharia',
    currency: 'NGN',
    discretionary: 'Discretionary',
    minAmount: 5_000_000,
    minAmountDisplay: '₦5,000,000',
    roi: '~10-14% p.a. (indicative)',
    duration: 'Flexible',
    risk: 'Balanced',
    targetInvestors: 'Retail | HNI',
    description:
      'A general-purpose Mudarabah discretionary investment product suitable for a broad range of investors seeking ethical, non-interest investment opportunities. The fund manager actively manages asset allocation within a Shariah-compliant framework.',
    features: ['Mudarabah structure', 'Discretionary management', 'Shariah-compliant', 'Broad investor eligibility'],
  },
  {
    id: 4,
    name: 'Prime Kids Al-Barakah',
    category: 'Ethical',
    type: 'Sharia',
    currency: 'NGN',
    discretionary: 'Discretionary',
    minAmount: 500_000,
    minAmountDisplay: '₦500,000',
    roi: '~8-12% p.a. (indicative)',
    duration: 'Long-Term',
    risk: 'Conservative',
    targetInvestors: 'Parents | Guardians',
    description:
      'Specially created for parents and guardians to invest towards their children\'s future. A Mudarabah discretionary variant with the lowest entry point, making Shariah-compliant family financial planning accessible to all.',
    features: ['Child-focused mandate', 'Mudarabah structure', 'Shariah-compliant', 'Long-term wealth building'],
  },
  {
    id: 5,
    name: 'Prime Women Al-Barakah',
    category: 'Ethical',
    type: 'Sharia',
    currency: 'NGN',
    discretionary: 'Discretionary',
    minAmount: 1_000_000,
    minAmountDisplay: '₦1,000,000',
    roi: '~8-12% p.a. (indicative)',
    duration: 'Flexible',
    risk: 'Balanced',
    targetInvestors: 'Women Investors',
    description:
      'A Mudarabah discretionary variant that caters to the specific financial needs and aspirations of women investors, empowering them to achieve their financial goals through ethical, Shariah-compliant investments.',
    features: ['Women-focused mandate', 'Mudarabah structure', 'Shariah-compliant', 'Empowerment-driven'],
  },

  // ── FIXED INCOME ─────────────────────────────────────────────────────
  {
    id: 6,
    name: 'Prime Steady Income',
    category: 'Fixed Income',
    type: 'Conventional',
    currency: 'NGN',
    discretionary: 'Non-Discretionary',
    minAmount: 5_000_000,
    minAmountDisplay: '₦5,000,000',
    roi: '~14-18% p.a. (indicative)',
    duration: 'Flexible',
    risk: 'Conservative',
    targetInvestors: 'Retail | HNI | Institutional',
    description:
      'Designed to provide investors with steady and consistent income over the life of the investment while maintaining capital stability. Ideal for those who prioritise predictable returns with low risk exposure.',
    features: ['Capital stability', 'Regular income payments', 'Flexible tenure', 'Low risk exposure'],
  },

  // ── FX / DOLLAR ───────────────────────────────────────────────────────
  {
    id: 7,
    name: 'Prime Dollar',
    category: 'FX / Dollar',
    type: 'Conventional',
    currency: 'USD',
    discretionary: 'Non-Discretionary',
    minAmount: 5000,
    minAmountDisplay: 'USD 5,000',
    roi: '~6-10% p.a. (indicative)',
    duration: 'Flexible',
    risk: 'Conservative',
    targetInvestors: 'Retail | HNI | Diaspora',
    description:
      'A non-discretionary dollar-denominated investment product designed to protect and grow wealth in US Dollars. Ideal for investors seeking a hedge against Naira depreciation and consistent USD returns.',
    features: ['USD denomination', 'Naira depreciation hedge', 'Capital protection focus', 'Accessible to diaspora'],
  },

  // ── EQUITY ────────────────────────────────────────────────────────────
  {
    id: 8,
    name: 'Prime Alpha Equity',
    category: 'Equity',
    type: 'Conventional',
    currency: 'NGN',
    discretionary: 'Non-Discretionary',
    minAmount: 0,
    minAmountDisplay: 'Open to all',
    roi: '~15-25% p.a. (market-linked)',
    duration: 'Long-Term',
    risk: 'Aggressive',
    targetInvestors: 'Retail | HNI | Institutional',
    description:
      'An equity investment focused on stocks of companies with strong growth prospects expected to outperform the market due to superior fundamentals, competitive advantage, and market positioning. Suited for investors seeking high returns and comfortable with elevated risk.',
    features: ['Growth stock focus', 'Superior fundamentals screening', 'Market outperformance target', 'Professional equity management'],
  },
  {
    id: 9,
    name: 'Prime Steady Equity',
    category: 'Equity',
    type: 'Conventional',
    currency: 'NGN',
    discretionary: 'Non-Discretionary',
    minAmount: 0,
    minAmountDisplay: 'Open to all',
    roi: '~10-18% p.a. (market-linked)',
    duration: 'Medium to Long-Term',
    risk: 'Balanced',
    targetInvestors: 'Retail | HNI | Institutional',
    description:
      'A steady equity product focused on fundamentally sound companies with consistent earnings, stable dividends, and resilient business models. Designed for investors who want equity market exposure with relatively lower volatility.',
    features: ['Steady dividend focus', 'Resilient business models', 'Lower volatility equity', 'Consistent earnings screening'],
  },
]

export const PIE_COLORS = ['#B8860B', '#D4A017', '#8B6914', '#F0C040', '#c49a20', '#e8b84b']

// ─── QUIZ ─────────────────────────────────────────────────────────────────────
// Sourced directly from the PCIL Investor Risk Questionnaire document.
// Only the genuinely single-choice, ascending-risk-ordered questions are
// included — the document also has a holdings table, a checklist, a
// ranking exercise, a knowledge grid, and a free-text section, none of
// which fit a "pick one" screen or contribute a clean numeric score, so
// they're intentionally not part of this scored quiz. Options keep the
// document's own 1/2/3(/4) ordering — later option = higher risk score.

export const quizQuestions = [
  // ── Section B: Ability to Bear Risk ──────────────────────────────────
  {
    section: 'Ability to Bear Risk',
    q: 'What is your age range?',
    options: ['Above 55 years', '35 to 55 years', 'Below 35'],
  },
  {
    section: 'Ability to Bear Risk',
    q: 'What is your estimated current financial position?',
    options: ['Less than ₦50m', 'More than ₦50m but less than ₦400m', 'More than ₦400m'],
  },
  {
    section: 'Ability to Bear Risk',
    q: 'What portion of your estimated financial position is in liquid assets (cash, money market instruments and equities)?',
    options: ['Less than 5%', 'More than 5% but less than 30%', 'More than 30%'],
  },
  {
    section: 'Ability to Bear Risk',
    q: 'What will be the use of proceeds of investments?',
    options: ['To offset living expenses', 'Future needs & obligations', 'Speculative capital'],
  },
  {
    section: 'Ability to Bear Risk',
    q: 'What is your investment time horizon?',
    options: ['0 – 5 years', '5 – 10 years', '10 – 20 years', 'More than 20 years'],
  },
  {
    section: 'Ability to Bear Risk',
    q: 'Please choose from the most applicable option:',
    options: [
      'I will need access to my investments at any given point in time.',
      'I will need to withdraw more than 50% to 70% of my investments in the next two to three years.',
      'I do not need to withdraw my investments to meet my liquidity needs.',
    ],
  },

  // ── Section C: Willingness to Take Risk ──────────────────────────────
  {
    section: 'Willingness to Take Risk',
    q: 'What is your investment objective?',
    options: [
      'My core objective is to protect the value of my capital, e.g. fixed deposits and money market collective investment schemes managed by professionals.',
      'My objective is to achieve moderate capital growth on my investments, e.g. partial exposure to equities or investment in an equity collective investment scheme managed by professionals.',
      'My objective is to achieve substantial capital growth on my investments, e.g. direct investments in Equities.',
    ],
  },
  {
    section: 'Willingness to Take Risk',
    q: 'What is your perspective to risk?',
    options: [
      'I am not comfortable in taking any investment risk.',
      'I am only comfortable in taking a moderate level of investment risk, with indicative recovery period of 1 – 2 years.',
      'I am willing to take high levels of investment risk, with comparable high return, with indicative recovery period of 3 – 5 years.',
    ],
  },
  {
    section: 'Willingness to Take Risk',
    q: 'How would a decline in the value of your investments affect you?',
    options: [
      'I am not willing to accept declines in the value of my investment as capital preservation is my primary objective.',
      'I am willing to accept moderate declines, but I am not comfortable with extreme drops in the value of my investments.',
      'I am prepared to take losses and large fluctuations in the value of my investments in order to maximize my long-term returns.',
    ],
  },
]
