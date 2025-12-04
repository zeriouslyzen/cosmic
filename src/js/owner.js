// Owner Dashboard Management
import { supabase } from './supabase.js';
import { getProducts, getProductById } from './api.js';

let isOwner = false;
const ownerDevMode = import.meta?.env?.VITE_OWNER_DASH_DEV_MODE === 'true';

// Check if user is owner (simple check - in production, use proper role-based auth)
export async function checkOwnerAccess() {
    if (ownerDevMode) {
        // In dev mode, treat current user as owner if any session exists
        try {
            const { data: { user } } = await supabase.auth.getUser();
            isOwner = !!user;
            return isOwner;
        } catch {
            // If Supabase is not configured, allow access in dev for UI testing
            isOwner = true;
            return true;
        }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    // Check owner_settings for owner email/ID
    // In production, use Supabase RLS policies or a separate owners table
    const ownerEmail = localStorage.getItem('owner_email') || 'owner@cosmicdeals.com';
    isOwner = user.email === ownerEmail;
    
    return isOwner;
}

// Owner authentication
export async function ownerLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        return { success: false, error };
    }
    
    const isOwnerUser = await checkOwnerAccess();
    if (!isOwnerUser) {
        await supabase.auth.signOut();
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
    
    const { data: orders } = await supabase
        .from('orders')
        .select('*');
    
    const { data: products } = await supabase
        .from('products')
        .select('*');
    
    const { data: transactions } = await supabase
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
    
    const { data, error } = await supabase
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
    
    const { data, error } = await supabase
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
    
    const { error } = await supabase
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
    
    let query = supabase.from('orders').select('*');
    
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
    
    const { error } = await supabase
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
    
    const { data, error } = await supabase
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
    
    const { error } = await supabase
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

