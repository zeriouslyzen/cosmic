// Payment Processing with Stripe and Alternatives
import { loadStripe } from '@stripe/stripe-js';
import { getCurrentUser } from './auth.js';
import { getCartUserId } from './session.js';
import { createOrder, clearCart, getProductById } from './api.js';
import { earnStardustOnPurchase } from './stardust.js';
import { toast } from './utils/toast.js';

let stripe = null;
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

function mapCartItemsForCheckout(cartItems) {
    return cartItems.map((item) => ({
        title: item.products?.title || 'Product',
        name: item.products?.title || 'Product',
        price: parseFloat(item.products?.price || 0),
        quantity: item.quantity || 1,
        image_url: item.products?.image_url || '',
        stripe_price_id: item.products?.stripe_price_id || null,
        product_id: item.product_id
    }));
}

// Initialize Stripe
export async function initStripe() {
    if (!stripePublishableKey) {
        console.warn('Stripe publishable key not configured');
        return false;
    }

    try {
        stripe = await loadStripe(stripePublishableKey);
        return true;
    } catch (error) {
        console.error('Error initializing Stripe:', error);
        return false;
    }
}

// Process checkout with Stripe (guest or signed-in)
export async function checkoutWithStripe(cartItems, total, stardustDiscount = 0) {
    if (!cartItems?.length) {
        toast.info('Your cart is empty');
        return false;
    }

    if (!stripePublishableKey) {
        toast.error('Stripe is not configured. Add your publishable key to .env');
        return false;
    }

    if (!stripe) {
        const initialized = await initStripe();
        if (!initialized) {
            toast.error('Payment system not available');
            return false;
        }
    }

    const userId = await getCartUserId();
    const user = await getCurrentUser();

    if (stardustDiscount > 0 && !user) {
        toast.info('Sign in to use Star Dust rewards');
        return false;
    }

    try {
        const order = await createOrder(userId, {
            total,
            payment_method: 'stripe',
            payment_status: 'pending',
            customer_email: user?.email || null,
            is_guest: !user
        });

        if (!order) {
            toast.error('Failed to create order');
            return false;
        }

        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId: order.id,
                userId,
                discountAmount: stardustDiscount,
                items: mapCartItemsForCheckout(cartItems)
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Failed to create checkout session');
        }

        if (data.url) {
            window.location.href = data.url;
            return true;
        }

        if (data.sessionId) {
            const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
            if (error) {
                throw error;
            }
            return true;
        }

        throw new Error('No checkout session returned');
    } catch (error) {
        console.error('Checkout error:', error);
        toast.error(error.message || 'Checkout failed. Please try again.');
        return false;
    }
}

// Buy now — skip cart, go straight to Stripe (no account required)
export async function quickBuyProduct(productId, quantity = 1) {
    const product = await getProductById(productId);
    if (!product) {
        toast.error('Product not found');
        return false;
    }

    const lineItem = {
        product_id: productId,
        quantity,
        products: product
    };
    const total = parseFloat(product.price || 0) * quantity;
    return checkoutWithStripe([lineItem], total, 0);
}

// Process payment with Venmo (via Stripe payment links or manual)
export async function checkoutWithVenmo(cartItems, total) {
    const user = await getCurrentUser();
    if (!user) {
        toast.info('Please sign in to checkout');
        return false;
    }

    const order = await createOrder(user.id, {
        total: total,
        payment_method: 'venmo',
        payment_status: 'pending'
    });

    if (!order) {
        toast.error('Failed to create order');
        return false;
    }

    const venmoHandle = prompt('Enter your Venmo handle for payment instructions:');
    if (venmoHandle) {
        toast.success(`Please send $${total.toFixed(2)} to @${venmoHandle} with order ID: ${order.id}`);
    }

    return order;
}

// Process payment with CashApp (via Stripe payment links or manual)
export async function checkoutWithCashApp(cartItems, total) {
    const user = await getCurrentUser();
    if (!user) {
        toast.info('Please sign in to checkout');
        return false;
    }

    const order = await createOrder(user.id, {
        total: total,
        payment_method: 'cashapp',
        payment_status: 'pending'
    });

    if (!order) {
        toast.error('Failed to create order');
        return false;
    }

    const cashTag = prompt('Enter your CashApp $tag for payment instructions:');
    if (cashTag) {
        toast.success(`Please send $${total.toFixed(2)} to $${cashTag} with order ID: ${order.id}`);
    }

    return order;
}

// Process payment with Crypto (Coinbase Commerce or similar)
export async function checkoutWithCrypto(cartItems, total) {
    const user = await getCurrentUser();
    if (!user) {
        toast.info('Please sign in to checkout');
        return false;
    }

    const order = await createOrder(user.id, {
        total: total,
        payment_method: 'crypto',
        payment_status: 'pending'
    });

    if (!order) {
        toast.error('Failed to create order');
        return false;
    }

    toast.info(`Crypto payment: Send $${total.toFixed(2)} worth of crypto. Order ID: ${order.id}`);

    return order;
}

function syncOrderToOwnerList(orderId, updates) {
    const allOrders = JSON.parse(localStorage.getItem('all_orders') || '[]');
    const index = allOrders.findIndex((order) => order.id === orderId);
    if (index !== -1) {
        allOrders[index] = { ...allOrders[index], ...updates };
        localStorage.setItem('all_orders', JSON.stringify(allOrders));
    }
}

// Handle successful payment (called from success page)
export async function handlePaymentSuccess(orderId, paymentMethod, amountTotal = null, userId = null, customerEmail = null) {
    if (!orderId) return false;

    const resolvedUserId = userId || await getCartUserId();
    const processedKey = `checkout_processed_${orderId}`;
    if (sessionStorage.getItem(processedKey) === 'true') {
        return true;
    }

    try {
        const { useLocalStorage, supabaseClient } = await import('./supabase.js');
        const { isGuestUserId } = await import('./session.js');
        const user = await getCurrentUser();
        const useLocalOrders = useLocalStorage || isGuestUserId(resolvedUserId);

        if (useLocalOrders) {
            const orders = JSON.parse(localStorage.getItem(`orders_${resolvedUserId}`) || '[]');
            const order = orders.find((entry) => entry.id === orderId);
            if (order) {
                order.payment_status = 'paid';
                order.status = 'processing';
                if (amountTotal != null) {
                    order.total = amountTotal;
                }
                if (customerEmail) {
                    order.customer_email = customerEmail;
                }
                localStorage.setItem(`orders_${resolvedUserId}`, JSON.stringify(orders));
            }

            syncOrderToOwnerList(orderId, {
                payment_status: 'paid',
                status: 'processing',
                payment_method: paymentMethod,
                customer_email: customerEmail || order?.customer_email || user?.email || null
            });

            const paidTotal = amountTotal ?? order?.total ?? 0;
            if (user && paidTotal) {
                await earnStardustOnPurchase(parseFloat(paidTotal));
            }

            await clearCart(resolvedUserId);
            sessionStorage.setItem(processedKey, 'true');
            return true;
        }

        if (!user) {
            return false;
        }

        const { error } = await supabaseClient
            .from('orders')
            .update({
                payment_status: 'paid',
                status: 'processing'
            })
            .eq('id', orderId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error updating order:', error);
            return false;
        }

        const { data: orderData } = await supabaseClient
            .from('orders')
            .select('total')
            .eq('id', orderId)
            .single();

        if (orderData) {
            await earnStardustOnPurchase(parseFloat(orderData.total));
        }

        await clearCart(user.id);
        sessionStorage.setItem(processedKey, 'true');
        return true;
    } catch (error) {
        console.error('Error handling payment success:', error);
        return false;
    }
}

export async function initPayments() {
    if (stripePublishableKey) {
        await initStripe();
    }
}
