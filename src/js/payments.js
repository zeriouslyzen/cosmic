// Payment Processing with Stripe and Alternatives
import { loadStripe } from '@stripe/stripe-js';
import { getCurrentUser } from './auth.js';
import { createOrder, clearCart } from './api.js';
import { earnStardustOnPurchase } from './stardust.js';

let stripe = null;
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

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

// Process checkout with Stripe
export async function checkoutWithStripe(cartItems, total, stardustDiscount = 0) {
    const user = await getCurrentUser();
    if (!user) {
        alert('Please sign in to checkout');
        return false;
    }
    
    if (!stripePublishableKey) {
        // Development mode - simulate checkout
        alert(`Development Mode: Stripe checkout simulation\n\nTotal: $${total.toFixed(2)}\nItems: ${cartItems.length}\n\nIn production, this would redirect to Stripe Checkout.`);
        
        // Simulate successful order
        const order = await createOrder(user.id, {
            total: total,
            payment_method: 'stripe',
            payment_status: 'paid'
        });
        
        if (order) {
            await handlePaymentSuccess(order.id, 'stripe');
            alert('Order placed successfully! (Development mode)');
            return true;
        }
        return false;
    }
    
    if (!stripe) {
        const initialized = await initStripe();
        if (!initialized) {
            alert('Payment system not available');
            return false;
        }
    }
    
    try {
        // Create order in database first
        const order = await createOrder(user.id, {
            total: total,
            payment_method: 'stripe',
            payment_status: 'pending'
        });
        
        if (!order) {
            alert('Failed to create order');
            return false;
        }
        
        // Create Stripe Checkout session (requires backend endpoint)
        // For now, we'll use a client-side approach with payment links
        // In production, create a serverless function to handle this
        
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                orderId: order.id,
                items: cartItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.products?.price
                })),
                total: total,
                userId: user.id
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }
        
        const { sessionId } = await response.json();
        
        // Redirect to Stripe Checkout
        const { error } = await stripe.redirectToCheckout({ sessionId });
        
        if (error) {
            console.error('Stripe checkout error:', error);
            alert('Checkout failed: ' + error.message);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Checkout failed. Please try again.');
        return false;
    }
}

// Process payment with Venmo (via Stripe payment links or manual)
export async function checkoutWithVenmo(cartItems, total) {
    const user = await getCurrentUser();
    if (!user) {
        alert('Please sign in to checkout');
        return false;
    }
    
    // Create order
    const order = await createOrder(user.id, {
        total: total,
        payment_method: 'venmo',
        payment_status: 'pending'
    });
    
    if (!order) {
        alert('Failed to create order');
        return false;
    }
    
    // In production, integrate Venmo SDK or use Stripe payment links
    // For now, show manual payment instructions
    const venmoHandle = prompt('Enter your Venmo handle for payment instructions:');
    if (venmoHandle) {
        alert(`Please send $${total.toFixed(2)} to @${venmoHandle} with order ID: ${order.id}`);
        // In production, send email/SMS with payment instructions
    }
    
    return order;
}

// Process payment with CashApp (via Stripe payment links or manual)
export async function checkoutWithCashApp(cartItems, total) {
    const user = await getCurrentUser();
    if (!user) {
        alert('Please sign in to checkout');
        return false;
    }
    
    // Create order
    const order = await createOrder(user.id, {
        total: total,
        payment_method: 'cashapp',
        payment_status: 'pending'
    });
    
    if (!order) {
        alert('Failed to create order');
        return false;
    }
    
    // In production, integrate CashApp SDK or use Stripe payment links
    const cashTag = prompt('Enter your CashApp $tag for payment instructions:');
    if (cashTag) {
        alert(`Please send $${total.toFixed(2)} to $${cashTag} with order ID: ${order.id}`);
    }
    
    return order;
}

// Process payment with Crypto (Coinbase Commerce or similar)
export async function checkoutWithCrypto(cartItems, total) {
    const user = await getCurrentUser();
    if (!user) {
        alert('Please sign in to checkout');
        return false;
    }
    
    // Create order
    const order = await createOrder(user.id, {
        total: total,
        payment_method: 'crypto',
        payment_status: 'pending'
    });
    
    if (!order) {
        alert('Failed to create order');
        return false;
    }
    
    // In production, integrate Coinbase Commerce or similar
    // For now, show manual instructions
    alert(`Crypto payment: Send $${total.toFixed(2)} worth of crypto. Order ID: ${order.id}\n\nIn production, this will integrate with Coinbase Commerce or similar service.`);
    
    return order;
}

// Handle successful payment (called from webhook or redirect)
export async function handlePaymentSuccess(orderId, paymentMethod) {
    const user = await getCurrentUser();
    if (!user) return false;
    
    try {
        const { useLocalStorage, supabaseClient } = await import('./supabase.js');
        
        if (useLocalStorage) {
            // Store order in localStorage for development
            const orders = JSON.parse(localStorage.getItem(`orders_${user.id}`) || '[]');
            const order = orders.find(o => o.id === orderId) || { id: orderId, total: 0 };
            order.payment_status = 'paid';
            order.status = 'processing';
            localStorage.setItem(`orders_${user.id}`, JSON.stringify(orders));
            
            // Earn star dust
            if (order.total) {
                await earnStardustOnPurchase(parseFloat(order.total));
            }
            
            // Clear cart
            await clearCart(user.id);
            return true;
        }
        
        // Update order status
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
        
        // Earn star dust
        const { data: orderData } = await supabaseClient
            .from('orders')
            .select('total')
            .eq('id', orderId)
            .single();
        
        if (orderData) {
            await earnStardustOnPurchase(parseFloat(orderData.total));
        }
        
        // Clear cart
        await clearCart(user.id);
        
        return true;
    } catch (error) {
        console.error('Error handling payment success:', error);
        return false;
    }
}

// Initialize payments on page load
export async function initPayments() {
    if (stripePublishableKey) {
        await initStripe();
    }
}

