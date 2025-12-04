// Cart Management
import { getCurrentUser } from './auth.js';
import { getCartItems, addToCart, updateCartItemQuantity, removeFromCart, clearCart } from './api.js';
import { getStardustBalance } from './api.js';
import { updateCartUI, updateCartCount } from './cart-ui.js';

let cartItems = [];
let cartSubtotal = 0;
let stardustDiscount = 0;
let stardustUsed = 0;

// Initialize cart
export async function initCart() {
    await loadCart();
    await updateStardustDisplay();
    
    // Listen for cart updates
    setInterval(async () => {
        await loadCart();
    }, 5000); // Refresh every 5 seconds
}

// Load cart from database
export async function loadCart() {
    const user = await getCurrentUser();
    if (!user) {
        cartItems = [];
        updateCartUI(cartItems, 0, 0, 0);
        updateCartCount(0);
        return;
    }
    
    const items = await getCartItems(user.id);
    cartItems = items || [];
    calculateTotals();
    updateCartUI(cartItems, cartSubtotal, stardustDiscount, stardustUsed);
    updateCartCount(cartItems.reduce((sum, item) => sum + item.quantity, 0));
}

// Add product to cart
export async function addProductToCart(productId, quantity = 1) {
    const user = await getCurrentUser();
    if (!user) {
        alert('Please sign in to add items to cart');
        return false;
    }
    
    const result = await addToCart(user.id, productId, quantity);
    if (result) {
        await loadCart();
        return true;
    }
    return false;
}

// Update cart item quantity
export async function updateQuantity(cartItemId, quantity) {
    const result = await updateCartItemQuantity(cartItemId, quantity);
    if (result) {
        await loadCart();
        return true;
    }
    return false;
}

// Remove item from cart
export async function removeItem(cartItemId) {
    const result = await removeFromCart(cartItemId);
    if (result) {
        await loadCart();
        return true;
    }
    return false;
}

// Clear entire cart
export async function clearUserCart() {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const result = await clearCart(user.id);
    if (result) {
        cartItems = [];
        calculateTotals();
        updateCartUI(cartItems, 0, 0, 0);
        updateCartCount(0);
        return true;
    }
    return false;
}

// Calculate cart totals
function calculateTotals() {
    cartSubtotal = cartItems.reduce((sum, item) => {
        const price = parseFloat(item.products?.price || 0);
        return sum + (price * item.quantity);
    }, 0);
    
    // Star dust discount (100 star dust = $1)
    const maxDiscount = Math.floor(stardustUsed / 100);
    stardustDiscount = Math.min(maxDiscount, cartSubtotal);
}

// Apply star dust discount
export async function applyStardustDiscount(amount) {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const balance = await getStardustBalance(user.id);
    if (balance < amount) {
        alert('Insufficient star dust');
        return false;
    }
    
    stardustUsed = amount;
    calculateTotals();
    updateCartUI(cartItems, cartSubtotal, stardustDiscount, stardustUsed);
    return true;
}

// Get cart total
export function getCartTotal() {
    return cartSubtotal - stardustDiscount;
}

// Get cart items
export function getCartItemsList() {
    return cartItems;
}

// Update star dust display in cart
async function updateStardustDisplay() {
    const user = await getCurrentUser();
    if (!user) {
        const cartStardust = document.getElementById('cart-stardust');
        if (cartStardust) cartStardust.classList.add('hidden');
        return;
    }
    
    const balance = await getStardustBalance(user.id);
    const cartStardust = document.getElementById('cart-stardust');
    const cartStardustBalance = document.getElementById('cart-stardust-balance');
    
    if (cartStardust) cartStardust.classList.remove('hidden');
    if (cartStardustBalance) cartStardustBalance.textContent = balance;
}

// Export for use in other modules
export { updateStardustDisplay };

