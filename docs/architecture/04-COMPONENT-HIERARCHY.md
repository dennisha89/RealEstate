# Component Hierarchy & Composition

## Visual Component Tree

### Landlord Dashboard Page

```
RootLayout
│
├── Providers
│   ├── NextAuthProvider
│   ├── QueryClientProvider (TanStack Query)
│   ├── ThemeProvider
│   └── ToastProvider
│
└── DashboardLayout
    │
    ├── Header
    │   ├── Logo
    │   ├── Navigation
    │   │   └── NavItem[]
    │   ├── SearchInput
    │   ├── NotificationBell
    │   │   └── NotificationDropdown
    │   │       ├── NotificationList
    │   │       │   └── NotificationItem[]
    │   │       └── ViewAllLink
    │   └── UserMenu
    │       └── DropdownMenu
    │           ├── ProfileLink
    │           ├── SettingsLink
    │           └── LogoutButton
    │
    ├── Sidebar
    │   ├── SidebarHeader
    │   │   ├── Logo
    │   │   └── CollapseToggle
    │   ├── SidebarNav
    │   │   └── SidebarItem[]
    │   │       ├── Icon
    │   │       ├── Label
    │   │       └── Badge (optional)
    │   └── SidebarFooter
    │
    └── MainContent
        │
        └── LandlordDashboardPage
            │
            ├── PageHeader
            │   ├── Title
            │   ├── Breadcrumbs
            │   └── QuickActions
            │       ├── AddPropertyButton
            │       └── AddTenantButton
            │
            ├── MetricsSection
            │   └── MetricsGrid
            │       ├── MetricsCard (Total Properties)
            │       │   ├── Icon
            │       │   ├── Value
            │       │   ├── Label
            │       │   └── TrendIndicator
            │       ├── MetricsCard (Occupied Units)
            │       ├── MetricsCard (Monthly Revenue)
            │       └── MetricsCard (Pending Requests)
            │
            ├── ChartsSection
            │   └── ChartsGrid
            │       ├── Card (Revenue Over Time)
            │       │   ├── CardHeader
            │       │   │   ├── Title
            │       │   │   └── FilterDropdown
            │       │   └── CardContent
            │       │       └── LineChart
            │       │           ├── XAxis
            │       │           ├── YAxis
            │       │           ├── Tooltip
            │       │           └── Line
            │       │
            │       └── Card (Occupancy Rate)
            │           ├── CardHeader
            │           └── CardContent
            │               └── PieChart
            │
            ├── RecentActivitySection
            │   └── Card
            │       ├── CardHeader
            │       │   ├── Title
            │       │   └── ViewAllLink
            │       └── CardContent
            │           └── ActivityFeed
            │               └── ActivityItem[]
            │                   ├── Avatar
            │                   ├── Message
            │                   ├── Timestamp
            │                   └── ActionButton (optional)
            │
            └── UpcomingPaymentsSection
                └── Card
                    ├── CardHeader
                    │   ├── Title
                    │   └── FilterTabs
                    └── CardContent
                        └── DataTable
                            ├── TableHeader
                            ├── TableBody
                            │   └── TableRow[]
                            │       ├── PropertyCell
                            │       ├── TenantCell
                            │       ├── AmountCell
                            │       ├── DueDateCell
                            │       └── ActionsCell
                            └── TablePagination
```

### Property Form (Multi-step)

```
PropertyForm
│
├── FormProvider (React Hook Form)
│   │
│   ├── FormProgress
│   │   └── Step[]
│   │       ├── StepNumber
│   │       ├── StepLabel
│   │       └── StepStatus (current/completed/pending)
│   │
│   ├── FormSteps
│   │   │
│   │   ├── Step1: BasicInfoStep
│   │   │   ├── FormField (Address)
│   │   │   ├── FormField (City)
│   │   │   ├── FormField (State)
│   │   │   ├── FormField (ZIP)
│   │   │   └── FormSelect (Property Type)
│   │   │
│   │   ├── Step2: DetailsStep
│   │   │   ├── FormField (Bedrooms)
│   │   │   ├── FormField (Bathrooms)
│   │   │   ├── FormField (Square Feet)
│   │   │   ├── FormField (Year Built)
│   │   │   └── FormTextarea (Description)
│   │   │
│   │   ├── Step3: FinancialStep
│   │   │   ├── FormField (Purchase Price)
│   │   │   ├── FormField (Monthly Rent)
│   │   │   ├── FormField (Property Tax)
│   │   │   └── FormField (Insurance)
│   │   │
│   │   └── Step4: PhotosStep
│   │       └── FileUpload
│   │           ├── DragDropZone
│   │           │   ├── Icon
│   │           │   └── Instructions
│   │           ├── CameraButton (mobile)
│   │           ├── FileInput (hidden)
│   │           └── PreviewGrid
│   │               └── FilePreview[]
│   │                   ├── Image
│   │                   ├── FileSize
│   │                   ├── RemoveButton
│   │                   └── UploadProgress
│   │
│   └── FormNavigation
│       ├── PreviousButton
│       ├── NextButton
│       └── SubmitButton (final step)
```

### Maintenance Request Card

```
MaintenanceRequestCard
│
├── Card
│   ├── CardHeader
│   │   ├── TitleRow
│   │   │   ├── Title
│   │   │   └── StatusBadge
│   │   │       └── (Pending/In Progress/Completed)
│   │   └── MetaInfo
│   │       ├── PropertyAddress
│   │       ├── Unit
│   │       └── SubmittedDate
│   │
│   ├── CardContent
│   │   ├── Description
│   │   ├── PriorityBadge
│   │   ├── Category
│   │   ├── PhotoGallery (if photos)
│   │   │   └── ImageThumbnail[]
│   │   │       └── onClick → Lightbox
│   │   └── TenantInfo
│   │       ├── Avatar
│   │       └── Name
│   │
│   └── CardFooter
│       └── Actions
│           ├── ViewDetailsButton
│           ├── AssignContractorButton (landlord)
│           ├── ApproveButton (landlord)
│           ├── UpdateStatusButton (contractor)
│           └── MessageButton
```

### Message Thread

```
MessageThread
│
├── ThreadHeader
│   ├── BackButton (mobile)
│   ├── ParticipantInfo
│   │   ├── Avatar
│   │   ├── Name
│   │   └── OnlineStatus
│   └── ThreadActions
│       ├── SearchButton
│       └── MoreOptionsMenu
│
├── MessageList
│   ├── ScrollArea
│   │   ├── DateDivider
│   │   ├── MessageBubble (sent)
│   │   │   ├── Avatar
│   │   │   ├── MessageContent
│   │   │   │   ├── Text
│   │   │   │   └── Attachments (if any)
│   │   │   ├── Timestamp
│   │   │   └── ReadReceipt
│   │   ├── MessageBubble (received)
│   │   ├── DateDivider
│   │   └── TypingIndicator (if typing)
│   └── ScrollToBottomButton
│
└── MessageComposer
    ├── AttachmentButton
    │   └── FileUpload (hidden)
    ├── TextArea
    │   └── EmojiPicker (optional)
    ├── CharacterCount
    └── SendButton
```

### Data Table (Generic)

```
DataTable<TData>
│
├── TableToolbar
│   ├── FilterSection
│   │   ├── SearchInput
│   │   ├── FilterDropdown[]
│   │   └── ClearFiltersButton
│   └── ActionsSection
│       ├── ExportButton
│       ├── BulkActionsDropdown
│       └── ViewToggle (grid/list)
│
├── Table
│   ├── TableHeader
│   │   └── TableRow
│   │       └── TableHead[]
│   │           ├── ColumnLabel
│   │           ├── SortButton
│   │           └── ResizeHandle
│   │
│   └── TableBody
│       ├── TableRow[] (data)
│       │   └── TableCell[]
│       │       ├── CellContent
│       │       └── CellActions
│       │
│       ├── EmptyState (no data)
│       │   ├── Icon
│       │   ├── Message
│       │   └── ActionButton
│       │
│       └── LoadingRows (loading)
│           └── Skeleton[]
│
└── TablePagination
    ├── RowsPerPageSelector
    ├── PageInfo
    └── PageNavigation
        ├── FirstPageButton
        ├── PreviousPageButton
        ├── PageNumbers
        ├── NextPageButton
        └── LastPageButton
```

## Composition Patterns

### 1. Compound Components

```typescript
// Usage
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### 2. Render Props

```typescript
// Usage
<DataTable
  data={properties}
  columns={columns}
  renderRow={(property) => (
    <PropertyRow property={property} />
  )}
  renderEmpty={() => (
    <EmptyState message="No properties found" />
  )}
/>
```

### 3. Higher-Order Components (HOC)

```typescript
// With authentication
export const ProtectedPage = withAuth(PropertyListPage);

// With role check
export const LandlordOnlyPage = withRole(DashboardPage, ['landlord']);
```

### 4. Custom Hooks for Logic

```typescript
// Separate logic from UI
function PropertyList() {
  const { properties, isLoading, error } = useProperties();
  const { deleteProperty } = useDeleteProperty();
  
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorFallback error={error} />;
  
  return (
    <div>
      {properties.map(property => (
        <PropertyCard
          key={property.id}
          property={property}
          onDelete={deleteProperty}
        />
      ))}
    </div>
  );
}
```

### 5. Context for Shared State

```typescript
// Dashboard context for shared filters
<DashboardProvider>
  <DashboardFilters />
  <PropertyList />
  <TenantList />
</DashboardProvider>

// Components can access shared filters
function PropertyList() {
  const { filters } = useDashboardContext();
  const { properties } = useProperties(filters);
  // ...
}
```

## Component Communication

### Parent to Child (Props)
```typescript
<PropertyCard
  property={property}
  onEdit={handleEdit}
  variant="compact"
/>
```

### Child to Parent (Callbacks)
```typescript
function PropertyForm({ onSubmit }) {
  const handleFormSubmit = (data) => {
    // Validate and process
    onSubmit(data);
  };
  
  return <form onSubmit={handleFormSubmit}>...</form>;
}
```

### Sibling to Sibling (Lifting State Up)
```typescript
function Dashboard() {
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  return (
    <>
      <PropertyList onSelect={setSelectedProperty} />
      <PropertyDetails property={selectedProperty} />
    </>
  );
}
```

### Global State (Zustand/Context)
```typescript
function Sidebar() {
  const { isOpen, toggle } = useUIStore();
  return <aside className={isOpen ? 'open' : 'closed'}>...</aside>;
}

function Header() {
  const { toggle } = useUIStore();
  return <button onClick={toggle}>Toggle Sidebar</button>;
}
```

### Server State (React Query)
```typescript
function PropertyList() {
  const { data } = useProperties();
  // Automatically shared across all components using useProperties
}

function PropertyStats() {
  const { data } = useProperties();
  // Same data, cached by React Query
}
```

## Reusability Strategies

### 1. Generic Components with TypeScript

```typescript
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}

function DataTable<T>({ data, columns, onRowClick }: DataTableProps<T>) {
  // Generic table implementation
}

// Usage with different types
<DataTable<Property> data={properties} columns={propertyColumns} />
<DataTable<Tenant> data={tenants} columns={tenantColumns} />
```

### 2. Polymorphic Components

```typescript
interface ButtonProps {
  as?: 'button' | 'a' | 'div';
  href?: string;
  onClick?: () => void;
}

function Button({ as: Component = 'button', ...props }: ButtonProps) {
  return <Component {...props} />;
}

// Usage
<Button>Click me</Button>
<Button as="a" href="/properties">View Properties</Button>
```

### 3. Composable Utilities

```typescript
// Combine className utilities
import { cn } from '@/lib/utils';

<div className={cn(
  'base-classes',
  variant === 'large' && 'large-classes',
  isActive && 'active-classes',
  className // User override
)} />
```

### 4. Feature Flags

```typescript
// Conditional features
function PropertyCard({ property, features }) {
  return (
    <Card>
      {/* Always visible */}
      <PropertyInfo />
      
      {/* Conditional features */}
      {features.analytics && <PropertyAnalytics />}
      {features.sharing && <ShareButton />}
    </Card>
  );
}
```

## Responsive Variations

### Mobile vs Desktop Components

```typescript
function PropertyView() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return isMobile ? (
    <PropertyCardList />   // Card view for mobile
  ) : (
    <PropertyTable />      // Table view for desktop
  );
}
```

### Progressive Disclosure

```typescript
function PropertyCard({ property }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card>
      {/* Always visible */}
      <BasicInfo property={property} />
      
      {/* Hidden on mobile, toggle on click */}
      <div className="hidden md:block">
        <DetailedInfo property={property} />
      </div>
      
      {/* Mobile: show on expand */}
      <div className="md:hidden">
        {expanded && <DetailedInfo property={property} />}
        <Button onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show Less' : 'Show More'}
        </Button>
      </div>
    </Card>
  );
}
```

## Testing Component Hierarchy

```typescript
// Test individual components
describe('PropertyCard', () => {
  it('renders property information', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText(mockProperty.address)).toBeInTheDocument();
  });
});

// Test composition
describe('PropertyList', () => {
  it('renders multiple PropertyCards', () => {
    render(<PropertyList properties={mockProperties} />);
    expect(screen.getAllByTestId('property-card')).toHaveLength(3);
  });
});

// Test integration with providers
describe('Dashboard with providers', () => {
  it('displays user data', () => {
    render(
      <Providers>
        <Dashboard />
      </Providers>
    );
    expect(screen.getByText('Welcome, John')).toBeInTheDocument();
  });
});
```

This component hierarchy ensures:
- Clear separation of concerns
- Reusable, composable components
- Predictable data flow
- Easy testing
- Scalable architecture
