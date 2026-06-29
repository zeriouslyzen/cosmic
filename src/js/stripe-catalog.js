import { supabaseClient } from './supabase.js';

export function normalizeStripeProduct(item) {
    return {
        id: item.stripe_product_id,
        title: item.title,
        price: item.price ?? 0,
        description: item.description || null,
        image_url: item.image_url || null,
        image_urls: item.image_urls?.length ? item.image_urls : (item.image_url ? [item.image_url] : []),
        category: item.category || 'Just In',
        zodiac: item.zodiac || 'just-in',
        sku: item.sku || item.stripe_product_id,
        stock_quantity: item.stock_quantity ?? 0,
        stripe_product_id: item.stripe_product_id,
        stripe_price_id: item.stripe_price_id
    };
}

async function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
}

export async function fetchStripeCatalog() {
    const response = await fetch('/api/stripe-products');
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to load Stripe products');
    }

    return (data.products || []).map(normalizeStripeProduct);
}

export async function publishProductToStripe(product) {
    const response = await fetch('/api/stripe-products', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(product)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to publish product to Stripe');
    }

    return {
        ...data,
        id: data.stripe_product_id
    };
}

export async function updateProductInStripe(productId, product) {
    const response = await fetch(`/api/stripe-products?id=${encodeURIComponent(productId)}`, {
        method: 'PUT',
        headers: await getAuthHeaders(),
        body: JSON.stringify(product)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to update Stripe product');
    }

    return data;
}

export async function archiveProductInStripe(productId) {
    const response = await fetch(`/api/stripe-products?id=${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers: await getAuthHeaders()
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to remove Stripe product');
    }

    return true;
}

export async function isStripeCatalogAvailable() {
    try {
        const response = await fetch('/api/stripe-products');
        return response.ok;
    } catch {
        return false;
    }
}
