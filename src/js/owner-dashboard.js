// Owner Dashboard JavaScript
import { ownerLogin, checkOwnerAccess, getDashboardStats, getProducts, createProduct, updateProduct, deleteProduct, getOrders, updateOrderStatus, getSetting, setSetting } from './owner.js';

let currentTab = 'products';
let currentEditingProductId = null;
let currentProducts = [];
let currentOrders = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Development mode: bypass owner login and show dashboard directly
    // In production, re‑enable checkOwnerAccess + login flow.
    showDashboard();
    await loadDashboard();
    
    // Login handler (disabled in development)
    const loginBtn = document.getElementById('owner-login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            alert('Owner login is disabled in this development build.');
        });
    }
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Add product button
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            showProductForm();
        });
    }
    
    // Save settings
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async () => {
            const rate = document.getElementById('setting-stardust-rate')?.value;
            const bonus = document.getElementById('setting-checkin-bonus')?.value;
            
            await setSetting('stardust_rate', rate);
            await setSetting('checkin_bonus', bonus);
            alert('Settings saved');
        });
    }

    // Product modal handlers
    const productModalOverlay = document.getElementById('owner-product-modal-overlay');
    const productModalClose = document.getElementById('owner-product-modal-close');
    const productModalCancel = document.getElementById('owner-product-cancel');
    const productForm = document.getElementById('owner-product-form');
    if (productModalOverlay && productModalClose && productModalCancel && productForm) {
        productModalClose.addEventListener('click', hideProductModal);
        productModalCancel.addEventListener('click', hideProductModal);
        productModalOverlay.addEventListener('click', (e) => {
            if (e.target === productModalOverlay) hideProductModal();
        });

        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveProductFromForm();
        });
    }

    // Order detail modal handlers
    const orderModalOverlay = document.getElementById('owner-order-modal-overlay');
    const orderModalClose = document.getElementById('owner-order-modal-close');
    const orderModalCloseBtn = document.getElementById('owner-order-modal-close-btn');
    if (orderModalOverlay && orderModalClose && orderModalCloseBtn) {
        orderModalClose.addEventListener('click', hideOrderDetailModal);
        orderModalCloseBtn.addEventListener('click', hideOrderDetailModal);
        orderModalOverlay.addEventListener('click', (e) => {
            if (e.target === orderModalOverlay) hideOrderDetailModal();
        });
    }

    // Export buttons
    const exportProductsBtn = document.getElementById('export-products-btn');
    const exportOrdersBtn = document.getElementById('export-orders-btn');
    if (exportProductsBtn) {
        exportProductsBtn.addEventListener('click', exportProductsCsv);
    }
    if (exportOrdersBtn) {
        exportOrdersBtn.addEventListener('click', exportOrdersCsv);
    }
});

function showLogin() {
    document.getElementById('login-section')?.classList.remove('hidden');
    document.getElementById('dashboard-content')?.classList.add('hidden');
}

function showDashboard() {
    document.getElementById('login-section')?.classList.add('hidden');
    document.getElementById('dashboard-content')?.classList.remove('hidden');
}

async function loadDashboard() {
    const stats = await getDashboardStats();
    if (stats) {
        document.getElementById('stat-orders').textContent = stats.totalOrders;
        document.getElementById('stat-pending').textContent = stats.pendingOrders;
        document.getElementById('stat-revenue').textContent = `$${stats.totalRevenue.toFixed(2)}`;
        document.getElementById('stat-products').textContent = stats.totalProducts;
    }
    
    await loadProducts();
    await loadOrders();
    await loadSettings();
}

async function loadProducts() {
    const products = await getProducts();
    currentProducts = products || [];
    const container = document.getElementById('products-list');
    if (!container) return;
    
    container.innerHTML = '';
    currentProducts.forEach(product => {
        const productEl = document.createElement('div');
        productEl.className = 'glass-card rounded-lg p-4 flex justify-between items-center';
        productEl.innerHTML = `
            <div>
                <h3 class="font-bold text-white">${product.title}</h3>
                <p class="text-gray-400 text-sm">$${parseFloat(product.price).toFixed(2)} | ${product.zodiac || 'All'}</p>
                ${product.category ? `<p class="text-gray-500 text-xs mt-1">${product.category}</p>` : ''}
            </div>
            <div class="flex gap-2">
                <button onclick="window.editProduct('${product.id}')" class="text-blue-400 hover:text-blue-300">Edit</button>
                <button onclick="window.deleteProduct('${product.id}')" class="text-red-400 hover:text-red-300">Delete</button>
            </div>
        `;
        container.appendChild(productEl);
    });
}

async function loadOrders() {
    const orders = await getOrders();
    currentOrders = orders || [];
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    container.innerHTML = '';
    orders.forEach(order => {
        const orderEl = document.createElement('div');
        orderEl.className = 'glass-card rounded-lg p-4 cursor-pointer hover:bg-gray-900 transition-colors';
        orderEl.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-bold text-white">Order #${order.id.slice(0, 8)}</p>
                    <p class="text-gray-400 text-sm">$${parseFloat(order.total).toFixed(2)} | ${order.payment_method} | ${order.status}</p>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <select onchange="window.updateOrderStatus('${order.id}', this.value)" class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-sm">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                    <button type="button" class="text-xs text-gray-300 underline hover:text-white" onclick="window.showOrderDetail('${order.id}')">
                        View details
                    </button>
                </div>
            </div>
        `;
        container.appendChild(orderEl);
    });

    updateAnalyticsFromOrders(currentOrders);
}

async function loadSettings() {
    const rate = await getSetting('stardust_rate');
    const bonus = await getSetting('checkin_bonus');
    
    if (rate) document.getElementById('setting-stardust-rate').value = rate;
    if (bonus) document.getElementById('setting-checkin-bonus').value = bonus;
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('active', 'text-white', 'border-b-2', 'border-tan-500');
            btn.classList.remove('text-gray-400');
        } else {
            btn.classList.remove('active', 'text-white', 'border-b-2', 'border-tan-500');
            btn.classList.add('text-gray-400');
        }
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `tab-${tab}`) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
}

function showProductForm(product = null) {
    const overlay = document.getElementById('owner-product-modal-overlay');
    const modalTitle = document.getElementById('owner-product-modal-title');
    const idInput = document.getElementById('owner-product-id');
    const titleInput = document.getElementById('owner-product-title');
    const priceInput = document.getElementById('owner-product-price');
    const zodiacInput = document.getElementById('owner-product-zodiac');
    const categoryInput = document.getElementById('owner-product-category');
    const descInput = document.getElementById('owner-product-description');
    const imageInput = document.getElementById('owner-product-image-url');

    if (!overlay || !modalTitle || !idInput || !titleInput || !priceInput || !zodiacInput || !categoryInput || !descInput || !imageInput) {
        console.warn('Product modal elements not found.');
        return;
    }

    if (product) {
        currentEditingProductId = product.id;
        modalTitle.textContent = 'Edit Product';
        idInput.value = product.id || '';
        titleInput.value = product.title || '';
        priceInput.value = product.price != null ? product.price : '';
        zodiacInput.value = product.zodiac || '';
        categoryInput.value = product.category || '';
        descInput.value = product.description || '';
        imageInput.value = product.image_url || '';
    } else {
        currentEditingProductId = null;
        modalTitle.textContent = 'Add Product';
        idInput.value = '';
        titleInput.value = '';
        priceInput.value = '';
        zodiacInput.value = '';
        categoryInput.value = '';
        descInput.value = '';
        imageInput.value = '';
    }

    overlay.classList.remove('hidden');
}

function hideProductModal() {
    const overlay = document.getElementById('owner-product-modal-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

async function saveProductFromForm() {
    const idInput = document.getElementById('owner-product-id');
    const titleInput = document.getElementById('owner-product-title');
    const priceInput = document.getElementById('owner-product-price');
    const zodiacInput = document.getElementById('owner-product-zodiac');
    const categoryInput = document.getElementById('owner-product-category');
    const descInput = document.getElementById('owner-product-description');
    const imageInput = document.getElementById('owner-product-image-url');

    if (!titleInput || !priceInput) return;

    const title = titleInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (!title || isNaN(price)) {
        alert('Please enter a title and valid price.');
        return;
    }

    const productData = {
        title,
        price,
        zodiac: zodiacInput?.value || null,
        category: categoryInput?.value || null,
        description: descInput?.value || null,
        image_url: imageInput?.value || null
    };

    let success = false;

    if (currentEditingProductId || idInput?.value) {
        const productId = currentEditingProductId || idInput.value;
        const updated = await updateProduct(productId, productData);
        success = !!updated;
    } else {
        const created = await createProduct(productData);
        success = !!created;
    }

    if (!success) {
        alert('There was a problem saving this product. Please check your Supabase configuration.');
        return;
    }

    hideProductModal();
    await loadProducts();
}

function showOrderDetailModal(order) {
    const overlay = document.getElementById('owner-order-modal-overlay');
    const body = document.getElementById('owner-order-modal-body');
    if (!overlay || !body) return;

    const createdAt = order.created_at ? new Date(order.created_at) : null;

    body.innerHTML = `
        <div>
            <p class="text-xs text-gray-400 mb-1">Order ID</p>
            <p class="text-sm font-mono break-all">${order.id}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
                <p class="text-xs text-gray-400 mb-1">Total</p>
                <p class="text-sm">$${parseFloat(order.total || 0).toFixed(2)}</p>
            </div>
            <div>
                <p class="text-xs text-gray-400 mb-1">Payment Method</p>
                <p class="text-sm">${order.payment_method || 'N/A'}</p>
            </div>
            <div>
                <p class="text-xs text-gray-400 mb-1">Status</p>
                <p class="text-sm capitalize">${order.status || 'unknown'}</p>
            </div>
            <div>
                <p class="text-xs text-gray-400 mb-1">Created</p>
                <p class="text-sm">${createdAt ? createdAt.toLocaleString() : 'N/A'}</p>
            </div>
        </div>
        <div>
            <p class="text-xs text-gray-400 mb-1">User ID</p>
            <p class="text-sm font-mono break-all">${order.user_id || 'N/A'}</p>
        </div>
        <div class="mt-3 text-xs text-gray-500">
            Line item breakdown is not stored separately in this demo build.
        </div>
    `;

    overlay.classList.remove('hidden');
}

function hideOrderDetailModal() {
    const overlay = document.getElementById('owner-order-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function updateAnalyticsFromOrders(orders) {
    const summaryEl = document.getElementById('analytics-summary');
    if (!summaryEl || !orders || orders.length === 0) {
        if (summaryEl) summaryEl.textContent = 'No orders yet. Analytics will appear here once orders are available.';
        return;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let totalRevenue = 0;
    let last7Revenue = 0;
    let pendingCount = 0;

    orders.forEach(order => {
        const total = parseFloat(order.total || 0) || 0;
        totalRevenue += total;

        const createdAt = order.created_at ? new Date(order.created_at) : null;
        if (createdAt && createdAt >= sevenDaysAgo) {
            last7Revenue += total;
        }

        if (order.status === 'pending') pendingCount += 1;
    });

    summaryEl.textContent =
        `Revenue (all time): $${totalRevenue.toFixed(2)} · ` +
        `Last 7 days: $${last7Revenue.toFixed(2)} · ` +
        `Pending orders: ${pendingCount}`;
}

function exportCsv(filename, rows) {
    if (!rows || rows.length === 0) {
        alert('No data to export.');
        return;
    }

    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(','),
        ...rows.map(row =>
            headers.map(h => {
                const val = row[h] != null ? String(row[h]) : '';
                // Escape quotes and commas
                const escaped = val.replace(/\"/g, '\"\"');
                return `"${escaped}"`;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportProductsCsv() {
    if (!currentProducts || currentProducts.length === 0) {
        alert('No products to export.');
        return;
    }

    const rows = currentProducts.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        zodiac: p.zodiac || '',
        category: p.category || '',
        description: p.description || '',
        image_url: p.image_url || ''
    }));

    exportCsv('products.csv', rows);
}

function exportOrdersCsv() {
    if (!currentOrders || currentOrders.length === 0) {
        alert('No orders to export.');
        return;
    }

    const rows = currentOrders.map(o => ({
        id: o.id,
        total: o.total,
        status: o.status,
        payment_method: o.payment_method || '',
        user_id: o.user_id || '',
        created_at: o.created_at || ''
    }));

    exportCsv('orders.csv', rows);
}

window.editProduct = async (productId) => {
    const product = await getProductById(productId);
    if (product) {
        showProductForm(product);
    }
};

window.deleteProduct = async (productId) => {
    if (confirm('Are you sure you want to delete this product?')) {
        const result = await deleteProduct(productId);
        if (result) {
            await loadProducts();
        }
    }
};

window.updateOrderStatus = async (orderId, status) => {
    await updateOrderStatus(orderId, status);
    await loadOrders();
};

window.showOrderDetail = (orderId) => {
    const order = currentOrders.find(o => o.id === orderId);
    if (order) {
        showOrderDetailModal(order);
    }
};

