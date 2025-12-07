// API Functions for Supabase operations with Local Storage Fallback
import { supabaseClient, useLocalStorage } from './supabase.js';

// User Profile Operations
export async function getUserProfile(userId) {
    if (useLocalStorage) {
        const profile = JSON.parse(localStorage.getItem(`profile_${userId}`) || 'null');
        return profile || { id: userId, zodiac: null, email: null, phone: null, stardust_balance: 0 };
    }
    
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
    return data;
}

export async function createOrUpdateProfile(userId, profileData) {
    if (useLocalStorage) {
        const existing = JSON.parse(localStorage.getItem(`profile_${userId}`) || '{}');
        const updated = { ...existing, id: userId, ...profileData, updated_at: new Date().toISOString() };
        localStorage.setItem(`profile_${userId}`, JSON.stringify(updated));
        return updated;
    }
    
    const { data, error } = await supabaseClient
        .from('profiles')
        .upsert({
            id: userId,
            ...profileData,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'id'
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error creating/updating profile:', error);
        return null;
    }
    return data;
}

// Product Operations
export async function getProducts(filters = {}) {
    if (useLocalStorage) {
        // Try to get products from localStorage first
        let products = JSON.parse(localStorage.getItem('all_products') || '[]');
        
        // If no products in localStorage, try to get from DOM (for main page)
        if (products.length === 0 && typeof document !== 'undefined') {
            const productCards = document.querySelectorAll('.product-card-small, .product-card');
            products = [];
            productCards.forEach((card, index) => {
                products.push({
                    id: card.dataset.productId || `product-${index}`,
                    title: card.dataset.title || 'Product ' + (index + 1),
                    price: parseFloat((card.dataset.price || '$99').replace('$', '').replace(',', '')) || 99,
                    zodiac: card.dataset.zodiac || 'random',
                    image_url: card.dataset.img || '',
                    category: card.dataset.category || 'Random',
                    description: 'A cosmic product'
                });
            });
            // Save to localStorage for future use
            if (products.length > 0) {
                localStorage.setItem('all_products', JSON.stringify(products));
            }
        }
        
        let filtered = products;
        if (filters.zodiac && filters.zodiac !== 'all') {
            filtered = filtered.filter(p => p.zodiac === filters.zodiac);
        }
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(p => p.title.toLowerCase().includes(searchLower));
        }
        return filtered;
    }
    
    let query = supabaseClient.from('products').select('*');
    
    if (filters.zodiac && filters.zodiac !== 'all') {
        query = query.eq('zodiac', filters.zodiac);
    }
    
    if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }
    return data || [];
}

export async function getProductById(productId) {
    if (useLocalStorage) {
        const products = await getProducts();
        return products.find(p => p.id === productId) || null;
    }
    
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
    
    if (error) {
        console.error('Error fetching product:', error);
        return null;
    }
    return data;
}

// Cart Operations
export async function getCartItems(userId) {
    if (useLocalStorage) {
        const cart = JSON.parse(localStorage.getItem(`cart_${userId}`) || '[]');
        // Enrich with product data
        const products = await getProducts();
        return cart.map(item => ({
            ...item,
            products: products.find(p => p.id === item.product_id) || { title: 'Product', price: 0, image_url: '' }
        }));
    }
    
    const { data, error } = await supabaseClient
        .from('cart_items')
        .select(`
            *,
            products (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching cart items:', error);
        return [];
    }
    return data || [];
}

export async function addToCart(userId, productId, quantity = 1) {
    if (useLocalStorage) {
        const cart = JSON.parse(localStorage.getItem(`cart_${userId}`) || '[]');
        const existing = cart.find(item => item.product_id === productId);
        
        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.push({
                id: 'cart-' + Date.now(),
                user_id: userId,
                product_id: productId,
                quantity: quantity,
                created_at: new Date().toISOString()
            });
        }
        localStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
        return existing || cart[cart.length - 1];
    }
    
    // Check if item already in cart
    const { data: existing } = await supabaseClient
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();
    
    if (existing) {
        // Update quantity
        const { data, error } = await supabaseClient
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id)
            .select()
            .single();
        
        if (error) {
            console.error('Error updating cart item:', error);
            return null;
        }
        return data;
    } else {
        // Create new cart item
        const { data, error } = await supabaseClient
            .from('cart_items')
            .insert({
                user_id: userId,
                product_id: productId,
                quantity: quantity
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error adding to cart:', error);
            return null;
        }
        return data;
    }
}

export async function updateCartItemQuantity(cartItemId, quantity) {
    if (quantity <= 0) {
        return await removeFromCart(cartItemId);
    }
    
    if (useLocalStorage) {
        const user = JSON.parse(localStorage.getItem('mock_user') || 'null');
        if (!user) return null;
        const cart = JSON.parse(localStorage.getItem(`cart_${user.id}`) || '[]');
        const item = cart.find(i => i.id === cartItemId);
        if (item) {
            item.quantity = quantity;
            localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
            return item;
        }
        return null;
    }
    
    const { data, error } = await supabaseClient
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating cart item quantity:', error);
        return null;
    }
    return data;
}

export async function removeFromCart(cartItemId) {
    if (useLocalStorage) {
        const user = JSON.parse(localStorage.getItem('mock_user') || 'null');
        if (!user) return false;
        const cart = JSON.parse(localStorage.getItem(`cart_${user.id}`) || '[]');
        const filtered = cart.filter(i => i.id !== cartItemId);
        localStorage.setItem(`cart_${user.id}`, JSON.stringify(filtered));
        return true;
    }
    
    const { error } = await supabaseClient
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);
    
    if (error) {
        console.error('Error removing from cart:', error);
        return false;
    }
    return true;
}

export async function clearCart(userId) {
    if (useLocalStorage) {
        localStorage.removeItem(`cart_${userId}`);
        return true;
    }
    
    const { error } = await supabaseClient
        .from('cart_items')
        .delete()
        .eq('user_id', userId);
    
    if (error) {
        console.error('Error clearing cart:', error);
        return false;
    }
    return true;
}

// Order Operations
export async function createOrder(userId, orderData) {
    if (useLocalStorage) {
        const orders = JSON.parse(localStorage.getItem(`orders_${userId}`) || '[]');
        const order = {
            id: 'order-' + Date.now(),
            user_id: userId,
            ...orderData,
            status: orderData.status || 'pending',
            created_at: new Date().toISOString()
        };
        orders.push(order);
        localStorage.setItem(`orders_${userId}`, JSON.stringify(orders));
        return order;
    }
    
    const { data, error } = await supabaseClient
        .from('orders')
        .insert({
            user_id: userId,
            ...orderData,
            status: 'pending'
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error creating order:', error);
        return null;
    }
    return data;
}

export async function getOrders(userId) {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
    return data || [];
}

// Star Dust Operations
export async function getStardustBalance(userId) {
    const profile = await getUserProfile(userId);
    return profile?.stardust_balance || 0;
}

export async function addStardust(userId, amount, description) {
    if (useLocalStorage) {
        const profile = await getUserProfile(userId);
        const newBalance = (profile.stardust_balance || 0) + amount;
        await createOrUpdateProfile(userId, { stardust_balance: newBalance });
        
        // Store transaction
        const transactions = JSON.parse(localStorage.getItem(`stardust_${userId}`) || '[]');
        transactions.push({
            id: 'tx-' + Date.now(),
            user_id: userId,
            amount: amount,
            type: 'earned',
            description: description,
            created_at: new Date().toISOString()
        });
        localStorage.setItem(`stardust_${userId}`, JSON.stringify(transactions));
        return newBalance;
    }
    
    // Get current balance
    const currentBalance = await getStardustBalance(userId);
    const newBalance = currentBalance + amount;
    
    // Update profile
    await createOrUpdateProfile(userId, { stardust_balance: newBalance });
    
    // Create transaction record
    const { data, error } = await supabaseClient
        .from('stardust_transactions')
        .insert({
            user_id: userId,
            amount: amount,
            type: 'earned',
            description: description
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error recording stardust transaction:', error);
    }
    
    return newBalance;
}

export async function spendStardust(userId, amount, description) {
    // Get current balance
    const currentBalance = await getStardustBalance(userId);
    
    if (currentBalance < amount) {
        throw new Error('Insufficient star dust balance');
    }
    
    const newBalance = currentBalance - amount;
    
    // Update profile
    await createOrUpdateProfile(userId, { stardust_balance: newBalance });
    
    // Create transaction record
    const { data, error } = await supabase
        .from('stardust_transactions')
        .insert({
            user_id: userId,
            amount: amount,
            type: 'spent',
            description: description
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error recording stardust transaction:', error);
    }
    
    return newBalance;
}

export async function getStardustTransactions(userId, limit = 50) {
    const { data, error } = await supabase
        .from('stardust_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) {
        console.error('Error fetching stardust transactions:', error);
        return [];
    }
    return data || [];
}

