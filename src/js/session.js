import { getCurrentUser } from './auth.js';

const GUEST_ID_KEY = 'cosmic_guest_id';

export function getGuestId() {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
        id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
}

export function isGuestUserId(userId) {
    return String(userId || '').startsWith('guest-');
}

export async function getCartUserId() {
    const user = await getCurrentUser();
    return user?.id || getGuestId();
}
