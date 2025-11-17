# Tech Stack Justification & Implementation Guide

## Technology Selection Rationale

### 1. Next.js 14+ (App Router)

**Why Next.js?**
- ✅ **SEO-friendly**: Server-side rendering for marketing pages
- ✅ **Performance**: Server Components reduce client-side bundle
- ✅ **Developer Experience**: File-based routing, built-in TypeScript
- ✅ **Image Optimization**: Automatic image optimization and lazy loading
- ✅ **API Routes**: BFF (Backend for Frontend) pattern built-in
- ✅ **Deployment**: Seamless Vercel deployment with edge functions
- ✅ **Community**: Largest React framework ecosystem

**Why App Router over Pages Router?**
| Feature | App Router | Pages Router |
|---------|-----------|--------------|
| Server Components | ✅ Yes | ❌ No |
| Streaming | ✅ Yes | ❌ No |
| Layouts | ✅ Nested | ⚠️ Limited |
| Loading UI | ✅ Built-in | ❌ Manual |
| Data Fetching | ✅ Simplified | ⚠️ Complex |
| Bundle Size | ✅ Smaller | ⚠️ Larger |

**Alternatives Considered:**
- **Remix**: Great DX, but smaller ecosystem than Next.js
- **Gatsby**: Better for static sites, overkill for SaaS
- **Create React App**: No SSR, manual configuration required
- **Vite + React Router**: More setup, no built-in SSR

**Decision**: Next.js App Router provides the best balance of features, performance, and developer experience.

---

### 2. React 18+ with TypeScript

**Why React?**
- ✅ **Largest ecosystem**: More libraries, components, and resources
- ✅ **Concurrent rendering**: Better UX with suspense and transitions
- ✅ **Server Components**: Reduce client bundle size
- ✅ **Hiring**: Easier to find React developers
- ✅ **Stability**: Battle-tested in production at scale

**Why TypeScript?**
- ✅ **Type safety**: Catch errors at compile time
- ✅ **IntelliSense**: Better autocomplete and documentation
- ✅ **Refactoring**: Safer refactoring with type checking
- ✅ **Team collaboration**: Self-documenting code
- ✅ **API integration**: Type-safe API calls

**Alternatives Considered:**
- **Vue 3**: Great framework, but smaller ecosystem
- **Svelte**: Excellent performance, but less mature ecosystem
- **Angular**: Enterprise-ready, but steeper learning curve
- **Solid.js**: Innovative, but very new and small community

**Decision**: React + TypeScript is the industry standard for enterprise SaaS applications.

---

### 3. Zustand + TanStack Query (React Query)

**Why This Combination?**

**Zustand for Client State:**
- ✅ **Lightweight**: Only 1KB gzipped
- ✅ **Simple API**: Minimal boilerplate compared to Redux
- ✅ **No Context Provider**: Use anywhere without wrapping
- ✅ **TypeScript-first**: Excellent TS support
- ✅ **Middleware**: Built-in persistence, devtools

**TanStack Query for Server State:**
- ✅ **Purpose-built**: Designed for server state management
- ✅ **Automatic caching**: Smart caching with background refetching
- ✅ **Optimistic updates**: Better UX with instant feedback
- ✅ **Real-time sync**: Easy integration with WebSockets
- ✅ **Devtools**: Excellent debugging experience

**Why Not Redux?**
| Aspect | Redux | Zustand + React Query |
|--------|-------|----------------------|
| Boilerplate | ❌ High | ✅ Minimal |
| Learning Curve | ❌ Steep | ✅ Gentle |
| Bundle Size | ❌ Large | ✅ Small |
| Server State | ⚠️ Manual | ✅ Built-in |
| DevTools | ✅ Excellent | ✅ Excellent |

**Alternatives Considered:**
- **Redux Toolkit**: Better than vanilla Redux, but still more complex
- **MobX**: Great for OOP, but less popular in React community
- **Jotai/Recoil**: Atomic state, but more experimental
- **Context API**: Too limited for complex state

**Decision**: Zustand + TanStack Query provides the best balance of simplicity and power.

---

### 4. Tailwind CSS + shadcn/ui

**Why Tailwind CSS?**
- ✅ **Utility-first**: Rapid development with utility classes
- ✅ **Consistent design**: Built-in design system
- ✅ **Bundle size**: PurgeCSS removes unused styles
- ✅ **Responsive**: Mobile-first responsive utilities
- ✅ **Customization**: Fully customizable via config
- ✅ **Community**: Huge ecosystem of plugins and components

**Why shadcn/ui?**
- ✅ **Copy-paste components**: Own the code, not a dependency
- ✅ **Accessible**: Built with Radix UI primitives (WCAG compliant)
- ✅ **Customizable**: Full control over styling
- ✅ **Type-safe**: TypeScript-first components
- ✅ **No lock-in**: Can modify any component

**Alternatives Considered:**
- **Material-UI**: Heavy bundle, harder to customize
- **Chakra UI**: Great DX, but larger bundle than Tailwind
- **Ant Design**: Enterprise-focused, opinionated design
- **CSS Modules**: More manual work, less consistent

**Decision**: Tailwind + shadcn/ui provides flexibility, performance, and accessibility.

---

### 5. React Hook Form + Zod

**Why React Hook Form?**
- ✅ **Performance**: Minimal re-renders (uncontrolled inputs)
- ✅ **Small bundle**: Only 8KB gzipped
- ✅ **DX**: Simple API with hooks
- ✅ **Validation**: Integrates with Zod, Yup, etc.
- ✅ **File uploads**: Built-in file handling

**Why Zod?**
- ✅ **TypeScript-first**: Infer types from schemas
- ✅ **Runtime validation**: Type-safe at runtime
- ✅ **Composable**: Build complex schemas from simple ones
- ✅ **Error messages**: Clear, customizable errors
- ✅ **Transforms**: Parse and transform data

**Example:**
```typescript
const propertySchema = z.object({
  address: z.string().min(1, 'Required'),
  rent: z.number().min(0).transform(val => Math.round(val * 100) / 100),
  type: z.enum(['house', 'apartment', 'condo']),
});

type PropertyInput = z.infer<typeof propertySchema>; // TypeScript type
```

**Alternatives Considered:**
- **Formik**: Popular, but more boilerplate
- **Redux Form**: Too heavy, Redux dependency
- **Final Form**: Good, but less popular than RHF

**Decision**: React Hook Form + Zod is the modern standard for forms.

---

### 6. Pusher / Ably (Real-time)

**Why Managed WebSocket Service?**
- ✅ **Reliability**: Built-in fallbacks (long polling)
- ✅ **Scalability**: Handles millions of connections
- ✅ **DevOps**: No infrastructure to manage
- ✅ **Features**: Presence, channels, auth built-in
- ✅ **SDKs**: Client and server SDKs

**Pusher vs Ably:**
| Feature | Pusher | Ably |
|---------|--------|------|
| Pricing | $$$ | $$ |
| Free Tier | 100 connections | 200 connections |
| Features | ✅ Good | ✅ Better |
| Reliability | ✅ Good | ✅ Excellent |
| DX | ✅ Excellent | ✅ Good |

**Self-hosted Alternative: Socket.io**
- ✅ **Free**: No usage costs
- ✅ **Control**: Full control over infrastructure
- ❌ **DevOps**: Need to manage servers
- ❌ **Scaling**: Manual scaling required

**Decision**: Start with Pusher (easier DX), migrate to Ably or self-hosted if costs grow.

---

### 7. UploadThing / AWS S3 (File Uploads)

**Why UploadThing?**
- ✅ **Developer-first**: Built for Next.js
- ✅ **Simple setup**: 5 minutes to production
- ✅ **Generous free tier**: 2GB storage, 2GB bandwidth
- ✅ **Type-safe**: TypeScript file router
- ✅ **Built-in features**: Progress, preview, validation

**Why AWS S3 with Presigned URLs?**
- ✅ **Scalable**: Unlimited storage
- ✅ **Cheap**: $0.023/GB storage, $0.09/GB transfer
- ✅ **Direct upload**: Client uploads directly to S3
- ✅ **Security**: Presigned URLs expire
- ✅ **CDN**: CloudFront for fast delivery

**Implementation:**
```typescript
// 1. Get presigned URL from API
const { url, fields } = await getPresignedUrl(filename);

// 2. Upload directly to S3 from client
const formData = new FormData();
Object.entries(fields).forEach(([key, value]) => {
  formData.append(key, value);
});
formData.append('file', file);
await fetch(url, { method: 'POST', body: formData });

// 3. Save S3 URL to database
await savePropertyPhoto(propertyId, s3Url);
```

**Decision**: Use UploadThing for MVP speed, migrate to S3 for cost optimization.

---

### 8. Testing: Vitest + Playwright + Testing Library

**Why Vitest?**
- ✅ **Fast**: 10x faster than Jest
- ✅ **Vite-compatible**: Same config as dev server
- ✅ **ESM-first**: Native ES modules support
- ✅ **UI**: Built-in test UI
- ✅ **TypeScript**: First-class TS support

**Why Playwright?**
- ✅ **Multi-browser**: Chromium, Firefox, WebKit
- ✅ **Auto-wait**: Smart waiting for elements
- ✅ **Debugging**: Time-travel debugging
- ✅ **CI-ready**: Parallelization built-in
- ✅ **Component testing**: Test components in isolation

**Why Testing Library?**
- ✅ **User-centric**: Tests how users interact
- ✅ **Accessibility**: Encourages accessible queries
- ✅ **Framework-agnostic**: Works with React, Vue, etc.
- ✅ **Best practices**: Enforces good testing habits

**Testing Strategy:**
```
Unit Tests (Vitest + Testing Library)
├── Components
├── Hooks
├── Utils
└── 70% coverage target

Integration Tests (Vitest + Testing Library)
├── API calls
├── Form submissions
└── Real-time updates

E2E Tests (Playwright)
├── Critical user flows
│   ├── Landlord: Add property → Add tenant → Collect rent
│   ├── Tenant: Pay rent → Submit maintenance
│   └── Contractor: View work order → Update status
└── Run on CI before deploy
```

---

## Performance Optimization Strategy

### 1. Code Splitting

```typescript
// Route-based splitting (automatic with Next.js)
// Each page is a separate bundle

// Component-based splitting
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Client-side only
});

// Conditional loading
const AdminPanel = dynamic(() => import('@/components/AdminPanel'));

function Dashboard() {
  const { user } = useAuth();
  
  return (
    <div>
      {/* Always loaded */}
      <DashboardCards />
      
      {/* Loaded only for admins */}
      {user.role === 'admin' && <AdminPanel />}
    </div>
  );
}
```

### 2. Image Optimization

```typescript
import Image from 'next/image';

// Automatic optimization
<Image
  src="/property.jpg"
  alt="Property"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL={blurDataUrl}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={isFoldImage} // LCP optimization
/>

// External images (S3)
<Image
  src={property.imageUrl}
  alt={property.address}
  fill
  className="object-cover"
  loader={customLoader} // Optional: use Cloudflare Images, imgix, etc.
/>
```

### 3. Data Fetching Optimization

```typescript
// Parallel data fetching
async function PropertyPage({ params }) {
  const [property, tenant, maintenance] = await Promise.all([
    getProperty(params.id),
    getTenant(params.id),
    getMaintenanceRequests(params.id),
  ]);
  
  return <PropertyDetails {...{ property, tenant, maintenance }} />;
}

// Streaming with Suspense
function PropertyPage() {
  return (
    <div>
      {/* Loads immediately */}
      <PropertyHeader />
      
      {/* Streams in when ready */}
      <Suspense fallback={<ChartsSkeleton />}>
        <PropertyCharts />
      </Suspense>
      
      <Suspense fallback={<TableSkeleton />}>
        <MaintenanceTable />
      </Suspense>
    </div>
  );
}
```

### 4. Caching Strategy

```typescript
// React Query cache config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
    },
  },
});

// Next.js fetch cache
fetch('https://api.example.com/properties', {
  next: { revalidate: 3600 }, // Revalidate every hour
});

// Static page with ISR
export const revalidate = 3600; // Revalidate every hour
```

### 5. Bundle Size Monitoring

```bash
# Analyze bundle
npm run build
npm run analyze

# Check for:
# - Large dependencies (replace with lighter alternatives)
# - Duplicate code (shared chunks)
# - Unused code (tree-shaking)
```

---

## Security Best Practices

### 1. Authentication & Authorization

```typescript
// Server-side auth check
import { getServerSession } from 'next-auth';

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }
  
  // Role-based access
  if (session.user.role !== 'landlord') {
    return <Unauthorized />;
  }
  
  return <LandlordDashboard />;
}

// API route protection
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Process request
}
```

### 2. Data Validation

```typescript
// Client-side validation (UX)
const schema = z.object({
  email: z.string().email(),
  amount: z.number().min(0).max(10000),
});

// Server-side validation (security)
export async function POST(req: Request) {
  const body = await req.json();
  
  // Always validate on server
  const result = schema.safeParse(body);
  
  if (!result.success) {
    return new Response('Invalid input', { status: 400 });
  }
  
  // Process validated data
  const data = result.data;
}
```

### 3. XSS Prevention

```typescript
// React automatically escapes content
<div>{userInput}</div> // Safe

// Dangerous: dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // Unsafe!

// Safe: Sanitize with DOMPurify
import DOMPurify from 'isomorphic-dompurify';

<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(userInput) 
}} />
```

### 4. CSRF Protection

```typescript
// Next.js API routes use SameSite cookies by default
// Additional protection with CSRF tokens

import { getCsrfToken } from 'next-auth/react';

async function handleSubmit(data) {
  const csrfToken = await getCsrfToken();
  
  await fetch('/api/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(data),
  });
}
```

### 5. Environment Variables

```typescript
// Client-safe (NEXT_PUBLIC_ prefix)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Server-only (no prefix)
const dbUrl = process.env.DATABASE_URL; // Only accessible on server

// Type-safe env vars
// env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
```

---

## Deployment Checklist

### Pre-deployment

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] All tests passing
- [ ] Lighthouse score > 90
- [ ] Security headers configured
- [ ] Error tracking (Sentry) set up
- [ ] Analytics configured
- [ ] SSL certificate active

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL
```

### Self-hosted Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    restart: unless-stopped
    
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## Monitoring & Observability

### Performance Monitoring

```typescript
// lib/analytics.ts
export function reportWebVitals(metric: any) {
  // Send to analytics
  if (metric.label === 'web-vital') {
    gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }
  
  // Send to Sentry
  if (metric.name === 'LCP' && metric.value > 2500) {
    Sentry.captureMessage(`Slow LCP: ${metric.value}ms`, 'warning');
  }
}

// app/layout.tsx
export function reportWebVitals(metric: NextWebVitalsMetric) {
  reportWebVitals(metric);
}
```

### Error Tracking

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
});

// Error boundary
export function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## Migration Path

### Phase 1: MVP (Weeks 1-4)
- [ ] Set up Next.js project
- [ ] Implement authentication
- [ ] Build core components (UI library)
- [ ] Landlord dashboard
- [ ] Property management CRUD
- [ ] Deploy to staging

### Phase 2: Core Features (Weeks 5-8)
- [ ] Tenant dashboard
- [ ] Rent payment integration (Stripe)
- [ ] Maintenance request system
- [ ] File uploads (S3)
- [ ] Real-time messaging (Pusher)
- [ ] Deploy to production (beta)

### Phase 3: Advanced Features (Weeks 9-12)
- [ ] Contractor dashboard
- [ ] Reports and analytics
- [ ] PDF generation (leases, reports)
- [ ] Email notifications
- [ ] PWA features (offline, push notifications)
- [ ] Performance optimization

### Phase 4: Polish (Weeks 13-16)
- [ ] Comprehensive testing
- [ ] Accessibility audit
- [ ] Security audit
- [ ] Documentation
- [ ] User onboarding flow
- [ ] Public launch

---

## Cost Estimation (Monthly)

**Hosting (Vercel Pro)**: $20/month
**Database (Supabase/Railway)**: $25/month
**Real-time (Pusher)**: $50/month (1000 concurrent)
**File Storage (S3)**: $10/month (100GB)
**Email (SendGrid)**: $15/month (40k emails)
**Monitoring (Sentry)**: $26/month (50k events)

**Total**: ~$150/month for 1000 active users

**Scaling**:
- 5000 users: ~$500/month
- 10000 users: ~$1200/month

This architecture is production-ready, scalable, and cost-effective.
