# Architecture Overview Diagram

## System Architecture (High-Level)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js 14)                      │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Browser / Mobile Device                    │  │
│  │                                                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │  │  Landlord    │  │   Tenant     │  │ Contractor   │       │  │
│  │  │  Interface   │  │  Interface   │  │  Interface   │       │  │
│  │  │  (Desktop)   │  │  (Mobile)    │  │  (Mobile)    │       │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │  │
│  │         │                 │                 │                │  │
│  │         └─────────────────┴─────────────────┘                │  │
│  │                           │                                   │  │
│  └───────────────────────────┼───────────────────────────────────┘  │
│                              │                                      │
│  ┌───────────────────────────┼───────────────────────────────────┐  │
│  │         State Management Layer                                │  │
│  │                                                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │  │   Zustand    │  │ React Query  │  │ React Hook   │       │  │
│  │  │ (Client      │  │ (Server      │  │ Form         │       │  │
│  │  │  State)      │  │  State)      │  │ (Form State) │       │  │
│  │  └──────────────┘  └──────┬───────┘  └──────────────┘       │  │
│  │                           │                                   │  │
│  └───────────────────────────┼───────────────────────────────────┘  │
│                              │                                      │
│  ┌───────────────────────────┼───────────────────────────────────┐  │
│  │         Component Layer                                       │  │
│  │                                                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │  │
│  │  │ UI       │  │ Shared   │  │ Features │  │ Layouts  │     │  │
│  │  │ (shadcn) │  │ Business │  │ (Domain) │  │          │     │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │  │
│  │                                                               │  │
│  └───────────────────────────┼───────────────────────────────────┘  │
│                              │                                      │
│  ┌───────────────────────────┼───────────────────────────────────┐  │
│  │         API Layer (Next.js API Routes)                        │  │
│  │                                                               │  │
│  │  /api/auth     /api/upload    /api/pusher    /api/webhooks   │  │
│  │                                                               │  │
│  └───────────────────────────┼───────────────────────────────────┘  │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               │ HTTPS / REST / WebSocket
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                              │                                      │
│                     BACKEND SERVICES                                │
│                              │                                      │
│  ┌───────────────────────────┼───────────────────────────────────┐  │
│  │                           │                                   │  │
│  │    ┌──────────────────────▼──────────────────────┐           │  │
│  │    │         Backend API (Your API)              │           │  │
│  │    │                                             │           │  │
│  │    │  - Authentication & Authorization           │           │  │
│  │    │  - Business Logic                           │           │  │
│  │    │  - Data Validation                          │           │  │
│  │    │  - Webhook Handlers                         │           │  │
│  │    └──────────┬─────────────────────┬────────────┘           │  │
│  │               │                     │                        │  │
│  │               ▼                     ▼                        │  │
│  │    ┌──────────────────┐  ┌──────────────────┐              │  │
│  │    │   PostgreSQL     │  │   Redis Cache    │              │  │
│  │    │   (Database)     │  │                  │              │  │
│  │    └──────────────────┘  └──────────────────┘              │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                      THIRD-PARTY SERVICES                           │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │   Pusher    │  │   AWS S3    │  │   Stripe    │  │ SendGrid │ │
│  │ (Real-time) │  │  (Storage)  │  │ (Payments)  │  │ (Email)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────┘ │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   Sentry    │  │  Vercel     │  │   Google    │               │
│  │ (Errors)    │  │ Analytics   │  │  OAuth      │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

## Request Flow

### 1. Page Load (SSR)

```
User Request → Next.js Server → Render Server Components
                    ↓
            Fetch data from API
                    ↓
            Generate HTML
                    ↓
            Send to Browser
                    ↓
            Hydrate Client Components
                    ↓
            Interactive Page
```

### 2. Client-Side Navigation

```
User Click → Next.js Router → Prefetch Page Data
                  ↓
          Load Route Component
                  ↓
          React Query fetches data
                  ↓
          Render with data
                  ↓
          Interactive
```

### 3. Form Submission

```
User Submit → React Hook Form validates
                     ↓
              Zod schema check
                     ↓
              React Query mutation
                     ↓
              POST to API route
                     ↓
              Forward to Backend API
                     ↓
              Save to Database
                     ↓
              Return response
                     ↓
              Update React Query cache
                     ↓
              Trigger Pusher event
                     ↓
              Update UI (optimistic)
                     ↓
              Confirm success
```

### 4. Real-time Update

```
Event occurs (e.g., new message)
        ↓
Backend publishes to Pusher
        ↓
Pusher sends to all connected clients
        ↓
Client receives event
        ↓
React Query updates cache
        ↓
Component re-renders
        ↓
UI updates instantly
```

### 5. File Upload

```
User selects file
        ↓
Request presigned URL from API
        ↓
API generates S3 presigned URL
        ↓
Client uploads directly to S3 (with progress)
        ↓
S3 returns file URL
        ↓
Client sends URL to API
        ↓
API saves URL in database
        ↓
React Query updates cache
        ↓
UI shows uploaded file
```

## Technology Stack Map

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                      │
├─────────────────────────────────────────────────────────────┤
│  Framework:      Next.js 14 (App Router)                    │
│  UI Library:     React 18+                                  │
│  Language:       TypeScript                                 │
│  Styling:        Tailwind CSS                               │
│  Components:     shadcn/ui (Radix UI primitives)            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       STATE LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  Client State:   Zustand                                    │
│  Server State:   TanStack Query (React Query)               │
│  Form State:     React Hook Form                            │
│  Validation:     Zod                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                               │
├─────────────────────────────────────────────────────────────┤
│  API Client:     Fetch / Axios                              │
│  Real-time:      Pusher / Ably                              │
│  Authentication: NextAuth.js                                │
│  File Upload:    UploadThing / AWS S3                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     UTILITIES                                │
├─────────────────────────────────────────────────────────────┤
│  Date:           date-fns                                   │
│  Charts:         Recharts                                   │
│  PDF:            react-pdf / jsPDF                          │
│  Icons:          Lucide React                               │
│  Utils:          clsx, tailwind-merge                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     TESTING                                  │
├─────────────────────────────────────────────────────────────┤
│  Unit/Integration: Vitest                                   │
│  Component:        Testing Library                          │
│  E2E:              Playwright                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    BUILD & DEPLOY                            │
├─────────────────────────────────────────────────────────────┤
│  Build:          Next.js build                              │
│  Bundler:        Webpack (Next.js default)                  │
│  Hosting:        Vercel / Docker                            │
│  CDN:            Vercel Edge / CloudFront                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  MONITORING & ANALYTICS                      │
├─────────────────────────────────────────────────────────────┤
│  Errors:         Sentry                                     │
│  Analytics:      Vercel Analytics / Google Analytics        │
│  Performance:    Web Vitals / Lighthouse                    │
└─────────────────────────────────────────────────────────────┘
```

## User Flow Diagrams

### Landlord: Add Property Flow

```
┌──────────────────┐
│ Dashboard        │
│ Click "Add       │
│ Property"        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Property Form    │
│ Step 1: Basic    │
│ Info             │
└────────┬─────────┘
         │ Next
         ▼
┌──────────────────┐
│ Step 2: Details  │
└────────┬─────────┘
         │ Next
         ▼
┌──────────────────┐
│ Step 3:          │
│ Financial        │
└────────┬─────────┘
         │ Next
         ▼
┌──────────────────┐
│ Step 4: Photos   │
│ - Upload to S3   │
│ - Show progress  │
└────────┬─────────┘
         │ Submit
         ▼
┌──────────────────┐
│ API: Create      │
│ Property         │
└────────┬─────────┘
         │ Success
         ▼
┌──────────────────┐
│ Property List    │
│ (New property    │
│  appears)        │
└──────────────────┘
```

### Tenant: Pay Rent Flow

```
┌──────────────────┐
│ Tenant Dashboard │
│ Click "Pay Rent" │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Payment Page     │
│ - Amount due     │
│ - Due date       │
└────────┬─────────┘
         │ Select payment method
         ▼
┌──────────────────┐
│ Choose:          │
│ - Saved card     │
│ - New card       │
│ - Bank account   │
└────────┬─────────┘
         │ Confirm
         ▼
┌──────────────────┐
│ Stripe.js        │
│ Tokenize card    │
└────────┬─────────┘
         │ Token
         ▼
┌──────────────────┐
│ API: Process     │
│ Payment          │
└────────┬─────────┘
         │ Success
         ▼
┌──────────────────┐
│ Success Screen   │
│ - Receipt        │
│ - Email sent     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Real-time:       │
│ Landlord gets    │
│ notification     │
└──────────────────┘
```

### Contractor: Complete Work Order Flow

```
┌──────────────────┐
│ Work Order List  │
│ Click order      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Work Order       │
│ Details          │
│ - Description    │
│ - Location       │
│ - Photos         │
└────────┬─────────┘
         │ Update status
         ▼
┌──────────────────┐
│ Status: "In      │
│ Progress"        │
└────────┬─────────┘
         │ Real-time update
         ▼
┌──────────────────┐
│ Landlord + Tenant│
│ see update       │
└──────────────────┘
         │ Work complete
         ▼
┌──────────────────┐
│ Add completion   │
│ photos           │
│ - Take with      │
│   camera         │
│ - Upload to S3   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Status:          │
│ "Completed"      │
└────────┬─────────┘
         │ Notify
         ▼
┌──────────────────┐
│ Push notification│
│ to Landlord +    │
│ Tenant           │
└──────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USERS (Global)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│              CDN / Edge Network                         │
│           (Vercel Edge / CloudFront)                    │
│                                                         │
│  - Static assets (JS, CSS, images)                     │
│  - Cached HTML pages                                   │
│  - Geo-distributed                                     │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│              Next.js Application                        │
│              (Vercel Serverless Functions)              │
│                                                         │
│  - Server Components (SSR)                             │
│  - API Routes                                          │
│  - Middleware (Auth, RBAC)                             │
│  - Edge Functions                                      │
└───┬──────────────┬───────────────┬────────────────────┘
    │              │               │
    ▼              ▼               ▼
┌─────────┐  ┌─────────┐  ┌────────────┐
│ Backend │  │  Pusher │  │   AWS S3   │
│   API   │  │         │  │  (Files)   │
└─────────┘  └─────────┘  └────────────┘
    │
    ▼
┌─────────────────┐
│   PostgreSQL    │
│   (Database)    │
└─────────────────┘
```

## Security Architecture

```
┌────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                      │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Layer 1: Network Security                             │
│  ├─ HTTPS/TLS 1.3                                      │
│  ├─ Security Headers (CSP, HSTS, etc.)                 │
│  └─ DDoS Protection (Vercel)                           │
│                                                         │
│  Layer 2: Authentication                               │
│  ├─ NextAuth.js (JWT sessions)                         │
│  ├─ Password hashing (bcrypt)                          │
│  ├─ OAuth providers (Google, etc.)                     │
│  └─ Session management                                 │
│                                                         │
│  Layer 3: Authorization                                │
│  ├─ Role-based access control (RBAC)                   │
│  ├─ Route protection (middleware)                      │
│  ├─ API endpoint guards                                │
│  └─ Resource ownership checks                          │
│                                                         │
│  Layer 4: Data Validation                              │
│  ├─ Client-side (Zod schema)                           │
│  ├─ Server-side (Zod schema)                           │
│  ├─ SQL injection prevention (ORM)                     │
│  └─ XSS prevention (React escaping)                    │
│                                                         │
│  Layer 5: API Security                                 │
│  ├─ Rate limiting                                      │
│  ├─ CSRF tokens                                        │
│  ├─ Request signing (Stripe webhooks)                  │
│  └─ API key rotation                                   │
│                                                         │
│  Layer 6: File Upload Security                         │
│  ├─ Presigned URLs (time-limited)                      │
│  ├─ File type validation                               │
│  ├─ File size limits                                   │
│  └─ Virus scanning (ClamAV)                            │
│                                                         │
│  Layer 7: Monitoring & Logging                         │
│  ├─ Error tracking (Sentry)                            │
│  ├─ Access logs                                        │
│  ├─ Audit trail                                        │
│  └─ Security alerts                                    │
│                                                         │
└────────────────────────────────────────────────────────┘
```

## Performance Optimization Strategy

```
┌────────────────────────────────────────────────────────┐
│              PERFORMANCE OPTIMIZATIONS                  │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend:                                             │
│  ├─ Code splitting (route-based + component)           │
│  ├─ Lazy loading (dynamic imports)                     │
│  ├─ Image optimization (Next.js Image)                 │
│  ├─ Tree shaking (remove unused code)                  │
│  ├─ Bundle analysis (webpack-bundle-analyzer)          │
│  └─ Prefetching (Link prefetch)                        │
│                                                         │
│  Caching:                                              │
│  ├─ CDN caching (static assets)                        │
│  ├─ Browser caching (service worker)                   │
│  ├─ React Query cache (API responses)                  │
│  ├─ Next.js ISR (page regeneration)                    │
│  └─ Redis cache (backend)                              │
│                                                         │
│  Rendering:                                            │
│  ├─ Server Components (reduce client JS)               │
│  ├─ Streaming (progressive rendering)                  │
│  ├─ Suspense boundaries                                │
│  └─ Concurrent rendering                               │
│                                                         │
│  Data Fetching:                                        │
│  ├─ Parallel requests (Promise.all)                    │
│  ├─ Request deduplication (React Query)                │
│  ├─ Pagination (limit data transfer)                   │
│  └─ Optimistic updates (instant feedback)              │
│                                                         │
│  Monitoring:                                           │
│  ├─ Web Vitals tracking                                │
│  ├─ Lighthouse CI                                      │
│  ├─ Performance budgets                                │
│  └─ Real User Monitoring (RUM)                         │
│                                                         │
└────────────────────────────────────────────────────────┘
```

This overview provides a bird's-eye view of the entire architecture. For detailed information, refer to the specific documentation files.
