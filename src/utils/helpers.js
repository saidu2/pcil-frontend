// products param: live products fetched from API, passed in from Quiz.jsx
// answers index map (8 questions):
//   0 - investment objective
//   1 - investment duration
//   2 - reaction to below-target returns
//   3 - currency preference (0=NGN, 1=USD, 2=either, 3=split)
//   4 - Sharia preference (0=require, 1=prefer, 2=no pref, 3=conventional)
//   5 - management style (0=discretionary, 1=non-discretionary, 2=not sure, 3=mix)
//   6 - proportion of savings
//   7 - income/investor profile
export const getInvestorProfile = (answers, shariaPreference, products = []) => {

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

  const isUSD     = (p) => p.currency === 'USD'
  const isDisc    = (p) => {
    const d = (p.discretionary || '').toLowerCase()
    return d.includes('discretionary') && !d.includes('non')
  }
  const isNonDisc = (p) => (p.discretionary || '').toLowerCase().includes('non')

  // Key signals from answers
  const wantsUSD     = answers[3] === 1 || answers[3] === 3
  const wantsSharia  = answers[4] !== undefined && answers[4] <= 1
  const wantsConv    = answers[4] === 3
  const wantsDisc    = answers[5] === 0
  const wantsNonDisc = answers[5] === 1
  const notSure      = answers[5] === 2 || answers[5] === 3

  // Build result description based on signals
  const shariaNote = wantsSharia
    ? 'You have indicated a preference for Sharia-compliant investments. Our portfolio products are available in both conventional and Sharia-compliant structures.'
    : wantsConv
    ? 'You prefer conventional investment structures.'
    : ''

  const mgmtNote = wantsDisc
    ? 'You prefer to have Prime Capital manage your portfolio on your behalf (Discretionary).'
    : wantsNonDisc
    ? 'You prefer to provide direction on how your funds are allocated (Non-Discretionary).'
    : 'You are open to either discretionary or non-discretionary management.'

  // Select recommended products based on signals
  const getSuggested = () => {
    // Signal 1: USD preference -> Dollar Fund first
    if (wantsUSD) {
      const dollar = all.filter(isUSD)
      const ngn    = all.filter(p => !isUSD(p))
      return [...dollar, ...ngn].slice(0, 3)
    }

    // Signal 2: Management style -> filter NGN portfolio products
    const ngnProducts = all.filter(p => !isUSD(p))
    if (wantsDisc) {
      const disc = ngnProducts.filter(isDisc)
      return disc.length ? disc.slice(0, 3) : ngnProducts.slice(0, 3)
    }
    if (wantsNonDisc) {
      const nonDisc = ngnProducts.filter(isNonDisc)
      return nonDisc.length ? nonDisc.slice(0, 3) : ngnProducts.slice(0, 3)
    }

    // Not sure or mix: show all products
    return all.slice(0, 3)
  }

  // Profile label
  const mgmtTag   = wantsDisc ? 'Discretionary' : wantsNonDisc ? 'Non-Discretionary' : 'Portfolio'
  const shariaTag = wantsSharia ? ' (Sharia)' : wantsConv ? ' (Conventional)' : ''
  const usdLabel  = wantsUSD ? 'Dollar Fund' : `${mgmtTag}${shariaTag}`

  const desc = [
    wantsUSD
      ? 'You prefer USD-denominated investments, making the Dollar Fund the ideal fit for your goals.'
      : `You are suited to our ${mgmtTag} Portfolio${shariaTag}.`,
    shariaNote,
    wantsUSD ? '' : mgmtNote,
  ].filter(Boolean).join(' ')

  return {
    label: usdLabel,
    color: wantsUSD ? '#60a5fa' : wantsSharia ? '#4ade80' : '#facc15',
    emoji: wantsUSD ? '💵' : wantsSharia ? '☪️' : '📊',
    desc,
    suggested: getSuggested(),
  }
}

export const formatNGN = (v) =>
  '₦' + Number(v).toLocaleString('en-NG')

export const formatUSD = (v) =>
  'USD ' + Number(v).toLocaleString('en-US')
