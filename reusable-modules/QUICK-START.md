# ⚡ Quick Start Guide

Get up and running with all three modules in 15 minutes!

## 🎯 What You'll Build

A complete SaaS application with:
- ✅ User authentication (Clerk)
- ✅ Subscription payments (Stripe)  
- ✅ Database & storage (Supabase)

## 📦 Step 1: Install Dependencies (2 min)

```bash
npm install @clerk/nextjs @stripe/stripe-js stripe @supabase/supabase-js svix
```

## 🔑 Step 2: Set Up Services (5 min)

### Clerk (Authentication)
1. Go to [clerk.com](https://clerk.com) → Create account
2. Create new application
3. Copy API keys to `.env.local`

### Stripe (Payments)
1. Go to [stripe.com](https://stripe.com) → Create account
2. Get API keys from Dashboard
3. Create 3 products (Basic, Pro, Enterprise)
4. Copy price IDs to `.env.local`

### Supabase (Database)
1. Go to [supabase.com](https://supabase.com) → Create account
2. Create new project
3. Copy URL and keys to `.env.local`

## 📝 Step 3: Environment Variables (1 min)

Create `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_BASIC_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🗄️ Step 4: Database Setup (3 min)

In Supabase SQL Editor, run:

```sql
-- Copy from: 3-supabase-storage/sql/schema.sql
-- Then run: 3-supabase-storage/sql/rls-policies.sql
```

## 📁 Step 5: Copy Module Files (2 min)

```bash
# Copy authentication files
cp -r 1-clerk-auth/lib/auth.ts your-app/lib/
cp -r 1-clerk-auth/middleware.ts your-app/

# Copy payment files
cp -r 2-stripe-payments/lib/* your-app/lib/

# Copy database files
cp -r 3-supabase-storage/lib/* your-app/lib/
```

## 🔧 Step 6: Configure Webhooks (2 min)

### Clerk Webhook
1. Clerk Dashboard → Webhooks → Add Endpoint
2. URL: `https://yourdomain.com/api/webhooks/clerk`
3. Events: `user.created`, `user.updated`, `user.deleted`

### Stripe Webhook
1. Stripe Dashboard → Webhooks → Add Endpoint
2. URL: `https://yourdomain.com/api/webhooks/stripe`
3. Events: `checkout.session.completed`, `customer.subscription.*`

## 🚀 Step 7: Run Your App!

```bash
npm run dev
```

Visit `http://localhost:3000` 🎉

## ✨ What You Get

### ✅ Authentication Pages
- `/sign-in` - Sign in page
- `/sign-up` - Sign up page
- `/dashboard` - Protected dashboard

### ✅ Payment Flow
- `/pricing` - Pricing page with Stripe checkout
- Automatic subscription management

### ✅ Database Operations
- User data stored in Supabase
- Subscription status tracked
- File storage ready

## 🧪 Test It Out

### Test Authentication
1. Go to `/sign-up`
2. Create account
3. Check Supabase → users table

### Test Payments
1. Go to `/pricing`
2. Click "Subscribe"
3. Use test card: `4242 4242 4242 4242`
4. Check Supabase → user_subscriptions table

### Test API
```bash
curl http://localhost:3000/api/data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📚 Next Steps

1. **Customize UI** - Update components to match your brand
2. **Add Features** - Build on top of these modules
3. **Deploy** - Use Vercel, Railway, or your preferred host

## 🎓 Learn More

- Read `INTEGRATION-GUIDE.md` for detailed integration
- Check individual module READMEs for advanced usage
- See code examples in each module folder

## 🆘 Need Help?

### Common Issues

**Webhooks not working?**
- For local dev, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Check webhook secrets match

**Database queries failing?**
- Check RLS policies are correct
- Use `supabaseAdmin` in API routes

**Authentication redirect loops?**
- Verify public routes in `middleware.ts`
- Check Clerk configuration

## 🎉 You're All Set!

You now have a fully functional SaaS starter with:
- 🔐 Secure authentication
- 💳 Payment processing  
- 🗄️ Database & file storage

Start building your amazing app! 🚀

---

**Pro Tip**: Star this repo and share it with other developers! ⭐
