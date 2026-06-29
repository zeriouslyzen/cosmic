import { getStripe, verifyCheckoutSession } from '../server/checkout.js';
import { isValidStripeSessionId, sanitizeApiError, setCorsHeaders } from '../server/security.js';

export default async function handler(req, res) {
    const env = process.env;
    setCorsHeaders(req, res, env);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const stripe = getStripe(env.STRIPE_SECRET_KEY);
    if (!stripe) {
        return res.status(503).json({ error: 'Stripe is not configured.' });
    }

    try {
        const sessionId = req.query?.session_id;
        if (!sessionId || !isValidStripeSessionId(sessionId)) {
            return res.status(400).json({ error: 'session_id is required' });
        }

        const result = await verifyCheckoutSession(stripe, sessionId);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json(sanitizeApiError(error, env));
    }
}
