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

export const quizQuestions = [
  {
    q: 'What is your primary investment objective?',
    options: [
      'Protect my capital and earn steady returns',
      'Grow my wealth steadily over time',
      'Hedge against Naira depreciation and earn in US Dollars',
      'Maximise long-term returns with active management',
    ],
  },
  {
    q: 'How long are you comfortable keeping your money invested?',
    options: [
      'Less than 90 days',
      '90 days to 1 year',
      '1 to 3 years',
      'More than 3 years',
    ],
  },
  {
    q: 'How would you react if your investment returns were lower than expected in a given year?',
    options: [
      'I would withdraw immediately, I cannot accept below-target returns',
      'I would be concerned but would wait to see the next quarter',
      'I understand returns can vary and would stay invested',
      'I would invest more as lower returns today mean a better opportunity',
    ],
  },
  {
    q: 'Which currency would you prefer your investment to be denominated in?',
    options: [
      'Nigerian Naira only',
      'US Dollar only',
      'I am open to either currency',
      'I would like to split between both currencies',
    ],
  },
  {
    q: 'Do you have any preference for Islamic (Sharia-compliant) investments?',
    options: [
      'I require Sharia-compliant investments only',
      'I prefer Sharia-compliant where possible',
      'No preference, conventional is fine',
      'I prefer conventional investments only',
    ],
  },
  {
    q: 'How involved do you want to be in deciding how your money is invested?',
    options: [
      'I want Prime Capital to manage everything on my behalf',
      'I want to provide direction on how my funds are allocated',
      'I am not sure and would like guidance',
      'I am comfortable with either approach',
    ],
  },
  {
    q: 'What proportion of your savings are you planning to invest?',
    options: [
      'Less than 10 percent',
      '10 to 25 percent',
      '25 to 50 percent',
      'More than 50 percent',
    ],
  },
  {
    q: 'Which best describes your income and investor profile?',
    options: [
      'Fixed salary or pension with preference for predictable returns',
      'Salary plus other income and comfortable with moderate risk',
      'Business owner or entrepreneur seeking growth',
      'High Net Worth Individual or institutional investor seeking premium products',
    ],
  },
]
