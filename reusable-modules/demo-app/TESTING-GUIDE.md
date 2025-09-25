# 🧪 Complete Testing Guide

## 🎯 Three Testing Options

### Option 1: Quick UI Test (No Setup) - 2 minutes
### Option 2: Basic Test (Minimal Setup) - 10 minutes  
### Option 3: Full Test (Complete Setup) - 30 minutes

---

## ⚡ Option 1: Quick UI Test (Fastest!)

Test the UI without any service setup:

### Step 1: Install Dependencies
```bash
cd demo-app
npm install
```

### Step 2: Create Minimal .env.local
```bash
# Create .env.local with dummy values (UI will work, no backend)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dummy
CLERK_SECRET_KEY=sk_test_dummy
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy
STRIPE_SECRET_KEY=sk_test_dummy
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy
SUPABASE_SERVICE_ROLE_KEY=dummy
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Run
```bash
npm run dev
```

### Step 4: Test Pages
Visit these URLs:
- ✅ **http://localhost:3000** - Landing page (works!)
- ✅ **http://localhost:3000/pricing** - Pricing page (works!)
- ⚠️ Auth pages won't work (need Clerk)
- ⚠️ Dashboard won't work (need auth)

**What You Can Test:**
- ✅ Landing page UI
- ✅ Responsive design
- ✅ Navigation
- ✅ Pricing cards
- ✅ Animations
- ✅ Footer/Header

---

## 🔧 Option 2: Basic Test (Recommended)

Test with real authentication only:

### Step 1: Set Up Clerk (5 minutes)

1. **Go to:** https://clerk.com
2. **Sign up** (free)
3. **Create application**
4. **Copy keys** from dashboard

### Step 2: Update .env.local
```bash
# Real Clerk keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_REAL_KEY
CLERK_SECRET_KEY=sk_test_YOUR_REAL_KEY

# Dummy for others (features won't work but won't crash)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy
STRIPE_SECRET_KEY=sk_test_dummy
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy
SUPABASE_SERVICE_ROLE_KEY=dummy
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Copy Middleware
```bash
# Copy from modules
cp ../1-clerk-auth/middleware.ts ./
```

### Step 4: Run
```bash
npm run dev
```

### Step 5: Test
- ✅ **Sign up works!**
- ✅ **Sign in works!**
- ✅ **Dashboard loads!**
- ✅ **Protected routes work!**
- ⚠️ Payments won't work (need Stripe)
- ⚠️ Database won't work (need Supabase)

---

## 🚀 Option 3: Full Test (Complete Experience)

Test everything with all services:

### Step 1: Set Up All Services (15 minutes)

#### A. Clerk (done above)

#### B. Stripe (5 minutes)
1. Go to: https://stripe.com
2. Sign up (free)
3. Stay in **Test Mode**
4. Go to **Products** → Create 3 products:
   - Basic ($9.99/month)
   - Pro ($29.99/month)
   - Enterprise ($99.99/month)
5. Copy the **Price IDs** (start with `price_`)
6. Go to **Developers** → **API Keys** → Copy keys

#### C. Supabase (5 minutes)
1. Go to: https://supabase.com
2. Sign up (free)
3. Create new project
4. Go to **Settings** → **API** → Copy keys
5. Go to **SQL Editor** → Run:

```sql
-- Run this in Supabase SQL Editor
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 2: Complete .env.local
```bash
# Clerk (real values)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Stripe (real values)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_BASIC_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Supabase (real values)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Copy All Module Files
```bash
# Copy lib files
cp -r ../1-clerk-auth/lib/auth.ts ./lib/
cp -r ../2-stripe-payments/lib/*.ts ./lib/
cp -r ../3-supabase-storage/lib/*.ts ./lib/

# Copy middleware
cp ../1-clerk-auth/middleware.ts ./

# Copy API routes
mkdir -p app/api/webhooks/clerk
mkdir -p app/api/webhooks/stripe
mkdir -p app/api/stripe/create-checkout
mkdir -p app/api/data

cp ../1-clerk-auth/app/api/webhooks/clerk/route.ts ./app/api/webhooks/clerk/
cp ../2-stripe-payments/app/api/webhooks/stripe/route.ts ./app/api/webhooks/stripe/
cp ../2-stripe-payments/app/api/stripe/create-checkout/route.ts ./app/api/stripe/create-checkout/
cp ../3-supabase-storage/app/api/data/route.ts ./app/api/data/

# Copy auth pages
mkdir -p app/sign-in/[[...sign-in]]
mkdir -p app/sign-up/[[...sign-up]]
cp ../1-clerk-auth/app/sign-in/page.tsx ./app/sign-in/[[...sign-in]]/
cp ../1-clerk-auth/app/sign-up/page.tsx ./app/sign-up/[[...sign-up]]/
```

### Step 4: Set Up Webhooks

#### Clerk Webhook (Local Testing)
1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `http://localhost:3000/api/webhooks/clerk` (for now)
3. Select events: `user.created`, `user.updated`
4. Copy signing secret to .env.local

#### Stripe Webhook (Local Testing with CLI)
```bash
# Install Stripe CLI
# Windows: Download from https://github.com/stripe/stripe-cli/releases

# Run this in separate terminal:
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook secret it gives you to .env.local
```

### Step 5: Run the App
```bash
npm run dev
```

### Step 6: Test Everything! 🎉

#### Test 1: Landing Page
- ✅ Visit http://localhost:3000
- ✅ Check responsive design
- ✅ Test navigation
- ✅ Click buttons

#### Test 2: Authentication
- ✅ Click "Get Started"
- ✅ Sign up with email
- ✅ Verify redirects to dashboard
- ✅ Check user button appears
- ✅ Sign out
- ✅ Sign in again

#### Test 3: Dashboard
- ✅ View stats cards
- ✅ Check recent activity
- ✅ Test sidebar navigation
- ✅ View subscription status

#### Test 4: Content Management
- ✅ Go to /content
- ✅ Create new item (saves to Supabase!)
- ✅ View item in list
- ✅ Delete item
- ✅ Check empty state

#### Test 5: Payments
- ✅ Go to /pricing
- ✅ Click "Upgrade to Pro"
- ✅ Redirects to Stripe Checkout
- ✅ Use test card: `4242 4242 4242 4242`
- ✅ Complete payment
- ✅ Redirects back to dashboard
- ✅ Check webhook fired (in Stripe CLI terminal)

---

## 📋 Testing Checklist

### UI Testing
- [ ] Landing page renders
- [ ] All buttons work
- [ ] Links navigate correctly
- [ ] Mobile responsive
- [ ] Tablet responsive
- [ ] Desktop layout
- [ ] Animations work
- [ ] Images load

### Authentication Testing
- [ ] Sign up with email
- [ ] Sign up with Google (if enabled)
- [ ] Sign in works
- [ ] Sign out works
- [ ] Protected routes redirect
- [ ] User button displays
- [ ] Session persists

### Payment Testing
- [ ] Pricing page displays
- [ ] Plan cards render
- [ ] Checkout button works
- [ ] Stripe checkout loads
- [ ] Test payment succeeds
- [ ] Webhook receives event
- [ ] Subscription updates

### Database Testing
- [ ] Content list loads
- [ ] Create item works
- [ ] Item appears in list
- [ ] Delete item works
- [ ] Empty state shows
- [ ] Loading states work

### Integration Testing
- [ ] User creation triggers webhook
- [ ] Webhook creates user in DB
- [ ] Payment triggers webhook
- [ ] Webhook updates subscription
- [ ] Dashboard shows correct data

---

## 🐛 Common Issues & Fixes

### Issue: "Module not found"
```bash
# Fix: Make sure lib folder exists
mkdir -p lib
cp ../*/lib/*.ts ./lib/
```

### Issue: Clerk auth not working
```bash
# Fix: Check keys are correct
# Verify in .env.local:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx  # Must start with pk_test
CLERK_SECRET_KEY=sk_test_xxx                   # Must start with sk_test
```

### Issue: Stripe checkout fails
```bash
# Fix: Use test card numbers
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

### Issue: Database queries fail
```bash
# Fix: Check Supabase connection
# Verify URL format: https://xxx.supabase.co
# Check keys in .env.local
```

### Issue: Webhooks not firing
```bash
# Local testing only works with:
# - Stripe CLI for Stripe webhooks
# - ngrok or similar for Clerk webhooks

# For Clerk, use:
# 1. Deploy to Vercel/Railway for production webhooks
# OR
# 2. Use ngrok: ngrok http 3000
# Then use the ngrok URL in Clerk dashboard
```

---

## ✅ Success Criteria

You've successfully tested when:
- ✅ App runs without errors
- ✅ Can sign up and sign in
- ✅ Dashboard displays
- ✅ Can create/delete content
- ✅ Payment flow completes (test mode)
- ✅ All pages are responsive

---

## 🎉 Quick Start Commands

```bash
# Navigate to demo app
cd demo-app

# Install
npm install

# Create .env.local (copy from .env.example and fill in)
cp .env.example .env.local

# Copy module files
# (Use commands from Option 3 above)

# Run
npm run dev

# Open browser
# http://localhost:3000
```

---

## 📸 What You Should See

1. **Landing Page** - Beautiful hero, features, stats
2. **Sign Up** - Clerk auth form
3. **Dashboard** - Stats cards, activity feed
4. **Content** - List/create/delete items
5. **Pricing** - Three plans with Stripe integration

---

## 🆘 Need Help?

1. Check error messages in terminal
2. Check browser console (F12)
3. Verify all .env.local values
4. Make sure all files are copied
5. Check service dashboards for issues

---

**Ready to test? Start with Option 1 (fastest) or go straight to Option 3 (full experience)!** 🚀
