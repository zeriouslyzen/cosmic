# Cosmic Deals Setup Guide

## Implementation Complete

All features from the plan have been implemented. Here's what was built:

### Features Implemented

1. **Left Sidebar Dashboard**
   - Gold sphere trigger button in navigation
   - User zodiac sign display and selection
   - Daily horoscope display
   - Sign in/Sign up with email or phone
   - Star dust balance display
   - Settings toggles
   - Policy links

2. **Right Sidebar Cart**
   - Slide-out cart menu
   - Cart items with quantity controls
   - Star dust balance in cart
   - Cart totals with discount calculation
   - Multiple payment method selection

3. **Authentication System**
   - Email/password authentication
   - Phone/OTP authentication
   - Zodiac sign collection
   - Minimal data collection (email/phone + zodiac)

4. **Cart Management**
   - Add/remove items
   - Quantity updates
   - Persistent cart (stored in Supabase)
   - Real-time cart updates

5. **Payment Integration**
   - Stripe Checkout (primary)
   - Venmo payment option
   - CashApp payment option
   - Crypto payment option

6. **Star Dust Loyalty System**
   - Earn 1 star dust per $1 spent
   - Daily check-in bonus (5 star dust)
   - Redeem 100 star dust for $1 discount
   - Transaction tracking

7. **Owner Dashboard**
   - Product management (CRUD)
   - Order management
   - Dashboard statistics
   - Settings management
   - Located at: `/src/html/owner-dashboard.html`

8. **Policy Pages**
   - Privacy Policy
   - Terms of Service
   - Return Policy
   - Located at: `/src/html/policies.html`

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `@supabase/supabase-js` - Supabase client
- `@stripe/stripe-js` - Stripe payment processing

### 2. Set Up Supabase

1. Create a Supabase project at https://supabase.com
2. Go to SQL Editor and run the SQL from `SUPABASE_SCHEMA.sql`
3. Get your project URL and anon key from Settings > API
4. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 3. Set Up Stripe

1. Create a Stripe account at https://stripe.com
2. Get your publishable key from the Stripe dashboard
3. Add it to your `.env` file
4. For production, set up webhook endpoints to handle payment confirmations

### 4. Configure Owner Access

In `src/js/owner.js`, update the owner email check:

```javascript
const ownerEmail = localStorage.getItem('owner_email') || 'your-owner-email@example.com';
```

Or create an owner account in Supabase and use proper role-based authentication.

### 5. Backend API Endpoint (Required for Stripe)

You'll need to create a serverless function to handle Stripe Checkout session creation. Example for Vercel:

Create `api/create-checkout-session.js`:

```javascript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: req.body.items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    })),
    mode: 'payment',
    success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.origin}/cart`,
  });

  res.json({ sessionId: session.id });
}
```

### 6. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## File Structure

```
Cosmic/
├── index.html                 # Main store page
├── src/
│   ├── html/
│   │   ├── owner-dashboard.html  # Owner dashboard
│   │   └── policies.html          # Policy pages
│   ├── js/
│   │   ├── main.js            # Main app logic, sidebar toggles
│   │   ├── supabase.js        # Supabase client setup
│   │   ├── api.js             # API functions
│   │   ├── auth.js            # Authentication
│   │   ├── cart.js            # Cart management
│   │   ├── cart-ui.js         # Cart UI updates
│   │   ├── payments.js        # Payment processing
│   │   ├── stardust.js        # Loyalty system
│   │   ├── owner.js           # Owner functions
│   │   └── owner-dashboard.js # Owner dashboard logic
│   └── styles/
│       └── main.css           # All styles including sidebars
├── SUPABASE_SCHEMA.sql        # Database schema
└── package.json               # Dependencies
```

## Next Steps

1. **Set up Supabase** - Run the SQL schema
2. **Configure environment variables** - Add `.env` file
3. **Set up Stripe** - Add publishable key and create webhook endpoint
4. **Test authentication** - Sign up a test user
5. **Add products** - Use owner dashboard or insert directly into Supabase
6. **Test checkout flow** - Make a test purchase

## Notes

- The app uses minimal data collection (email/phone + zodiac)
- Star dust is earned automatically on purchases
- Payment methods other than Stripe use manual processing (can be enhanced with proper SDKs)
- Owner dashboard requires owner account setup
- All features are responsive and work on mobile/tablet/desktop

## Production Deployment

For production:
1. Deploy to Vercel/Netlify
2. Set environment variables in deployment platform
3. Set up Stripe webhooks
4. Configure CORS for Supabase
5. Set up proper owner authentication
6. Add error monitoring (Sentry, etc.)

