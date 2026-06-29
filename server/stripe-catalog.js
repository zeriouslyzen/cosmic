import Stripe from 'stripe';

export function getStripeClient(secretKey) {
    if (!secretKey) return null;
    return new Stripe(secretKey);
}

export async function listStripeCatalog(stripe) {
    const response = await stripe.products.list({
        active: true,
        limit: 100,
        expand: ['data.default_price']
    });

    return response.data.map((product) => {
        const price = product.default_price;
        const isOneTimePrice = typeof price === 'object' && price?.id && !price?.recurring;
        const unitAmount = typeof price === 'object' && price?.unit_amount != null
            ? price.unit_amount / 100
            : null;

        return {
            stripe_product_id: product.id,
            stripe_price_id: isOneTimePrice ? price.id : null,
            title: product.name,
            description: product.description || '',
            price: unitAmount,
            currency: typeof price === 'object' ? price?.currency : 'usd',
            image_url: product.images?.[0] || '',
            image_urls: product.images || [],
            category: product.metadata?.category || 'Just In',
            zodiac: product.metadata?.zodiac || 'just-in',
            sku: product.metadata?.sku || product.id,
            stock_quantity: product.metadata?.stock_quantity
                ? parseInt(product.metadata.stock_quantity, 10)
                : null
        };
    });
}

export async function createStripeCatalogItem(stripe, product) {
    const stripeProduct = await stripe.products.create({
        name: product.title,
        description: product.description || undefined,
        images: (product.image_urls?.length ? product.image_urls : [product.image_url]).filter(Boolean),
        metadata: {
            category: product.category || '',
            zodiac: product.zodiac || '',
            sku: product.sku || '',
            stock_quantity: String(product.stock_quantity ?? 0)
        }
    });

    const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(parseFloat(product.price) * 100),
        currency: 'usd'
    });

    await stripe.products.update(stripeProduct.id, {
        default_price: stripePrice.id
    });

    return {
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id
    };
}

export function mapStripeItemToStoreProduct(item) {
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

export async function updateStripeCatalogItem(stripe, productId, product) {
    const images = (product.image_urls?.length ? product.image_urls : [product.image_url]).filter(Boolean);
    const stripeProduct = await stripe.products.update(productId, {
        name: product.title,
        description: product.description || undefined,
        images: images.length ? images : undefined,
        metadata: {
            category: product.category || '',
            zodiac: product.zodiac || '',
            sku: product.sku || '',
            stock_quantity: String(product.stock_quantity ?? 0)
        }
    });

    let stripePriceId = product.stripe_price_id || null;
    if (product.price != null) {
        const stripePrice = await stripe.prices.create({
            product: productId,
            unit_amount: Math.round(parseFloat(product.price) * 100),
            currency: 'usd'
        });
        stripePriceId = stripePrice.id;
        await stripe.products.update(productId, {
            default_price: stripePriceId
        });
    }

    return {
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePriceId
    };
}

export async function archiveStripeProduct(stripe, productId) {
    await stripe.products.update(productId, { active: false });
    return true;
}
