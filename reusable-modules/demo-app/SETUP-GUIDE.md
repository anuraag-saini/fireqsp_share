# 🚀 Demo App Setup Guide

Complete guide to get the demo SaaS application running.

## 📋 What You'll Build

A fully functional SaaS application with:
- ✅ Beautiful landing page
- ✅ User authentication (sign up/sign in)
- ✅ Protected dashboard
- ✅ Content management
- ✅ Pricing page with Stripe checkout
- ✅ Subscription management
- ✅ Responsive design

## 🎯 Step-by-Step Setup

### Step 1: Prerequisites

Make sure you have:
- Node.js 18+ installed
- A code editor (VS Code recommended)
- Accounts created for:
  - [Clerk](https://clerk.com) - Free
  - [Stripe](https://stripe.com) - Test mode
  - [Supabase](https://supabase.com) - Free

### Step 2: Project Structure

```bash
your-project/
├── app/                    # Copy from demo-app/app/
├── components/             # Copy from demo-app/components/
├── lib/                    # Copy from modules
├── middleware.ts           # Copy from 1-clerk-auth/
├── .env.local             # Create this
├── package.json           # Update this
└── tailwind.config.js     # Create this
```

### Step 3: Copy Files

**1. Copy Demo App Files:**
```bash
# Copy all demo app files to your project
cp -r demo-app/app/* your-project/app/
cp -r demo-app/components/* your-project/components/
```

**2. Copy Module Files:**
```bash
# Authentication
cp 1-clerk-auth/lib/auth.ts your-project/lib/
cp 1-clerk-auth/middleware.ts your-project/

# Payments
cp 2-stripe-payments/lib/* your-project/lib/

# Database
cp 3-supabase-storage/lib/* your-project/lib/

# API Routes
cp -r 1-clerk-auth/app/api/webhooks/clerk your-project/app/api/webhooks/
cp -r 2-stripe-payments/app/api/* your-project/app/api/
cp 3-supabase-storage/app/api/data/route.ts your-project/app/api/data/
```

### Step 4: Install Dependencies

```bash
npm install @clerk/nextjs @stripe/stripe-js stripe @supabase/supabase-js svix
```

### Step 5: Environment Variables

Create `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_webhook_secret

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_BASIC_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 6: Database Setup

**1. Go to Supabase SQL Editor**

**2. Run Schema:**
```sql
-- Copy and run: 3-supabase-storage/sql/schema.sql
```

**3. Run RLS Policies:**
```sql
-- Copy and run: 3-supabase-storage/sql/rls-policies.sql
```

### Step 7: Configure Webhooks

**Clerk Webhook:**
1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `http://localhost:3000/api/webhooks/clerk`
3. Select events: `user.created`, `user.updated`, `user.deleted`
4. Copy signing secret to `.env.local`

**Stripe Webhook (Local Testing):**
```bash
# Install Stripe CLI
# Then run:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy webhook secret to .env.local
```

### Step 8: Tailwind Configuration

Create `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Create `postcss.config.js`:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Step 9: Update package.json

Add these scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### Step 10: Run the App!

```bash
npm run dev
```

Visit `http://localhost:3000` 🎉

## 🎨 Pages Included

### Public Pages
- **/** - Landing page with hero, features, stats
- **/pricing** - Pricing plans with Stripe integration
- **/about** - About page
- **/sign-in** - Clerk sign-in page
- **/sign-up** - Clerk sign-up page

### Protected Pages (Require Auth)
- **/dashboard** - Main dashboard with stats
- **/content** - Content management
- **/profile** - User profile
- **/settings** - Account settings

## 🔧 Customization Guide

### Change Colors

Edit `app/globals.css`:

```css
:root {
  --primary: #3B82F6;      /* Blue */
  --secondary: #8B5CF6;    /* Purple */
}
```

### Update Branding

1. Change logo in `Header.tsx`
2. Update company name throughout
3. Modify footer links

### Add New Pages

1. Create file: `app/your-page/page.tsx`
2. Add to navigation in `Header.tsx`
3. Protect with auth if needed

### Modify Features

Edit `app/page.tsx` features array:

```typescript
const features = [
  {
    icon: '🔐',
    title: 'Your Feature',
    description: 'Description here',
  },
  // Add more...
]
```

## 🐛 Troubleshooting

### Clerk Auth Not Working
- Check environment variables
- Verify webhook is configured
- Check middleware.ts routes

### Stripe Checkout Fails
- Verify price IDs in .env.local
- Check Stripe keys (test mode)
- Use Stripe test cards: `4242 4242 4242 4242`

### Database Queries Fail
- Check Supabase connection
- Verify RLS policies
- Use `supabaseAdmin` in API routes

### Styling Issues
- Run: `npm install -D tailwindcss postcss autoprefixer`
- Check tailwind.config.js exists
- Verify globals.css imported in layout.tsx

## 📱 Responsive Design

The app is fully responsive:
- ✅ Mobile (< 768px)
- ✅ Tablet (768px - 1024px)
- ✅ Desktop (> 1024px)

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Update webhook URLs to production
5. Deploy!

### Other Platforms

Works with:
- Railway
- Netlify
- Render
- Any Node.js host

## ✅ Testing Checklist

- [ ] Landing page loads
- [ ] Sign up works
- [ ] Sign in works
- [ ] Dashboard displays
- [ ] Content CRUD works
- [ ] Pricing page loads
- [ ] Stripe checkout works (test mode)
- [ ] Webhooks receive events
- [ ] Database queries work
- [ ] Mobile responsive

## 🎉 You're Done!

You now have a fully functional SaaS application with:
- Authentication ✅
- Payments ✅
- Database ✅
- Beautiful UI ✅
- Responsive design ✅

## 📚 Next Steps

1. **Customize branding** - Make it yours
2. **Add features** - Build on the foundation
3. **Test thoroughly** - Use all features
4. **Deploy** - Go live!
5. **Market** - Get users!

## 🆘 Need Help?

- Check module READMEs in parent folders
- Review code comments
- Test with provided examples
- Check service documentation

---

**Happy Building! 🚀**
