import { useState, useRef, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { KYC_STATUS } from '../data/constants'
import { GoldButton, Card, Modal } from '../components/UI'
import STATES_LGAS from '../data/nigeriaLGAs.json'

// ── Helpers ────────────────────────────────────────────────────────────────────

const NIGERIAN_STATES = STATES_LGAS.map(s => s.state)
const getLgas = (state) => {
  const found = STATES_LGAS.find(s => s.state === state)
  return found ? found.lgas : []
}

// ── Field validation helpers ──────────────────────────────────────────────────
const onlyDigits    = (e, maxLen) => { const v = e.target.value.replace(/\D/g, ''); return maxLen ? v.slice(0, maxLen) : v }
const onlyLetters   = (e) => e.target.value.replace(/[^a-zA-Z\s\-']/g, '')
const onlyAlphaNum  = (e) => e.target.value.replace(/[^a-zA-Z0-9\s\-]/g, '')
const onlyPositive  = (e) => e.target.value.replace(/[^0-9.]/g, '')

// Live thousand-separator formatting for "Amount in Figures" — the raw,
// comma-free value is what's actually stored/sent to the backend; this is
// purely a display formatter so commas appear as the client types, instead
// of only showing up later in the downloaded PDF.
const formatWithCommas = (val) => {
  if (!val) return ''
  const [intPart, decPart] = String(val).split('.')
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas
}

const BANKS = [
  'Access Bank','Citibank','Ecobank','Fidelity Bank','First Bank','First City Monument Bank',
  'Guaranty Trust Bank','Heritage Bank','Keystone Bank','Polaris Bank','Providus Bank',
  'Stanbic IBTC Bank','Standard Chartered','Sterling Bank','Union Bank','United Bank for Africa',
  'Unity Bank','Wema Bank','Zenith Bank',
]

const TITLES = ['Mr','Mrs','Miss','Dr','Prof','Alhaji','Alhaja','Chief','Engr','Barr']

const COMPANY_CATEGORIES = [
  'Partnership','Limited Liability Company','Club/Association',
  'Public Listed Company','Ministry, Department & Agencies (MDAs)',
  'Sole Proprietorship','Cooperative/Mutual Society','Schools',
  'Others/Trust/Foundation','Estate',
]

// ── Reusable field components ──────────────────────────────────────────────────

function FieldGroup({ title, children, gold = false }) {
  return (
    <div className="mb-8">
      <div style={{
        background: gold ? 'linear-gradient(135deg,#A67C1A,#D4A017)' : 'var(--bg-secondary)',
        borderRadius: 12, padding: '10px 16px', marginBottom: 20,
      }}>
        <h3 className="font-bold text-sm tracking-wide" style={{ color: gold ? '#fff' : '#A67C1A' }}>
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function Field({ label, required, full, children }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: '#A67C1A' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
  borderRadius: 10, color: 'var(--text-primary)', fontSize: 14,
  outline: 'none', transition: 'border-color 0.2s',
}

function TInput({ value, onChange, placeholder, type = 'text', required, disabled, maxLength, inputMode }) {
  return (
    <input value={value} onChange={onChange} placeholder={placeholder}
      type={type} required={required} disabled={disabled}
      maxLength={maxLength} inputMode={inputMode}
      style={inputStyle}
      onFocus={e => e.target.style.borderColor = '#A67C1A'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    />
  )
}

function TSelect({ value, onChange, children, required }) {
  return (
    <select value={value} onChange={onChange} required={required}
      autoComplete="off"
      style={{ ...inputStyle, cursor: 'pointer' }}
      onFocus={e => e.target.style.borderColor = '#A67C1A'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}>
      {children}
    </select>
  )
}

function RadioGroup({ label, options, value, onChange, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="flex flex-wrap gap-3">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name={label} value={opt}
              checked={value === opt} onChange={() => onChange(opt)}
              style={{ accentColor: '#A67C1A' }} />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function CheckboxGroup({ label, options, value = [], onChange, full }) {
  const toggle = (opt) => {
    const next = value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]
    onChange(next)
  }
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="flex flex-wrap gap-3">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)}
              style={{ accentColor: '#A67C1A' }} />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function validateFile(file) {
  if (!file) return null
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return 'Invalid file type. Only JPG, PNG or PDF allowed.'
  if (file.size > MAX_FILE_SIZE) return 'File too large. Maximum size is 5MB.'
  return null
}

function UploadField({ label, value, onChange, required, hint }) {
  const ref = useRef()
  const [fileError, setFileError] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const err = validateFile(file)
    if (err) { setFileError(err); e.target.value = ''; return }
    setFileError(null)
    onChange(file)
  }

  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: '#A67C1A' }}> *</span>}
      </label>
      {fileError && <p style={{ color: '#ef4444', fontSize: 11, marginBottom: 6, fontWeight: 600 }}>⚠ {fileError}</p>}
      <div
        onClick={() => ref.current.click()}
        style={{
          border: `2px dashed ${fileError ? '#ef4444' : value ? '#A67C1A' : 'var(--border)'}`,
          borderRadius: 10, padding: '16px', cursor: 'pointer',
          background: value ? 'rgba(184,134,11,0.05)' : 'var(--bg-secondary)',
          transition: 'all 0.2s', textAlign: 'center',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#A67C1A'}
        onMouseLeave={e => e.currentTarget.style.borderColor = fileError ? '#ef4444' : value ? '#A67C1A' : 'var(--border)'}
      >
        <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
          onChange={handleFileChange} />
        {value ? (
          <div>
            <div className="text-xl mb-1">✅</div>
            <p className="text-xs font-semibold" style={{ color: '#A67C1A' }}>{value.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Click to change</p>
          </div>
        ) : (
          <div>
            <div className="text-2xl mb-1">📎</div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Click to upload
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {hint || 'JPG, PNG or PDF · Max 5MB'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function PepField({ value, onChange, detailsValue, onDetailsChange, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : 'sm:col-span-2'}>
      <div style={{ background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.2)', borderRadius: 12, padding: 16 }}>
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Are you a Politically Exposed Person (PEP)? <span style={{ color: '#A67C1A' }}>*</span>
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          PEPs are persons who are or have been in prominent public positions (Heads of State, Governors, Politicians, Government Officials, Military Officials, etc.) in Nigeria or foreign countries, including their relatives and close associates.
        </p>
        <div className="flex gap-4 mb-3">
          {['Yes', 'No'].map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={opt} checked={value === opt}
                onChange={() => onChange(opt)} style={{ accentColor: '#A67C1A' }} />
              <span className="text-sm font-semibold" style={{ color: value === opt ? '#A67C1A' : 'var(--text-primary)' }}>{opt}</span>
            </label>
          ))}
        </div>
        {value === 'Yes' && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Please provide details <span style={{ color: '#A67C1A' }}>*</span>
            </label>
            <textarea value={detailsValue} onChange={e => onDetailsChange(e.target.value)}
              placeholder="Describe your political position or exposure..."
              rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Terms & Conditions content ─────────────────────────────────────────────────
const TC_CLAUSES = [
  { num: 1, title: 'Introduction / General Clause', text: 'By subscribing to the Prime Capital & Investment Limited Account (the "Account"), the Client agrees to abide by the following terms and conditions, which govern the investment relationship between Prime Capital & Investment Limited (the "PCIL") and the Client.' },
  { num: 2, title: 'Scope of Services', text: 'The scope of services includes a range of investment options such as money market instruments, fixed income securities, multi-asset portfolios and ethical compliant products tailored to meet various risk profiles and investment strategies. Additionally, it offers discretionary and non-discretionary portfolios and access to alternative investments like real estate, private equity and venture capital for those qualified.' },
  { num: 3, title: 'Anti-Money Laundering', text: 'The Client agrees that all his/her/its transactions will be subject to all relevant Anti-Money Laundering Laws and Regulations.' },
  { num: 4, title: 'Fees & Services', text: 'The Client shall pay PCIL such management, performance or other fees as are expressly disclosed in the relevant product prospectus.' },
  { num: 5, title: 'Data Protection Clause', text: 'I hereby affirm that in line with the relevant laws on Data Protection in Nigeria, I consent to the collection and processing of my personal data/information for the purpose of forming the basis of this account opening. I affirm that I am aware of my rights under the relevant Data Protection Laws in Nigeria which include the right to request for access, amendment, rectification or cancellation of my personal data, the right to lodge complaint with the relevant authority as well as the right to object to the processing of my personal data.' },
  { num: 6, title: 'Operation of Investment Account', text: 'The account shall be operated in accordance with the existing laws, rules and regulations in Nigeria. Minimum investment shall be Five Hundred Thousand Naira (NGN 500,000) and a minimum tenure shall be Ninety (90) Days. All investments shall be made by deposit or transfer into PCIL\'s dedicated account. Third Party Payment: the Client agrees that payments of proceeds of investments from his/her/its account shall be made to a third party only on a written instruction and as permitted by SEC Rules.' },
  { num: 7, title: 'Liquidation Notices', text: 'A minimum notice period of 5 working days is required for the liquidation of any investment. For premature liquidation (before the agreed investment tenor), a penalty of 20% will be applied on the accrued profit/income up to the date of liquidation. No penalties apply where the investment has reached maturity and is liquidated in line with the original terms.' },
  { num: 8, title: 'Update', text: 'The Client agrees to notify PCIL immediately of any change in the details provided to PCIL or at the request of PCIL, update his/her records.' },
  { num: 9, title: 'Force Majeure Clause', text: 'In the event of any failure, interruption or delay in performance of our obligations resulting from acts, events or circumstances not reasonably within our control, we shall not be liable or have any responsibility of any kind for any loss or damage thereby incurred or suffered by you.' },
  { num: 10, title: 'Liability & Indemnity Clause', text: 'The Client agrees that PCIL shall not be liable for any losses unless caused by negligence, misconduct, or breach of contract.' },
  { num: 11, title: 'Account Statements', text: 'The Client will receive monthly statement of accounts and at any time on the client\'s request. The Client undertakes to report to PCIL any errors in the investment certificate issued within 3 business days of receipt.' },
  { num: 12, title: 'Transaction Payment & Processing', text: 'You warrant that the designated bank account details supplied to PCIL are true and correct. Transaction processing may take up to 24-48 working hours (or 24-72 hours for Mutual Funds) upon expiration of the 5 working days liquidation notice.' },
  { num: 13, title: 'Applicable Taxes Deduction', text: 'The Client has agreed that returns on his/her investments are subject to tax deductions under the relevant tax law in Nigeria.' },
  { num: 14, title: 'Foreign Currency Risk', text: 'Exchange rate fluctuations may affect income or loss earned in foreign currency denominated transactions. Market transactions in foreign jurisdictions may further increase risk exposure.' },
  { num: 15, title: 'Confidentiality', text: 'All information relating to the account shall remain confidential and shall not be disclosed by PCIL to third parties without the Client\'s written instructions, except as required by regulatory or other legal authority.' },
  { num: 16, title: 'Governing Law & Dispute Resolution', text: 'These Terms shall be governed by and construed in accordance with Nigerian law. Any disputes shall be settled amicably through Mediation. If unresolved, such dispute shall be submitted to a court of competent jurisdiction in accordance with the laws of the Federal Republic of Nigeria.' },
  { num: 17, title: 'Amendments', text: 'PCIL reserves the right to update or modify these terms as necessary, with prior notice given to the Client.' },
  { num: 18, title: 'Risk Disclosure', text: 'The Client acknowledges that capital loss, profit volatility, liquidity constraints, and market fluctuations are inherent risks. The Client agrees that he/she is at least 18 years old and that past performance of any fund is not necessarily an indication of its future performance.' },
  { num: 19, title: 'Client Declaration', text: 'I/we attest that all information provided herein is accurate and a true representation of my present status. I/we hereby state that the funds and source of such funds are legitimate and not directly or indirectly the proceeds of any unlawful activity.' },
]

const TC_SHARIA = [
  { num: 1, title: 'Profit Sharing', text: 'Profit sharing ratio shall be based on the amount invested and tenor of the product. The gross amount realized will be subject to deductions of applicable taxes and administrative/management expenses.' },
  { num: 2, title: 'Surplus Sharing', text: 'Any surplus realized over and above the expected profit net of taxes and administrative/management fees shall be shared as follows: 70% to PCIL and 30% to the Client. This distribution serves as a performance incentive and an improvement to the Client\'s targeted return.' },
  { num: 3, title: 'Profit-Payment System', text: 'Returns on your investment will be paid quarterly, semi-annually, annually or at maturity, depending on the product subscribed and your investment mandate.' },
  { num: 4, title: 'Profit & Loss Allocation', text: 'Profits generated will be distributed between the Client and PCIL based on the agreed Profit-Sharing Ratio (PSR). Losses are solely borne by the client unless caused by mismanagement, fraud, or negligence by PCIL. PCIL (Being the Mudarib) loses its time and effort in the event of loss.' },
]

function TermsModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Terms & Conditions — Prime Capital & Investment Ltd">
      <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
        {TC_CLAUSES.map(c => (
          <div key={c.num} className="mb-5">
            <p className="font-bold text-sm mb-1" style={{ color: '#A67C1A' }}>
              {c.num}. {c.title}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.text}</p>
          </div>
        ))}
        <div style={{ background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.2)', borderRadius: 12, padding: 16, marginTop: 8 }}>
          <p className="font-bold text-sm mb-3" style={{ color: '#A67C1A' }}>
            ☪️ Applicable to Ethical/Sharia-Compliant Products Only
          </p>
          {TC_SHARIA.map(c => (
            <div key={c.num} className="mb-4">
              <p className="font-bold text-xs mb-1" style={{ color: '#A67C1A' }}>{c.num}. {c.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <GoldButton onClick={onClose} className="w-full">I Have Read the Terms</GoldButton>
        </div>
      </div>
    </Modal>
  )
}

// ── Signatory sub-form ─────────────────────────────────────────────────────────
function SignatoryForm({ index, data, onChange, onRemove, canRemove }) {
  const label = ['A', 'B', 'C', 'D'][index]
  const set = (field, val) => onChange({ ...data, [field]: val })
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <div className="flex items-center justify-between mb-4">
        <div style={{ background: 'linear-gradient(135deg,#A67C1A,#D4A017)', borderRadius: 10, padding: '6px 14px' }}>
          <span className="font-bold text-sm text-white">Signatory {label}</span>
        </div>
        {canRemove && (
          <button onClick={onRemove} style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Title">
          <TSelect value={data.title || ''} onChange={e => set('title', e.target.value)}>
            <option value="">Select title</option>
            {TITLES.map(t => <option key={t}>{t}</option>)}
          </TSelect>
        </Field>
        <Field label="Surname" required>
          <TInput value={data.surname || ''} onChange={e => set('surname', onlyLetters(e))} placeholder="Surname" />
        </Field>
        <Field label="First Name" required>
          <TInput value={data.firstName || ''} onChange={e => set('firstName', onlyLetters(e))} placeholder="First name" />
        </Field>
        <Field label="Other Name">
          <TInput value={data.otherName || ''} onChange={e => set('otherName', e.target.value)} placeholder="Other name" />
        </Field>
        <Field label="Date of Birth" required>
          <TInput type="date" value={data.dob || ''} onChange={e => set('dob', e.target.value)} />
        </Field>
        <Field label="Gender" required>
          <TSelect value={data.gender || ''} onChange={e => set('gender', e.target.value)}>
            <option value="">Select gender</option>
            <option>Male</option><option>Female</option>
          </TSelect>
        </Field>
        <Field label="Marital Status">
          <TSelect value={data.maritalStatus || ''} onChange={e => set('maritalStatus', e.target.value)}>
            <option value="">Select status</option>
            <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
          </TSelect>
        </Field>
        <Field label="BVN" required>
          <TInput value={data.bvn || ''} onChange={e => set('bvn', onlyDigits(e, 11))} placeholder="11-digit BVN" maxLength={11} />
        </Field>
        <Field label="Residential Address" required full>
          <TInput value={data.residentialAddress || ''} onChange={e => set('residentialAddress', e.target.value)} placeholder="Full residential address" />
        </Field>
        <Field label="Mobile Phone" required>
          <TInput value={data.phone || ''} onChange={e => set('phone', onlyDigits(e, 11))} placeholder="08012345678" maxLength={11} />
        </Field>
        <Field label="Email Address">
          <TInput type="email" value={data.email || ''} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
        </Field>
        <Field label="Mother's Maiden Name">
          <TInput value={data.motherMaiden || ''} onChange={e => set('motherMaiden', e.target.value)} placeholder="Mother's maiden name" />
        </Field>
        <Field label="Nationality" required>
          <TInput value={data.nationality || ''} onChange={e => set('nationality', e.target.value)} placeholder="e.g. Nigerian" />
        </Field>
        <Field label="State">
          {/* BUGFIX: was calling set('state', ...) then set('lga', '')
              as two separate calls — both read the same stale `data` prop
              (this component doesn't use a functional state updater like
              the rest of the form), so the second call silently discarded
              the first. State selection appeared to never stick, and LGA
              options never populated since data.state never actually
              updated. Fixed by sending both fields in one onChange call. */}
          <TSelect value={data.state || ''} onChange={e => onChange({ ...data, state: e.target.value, lga: '' })}>
            <option value="">Select state</option>
            {NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}
          </TSelect>
        </Field>
        <Field label="LGA">
          <TSelect value={data.lga || ''} onChange={e => set('lga', e.target.value)}>
            <option value="">Select LGA</option>
            {getLgas(data.state).map(l => <option key={l}>{l}</option>)}
          </TSelect>
        </Field>
        <Field label="ID Type" required full>
          <TSelect value={data.idType || ''} onChange={e => set('idType', e.target.value)}>
            <option value="">Select ID type</option>
            <option>Driver's Licence</option>
            <option>International Passport</option>
            <option>National ID Card</option>
            <option>Voter's Card</option>
            <option>Birth Certificate</option>
          </TSelect>
        </Field>
        <Field label="ID Number" required>
          <TInput value={data.idNumber || ''} onChange={e => set('idNumber', onlyAlphaNum(e))} placeholder="ID document number" />
        </Field>
        <Field label="Passport Photograph" required>
          <UploadField label="" value={data.passportPhoto} onChange={f => set('passportPhoto', f)} hint="Clear passport photograph · JPG or PNG" />
        </Field>
        <Field label="Specimen Signature" required>
          <UploadField label="" value={data.signature} onChange={f => set('signature', f)} hint="Sign on paper, photograph and upload" />
        </Field>
        <PepField
          value={data.pep || ''} onChange={v => set('pep', v)}
          detailsValue={data.pepDetails || ''} onDetailsChange={v => set('pepDetails', v)}
          full
        />
      </div>
    </div>
  )
}

// ── Investment Details sub-form ────────────────────────────────────────────────
function InvestmentDetailsForm({ data, onChange }) {
  const set = (field, val) => onChange({ ...data, [field]: val })
  return (
    <FieldGroup title="Investment Details" gold>
      <Field label="Amount in Figures" required>
        <TInput
          value={formatWithCommas(data.amountFigures)}
          onChange={e => set('amountFigures', onlyPositive({ target: { value: e.target.value.replace(/,/g, '') } }))}
          placeholder="e.g. 5,000,000" inputMode="numeric" />
      </Field>
      <Field label="Amount in Words" required>
        <TInput value={data.amountWords || ''} onChange={e => set('amountWords', e.target.value)} placeholder="e.g. Five Million Naira" />
      </Field>
      <Field label="Duration" required>
        <TInput value={data.duration || ''} onChange={e => set('duration', e.target.value)} placeholder="e.g. 90 days, 1 year" />
      </Field>
      <Field label="Profit/Interest Payment">
        <TSelect value={data.profitPayment || ''} onChange={e => set('profitPayment', e.target.value)}>
          <option value="">Select frequency</option>
          <option>Monthly</option><option>Quarterly</option>
          <option>Semi-Annually</option><option>Annually</option><option>At Maturity</option>
        </TSelect>
      </Field>
      <RadioGroup label="Portfolio Management" options={['Discretionary', 'Non-Discretionary']}
        value={data.portfolioManagement || ''} onChange={v => set('portfolioManagement', v)} />
      <RadioGroup label="Type of Investment" options={['Conventional', 'Ethical']}
        value={data.investmentType || ''} onChange={v => set('investmentType', v)} />
      <RadioGroup label="Investment Decision" options={['Rollover', 'Redemption']}
        value={data.investmentDecision || ''} onChange={v => set('investmentDecision', v)} />
    </FieldGroup>
  )
}

// ── Bank Details sub-form ──────────────────────────────────────────────────────
function BankDetailsForm({ data, onChange, label = 'Bank Account Details' }) {
  const set = (field, val) => onChange({ ...data, [field]: val })
  return (
    <FieldGroup title={label} gold>
      <Field label="Bank Name" required>
        <TSelect value={data.bankName || ''} onChange={e => set('bankName', e.target.value)}>
          <option value="">Select bank</option>
          {BANKS.map(b => <option key={b}>{b}</option>)}
        </TSelect>
      </Field>
      <Field label="Account Number" required>
        <TInput value={data.accountNumber || ''} onChange={e => set('accountNumber', onlyDigits(e, 10))} placeholder="10-digit account number" maxLength={10} />
      </Field>
      <Field label="Account Name" required>
        <TInput value={data.accountName || ''} onChange={e => set('accountName', e.target.value)} placeholder="As on your bank account" />
      </Field>
      <Field label="BVN" required>
        <TInput value={data.bvn || ''} onChange={e => set('bvn', onlyDigits(e, 11))} placeholder="11-digit BVN" maxLength={11} />
      </Field>
      {label.toLowerCase().includes('corporate') && (
        <Field label="Tax Identification Number (TIN)" full>
          <TInput value={data.tin || ''} onChange={e => set('tin', e.target.value)} placeholder="Tax ID number" />
        </Field>
      )}
      <div className="sm:col-span-2">
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={data.certified || false}
            onChange={e => set('certified', e.target.checked)}
            style={{ accentColor: '#A67C1A', marginTop: 2, flexShrink: 0 }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            I certify that all investment principal and profits/interests should be paid into the bank account details provided above.
          </span>
        </label>
      </div>
    </FieldGroup>
  )
}

// ── Processing Screen ──────────────────────────────────────────────────────────
function ProcessingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [countdown, setCountdown] = useState(15)
  const stages = [
    { label: 'Encrypting your documents', done: progress >= 20 },
    { label: 'Submitting to compliance team', done: progress >= 45 },
    { label: 'Registering in ERP system', done: progress >= 70 },
    { label: 'Sending confirmation notification', done: progress >= 90 },
    { label: 'Complete', done: progress >= 100 },
  ]
  // BUGFIX: this was `useState(() => { ...setInterval...; return () =>
  // clearInterval(iv) })` — but useState's initializer has NO concept of
  // cleanup functions; that returned cleanup was silently discarded and
  // never ran. Since the initializer has a real side effect (setInterval),
  // React 18 StrictMode deliberately invokes it TWICE in development to
  // catch exactly this class of bug — creating two independent timers,
  // each eventually calling onComplete() (which submits the KYC) on its
  // own. That's the root cause of KYC submissions duplicating. useEffect
  // respects the cleanup function, so StrictMode's double-invoke becomes
  // safe: the first interval is properly cleared before the second starts.
  const onCompleteCalledRef = useRef(false)
  useEffect(() => {
    const iv = setInterval(() => {
      setCountdown(c => {
        const next = c - 1
        setProgress(Math.round(((15 - next) / 15) * 100))
        if (next <= 0) {
          clearInterval(iv)
          // Extra defense-in-depth guard beyond the useEffect fix itself —
          // ensures onComplete can never fire more than once from this
          // component instance no matter what.
          if (!onCompleteCalledRef.current) {
            onCompleteCalledRef.current = true
            setTimeout(onComplete, 400)
          }
        }
        return next
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [])
  return (
    <div className="text-center py-8 px-4">
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(184,134,11,0.1)', border: '2px solid rgba(184,134,11,0.3)', margin: '0 auto 20px' }}
        className="flex items-center justify-center text-3xl">📋</div>
      <h3 className="font-bold font-serif text-xl mb-1" style={{ color: '#A67C1A' }}>Submitting Your KYC</h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Please wait while we process your information securely</p>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 999, height: 8, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#A67C1A,#D4A017)', borderRadius: 999, transition: 'width 0.8s ease' }} />
      </div>
      <div className="space-y-2 text-left max-w-xs mx-auto mb-4">
        {stages.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span style={{ color: s.done ? '#16a34a' : 'var(--text-muted)', fontSize: 14 }}>{s.done ? '✓' : '○'}</span>
            <span className="text-xs" style={{ color: s.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs font-semibold" style={{ color: '#A67C1A' }}>{countdown}s remaining</p>
    </div>
  )
}

// ── Main KYC Page ──────────────────────────────────────────────────────────────
export default function KYC() {
  const { user, updateKycStatus, submitKyc, fetchMe } = useAuth()
  const navigate = useNavigate()
  const [stage, setStage] = useState('form') // form | processing | done
  const [tcOpen, setTcOpen] = useState(false)
  const [tcAccepted, setTcAccepted] = useState(false)
  const [errors, setErrors] = useState([])

  // ── Account type ─────────────────────────────────────────────────────────────
  const [accountType, setAccountType] = useState('')

  // ── Individual form state ─────────────────────────────────────────────────────
  const [personal, setPersonal] = useState({})
  const [minor, setMinor] = useState({})
  const [joint, setJoint] = useState({})
  const [employment, setEmployment] = useState({})
  const [nextOfKin, setNextOfKin] = useState({})
  const [investmentDetails, setInvestmentDetails] = useState({})
  const [bankDetails, setBankDetails] = useState({})

  // ── Corporate form state ──────────────────────────────────────────────────────
  const [company, setCompany] = useState({})
  const [corpInvestment, setCorpInvestment] = useState({})
  const [corpBank, setCorpBank] = useState({})
  const [signatories, setSignatories] = useState([{}])
  const [mandate, setMandate] = useState('')
  const [boardResolution, setBoardResolution] = useState({})

  const setCompanyField = (f, v) => setCompany(c => ({ ...c, [f]: v }))
  const setPersonalField = (f, v) => setPersonal(p => ({ ...p, [f]: v }))
  const setEmploymentField = (f, v) => setEmployment(e => ({ ...e, [f]: v }))
  const setNextOfKinField = (f, v) => setNextOfKin(n => ({ ...n, [f]: v }))
  const setBoardField = (f, v) => setBoardResolution(b => ({ ...b, [f]: v }))

  const updateSignatory = (i, data) => {
    // Functional update — safe even if called multiple times in quick
    // succession, unlike reading the closed-over `signatories` directly.
    setSignatories(prev => { const updated = [...prev]; updated[i] = data; return updated })
  }
  const addSignatory = () => {
    if (signatories.length < 4) setSignatories([...signatories, {}])
  }
  const removeSignatory = (i) => {
    setSignatories(signatories.filter((_, idx) => idx !== i))
  }

  const isMinor = accountType === 'Minor'
  const isJoint = accountType === 'Joint'
  const isCorporate = accountType === 'Corporate'
  const isIndividualType = ['Individual', 'Minor', 'Joint'].includes(accountType)

  const handleSubmit = () => {
    const errs = []
    if (!accountType) errs.push('Please select an account type')
    if (!tcAccepted) errs.push('Please accept the Terms and Conditions')
    if (isIndividualType) {
      if (!personal.surname) errs.push('Surname is required')
      if (!personal.firstName) errs.push('First name is required')
      if (!personal.bvn) errs.push('BVN is required')
      if (!personal.dob) errs.push('Date of birth is required')
      if (!personal.idType) errs.push('ID type is required')
      if (!personal.idNumber) errs.push('ID number is required')
      if (!personal.pep) errs.push('Please answer the PEP question')
      if (!personal.passportPhoto) errs.push('Passport photograph is required')
      if (!personal.idDocument) errs.push('ID document upload is required')
      if (!bankDetails.bankName) errs.push('Bank name is required')
      if (!bankDetails.accountNumber) errs.push('Account number is required')
    }
    if (isCorporate) {
      if (!company.companyName) errs.push('Company name is required')
      if (!company.registrationNumber) errs.push('Registration number is required')
      if (!company.companyCategory) errs.push('Company category is required')
      if (!signatories[0]?.surname) errs.push('At least one signatory is required')
      if (!corpBank.accountNumber) errs.push('Corporate bank account number is required')
    }
    if (errs.length > 0) { setErrors(errs); window.scrollTo(0, 0); return }
    setErrors([])
    setStage('processing')
  }

  const handleProcessingComplete = async () => {
    try {
      // ── Security: strip HTML tags from all string inputs ─────────────────
      const sanitize = (obj) => {
        if (typeof obj === 'string') return obj.replace(/<[^>]*>/g, '').trim()
        if (Array.isArray(obj)) return obj.map(sanitize)
        if (obj && typeof obj === 'object') return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, sanitize(v)]))
        return obj
      }

      // ── Core fields (dedicated DB columns) ───────────────────────────────
      const payload = {
        date_of_birth:         personal.dob || null,
        nationality:           personal.nationality || null,
        state:                 personal.state || null,
        lga:                   personal.lga || null,
        address:               personal.residentialAddress || null,
        occupation:            employment.status || null,
        employer:              employment.employerName || null,
        annual_income:         employment.sourceOfFunds || null,
        investment_experience: (isCorporate ? corpInvestment.portfolioManagement : investmentDetails.portfolioManagement) || null,
        risk_profile:          (isCorporate ? corpInvestment.investmentType : investmentDetails.investmentType) || null,
        pep_status:            personal.pep === 'Yes',
        // Corporate core fields
        company_name:          company.companyName || null,
        rc_number:             company.registrationNumber || null,
        company_address:       company.businessAddress || null,
        signatories:           signatories.filter(s => s.surname || s.name) || null,

        // ── Extra data JSON — all additional fields for D365 ─────────────
        extra_data: {
          account_type: accountType,
          // NEW — was tracked locally (tcAccepted) to enable the submit
          // button, but never actually sent anywhere, so there was no
          // record at all of the client agreeing to terms. Now recorded.
          terms_accepted: tcAccepted,
          terms_accepted_at: tcAccepted ? new Date().toISOString() : null,
          title:         personal.title || null,
          surname:       personal.surname || null,
          first_name:    personal.firstName || null,
          other_name:    personal.otherName || null,
          gender:        personal.gender || null,
          marital_status: personal.maritalStatus || null,
          mother_maiden:  personal.motherMaiden || null,
          id_type:        personal.idType || null,
          id_number:      personal.idNumber || null,
          bvn:            personal.bvn || null,
          pep_details:    personal.pepDetails || null,
          employment: {
            status:           employment.status || null,
            employer_name:    employment.employerName || null,
            employer_address: employment.employerAddress || null,
            nature_of_business: employment.natureOfBusiness || null,
            source_of_funds:  employment.sourceOfFunds || null,
          },
          next_of_kin: {
            surname:      nextOfKin.surname || null,
            first_name:   nextOfKin.firstName || null,
            other_name:   nextOfKin.otherName || null,
            dob:          nextOfKin.dob || null,
            address:      nextOfKin.residentialAddress || null,
            relationship: nextOfKin.relationship || null,
            gender:       nextOfKin.gender || null,
            phone:        nextOfKin.phone || null,
            email:        nextOfKin.email || null,
          },
          investment: {
            // BUGFIX: was always sending `investmentDetails` (the individual/
            // minor/joint state) even for corporate accounts, whose actual
            // investment data lives in `corpInvestment` — that form is
            // rendered from corpInvestment for corporate, so the submitted
            // data must come from the same place, or it's silently empty.
            amount_figures:       (isCorporate ? corpInvestment.amountFigures : investmentDetails.amountFigures) || null,
            amount_words:         (isCorporate ? corpInvestment.amountWords : investmentDetails.amountWords) || null,
            duration:             (isCorporate ? corpInvestment.duration : investmentDetails.duration) || null,
            profit_payment:       (isCorporate ? corpInvestment.profitPayment : investmentDetails.profitPayment) || null,
            portfolio_management: (isCorporate ? corpInvestment.portfolioManagement : investmentDetails.portfolioManagement) || null,
            investment_type:      (isCorporate ? corpInvestment.investmentType : investmentDetails.investmentType) || null,
            investment_decision:  (isCorporate ? corpInvestment.investmentDecision : investmentDetails.investmentDecision) || null,
          },
          bank: {
            bank_name:      bankDetails.bankName || null,
            account_number: bankDetails.accountNumber || null,
            account_name:   bankDetails.accountName || null,
            bvn:            bankDetails.bvn || null,
          },
          minor: isMinor ? {
            surname:      minor.surname || null,
            first_name:   minor.firstName || null,
            other_name:   minor.otherName || null,
            dob:          minor.dob || null,
            nationality:  minor.nationality || null,
            bvn:          minor.bvn || null,  // BUGFIX: was collected but never sent
            mandate_auth: minor.mandateAuth || null,
          } : null,
          joint: isJoint ? {
            // BUGFIX: title, gender, marital_status, mother_maiden, bvn, pep,
            // pep_details, state, lga were collected on the form (Joint
            // Account — Partner Details section) but never included here —
            // silently lost on submit. Now included.
            title:        joint.title || null,
            surname:      joint.surname || null,
            first_name:   joint.firstName || null,
            other_name:   joint.otherName || null,
            dob:          joint.dob || null,
            gender:       joint.gender || null,
            marital_status: joint.maritalStatus || null,
            mother_maiden: joint.motherMaiden || null,
            nationality:  joint.nationality || null,
            state:        joint.state || null,
            lga:          joint.lga || null,
            address:      joint.residentialAddress || null,
            phone:        joint.phone || null,
            email:        joint.email || null,
            id_type:      joint.idType || null,
            id_number:    joint.idNumber || null,
            bvn:          joint.bvn || null,
            pep:          joint.pep || null,
            pep_details:  joint.pepDetails || null,
            mandate_auth: joint.mandateAuth || null,
          } : null,
          corporate: isCorporate ? {
            company_category:      company.companyCategory || null,
            nature_of_business:    company.natureOfBusiness || null,
            sector:                company.sector || null,
            tin:                   company.tin || null,
            scuml:                 company.scuml || null,
            phone1:                company.phone1 || null,
            phone2:                company.phone2 || null,
            email:                 company.email || null,
            date_of_incorporation: company.dateOfIncorporation || null,
            mandate:               mandate || null,
            board_resolution: {
              company_name:     boardResolution.companyName || null,
              meeting_date:     boardResolution.meetingDate || null,
              meeting_location: boardResolution.meetingLocation || null,
              director_name:    boardResolution.directorName || null,
              secretary_name:   boardResolution.secretaryName || null,
            },
            corp_bank: {
              bank_name:      corpBank.bankName || null,
              account_number: corpBank.accountNumber || null,
              account_name:   corpBank.accountName || null,
              bvn:            corpBank.bvn || null,
              tin:            corpBank.tin || null,
            },
          } : null,
        },
      }

      const cleanPayload = sanitize(payload)

      // Pass file objects via window.__kycFiles (File objects can't be JSON serialised)
      window.__kycFiles = {
        passportPhoto:   personal.passportPhoto  || null,
        idDocument:      personal.idDocument     || null,
        cacCertificate:  company.cacDocument     || null,
        // BUGFIX: scumlDocument and tinDocument were collected on the
        // corporate form (both marked required!) but never included here —
        // silently discarded on every submit. Now actually uploaded.
        scumlCertificate: company.scumlDocument  || null,
        tinCertificate:   company.tinDocument    || null,
        // BUGFIX: same for the two board resolution signatures.
        directorSignature: boardResolution.directorSignature || null,
        secretarySignature: boardResolution.secretarySignature || null,
        // BUGFIX: minor's own passport photo + birth certificate were
        // collected on the form (A1. Minor section) but never sent —
        // only the guardian's own uploads (personal.passportPhoto/
        // idDocument, above) were ever uploaded.
        minorPassportPhoto:  minor.passportPhoto    || null,
        minorBirthCertificate: minor.birthCertificate || null,
        // BUGFIX: joint partner's passport photo + ID document were
        // collected on the form (A2. Joint Account section) but never
        // sent — same class of bug as the minor uploads above.
        jointPassportPhoto: joint.passportPhoto || null,
        jointIdDocument:    joint.idDocument    || null,
        // BUGFIX: per-signatory photo/signature (Signatory A-D) were also
        // collected — Signatory A's photo is even marked required — but
        // never uploaded anywhere. Now sent as an indexed array; the
        // backend stores each into that signatory's own record.
        signatories: signatories.map(sig => ({
          photo: sig.passportPhoto || null,
          signature: sig.signature || null,
        })),
      }

      if (submitKyc) await submitKyc(cleanPayload)
      if (fetchMe) await fetchMe()
    } catch (err) {
      console.error('KYC submit error:', err.response?.data || err.message)
      if (updateKycStatus) updateKycStatus(KYC_STATUS.PENDING)
    }
    setStage('done')
  }

  // Already submitted states
  if (user?.kycStatus === KYC_STATUS.PENDING && stage !== 'processing' && stage !== 'done') {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 80px)' }} className="py-10 px-6 flex items-center justify-center">
        <Card className="p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold font-serif mb-2" style={{ color: '#A67C1A' }}>KYC Under Review</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Your documents have been submitted and are being reviewed by our compliance team. You will receive a notification once a decision is made.
          </p>
          <GoldButton onClick={() => navigate('/dashboard')} className="w-full">Back to Dashboard</GoldButton>
        </Card>
      </div>
    )
  }

  if (user?.kycStatus === KYC_STATUS.APPROVED && stage !== 'done') {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 80px)' }} className="py-10 px-6 flex items-center justify-center">
        <Card className="p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold font-serif mb-2" style={{ color: '#A67C1A' }}>KYC Verified</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Your identity has been verified. You are cleared to invest.</p>
          <GoldButton onClick={() => navigate('/products')} className="w-full">Browse Products</GoldButton>
        </Card>
      </div>
    )
  }

  if (stage === 'processing') {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 80px)' }} className="py-10 px-6 flex items-center justify-center">
        <Card className="p-6 max-w-md w-full">
          <ProcessingScreen onComplete={handleProcessingComplete} />
        </Card>
      </div>
    )
  }

  if (stage === 'done') {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 80px)' }} className="py-10 px-6 flex items-center justify-center">
        <Card className="p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold font-serif mb-2" style={{ color: '#A67C1A' }}>KYC Submitted!</h2>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            Your KYC has been submitted successfully and is now under review by our compliance team.
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            You will receive a notification once your account is approved. This typically takes 1 to 3 business days.
          </p>
          <GoldButton onClick={() => navigate('/dashboard')} className="w-full">Go to Dashboard</GoldButton>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 80px)' }} className="py-10 px-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Account Verification</p>
          <h1 className="text-3xl font-bold font-serif" style={{ color: '#A67C1A' }}>KYC Verification</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            SEC regulations require identity verification before you can invest. Please complete the form below accurately.
          </p>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12 }} className="p-4 mb-6">
            <p className="font-bold text-sm mb-2" style={{ color: '#dc2626' }}>Please fix the following:</p>
            <ul className="space-y-1">
              {errors.map((e, i) => <li key={i} className="text-xs" style={{ color: '#dc2626' }}>• {e}</li>)}
            </ul>
          </div>
        )}

        <Card className="p-6 sm:p-8">

          {/* Account Type Selector */}
          <div className="mb-8">
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '10px 16px', marginBottom: 20 }}>
              <h3 className="font-bold text-sm tracking-wide" style={{ color: '#A67C1A' }}>Account Type</h3>
            </div>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
              What type of account are you opening? <span style={{ color: '#A67C1A' }}>*</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { type: 'Individual', icon: '👤', desc: 'Personal account' },
                { type: 'Minor',      icon: '👶', desc: 'Guardian for a minor' },
                { type: 'Joint',      icon: '👥', desc: 'Two or more persons' },
                { type: 'Corporate',  icon: '🏢', desc: 'Company or institution' },
              ].map(({ type, icon, desc }) => (
                <button key={type} type="button" onClick={() => setAccountType(type)}
                  style={{
                    border: `2px solid ${accountType === type ? '#A67C1A' : 'var(--border)'}`,
                    borderRadius: 14,
                    padding: '18px 12px',
                    background: accountType === type ? 'rgba(184,134,11,0.08)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                  onMouseEnter={e => { if (accountType !== type) e.currentTarget.style.borderColor = 'rgba(184,134,11,0.4)' }}
                  onMouseLeave={e => { if (accountType !== type) e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div className="text-3xl mb-2">{icon}</div>
                  <div className="text-sm font-bold" style={{ color: accountType === type ? '#A67C1A' : 'var(--text-primary)' }}>
                    {type}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                  {accountType === type && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ background: '#A67C1A', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                        Selected
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── INDIVIDUAL / MINOR / JOINT FORMS ── */}
          {isIndividualType && (
            <>
              {/* Section A: Personal Data */}
              <FieldGroup title="A. Client Personal Data">
                <Field label="Title">
                  <TSelect value={personal.title || ''} onChange={e => setPersonalField('title', e.target.value)}>
                    <option value="">Select title</option>
                    {TITLES.map(t => <option key={t}>{t}</option>)}
                  </TSelect>
                </Field>
                <Field label="BVN" required>
                  <TInput value={personal.bvn || ''} onChange={e => setPersonalField('bvn', onlyDigits(e, 11))} placeholder="11-digit BVN" maxLength={11} />
                </Field>
                <Field label="Surname" required>
                  <TInput value={personal.surname || ''} onChange={e => setPersonalField('surname', onlyLetters(e))} placeholder="Surname" />
                </Field>
                <Field label="First Name" required>
                  <TInput value={personal.firstName || ''} onChange={e => setPersonalField('firstName', onlyLetters(e))} placeholder="First name" />
                </Field>
                <Field label="Other Name">
                  <TInput value={personal.otherName || ''} onChange={e => setPersonalField('otherName', e.target.value)} placeholder="Other name" />
                </Field>
                <Field label="Date of Birth" required>
                  <TInput type="date" value={personal.dob || ''} onChange={e => setPersonalField('dob', e.target.value)} />
                </Field>
                <Field label="Gender" required>
                  <TSelect value={personal.gender || ''} onChange={e => setPersonalField('gender', e.target.value)}>
                    <option value="">Select gender</option>
                    <option>Male</option><option>Female</option>
                  </TSelect>
                </Field>
                <Field label="Marital Status">
                  <TSelect value={personal.maritalStatus || ''} onChange={e => setPersonalField('maritalStatus', e.target.value)}>
                    <option value="">Select status</option>
                    <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                  </TSelect>
                </Field>
                <Field label="Residential Address" required full>
                  <TInput value={personal.residentialAddress || ''} onChange={e => setPersonalField('residentialAddress', e.target.value)} placeholder="Full residential address" />
                </Field>
                <Field label="Mobile Phone" required>
                  <TInput value={personal.phone || ''} onChange={e => setPersonalField('phone', onlyDigits(e, 11))} placeholder="08012345678" maxLength={11} />
                </Field>
                <Field label="Email Address" required>
                  <TInput type="email" value={personal.email || ''} onChange={e => setPersonalField('email', e.target.value)} placeholder="email@example.com" />
                </Field>
                <Field label="Mother's Maiden Name">
                  <TInput value={personal.motherMaiden || ''} onChange={e => setPersonalField('motherMaiden', e.target.value)} placeholder="Mother's maiden name" />
                </Field>
                <Field label="Nationality" required>
                  <TInput value={personal.nationality || ''} onChange={e => setPersonalField('nationality', e.target.value)} placeholder="e.g. Nigerian" />
                </Field>
                <Field label="State">
                  <TSelect value={personal.state || ''} onChange={e => { setPersonalField('state', e.target.value); setPersonalField('lga', '') }}>
                    <option value="">Select state</option>
                    {NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}
                  </TSelect>
                </Field>
                <Field label="LGA">
                  <TSelect value={personal.lga || ''} onChange={e => setPersonalField('lga', e.target.value)}>
                    <option value="">Select LGA</option>
                    {getLgas(personal.state).map(l => <option key={l}>{l}</option>)}
                  </TSelect>
                </Field>
                <Field label="ID Type" required full>
                  <TSelect value={personal.idType || ''} onChange={e => setPersonalField('idType', e.target.value)}>
                    <option value="">Select ID type</option>
                    <option>Driver's Licence</option>
                    <option>International Passport</option>
                    <option>National ID Card</option>
                    <option>Voter's Card</option>
                    <option>Birth Certificate</option>
                  </TSelect>
                </Field>
                <Field label="ID Number" required>
                  <TInput value={personal.idNumber || ''} onChange={e => setPersonalField('idNumber', onlyAlphaNum(e))} placeholder="ID document number" />
                </Field>
                <Field label="Passport Photograph" required>
                  <UploadField label="" value={personal.passportPhoto} onChange={f => setPersonalField('passportPhoto', f)} hint="Clear passport photograph · JPG or PNG" />
                </Field>
                <Field label="ID Document Upload" required>
                  <UploadField label="" value={personal.idDocument} onChange={f => setPersonalField('idDocument', f)} hint="Upload your selected ID · JPG, PNG or PDF" />
                </Field>
                <PepField
                  value={personal.pep || ''} onChange={v => setPersonalField('pep', v)}
                  detailsValue={personal.pepDetails || ''} onDetailsChange={v => setPersonalField('pepDetails', v)}
                  full
                />
              </FieldGroup>

              {/* Section A1: Minor */}
              {isMinor && (
                <FieldGroup title="A1. Minor Details">
                  <Field label="Minor's Surname" required>
                    <TInput value={minor.surname || ''} onChange={e => setMinor(m => ({ ...m, surname: onlyLetters(e) }))} placeholder="Surname" />
                  </Field>
                  <Field label="Minor's First Name" required>
                    <TInput value={minor.firstName || ''} onChange={e => setMinor(m => ({ ...m, firstName: onlyLetters(e) }))} placeholder="First name" />
                  </Field>
                  <Field label="Other Name">
                    <TInput value={minor.otherName || ''} onChange={e => setMinor(m => ({ ...m, otherName: e.target.value }))} placeholder="Other name" />
                  </Field>
                  <Field label="Date of Birth" required>
                    <TInput type="date" value={minor.dob || ''} onChange={e => setMinor(m => ({ ...m, dob: e.target.value }))} />
                  </Field>
                  <Field label="Nationality" required>
                    <TInput value={minor.nationality || ''} onChange={e => setMinor(m => ({ ...m, nationality: e.target.value }))} placeholder="e.g. Nigerian" />
                  </Field>
                  <Field label="BVN">
                    <TInput value={minor.bvn || ''} onChange={e => setMinor(m => ({ ...m, bvn: onlyDigits(e, 11) }))} placeholder="11-digit BVN" maxLength={11} />
                  </Field>
                  <Field label="Minor's Passport Photograph">
                    <UploadField label="" value={minor.passportPhoto} onChange={f => setMinor(m => ({ ...m, passportPhoto: f }))} hint="Clear photograph of the minor" />
                  </Field>
                  <Field label="Birth Certificate" required>
                    <UploadField label="" value={minor.birthCertificate} onChange={f => setMinor(m => ({ ...m, birthCertificate: f }))} hint="Upload birth certificate · JPG, PNG or PDF" />
                  </Field>
                  <RadioGroup label="Mandate Authorization" options={['Father', 'Mother', 'Both']}
                    value={minor.mandateAuth || ''} onChange={v => setMinor(m => ({ ...m, mandateAuth: v }))} full />
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Signature Mandate</p>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                      <div className="grid grid-cols-3 gap-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '8px 12px' }}>
                        {['Name', 'Relationship', 'Category'].map(h => (
                          <span key={h} className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</span>
                        ))}
                      </div>
                      {[0, 1].map(i => (
                        <div key={i} className="grid grid-cols-3 gap-2 p-3" style={{ borderBottom: i === 0 ? '1px solid var(--border)' : 'none' }}>
                          <TInput value={minor[`sigName${i}`] || ''} onChange={e => setMinor(m => ({ ...m, [`sigName${i}`]: e.target.value }))} placeholder="Full name" />
                          <TInput value={minor[`sigRel${i}`] || ''} onChange={e => setMinor(m => ({ ...m, [`sigRel${i}`]: e.target.value }))} placeholder="Relationship" />
                          <TInput value={minor[`sigCat${i}`] || ''} onChange={e => setMinor(m => ({ ...m, [`sigCat${i}`]: e.target.value }))} placeholder="Category" />
                        </div>
                      ))}
                    </div>
                  </div>
                </FieldGroup>
              )}

              {/* Section A2: Joint */}
              {isJoint && (
                <FieldGroup title="A2. Joint Account — Partner Details">
                  <Field label="Title">
                    <TSelect value={joint.title || ''} onChange={e => setJoint(j => ({ ...j, title: e.target.value }))}>
                      <option value="">Select title</option>
                      {TITLES.map(t => <option key={t}>{t}</option>)}
                    </TSelect>
                  </Field>
                  <Field label="BVN" required>
                    <TInput value={joint.bvn || ''} onChange={e => setJoint(j => ({ ...j, bvn: onlyDigits(e, 11) }))} placeholder="11-digit BVN" maxLength={11} />
                  </Field>
                  <Field label="Surname" required>
                    <TInput value={joint.surname || ''} onChange={e => setJoint(j => ({ ...j, surname: onlyLetters(e) }))} placeholder="Surname" />
                  </Field>
                  <Field label="First Name" required>
                    <TInput value={joint.firstName || ''} onChange={e => setJoint(j => ({ ...j, firstName: onlyLetters(e) }))} placeholder="First name" />
                  </Field>
                  <Field label="Other Name">
                    <TInput value={joint.otherName || ''} onChange={e => setJoint(j => ({ ...j, otherName: e.target.value }))} placeholder="Other name" />
                  </Field>
                  <Field label="Date of Birth" required>
                    <TInput type="date" value={joint.dob || ''} onChange={e => setJoint(j => ({ ...j, dob: e.target.value }))} />
                  </Field>
                  <Field label="Gender" required>
                    <TSelect value={joint.gender || ''} onChange={e => setJoint(j => ({ ...j, gender: e.target.value }))}>
                      <option value="">Select gender</option>
                      <option>Male</option><option>Female</option>
                    </TSelect>
                  </Field>
                  <Field label="Marital Status">
                    <TSelect value={joint.maritalStatus || ''} onChange={e => setJoint(j => ({ ...j, maritalStatus: e.target.value }))}>
                      <option value="">Select status</option>
                      <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                    </TSelect>
                  </Field>
                  <Field label="Residential Address" required full>
                    <TInput value={joint.residentialAddress || ''} onChange={e => setJoint(j => ({ ...j, residentialAddress: e.target.value }))} placeholder="Full residential address" />
                  </Field>
                  <Field label="Mobile Phone" required>
                    <TInput value={joint.phone || ''} onChange={e => setJoint(j => ({ ...j, phone: onlyDigits(e, 11) }))} placeholder="08012345678" maxLength={11} />
                  </Field>
                  <Field label="Email Address">
                    <TInput type="email" value={joint.email || ''} onChange={e => setJoint(j => ({ ...j, email: e.target.value }))} placeholder="email@example.com" />
                  </Field>
                  <Field label="Mother's Maiden Name">
                    <TInput value={joint.motherMaiden || ''} onChange={e => setJoint(j => ({ ...j, motherMaiden: e.target.value }))} placeholder="Mother's maiden name" />
                  </Field>
                  <Field label="Nationality" required>
                    <TInput value={joint.nationality || ''} onChange={e => setJoint(j => ({ ...j, nationality: e.target.value }))} placeholder="e.g. Nigerian" />
                  </Field>
                  <Field label="State">
                    <TSelect value={joint.state || ''} onChange={e => setJoint(j => ({ ...j, state: e.target.value, lga: '' }))}>
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}
                    </TSelect>
                  </Field>
                  <Field label="LGA">
                    <TSelect value={joint.lga || ''} onChange={e => setJoint(j => ({ ...j, lga: e.target.value }))}>
                      <option value="">Select LGA</option>
                      {getLgas(joint.state).map(l => <option key={l}>{l}</option>)}
                    </TSelect>
                  </Field>
                  <Field label="ID Type" required full>
                    <TSelect value={joint.idType || ''} onChange={e => setJoint(j => ({ ...j, idType: e.target.value }))}>
                      <option value="">Select ID type</option>
                      <option>Driver's Licence</option>
                      <option>International Passport</option>
                      <option>National ID Card</option>
                      <option>Voter's Card</option>
                    </TSelect>
                  </Field>
                  <Field label="ID Number" required>
                    <TInput value={joint.idNumber || ''} onChange={e => setJoint(j => ({ ...j, idNumber: onlyAlphaNum(e) }))} placeholder="ID document number" />
                  </Field>
                  <Field label="Passport Photograph" required>
                    <UploadField label="" value={joint.passportPhoto} onChange={f => setJoint(j => ({ ...j, passportPhoto: f }))} />
                  </Field>
                  <Field label="ID Document Upload" required>
                    <UploadField label="" value={joint.idDocument} onChange={f => setJoint(j => ({ ...j, idDocument: f }))} />
                  </Field>
                  <PepField
                    value={joint.pep || ''} onChange={v => setJoint(j => ({ ...j, pep: v }))}
                    detailsValue={joint.pepDetails || ''} onDetailsChange={v => setJoint(j => ({ ...j, pepDetails: v }))}
                    full
                  />
                  <RadioGroup label="Mandate Authorization"
                    options={['Sole', 'Either Sign', 'Both to Sign']}
                    value={joint.mandateAuth || ''} onChange={v => setJoint(j => ({ ...j, mandateAuth: v }))} full />
                </FieldGroup>
              )}

              {/* Section B: Employment */}
              <FieldGroup title="B. Employment Details" gold>
                <RadioGroup label="Employment Status *" full
                  options={['Employed', 'Self Employed', 'Retired', 'Others']}
                  value={employment.status || ''} onChange={v => setEmploymentField('status', v)} />

                {/* Employed */}
                {employment.status === 'Employed' && <>
                  <Field label="Employer's Name" required>
                    <TInput value={employment.employerName || ''} onChange={e => setEmploymentField('employerName', e.target.value)} placeholder="Name of employer" />
                  </Field>
                  <Field label="Employer's Address">
                    <TInput value={employment.employerAddress || ''} onChange={e => setEmploymentField('employerAddress', e.target.value)} placeholder="Employer's address" />
                  </Field>
                  <Field label="Nature of Business">
                    <TInput value={employment.natureOfBusiness || ''} onChange={e => setEmploymentField('natureOfBusiness', e.target.value)} placeholder="e.g. Banking, Oil & Gas, etc." />
                  </Field>
                  <Field label="Source of Funds" required>
                    <TInput value={employment.sourceOfFunds || ''} onChange={e => setEmploymentField('sourceOfFunds', e.target.value)} placeholder="e.g. Salary" />
                  </Field>
                </>}

                {/* Self Employed */}
                {employment.status === 'Self Employed' && <>
                  <Field label="Business Name" required>
                    <TInput value={employment.employerName || ''} onChange={e => setEmploymentField('employerName', e.target.value)} placeholder="Name of your business" />
                  </Field>
                  <Field label="Business Address">
                    <TInput value={employment.employerAddress || ''} onChange={e => setEmploymentField('employerAddress', e.target.value)} placeholder="Business address" />
                  </Field>
                  <Field label="Nature of Business" required>
                    <TInput value={employment.natureOfBusiness || ''} onChange={e => setEmploymentField('natureOfBusiness', e.target.value)} placeholder="e.g. Trading, Consulting, etc." />
                  </Field>
                  <Field label="Source of Funds" required>
                    <TInput value={employment.sourceOfFunds || ''} onChange={e => setEmploymentField('sourceOfFunds', e.target.value)} placeholder="e.g. Business income" />
                  </Field>
                </>}

                {/* Retired */}
                {employment.status === 'Retired' && <>
                  <Field label="Former Employer">
                    <TInput value={employment.employerName || ''} onChange={e => setEmploymentField('employerName', e.target.value)} placeholder="Name of former employer" />
                  </Field>
                  <Field label="Former Occupation">
                    <TInput value={employment.natureOfBusiness || ''} onChange={e => setEmploymentField('natureOfBusiness', e.target.value)} placeholder="e.g. Civil Servant, Engineer, etc." />
                  </Field>
                  <Field label="Source of Funds" required>
                    <TInput value={employment.sourceOfFunds || ''} onChange={e => setEmploymentField('sourceOfFunds', e.target.value)} placeholder="e.g. Pension, Savings, Investments" />
                  </Field>
                </>}

                {/* Others */}
                {employment.status === 'Others' && <>
                  <Field label="Occupation / Description" required>
                    <TInput value={employment.natureOfBusiness || ''} onChange={e => setEmploymentField('natureOfBusiness', e.target.value)} placeholder="Describe your occupation" />
                  </Field>
                  <Field label="Source of Funds" required>
                    <TInput value={employment.sourceOfFunds || ''} onChange={e => setEmploymentField('sourceOfFunds', e.target.value)} placeholder="e.g. Rental income, Inheritance, etc." />
                  </Field>
                </>}

                {/* Source of Funds always shown if no status selected yet */}
                {!employment.status && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Please select your employment status above to continue.
                  </p>
                )}
              </FieldGroup>

              {/* Section C: Next of Kin */}
              <FieldGroup title="C. Next of Kin" gold>
                <Field label="Surname" required>
                  <TInput value={nextOfKin.surname || ''} onChange={e => setNextOfKinField('surname', onlyLetters(e))} placeholder="Surname" />
                </Field>
                <Field label="First Name" required>
                  <TInput value={nextOfKin.firstName || ''} onChange={e => setNextOfKinField('firstName', onlyLetters(e))} placeholder="First name" />
                </Field>
                <Field label="Other Name">
                  <TInput value={nextOfKin.otherName || ''} onChange={e => setNextOfKinField('otherName', e.target.value)} placeholder="Other name" />
                </Field>
                <Field label="Date of Birth">
                  <TInput type="date" value={nextOfKin.dob || ''} onChange={e => setNextOfKinField('dob', e.target.value)} />
                </Field>
                <Field label="Residential Address" full>
                  <TInput value={nextOfKin.residentialAddress || ''} onChange={e => setNextOfKinField('residentialAddress', e.target.value)} placeholder="Full address" />
                </Field>
                <Field label="Relationship" required>
                  <TSelect value={nextOfKin.relationship || ''} onChange={e => setNextOfKinField('relationship', e.target.value)}>
                    <option value="">Select relationship</option>
                    <option>Spouse</option><option>Parent</option><option>Child</option>
                    <option>Sibling</option><option>Other</option>
                  </TSelect>
                </Field>
                <Field label="Gender">
                  <TSelect value={nextOfKin.gender || ''} onChange={e => setNextOfKinField('gender', e.target.value)}>
                    <option value="">Select gender</option>
                    <option>Male</option><option>Female</option>
                  </TSelect>
                </Field>
                <Field label="Email Address">
                  <TInput type="email" value={nextOfKin.email || ''} onChange={e => setNextOfKinField('email', e.target.value)} placeholder="email@example.com" />
                </Field>
                <Field label="Phone Number" required>
                  <TInput value={nextOfKin.phone || ''} onChange={e => setNextOfKinField('phone', onlyDigits(e, 11))} placeholder="08012345678" maxLength={11} />
                </Field>
              </FieldGroup>

              {/* Section D: Investment Details */}
              <InvestmentDetailsForm data={investmentDetails} onChange={setInvestmentDetails} />

              {/* Section E: Bank Details */}
              <BankDetailsForm data={bankDetails} onChange={setBankDetails} label="E. Bank Account Details" />
            </>
          )}

          {/* ── CORPORATE FORM ── */}
          {isCorporate && (
            <>
              {/* Company Details */}
              <FieldGroup title="Company Details" gold>
                <Field label="Company Name" required full>
                  <TInput value={company.companyName || ''} onChange={e => setCompanyField('companyName', e.target.value)} placeholder="Full registered company name" />
                </Field>
                <Field label="Registration Number" required>
                  <TInput value={company.registrationNumber || ''} onChange={e => setCompanyField('registrationNumber', e.target.value)} placeholder="CAC registration number" />
                </Field>
                <Field label="Date of Incorporation" required>
                  <TInput type="date" value={company.dateOfIncorporation || ''} onChange={e => setCompanyField('dateOfIncorporation', e.target.value)} />
                </Field>
                <Field label="Company Category" required full>
                  <TSelect value={company.companyCategory || ''} onChange={e => setCompanyField('companyCategory', e.target.value)}>
                    <option value="">Select company category</option>
                    {COMPANY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </TSelect>
                </Field>
                <Field label="Nature of Business" required>
                  <TInput value={company.natureOfBusiness || ''} onChange={e => setCompanyField('natureOfBusiness', e.target.value)} placeholder="e.g. Financial Services" />
                </Field>
                <Field label="Sector/Industry" required>
                  <TInput value={company.sector || ''} onChange={e => setCompanyField('sector', e.target.value)} placeholder="e.g. Banking, Oil & Gas" />
                </Field>
                <Field label="Tax Identification Number (TIN)" required>
                  <TInput value={company.tin || ''} onChange={e => setCompanyField('tin', e.target.value)} placeholder="TIN" />
                </Field>
                <Field label="SCUML Number">
                  <TInput value={company.scuml || ''} onChange={e => setCompanyField('scuml', e.target.value)} placeholder="SCUML certificate number" />
                </Field>
                <Field label="Business Address" required full>
                  <TInput value={company.businessAddress || ''} onChange={e => setCompanyField('businessAddress', e.target.value)} placeholder="Full business address" />
                </Field>
                <Field label="Phone Number 1" required>
                  <TInput value={company.phone1 || ''} onChange={e => setCompanyField('phone1', onlyDigits(e, 11))} placeholder="08012345678" maxLength={11} />
                </Field>
                <Field label="Phone Number 2">
                  <TInput value={company.phone2 || ''} onChange={e => setCompanyField('phone2', onlyDigits(e, 11))} placeholder="08012345678" maxLength={11} />
                </Field>
                <Field label="Email Address" required full>
                  <TInput type="email" value={company.email || ''} onChange={e => setCompanyField('email', e.target.value)} placeholder="company@example.com" />
                </Field>
              </FieldGroup>

              {/* Investment Details */}
              <InvestmentDetailsForm data={corpInvestment} onChange={setCorpInvestment} />

              {/* Corporate Bank Details */}
              <BankDetailsForm data={corpBank} onChange={setCorpBank} label="Corporate Bank Details" />

              {/* Signatories */}
              <div className="mb-8">
                <div style={{ background: 'linear-gradient(135deg,#A67C1A,#D4A017)', borderRadius: 12, padding: '10px 16px', marginBottom: 20 }}>
                  <h3 className="font-bold text-sm tracking-wide text-white">
                    Details of Signatories / Directors / Executives / Trustees
                  </h3>
                </div>
                {signatories.map((sig, i) => (
                  <SignatoryForm key={i} index={i} data={sig}
                    onChange={data => updateSignatory(i, data)}
                    onRemove={() => removeSignatory(i)}
                    canRemove={signatories.length > 1} />
                ))}
                {signatories.length < 4 && (
                  <button onClick={addSignatory}
                    style={{ border: '1.5px dashed rgba(184,134,11,0.4)', borderRadius: 12, padding: '12px 20px', color: '#A67C1A', background: 'rgba(184,134,11,0.05)', cursor: 'pointer', width: '100%', fontSize: 13, fontWeight: 600 }}>
                    + Add Signatory ({signatories.length}/4)
                  </button>
                )}
              </div>

              {/* Account Mandate */}
              <FieldGroup title="Account Mandate">
                <RadioGroup label="Please specify mandate authorization instruction *" full
                  options={['A Only', 'B Only', 'Either to Sign', 'All Signatories', 'Sole (Proprietorship)', 'Others']}
                  value={mandate} onChange={setMandate} />
                {mandate === 'Others' && (
                  <Field label="Please specify" full>
                    <TInput value={company.mandateOther || ''} onChange={e => setCompanyField('mandateOther', e.target.value)} placeholder="Specify mandate instruction" />
                  </Field>
                )}
              </FieldGroup>

              {/* Board Resolution */}
              <FieldGroup title="Board Resolution" gold>
                <Field label="Company Name" required full>
                  <TInput value={boardResolution.companyName || ''} onChange={e => setBoardField('companyName', e.target.value)} placeholder="Full company name" />
                </Field>
                <Field label="Meeting Date" required>
                  <TInput type="date" value={boardResolution.meetingDate || ''} onChange={e => setBoardField('meetingDate', e.target.value)} />
                </Field>
                <Field label="Meeting Location" required>
                  <TInput value={boardResolution.meetingLocation || ''} onChange={e => setBoardField('meetingLocation', e.target.value)} placeholder="Location of board meeting" />
                </Field>
                <Field label="Director Name" required>
                  <TInput value={boardResolution.directorName || ''} onChange={e => setBoardField('directorName', e.target.value)} placeholder="Director full name" />
                </Field>
                <Field label="Director/Secretary Name" required>
                  <TInput value={boardResolution.secretaryName || ''} onChange={e => setBoardField('secretaryName', e.target.value)} placeholder="Director/Secretary full name" />
                </Field>
                <Field label="Director Signature" required>
                  <UploadField label="" value={boardResolution.directorSignature} onChange={f => setBoardField('directorSignature', f)} hint="Sign on paper, photograph and upload" />
                </Field>
                <Field label="Director/Secretary Signature" required>
                  <UploadField label="" value={boardResolution.secretarySignature} onChange={f => setBoardField('secretarySignature', f)} hint="Sign on paper, photograph and upload" />
                </Field>
              </FieldGroup>

              {/* Corporate Requirements Checklist */}
              <FieldGroup title="Document Uploads — Requirements">
                <Field label="Certificate of Incorporation (CAC)" required full>
                  <UploadField label="" value={company.cacDocument} onChange={f => setCompanyField('cacDocument', f)} hint="CAC incorporation forms, Memorandum and Status report" />
                </Field>
                <Field label="SCUML Certificate" required>
                  <UploadField label="" value={company.scumlDocument} onChange={f => setCompanyField('scumlDocument', f)} hint="Special Control Unit Against Money Laundering certificate" />
                </Field>
                <Field label="TIN Certificate">
                  <UploadField label="" value={company.tinDocument} onChange={f => setCompanyField('tinDocument', f)} hint="Tax Identification Number certificate" />
                </Field>
              </FieldGroup>
            </>
          )}

          {/* Terms & Conditions */}
          {accountType && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Terms & Conditions</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    By submitting this form you agree to be bound by Prime Capital's investment terms and conditions, including AML, data protection, and liquidation policies.
                  </p>
                </div>
              </div>
              <button onClick={() => setTcOpen(true)}
                style={{ color: '#A67C1A', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, marginBottom: 12 }}>
                Read Full Terms & Conditions →
              </button>
              <div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={tcAccepted} onChange={e => setTcAccepted(e.target.checked)}
                    style={{ accentColor: '#A67C1A', marginTop: 2, flexShrink: 0 }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    I have read and agree to the Terms and Conditions. I attest that all information provided is accurate and true. I confirm that the source of my funds is legitimate and not proceeds of any unlawful activity.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Submit */}
          {accountType && (
            <GoldButton onClick={handleSubmit} className="w-full" disabled={!tcAccepted}>
              Submit KYC Application
            </GoldButton>
          )}

        </Card>
      </div>

      <TermsModal open={tcOpen} onClose={() => setTcOpen(false)} />
    </div>
  )
}
