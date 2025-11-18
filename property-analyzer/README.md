# 🏠 Property Analyzer - AI-Powered Real Estate Analysis

Analyze any property in 60 seconds. Get instant buy/pass recommendations with AI.

## What It Does

- **Instant Analysis**: Enter any property address and get comprehensive financial analysis in seconds
- **AI Scoring**: 0-100 score with buy/pass/hold recommendations
- **Financial Metrics**: Cap rate, cash-on-cash return, monthly cash flow projections
- **Realistic Calculations**: Forces realistic expenses (vacancy, maintenance, CapEx, property management)
- **Mobile-First UI**: Beautiful, responsive design that works on all devices

## Features

### Current (MVP v0.1)
- ✅ Property address input
- ✅ Financial calculator (mortgage, expenses, cash flow)
- ✅ AI scoring algorithm (0-100 with recommendations)
- ✅ Detailed results breakdown
- ✅ Mock property data (for testing)

### Coming Soon
- 🔄 Real Zillow data scraping
- 🔄 RentCast API integration for accurate rent estimates
- 🔄 Google Places autocomplete for addresses
- 🔄 Supabase database to save analyses
- 🔄 User authentication
- 🔄 Analysis history
- 🔄 PDF export
- 🔄 Subscription pricing ($20/month)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Calculations**: Custom financial engine
- **API**: Next.js API routes
- **Deployment**: Vercel (planned)

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
open http://localhost:3000
```

## How It Works

### 1. User Input
User enters:
- Property address
- Purchase price (optional - will use estimate if blank)
- Down payment % (default: 20%)
- Interest rate % (default: 7.5%)

### 2. Property Data Fetch
Currently uses mock data. Will integrate:
- **Zillow scraping**: Property details, estimated value
- **RentCast API**: Rent estimates
- **County records**: Property tax rates

### 3. Financial Calculations

**Monthly Mortgage Payment:**
```
P * [r(1+r)^n] / [(1+r)^n - 1]
```

**Monthly Expenses:**
- Property tax (1.25% annual average / 12)
- Insurance (0.7% of value / 12)
- Property management (10% of rent)
- Maintenance (1% of value / 12)
- CapEx reserves (1% of value / 12)
- Vacancy (8% of rent)

**Monthly Cash Flow:**
```
Rent - Mortgage - Expenses
```

**Cap Rate:**
```
(Annual NOI / Purchase Price) * 100
```

**Cash-on-Cash Return:**
```
(Annual Cash Flow / Cash Invested) * 100
```

### 4. AI Scoring Algorithm

**Scoring Factors:**
- **Cash flow** (most important): +30 points for >$500/month
- **Cap rate**: +15 points for >8%
- **Cash-on-cash return**: +10 points for >10%
- **Price vs value**: +20 points for 15%+ below market

**Recommendations:**
- 80-100: **STRONG BUY** 🔥
- 60-79: **BUY** 👍
- 40-59: **HOLD** ⚠️
- 0-39: **PASS** ❌

### 5. Results Display
Shows:
- Property details (beds, baths, sqft, value)
- Financial breakdown (income, expenses, cash flow)
- Key metrics (cap rate, CoC return)
- AI score and recommendation
- Explanation (positives and negatives)

## Project Structure

```
property-analyzer/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts          # API endpoint for analysis
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage
├── components/
│   ├── PropertyForm.tsx          # Property input form
│   └── ResultsDisplay.tsx        # Analysis results display
├── lib/
│   └── calculator.ts             # Financial calculation engine
├── public/                       # Static assets
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

## Roadmap

### Week 1 (Current)
- [x] Project setup
- [x] Basic UI
- [x] Financial calculator
- [x] AI scoring algorithm
- [x] Mock data

### Week 2
- [ ] Zillow scraping integration
- [ ] RentCast API integration
- [ ] Supabase database setup
- [ ] Save analysis history

### Week 3
- [ ] User authentication
- [ ] Google Places autocomplete
- [ ] Analysis history page
- [ ] PDF export

### Week 4
- [ ] Subscription pricing (Stripe)
- [ ] Rate limiting
- [ ] SEO optimization
- [ ] Deploy to Vercel
- [ ] ProductHunt launch

## Environment Variables

Create `.env.local`:

```bash
# Supabase (coming soon)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# RentCast API (coming soon)
RENTCAST_API_KEY=your_rentcast_api_key

# Google Places (coming soon)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_api_key
```

## Testing

Try these addresses:
- "123 Main St, Austin, TX"
- "456 Oak Ave, Portland, OR"
- "789 Pine St, Seattle, WA"

(Currently generates mock data - real addresses coming soon)

## Business Model

**Freemium:**
- Free: 3 analyses per month
- Pro ($20/month): Unlimited analyses, save history, PDF export

**Target:**
- 100 paying users = $2,000 MRR (Month 3)
- 500 paying users = $10,000 MRR (Month 6)

## Contributing

This is a solo project currently. Open sourcing coming later.

## License

Proprietary - All rights reserved

## Contact

Questions? Open an issue.

---

**Built with ❤️ for real estate investors who want to stop losing deals to analysis paralysis.**
