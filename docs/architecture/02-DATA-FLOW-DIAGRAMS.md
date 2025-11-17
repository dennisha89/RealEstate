# Data Flow Architecture

## Overview

This document visualizes how data flows through the application for key user interactions.

---

## 1. Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Submit credentials
       ▼
┌─────────────────────┐
│  Login Component    │
│  (Client)           │
└──────┬──────────────┘
       │ 2. signIn()
       ▼
┌─────────────────────┐
│   NextAuth.js       │
│   (API Route)       │
└──────┬──────────────┘
       │ 3. POST /api/auth/callback
       ▼
┌─────────────────────┐
│   Backend API       │
│   (Auth Service)    │
└──────┬──────────────┘
       │ 4. Return user + JWT
       ▼
┌─────────────────────┐
│   NextAuth.js       │
│   (Set session)     │
└──────┬──────────────┘
       │ 5. Set JWT cookie
       ▼
┌─────────────────────┐
│   Middleware        │
│   (Role check)      │
└──────┬──────────────┘
       │ 6. Redirect to /{role}
       ▼
┌─────────────────────┐
│  Dashboard Page     │
│  (Server Component) │
└─────────────────────┘
```

---

## 2. Property Creation Flow

```
Landlord adds new property with photos

┌─────────────────────┐
│  PropertyForm       │ 1. User fills form
│  (Multi-step)       │    + uploads photos
└──────┬──────────────┘
       │ 2. onSubmit()
       ▼
┌─────────────────────┐
│  File Upload        │ 3. Upload photos to S3
│  (Client → S3)      │    via presigned URLs
└──────┬──────────────┘
       │ 4. Photo URLs returned
       ▼
┌─────────────────────┐
│  React Query        │ 5. createProperty mutation
│  (useMutation)      │
└──────┬──────────────┘
       │ 6. POST /api/properties
       ▼
┌─────────────────────┐
│  API Route          │ 7. Validate data
│  (Next.js)          │    + auth check
└──────┬──────────────┘
       │ 8. Forward to backend
       ▼
┌─────────────────────┐
│  Backend API        │ 9. Save to database
│  (Database)         │
└──────┬──────────────┘
       │ 10. Return property object
       ▼
┌─────────────────────┐
│  React Query        │ 11. Update cache
│  (onSuccess)        │     + invalidate queries
└──────┬──────────────┘
       │ 12. UI updates
       ▼
┌─────────────────────┐
│  Property List      │ 13. Show new property
│  (Re-render)        │
└─────────────────────┘
       │
       │ 14. Broadcast event
       ▼
┌─────────────────────┐
│  Pusher/WebSocket   │ 15. Notify other clients
│  (Real-time)        │
└─────────────────────┘
```

---

## 3. Real-time Message Flow

```
Tenant sends message to landlord

┌─────────────────────┐
│  MessageComposer    │ 1. Type message
│  (Client)           │    + click send
└──────┬──────────────┘
       │ 2. sendMessage()
       ▼
┌─────────────────────┐
│  React Query        │ 3. Optimistic update
│  (useMutation)      │    (show message immediately)
└──────┬──────────────┘
       │ 4. POST /api/messages
       ▼
┌─────────────────────┐
│  API Route          │ 5. Validate + save
│  (Next.js)          │
└──────┬──────────────┘
       │ 6. Save to DB
       ▼
┌─────────────────────┐
│  Database           │ 7. Store message
│                     │
└──────┬──────────────┘
       │ 8. Return saved message
       ▼
┌─────────────────────┐
│  Backend            │ 9. Trigger pusher event
│  (Pusher publish)   │
└──────┬──────────────┘
       │
       ├─────────────────────────┐
       │                         │
       ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐
│  Sender (Tenant)    │   │  Recipient          │
│  Pusher listener    │   │  (Landlord)         │
└──────┬──────────────┘   └──────┬──────────────┘
       │ 10a. Confirm sent        │ 10b. Receive message
       ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐
│  React Query        │   │  React Query        │
│  Update cache       │   │  Update cache       │
└──────┬──────────────┘   └──────┬──────────────┘
       │                         │ 11. Show notification
       ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐
│  UI Updated         │   │  Push Notification  │
│  (Remove pending)   │   │  + Badge update     │
└─────────────────────┘   └─────────────────────┘
```

---

## 4. Maintenance Request Workflow

```
Tenant submits maintenance request → Contractor receives work order

┌──────────────────┐
│  Tenant App      │ 1. Fill form + photos
└────────┬─────────┘
         │ 2. Submit request
         ▼
┌──────────────────┐
│  Upload Photos   │ 3. Direct upload to S3
│  (S3 presigned)  │
└────────┬─────────┘
         │ 4. Photo URLs
         ▼
┌──────────────────┐
│  API: Create     │ 5. POST /api/maintenance
│  Maintenance     │
└────────┬─────────┘
         │ 6. Save to DB
         ▼
┌──────────────────┐
│  Database        │ 7. Store request
│  (status: pending)
└────────┬─────────┘
         │ 8. Trigger events
         ├─────────────────────┬─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│ Tenant         │   │ Landlord       │   │ Email Service  │
│ (Pusher)       │   │ (Pusher)       │   │                │
└────────┬───────┘   └────────┬───────┘   └────────┬───────┘
         │ 9. Confirm         │ 10. Notification   │ 11. Send email
         ▼                     ▼                     ▼
┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│ Show success   │   │ Dashboard      │   │ Landlord inbox │
│ message        │   │ badge update   │   │                │
└────────────────┘   └────────┬───────┘   └────────────────┘
                              │ 12. Landlord approves
                              ▼
                     ┌────────────────┐
                     │ Update status  │ 13. PATCH /api/maintenance/:id
                     │ + assign       │     (status: approved)
                     │ contractor     │     (assign: contractor_id)
                     └────────┬───────┘
                              │ 14. Update DB
                              ▼
                     ┌────────────────┐
                     │ Database       │
                     │ (status:       │
                     │  approved)     │
                     └────────┬───────┘
                              │ 15. Notify contractor
                              ▼
                     ┌────────────────┐
                     │ Contractor App │ 16. New work order appears
                     │ (Pusher)       │     + Push notification
                     └────────┬───────┘
                              │ 17. Contractor updates
                              ▼
                     ┌────────────────┐
                     │ Work Order     │ 18. Add photos
                     │ Detail Page    │     + update status
                     └────────┬───────┘
                              │ 19. PATCH /api/work-orders/:id
                              ▼
                     ┌────────────────┐
                     │ Real-time sync │ 20. Update all clients
                     │ (Pusher)       │     (tenant + landlord)
                     └────────────────┘
```

---

## 5. Payment Flow

```
Tenant pays rent

┌─────────────────┐
│ Tenant App      │ 1. Navigate to "Pay Rent"
└────────┬────────┘
         │ 2. Load payment methods
         ▼
┌─────────────────┐
│ React Query     │ 3. GET /api/payment-methods
│ (useQuery)      │
└────────┬────────┘
         │ 4. Show saved cards
         ▼
┌─────────────────┐
│ PaymentForm     │ 5. Select card or enter new
└────────┬────────┘
         │ 6. Click "Pay Now"
         ▼
┌─────────────────┐
│ Stripe.js       │ 7. Tokenize card (client-side)
│ (Client SDK)    │    (PCI compliant)
└────────┬────────┘
         │ 8. Return payment token
         ▼
┌─────────────────┐
│ React Query     │ 9. POST /api/payments
│ (useMutation)   │    { token, amount }
└────────┬────────┘
         │ 10. Forward to backend
         ▼
┌─────────────────┐
│ Backend API     │ 11. Charge via Stripe API
└────────┬────────┘
         │ 12. Payment succeeded
         ▼
┌─────────────────┐
│ Database        │ 13. Record payment
│                 │     + update lease
└────────┬────────┘
         │ 14. Return payment record
         ▼
┌─────────────────┐
│ React Query     │ 15. Update cache
│ (onSuccess)     │     + invalidate queries
└────────┬────────┘
         │
         ├─────────────────────┬─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│ Tenant UI      │   │ Landlord       │   │ Email/Receipt  │
│ Show receipt   │   │ (Pusher)       │   │                │
└────────────────┘   └────────┬───────┘   └────────────────┘
                              │ 16. Notification
                              ▼
                     ┌────────────────┐
                     │ Dashboard      │ 17. Update revenue chart
                     │ (Real-time)    │
                     └────────────────┘
```

---

## 6. State Management Flow

```
How state flows through the application

┌─────────────────────────────────────────────────────┐
│                    User Action                       │
│             (Click, type, scroll, etc.)              │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  Local State     │   │  Form State      │
│  (useState)      │   │  (React Hook     │
│                  │   │   Form)          │
│ - UI toggles     │   │                  │
│ - Temp data      │   │ - Input values   │
│ - Loading flags  │   │ - Validation     │
└──────────────────┘   └────────┬─────────┘
                                │ On submit
                                ▼
                       ┌──────────────────┐
                       │  Client State    │
                       │  (Zustand)       │
                       │                  │
                       │ - Theme          │
                       │ - Sidebar open   │
                       │ - Preferences    │
                       └──────────────────┘
                                │
                                │ Trigger mutation
                                ▼
                       ┌──────────────────┐
                       │  Server State    │
                       │  (React Query)   │
                       │                  │
                       │ - Properties     │
                       │ - Tenants        │
                       │ - Payments       │
                       └────────┬─────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
           ┌──────────────────┐   ┌──────────────────┐
           │  API Request     │   │  Optimistic      │
           │  (Fetch)         │   │  Update (Cache)  │
           └────────┬─────────┘   └──────────────────┘
                    │                       ▲
                    │ Response              │ Rollback on error
                    ▼                       │
           ┌──────────────────┐            │
           │  Cache Update    │────────────┘
           │  (React Query)   │
           └────────┬─────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  Component       │   │  Real-time       │
│  Re-render       │   │  Sync (Pusher)   │
└──────────────────┘   └────────┬─────────┘
                                │ Other clients update
                                ▼
                       ┌──────────────────┐
                       │  Cache           │
                       │  Invalidation    │
                       └──────────────────┘
```

---

## 7. File Upload Flow

```
User uploads property inspection photos

┌─────────────────┐
│  FileUpload     │ 1. User selects files
│  Component      │    (drag-drop or click)
└────────┬────────┘
         │ 2. Validate files
         │    - Type check (image/*)
         │    - Size check (<5MB)
         ▼
┌─────────────────┐
│  Generate       │ 3. Create preview URLs
│  Previews       │    (URL.createObjectURL)
└────────┬────────┘
         │ 4. Show previews to user
         ▼
┌─────────────────┐
│  User confirms  │ 5. Click "Upload"
└────────┬────────┘
         │ 6. Request presigned URLs
         ▼
┌─────────────────┐
│  API Route      │ 7. POST /api/upload/presigned
│  GET presigned  │    { fileNames, fileTypes }
│  URLs           │
└────────┬────────┘
         │ 8. Generate S3 presigned URLs
         ▼
┌─────────────────┐
│  AWS S3 SDK     │ 9. Return presigned URLs
│  (Backend)      │    + expiry time
└────────┬────────┘
         │ 10. URLs returned to client
         ▼
┌─────────────────┐
│  Client         │ 11. Upload files directly to S3
│  (Parallel)     │     (bypasses backend)
│                 │     
│  ┌────────┐    │     Show progress bars
│  │ File 1 │────┼──► S3 Bucket
│  └────────┘    │
│  ┌────────┐    │
│  │ File 2 │────┼──► S3 Bucket
│  └────────┘    │
│  ┌────────┐    │
│  │ File 3 │────┼──► S3 Bucket
│  └────────┘    │
└────────┬────────┘
         │ 12. All uploads complete
         ▼
┌─────────────────┐
│  Return URLs    │ 13. Public S3 URLs
│  to form        │
└────────┬────────┘
         │ 14. Include in form data
         ▼
┌─────────────────┐
│  Submit form    │ 15. POST /api/properties
│  with photo     │     { ...data, photoUrls }
│  URLs           │
└─────────────────┘
```

---

## 8. Caching Strategy

```
Multi-layer caching for optimal performance

┌─────────────────────────────────────────┐
│           User Request                   │
└────────────────┬────────────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  CDN Cache       │ ← Static assets (images, JS, CSS)
        │  (CloudFront/    │   TTL: 1 year
        │   Vercel Edge)   │
        └────────┬─────────┘
                 │ Miss
                 ▼
        ┌─────────────────┐
        │  Browser Cache   │ ← Service Worker cache (PWA)
        │  (IndexedDB)     │   Offline-first strategy
        └────────┬─────────┘
                 │ Miss
                 ▼
        ┌─────────────────┐
        │  React Query     │ ← API response cache
        │  Cache           │   Stale-while-revalidate
        │                  │   TTL: 5 minutes (configurable)
        └────────┬─────────┘
                 │ Stale or miss
                 ▼
        ┌─────────────────┐
        │  Next.js Data    │ ← Server-rendered pages
        │  Cache           │   ISR: Revalidate on interval
        │  (ISR/SSR)       │
        └────────┬─────────┘
                 │ Miss or expired
                 ▼
        ┌─────────────────┐
        │  API Request     │ ← Backend API call
        │                  │
        └────────┬─────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  Backend Cache   │ ← Redis cache
        │  (Redis)         │   TTL: 10 minutes
        └────────┬─────────┘
                 │ Miss
                 ▼
        ┌─────────────────┐
        │  Database        │ ← Source of truth
        │  (PostgreSQL)    │
        └─────────────────┘


Cache Invalidation Strategy:
────────────────────────────

1. On Create/Update/Delete:
   - Invalidate React Query cache keys
   - Revalidate Next.js pages (on-demand ISR)
   - Clear Redis cache for affected keys
   - Broadcast invalidation via Pusher

2. Real-time updates:
   - Pusher event → Update React Query cache directly
   - No need to refetch from API

3. Background revalidation:
   - React Query: staleTime + refetchOnWindowFocus
   - Next.js ISR: Time-based revalidation
```

---

## 9. Error Handling Flow

```
Comprehensive error handling across all layers

┌─────────────────┐
│  User Action    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Form           │ 1. Client-side validation
│  Validation     │    (Zod schema)
│  (Zod)          │
└────────┬────────┘
         │ Valid
         ▼
┌─────────────────┐
│  API Request    │ 2. Try mutation
│  (React Query)  │
└────────┬────────┘
         │
         ├─── Success ─────────┐
         │                     │
         │ Error               ▼
         ▼              ┌─────────────────┐
┌─────────────────┐    │  onSuccess       │
│  Error caught   │    │  - Update cache  │
│                 │    │  - Show toast    │
└────────┬────────┘    │  - Redirect      │
         │             └─────────────────┘
         │
    ┌────┴─────┬──────────┬──────────────┐
    │          │          │              │
    ▼          ▼          ▼              ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐
│Network │ │ 400    │ │ 401    │ │ 500        │
│Error   │ │ Bad    │ │ Unauth │ │ Server     │
│        │ │ Request│ │        │ │ Error      │
└───┬────┘ └───┬────┘ └───┬────┘ └─────┬──────┘
    │          │          │            │
    │          │          │            │
    ▼          ▼          ▼            ▼
┌──────────────────────────────────────────┐
│  Error Boundary / Toast Notification     │
│                                          │
│  - Network: "Check your connection"      │
│  - 400: Show validation errors           │
│  - 401: Redirect to login                │
│  - 500: "Something went wrong"           │
│         + Log to Sentry                  │
└────────────────┬─────────────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  Retry Logic     │
        │  (React Query)   │
        │                  │
        │  - Retry 3 times │
        │  - Exponential   │
        │    backoff       │
        └─────────────────┘
```

---

## Summary

These data flows demonstrate:

1. **Unidirectional data flow** - Clear, predictable state updates
2. **Optimistic updates** - Instant UI feedback
3. **Real-time sync** - WebSocket events keep all clients in sync
4. **Layered caching** - Optimal performance at every level
5. **Robust error handling** - Graceful degradation
6. **Security** - Authentication/authorization at every layer
7. **Scalability** - Offload work to client and CDN where possible

The architecture ensures:
- ⚡ Fast user experience
- 🔄 Real-time collaboration
- 🛡️ Data consistency
- 🔐 Security
- 📱 Offline support (PWA)
