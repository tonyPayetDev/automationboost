/**
 * Stripe Webhook Handler - Formation IA Payment Processing
 *
 * Deploy as serverless function or Node.js microservice
 * Handles Stripe payment webhooks and sends access emails
 *
 * Environment Variables Required:
 * - STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret (whsec_...)
 * - STRIPE_SECRET_KEY: Stripe secret key (sk_live_...)
 * - SENDGRID_API_KEY: SendGrid API key for email delivery
 * - SENDER_EMAIL: Email address to send from (formation@automationboost.com)
 * - DOMAIN: Your domain (automationboost.com)
 */

const crypto = require('crypto');
const Stripe = require('stripe');
const sgMail = require('@sendgrid/mail');

// Initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Generate a secure random access token
 */
function generateAccessToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify Stripe webhook signature
 */
function verifyWebhookSignature(req) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody || JSON.stringify(req.body),
      sig,
      webhookSecret
    );
    return event;
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Send access email with formation link
 */
async function sendAccessEmail(email, token) {
  const accessLink = `https://${process.env.DOMAIN}/acces.html?token=${token}`;

  const msg = {
    to: email,
    from: process.env.SENDER_EMAIL,
    subject: '⚡ Accès à ta formation IA - AutomationBoost',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #eab308 0%, #f97316 100%); color: white; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 10px 0 0 0; font-size: 24px; font-weight: 700; }
    .content { padding: 40px 30px; color: #1a1a1a; line-height: 1.6; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #eab308 0%, #f97316 100%); color: #000; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; margin: 30px 0; }
    .details-box { background: #f9f9f9; border-left: 4px solid #eab308; padding: 20px; border-radius: 4px; margin: 20px 0; }
    .details-box h3 { margin: 0 0 10px 0; color: #eab308; }
    .details-box ul { margin: 0; padding-left: 20px; color: #555; font-size: 13px; }
    .details-box li { margin-bottom: 8px; }
    .footer { background: #f5f5f5; padding: 20px 30px; text-align: center; border-top: 1px solid #eee; font-size: 12px; color: #999; }
    .footer a { color: #eab308; text-decoration: none; }
    .token-link { background: #f5f5f5; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 11px; word-break: break-all; }
    hr { border: none; border-top: 1px solid #eee; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 32px;">⚡</div>
      <h1>Formation IA - Accès confirmé!</h1>
    </div>

    <div class="content">
      <p>Salut,</p>

      <p>Merci pour ton achat! 🎉 Ton paiement de <strong>29,90€</strong> a été confirmé.</p>

      <p>Clique sur le bouton ci-dessous pour accéder immédiatement à ta formation:</p>

      <div style="text-align: center;">
        <a href="${accessLink}" class="cta-button">🚀 Accéder à la formation</a>
      </div>

      <p style="font-size: 12px; color: #999;">
        Ou copie-colle ce lien dans ton navigateur:<br>
        <span class="token-link">${accessLink}</span>
      </p>

      <hr>

      <div class="details-box">
        <h3>Ce que tu vas apprendre:</h3>
        <ul>
          <li>📚 Module 1: Ton arsenal IA (outils essentiels + 3 prompts clés)</li>
          <li>💼 Module 2: Vendre des services IA (tarification 50€-150€/h)</li>
          <li>🤝 Module 3: Trouver tes premiers clients (Malt, LinkedIn, Upwork)</li>
          <li>🤖 Module 4: Automatiser pour scaler (n8n, Make, Zapier)</li>
          <li>💰 Module 5: Revenus passifs (templates, prompts, mini-formations)</li>
          <li>👑 Module 6: Plan 100€/jour (roadmap 30 jours + cas pratiques)</li>
        </ul>
      </div>

      <p style="font-size: 13px; color: #666;"><strong>Accès:</strong> À vie · Mises à jour incluses · Satisfait ou remboursé 14 jours</p>

      <hr>

      <p style="font-size: 13px; color: #666;">Des questions? Réponds simplement à cet email, Tony te lira.</p>

      <p style="font-size: 13px; color: #666;">À bientôt dans la formation! 🚀</p>
    </div>

    <div class="footer">
      <p>AutomationBoost — Formation IA<br><a href="https://automationboost.com">automationboost.com</a></p>
    </div>
  </div>
</body>
</html>
    `
  };

  await sgMail.send(msg);
  console.log(`Access email sent to ${email}`);
}

/**
 * Main webhook handler - Express middleware
 */
async function handleWebhook(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature
    const event = verifyWebhookSignature(req);

    console.log(`Received webhook event: ${event.type}`);

    // Handle payment intent succeeded
    if (event.type === 'charge.succeeded') {
      const charge = event.data.object;
      const email = charge.billing_details?.email;

      if (!email) {
        console.warn('Charge succeeded but no email found');
        return res.status(400).json({ error: 'No email provided' });
      }

      // Generate access token
      const accessToken = generateAccessToken();
      console.log(`Generated token for ${email}`);

      // Send access email
      await sendAccessEmail(email, accessToken);

      // TODO: Store token in database for validation:
      // - token (hashed)
      // - email
      // - expiresAt (current time + 48 hours)
      // - used (boolean, initially false)

      return res.status(200).json({
        success: true,
        message: 'Access email sent successfully'
      });
    }

    // Handle checkout session completed (alternative to charge.succeeded)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_email;

      if (!email) {
        console.warn('Checkout completed but no email found');
        return res.status(400).json({ error: 'No email provided' });
      }

      // Generate access token
      const accessToken = generateAccessToken();
      console.log(`Generated token for ${email}`);

      // Send access email
      await sendAccessEmail(email, accessToken);

      return res.status(200).json({
        success: true,
        message: 'Access email sent successfully'
      });
    }

    // Other event types are ignored
    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).json({ error: err.message });
  }
}

/**
 * Token validation endpoint - used by acces.html
 * Checks if token is valid and not expired
 */
async function validateToken(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'No token provided' });
    }

    // TODO: Implement token validation from database:
    // 1. Find token in database
    // 2. Check if expired (compare with expiresAt)
    // 3. Check if already used
    // 4. Mark as used
    // 5. Return email + valid: true

    // For now, return placeholder
    return res.status(200).json({
      valid: true,
      email: 'user@example.com'
    });

  } catch (err) {
    console.error('Token validation error:', err.message);
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
}

/**
 * Export for serverless or Express
 */
module.exports = {
  handleWebhook,
  validateToken
};

/**
 * Example Express server setup:
 *
 * const express = require('express');
 * const { handleWebhook, validateToken } = require('./stripe-webhook-handler');
 *
 * const app = express();
 *
 * // Raw body for webhook signature verification
 * app.post('/webhook/stripe', express.raw({type: 'application/json'}), handleWebhook);
 *
 * // JSON body for validation
 * app.post('/webhook/validate-token', express.json(), validateToken);
 *
 * app.listen(3000, () => console.log('Server running on port 3000'));
 */
