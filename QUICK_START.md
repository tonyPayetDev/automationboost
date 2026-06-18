# Quick Start - 5 Minutes to Production Stripe

## TL;DR (The Ultra-Fast Path)

1. **Tony**: Get 3 Stripe keys from live dashboard (3 min)
2. **Tony**: Create payment link (2 min)
3. **Claude**: Update 2 lines in formation.html with production link (1 min)
4. **Tony**: Deploy to Coolify
5. **Done!**

---

## Step 1: Get Stripe Keys (3 minutes)

### Go here: https://dashboard.stripe.com/apikeys

Make sure **"Live mode"** is ON (top-left toggle).

Copy these 3 strings:

**1. Publishable Key** (starts with `pk_live_`)
```
pk_live_XXXXXXXXXXXXX...
```

**2. Secret Key** (starts with `sk_live_`)
```
sk_live_XXXXXXXXXXXXX...
```

**3. Webhook Secret** - Go to: https://dashboard.stripe.com/webhooks
- Click **Add endpoint**
- URL: `https://automationboost.com/webhook/stripe`
- Events: `charge.succeeded`
- Copy **Signing secret** (starts with `whsec_`)
```
whsec_XXXXXXXXXXXXX...
```

Save these 3 in a secure place (password manager).

---

## Step 2: Create Payment Link (2 minutes)

### Go here: https://dashboard.stripe.com/payment-links

Click **Create payment link**

- **Name**: Formation IA - 6 modules
- **Price**: 29.90 EUR
- **Redirect**: `https://automationboost.com/acces.html`
- **Test mode**: OFF

Copy the link (starts with `buy.stripe.com/live_`):
```
https://buy.stripe.com/live_XXXXXXXXXXXXX...
```

---

## Step 3: Update formation.html (1 minute)

Find and replace in `/work/automationboost/formation.html`:

**Line 95 & 260**: Replace:
```html
<a href="https://buy.stripe.com/test_dRmaEZaWt6z01Hc7y4fbq00"
```

With:
```html
<a href="https://buy.stripe.com/live_XXXXXXXXXXXXX..."
```

(Use the payment link from Step 2)

---

## Step 4: Deploy

Push to GitHub → Coolify auto-deploys → Done!

Test: Click "Accéder à la formation" button → Should open Stripe payment page.

---

## What About Email Automation?

**Manual Email** (works now):
- When someone pays, you send them the link manually
- Link format: `https://automationboost.com/acces.html?token=ABC123...`

**Auto Email** (setup needed, but worth it):
- Stripe webhook → automatically sends email
- Requires: SendGrid API key + n8n/Node.js webhook handler
- Takes ~30 minutes to set up
- See `IMPLEMENTATION_CHECKLIST.md` for full setup

---

## Minimal Viable Product (MVP)

This will work **today** with just those 3 steps:

✅ Students buy via real Stripe  
✅ Payment is secured  
✅ You can manually send access link via email  
✅ Students access formation  

**No email automation needed initially.**

---

## Production Checklist Before Going Live

- [ ] Test with test card first (`4242 4242 4242 4242`)
- [ ] Make real small test payment (€0.50 or €1)
- [ ] Verify payment appears in Stripe dashboard
- [ ] Verify payment link is LIVE (not TEST)
- [ ] Set up monitoring for failed payments
- [ ] Document manual backup for email sending
- [ ] Test access link works: `?token=test123`
- [ ] Inform users about the new payment system

---

## If Something Breaks

**Problem**: Payment link shows error
- [ ] Check Stripe dashboard status
- [ ] Verify link is copied completely
- [ ] Try from incognito/private window
- [ ] Check browser console for errors

**Problem**: Email not sent
- [ ] (Expected if you haven't set up automation)
- [ ] Send manually for now
- [ ] Set up automation later (see IMPLEMENTATION_CHECKLIST.md)

**Problem**: Access validation fails
- [ ] Check browser console errors
- [ ] Verify token in URL: `?token=XXXXX`
- [ ] Manually grant access by setting localStorage

---

## Next Steps (When Ready)

Once the basic flow works, add email automation:

See `IMPLEMENTATION_CHECKLIST.md` **Phase 5-10** for:
- n8n webhook setup
- SendGrid email configuration
- Automatic token generation
- Full automated workflow

---

## Questions?

Email Tony: tony.payet.professionnel@gmail.com

All docs are in the repo:
- `STRIPE_SETUP.md` - Technical deep dive
- `IMPLEMENTATION_CHECKLIST.md` - Step-by-step with screenshots
- `N8N_WORKFLOW_TEMPLATE.json` - Ready-to-import n8n workflow
- `stripe-webhook-handler.js` - Node.js webhook alternative
