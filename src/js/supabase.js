// Supabase Client Setup with Development Fallback
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;
let useLocalStorage = false;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Using local storage fallback for development.');
    useLocalStorage = true;
    // Create a mock supabase client that uses localStorage
    supabase = {
        auth: {
            getUser: async () => ({ data: { user: JSON.parse(localStorage.getItem('mock_user') || 'null') }, error: null }),
            signInWithPassword: async ({ email, password }) => {
                const mockUser = { id: 'mock-' + Date.now(), email, phone: null };
                localStorage.setItem('mock_user', JSON.stringify(mockUser));
                return { data: { user: mockUser }, error: null };
            },
            signUp: async ({ email, password, phone }) => {
                const mockUser = { id: 'mock-' + Date.now(), email, phone };
                localStorage.setItem('mock_user', JSON.stringify(mockUser));
                return { data: { user: mockUser }, error: null };
            },
            signInWithOtp: async ({ phone }) => {
                return { data: {}, error: null };
            },
            verifyOtp: async ({ phone, token }) => {
                const mockUser = { id: 'mock-' + Date.now(), phone };
                localStorage.setItem('mock_user', JSON.stringify(mockUser));
                return { data: { user: mockUser }, error: null };
            },
            signOut: async () => {
                localStorage.removeItem('mock_user');
                return { error: null };
            },
            onAuthStateChange: (callback) => {
                // Mock auth state change listener
                return { data: { subscription: null } };
            }
        },
        from: () => ({
            select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
            insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
            update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
            upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
            delete: () => ({ eq: async () => ({ error: null }) })
        })
    };
} else {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true
        }
    });
}

export { useLocalStorage };
export const supabaseClient = supabase;

