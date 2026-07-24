# Stripe Production Setup - Formation 29,90€

## Current State
- Formation page: `/formation.html`
- Test Stripe link: `https://buy.stripe.com/test_dRmaEZaWt6z01Hc7y4fbq00`
- Access validation system: `/acces.html` + `assets/js/cours.js`
- Token validation expects n8n webhook at: `https://YOUR_N8N_DOMAIN/webhook/validate-token`

## Architecture Overview

```
Formation Page (formation.html)
    ↓
User clicks "Accéder à la formation" 
    ↓
Stripe Payment Link (test → PRODUCTION)
    ↓
Payment confirmed
    ↓
Stripe Webhook → n8n Automation
    ↓
Generate Access Token
    ↓
Send Email with Link (acces.html?token=XXXXX)
    ↓
User clicks link
    ↓
Token Validation (n8n webhook)
    ↓
Access Granted → cours/index.html
```

## Step 1: Get Stripe Production Keys

### What Tony needs to provide:
- **Stripe Publishable Key** (production) - starts with `pk_live_`
- **Stripe Secret Key** (production) - starts with `sk_live_`
- **Stripe Webhook Signing Secret** - for webhook signature verification (starts with `whsec_`)

### Where to find them:
1. Go to: https://dashboard.stripe.com/apikeys
2. Switch from "Test mode" to **Live mode** (top toggle)
3. Copy:
   - "Publishable key" → use in front-end (optional, not needed for payment links)
   - "Secret key" → use in backend (required for webhooks)

### For webhooks:
1. Go to: https://dashboard.stripe.com/webhooks
2. Create new endpoint for: `https://your-n8n-domain.com/webhook/stripe-payment-confirmed`
3. Select events: `payment_intent.succeeded` or `checkout.session.completed`
4. Copy the "Signing secret" → use for webhook validation

## Step 2: Create Production Stripe Payment Link

### Option A: Via Stripe Dashboard (Easiest)
1. Go to: https://dashboard.stripe.com/payment-links
2. Create New Payment Link:
   - **Product**: "Formation IA - 6 modules" (create if needed)
   - **Price**: €29.90
   - **Quantity**: Fixed (1)
   - **Redirect after payment**: `https://automationboost.com/acces.html?session_id={CHECKOUT_SESSION_ID}`
   - **Enable test mode**: OFF (switch to Live)
3. Copy the live payment link → replace test link in `formation.html`

### Option B: Via API (for automation)
```javascript
// This would be done server-side in n8n
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const paymentLink = await stripe.paymentLinks.create({
  line_items: [
    {
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Formation IA - Gagner de l\'argent avec l\'IA',
          description: '6 modules progressifs, accès à vie, exercices pratiques'
        },
        unit_amount: 2990, // 29.90€ in cents
      },
      quantity: 1,
    },
  ],
  after_completion: {
    type: 'redirect',
    redirect: {
      url: 'https://automationboost.com/acces.html?session_id={CHECKOUT_SESSION_ID}'
    }
  }
});

console.log(paymentLink.url); // Live payment link
```

## Step 3: Update formation.html with Production Link

```html
<!-- Replace this line (line 95 and 260): -->
<a href="https://buy.stripe.com/test_dRmaEZaWt6z01Hc7y4fbq00" class="btn-buy" target="_blank">

<!-- With your production link: -->
<a href="https://buy.stripe.com/live_XXXXXXXXXXXXX" class="btn-buy" target="_blank">
```

**Important**: The link should start with `buy.stripe.com/live_` (not `test_`)

## Step 4: Set Up Email Automation (n8n Webhook)

### Webhook Endpoint: `POST /webhook/stripe-payment-confirmed`

The n8n workflow should:

1. **Receive Stripe Webhook** with:
   ```json
   {
     "type": "checkout.session.completed",
     "data": {
       "object": {
         "id": "cs_XXX",
         "customer_email": "user@example.com",
         "payment_status": "paid",
         "amount_total": 2990
       }
     }
   }
   ```

2. **Verify Webhook Signature** (important for security):
   ```javascript
   // Pseudo-code for signature verification
   const event = await stripe.webhooks.constructEvent(
     req.rawBody,  // raw request body
     req.headers['stripe-signature'],
     process.env.STRIPE_WEBHOOK_SECRET
   );
   ```

3. **Generate Secure Token**:
   - Create a unique token: `token = UUID() or randomString(32)`
   - Store it in database/localStorage with:
     - Email
     - Generated timestamp
     - Expiration (24-48 hours recommended)

4. **Send Access Email**:
   ```
   To: customer_email
   Subject: ⚡ Accès à ta formation IA - Formation AutomationBoost
   
   Body:
   ---
   Salut!
   
   Merci pour ton achat! 🎉
   
   Clique ici pour accéder à ta formation:
   👉 https://automationboost.com/acces.html?token={GENERATED_TOKEN}
   
   Ce lien expire dans 48 heures.
   
   Questions? Réponds à cet email!
   
   Tony
   ---
   ```

5. **Update acces.html for Session ID** (Optional):
   ```html
   <!-- Add support for both token and session_id parameters -->
   const params = new URLSearchParams(window.location.search);
   const token = params.get('token') || params.get('session_id');
   ```

## Step 5: Update acces.html for Token Validation

The current `acces.html` already validates tokens! But make sure the n8n webhook URL is correct:

**File**: `assets/js/cours.js` (line 7):
```javascript
N8N_VALIDATE_URL: 'https://YOUR_N8N_DOMAIN/webhook/validate-token',
```

Replace `YOUR_N8N_DOMAIN` with actual n8n domain.

### n8n Webhook: `POST /webhook/validate-token`

Should receive:
```json
{ "token": "abc123def456..." }
```

Should return:
```json
{ 
  "valid": true, 
  "email": "user@example.com" 
}
```

Or on error:
```json
{ "valid": false }
```

## Step 6: Environment Variables Setup

Create `.env` file in `automationboost` (or set in Coolify):

```bash
# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXXX
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXX

# N8N
N8N_WEBHOOK_BASE=https://your-n8n-domain.com

# Email (SendGrid, Mailgun, etc.)
EMAIL_SERVICE=sendgrid  # or mailgun, postmark
SENDGRID_API_KEY=SG.XXXXXXXXXXXXX
SENDER_EMAIL=formation@automationboost.com
```

## Step 7: Security Checklist

- [ ] Never commit `.env` or secret keys to git
- [ ] Use environment variables for all secrets
- [ ] Verify Stripe webhook signatures (prevents spoofing)
- [ ] Set token expiration (24-48 hours)
- [ ] Rate limit token validation endpoint (prevent brute force)
- [ ] Use HTTPS only (Stripe requires it)
- [ ] Test with Stripe test mode first before going live
- [ ] Monitor webhook delivery in Stripe dashboard
- [ ] Add error logging/monitoring (Sentry, LogRocket, etc.)

## Step 8: Testing Workflow

### Test with Test Mode First:
1. Use test Stripe keys (`pk_test_` and `sk_test_`)
2. Use test payment method: `4242 4242 4242 4242` (expiry: 12/25, CVC: any 3 digits)
3. Verify webhook delivery in Stripe dashboard → Webhooks
4. Check n8n execution logs

### Then Switch to Production:
1. Replace test links with production (`buy.stripe.com/live_XXX`)
2. Update `.env` with production keys
3. Redeploy to Coolify
4. Test with real small payment (or refund immediately)

## Implementation Timeline

| Step | Owner | Effort | Notes |
|------|-------|--------|-------|
| 1. Get Stripe prod keys | Tony | 5 min | From Stripe dashboard, live mode |
| 2. Create prod payment link | Tony | 10 min | Via Stripe dashboard |
| 3. Update formation.html | Claude | 2 min | Replace test URL with prod URL |
| 4. Set up n8n webhook | Tony + n8n | 30 min | Webhook → email automation |
| 5. Update cours.js URLs | Claude | 5 min | Replace N8N_VALIDATE_URL |
| 6. Environment setup | Tony | 10 min | Add to Coolify .env |
| 7. Testing | Tony + Claude | 20 min | Test both modes |
| **Total** | | ~82 min | |

## Files to Update

1. **formation.html** (lines 95, 260): Replace Stripe test link with production link
2. **assets/js/cours.js** (line 7): Update `N8N_VALIDATE_URL` with real domain
3. **.env** (create if needed): Add all Stripe + email service keys

## What Tony Needs to Provide

1. Stripe Production Keys:
   - [ ] Publishable Key (pk_live_...)
   - [ ] Secret Key (sk_live_...)
   - [ ] Webhook Signing Secret (whsec_...)

2. Payment Link (from Stripe dashboard):
   - [ ] Production Payment Link URL (buy.stripe.com/live_...)

3. n8n Configuration:
   - [ ] n8n domain/webhook base URL
   - [ ] Email service API key (SendGrid, Mailgun, etc.)
   - [ ] Sender email address

## Troubleshooting

### Webhook not received?
- Check Stripe dashboard → Webhooks → Event deliveries
- Verify endpoint URL is correct
- Check n8n logs for errors
- Ensure firewall allows Stripe IPs

### Email not sent?
- Check n8n execution logs
- Verify email service API key is valid
- Check spam/junk folder
- Test email service separately

### Token validation fails?
- Check token expiration
- Verify n8n webhook is returning correct JSON
- Check browser console for fetch errors
- Ensure CORS headers are correct

## Additional Resources

- Stripe Webhooks: https://stripe.com/docs/webhooks
- Stripe Payment Links: https://stripe.com/docs/payment-links
- n8n Stripe Node: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.stripe/
- n8n Webhooks: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/

---

# Product 2 — Premium skill "Horror Beat-Sync" (19,90€)

Added 2026-07-24. Second paid product, sold from the skills page. Reuses the same
token-gate mechanism as the formation, but with its own storage key and its own
`product` discriminator so a formation token cannot unlock the skill (and vice versa).

## Files

| File | Role |
|---|---|
| `skills/horror-beatsync.html` | Public sales page (details, pricing, buy button) |
| `skills/horror-beatsync-acces.html` | Gated delivery page — validates the token, then reveals the download |
| `assets/downloads/horror-beatsync-video-skill-ab7f3c.zip` | The product itself (3 files, 12 KB) |
| `skills.html` | Premium card at the top of the grid, links to the sales page |

## Payment link (live)

```
https://buy.stripe.com/aFacN4apbbQKerH2gs7N602
```

Hardcoded in three places: the hero buy box and the final CTA of
`skills/horror-beatsync.html`, plus the "no token" state of
`skills/horror-beatsync-acces.html`.

## What still has to be configured by hand

**1. Stripe — redirect after payment.** In the payment link settings, set the
confirmation page to:

```
https://automatisationboost.com/skills/horror-beatsync-acces.html?session_id={CHECKOUT_SESSION_ID}
```

Without this, the buyer lands on Stripe's default confirmation page and only gets in
through the email link.

**2. n8n — handle the `product` field.** The delivery page posts to the existing
webhook `POST /webhook/validate-token`, with an extra field:

```json
{ "token": "cs_live_xxx", "product": "skill-horror-beatsync" }
```

The workflow must branch on `product`: a token issued for the formation must NOT
validate here. Expected response is unchanged:

```json
{ "valid": true, "email": "buyer@example.com" }
```

**3. n8n — delivery email.** On `checkout.session.completed` for this price, send:

```
Subject: ⚡ Ton skill Horror Beat-Sync est prêt
Body:   https://automatisationboost.com/skills/horror-beatsync-acces.html?token={TOKEN}
```

## Known limitation — the gate is cosmetic

The site is served by plain nginx (see `Dockerfile`), so the ZIP is a **static file at a
public URL**. The token check runs in the browser: it decides whether the page *shows*
the link, not whether nginx *serves* the file. Anyone who has (or guesses) the URL can
download it without paying.

Mitigations in place: the filename carries a random suffix (`-ab7f3c`) and the delivery
page is `noindex, nofollow`. This is enough against casual sharing, not against someone
deliberately redistributing the link.

To make it a real gate, the download has to stop being a static file — serve it from an
n8n endpoint that checks the token server-side and streams the bytes, then point the
button at that endpoint instead of `/assets/downloads/...`.

## Content sanitization

The distributed ZIP is **not** a raw copy of `.claude/skills/horror-beatsync-video/`:
the internal n8n workflow ID of the auto-DM flow was replaced with
`<TON_WORKFLOW_AUTO_DM>` before packaging, and an `INSTALL.md` was added for buyers.
Rebuild the ZIP with the same substitution if the skill is updated.

---

**Last Updated**: 2026-07-24
**Status**: Formation = ready for implementation (still on a `test_` link) · Skill Horror = live link wired, Stripe redirect + n8n branch pending
**Contact**: Tony PAYET (tony.payet.professionnel@gmail.com)
