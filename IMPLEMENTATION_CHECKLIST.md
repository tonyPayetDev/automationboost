# Stripe Production Setup - Implementation Checklist

## Phase 1: Get Production Keys (Tony) ⏱️ ~10 minutes

- [ ] Go to https://dashboard.stripe.com/apikeys
- [ ] Toggle to **Live mode** (top-left switch)
- [ ] Copy **Publishable Key** (pk_live_...)
  - [ ] Save: `STRIPE_PUBLISHABLE_KEY`
- [ ] Copy **Secret Key** (sk_live_...)
  - [ ] Save: `STRIPE_SECRET_KEY`
- [ ] Go to https://dashboard.stripe.com/webhooks
- [ ] Create new endpoint:
  - [ ] URL: `https://automationboost.com/api/webhook/stripe` (or your n8n webhook)
  - [ ] Events: Select at least `charge.succeeded` and `checkout.session.completed`
  - [ ] Copy **Signing Secret** (whsec_...)
  - [ ] Save: `STRIPE_WEBHOOK_SECRET`

**Deliverable**: Email Claude with 3 keys

---

## Phase 2: Create Production Payment Link (Tony) ⏱️ ~10 minutes

### Via Stripe Dashboard (Easiest)

- [ ] Go to https://dashboard.stripe.com/payment-links
- [ ] Click **Create payment link**
- [ ] **Product Details:**
  - [ ] Name: "Formation IA - 6 modules progressifs"
  - [ ] Description: "Gagner de l'argent avec l'IA · Accès à vie · Exercices pratiques"
  - [ ] Price: **29.90** EUR
  - [ ] Unit: Fixed (1 unit)

- [ ] **Redirect:**
  - [ ] After completion: Select "Redirect to URL"
  - [ ] URL: `https://automationboost.com/acces.html?session_id={CHECKOUT_SESSION_ID}`

- [ ] **Payment Method:**
  - [ ] Enable: Credit card, SEPA debit (recommended)

- [ ] **Test Mode:** OFF (ensure you're in Live mode)

- [ ] Click **Create link**

- [ ] Copy the generated link (should start with `buy.stripe.com/live_`)
  - [ ] Save: `STRIPE_PAYMENT_LINK`

**Example**: `https://buy.stripe.com/live_28qWQW2qSabcdefg123456...`

---

## Phase 3: Update formation.html (Claude) ⏱️ ~2 minutes

Replace test Stripe links with production link in `/work/automationboost/formation.html`:

**Line 95** (hero section):
```html
<!-- OLD (remove): -->
<a href="https://buy.stripe.com/test_dRmaEZaWt6z01Hc7y4fbq00"

<!-- NEW (replace with): -->
<a href="https://buy.stripe.com/live_XXXXXXXXXXXXX"
```

**Line 260** (CTA final):
```html
<!-- OLD (remove): -->
<a href="https://buy.stripe.com/test_dRmaEZaWt6z01Hc7y4fbq00"

<!-- NEW (replace with): -->
<a href="https://buy.stripe.com/live_XXXXXXXXXXXXX"
```

- [ ] Update both links
- [ ] Verify links work in browser (should redirect to Stripe payment)
- [ ] Test with test card in test mode first (optional safety check)

---

## Phase 4: Set Up Email Service (Tony) ⏱️ ~5 minutes

Choose one of these email services:

### Option A: SendGrid (Recommended - Free tier available)

- [ ] Go to https://sendgrid.com/
- [ ] Create account or login
- [ ] Go to Settings → API Keys
- [ ] Create new API key
  - [ ] Name: "Formation IA - AutomationBoost"
  - [ ] Permissions: "Mail Send"
- [ ] Copy key
  - [ ] Save: `SENDGRID_API_KEY`
- [ ] Go to Settings → Sender Authentication
- [ ] Verify sender email: `formation@automationboost.com`
  - [ ] You'll get a verification email, click link
  - [ ] Save: `SENDER_EMAIL=formation@automationboost.com`

### Option B: Mailgun

- [ ] Go to https://mailgun.com/
- [ ] Create account
- [ ] Copy API key from account page
- [ ] Set up sending domain (mailgun@automationboost.com)
- [ ] Save: `MAILGUN_API_KEY`

### Option C: Amazon SES (Most reliable for scale)

- [ ] Go to AWS SES console
- [ ] Verify domain or email
- [ ] Get SMTP credentials
- [ ] Save credentials

---

## Phase 5: Set Up Automation (Choose One Path)

### Path A: Use n8n (Recommended if already using n8n)

- [ ] Open your n8n instance
- [ ] Create new workflow (import from `/work/automationboost/N8N_WORKFLOW_TEMPLATE.json`)
- [ ] Configure nodes:
  - [ ] **Webhook** node:
    - [ ] Listen path: `/webhook/stripe-payment-confirmed`
    - [ ] Method: POST
    - [ ] Copy the webhook URL
  - [ ] **Code** node (token generation):
    - [ ] Review code, ensure `expiresAt` is 48 hours from now
  - [ ] **SendGrid** node:
    - [ ] Add SendGrid credentials
    - [ ] Email template is pre-configured
  - [ ] Test workflow with sample webhook payload
- [ ] Save and activate workflow
- [ ] Note the webhook URL
  - [ ] Save: `N8N_WEBHOOK_URL`

Then update `/work/automationboost/assets/js/cours.js` line 7:
```javascript
N8N_VALIDATE_URL: 'https://your-n8n-domain.com/webhook/validate-token',
```

Also add validation webhook in n8n:
- [ ] Create second workflow for token validation
- [ ] Webhook path: `/webhook/validate-token`
- [ ] Receives: `{ token: "xxx" }`
- [ ] Returns: `{ valid: true, email: "xxx@example.com" }`

### Path B: Use Simple Node.js Server (If deploying to Coolify)

- [ ] Install dependencies:
  ```bash
  npm install stripe @sendgrid/mail express
  ```

- [ ] Create `.env` file:
  ```bash
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_SECRET_KEY=sk_live_...
  SENDGRID_API_KEY=SG.....
  SENDER_EMAIL=formation@automationboost.com
  DOMAIN=automationboost.com
  ```

- [ ] Copy `/work/automationboost/stripe-webhook-handler.js` to your server
- [ ] Create Express app to handle webhooks
- [ ] Deploy to Coolify
- [ ] Update Stripe webhook URL to point to your server

- [ ] Update `/work/automationboost/assets/js/cours.js` line 7:
  ```javascript
  N8N_VALIDATE_URL: 'https://automationboost.com/api/webhook/validate-token',
  ```

### Path C: Use Firebase Cloud Functions (Serverless)

- [ ] Deploy `stripe-webhook-handler.js` to Firebase
- [ ] Set environment variables in Firebase console
- [ ] Test webhook delivery
- [ ] Update Stripe webhook URL and cours.js URL

---

## Phase 6: Configure Environment Variables (Tony) ⏱️ ~5 minutes

Create `/work/automationboost/.env` file:

```bash
# ===== STRIPE =====
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXXX
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXX
STRIPE_PAYMENT_LINK=https://buy.stripe.com/live_XXXXXXXXXXXXX

# ===== EMAIL SERVICE =====
SENDGRID_API_KEY=SG.XXXXXXXXXXXXX
SENDER_EMAIL=formation@automationboost.com
DOMAIN=automationboost.com

# ===== N8N (if using) =====
N8N_DOMAIN=https://your-n8n-instance.com
N8N_VALIDATE_URL=https://your-n8n-instance.com/webhook/validate-token
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/stripe-payment-confirmed

# ===== OPTIONAL: MONITORING =====
SENTRY_DSN=https://xxxxx@sentry.io/xxxx
LOG_LEVEL=info
```

- [ ] Add to Coolify environment variables (not in git)
- [ ] **IMPORTANT**: Never commit `.env` to git
- [ ] Add `.env` to `.gitignore` if not already there

---

## Phase 7: Update courses.js URL (Claude) ⏱️ ~2 minutes

File: `/work/automationboost/assets/js/cours.js`, Line 7

Replace:
```javascript
N8N_VALIDATE_URL: 'https://YOUR_N8N_DOMAIN/webhook/validate-token',
```

With actual URL from Phase 5 (n8n webhook):
```javascript
N8N_VALIDATE_URL: 'https://your-n8n-instance.com/webhook/validate-token',
```

---

## Phase 8: Configure Stripe Webhook (Tony) ⏱️ ~5 minutes

In Stripe Dashboard:

- [ ] Go to https://dashboard.stripe.com/webhooks
- [ ] Find or create endpoint
- [ ] URL should be webhook URL from Phase 5
  - [ ] n8n: `https://your-n8n-instance.com/webhook/stripe-payment-confirmed`
  - [ ] Node.js: `https://automationboost.com/api/webhook/stripe`
  - [ ] Firebase: `https://us-central1-project.cloudfunctions.net/handleStripeWebhook`

- [ ] Select events:
  - [ ] ✅ `charge.succeeded`
  - [ ] ✅ `checkout.session.completed`
  - [ ] (optional) `charge.dispute.created`

- [ ] Click Create endpoint
- [ ] Note the Signing Secret (should match `STRIPE_WEBHOOK_SECRET`)

---

## Phase 9: Test Workflow (Claude + Tony) ⏱️ ~20 minutes

### Step 1: Test in Stripe Test Mode
- [ ] Keep current test Stripe link temporarily
- [ ] Use test card: `4242 4242 4242 4242` (expires: 12/25, CVC: any)
- [ ] Make a test payment
- [ ] Check Stripe dashboard → Webhooks → Event deliveries
  - [ ] Event should show as "Delivered" (green checkmark)
  - [ ] If failed, check webhook URL and logs

### Step 2: Test Webhook Receipt
- [ ] Check n8n logs (if using n8n)
- [ ] Check server logs (if using Node.js server)
- [ ] Verify webhook was received and processed

### Step 3: Test Email Delivery
- [ ] Check email inbox (test payment used real email)
- [ ] Verify email formatting looks good
- [ ] Click link in email
- [ ] Should redirect to `/acces.html?token=xxx`

### Step 4: Test Access Token Validation
- [ ] On `/acces.html?token=xxx`, should show "loading"
- [ ] Check `courses.js` is making request to validation webhook
- [ ] Should see "Accès confirmé" success state
- [ ] Should redirect to `/cours/index.html` after 2.5 seconds
- [ ] Should see access token saved in localStorage

### Step 5: Test Full Flow (Production)
- [ ] Update formation.html with production Stripe link
- [ ] Update .env with production Stripe keys
- [ ] Redeploy to Coolify
- [ ] Make small test payment with real card (or use test mode in production dashboard)
- [ ] Verify email received with production link
- [ ] Verify access works

---

## Phase 10: Deploy to Coolify (Tony) ⏱️ ~10 minutes

- [ ] Push commits to GitHub
- [ ] In Coolify:
  - [ ] Go to automationboost application
  - [ ] Settings → Environment Variables
  - [ ] Add all variables from `.env` (but from Coolify UI, not file)
  - [ ] Deploy or Redeploy
  - [ ] Wait for "running" status
  - [ ] Verify https://automationboost.com returns 200 OK

- [ ] Test formation page loads
- [ ] Test payment link works
- [ ] Test webhook endpoint is reachable

---

## Phase 11: Monitoring & Logging (Optional) ⏱️ ~10 minutes

- [ ] Set up error monitoring (Sentry, LogRocket, etc.)
- [ ] Configure payment success logging
- [ ] Test error scenarios:
  - [ ] Invalid webhook signature
  - [ ] Missing email
  - [ ] Email delivery failure
  - [ ] Token validation timeout

- [ ] Set up alerts for:
  - [ ] Payment webhook failures
  - [ ] Email delivery failures
  - [ ] High latency on /acces.html validation

---

## Phase 12: Security Review (Claude) ⏱️ ~10 minutes

Security checklist:

- [ ] **API Keys**: Never committed to git, only in .env
- [ ] **HTTPS**: All URLs use https:// (Stripe requirement)
- [ ] **Webhook Signature**: Verified before processing
- [ ] **Token Validation**: Checks expiration (48 hours)
- [ ] **Rate Limiting**: Add rate limit to validation endpoint
- [ ] **CORS**: If webhook is cross-domain, verify headers
- [ ] **Input Validation**: Email format verified
- [ ] **Database**: Tokens should be hashed (if using database)
- [ ] **Email Security**: No sensitive data in email subject
- [ ] **Error Messages**: Don't leak internal details in errors

---

## Files Modified

- [x] `/work/automationboost/formation.html` - Update Stripe links (Phase 3)
- [x] `/work/automationboost/assets/js/cours.js` - Update validation URL (Phase 7)
- [x] `/work/automationboost/.env` - Create with all keys (Phase 6)
- [ ] `/work/automationboost/stripe-webhook-handler.js` - Deploy webhook handler (Phase 5 Path B)
- [ ] `/work/automationboost/N8N_WORKFLOW_TEMPLATE.json` - Import to n8n (Phase 5 Path A)

---

## Communication Template

### Email to Tony (Sending Implementation Plan)

Subject: Stripe Production Setup - 12 Phase Plan

Hi Tony,

I've prepared a complete implementation guide for the formation's Stripe production setup. Here's what needs to happen:

**For You (Tony):**
1. Get 3 Stripe production keys from dashboard (10 min)
2. Create production payment link (10 min)
3. Set up email service (SendGrid recommended, 5 min)
4. Add env variables to Coolify (5 min)
5. Configure Stripe webhook (5 min)
6. Test the flow (20 min)
7. Deploy to Coolify (10 min)

**For Me (Claude):**
- Update HTML with production link
- Update JavaScript validation URL
- Deploy to Coolify

**Total Time**: ~65 minutes (mostly one-time setup)

All documentation is ready:
- `STRIPE_SETUP.md` - Full technical guide
- `IMPLEMENTATION_CHECKLIST.md` - Step-by-step checklist
- `N8N_WORKFLOW_TEMPLATE.json` - n8n automation template
- `stripe-webhook-handler.js` - Alternative Node.js webhook handler

Ready to start?

Cheers,
Claude

---

## FAQ

**Q: Why do we need 3 Stripe keys?**
A: 
- Publishable key: For client-side (optional, we use payment links instead)
- Secret key: For server-side API calls
- Webhook secret: To verify webhooks are actually from Stripe

**Q: Should we use n8n or Node.js webhook handler?**
A: n8n if you're already using it and comfortable with it. Node.js if you prefer keeping everything in the same codebase and deploying together.

**Q: What if webhook delivery fails?**
A: Stripe retries automatically for 3 days. Check webhook delivery status in Stripe dashboard. Check server logs for why endpoint returned error.

**Q: Is the 48-hour token expiration enough?**
A: Yes. Most people access within minutes. If longer, change `48 * 60 * 60 * 1000` to desired milliseconds in token generation code.

**Q: Can students use their formation multiple times?**
A: Yes, localStorage stores access token. They can reload page anytime. If they clear localStorage, they need the email link again.

---

**Status**: Ready for Implementation  
**Last Updated**: 2026-06-17  
**Owner**: Tony PAYET & Claude AI
