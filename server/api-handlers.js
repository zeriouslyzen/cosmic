import {
    archiveStripeProduct,
    createStripeCatalogItem,
    getStripeClient,
    listStripeCatalog,
    updateStripeCatalogItem
} from './stripe-catalog.js';
import { createCheckoutSession, verifyCheckoutSession } from './checkout.js';
import { requireOwnerAuth } from './owner-auth.js';
import {
    readJsonBody,
    sanitizeApiError,
    setCorsHeaders,
    isValidStripeSessionId
} from './security.js';

function sendJson(res, status, body) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
}

export async function handleApiRequest(req, res, env) {
    setCorsHeaders(req, res, env);

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    const url = new URL(req.url || '/', 'http://localhost');
    const stripe = getStripeClient(env.STRIPE_SECRET_KEY);

    try {
        if (url.pathname === '/api/stripe-products' && req.method === 'GET') {
            if (!stripe) {
                sendJson(res, 503, { error: 'Stripe is not configured.' });
                return;
            }

            const products = await listStripeCatalog(stripe);
            sendJson(res, 200, { products });
            return;
        }

        if (url.pathname === '/api/stripe-products' && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
            const auth = await requireOwnerAuth(req, env);
            if (!auth.authorized) {
                sendJson(res, auth.status || 401, { error: auth.error || 'Unauthorized' });
                return;
            }

            if (!stripe) {
                sendJson(res, 503, { error: 'Stripe is not configured.' });
                return;
            }

            if (req.method === 'POST') {
                const body = await readJsonBody(req);
                if (!body?.title || body.price == null) {
                    sendJson(res, 400, { error: 'title and price are required' });
                    return;
                }

                const stripeIds = await createStripeCatalogItem(stripe, body);
                sendJson(res, 200, { ...stripeIds, ...body, id: stripeIds.stripe_product_id });
                return;
            }

            if (req.method === 'PUT') {
                const productId = url.searchParams.get('id');
                const body = await readJsonBody(req);
                if (!productId || !body?.title || body.price == null) {
                    sendJson(res, 400, { error: 'id, title, and price are required' });
                    return;
                }

                const stripeIds = await updateStripeCatalogItem(stripe, productId, body);
                sendJson(res, 200, { ...stripeIds, ...body, id: productId });
                return;
            }

            const productId = url.searchParams.get('id');
            if (!productId) {
                sendJson(res, 400, { error: 'id is required' });
                return;
            }

            await archiveStripeProduct(stripe, productId);
            sendJson(res, 200, { success: true });
            return;
        }

        if (url.pathname === '/api/create-checkout-session' && req.method === 'POST') {
            if (!stripe) {
                sendJson(res, 503, { error: 'Stripe is not configured.' });
                return;
            }

            const body = await readJsonBody(req);
            const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'http://localhost:5173';
            const session = await createCheckoutSession(stripe, {
                items: body.items,
                discountAmount: body.discountAmount || 0,
                userId: body.userId,
                orderId: body.orderId,
                origin,
                env
            });
            sendJson(res, 200, session);
            return;
        }

        if (url.pathname === '/api/verify-checkout-session' && req.method === 'GET') {
            if (!stripe) {
                sendJson(res, 503, { error: 'Stripe is not configured.' });
                return;
            }

            const sessionId = url.searchParams.get('session_id');
            if (!sessionId || !isValidStripeSessionId(sessionId)) {
                sendJson(res, 400, { error: 'session_id is required' });
                return;
            }

            const result = await verifyCheckoutSession(stripe, sessionId);
            sendJson(res, 200, result);
            return;
        }

        sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
        sendJson(res, 500, sanitizeApiError(error, env));
    }
}
