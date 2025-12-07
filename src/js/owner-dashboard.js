// Owner Dashboard JavaScript
import { ownerLogin, checkOwnerAccess, getDashboardStats, createProduct, updateProduct, deleteProduct, getOrders, updateOrderStatus, getSetting, setSetting } from './owner.js';
import { getProducts } from './api.js';
import { showBulkUploadModal, hideBulkUploadModal, saveBulkProducts } from './bulk-upload.js';

let currentTab = 'products';
let currentEditingProductId = null;
let currentProducts = [];
let currentOrders = [];
let cropper = null;
let currentBrightness = 100;
let currentContrast = 100;
let currentSaturation = 100;

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
    
    // Quick add product button
    const quickAddBtn = document.getElementById('quick-add-product');
    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', () => {
            showProductForm();
        });
    }
    
    // Bulk upload button
    const bulkUploadBtn = document.getElementById('bulk-upload-btn');
    if (bulkUploadBtn) {
        bulkUploadBtn.addEventListener('click', () => {
            showBulkUploadModal();
        });
    }
    
    // Make loadProducts available globally for bulk upload
    window.loadProducts = loadProducts;
    
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
    const fileInput = document.getElementById('owner-product-file');
    const uploadArea = document.getElementById('upload-area');
    const removeMediaBtn = document.getElementById('remove-media');
    const brightnessBtn = document.getElementById('brightness-btn');
    const brightnessSlider = document.getElementById('brightness-slider');
    const rotateBtn = document.getElementById('rotate-btn');
    
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
    
    // File upload handlers
    if (fileInput && uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('border-tan-500');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('border-tan-500');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('border-tan-500');
            const file = e.dataTransfer.files[0];
            if (file) handleFileUpload(file);
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFileUpload(file);
        });
    }
    
    if (removeMediaBtn) {
        removeMediaBtn.addEventListener('click', () => {
            hideMediaPreview();
            const imageUrlInput = document.getElementById('owner-product-image-url');
            if (imageUrlInput) imageUrlInput.value = '';
        });
    }
    
    if (brightnessBtn) {
        brightnessBtn.addEventListener('click', () => {
            const brightnessControl = document.getElementById('brightness-control');
            if (brightnessControl) {
                brightnessControl.classList.toggle('hidden');
            }
        });
    }
    
    // Modern filter controls with visual feedback
    if (brightnessSlider) {
        brightnessSlider.addEventListener('input', (e) => {
            currentBrightness = e.target.value;
            updateImageFilters();
            // Update visual indicator
            const brightnessValue = document.getElementById('brightness-value');
            if (brightnessValue) {
                brightnessValue.textContent = Math.round(currentBrightness);
                // Update slider background gradient
                const percent = (currentBrightness / 200) * 100;
                e.target.style.background = `linear-gradient(to right, #1f2937 0%, #1f2937 ${percent}%, #D2B48C ${percent}%, #D2B48C 100%)`;
            }
        });
    }
    
    const contrastSlider = document.getElementById('contrast-slider');
    if (contrastSlider) {
        contrastSlider.addEventListener('input', (e) => {
            currentContrast = e.target.value;
            updateImageFilters();
            const contrastValue = document.getElementById('contrast-value');
            if (contrastValue) {
                contrastValue.textContent = Math.round(currentContrast);
                const percent = (currentContrast / 200) * 100;
                e.target.style.background = `linear-gradient(to right, #1f2937 0%, #1f2937 ${percent}%, #D2B48C ${percent}%, #D2B48C 100%)`;
            }
        });
    }
    
    const saturationSlider = document.getElementById('saturation-slider');
    if (saturationSlider) {
        saturationSlider.addEventListener('input', (e) => {
            currentSaturation = e.target.value;
            updateImageFilters();
            const saturationValue = document.getElementById('saturation-value');
            if (saturationValue) {
                saturationValue.textContent = Math.round(currentSaturation);
                const percent = (currentSaturation / 200) * 100;
                e.target.style.background = `linear-gradient(to right, #1f2937 0%, #1f2937 ${percent}%, #D2B48C ${percent}%, #D2B48C 100%)`;
            }
        });
    }
    
    // Modern filter button handlers - show all filters at once for better UX
    const filterControls = document.getElementById('filter-controls');
    if (filterControls) {
        // Show all filter controls together for a modern experience
        const showAllFilters = () => {
            filterControls.classList.remove('hidden');
            document.getElementById('brightness-control')?.classList.remove('hidden');
            document.getElementById('contrast-control')?.classList.remove('hidden');
            document.getElementById('saturation-control')?.classList.remove('hidden');
        };
        
        // When any transform tool is clicked, show filters
        [cropBtn, rotateBtn, resizeBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    // Remove active state from all
                    document.querySelectorAll('.edit-tool-btn').forEach(b => b.classList.remove('active'));
                    // Add active state to clicked button
                    btn.classList.add('active');
                });
            }
        });
        
        // Show filters when image is loaded
        const checkAndShowFilters = () => {
            if (currentMediaDataUrl && currentMediaType === 'image') {
                showAllFilters();
            }
        };
        
        // Check on media preview
        const originalShowMediaPreview = showMediaPreview;
        showMediaPreview = function(...args) {
            originalShowMediaPreview.apply(this, args);
            setTimeout(checkAndShowFilters, 100);
        };
    }
    
    function updateImageFilters() {
        const previewImage = document.getElementById('preview-image');
        if (previewImage) {
            previewImage.style.filter = `brightness(${currentBrightness}%) contrast(${currentContrast}%) saturate(${currentSaturation}%)`;
        }
    }
    
    // Modern resize controls
    const resizeBtn = document.getElementById('resize-btn');
    const resizeControls = document.getElementById('resize-controls');
    const applyResizeBtn = document.getElementById('apply-resize');
    
    if (resizeBtn) {
        resizeBtn.addEventListener('click', () => {
            if (resizeControls) {
                resizeControls.classList.toggle('hidden');
                // Hide filter controls when resize is shown
                if (!resizeControls.classList.contains('hidden')) {
                    filterControls?.classList.add('hidden');
                } else {
                    filterControls?.classList.remove('hidden');
                }
            }
        });
    }
    
    if (applyResizeBtn) {
        applyResizeBtn.addEventListener('click', async () => {
            const width = document.getElementById('resize-width')?.value;
            const height = document.getElementById('resize-height')?.value;
            const previewImage = document.getElementById('preview-image');
            
            if (!previewImage || !currentMediaDataUrl) return;
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                const newWidth = width ? parseInt(width) : img.width;
                const newHeight = height ? parseInt(height) : img.height;
                
                canvas.width = newWidth;
                canvas.height = newHeight;
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                currentMediaDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                showMediaPreview(currentMediaDataUrl, 'uploaded');
                if (resizeControls) resizeControls.classList.add('hidden');
            };
            
            img.src = currentMediaDataUrl;
        });
    }
    
    if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
            const previewImage = document.getElementById('preview-image');
            if (previewImage && currentMediaDataUrl) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                    canvas.width = img.height;
                    canvas.height = img.width;
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate(Math.PI / 2);
                    ctx.drawImage(img, -img.width / 2, -img.height / 2);
                    
                    currentMediaDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    showMediaPreview(currentMediaDataUrl, 'uploaded');
                };
                
                img.src = currentMediaDataUrl;
            }
        });
    }
    
    // Crop functionality - optimized for mobile
    const cropBtn = document.getElementById('crop-btn');
    const cropModal = document.getElementById('crop-modal-overlay');
    const cropImage = document.getElementById('crop-image');
    const cropApply = document.getElementById('crop-apply');
    const cropCancel = document.getElementById('crop-cancel');
    const cropModalClose = document.getElementById('crop-modal-close');
    
    if (cropBtn) {
        cropBtn.addEventListener('click', () => {
            const previewImage = document.getElementById('preview-image');
            if (previewImage && currentMediaDataUrl && currentMediaType === 'image') {
                if (cropModal && cropImage) {
                    cropImage.src = currentMediaDataUrl;
                    cropModal.classList.remove('hidden');
                    
                    // Initialize cropper with mobile-optimized settings
                    if (cropper) {
                        cropper.destroy();
                    }
                    const isMobile = window.innerWidth <= 768;
                    cropper = new Cropper(cropImage, {
                        aspectRatio: 1,
                        viewMode: 1,
                        autoCropArea: 0.8,
                        responsive: true,
                        guides: true,
                        center: true,
                        highlight: true,
                        cropBoxMovable: true,
                        cropBoxResizable: true,
                        toggleDragModeOnDblclick: false,
                        // Mobile optimizations
                        dragMode: isMobile ? 'move' : 'crop',
                        minCropBoxWidth: isMobile ? 100 : 200,
                        minCropBoxHeight: isMobile ? 100 : 200,
                        touchDragZoom: true,
                        wheelZoomRatio: 0.1,
                    });
                }
            }
        });
    }
    
    if (cropApply) {
        cropApply.addEventListener('click', () => {
            if (cropper) {
                const canvas = cropper.getCroppedCanvas({
                    width: 800,
                    height: 800,
                    imageSmoothingEnabled: true,
                    imageSmoothingQuality: 'high',
                });
                
                currentMediaDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                showMediaPreview(currentMediaDataUrl, 'uploaded');
                
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }
                if (cropModal) cropModal.classList.add('hidden');
            }
        });
    }
    
    if (cropCancel || cropModalClose) {
        [cropCancel, cropModalClose].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    if (cropper) {
                        cropper.destroy();
                        cropper = null;
                    }
                    if (cropModal) cropModal.classList.add('hidden');
                });
            }
        });
    }
    
    // Zodiac checkbox handlers
    document.querySelectorAll('.zodiac-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            // If "All" is checked, uncheck others
            if (e.target.dataset.zodiac === 'all' && e.target.checked) {
                document.querySelectorAll('.zodiac-checkbox').forEach(cb => {
                    if (cb !== e.target) cb.checked = false;
                });
            } else if (e.target.checked) {
                // If any other is checked, uncheck "All"
                const allCheckbox = document.querySelector('.zodiac-checkbox[data-zodiac="all"]');
                if (allCheckbox) allCheckbox.checked = false;
            }
            updateZodiacInput();
        });
    });

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
        const ordersEl = document.getElementById('stat-orders');
        const pendingEl = document.getElementById('stat-pending');
        const revenueEl = document.getElementById('stat-revenue');
        const productsEl = document.getElementById('stat-products');
        
        if (ordersEl) ordersEl.textContent = stats.totalOrders;
        if (pendingEl) pendingEl.textContent = stats.pendingOrders;
        if (revenueEl) revenueEl.textContent = `$${stats.totalRevenue.toFixed(2)}`;
        if (productsEl) productsEl.textContent = stats.totalProducts;
    }
    
    await loadProducts();
    await loadOrders();
    await loadSettings();
    
    // Initialize widgets after data is loaded
    updateRecentOrdersWidget();
    updateOrderStatusWidget();
    updateRevenueChart();
}

async function loadProducts() {
    const products = await getProducts();
    currentProducts = products || [];
    const container = document.getElementById('products-list');
    if (!container) return;
    
    container.innerHTML = '';
    if (currentProducts.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No products yet. Click "Add Product" to get started.</p>';
    } else {
        currentProducts.forEach(product => {
            const productEl = document.createElement('div');
            productEl.className = 'glass-card rounded p-3 flex justify-between items-center';
            productEl.innerHTML = `
                <div class="flex-1">
                    <h3 class="font-semibold text-white text-sm">${product.title}</h3>
                    <p class="text-gray-400 text-xs">$${parseFloat(product.price).toFixed(2)} | ${product.zodiac || 'All'}</p>
                    ${product.category ? `<p class="text-gray-500 text-xs mt-0.5">${product.category}</p>` : ''}
                </div>
                <div class="flex gap-2 ml-3">
                    <button onclick="window.editProduct('${product.id}')" class="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                    <button onclick="window.deleteProduct('${product.id}')" class="text-red-400 hover:text-red-300 text-xs">Delete</button>
                </div>
            `;
            container.appendChild(productEl);
        });
    }
    
}

async function loadOrders() {
    const orders = await getOrders();
    currentOrders = orders || [];
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    container.innerHTML = '';
    if (currentOrders.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No orders yet.</p>';
    } else {
        currentOrders.forEach(order => {
            const orderEl = document.createElement('div');
            orderEl.className = 'glass-card rounded p-3 cursor-pointer hover:bg-gray-900 transition-colors';
            orderEl.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex-1">
                        <p class="font-semibold text-white text-sm">Order #${order.id.slice(0, 8)}</p>
                        <p class="text-gray-400 text-xs">$${parseFloat(order.total).toFixed(2)} | ${order.payment_method} | ${order.status}</p>
                    </div>
                    <div class="flex flex-col items-end gap-1.5 ml-3">
                        <select onchange="window.updateOrderStatus('${order.id}', this.value)" class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                        <button type="button" class="text-xs text-gray-300 underline hover:text-white" onclick="window.showOrderDetail('${order.id}')">
                            Details
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(orderEl);
        });
    }

    updateAnalyticsFromOrders(currentOrders);
    updateRecentOrdersWidget();
    updateOrderStatusWidget();
    updateRevenueChart();
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

// Make switchTab available globally for onclick handlers
window.switchTab = switchTab;

let currentMediaFile = null;
let currentMediaDataUrl = null;
let currentMediaType = null; // 'image' or 'video'

function showProductForm(product = null) {
    const overlay = document.getElementById('owner-product-modal-overlay');
    const modalTitle = document.getElementById('owner-product-modal-title');
    const idInput = document.getElementById('owner-product-id');
    const titleInput = document.getElementById('owner-product-title');
    const priceInput = document.getElementById('owner-product-price');
    const zodiacInput = document.getElementById('owner-product-zodiac');
    const categoryInput = document.getElementById('owner-product-category');
    const descInput = document.getElementById('owner-product-description');
    const fileInput = document.getElementById('owner-product-file');
    const uploadArea = document.getElementById('upload-area');
    const previewContainer = document.getElementById('preview-container');
    const uploadPlaceholder = document.getElementById('upload-placeholder');

    if (!overlay || !modalTitle || !idInput || !titleInput || !priceInput || !zodiacInput || !categoryInput || !descInput) {
        console.warn('Product modal elements not found.');
        return;
    }

    // Reset media state
    currentMediaFile = null;
    currentMediaDataUrl = null;
    currentMediaType = null;
    currentBrightness = 100;
    currentContrast = 100;
    currentSaturation = 100;

    if (product) {
        currentEditingProductId = product.id;
        modalTitle.textContent = 'Edit Product';
        idInput.value = product.id || '';
        titleInput.value = product.title || '';
        priceInput.value = product.price != null ? product.price : '';
        // Handle multiple zodiacs (comma-separated or single value)
        const zodiacs = (product.zodiac || '').split(',').map(z => z.trim()).filter(z => z);
        zodiacs.forEach(zodiac => {
            const checkbox = document.querySelector(`.zodiac-checkbox[data-zodiac="${zodiac}"]`);
            if (checkbox) checkbox.checked = true;
        });
        updateZodiacInput();
        
        categoryInput.value = product.category || '';
        descInput.value = product.description || '';
        
        // Show preview if image_url exists
        if (product.image_url) {
            showMediaPreview(product.image_url, product.image_url.startsWith('data:') ? 'uploaded' : 'url');
        } else {
            hideMediaPreview();
        }
    } else {
        currentEditingProductId = null;
        modalTitle.textContent = 'Add Product';
        idInput.value = '';
        titleInput.value = '';
        priceInput.value = '';
        zodiacInput.value = '';
        categoryInput.value = '';
        descInput.value = '';
        hideMediaPreview();
    }

    overlay.classList.remove('hidden');
}

function hideMediaPreview() {
    const previewContainer = document.getElementById('preview-container');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const fileInput = document.getElementById('owner-product-file');
    
    if (previewContainer) previewContainer.classList.add('hidden');
    if (uploadPlaceholder) uploadPlaceholder.classList.remove('hidden');
    if (fileInput) fileInput.value = '';
    
    currentMediaFile = null;
    currentMediaDataUrl = null;
    currentMediaType = null;
}

function showMediaPreview(src, type = 'uploaded') {
    const previewContainer = document.getElementById('preview-container');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const mediaPreview = document.getElementById('media-preview');
    const filterControls = document.getElementById('filter-controls');
    
    if (!previewContainer || !uploadPlaceholder || !mediaPreview) return;
    
    uploadPlaceholder.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    
    if (type === 'uploaded' && currentMediaType === 'image') {
        mediaPreview.innerHTML = `<img src="${src}" id="preview-image" class="max-w-full max-h-full object-contain">`;
        updateImageFilters();
    } else if (type === 'uploaded' && currentMediaType === 'video') {
        mediaPreview.innerHTML = `<video src="${src}" id="preview-video" class="max-w-full max-h-full" controls></video>`;
    } else {
        // URL or data URL
        if (src.match(/\.(mp4|mov|webm|ogg)$/i) || src.startsWith('data:video')) {
            mediaPreview.innerHTML = `<video src="${src}" id="preview-video" class="max-w-full max-h-full" controls></video>`;
            currentMediaType = 'video';
        } else {
            mediaPreview.innerHTML = `<img src="${src}" id="preview-image" class="max-w-full max-h-full object-contain">`;
            currentMediaType = 'image';
            updateImageFilters();
        }
    }
    
    if (filterControls) {
        if (currentMediaType === 'image') {
            filterControls.classList.remove('hidden');
        } else {
            filterControls.classList.add('hidden');
        }
    }
}

function handleFileUpload(file) {
    if (!file) return;
    
    // Mobile-optimized file size limits
    const isMobile = window.innerWidth <= 768;
    const maxSize = isMobile ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB on mobile, 10MB on desktop
    
    if (file.size > maxSize) {
        alert(`File size must be less than ${isMobile ? '5MB' : '10MB'}`);
        return;
    }
    
    currentMediaFile = file;
    currentMediaType = file.type.startsWith('image/') ? 'image' : 'video';
    
    // Optimize image for mobile if it's an image
    if (currentMediaType === 'image' && isMobile) {
        optimizeImageForMobile(file).then(optimizedDataUrl => {
            currentMediaDataUrl = optimizedDataUrl;
            showMediaPreview(optimizedDataUrl, 'uploaded');
        });
    } else {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentMediaDataUrl = e.target.result;
            showMediaPreview(currentMediaDataUrl, 'uploaded');
        };
        reader.readAsDataURL(file);
    }
}

// Optimize images for mobile to reduce file size and improve performance
function optimizeImageForMobile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate optimal dimensions for mobile (max 1200px width)
                const maxWidth = 1200;
                const maxHeight = 1200;
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Use lower quality for mobile to reduce file size
                const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(optimizedDataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
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

    if (!titleInput || !priceInput) return;

    const title = titleInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (!title || isNaN(price)) {
        alert('Please enter a title and valid price.');
        return;
    }

    // Require image upload
    if (!currentMediaDataUrl) {
        alert('Please upload an image or video for this product.');
        return;
    }

    // Get selected zodiacs (comma-separated)
    updateZodiacInput();
    const zodiacs = zodiacInput?.value || '';

    const productData = {
        title,
        price,
        zodiac: zodiacs || null,
        category: categoryInput?.value || null,
        description: descInput?.value || null,
        image_url: currentMediaDataUrl
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
    
    // Trigger main site to reload products
    if (typeof window !== 'undefined' && window.parent !== window) {
        // If in iframe, notify parent
        window.parent.postMessage({ type: 'products-updated' }, '*');
    }
    
    // Dispatch custom event for main site to listen
    window.dispatchEvent(new CustomEvent('products-updated'));
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

    summaryEl.innerHTML = `
        <div class="text-xs space-y-1">
            <div class="flex justify-between"><span class="text-gray-400">All Time:</span><span class="text-white font-semibold">$${totalRevenue.toFixed(2)}</span></div>
            <div class="flex justify-between"><span class="text-gray-400">Last 7 Days:</span><span class="text-white font-semibold">$${last7Revenue.toFixed(2)}</span></div>
            <div class="flex justify-between"><span class="text-gray-400">Pending:</span><span class="text-yellow-500 font-semibold">${pendingCount}</span></div>
        </div>
    `;
}

function updateRecentOrdersWidget() {
    const widget = document.getElementById('recent-orders-widget');
    if (!widget) return;
    
    const recentOrders = currentOrders.slice(0, 5);
    if (recentOrders.length === 0) {
        widget.innerHTML = '<p class="text-gray-500 text-xs">No orders yet</p>';
        return;
    }
    
    widget.innerHTML = recentOrders.map(order => `
        <div class="flex justify-between items-center text-xs">
            <div>
                <span class="text-white font-semibold">#${order.id.slice(0, 6)}</span>
                <span class="text-gray-400 ml-2">$${parseFloat(order.total || 0).toFixed(2)}</span>
            </div>
            <span class="text-gray-500 capitalize">${order.status || 'pending'}</span>
        </div>
    `).join('');
}


function updateOrderStatusWidget() {
    const statuses = {
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0
    };
    
    currentOrders.forEach(order => {
        const status = order.status || 'pending';
        if (statuses.hasOwnProperty(status)) {
            statuses[status]++;
        }
    });
    
    document.getElementById('status-pending').textContent = statuses.pending;
    document.getElementById('status-processing').textContent = statuses.processing;
    document.getElementById('status-shipped').textContent = statuses.shipped;
    document.getElementById('status-delivered').textContent = statuses.delivered;
}

function updateRevenueChart() {
    const chartWidget = document.getElementById('revenue-chart-widget');
    const summaryEl = document.getElementById('revenue-chart-summary');
    if (!chartWidget || !summaryEl) return;
    
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        days.push(date);
    }
    
    const revenueByDay = {};
    currentOrders.forEach(order => {
        if (order.created_at) {
            const orderDate = new Date(order.created_at);
            const dayKey = orderDate.toDateString();
            if (!revenueByDay[dayKey]) {
                revenueByDay[dayKey] = 0;
            }
            revenueByDay[dayKey] += parseFloat(order.total || 0);
        }
    });
    
    const maxRevenue = Math.max(...Object.values(revenueByDay), 1);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    chartWidget.innerHTML = days.map((day, index) => {
        const dayKey = day.toDateString();
        const revenue = revenueByDay[dayKey] || 0;
        const height = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
        const dayName = dayNames[day.getDay()];
        
        return `
            <div class="text-gray-500 text-xs text-center flex flex-col items-center">
                <div class="bg-green-500 rounded-t w-8 mb-1 transition-all" style="height: ${Math.max(height, 4)}px; min-height: 4px;"></div>
                <div>${dayName}</div>
                <div class="text-gray-600 text-xs">$${revenue.toFixed(0)}</div>
            </div>
        `;
    }).join('');
    
    const last7Revenue = Object.values(revenueByDay).reduce((sum, val) => sum + val, 0);
    summaryEl.textContent = last7Revenue > 0 ? `Total: $${last7Revenue.toFixed(2)}` : 'No data available';
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
    const { getProductById } = await import('./api.js');
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

