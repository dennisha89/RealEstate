# Property Management SaaS - Backend API

A comprehensive, production-ready backend API for a multi-tenant property management SaaS platform.

## Overview

This platform supports landlords, property managers, tenants, and contractors with comprehensive property, lease, payment, and maintenance management capabilities.

### Key Features

- **User Management**: Multi-role authentication (landlords, tenants, contractors)
- **Property & Unit Management**: Complete CRUD operations with image/document uploads
- **Tenant Screening**: Background checks and application workflow
- **Lease Management**: Digital leases with e-signatures
- **Payment Processing**: Stripe integration with autopay support
- **Maintenance Workflow**: Request tracking from creation to completion
- **Messaging System**: Real-time messaging with read receipts
- **Inspection Workflows**: Move-in, move-out, and routine inspections
- **Reporting & Analytics**: Financial reports, occupancy tracking
- **Notification System**: Email, SMS, and push notifications
- **Real-time Updates**: WebSocket support for live features

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15 (primary), Redis (cache/sessions)
- **File Storage**: AWS S3 + CloudFront CDN
- **Real-time**: Socket.IO with Redis adapter
- **Payments**: Stripe
- **Email**: SendGrid
- **SMS**: Twilio
- **Push Notifications**: Firebase Cloud Messaging
- **Container**: Docker + Docker Compose
- **Orchestration**: AWS ECS Fargate
- **CI/CD**: GitHub Actions
- **IaC**: Terraform
- **Monitoring**: CloudWatch, Prometheus, Grafana

## Architecture Documentation

Comprehensive technical specifications are available in the `/docs/architecture` directory:

1. **[Overview](./docs/architecture/01-overview.md)** - System architecture, tech stack, design patterns
2. **[API Endpoints](./docs/architecture/02-api-endpoints.md)** - Complete API specification with request/response formats
3. **[Authentication](./docs/architecture/03-authentication.md)** - JWT auth, RBAC, permission matrix
4. **[Database Schema](./docs/architecture/04-database-schema.md)** - Complete database design with relationships
5. **[Service Layer](./docs/architecture/05-service-layer.md)** - Business logic organization and patterns
6. **[Middleware](./docs/architecture/06-middleware.md)** - Auth, validation, logging, error handling
7. **[File Storage](./docs/architecture/07-file-storage.md)** - S3 strategy for images, documents, videos
8. **[Real-time](./docs/architecture/08-realtime.md)** - WebSocket implementation for live features
9. **[Integrations](./docs/architecture/09-integrations.md)** - Stripe, SendGrid, Twilio, etc.
10. **[Deployment](./docs/architecture/10-deployment.md)** - Production infrastructure and CI/CD

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7

### Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-org/property-management-api.git
cd property-management-api
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start services with Docker Compose**
```bash
docker-compose up -d
```

5. **Run database migrations**
```bash
npm run migrate
```

6. **Seed database (optional)**
```bash
npm run seed
```

7. **Start development server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## Project Structure

```
property-management-api/
├── docs/
│   └── architecture/          # Technical documentation
├── src/
│   ├── config/               # Configuration files
│   ├── controllers/          # HTTP request handlers
│   ├── middleware/           # Express middleware
│   ├── models/               # Database models
│   ├── repositories/         # Data access layer
│   ├── routes/               # API route definitions
│   ├── services/             # Business logic
│   ├── socket/               # WebSocket server
│   ├── utils/                # Utility functions
│   ├── errors/               # Custom error classes
│   └── index.ts              # Application entry point
├── tests/                    # Test files
├── migrations/               # Database migrations
├── Dockerfile                # Container definition
├── docker-compose.yml        # Local development setup
├── terraform/                # Infrastructure as code
└── .github/
    └── workflows/            # CI/CD pipelines
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new organization
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout

### Properties
- `GET /api/v1/properties` - List properties
- `POST /api/v1/properties` - Create property
- `GET /api/v1/properties/:id` - Get property details
- `PATCH /api/v1/properties/:id` - Update property
- `DELETE /api/v1/properties/:id` - Delete property

### Units
- `GET /api/v1/properties/:propertyId/units` - List units
- `POST /api/v1/properties/:propertyId/units` - Create unit
- `GET /api/v1/units/:id` - Get unit details
- `PATCH /api/v1/units/:id` - Update unit
- `DELETE /api/v1/units/:id` - Delete unit

### Leases
- `GET /api/v1/leases` - List leases
- `POST /api/v1/leases` - Create lease
- `GET /api/v1/leases/:id` - Get lease details
- `POST /api/v1/leases/:id/sign` - Sign lease
- `POST /api/v1/leases/:id/terminate` - Terminate lease

### Payments
- `GET /api/v1/payments` - List payments
- `POST /api/v1/payments` - Process payment
- `POST /api/v1/payments/:id/refund` - Refund payment
- `POST /api/v1/payments/setup-autopay` - Setup autopay

### Maintenance
- `GET /api/v1/maintenance-requests` - List requests
- `POST /api/v1/maintenance-requests` - Create request
- `POST /api/v1/maintenance-requests/:id/assign` - Assign contractor
- `POST /api/v1/maintenance-requests/:id/complete` - Complete request

[See complete API documentation](./docs/architecture/02-api-endpoints.md)

## Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/property_manager
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET_NAME=property-manager-files

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid
SENDGRID_API_KEY=SG...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

## Authentication & Authorization

The API uses JWT-based authentication with role-based access control (RBAC).

### Roles

- **Super Admin**: Platform administrators
- **Landlord**: Property owners with full access
- **Property Manager**: Manage properties and tenants
- **Maintenance Coordinator**: Handle maintenance requests
- **Tenant**: Limited access to own leases and units
- **Contractor**: Access to assigned maintenance requests

### Making Authenticated Requests

Include the access token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://api.propertymanager.com/api/v1/properties
```

[See complete auth documentation](./docs/architecture/03-authentication.md)

## Database Schema

The platform uses PostgreSQL with a multi-tenant architecture. All tables include an `organization_id` for data isolation.

Key entities:
- Organizations
- Users
- Properties
- Units
- Leases
- Payments
- Maintenance Requests
- Messages
- Inspections
- Documents

[See complete database schema](./docs/architecture/04-database-schema.md)

## Deployment

### Docker Build

```bash
docker build -t property-manager-api:latest .
```

### AWS ECS Deployment

1. **Build and push to ECR**
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker build -t property-manager-api .
docker tag property-manager-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/property-manager-api:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/property-manager-api:latest
```

2. **Update ECS service**
```bash
aws ecs update-service --cluster property-manager-cluster --service property-manager-api --force-new-deployment
```

[See complete deployment guide](./docs/architecture/10-deployment.md)

## Monitoring

### Health Check

```bash
curl https://api.propertymanager.com/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T10:00:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "s3": "healthy"
  }
}
```

### Metrics

Prometheus metrics are available at `/metrics` endpoint.

## Performance

- **Response Time**: < 200ms for 95% of requests
- **Throughput**: 1000+ requests/second
- **Uptime**: 99.9% SLA
- **Horizontal Scaling**: Auto-scales based on CPU/memory

## Security

- HTTPS/TLS encryption
- JWT token authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Virus scanning for file uploads
- Secrets management (AWS Secrets Manager)
- Regular security audits

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript strict mode
- Follow ESLint configuration
- Write unit tests for new features
- Update documentation
- Use conventional commits

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues
- **Email**: support@propertymanager.com
- **Slack**: #property-manager-dev

## Roadmap

### Phase 1 (Completed)
- [x] Authentication & authorization
- [x] Property & unit management
- [x] User management
- [x] Basic CRUD operations

### Phase 2 (In Progress)
- [x] Payment integration
- [x] Lease management
- [x] Maintenance workflow
- [ ] Messaging system

### Phase 3 (Planned)
- [ ] Advanced reporting
- [ ] Mobile apps (iOS/Android)
- [ ] AI-powered features
- [ ] Multi-language support

## Team

- **Backend Lead**: John Doe
- **DevOps**: Jane Smith
- **Product Manager**: Bob Johnson

## Acknowledgments

- Express.js community
- TypeScript team
- All our contributors

---

Built with ❤️ by the Property Manager Team
