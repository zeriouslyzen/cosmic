import { getStripe, createCheckoutSession } from '../server/checkout.js';
import { sanitizeApiError, setCorsHeaders } from '../server/security.js';

export default async function handler(req, res) {
    const env = process.env;
    setCorsHeaders(req, res, env);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const stripe = getStripe(env.STRIPE_SECRET_KEY);
    if (!stripe) {
        return res.status(503).json({ error: 'Stripe is not configured.' });
    }

    try {
        const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'http://localhost:5173';
        const session = await createCheckoutSession(stripe, {
            items: req.body.items,
            discountAmount: req.body.discountAmount || 0,
            userId: req.body.userId,
            orderId: req.body.orderId,
            origin,
            env
        });
        return res.status(200).json(session);
    } catch (error) {
        return res.status(500).json(sanitizeApiError(error, env));
    }
}
