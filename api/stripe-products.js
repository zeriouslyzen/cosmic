import {
    archiveStripeProduct,
    createStripeCatalogItem,
    getStripeClient,
    listStripeCatalog,
    updateStripeCatalogItem
} from '../server/stripe-catalog.js';
import { requireOwnerAuth } from '../server/owner-auth.js';
import { sanitizeApiError, setCorsHeaders } from '../server/security.js';

function getEnv() {
    return process.env;
}

export default async function handler(req, res) {
    const env = getEnv();
    setCorsHeaders(req, res, env);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const stripe = getStripeClient(env.STRIPE_SECRET_KEY);
    if (!stripe) {
        return res.status(503).json({ error: 'Stripe is not configured.' });
    }

    try {
        if (req.method === 'GET') {
            const products = await listStripeCatalog(stripe);
            return res.status(200).json({ products });
        }

        const auth = await requireOwnerAuth(req, env);
        if (!auth.authorized) {
            return res.status(auth.status || 401).json({ error: auth.error || 'Unauthorized' });
        }

        if (req.method === 'POST') {
            const product = req.body;
            if (!product?.title || product.price == null) {
                return res.status(400).json({ error: 'title and price are required' });
            }

            const stripeIds = await createStripeCatalogItem(stripe, product);
            return res.status(200).json({ ...stripeIds, ...product, id: stripeIds.stripe_product_id });
        }

        if (req.method === 'PUT') {
            const productId = req.query?.id;
            const product = req.body;
            if (!productId || !product?.title || product.price == null) {
                return res.status(400).json({ error: 'id, title, and price are required' });
            }

            const stripeIds = await updateStripeCatalogItem(stripe, productId, product);
            return res.status(200).json({ ...stripeIds, ...product, id: productId });
        }

        if (req.method === 'DELETE') {
            const productId = req.query?.id;
            if (!productId) {
                return res.status(400).json({ error: 'id is required' });
            }

            await archiveStripeProduct(stripe, productId);
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json(sanitizeApiError(error, env));
    }
}
