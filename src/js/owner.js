// Owner Dashboard Management
import { supabaseClient } from './supabase.js';
import { getProducts, getProductById } from './api.js';

let isOwner = false;
const ownerDevMode = import.meta?.env?.VITE_OWNER_DASH_DEV_MODE === 'true';

// Check if user is owner
export async function checkOwnerAccess() {
    // 1. Check for manual debug override (Console: localStorage.setItem('owner_debug_mode', 'true'))
    if (localStorage.getItem('owner_debug_mode') === 'true') {
        console.warn('⚠️ DASHBOARD DEBUG MODE ACTIVE - Security Bypassed');
        isOwner = true;
        return true;
    }

    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error || !user) {
        isOwner = false;
        return false;
    }

    // Tight email-based check for the owner
    // In production, you would check a 'role' column in a 'profiles' table
    const ownerEmails = [
        'owner@cosmicdeals.com',
        localStorage.getItem('owner_email') // Allow dev override if explicitly set
    ].filter(Boolean);

    if (ownerEmails.includes(user.email)) {
        isOwner = true;
        return true;
    }

    isOwner = false;
    return false;
}

// Owner authentication
export async function ownerLogin(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return { success: false, error };
    }

    const isOwnerUser = await checkOwnerAccess();
    if (!isOwnerUser) {
        await supabaseClient.auth.signOut();
        return { success: false, error: { message: 'Not an owner account' } };
    }

    return { success: true, user: data.user };
}

// Get dashboard stats
export async function getDashboardStats() {
    if (!isOwner) {
        await checkOwnerAccess();
        if (!isOwner) return null;
    }

    const { useLocalStorage } = await import('./supabase.js');

    if (useLocalStorage) {
        // Use localStorage fallback for development
        const orders = JSON.parse(localStorage.getItem('all_orders') || '[]');
        const products = await getProducts();
        const transactions = JSON.parse(localStorage.getItem('all_stardust_transactions') || '[]');

        const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const totalStardust = transactions.reduce((sum, t) => sum + (t.type === 'earned' ? t.amount : -t.amount), 0);

        return {
            totalOrders: orders.length,
            pendingOrders,
            totalProducts: products.length,
            totalRevenue,
            totalStardust
        };
    }

    const { data: orders } = await supabaseClient
        .from('orders')
        .select('*');

    const { data: products } = await supabaseClient
        .from('products')
        .select('*');

    const { data: transactions } = await supabaseClient
        .from('stardust_transactions')
        .select('*');

    const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) || 0;
    const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
    const totalStardust = transactions?.reduce((sum, t) => sum + (t.type === 'earned' ? t.amount : -t.amount), 0) || 0;

    return {
        totalOrders: orders?.length || 0,
        pendingOrders,
        totalProducts: products?.length || 0,
        totalRevenue,
        totalStardust
    };
}

// Product Management
export async function createProduct(productData) {
    if (!isOwner) {
        await checkOwnerAccess();
        if (!isOwner) return null;
    }

    const { useLocalStorage } = await import('./supabase.js');

    if (useLocalStorage) {
        // Store in localStorage for development
        const products = await getProducts();
        const newProduct = {
            id: 'product-' + Date.now(),
            ...productData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        products.push(newProduct);
        localStorage.setItem('all_products', JSON.stringify(products));
        return newProduct;
    }

    const { data, error } = await supabaseClient
        .from('products')
        .insert(productData)
        .select()
        .single();

    if (error) {
        console.error('Error creating product:', error);
        return null;
    }

    return data;
}

export async function updateProduct(productId, productData) {
    if (!isOwner) {
        await checkOwnerAccess();
        if (!isOwner) return null;
    }

    const { useLocalStorage } = await import('./supabase.js');

    if (useLocalStorage) {
        // Update in localStorage for development
        const products = await getProducts();
        const index = products.findIndex(p => p.id === productId);
        if (index !== -1) {
            products[index] = { ...products[index], ...productData, updated_at: new Date().toISOString() };
            localStorage.setItem('all_products', JSON.stringify(products));
            return products[index];
        }
        return null;
    }

    const { data, error } = await supabaseClient
        .from('products')
        .update(productData)
        .eq('id', productId)
        .select()
        .single();

    if (error) {
        console.error('Error updating product:', error);
        return null;
    }

    return data;
}

export async function deleteProduct(productId) {
    if (!isOwner) {
        await checkOwnerAccess();
        if (!isOwner) return false;
    }

    const { useLocalStorage } = await import('./supabase.js');

    if (useLocalStorage) {
        // Delete from localStorage for development
        const products = await getProducts();
        const filtered = products.filter(p => p.id !== productId);
        localStorage.setItem('all_products', JSON.stringify(filtered));
        return true;
    }

    const { error } = await supabaseClient
        .from('products')
        .delete()
        .eq('id', productId);

    if (error) {
        console.error('Error deleting product:', error);
        return false;
    }

    return true;
}

// Order Management
export async function getOrders(filters = {}) {
    if (!isOwner) {
        await checkOwnerAccess();
        if (!isOwner) return [];
    }

    const { useLocalStorage } = await import('./supabase.js');

    if (useLocalStorage) {
        // Get orders from localStorage for development
        let orders = JSON.parse(localStorage.getItem('all_orders') || '[]');
        if (filters.status) {
            orders = orders.filter(o => o.status === filters.status);
        }
        return orders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    let query = supabaseClient.from('orders').select('*');

    if (filters.status) {
        query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }

    return data || [];
}

export async function updateOrderStatus(orderId, status) {
    if (!isOwner) {
        await checkOwnerAccess();
        if (!isOwner) return false;
    }

    const { useLocalStorage } = await import('./supabase.js');

    if (useLocalStorage) {
        // Update order in localStorage for development
        const orders = JSON.parse(localStorage.getItem('all_orders') || '[]');
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            order.updated_at = new Date().toISOString();
            localStorage.setItem('all_orders', JSON.stringify(orders));
            return true;
        }
        return false;
    }

    const { error } = await supabaseClient
        .from('orders')
        .update({ status })
        .eq('id', orderId);

    if (error) {
        console.error('Error updating order:', error);
        return false;
    }

    return true;
}

// Settings Management
export async function getSetting(key) {
    if (!isOwner) {
        await checkOwnerAccess();
        if (!isOwner) return null;
    }

    const { useLocalStorage } = await import('./supabase.js');

    if (useLocalStorage) {
        // Get setting from localStorage for development
        const settings = JSON.parse(localStorage.getItem('owner_settings') || '{}');
        return settings[key] || null;
    }

    const { data, error } = await supabaseClient
        .from('owner_settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error) {
        console.error('Error fetching setting:', error);
        return null;
    }

    return data?.value;
}

export async function setSetting(key, value) {
    if (!isOwner) {
        await checkOwnerAccess();
        if (!isOwner) return false;
    }

    const { useLocalStorage } = await import('./supabase.js');

    if (useLocalStorage) {
        // Store setting in localStorage for development
        const settings = JSON.parse(localStorage.getItem('owner_settings') || '{}');
        settings[key] = value;
        localStorage.setItem('owner_settings', JSON.stringify(settings));
        return true;
    }

    const { error } = await supabaseClient
        .from('owner_settings')
        .upsert({
            key,
            value,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'key'
        });

    if (error) {
        console.error('Error setting setting:', error);
        return false;
    }

    return true;
}

