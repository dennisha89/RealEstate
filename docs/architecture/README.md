# Property Management SaaS - Frontend Architecture Documentation

## 📚 Documentation Index

This directory contains the complete frontend architecture specification for the Property Management SaaS platform.

### Documents

1. **[01-FRONTEND-ARCHITECTURE.md](./01-FRONTEND-ARCHITECTURE.md)** ⭐ **START HERE**
   - Executive summary and tech stack recommendation
   - Complete architecture overview covering all 10 deliverables:
     1. Component architecture
     2. State management strategy
     3. Routing structure
     4. Form handling
     5. Real-time data sync
     6. Authentication flow
     7. File upload UX
     8. Responsive strategy
     9. Tech stack recommendation
     10. Build and deployment

2. **[02-DATA-FLOW-DIAGRAMS.md](./02-DATA-FLOW-DIAGRAMS.md)**
   - Visual data flow diagrams for key user interactions
   - Authentication, property creation, messaging, payments
   - State management flow
   - Real-time updates
   - Caching strategy
   - Error handling

3. **[03-FILE-STRUCTURE.md](./03-FILE-STRUCTURE.md)**
   - Complete project directory structure
   - File naming conventions
   - Configuration files
   - Environment variables
   - Code organization principles

4. **[04-COMPONENT-HIERARCHY.md](./04-COMPONENT-HIERARCHY.md)**
   - Visual component trees
   - Composition patterns
   - Component communication strategies
   - Reusability patterns
   - Responsive variations
   - Testing strategies

5. **[05-TECH-STACK-JUSTIFICATION.md](./05-TECH-STACK-JUSTIFICATION.md)**
   - Detailed rationale for each technology choice
   - Comparison with alternatives
   - Performance optimization strategies
   - Security best practices
   - Deployment checklist
   - Cost estimation
   - Migration path (16-week roadmap)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Git
- Code editor (VS Code recommended)
- Basic knowledge of React and TypeScript

### 1. Create New Project

```bash
# Create Next.js project with TypeScript and Tailwind
npx create-next-app@latest property-management-saas \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd property-management-saas
```

### 2. Install Dependencies

```bash
# Core dependencies
npm install \
  next-auth \
  @tanstack/react-query \
  zustand \
  react-hook-form \
  zod \
  @hookform/resolvers

# UI components (shadcn/ui)
npx shadcn-ui@latest init

# Real-time
npm install pusher-js pusher

# File upload
npm install uploadthing @uploadthing/react

# Charts
npm install recharts

# Utils
npm install clsx tailwind-merge date-fns

# Dev dependencies
npm install -D \
  @types/node \
  @types/react \
  @types/react-dom \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  @playwright/test \
  prettier \
  eslint-config-prettier
```

### 3. Set Up shadcn/ui Components

```bash
# Add base components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add select
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add table
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add skeleton
```

### 4. Configure Environment Variables

Create `.env.local`:

```bash
# Copy example
cp .env.example .env.local

# Edit with your values
# See 03-FILE-STRUCTURE.md for complete list
```

### 5. Set Up Project Structure

```bash
# Create main directories
mkdir -p src/{components,lib,hooks,store,types,config}
mkdir -p src/components/{ui,shared,features,layouts}
mkdir -p src/lib/{api,queries,mutations,realtime,upload,utils}

# See 03-FILE-STRUCTURE.md for complete structure
```

### 6. Configure Next.js

Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['s3.amazonaws.com', 'utfs.io'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 7. Set Up Providers

Create `src/components/providers.tsx`:

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
      },
    },
  }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system">
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

Update `src/app/layout.tsx`:

```typescript
import { Providers } from '@/components/providers';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 8. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## 📋 Implementation Checklist

### Week 1-2: Foundation
- [ ] Project setup and dependencies
- [ ] File structure
- [ ] UI component library (shadcn/ui)
- [ ] Tailwind configuration
- [ ] TypeScript types
- [ ] API client setup

### Week 3-4: Authentication
- [ ] NextAuth.js configuration
- [ ] Login/signup pages
- [ ] Password reset flow
- [ ] Role-based routing
- [ ] Protected routes middleware

### Week 5-6: Landlord Features
- [ ] Dashboard layout
- [ ] Property CRUD
- [ ] Tenant management
- [ ] File upload (property photos)
- [ ] Data tables

### Week 7-8: Tenant Features
- [ ] Tenant dashboard
- [ ] Rent payment (Stripe integration)
- [ ] Maintenance request form
- [ ] Document viewer
- [ ] Payment history

### Week 9-10: Real-time & Messaging
- [ ] Pusher setup
- [ ] Message thread UI
- [ ] Real-time notifications
- [ ] Online presence
- [ ] Typing indicators

### Week 11-12: Contractor & Reports
- [ ] Contractor dashboard
- [ ] Work order management
- [ ] Invoice submission
- [ ] Report generation
- [ ] PDF export

### Week 13-14: Testing & Optimization
- [ ] Unit tests (Vitest)
- [ ] E2E tests (Playwright)
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Bundle size analysis

### Week 15-16: Deployment & Launch
- [ ] Production deployment
- [ ] Monitoring setup (Sentry)
- [ ] Analytics
- [ ] Documentation
- [ ] User training materials

---

## 🏗️ Architecture Decisions

### State Management

**Client State (Zustand)**
- UI state (sidebar, modals, theme)
- User preferences
- Temporary form data

**Server State (TanStack Query)**
- Properties, tenants, maintenance
- Payments, messages, reports
- Automatic caching and refetching

**URL State (searchParams)**
- Pagination, filters, sorting
- Shareable links

**Form State (React Hook Form)**
- Form inputs and validation
- File uploads

### Real-time Strategy

**Pusher Channels:**
- `private-user-{userId}` - User-specific notifications
- `private-property-{propertyId}` - Property updates
- `presence-thread-{threadId}` - Chat presence

**Events:**
- `new-message` - New chat message
- `maintenance-updated` - Status change
- `payment-received` - Payment confirmation

### File Upload Strategy

**Direct S3 Upload:**
1. Client requests presigned URL from API
2. Client uploads directly to S3 (progress tracking)
3. Client sends S3 URL to API to save in database

**Benefits:**
- Reduces server load
- Faster uploads
- Progress tracking
- Scalable

### Responsive Strategy

**Mobile-first Approach:**
- Base styles for mobile (320px+)
- Breakpoints: sm (640), md (768), lg (1024), xl (1280)
- Touch-optimized components
- Bottom navigation on mobile
- Sidebar navigation on desktop

---

## 🎨 Design System

### Colors

```typescript
// tailwind.config.ts
colors: {
  primary: '#2563eb',    // Blue
  secondary: '#64748b',  // Slate
  success: '#10b981',    // Green
  warning: '#f59e0b',    // Amber
  error: '#ef4444',      // Red
  info: '#06b6d4',       // Cyan
}
```

### Typography

```typescript
fontSize: {
  xs: '0.75rem',     // 12px
  sm: '0.875rem',    // 14px
  base: '1rem',      // 16px
  lg: '1.125rem',    // 18px
  xl: '1.25rem',     // 20px
  '2xl': '1.5rem',   // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
}
```

### Spacing

```typescript
spacing: {
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
}
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)

```bash
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**What to test:**
- Component rendering
- User interactions
- Hooks logic
- Utility functions

### E2E Tests (Playwright)

```bash
npm run test:e2e

# UI mode
npm run test:e2e:ui

# Specific test
npm run test:e2e -- landlord-flow
```

**What to test:**
- Critical user flows
- Authentication
- Payment processing
- Form submissions

---

## 📊 Performance Targets

- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms
- **Lighthouse Score**: > 90

Monitor with:
- Vercel Analytics
- Google Lighthouse
- WebPageTest
- Chrome DevTools

---

## 🔒 Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] SQL injection prevention (use ORMs)
- [ ] XSS prevention (React escaping)
- [ ] CSRF tokens
- [ ] Rate limiting on API routes
- [ ] Input validation (client + server)
- [ ] Authentication on all protected routes
- [ ] Role-based access control
- [ ] Secure headers configured
- [ ] Dependencies updated regularly
- [ ] Security audit (npm audit)

---

## 📞 Support & Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)

### Community
- [Next.js Discord](https://discord.gg/nextjs)
- [React Discord](https://discord.gg/react)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/nextjs)

### Architecture Questions?
Refer to the detailed documents in this directory:
1. Main architecture (01-FRONTEND-ARCHITECTURE.md)
2. Data flows (02-DATA-FLOW-DIAGRAMS.md)
3. File structure (03-FILE-STRUCTURE.md)
4. Components (04-COMPONENT-HIERARCHY.md)
5. Tech stack (05-TECH-STACK-JUSTIFICATION.md)

---

## 🎯 Next Steps

1. **Review all documentation** - Start with 01-FRONTEND-ARCHITECTURE.md
2. **Set up development environment** - Follow Quick Start guide above
3. **Build MVP features** - Follow the 16-week migration path
4. **Iterate based on user feedback** - Ship early, improve continuously
5. **Scale infrastructure** - Add caching, CDN, monitoring as you grow

Good luck building your Property Management SaaS! 🚀
