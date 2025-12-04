// Star Dust Loyalty System
import { getCurrentUser } from './auth.js';
import { addStardust, spendStardust, getStardustBalance, getStardustTransactions } from './api.js';

// Earn star dust on purchase (1 per $1)
export async function earnStardustOnPurchase(amount) {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const stardustEarned = Math.floor(amount);
    if (stardustEarned <= 0) return false;
    
    try {
        await addStardust(user.id, stardustEarned, `Purchase: $${amount.toFixed(2)}`);
        await updateStardustDisplay();
        return true;
    } catch (error) {
        console.error('Error earning star dust:', error);
        return false;
    }
}

// Daily check-in bonus (5 star dust)
export async function dailyCheckIn() {
    const user = await getCurrentUser();
    if (!user) return false;
    
    // Check if already checked in today
    const lastCheckIn = localStorage.getItem(`stardust_checkin_${user.id}`);
    const today = new Date().toDateString();
    
    if (lastCheckIn === today) {
        return { success: false, message: 'Already checked in today' };
    }
    
    try {
        await addStardust(user.id, 5, 'Daily check-in bonus');
        localStorage.setItem(`stardust_checkin_${user.id}`, today);
        await updateStardustDisplay();
        return { success: true, amount: 5 };
    } catch (error) {
        console.error('Error with daily check-in:', error);
        return { success: false, message: 'Check-in failed' };
    }
}

// Spend star dust for discount (100 star dust = $1)
export async function spendStardustForDiscount(amount) {
    const user = await getCurrentUser();
    if (!user) return false;
    
    if (amount < 100) {
        return { success: false, message: 'Minimum 100 star dust required for discount' };
    }
    
    try {
        const discount = Math.floor(amount / 100); // $1 per 100 star dust
        await spendStardust(user.id, amount, `Discount: $${discount.toFixed(2)}`);
        await updateStardustDisplay();
        return { success: true, discount };
    } catch (error) {
        console.error('Error spending star dust:', error);
        return { success: false, message: error.message || 'Failed to apply discount' };
    }
}

// Update star dust display in UI
export async function updateStardustDisplay() {
    const user = await getCurrentUser();
    if (!user) {
        const stardustBalance = document.getElementById('stardust-balance');
        const cartStardustBalance = document.getElementById('cart-stardust-balance');
        if (stardustBalance) stardustBalance.textContent = '0';
        if (cartStardustBalance) cartStardustBalance.textContent = '0';
        return;
    }
    
    const balance = await getStardustBalance(user.id);
    const stardustBalance = document.getElementById('stardust-balance');
    const cartStardustBalance = document.getElementById('cart-stardust-balance');
    
    if (stardustBalance) stardustBalance.textContent = balance;
    if (cartStardustBalance) cartStardustBalance.textContent = balance;
}

// Get star dust balance
export async function getBalance() {
    const user = await getCurrentUser();
    if (!user) return 0;
    return await getStardustBalance(user.id);
}

// Get transaction history
export async function getTransactionHistory(limit = 50) {
    const user = await getCurrentUser();
    if (!user) return [];
    return await getStardustTransactions(user.id, limit);
}

// Initialize star dust system
export async function initStardust() {
    await updateStardustDisplay();
    
    // Check for daily check-in opportunity
    const user = await getCurrentUser();
    if (user) {
        const lastCheckIn = localStorage.getItem(`stardust_checkin_${user.id}`);
        const today = new Date().toDateString();
        
        if (lastCheckIn !== today) {
            // Show check-in prompt (can be implemented as a notification)
            console.log('Daily check-in available!');
        }
    }
}

