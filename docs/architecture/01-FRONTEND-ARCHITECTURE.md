# Frontend Architecture - Property Management SaaS Platform

## Executive Summary

This document outlines the complete frontend architecture for a property management SaaS platform serving three distinct user personas: Landlords (desktop-first), Tenants (mobile-first), and Contractors (mobile-first).

### Tech Stack Recommendation

**Framework:** Next.js 14+ (App Router)
**Reasoning:**
- Server-Side Rendering (SSR) for SEO-friendly marketing pages
- Server Components for optimal performance
- Built-in API routes for BFF (Backend for Frontend) pattern
- Image optimization out of the box
- Edge runtime support for global CDN deployment
- TypeScript support for type safety
- Best-in-class developer experience

**UI Framework:** React 18+ with TypeScript
**Reasoning:**
- Largest ecosystem and community
- Concurrent rendering for better UX
- Suspense for data fetching
- Strong TypeScript support
- Battle-tested in production at scale

**State Management:** Zustand + TanStack Query (React Query)
**Reasoning:**
- Zustand: Lightweight, simple API, perfect for client state
- TanStack Query: Purpose-built for server state, caching, and real-time sync
- Avoids Redux complexity while maintaining predictability
- Better performance with minimal boilerplate

**Styling:** Tailwind CSS + shadcn/ui
**Reasoning:**
- Utility-first approach for rapid development
- Consistent design system
- shadcn/ui provides accessible, customizable components
- Small bundle size with PurgeCSS
- Easy responsive design

**Form Handling:** React Hook Form + Zod
**Reasoning:**
- Performant (minimal re-renders)
- Type-safe validation with Zod
- Built-in file upload support
- Multi-step form capabilities

**Real-time:** Pusher or Ably (managed service) or Socket.io (self-hosted)
**Reasoning:**
- Pusher/Ably: Managed, scalable, reduces DevOps overhead
- Socket.io: Self-hosted option for cost control
- Better than raw WebSockets for reliability and fallbacks

**File Upload:** UploadThing or AWS S3 with presigned URLs
**Reasoning:**
- Direct client-to-storage upload
- Progress tracking
- Image optimization and transformation
- Security through presigned URLs

**Testing:**
- Vitest (unit/integration)
- Playwright (E2E)
- Testing Library (component testing)

**Build & Deployment:**
- Vercel (recommended) or self-hosted with Docker
- Edge functions for global performance
- CDN for static assets
- Progressive enhancement strategy

---

## 1. Component Architecture

### Component Library Structure

```
src/
├── components/
│   ├── ui/                    # Primitive components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   │
│   ├── shared/                # Shared business components
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   ├── Navigation.tsx
│   │   │   ├── UserMenu.tsx
│   │   │   └── NotificationBell.tsx
│   │   ├── Footer/
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SidebarItem.tsx
│   │   │   └── SidebarCollapse.tsx
│   │   ├── DataTable/
│   │   │   ├── DataTable.tsx
│   │   │   ├── TablePagination.tsx
│   │   │   ├── TableFilters.tsx
│   │   │   └── TableSort.tsx
│   │   ├── FileUpload/
│   │   │   ├── FileUpload.tsx
│   │   │   ├── FilePreview.tsx
│   │   │   ├── ImageCapture.tsx
│   │   │   └── DragDropZone.tsx
│   │   ├── RichTextEditor/
│   │   ├── DateRangePicker/
│   │   ├── Charts/
│   │   │   ├── BarChart.tsx
│   │   │   ├── LineChart.tsx
│   │   │   └── PieChart.tsx
│   │   └── Empty States/
│   │
│   ├── features/              # Feature-specific components
│   │   ├── properties/
│   │   │   ├── PropertyCard.tsx
│   │   │   ├── PropertyList.tsx
│   │   │   ├── PropertyForm.tsx
│   │   │   ├── UnitManager.tsx
│   │   │   └── InspectionPhotos.tsx
│   │   ├── tenants/
│   │   │   ├── TenantCard.tsx
│   │   │   ├── TenantScreening.tsx
│   │   │   ├── LeaseViewer.tsx
│   │   │   └── TenantOnboarding.tsx
│   │   ├── maintenance/
│   │   │   ├── MaintenanceRequestCard.tsx
│   │   │   ├── MaintenanceForm.tsx
│   │   │   ├── WorkOrderList.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── payments/
│   │   │   ├── PaymentForm.tsx
│   │   │   ├── PaymentHistory.tsx
│   │   │   ├── AutoPaySetup.tsx
│   │   │   └── PaymentMethodSelector.tsx
│   │   ├── messages/
│   │   │   ├── MessageThread.tsx
│   │   │   ├── MessageComposer.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── UnreadBadge.tsx
│   │   ├── reports/
│   │   │   ├── ReportGenerator.tsx
│   │   │   ├── FinancialSummary.tsx
│   │   │   ├── OccupancyReport.tsx
│   │   │   └── PDFExport.tsx
│   │   └── dashboard/
│   │       ├── DashboardCard.tsx
│   │       ├── MetricsWidget.tsx
│   │       ├── ActivityFeed.tsx
│   │       └── QuickActions.tsx
│   │
│   └── layouts/               # Layout components
│       ├── RootLayout.tsx
│       ├── DashboardLayout.tsx
│       ├── AuthLayout.tsx
│       └── MarketingLayout.tsx
```

### Component Design Principles

1. **Atomic Design:** UI components follow atomic design (atoms → molecules → organisms)
2. **Composition over Inheritance:** Use composition patterns for flexibility
3. **Single Responsibility:** Each component has one clear purpose
4. **Props Interface:** Strict TypeScript interfaces for all props
5. **Accessibility First:** WCAG 2.1 AA compliance built-in
6. **Mobile-First:** Components designed for mobile, enhanced for desktop

### Sample Component Pattern

```typescript
// components/features/properties/PropertyCard.tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Property } from '@/types/property';

interface PropertyCardProps {
  property: Property;
  onEdit?: (id: string) => void;
  onView?: (id: string) => void;
  variant?: 'compact' | 'detailed';
  className?: string;
}

export function PropertyCard({
  property,
  onEdit,
  onView,
  variant = 'compact',
  className
}: PropertyCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold">{property.address}</h3>
          <Badge variant={property.status === 'occupied' ? 'success' : 'warning'}>
            {property.status}
          </Badge>
        </div>
      </CardHeader>
      
      {variant === 'detailed' && (
        <CardContent>
          {/* Detailed view content */}
        </CardContent>
      )}
      
      <CardFooter className="flex gap-2">
        {onView && (
          <Button variant="outline" onClick={() => onView(property.id)}>
            View Details
          </Button>
        )}
        {onEdit && (
          <Button onClick={() => onEdit(property.id)}>
            Edit
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

---

## 2. State Management Strategy

### State Architecture

We use a **hybrid approach** combining multiple state management solutions based on state type:

```
State Types:
├── Server State (TanStack Query)
│   ├── Properties, tenants, maintenance requests
│   ├── User data, payments, messages
│   └── Real-time updates
│
├── Client State (Zustand)
│   ├── UI state (sidebar open/closed, modals)
│   ├── Theme preferences
│   ├── Form draft data
│   └── Filters and search
│
├── URL State (Next.js searchParams)
│   ├── Pagination
│   ├── Filters
│   └── Tab selection
│
└── Form State (React Hook Form)
    └── Temporary form data
```

### Server State with TanStack Query

```typescript
// lib/queries/properties.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Property } from '@/types/property';
import { api } from '@/lib/api';

export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters: PropertyFilters) => [...propertyKeys.lists(), filters] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
};

export function useProperties(filters: PropertyFilters) {
  return useQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: () => api.properties.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => api.properties.get(id),
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreatePropertyInput) => api.properties.create(data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
    },
  });
}
```

### Client State with Zustand

```typescript
// store/ui-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  dashboardLayout: 'grid' | 'list';
  
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setDashboardLayout: (layout: 'grid' | 'list') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',
      dashboardLayout: 'grid',
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setDashboardLayout: (layout) => set({ dashboardLayout: layout }),
    }),
    {
      name: 'ui-storage',
    }
  )
);

// store/auth-store.ts
import { create } from 'zustand';
import type { User } from '@/types/user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  role: 'landlord' | 'tenant' | 'contractor' | null;
  
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  role: null,
  
  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    role: user?.role ?? null,
  }),
  
  logout: () => set({
    user: null,
    isAuthenticated: false,
    role: null,
  }),
}));
```

### Real-time Updates Integration

```typescript
// lib/realtime/use-realtime-sync.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pusher } from '@/lib/pusher';
import { propertyKeys } from '@/lib/queries/properties';

export function useRealtimePropertyUpdates(propertyId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = pusher.subscribe(`property-${propertyId}`);
    
    channel.bind('property-updated', (data: Property) => {
      // Update the cache
      queryClient.setQueryData(
        propertyKeys.detail(propertyId),
        data
      );
    });
    
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [propertyId, queryClient]);
}
```

---

## 3. Routing Structure

### Next.js App Router Structure

```
src/app/
├── (marketing)/              # Marketing site (SSR)
│   ├── page.tsx             # Homepage
│   ├── features/
│   │   └── page.tsx
│   ├── pricing/
│   │   └── page.tsx
│   ├── about/
│   │   └── page.tsx
│   └── layout.tsx           # Marketing layout
│
├── (auth)/                   # Auth pages
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   ├── forgot-password/
│   │   └── page.tsx
│   ├── reset-password/
│   │   └── page.tsx
│   └── layout.tsx           # Auth layout
│
├── (dashboard)/              # Protected dashboard
│   ├── layout.tsx           # Dashboard layout (sidebar, header)
│   │
│   ├── landlord/            # Landlord-specific routes
│   │   ├── page.tsx         # Dashboard home
│   │   ├── properties/
│   │   │   ├── page.tsx     # List properties
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Property details
│   │   │       ├── edit/
│   │   │       │   └── page.tsx
│   │   │       ├── units/
│   │   │       │   └── page.tsx
│   │   │       └── inspections/
│   │   │           └── page.tsx
│   │   ├── tenants/
│   │   │   ├── page.tsx
│   │   │   ├── screening/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── lease/
│   │   │           └── page.tsx
│   │   ├── maintenance/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── financials/
│   │   │   ├── page.tsx
│   │   │   ├── payments/
│   │   │   │   └── page.tsx
│   │   │   └── reports/
│   │   │       └── page.tsx
│   │   ├── messages/
│   │   │   ├── page.tsx
│   │   │   └── [threadId]/
│   │   │       └── page.tsx
│   │   └── reports/
│   │       └── page.tsx
│   │
│   ├── tenant/              # Tenant-specific routes
│   │   ├── page.tsx         # Tenant dashboard
│   │   ├── rent/
│   │   │   ├── page.tsx     # Pay rent
│   │   │   └── auto-pay/
│   │   │       └── page.tsx
│   │   ├── maintenance/
│   │   │   ├── page.tsx     # View requests
│   │   │   └── new/
│   │   │       └── page.tsx # Submit new request
│   │   ├── lease/
│   │   │   └── page.tsx
│   │   ├── documents/
│   │   │   └── page.tsx
│   │   └── messages/
│   │       ├── page.tsx
│   │       └── [threadId]/
│   │           └── page.tsx
│   │
│   └── contractor/          # Contractor-specific routes
│       ├── page.tsx         # Contractor dashboard
│       ├── work-orders/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       └── page.tsx
│       └── invoices/
│           ├── page.tsx
│           └── new/
│               └── page.tsx
│
├── api/                      # API routes (BFF pattern)
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts
│   ├── upload/
│   │   └── route.ts
│   └── webhooks/
│       └── route.ts
│
└── layout.tsx               # Root layout
```

### Navigation Configuration

```typescript
// config/navigation.ts
import { Home, Building, Users, Wrench, DollarSign, MessageSquare, BarChart } from 'lucide-react';

export const landlordNavigation = [
  {
    name: 'Dashboard',
    href: '/landlord',
    icon: Home,
  },
  {
    name: 'Properties',
    href: '/landlord/properties',
    icon: Building,
    badge: 'count',
  },
  {
    name: 'Tenants',
    href: '/landlord/tenants',
    icon: Users,
  },
  {
    name: 'Maintenance',
    href: '/landlord/maintenance',
    icon: Wrench,
    badge: 'pending',
  },
  {
    name: 'Financials',
    href: '/landlord/financials',
    icon: DollarSign,
  },
  {
    name: 'Messages',
    href: '/landlord/messages',
    icon: MessageSquare,
    badge: 'unread',
  },
  {
    name: 'Reports',
    href: '/landlord/reports',
    icon: BarChart,
  },
];

export const tenantNavigation = [
  {
    name: 'Home',
    href: '/tenant',
    icon: Home,
  },
  {
    name: 'Pay Rent',
    href: '/tenant/rent',
    icon: DollarSign,
    highlight: true,
  },
  {
    name: 'Maintenance',
    href: '/tenant/maintenance',
    icon: Wrench,
  },
  {
    name: 'My Lease',
    href: '/tenant/lease',
    icon: Building,
  },
  {
    name: 'Messages',
    href: '/tenant/messages',
    icon: MessageSquare,
    badge: 'unread',
  },
];

export const contractorNavigation = [
  {
    name: 'Dashboard',
    href: '/contractor',
    icon: Home,
  },
  {
    name: 'Work Orders',
    href: '/contractor/work-orders',
    icon: Wrench,
    badge: 'active',
  },
  {
    name: 'Invoices',
    href: '/contractor/invoices',
    icon: DollarSign,
  },
];
```

### Route Middleware & Protection

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const path = request.nextUrl.pathname;
  
  // Public paths
  const isPublicPath = path.startsWith('/(marketing)') || path.startsWith('/(auth)');
  
  // Redirect to login if not authenticated
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Role-based access control
  if (token) {
    const role = token.role as string;
    
    if (path.startsWith('/landlord') && role !== 'landlord') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    
    if (path.startsWith('/tenant') && role !== 'tenant') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    
    if (path.startsWith('/contractor') && role !== 'contractor') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 4. Form Handling

### Multi-Step Form Pattern

```typescript
// components/features/properties/PropertyForm.tsx
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';

// Schema definition
const propertySchema = z.object({
  // Step 1: Basic Info
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().regex(/^\d{5}$/, 'Invalid ZIP code'),
  propertyType: z.enum(['single-family', 'multi-family', 'condo', 'apartment']),
  
  // Step 2: Details
  bedrooms: z.number().min(0),
  bathrooms: z.number().min(0),
  squareFeet: z.number().min(0),
  yearBuilt: z.number().min(1800).max(new Date().getFullYear()),
  
  // Step 3: Financial
  purchasePrice: z.number().min(0),
  monthlyRent: z.number().min(0),
  
  // Step 4: Photos
  photos: z.array(z.instanceof(File)).min(1, 'At least one photo required'),
});

type PropertyFormData = z.infer<typeof propertySchema>;

const steps = [
  { id: 'basic', title: 'Basic Information' },
  { id: 'details', title: 'Property Details' },
  { id: 'financial', title: 'Financial Information' },
  { id: 'photos', title: 'Photos' },
];

export function PropertyForm() {
  const [currentStep, setCurrentStep] = useState(0);
  
  const methods = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    mode: 'onChange',
  });
  
  const { handleSubmit, trigger } = methods;
  
  const nextStep = async () => {
    const fields = getFieldsForStep(currentStep);
    const isValid = await trigger(fields);
    
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const onSubmit = async (data: PropertyFormData) => {
    // Upload photos first
    const photoUrls = await uploadPhotos(data.photos);
    
    // Submit form with photo URLs
    await createProperty({
      ...data,
      photoUrls,
    });
  };
  
  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Progress indicator */}
        <FormProgress steps={steps} currentStep={currentStep} />
        
        {/* Step content */}
        {currentStep === 0 && <BasicInfoStep />}
        {currentStep === 1 && <DetailsStep />}
        {currentStep === 2 && <FinancialStep />}
        {currentStep === 3 && <PhotosStep />}
        
        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          {currentStep === steps.length - 1 ? (
            <Button type="submit">
              Create Property
            </Button>
          ) : (
            <Button type="button" onClick={nextStep}>
              Next
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
```

### File Upload Component

```typescript
// components/shared/FileUpload/FileUpload.tsx
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number; // bytes
  onUpload: (files: File[]) => void;
  enableCamera?: boolean;
}

export function FileUpload({
  accept = { 'image/*': ['.png', '.jpg', '.jpeg'] },
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024, // 5MB
  onUpload,
  enableCamera = true,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
    setFiles(newFiles);
    
    // Generate previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
    
    onUpload(newFiles);
  }, [files, maxFiles, onUpload]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
  });
  
  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // Revoke URL to prevent memory leaks
    URL.revokeObjectURL(previews[index]);
    
    setFiles(newFiles);
    setPreviews(newPreviews);
    onUpload(newFiles);
  };
  
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Camera implementation (simplified)
      // Would open a modal with video stream and capture button
    } catch (error) {
      console.error('Camera access denied:', error);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8
          text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        {isDragActive ? (
          <p>Drop files here...</p>
        ) : (
          <div>
            <p className="text-lg mb-2">Drag & drop files here</p>
            <p className="text-sm text-gray-500">
              or click to select files
            </p>
          </div>
        )}
      </div>
      
      {/* Camera button (mobile) */}
      {enableCamera && (
        <Button
          type="button"
          variant="outline"
          onClick={openCamera}
          className="w-full md:hidden"
        >
          <Camera className="w-4 h-4 mr-2" />
          Take Photo
        </Button>
      )}
      
      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="
                  absolute top-2 right-2 p-1
                  bg-red-500 text-white rounded-full
                  opacity-0 group-hover:opacity-100 transition-opacity
                "
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 right-2 bg-black/50 text-white text-xs p-1 rounded">
                {(files[index].size / 1024).toFixed(0)} KB
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Form Field Components

```typescript
// components/shared/Form/FormField.tsx
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

export function FormField({
  name,
  label,
  type = 'text',
  placeholder,
  required,
}: FormFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  
  const error = errors[name]?.message as string;
  
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        {...register(name)}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <p id={`${name}-error`} className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
```

---

## 5. Real-time Data Sync

### WebSocket Architecture

```typescript
// lib/realtime/pusher.ts
import Pusher from 'pusher-js';

export const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  authEndpoint: '/api/pusher/auth',
});

// lib/realtime/hooks.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pusher } from './pusher';
import { useAuthStore } from '@/store/auth-store';

export function useRealtimeMessages() {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to user-specific channel
    const channel = pusher.subscribe(`private-user-${user.id}`);
    
    // Handle new messages
    channel.bind('new-message', (data: Message) => {
      // Update messages cache
      queryClient.setQueryData(
        ['messages', data.threadId],
        (old: Message[] | undefined) => {
          return old ? [...old, data] : [data];
        }
      );
      
      // Show notification
      showNotification({
        title: 'New Message',
        body: data.content,
      });
    });
    
    // Handle maintenance request updates
    channel.bind('maintenance-updated', (data: MaintenanceRequest) => {
      queryClient.invalidateQueries({ 
        queryKey: ['maintenance', data.id] 
      });
    });
    
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [user, queryClient]);
}

// Global realtime hook (used in root layout)
export function useGlobalRealtime() {
  useRealtimeMessages();
  useRealtimeNotifications();
  useRealtimePayments();
}
```

### Optimistic Updates

```typescript
// lib/mutations/maintenance.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateMaintenanceStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.maintenance.updateStatus(id, status),
    
    // Optimistic update
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['maintenance', id] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['maintenance', id]);
      
      // Optimistically update
      queryClient.setQueryData(['maintenance', id], (old: MaintenanceRequest) => ({
        ...old,
        status,
        updatedAt: new Date().toISOString(),
      }));
      
      return { previousData };
    },
    
    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        ['maintenance', variables.id],
        context?.previousData
      );
    },
    
    // Refetch after error or success
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['maintenance', variables.id] 
      });
    },
  });
}
```

### Presence (Online Status)

```typescript
// lib/realtime/use-presence.ts
import { useEffect, useState } from 'react';
import { pusher } from './pusher';

export function usePresence(channelName: string) {
  const [members, setMembers] = useState<Map<string, any>>(new Map());
  
  useEffect(() => {
    const channel = pusher.subscribe(channelName);
    
    // Presence events
    channel.bind('pusher:subscription_succeeded', (members: any) => {
      const memberMap = new Map();
      members.each((member: any) => {
        memberMap.set(member.id, member.info);
      });
      setMembers(memberMap);
    });
    
    channel.bind('pusher:member_added', (member: any) => {
      setMembers(prev => new Map(prev).set(member.id, member.info));
    });
    
    channel.bind('pusher:member_removed', (member: any) => {
      setMembers(prev => {
        const newMap = new Map(prev);
        newMap.delete(member.id);
        return newMap;
      });
    });
    
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [channelName]);
  
  return members;
}

// Usage in chat component
function MessageThread({ threadId }: { threadId: string }) {
  const members = usePresence(`presence-thread-${threadId}`);
  const onlineCount = members.size;
  
  return (
    <div>
      <div className="text-sm text-gray-500">
        {onlineCount} {onlineCount === 1 ? 'person' : 'people'} online
      </div>
      {/* Rest of chat UI */}
    </div>
  );
}
```

---

## 6. Authentication Flow

### NextAuth.js Configuration

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const res = await fetch(`${process.env.API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        
        const user = await res.json();
        
        if (res.ok && user) {
          return user;
        }
        
        return null;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      // Redirect based on role after login
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      return baseUrl;
    },
  },
  
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Login Component

```typescript
// app/(auth)/login/page.tsx
'use client';

import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });
  
  const onSubmit = async (data: LoginFormData) => {
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    
    if (result?.ok) {
      // Redirect based on user role
      const session = await fetch('/api/auth/session').then(r => r.json());
      const role = session?.user?.role;
      
      router.push(`/${role}`);
    } else {
      // Show error
      console.error('Login failed');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center">Sign In</h1>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              {...register('email')}
              type="email"
              placeholder="Email"
              error={errors.email?.message}
            />
          </div>
          
          <div>
            <Input
              {...register('password')}
              type="password"
              placeholder="Password"
              error={errors.password?.message}
            />
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>
        
        <Button
          variant="outline"
          className="w-full"
          onClick={() => signIn('google')}
        >
          Sign in with Google
        </Button>
        
        <div className="text-center text-sm">
          <a href="/forgot-password" className="text-blue-600 hover:underline">
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}
```

### Role-Based Components

```typescript
// components/shared/RoleGate.tsx
import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: Array<'landlord' | 'tenant' | 'contractor'>;
  fallback?: ReactNode;
}

export function RoleGate({ children, allowedRoles, fallback }: RoleGateProps) {
  const { data: session } = useSession();
  
  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    return fallback ?? null;
  }
  
  return <>{children}</>;
}

// Usage
<RoleGate allowedRoles={['landlord']}>
  <Button>Add Property</Button>
</RoleGate>
```

---

## 7. Responsive Strategy

### Mobile-First Approach

We use a **mobile-first** approach where:
1. Base styles target mobile devices
2. Breakpoints progressively enhance for larger screens
3. Components are designed for touch-first interaction
4. Progressive disclosure hides complexity on small screens

### Breakpoint System (Tailwind)

```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      'sm': '640px',   // Mobile landscape, small tablets
      'md': '768px',   // Tablets
      'lg': '1024px',  // Small laptops, large tablets landscape
      'xl': '1280px',  // Desktops
      '2xl': '1536px', // Large desktops
    },
  },
};
```

### Responsive Component Pattern

```typescript
// components/features/dashboard/DashboardGrid.tsx
export function DashboardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="
      grid gap-4
      grid-cols-1           // Mobile: 1 column
      md:grid-cols-2        // Tablet: 2 columns
      lg:grid-cols-3        // Desktop: 3 columns
      xl:grid-cols-4        // Large desktop: 4 columns
    ">
      {children}
    </div>
  );
}

// Conditional rendering based on screen size
import { useMediaQuery } from '@/hooks/use-media-query';

export function PropertyList() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return isMobile ? (
    <PropertyCardList />  // Card view on mobile
  ) : (
    <PropertyTable />     // Table view on desktop
  );
}
```

### Touch-Optimized Components

```typescript
// Larger tap targets (minimum 44x44px)
// Swipe gestures for mobile navigation
// Pull-to-refresh on lists
// Bottom navigation for mobile

// components/shared/MobileNav.tsx
export function MobileNav() {
  return (
    <nav className="
      fixed bottom-0 left-0 right-0 z-50
      bg-white border-t
      flex justify-around items-center
      h-16 px-4
      md:hidden  // Hide on desktop
    ">
      {navigation.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className="
            flex flex-col items-center gap-1
            min-w-[44px] min-h-[44px]  // Touch target
            p-2
          "
        >
          <item.icon className="w-6 h-6" />
          <span className="text-xs">{item.name}</span>
        </Link>
      ))}
    </nav>
  );
}
```

### Desktop-Specific Features

```typescript
// Keyboard shortcuts
// Hover states
// Multi-column layouts
// Advanced data tables with sorting/filtering
// Drag-and-drop reordering

// components/features/properties/PropertyTable.tsx
export function PropertyTable() {
  return (
    <div className="hidden md:block">  {/* Only show on desktop */}
      <DataTable
        columns={columns}
        data={properties}
        enableSorting
        enableFiltering
        enableColumnReorder
      />
    </div>
  );
}
```

---

## 8. Performance Optimization

### Code Splitting

```typescript
// app/(dashboard)/landlord/page.tsx
import dynamic from 'next/dynamic';

// Lazy load heavy components
const FinancialChart = dynamic(
  () => import('@/components/features/dashboard/FinancialChart'),
  { loading: () => <ChartSkeleton /> }
);

const Analytics = dynamic(
  () => import('@/components/features/reports/Analytics'),
  { ssr: false } // Client-side only
);
```

### Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src={property.imageUrl}
  alt={property.address}
  width={400}
  height={300}
  placeholder="blur"
  blurDataURL={property.blurDataUrl}
  loading="lazy"
/>

// Responsive images
<Image
  src={property.imageUrl}
  alt={property.address}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
/>
```

### Bundle Size Optimization

```typescript
// Tree-shaking: Import only what you need
import { Button } from '@/components/ui/button';  // Good
import * from '@/components/ui';                   // Bad

// Use barrel files strategically
// components/ui/index.ts
export { Button } from './button';
export { Input } from './input';
// etc.
```

### Caching Strategy

```typescript
// Static pages: ISR (Incremental Static Regeneration)
// app/(marketing)/page.tsx
export const revalidate = 3600; // Revalidate every hour

// Dynamic pages: Server Components with streaming
// app/(dashboard)/landlord/properties/page.tsx
export default async function PropertiesPage() {
  const properties = await getProperties();
  
  return (
    <Suspense fallback={<PropertiesLoader />}>
      <PropertyList properties={properties} />
    </Suspense>
  );
}
```

---

## 9. Accessibility (WCAG 2.1 AA)

### Semantic HTML

```typescript
// Use proper HTML elements
<nav>...</nav>
<main>...</main>
<article>...</article>
<header>...</header>
<footer>...</footer>

// Not just divs
<div className="nav">...</div>  // Bad
```

### ARIA Labels

```typescript
// components/ui/button.tsx
<button
  aria-label="Close dialog"
  aria-pressed={isPressed}
  aria-disabled={disabled}
>
  <X className="w-4 h-4" />
</button>
```

### Keyboard Navigation

```typescript
// All interactive elements must be keyboard accessible
// Tab order must be logical
// Focus indicators must be visible

// components/shared/Dialog.tsx
useEffect(() => {
  if (open) {
    // Trap focus inside dialog
    const focusableElements = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    // Set focus to first element
    (focusableElements?.[0] as HTMLElement)?.focus();
  }
}, [open]);
```

### Color Contrast

```typescript
// Ensure minimum 4.5:1 contrast ratio for normal text
// 3:1 for large text (18pt+ or 14pt+ bold)

// tailwind.config.ts - Use accessible color palette
colors: {
  primary: {
    DEFAULT: '#2563eb', // Contrast ratio: 4.52:1 on white
  },
  error: {
    DEFAULT: '#dc2626',  // Contrast ratio: 5.04:1 on white
  },
}
```

### Screen Reader Support

```typescript
// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {notification.message}
</div>

// Hidden text for context
<span className="sr-only">
  Current page, {currentPage} of {totalPages}
</span>
```

---

## 10. Build & Deployment

### Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_PUSHER_KEY=xxx
NEXT_PUBLIC_PUSHER_CLUSTER=us2

NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://example.com

DATABASE_URL=postgresql://...
AWS_S3_BUCKET=xxx
```

### Build Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  images: {
    domains: ['s3.amazonaws.com', 'uploadthing.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // PWA configuration
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
  },
  
  // Compression
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### Deployment Strategy

**Option 1: Vercel (Recommended)**
```bash
# vercel.json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/**/*.tsx": {
      "maxDuration": 10
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.example.com/:path*"
    }
  ]
}
```

**Option 2: Docker + Self-hosted**
```dockerfile
# Dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Performance Monitoring

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

// Custom performance tracking
// lib/analytics.ts
export function trackWebVitals(metric: any) {
  switch (metric.name) {
    case 'FCP':
      // First Contentful Paint
      console.log('FCP:', metric.value);
      break;
    case 'LCP':
      // Largest Contentful Paint
      console.log('LCP:', metric.value);
      break;
    case 'CLS':
      // Cumulative Layout Shift
      console.log('CLS:', metric.value);
      break;
    case 'FID':
      // First Input Delay
      console.log('FID:', metric.value);
      break;
    case 'TTFB':
      // Time to First Byte
      console.log('TTFB:', metric.value);
      break;
  }
}
```

---

## Summary

This architecture provides:

✅ **Scalable component structure** with atomic design
✅ **Type-safe state management** with Zustand + TanStack Query
✅ **SEO-friendly routing** with Next.js App Router
✅ **Robust form handling** with React Hook Form + Zod
✅ **Real-time capabilities** with Pusher/Socket.io
✅ **Secure authentication** with NextAuth.js
✅ **Excellent UX** with file uploads, PWA, offline support
✅ **Mobile-first responsive design** for all user personas
✅ **Production-ready deployment** on Vercel or Docker
✅ **Accessibility compliance** (WCAG 2.1 AA)

**Performance Targets:**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1

**Next Steps:**
1. Set up project with `create-next-app`
2. Install dependencies and configure tools
3. Implement design system (Tailwind + shadcn/ui)
4. Build core components and layouts
5. Implement authentication flow
6. Add feature modules progressively
7. Set up testing infrastructure
8. Configure deployment pipeline
