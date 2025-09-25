# 🚀 Reusable Next.js Modules

This folder contains three production-ready modules extracted from the FireQSP application that can be directly copied and used in any Next.js project.

## 📦 What's Included

### 1. **Clerk Authentication Module** (`1-clerk-auth/`)
Complete authentication system with Clerk including:
- User authentication and session management
- Protected routes and middleware
- Webhook handling for user lifecycle
- Rate limiting utilities
- Admin role-based access control

### 2. **Stripe Payments Module** (`2-stripe-payments/`)
Full payment integration with Stripe including:
- Checkout session creation
- Subscription management
- Multiple pricing tiers
- Webhook handling for payment events
- Customer portal integration

### 3. **Supabase Storage Module** (`3-supabase-storage/`)
Database and storage solution with Supabase including:
- Database client setup (with and without RLS)
- TypeScript type definitions
- CRUD operations helper functions
- User data management
- Query optimization patterns

## 🎯 How to Use

Each module is self-contained and can be used independently. Follow the README.md in each module folder for:

1. **Installation** - Required packages
2. **Environment Variables** - What to configure
3. **Setup Steps** - How to integrate
4. **Code Examples** - Real implementation examples
5. **API Routes** - Ready-to-use endpoints

## ⚡ Quick Start

1. Choose the module(s) you need
2. Copy the module folder to your Next.js project
3. Install required dependencies
4. Set up environment variables
5. Import and use the utilities

## 🔧 Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Clerk** - Authentication
- **Stripe** - Payments
- **Supabase** - Database & Storage

## 📖 Documentation

Each module includes:
- ✅ Complete TypeScript types
- ✅ Error handling
- ✅ Security best practices
- ✅ Production-ready code
- ✅ Comments and documentation

## 🤝 Integration Example

All three modules work together seamlessly:

```typescript
// User signs up with Clerk
// → Webhook creates user in Supabase
// → User subscribes via Stripe
// → Webhook updates subscription in Supabase
// → User accesses protected features
```

---

**Note**: These modules are extracted from a production application and follow Next.js 15 best practices with the App Router.
