// Cart UI Updates
export function updateCartUI(items, subtotal, discount, stardustUsed) {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSummary = document.getElementById('cart-summary');
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    const cartDiscountEl = document.getElementById('cart-discount');
    const cartTotalEl = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const continueShopping = document.getElementById('continue-shopping');
    const paymentMethods = document.getElementById('payment-methods');
    
    // Expose cart items globally for cart functions
    window.cartItems = items;
    
    if (!cartItemsContainer) return;
    
    if (items.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Your cart is empty</p>';
        if (cartSummary) cartSummary.classList.add('hidden');
        if (checkoutBtn) checkoutBtn.classList.add('hidden');
        if (paymentMethods) paymentMethods.classList.add('hidden');
    } else {
        cartItemsContainer.innerHTML = '';
        items.forEach(item => {
            const product = item.products;
            if (!product) return;
            
            const cartItemEl = document.createElement('div');
            cartItemEl.className = 'cart-item';
            cartItemEl.innerHTML = `
                <img src="${product.image_url || 'https://placehold.co/80/1a1a1a/FFFFFF?text=Image'}" 
                     alt="${product.title || 'Product'}" 
                     class="cart-item-image"
                     onerror="this.src='https://placehold.co/80/1a1a1a/FFFFFF?text=Image'">
                <div class="cart-item-details">
                    <h4 class="cart-item-title">${product.title || 'Product'}</h4>
                    <p class="cart-item-price">$${parseFloat(product.price || 0).toFixed(2)}</p>
                    <div class="cart-item-quantity">
                        <button class="cart-qty-btn" data-action="decrease" data-item-id="${item.id}">-</button>
                        <span class="text-white">${item.quantity}</span>
                        <button class="cart-qty-btn" data-action="increase" data-item-id="${item.id}">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" data-item-id="${item.id}" aria-label="Remove item">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            `;
            cartItemsContainer.appendChild(cartItemEl);
        });
        
        // Attach event listeners to quantity buttons
        cartItemsContainer.querySelectorAll('.cart-qty-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = btn.dataset.action;
                const itemId = btn.dataset.itemId;
                const item = items.find(i => i.id === itemId);
                
                if (!item) return;
                
                const { updateQuantity } = await import('./cart.js');
                if (action === 'increase') {
                    await updateQuantity(itemId, item.quantity + 1);
                } else if (action === 'decrease' && item.quantity > 1) {
                    await updateQuantity(itemId, item.quantity - 1);
                }
            });
        });
        
        // Attach event listeners to remove buttons
        cartItemsContainer.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = btn.dataset.itemId;
                const { removeItem } = await import('./cart.js');
                await removeItem(itemId);
            });
        });
        
        if (cartSummary) cartSummary.classList.remove('hidden');
        if (checkoutBtn) checkoutBtn.classList.remove('hidden');
        
        if (cartSubtotalEl) cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (cartDiscountEl) cartDiscountEl.textContent = `-$${discount.toFixed(2)}`;
        if (cartTotalEl) cartTotalEl.textContent = `$${Math.max(0, subtotal - discount).toFixed(2)}`;
    }
    
    // Continue shopping closes cart
    if (continueShopping) {
        // Remove existing listeners
        const newContinueBtn = continueShopping.cloneNode(true);
        continueShopping.parentNode.replaceChild(newContinueBtn, continueShopping);
        
        newContinueBtn.addEventListener('click', () => {
            const rightSidebarCart = document.getElementById('right-sidebar-cart');
            const rightSidebarOverlay = document.getElementById('right-sidebar-overlay');
            if (rightSidebarCart) rightSidebarCart.classList.remove('open');
            if (rightSidebarOverlay) {
                rightSidebarOverlay.style.opacity = '0';
                setTimeout(() => {
                    rightSidebarOverlay.classList.add('hidden');
                }, 300);
            }
            document.body.style.overflow = '';
        });
    }
}

// Update cart count badge
export function updateCartCount(count) {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        if (count > 0) {
            cartCount.textContent = count;
            cartCount.classList.remove('hidden');
        } else {
            cartCount.classList.add('hidden');
        }
    }
}

// Global cart functions for backward compatibility (now handled by event listeners)
window.cartIncrease = async (cartItemId) => {
    const { updateQuantity } = await import('./cart.js');
    const item = window.cartItems?.find(i => i.id === cartItemId);
    if (item) {
        await updateQuantity(cartItemId, item.quantity + 1);
    }
};

window.cartDecrease = async (cartItemId) => {
    const { updateQuantity } = await import('./cart.js');
    const item = window.cartItems?.find(i => i.id === cartItemId);
    if (item && item.quantity > 1) {
        await updateQuantity(cartItemId, item.quantity - 1);
    }
};

window.cartRemove = async (cartItemId) => {
    const { removeItem } = await import('./cart.js');
    await removeItem(cartItemId);
};

