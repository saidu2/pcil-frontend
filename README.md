# Prime Capital & Investment Ltd — Investor Portal

Modern, production-ready client investment portal. React + Vite + Tailwind CSS.

---

## 🚀 How to Run Locally

### Prerequisites
- **Node.js v18+** → Download from https://nodejs.org (choose LTS version)

### Steps

```bash
cd prime-capital
npm install
npm run dev
```

Open browser at: **http://localhost:5173**

---

## 🗺️ Client Journey

```
Sign Up
  ↓
Complete KYC (Individual / Joint / Minor / Corporate)
  ↓
Status: Pending → Staff reviews in D365
  ↓                      ↓
KYC Denied          KYC Approved
  ↓                      ↓
Resubmit           Can now Subscribe
                         ↓
               Select Product → Enter Amount
               → Bank transfer details shown (NGN or USD)
               → Client transfers funds
               → Uploads proof of payment
               → Status: Pending Review
                         ↓
               Staff reviews in D365
                         ↓
               Approved → Dashboard shows active investment
               Denied   → Client notified to resubmit
                         ↓
               Client submits Redemption Request
               → 5 working day notice period
               → Staff processes in D365
               → Portfolio updated on approval
```

---

## 📁 Project Structure

```
prime-capital/
├── src/
│   ├── data/
│   │   ├── constants.js     ← Company info, bank details, status enums
│   │   └── mockData.js      ← All 9 products + quiz questions
│   ├── context/
│   │   ├── AuthContext.jsx  ← User state, KYC status, subscriptions, notifications
│   │   └── ThemeContext.jsx ← Light/Dark mode
│   ├── components/
│   │   ├── Navbar.jsx           ← With notification bell + user avatar
│   │   ├── KycBanner.jsx        ← Status banner shown on all pages
│   │   ├── NotificationBell.jsx ← In-app notification dropdown
│   │   ├── ProtectedRoute.jsx   ← Auth guard
│   │   ├── Footer.jsx           ← Real company details
│   │   └── UI.jsx               ← Reusable components
│   ├── pages/
│   │   ├── Landing.jsx    ← Home page
│   │   ├── Login.jsx      ← Sign in
│   │   ├── Signup.jsx     ← Register
│   │   ├── Dashboard.jsx  ← Portfolio, subscriptions, transactions, redemption
│   │   ├── Products.jsx   ← 9 products with KYC gate + payment flow
│   │   ├── Quiz.jsx       ← 7-question risk assessment
│   │   └── KYC.jsx        ← Full KYC form (Individual/Joint/Minor/Corporate)
│   └── utils/
│       └── api.js         ← All API placeholders (swap for real endpoints)
```

---

## 🔑 KYC States

| State | Dashboard | Can Subscribe | Banner Shown |
|---|---|---|---|
| `not_submitted` | Limited | ❌ | ⚠️ Complete KYC |
| `pending` | Limited | ❌ | ⏳ Under Review |
| `approved` | Full | ✅ | None |
| `denied` | Limited | ❌ | ❌ Resubmit KYC |

---

## 📦 Subscription Flow

1. Client selects product and enters investment amount
2. Bank transfer details shown (NGN or USD account)
3. Client transfers funds and uploads proof of payment
4. Status set to `pending_review` — awaits staff action in D365
5. D365 webhook fires `SUB_APPROVED` or `SUB_DENIED`
6. Client notified by email and in-app notification

> ⚠️ There is NO auto-approval. All activations require staff review in D365.

---

## 💸 Redemption Flow

1. Client submits redemption request from Dashboard
2. Request recorded as `Pending` — no funds deducted yet
3. 5 working day notice period applies (per Terms & Conditions)
4. Staff reviews and processes in D365
5. D365 webhook fires confirmation
6. Portfolio updated and client notified

> ⚠️ Redemptions are NOT instant. Early redemption carries a 20% penalty on accrued profit.

---

## 💰 Payment Details

Located in `src/data/constants.js`:

| Field | Value |
|---|---|
| Bank | Zenith Bank |
| Account Name | Prime Capital & Investment Ltd |
| Account Number | 2019283746 |
| Currency | NGN |

USD account: add to `PAYMENT_ACCOUNTS` array when available.

---

## 🔌 Microsoft Dynamics 365 Integration (Backend)

D365 sends webhook events to the backend:

```json
{ "event": "KYC_APPROVED",  "userId": "...", "timestamp": "..." }
{ "event": "KYC_DENIED",    "userId": "...", "reason": "...", "timestamp": "..." }
{ "event": "SUB_APPROVED",  "subscriptionId": "...", "userId": "..." }
{ "event": "SUB_DENIED",    "subscriptionId": "...", "reason": "..." }
```

Backend processes these and updates client-facing app via FastAPI endpoints.

---

## 🏗️ Production Tech Stack (Planned)

| Layer | Technology |
|---|---|
| Web Frontend | React 18 + Vite + TypeScript + Tailwind |
| Mobile | React Native + Expo (iOS & Android) |
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL 15 (Azure) |
| Cache / Queue | Redis (Azure) |
| File Storage | Azure Blob Storage |
| Email | SendGrid |
| ERP | Microsoft Dynamics 365 |
| Hosting | Azure (Web + API + DB) |

---

**Prime Capital & Investment Ltd**
No. 3 Sankuru Close, Off Rima Street, Maitama, Abuja
📞 08100276250 · ✉️ info@primecapital.ng
