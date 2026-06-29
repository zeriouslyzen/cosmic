import { createClient } from '@supabase/supabase-js';
import { isProduction } from './security.js';

function getOwnerEmails(env) {
    return [
        env.VITE_OWNER_EMAIL,
        env.OWNER_EMAIL,
        'owner@cosmicdeals.com'
    ].filter(Boolean);
}

export async function requireOwnerAuth(req, env = process.env) {
    if (!isProduction(env)) {
        return { authorized: true };
    }

    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return { authorized: false, status: 401, error: 'Authentication required' };
    }

    const token = authHeader.slice(7);
    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return { authorized: false, status: 503, error: 'Owner authentication is not configured' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return { authorized: false, status: 401, error: 'Invalid session' };
    }

    if (!getOwnerEmails(env).includes(user.email)) {
        return { authorized: false, status: 403, error: 'Not authorized' };
    }

    return { authorized: true, user };
}
