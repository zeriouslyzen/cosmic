import Stripe from 'stripe';
import { listStripeCatalog } from './stripe-catalog.js';
import { resolveTrustedOrigin } from './security.js';

export function getStripe(secretKey) {
    if (!secretKey) return null;
    return new Stripe(secretKey);
}

const MAX_CHECKOUT_ITEMS = 50;
const MAX_ITEM_QUANTITY = 99;

export async function resolveTrustedCheckoutItems(stripe, clientItems) {
    if (!clientItems?.length) {
        throw new Error('Cart is empty');
    }

    if (clientItems.length > MAX_CHECKOUT_ITEMS) {
        throw new Error('Too many items in cart');
    }

    const catalog = await listStripeCatalog(stripe);
    const byProductId = new Map(catalog.map((product) => [product.stripe_product_id, product]));
    const byPriceId = new Map(
        catalog.filter((product) => product.stripe_price_id).map((product) => [product.stripe_price_id, product])
    );

    return clientItems.map((item) => {
        const productId = item.product_id || item.stripe_product_id;
        const priceId = item.stripe_price_id;
        const catalogItem = (productId && byProductId.get(productId))
            || (priceId && byPriceId.get(priceId));

        if (!catalogItem?.price || catalogItem.price <= 0) {
            throw new Error('One or more products are no longer available');
        }

        const quantity = Math.min(
            MAX_ITEM_QUANTITY,
            Math.max(1, Number.parseInt(item.quantity, 10) || 1)
        );

        return {
            title: catalogItem.title,
            price: catalogItem.price,
            quantity,
            image_url: catalogItem.image_url,
            stripe_price_id: catalogItem.stripe_price_id
        };
    });
}

function normalizeDiscount(discountAmount, subtotal) {
    const requested = Number(discountAmount) || 0;
    if (requested <= 0) {
        return 0;
    }
    return Math.min(requested, subtotal);
}

function applyDiscountToItems(items, discountAmount) {
    if (!discountAmount || discountAmount <= 0) {
        return items;
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (subtotal <= 0) {
        return items;
    }

    const ratio = Math.max(0, subtotal - discountAmount) / subtotal;
    return items.map((item) => ({
        ...item,
        price: Math.round(item.price * ratio * 100) / 100
    }));
}

function buildLineItems(items) {
    return items.map((item) => {
        if (item.stripe_price_id && item.price_type !== 'recurring') {
            return {
                price: item.stripe_price_id,
                quantity: item.quantity || 1
            };
        }

        return {
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.title || item.name || 'Product',
                    images: item.image_url ? [item.image_url] : []
                },
                unit_amount: Math.round(parseFloat(item.price) * 100)
            },
            quantity: item.quantity || 1
        };
    });
}

export async function createCheckoutSession(stripe, { items, discountAmount = 0, userId, orderId, origin, env }) {
    const trustedItems = await resolveTrustedCheckoutItems(stripe, items);
    const subtotal = trustedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const safeDiscount = normalizeDiscount(discountAmount, subtotal);
    const pricedItems = applyDiscountToItems(trustedItems, safeDiscount);
    const lineItems = buildLineItems(pricedItems);
    const baseUrl = resolveTrustedOrigin(origin, env);

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?cart=open`,
        client_reference_id: orderId || undefined,
        metadata: {
            orderId: orderId || '',
            userId: userId || 'guest',
            discountAmount: String(safeDiscount)
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        phone_number_collection: { enabled: false }
    });

    return {
        sessionId: session.id,
        url: session.url
    };
}

export async function verifyCheckoutSession(stripe, sessionId) {
    if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
        throw new Error('Invalid session');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
        paid: session.payment_status === 'paid',
        orderId: session.metadata?.orderId || session.client_reference_id || null,
        userId: session.metadata?.userId || null,
        amountTotal: session.amount_total ? session.amount_total / 100 : 0,
        sessionId: session.id,
        customerEmail: session.customer_details?.email || null
    };
}
