# Complete File Structure

## Project Directory Structure

```
property-management-saas/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Continuous integration
│   │   ├── deploy.yml                # Deployment pipeline
│   │   └── test.yml                  # Test automation
│   └── PULL_REQUEST_TEMPLATE.md
│
├── public/
│   ├── icons/                        # PWA icons
│   │   ├── icon-192x192.png
│   │   ├── icon-512x512.png
│   │   └── apple-touch-icon.png
│   ├── images/
│   │   └── logo.svg
│   ├── manifest.json                 # PWA manifest
│   ├── robots.txt
│   └── sitemap.xml
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (marketing)/             # Marketing site group
│   │   │   ├── page.tsx             # Homepage
│   │   │   ├── features/
│   │   │   │   └── page.tsx
│   │   │   ├── pricing/
│   │   │   │   └── page.tsx
│   │   │   ├── about/
│   │   │   │   └── page.tsx
│   │   │   ├── contact/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx           # Marketing layout
│   │   │
│   │   ├── (auth)/                  # Auth routes group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   ├── reset-password/
│   │   │   │   └── page.tsx
│   │   │   ├── verify-email/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/             # Protected dashboard group
│   │   │   ├── layout.tsx           # Dashboard layout (sidebar)
│   │   │   │
│   │   │   ├── landlord/            # Landlord routes
│   │   │   │   ├── page.tsx         # Dashboard home
│   │   │   │   ├── loading.tsx      # Loading state
│   │   │   │   ├── error.tsx        # Error boundary
│   │   │   │   │
│   │   │   │   ├── properties/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       ├── edit/
│   │   │   │   │       │   └── page.tsx
│   │   │   │   │       ├── units/
│   │   │   │   │       │   └── page.tsx
│   │   │   │   │       └── inspections/
│   │   │   │   │           ├── page.tsx
│   │   │   │   │           └── [inspectionId]/
│   │   │   │   │               └── page.tsx
│   │   │   │   │
│   │   │   │   ├── tenants/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── screening/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       ├── lease/
│   │   │   │   │       │   ├── page.tsx
│   │   │   │   │       │   └── new/
│   │   │   │   │       │       └── page.tsx
│   │   │   │   │       └── documents/
│   │   │   │   │           └── page.tsx
│   │   │   │   │
│   │   │   │   ├── maintenance/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   │
│   │   │   │   ├── financials/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── payments/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── expenses/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── reports/
│   │   │   │   │       └── page.tsx
│   │   │   │   │
│   │   │   │   ├── messages/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [threadId]/
│   │   │   │   │       └── page.tsx
│   │   │   │   │
│   │   │   │   └── reports/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── occupancy/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── financial/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── maintenance/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── tenant/              # Tenant routes
│   │   │   │   ├── page.tsx
│   │   │   │   ├── rent/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── history/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── auto-pay/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── maintenance/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── lease/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── documents/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── messages/
│   │   │   │       ├── page.tsx
│   │   │   │       └── [threadId]/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   └── contractor/          # Contractor routes
│   │   │       ├── page.tsx
│   │   │       ├── work-orders/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx
│   │   │       ├── invoices/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── new/
│   │   │       │   │   └── page.tsx
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx
│   │   │       └── profile/
│   │   │           └── page.tsx
│   │   │
│   │   ├── api/                     # API routes (BFF pattern)
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── register/
│   │   │   │       └── route.ts
│   │   │   ├── upload/
│   │   │   │   ├── presigned/
│   │   │   │   │   └── route.ts    # Generate S3 presigned URLs
│   │   │   │   └── route.ts
│   │   │   ├── pusher/
│   │   │   │   └── auth/
│   │   │   │       └── route.ts    # Pusher private channel auth
│   │   │   └── webhooks/
│   │   │       ├── stripe/
│   │   │       │   └── route.ts
│   │   │       └── pusher/
│   │   │           └── route.ts
│   │   │
│   │   ├── layout.tsx               # Root layout
│   │   ├── error.tsx                # Global error boundary
│   │   ├── loading.tsx              # Global loading state
│   │   ├── not-found.tsx            # 404 page
│   │   └── globals.css              # Global styles
│   │
│   ├── components/
│   │   ├── ui/                      # Base UI components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── select.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── table.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── calendar.tsx
│   │   │   └── command.tsx
│   │   │
│   │   ├── shared/                  # Shared business components
│   │   │   ├── Header/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Navigation.tsx
│   │   │   │   ├── UserMenu.tsx
│   │   │   │   ├── NotificationBell.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Sidebar/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── SidebarItem.tsx
│   │   │   │   ├── SidebarCollapse.tsx
│   │   │   │   ├── MobileSidebar.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Footer/
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── DataTable/
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── DataTablePagination.tsx
│   │   │   │   ├── DataTableToolbar.tsx
│   │   │   │   ├── DataTableColumnHeader.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── FileUpload/
│   │   │   │   ├── FileUpload.tsx
│   │   │   │   ├── FilePreview.tsx
│   │   │   │   ├── ImageCapture.tsx
│   │   │   │   ├── DragDropZone.tsx
│   │   │   │   ├── UploadProgress.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Form/
│   │   │   │   ├── FormField.tsx
│   │   │   │   ├── FormSelect.tsx
│   │   │   │   ├── FormTextarea.tsx
│   │   │   │   ├── FormDatePicker.tsx
│   │   │   │   ├── FormProgress.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Charts/
│   │   │   │   ├── BarChart.tsx
│   │   │   │   ├── LineChart.tsx
│   │   │   │   ├── PieChart.tsx
│   │   │   │   ├── AreaChart.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── EmptyState/
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── LoadingSpinner/
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── ErrorFallback/
│   │   │   │   ├── ErrorFallback.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── RoleGate/
│   │   │   │   ├── RoleGate.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── SearchInput/
│   │   │   │   ├── SearchInput.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── DateRangePicker/
│   │   │       ├── DateRangePicker.tsx
│   │   │       └── index.ts
│   │   │
│   │   ├── features/                # Feature-specific components
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── SignupForm.tsx
│   │   │   │   ├── ForgotPasswordForm.tsx
│   │   │   │   └── SocialLogin.tsx
│   │   │   │
│   │   │   ├── properties/
│   │   │   │   ├── PropertyCard.tsx
│   │   │   │   ├── PropertyList.tsx
│   │   │   │   ├── PropertyGrid.tsx
│   │   │   │   ├── PropertyForm.tsx
│   │   │   │   ├── PropertyDetails.tsx
│   │   │   │   ├── UnitManager.tsx
│   │   │   │   ├── UnitForm.tsx
│   │   │   │   ├── InspectionPhotos.tsx
│   │   │   │   ├── PropertyFilters.tsx
│   │   │   │   └── PropertyStats.tsx
│   │   │   │
│   │   │   ├── tenants/
│   │   │   │   ├── TenantCard.tsx
│   │   │   │   ├── TenantList.tsx
│   │   │   │   ├── TenantProfile.tsx
│   │   │   │   ├── TenantScreening.tsx
│   │   │   │   ├── LeaseViewer.tsx
│   │   │   │   ├── LeaseForm.tsx
│   │   │   │   ├── TenantOnboarding.tsx
│   │   │   │   └── TenantDocuments.tsx
│   │   │   │
│   │   │   ├── maintenance/
│   │   │   │   ├── MaintenanceRequestCard.tsx
│   │   │   │   ├── MaintenanceForm.tsx
│   │   │   │   ├── MaintenanceList.tsx
│   │   │   │   ├── MaintenanceDetails.tsx
│   │   │   │   ├── WorkOrderCard.tsx
│   │   │   │   ├── WorkOrderList.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── PriorityBadge.tsx
│   │   │   │   └── ContractorAssignment.tsx
│   │   │   │
│   │   │   ├── payments/
│   │   │   │   ├── PaymentForm.tsx
│   │   │   │   ├── PaymentHistory.tsx
│   │   │   │   ├── PaymentMethodSelector.tsx
│   │   │   │   ├── AutoPaySetup.tsx
│   │   │   │   ├── PaymentReceiptModal.tsx
│   │   │   │   └── RentReminder.tsx
│   │   │   │
│   │   │   ├── messages/
│   │   │   │   ├── MessageThread.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageComposer.tsx
│   │   │   │   ├── MessageThreadList.tsx
│   │   │   │   ├── UnreadBadge.tsx
│   │   │   │   └── TypingIndicator.tsx
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── ReportGenerator.tsx
│   │   │   │   ├── FinancialSummary.tsx
│   │   │   │   ├── OccupancyReport.tsx
│   │   │   │   ├── MaintenanceReport.tsx
│   │   │   │   ├── PDFExport.tsx
│   │   │   │   └── ReportFilters.tsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── DashboardCard.tsx
│   │   │   │   ├── MetricsWidget.tsx
│   │   │   │   ├── ActivityFeed.tsx
│   │   │   │   ├── QuickActions.tsx
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   ├── OccupancyChart.tsx
│   │   │   │   └── UpcomingPayments.tsx
│   │   │   │
│   │   │   └── notifications/
│   │   │       ├── NotificationList.tsx
│   │   │       ├── NotificationItem.tsx
│   │   │       └── NotificationSettings.tsx
│   │   │
│   │   └── layouts/                 # Layout components
│   │       ├── RootLayout.tsx
│   │       ├── DashboardLayout.tsx
│   │       ├── AuthLayout.tsx
│   │       └── MarketingLayout.tsx
│   │
│   ├── lib/                         # Utility functions and configs
│   │   ├── api/
│   │   │   ├── client.ts           # API client setup
│   │   │   ├── endpoints.ts        # API endpoints
│   │   │   └── types.ts            # API types
│   │   │
│   │   ├── queries/                # React Query hooks
│   │   │   ├── properties.ts
│   │   │   ├── tenants.ts
│   │   │   ├── maintenance.ts
│   │   │   ├── payments.ts
│   │   │   ├── messages.ts
│   │   │   └── reports.ts
│   │   │
│   │   ├── mutations/              # React Query mutations
│   │   │   ├── properties.ts
│   │   │   ├── tenants.ts
│   │   │   ├── maintenance.ts
│   │   │   └── payments.ts
│   │   │
│   │   ├── realtime/               # Real-time functionality
│   │   │   ├── pusher.ts
│   │   │   ├── hooks.ts
│   │   │   └── presence.ts
│   │   │
│   │   ├── upload/                 # File upload utilities
│   │   │   ├── s3.ts
│   │   │   ├── utils.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── utils/                  # General utilities
│   │   │   ├── cn.ts               # Class name helper
│   │   │   ├── date.ts             # Date formatting
│   │   │   ├── currency.ts         # Currency formatting
│   │   │   ├── validation.ts       # Validators
│   │   │   └── constants.ts
│   │   │
│   │   └── auth/
│   │       ├── session.ts
│   │       └── utils.ts
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── use-media-query.ts
│   │   ├── use-debounce.ts
│   │   ├── use-toast.ts
│   │   ├── use-local-storage.ts
│   │   ├── use-intersection-observer.ts
│   │   ├── use-keyboard-shortcut.ts
│   │   └── use-click-outside.ts
│   │
│   ├── store/                       # Zustand stores
│   │   ├── ui-store.ts
│   │   ├── auth-store.ts
│   │   ├── notification-store.ts
│   │   └── filter-store.ts
│   │
│   ├── types/                       # TypeScript types
│   │   ├── property.ts
│   │   ├── tenant.ts
│   │   ├── maintenance.ts
│   │   ├── payment.ts
│   │   ├── message.ts
│   │   ├── user.ts
│   │   ├── lease.ts
│   │   └── index.ts
│   │
│   ├── config/                      # App configuration
│   │   ├── site.ts                 # Site metadata
│   │   ├── navigation.ts           # Navigation config
│   │   └── constants.ts            # App constants
│   │
│   ├── styles/                      # Additional styles
│   │   └── globals.css
│   │
│   └── middleware.ts                # Next.js middleware
│
├── tests/
│   ├── unit/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── integration/
│   │   └── api/
│   └── e2e/
│       ├── landlord/
│       ├── tenant/
│       └── contractor/
│
├── .env.local                       # Environment variables
├── .env.example                     # Example env file
├── .eslintrc.json                   # ESLint config
├── .prettierrc                      # Prettier config
├── next.config.js                   # Next.js config
├── tailwind.config.ts               # Tailwind config
├── tsconfig.json                    # TypeScript config
├── package.json
├── pnpm-lock.yaml                   # or npm/yarn lock
├── vitest.config.ts                 # Vitest config
├── playwright.config.ts             # Playwright config
└── README.md
```

## Key File Descriptions

### Critical Configuration Files

**next.config.js**
- Image domains
- PWA configuration
- Security headers
- Environment variables
- Redirects and rewrites

**tailwind.config.ts**
- Custom theme
- Color palette
- Typography scale
- Breakpoints
- Plugins (forms, typography, etc.)

**tsconfig.json**
- Path aliases (@/components, @/lib, etc.)
- Strict mode enabled
- Module resolution

**middleware.ts**
- Authentication checks
- Role-based access control
- Redirects based on auth state

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "format": "prettier --write .",
    "prepare": "husky install"
  }
}
```

### Environment Variables

**.env.local**
```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000

# Auth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/property_management

# Real-time
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=us2
PUSHER_APP_ID=your-app-id
PUSHER_SECRET=your-pusher-secret

# File Upload
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
NEXT_PUBLIC_S3_URL=https://your-bucket.s3.amazonaws.com

# Payment
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@yourapp.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

## Naming Conventions

### Files
- Components: PascalCase (e.g., `PropertyCard.tsx`)
- Utilities: kebab-case (e.g., `use-media-query.ts`)
- Types: lowercase (e.g., `property.ts`)
- Tests: `*.test.tsx` or `*.spec.tsx`

### Components
- Component files export default component
- Use named exports for types/interfaces
- Co-locate styles if using CSS modules

### Imports
Use path aliases for cleaner imports:
```typescript
// Good
import { Button } from '@/components/ui/button';
import { useProperties } from '@/lib/queries/properties';
import type { Property } from '@/types/property';

// Bad
import { Button } from '../../../components/ui/button';
import { useProperties } from '../../../lib/queries/properties';
```

## Code Organization Principles

1. **Feature-based organization** - Group by feature, not by type
2. **Colocation** - Keep related code together
3. **Index files** - Use index.ts for clean exports
4. **Separation of concerns** - Separate business logic from UI
5. **Reusability** - Build composable, reusable components
6. **Type safety** - Strict TypeScript everywhere

This structure supports scalability, maintainability, and team collaboration.
