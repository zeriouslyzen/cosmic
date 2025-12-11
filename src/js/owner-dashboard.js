// Owner Dashboard JavaScript
import { ownerLogin, checkOwnerAccess, getDashboardStats, createProduct, updateProduct, deleteProduct, getOrders, updateOrderStatus, getSetting, setSetting } from './owner.js';
import { getProducts } from './api.js';
import { showBulkUploadModal, hideBulkUploadModal, saveBulkProducts } from './bulk-upload.js';

let currentSection = 'my-site';
let currentEditingProductId = null;
let currentProducts = [];
let currentOrders = [];
let allOrders = []; // Store all orders for filtering
let currentOrderFilter = 'all';
let currentMessageFilter = 'all';
let currentMessages = [];
let cropper = null;
let currentBrightness = 100;
let currentContrast = 100;
let currentSaturation = 100;

// Swipe navigation state
let touchStartX = 0;
let touchEndX = 0;
let currentSectionIndex = 0;
const sections = ['my-site', 'orders', 'messages', 'settings'];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - Initializing dashboard...');
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
        debugInfo.style.display = 'block';
        debugInfo.textContent = 'JS Loading...';
    }
    
    try {
        showDashboard();
        if (debugInfo) debugInfo.textContent = 'Loading data...';
        await loadDashboard();
        
        // Initialize navigation
        initNavigation();
        initSwipeGestures();
        
        if (debugInfo) {
            debugInfo.textContent = 'Dashboard Ready!';
            setTimeout(() => debugInfo.style.display = 'none', 2000);
        }
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        if (debugInfo) {
            debugInfo.textContent = 'ERROR: ' + error.message;
            debugInfo.style.background = 'red';
        }
        alert('Error loading dashboard. Please check the console for details.');
    }
    
    // Post Item button (center nav button)
    const postItemBtn = document.getElementById('post-item-btn');
    if (postItemBtn) {
        postItemBtn.addEventListener('click', () => {
            showProductForm();
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
            const whatnotUsername = document.getElementById('setting-whatnot-username')?.value;
            const liveSchedule = document.getElementById('setting-live-schedule')?.value;
            const whatnotUrl = document.getElementById('setting-whatnot-url')?.value;
            const emailNotifications = document.getElementById('setting-email-notifications')?.checked;
            const smsNotifications = document.getElementById('setting-sms-notifications')?.checked;
            const liveStatus = document.getElementById('setting-live-status')?.checked;
            const defaultShipping = document.getElementById('setting-default-shipping')?.value;
            const processingDays = document.getElementById('setting-processing-days')?.value;
            const autoProcess = document.getElementById('setting-auto-process')?.checked;
            const confirmationEmail = document.getElementById('setting-confirmation-email')?.value;
            const shippingEmail = document.getElementById('setting-shipping-email')?.value;
            const sendOrderUpdates = document.getElementById('setting-send-order-updates')?.checked;
            const paymentStripe = document.getElementById('setting-payment-stripe')?.checked;
            const paymentVenmo = document.getElementById('setting-payment-venmo')?.checked;
            const paymentCrypto = document.getElementById('setting-payment-crypto')?.checked;
            const refundDays = document.getElementById('setting-refund-days')?.value;
            const newOrderAlerts = document.getElementById('setting-new-order-alerts')?.checked;
            
            await setSetting('stardust_rate', rate);
            await setSetting('checkin_bonus', bonus);
            await setSetting('whatnot_username', whatnotUsername);
            await setSetting('live_schedule', liveSchedule);
            await setSetting('whatnot_url', whatnotUrl);
            await setSetting('email_notifications', emailNotifications);
            await setSetting('sms_notifications', smsNotifications);
            await setSetting('live_status', liveStatus);
            await setSetting('default_shipping', defaultShipping);
            await setSetting('processing_days', processingDays);
            await setSetting('auto_process', autoProcess);
            await setSetting('confirmation_email', confirmationEmail);
            await setSetting('shipping_email', shippingEmail);
            await setSetting('send_order_updates', sendOrderUpdates);
            await setSetting('payment_stripe', paymentStripe);
            await setSetting('payment_venmo', paymentVenmo);
            await setSetting('payment_crypto', paymentCrypto);
            await setSetting('refund_days', refundDays);
            await setSetting('new_order_alerts', newOrderAlerts);
            
            // Notify main site of live status change
            window.dispatchEvent(new CustomEvent('live-status-updated', { detail: { isLive: liveStatus } }));
            
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
        uploadArea.addEventListener('click', () => {
            // Stop camera if active
            stopCamera();
            const cameraContainer = document.getElementById('camera-preview-container');
            if (cameraContainer) cameraContainer.classList.add('hidden');
            const uploadPlaceholder = document.getElementById('upload-placeholder');
            if (uploadPlaceholder) uploadPlaceholder.classList.remove('hidden');
            fileInput.click();
        });
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('border-[#D2B48C]');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('border-[#D2B48C]');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('border-[#D2B48C]');
            stopCamera();
            const file = e.dataTransfer.files[0];
            if (file) handleFileUpload(file);
        });
        
        fileInput.addEventListener('change', (e) => {
            stopCamera();
            const file = e.target.files[0];
            if (file) handleFileUpload(file);
        });
    }
    
    // Camera controls
    const captureBtn = document.getElementById('capture-photo-btn');
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    const closeCameraBtn = document.getElementById('close-camera-btn');
    
    if (captureBtn) {
        captureBtn.addEventListener('click', capturePhoto);
    }
    
    if (switchCameraBtn) {
        switchCameraBtn.addEventListener('click', switchCamera);
    }
    
    if (closeCameraBtn) {
        closeCameraBtn.addEventListener('click', () => {
            stopCamera();
            const cameraContainer = document.getElementById('camera-preview-container');
            if (cameraContainer) cameraContainer.classList.add('hidden');
            const uploadPlaceholder = document.getElementById('upload-placeholder');
            if (uploadPlaceholder) uploadPlaceholder.classList.remove('hidden');
        });
    }
    
    if (removeMediaBtn) {
        removeMediaBtn.addEventListener('click', () => {
            hideMediaPreview();
            // Restart camera if this is a new product
            if (!currentEditingProductId) {
                setTimeout(() => {
                    startCamera();
                }, 100);
            }
        });
    }
    
    // Filter controls
    function updateImageFilters() {
        const previewImage = document.getElementById('preview-image');
        if (previewImage) {
            previewImage.style.filter = `brightness(${currentBrightness}%) contrast(${currentContrast}%) saturate(${currentSaturation}%)`;
        }
    }
    
    if (brightnessSlider) {
        brightnessSlider.addEventListener('input', (e) => {
            currentBrightness = e.target.value;
            updateImageFilters();
            const brightnessValue = document.getElementById('brightness-value');
            if (brightnessValue) {
                brightnessValue.textContent = Math.round(currentBrightness);
                const percent = (currentBrightness / 200) * 100;
                e.target.style.background = `linear-gradient(to right, #e5e5e5 0%, #e5e5e5 ${percent}%, #D2B48C ${percent}%, #D2B48C 100%)`;
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
                e.target.style.background = `linear-gradient(to right, #e5e5e5 0%, #e5e5e5 ${percent}%, #D2B48C ${percent}%, #D2B48C 100%)`;
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
                e.target.style.background = `linear-gradient(to right, #e5e5e5 0%, #e5e5e5 ${percent}%, #D2B48C ${percent}%, #D2B48C 100%)`;
            }
        });
    }
    
    // Show all filter controls when image is loaded
    const filterControls = document.getElementById('filter-controls');
    if (filterControls) {
        const showAllFilters = () => {
            filterControls.classList.remove('hidden');
            document.getElementById('brightness-control')?.classList.remove('hidden');
            document.getElementById('contrast-control')?.classList.remove('hidden');
            document.getElementById('saturation-control')?.classList.remove('hidden');
        };
        
        const checkAndShowFilters = () => {
            if (currentMediaDataUrl && currentMediaType === 'image') {
                showAllFilters();
            }
        };
        
        // Store original showMediaPreview for later use
        window._checkAndShowFilters = checkAndShowFilters;
    }
    
    // Resize controls
    const resizeBtn = document.getElementById('resize-btn');
    const resizeControls = document.getElementById('resize-controls');
    const applyResizeBtn = document.getElementById('apply-resize');
    
    if (resizeBtn) {
        resizeBtn.addEventListener('click', () => {
            if (resizeControls) {
                resizeControls.classList.toggle('hidden');
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
    
    // Crop functionality
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
            if (e.target.dataset.zodiac === 'all' && e.target.checked) {
                document.querySelectorAll('.zodiac-checkbox').forEach(cb => {
                    if (cb !== e.target) cb.checked = false;
                });
            } else if (e.target.checked) {
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
    const exportOrdersBtn = document.getElementById('export-orders-btn');
    if (exportOrdersBtn) {
        exportOrdersBtn.addEventListener('click', exportOrdersCsv);
    }
    
    // Order filter buttons
    document.querySelectorAll('.order-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.order-filter-btn').forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            currentOrderFilter = btn.dataset.filter;
            filterOrders();
        });
    });
    
    // Message filter buttons
    document.querySelectorAll('.message-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.message-filter-btn').forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            currentMessageFilter = btn.dataset.filter;
            filterMessages();
        });
    });
    
    // Mark all messages as read
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            currentMessages.forEach(msg => msg.read = true);
            saveMessages();
            loadMessages();
        });
    }
    
    // Message reply modal
    const messageReplyModal = document.getElementById('message-reply-modal-overlay');
    const messageReplyClose = document.getElementById('message-reply-close');
    const messageReplyCancel = document.getElementById('message-reply-cancel');
    const messageReplySend = document.getElementById('message-reply-send');
    
    if (messageReplyClose) messageReplyClose.addEventListener('click', () => {
        if (messageReplyModal) messageReplyModal.classList.add('hidden');
    });
    if (messageReplyCancel) messageReplyCancel.addEventListener('click', () => {
        if (messageReplyModal) messageReplyModal.classList.add('hidden');
    });
    if (messageReplySend) {
        messageReplySend.addEventListener('click', () => {
            const replyText = document.getElementById('message-reply-text')?.value;
            if (replyText) {
                // Save reply (would integrate with email/notification system)
                alert('Reply sent! (Integration with email system pending)');
                if (messageReplyModal) messageReplyModal.classList.add('hidden');
                document.getElementById('message-reply-text').value = '';
            }
        });
    }
    
    // Order print button
    const orderPrintBtn = document.getElementById('owner-order-print-btn');
    if (orderPrintBtn) {
        orderPrintBtn.addEventListener('click', () => {
            window.print();
        });
    }
});

// Navigation functions
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const section = item.dataset.section;
            if (section === 'post-item') {
                showProductForm();
            } else {
                switchSection(section);
            }
        });
    });
    
    // Set initial section
    switchSection('my-site');
}

function switchSection(section) {
    console.log('Switching to section:', section);
    currentSection = section;
    currentSectionIndex = sections.indexOf(section);
    if (currentSectionIndex === -1) {
        console.warn('Section not found:', section);
        currentSectionIndex = 0;
    }
    
    // Update nav active states
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.section === section) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Slide to section
    const container = document.getElementById('swipe-container');
    if (container) {
        const translateX = -currentSectionIndex * 100;
        container.style.transform = `translateX(${translateX}vw)`;
        container.style.willChange = 'transform';
        console.log('Transformed container to:', translateX + 'vw', 'Section index:', currentSectionIndex);
        
        // Force a reflow to ensure transform is applied
        container.offsetHeight;
    } else {
        console.error('Swipe container not found!');
    }
}

// Swipe gesture handling
function initSwipeGestures() {
    const container = document.getElementById('swipe-container');
    if (!container) return;
    
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - next section
            if (currentSectionIndex < sections.length - 1) {
                switchSection(sections[currentSectionIndex + 1]);
            }
        } else {
            // Swipe right - previous section
            if (currentSectionIndex > 0) {
                switchSection(sections[currentSectionIndex - 1]);
            }
        }
    }
}

function showDashboard() {
    // Dashboard is always visible in dev mode, no login section to hide
    console.log('Dashboard initialized');
}

async function loadDashboard() {
    const stats = await getDashboardStats();
    if (stats) {
        // Update quick stats in Semi's Cloud section
        const productsEl = document.getElementById('stat-products-quick');
        const ordersEl = document.getElementById('stat-orders-quick');
        const usersTodayEl = document.getElementById('stat-users-today');
        const usersYearEl = document.getElementById('stat-users-year');
        const timeSpentEl = document.getElementById('stat-time-spent');
        
        if (productsEl) productsEl.textContent = stats.totalProducts || 0;
        if (ordersEl) ordersEl.textContent = stats.totalOrders || 0;
        
        // Calculate user metrics (mock data for now - can be replaced with real analytics)
        const today = new Date().toDateString();
        const todayVisits = JSON.parse(localStorage.getItem('daily_visits') || '{}');
        const todayCount = todayVisits[today] || 0;
        
        // Year visits
        const yearVisits = JSON.parse(localStorage.getItem('yearly_visits') || '{}');
        const currentYear = new Date().getFullYear();
        const yearCount = yearVisits[currentYear] || 0;
        
        // Average time spent (in minutes)
        const timeSpentData = JSON.parse(localStorage.getItem('time_spent') || '[]');
        const avgTime = timeSpentData.length > 0 
            ? Math.round(timeSpentData.reduce((a, b) => a + b, 0) / timeSpentData.length / 60)
            : 0;
        
        if (usersTodayEl) usersTodayEl.textContent = todayCount;
        if (usersYearEl) usersYearEl.textContent = yearCount;
        if (timeSpentEl) timeSpentEl.textContent = `${avgTime}m`;
    }
    
    await loadProducts();
    await loadOrders();
    await loadSettings();
    loadMessages();
}

async function loadProducts() {
    const products = await getProducts();
    currentProducts = products || [];
    // Products are now managed through modals, but we keep the data for stats
}

async function loadOrders() {
    const orders = await getOrders();
    allOrders = orders || [];
    currentOrders = allOrders;
    
    // Calculate sales metrics
    calculateSalesMetrics();
    
    // Filter and display orders
    filterOrders();
}

function calculateSalesMetrics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let salesToday = 0;
    let salesWeek = 0;
    let salesMonth = 0;
    let salesTotal = 0;
    
    allOrders.forEach(order => {
        const orderDate = order.created_at ? new Date(order.created_at) : null;
        const total = parseFloat(order.total || 0);
        
        salesTotal += total;
        
        if (orderDate) {
            if (orderDate >= today) {
                salesToday += total;
            }
            if (orderDate >= weekAgo) {
                salesWeek += total;
            }
            if (orderDate >= monthAgo) {
                salesMonth += total;
            }
        }
    });
    
    const salesTodayEl = document.getElementById('sales-today');
    const salesWeekEl = document.getElementById('sales-week');
    const salesMonthEl = document.getElementById('sales-month');
    const salesTotalEl = document.getElementById('sales-total');
    
    if (salesTodayEl) salesTodayEl.textContent = `$${salesToday.toFixed(2)}`;
    if (salesWeekEl) salesWeekEl.textContent = `$${salesWeek.toFixed(2)}`;
    if (salesMonthEl) salesMonthEl.textContent = `$${salesMonth.toFixed(2)}`;
    if (salesTotalEl) salesTotalEl.textContent = `$${salesTotal.toFixed(2)}`;
}

function filterOrders() {
    let filtered = allOrders;
    
    if (currentOrderFilter !== 'all') {
        filtered = allOrders.filter(order => order.status === currentOrderFilter);
    }
    
    currentOrders = filtered;
    renderOrders();
}

function renderOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    container.innerHTML = '';
    if (currentOrders.length === 0) {
        container.innerHTML = '<div class="light-card rounded-lg p-6 text-center"><p class="text-gray-500 text-sm">No orders found.</p></div>';
        return;
    }
    
    currentOrders.forEach(order => {
        const orderDate = order.created_at ? new Date(order.created_at) : null;
        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-800',
            processing: 'bg-blue-100 text-blue-800',
            shipped: 'bg-purple-100 text-purple-800',
            delivered: 'bg-green-100 text-green-800'
        };
        const statusColor = statusColors[order.status] || 'bg-gray-100 text-gray-800';
        
        const orderEl = document.createElement('div');
        orderEl.className = 'light-card rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors';
        orderEl.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <p class="font-semibold text-gray-900 text-sm">Order #${order.id.slice(0, 8)}</p>
                        <span class="px-2 py-0.5 rounded text-xs font-medium ${statusColor}">${order.status || 'pending'}</span>
                    </div>
                    <p class="text-gray-600 text-xs mb-1">$${parseFloat(order.total || 0).toFixed(2)} • ${order.payment_method || 'N/A'}</p>
                    ${orderDate ? `<p class="text-gray-500 text-xs">${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>` : ''}
                </div>
                <div class="flex flex-col items-end gap-2 ml-3">
                    <select onchange="window.updateOrderStatus('${order.id}', this.value)" class="bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 text-xs focus:outline-none focus:border-[#D2B48C]">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                    <button type="button" class="text-xs text-gray-600 underline hover:text-gray-900" onclick="window.showOrderDetail('${order.id}')">
                        View Details
                    </button>
                </div>
            </div>
        `;
        container.appendChild(orderEl);
    });
}

async function loadSettings() {
    const rate = await getSetting('stardust_rate');
    const bonus = await getSetting('checkin_bonus');
    const whatnotUsername = await getSetting('whatnot_username');
    const liveSchedule = await getSetting('live_schedule');
    const whatnotUrl = await getSetting('whatnot_url');
    const emailNotifications = await getSetting('email_notifications');
    const smsNotifications = await getSetting('sms_notifications');
    const liveStatus = await getSetting('live_status');
    const defaultShipping = await getSetting('default_shipping');
    const processingDays = await getSetting('processing_days');
    const autoProcess = await getSetting('auto_process');
    const confirmationEmail = await getSetting('confirmation_email');
    const shippingEmail = await getSetting('shipping_email');
    const sendOrderUpdates = await getSetting('send_order_updates');
    const paymentStripe = await getSetting('payment_stripe');
    const paymentVenmo = await getSetting('payment_venmo');
    const paymentCrypto = await getSetting('payment_crypto');
    const refundDays = await getSetting('refund_days');
    const newOrderAlerts = await getSetting('new_order_alerts');
    
    if (rate) document.getElementById('setting-stardust-rate').value = rate;
    if (bonus) document.getElementById('setting-checkin-bonus').value = bonus;
    if (whatnotUsername) document.getElementById('setting-whatnot-username').value = whatnotUsername;
    if (liveSchedule) document.getElementById('setting-live-schedule').value = liveSchedule;
    if (whatnotUrl) document.getElementById('setting-whatnot-url').value = whatnotUrl;
    if (emailNotifications !== null) document.getElementById('setting-email-notifications').checked = emailNotifications;
    if (smsNotifications !== null) document.getElementById('setting-sms-notifications').checked = smsNotifications;
    if (liveStatus !== null) document.getElementById('setting-live-status').checked = liveStatus;
    if (defaultShipping) document.getElementById('setting-default-shipping').value = defaultShipping;
    if (processingDays) document.getElementById('setting-processing-days').value = processingDays;
    if (autoProcess !== null) document.getElementById('setting-auto-process').checked = autoProcess;
    if (confirmationEmail) document.getElementById('setting-confirmation-email').value = confirmationEmail;
    if (shippingEmail) document.getElementById('setting-shipping-email').value = shippingEmail;
    if (sendOrderUpdates !== null) document.getElementById('setting-send-order-updates').checked = sendOrderUpdates;
    if (paymentStripe !== null) document.getElementById('setting-payment-stripe').checked = paymentStripe;
    if (paymentVenmo !== null) document.getElementById('setting-payment-venmo').checked = paymentVenmo;
    if (paymentCrypto !== null) document.getElementById('setting-payment-crypto').checked = paymentCrypto;
    if (refundDays) document.getElementById('setting-refund-days').value = refundDays;
    if (newOrderAlerts !== null) document.getElementById('setting-new-order-alerts').checked = newOrderAlerts;
}

function loadMessages() {
    // Load messages from localStorage (would be from database in production)
    const stored = localStorage.getItem('customer_messages');
    currentMessages = stored ? JSON.parse(stored) : [];
    filterMessages();
}

function saveMessages() {
    localStorage.setItem('customer_messages', JSON.stringify(currentMessages));
}

function filterMessages() {
    let filtered = currentMessages;
    
    if (currentMessageFilter === 'unread') {
        filtered = currentMessages.filter(msg => !msg.read);
    } else if (currentMessageFilter === 'order') {
        filtered = currentMessages.filter(msg => msg.type === 'order');
    } else if (currentMessageFilter === 'general') {
        filtered = currentMessages.filter(msg => msg.type === 'general');
    }
    
    renderMessages(filtered);
}

function renderMessages(messages) {
    const container = document.getElementById('messages-list');
    if (!container) return;
    
    container.innerHTML = '';
    if (messages.length === 0) {
        container.innerHTML = '<div class="light-card rounded-lg p-6 text-center"><p class="text-gray-500">No messages found.</p></div>';
        return;
    }
    
    messages.forEach(message => {
        const messageEl = document.createElement('div');
        messageEl.className = `light-card rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors ${!message.read ? 'border-l-4 border-[#D2B48C]' : ''}`;
        const date = message.date ? new Date(message.date) : new Date();
        
        messageEl.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <p class="font-semibold text-gray-900 text-sm">${message.customer || 'Customer'}</p>
                        ${!message.read ? '<span class="w-2 h-2 bg-[#D2B48C] rounded-full"></span>' : ''}
                        <span class="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">${message.type || 'general'}</span>
                    </div>
                    <p class="text-gray-600 text-sm mb-1">${message.subject || 'No subject'}</p>
                    <p class="text-gray-500 text-xs line-clamp-2">${message.message || ''}</p>
                    ${message.orderId ? `<p class="text-xs text-gray-400 mt-1">Order: #${message.orderId.slice(0, 8)}</p>` : ''}
                </div>
                <div class="flex flex-col items-end gap-2 ml-3">
                    <p class="text-xs text-gray-400">${date.toLocaleDateString()}</p>
                    <button onclick="window.replyToMessage('${message.id}')" class="text-xs text-gray-600 underline hover:text-gray-900">
                        Reply
                    </button>
                </div>
            </div>
        `;
        
        messageEl.addEventListener('click', () => {
            message.read = true;
            saveMessages();
            loadMessages();
        });
        
        container.appendChild(messageEl);
    });
}

window.replyToMessage = (messageId) => {
    const message = currentMessages.find(m => m.id === messageId);
    if (!message) return;
    
    const modal = document.getElementById('message-reply-modal-overlay');
    const original = document.getElementById('message-reply-original');
    
    if (modal && original) {
        original.innerHTML = `
            <p class="font-semibold text-gray-900 text-sm mb-1">${message.customer || 'Customer'}</p>
            <p class="text-gray-600 text-sm">${message.message || ''}</p>
        `;
        modal.classList.remove('hidden');
    }
};

let currentMediaFile = null;
let currentMediaDataUrl = null;
let currentMediaType = null;
let cameraStream = null;
let currentFacingMode = 'environment'; // 'user' for front, 'environment' for back

function showProductForm(product = null) {
    const overlay = document.getElementById('owner-product-modal-overlay');
    const modalTitle = document.getElementById('owner-product-modal-title');
    const idInput = document.getElementById('owner-product-id');
    const titleInput = document.getElementById('owner-product-title');
    const priceInput = document.getElementById('owner-product-price');
    const zodiacInput = document.getElementById('owner-product-zodiac');
    const categoryInput = document.getElementById('owner-product-category');
    const descInput = document.getElementById('owner-product-description');

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
        const zodiacs = (product.zodiac || '').split(',').map(z => z.trim()).filter(z => z);
        zodiacs.forEach(zodiac => {
            const checkbox = document.querySelector(`.zodiac-checkbox[data-zodiac="${zodiac}"]`);
            if (checkbox) checkbox.checked = true;
        });
        updateZodiacInput();
        
        categoryInput.value = product.category || '';
        descInput.value = product.description || '';
        
        if (product.image_url) {
            showMediaPreview(product.image_url, product.image_url.startsWith('data:') ? 'uploaded' : 'url');
        } else {
            hideMediaPreview();
        }
        // Don't auto-activate camera when editing
        stopCamera();
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
        
        // Auto-activate camera for new products
        overlay.classList.remove('hidden');
        setTimeout(() => {
            startCamera();
        }, 100);
    }

    overlay.classList.remove('hidden');
}

function hideMediaPreview() {
    const previewContainer = document.getElementById('preview-container');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const fileInput = document.getElementById('owner-product-file');
    const cameraContainer = document.getElementById('camera-preview-container');
    
    if (previewContainer) previewContainer.classList.add('hidden');
    if (uploadPlaceholder) uploadPlaceholder.classList.remove('hidden');
    if (fileInput) fileInput.value = '';
    if (cameraContainer) cameraContainer.classList.add('hidden');
    
    stopCamera();
    
    currentMediaFile = null;
    currentMediaDataUrl = null;
    currentMediaType = null;
}

async function startCamera() {
    const cameraContainer = document.getElementById('camera-preview-container');
    const cameraPreview = document.getElementById('camera-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    
    if (!cameraContainer || !cameraPreview) return;
    
    try {
        // Stop any existing stream
        stopCamera();
        
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        cameraStream = stream;
        cameraPreview.srcObject = stream;
        
        // Show camera preview, hide upload placeholder
        cameraContainer.classList.remove('hidden');
        if (uploadPlaceholder) uploadPlaceholder.classList.add('hidden');
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        // If camera fails, show upload placeholder
        if (uploadPlaceholder) uploadPlaceholder.classList.remove('hidden');
        if (cameraContainer) cameraContainer.classList.add('hidden');
        alert('Could not access camera. Please use the upload icon instead.');
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    const cameraPreview = document.getElementById('camera-preview');
    if (cameraPreview) {
        cameraPreview.srcObject = null;
    }
}

function capturePhoto() {
    const cameraPreview = document.getElementById('camera-preview');
    const canvas = document.getElementById('camera-canvas');
    
    if (!cameraPreview || !canvas) return;
    
    canvas.width = cameraPreview.videoWidth;
    canvas.height = cameraPreview.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraPreview, 0, 0);
    
    // Convert to data URL
    currentMediaDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    currentMediaType = 'image';
    
    // Stop camera and show preview
    stopCamera();
    const cameraContainer = document.getElementById('camera-preview-container');
    if (cameraContainer) cameraContainer.classList.add('hidden');
    
    showMediaPreview(currentMediaDataUrl, 'uploaded');
}

async function switchCamera() {
    // Toggle between front and back camera
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    await startCamera();
}

function updateImageFilters() {
    const previewImage = document.getElementById('preview-image');
    if (previewImage) {
        previewImage.style.filter = `brightness(${currentBrightness}%) contrast(${currentContrast}%) saturate(${currentSaturation}%)`;
    }
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
        setTimeout(() => updateImageFilters(), 50);
    } else if (type === 'uploaded' && currentMediaType === 'video') {
        mediaPreview.innerHTML = `<video src="${src}" id="preview-video" class="max-w-full max-h-full" controls></video>`;
    } else {
        if (src.match(/\.(mp4|mov|webm|ogg)$/i) || src.startsWith('data:video')) {
            mediaPreview.innerHTML = `<video src="${src}" id="preview-video" class="max-w-full max-h-full" controls></video>`;
            currentMediaType = 'video';
        } else {
            mediaPreview.innerHTML = `<img src="${src}" id="preview-image" class="max-w-full max-h-full object-contain">`;
            currentMediaType = 'image';
            setTimeout(() => updateImageFilters(), 50);
        }
    }
    
    if (filterControls) {
        if (currentMediaType === 'image') {
            filterControls.classList.remove('hidden');
            document.getElementById('brightness-control')?.classList.remove('hidden');
            document.getElementById('contrast-control')?.classList.remove('hidden');
            document.getElementById('saturation-control')?.classList.remove('hidden');
        } else {
            filterControls.classList.add('hidden');
        }
    }
}

function handleFileUpload(file) {
    if (!file) return;
    
    const isMobile = window.innerWidth <= 768;
    const maxSize = isMobile ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
        alert(`File size must be less than ${isMobile ? '5MB' : '10MB'}`);
        return;
    }
    
    currentMediaFile = file;
    currentMediaType = file.type.startsWith('image/') ? 'image' : 'video';
    
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

function optimizeImageForMobile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
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
                
                const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(optimizedDataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function hideProductModal() {
    stopCamera();
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

    if (!currentMediaDataUrl) {
        alert('Please upload an image or video for this product.');
        return;
    }

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
    await loadDashboard();
    
    window.dispatchEvent(new CustomEvent('products-updated'));
}

function showOrderDetailModal(order) {
    const overlay = document.getElementById('owner-order-modal-overlay');
    const body = document.getElementById('owner-order-modal-body');
    if (!overlay || !body) return;

    const createdAt = order.created_at ? new Date(order.created_at) : null;
    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-blue-100 text-blue-800',
        shipped: 'bg-purple-100 text-purple-800',
        delivered: 'bg-green-100 text-green-800'
    };
    const statusColor = statusColors[order.status] || 'bg-gray-100 text-gray-800';

    body.innerHTML = `
        <div class="border-b border-gray-200 pb-4 mb-4">
            <div class="flex items-center justify-between mb-2">
                <h3 class="font-heading text-lg font-bold text-gray-900">Order #${order.id.slice(0, 8)}</h3>
                <span class="px-3 py-1 rounded-full text-xs font-medium ${statusColor}">${order.status || 'pending'}</span>
            </div>
            <p class="text-xs text-gray-500">${createdAt ? createdAt.toLocaleString() : 'N/A'}</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="light-card rounded-lg p-3">
                <p class="text-xs text-gray-500 mb-1">Order Total</p>
                <p class="text-lg font-bold text-gray-900">$${parseFloat(order.total || 0).toFixed(2)}</p>
            </div>
            <div class="light-card rounded-lg p-3">
                <p class="text-xs text-gray-500 mb-1">Payment Method</p>
                <p class="text-sm font-medium text-gray-900">${order.payment_method || 'N/A'}</p>
            </div>
        </div>
        
        <div class="light-card rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-gray-900 text-sm mb-3">Customer Information</h4>
            <div class="space-y-2 text-sm">
                <div>
                    <p class="text-xs text-gray-500">User ID</p>
                    <p class="text-gray-900 font-mono text-xs break-all">${order.user_id || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500">Email</p>
                    <p class="text-gray-900">${order.customer_email || 'Not provided'}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500">Shipping Address</p>
                    <p class="text-gray-900">${order.shipping_address || 'Not provided'}</p>
                </div>
            </div>
        </div>
        
        <div class="light-card rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-gray-900 text-sm mb-3">Order Items</h4>
            <div class="text-sm text-gray-600">
                ${order.items ? order.items.map(item => `
                    <div class="flex justify-between py-2 border-b border-gray-100 last:border-0">
                        <span>${item.title || 'Item'} x${item.quantity || 1}</span>
                        <span>$${parseFloat(item.price || 0).toFixed(2)}</span>
                    </div>
                `).join('') : '<p class="text-gray-500 text-xs">Item details not available</p>'}
            </div>
        </div>
        
        <div class="light-card rounded-lg p-4">
            <h4 class="font-semibold text-gray-900 text-sm mb-3">Order Notes</h4>
            <textarea id="order-notes-input" rows="3" placeholder="Add notes about this order..." class="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[#D2B48C]">${order.notes || ''}</textarea>
            <button onclick="window.saveOrderNotes('${order.id}')" class="mt-2 px-3 py-1.5 bg-[#D2B48C] text-gray-900 text-xs font-semibold rounded hover:bg-[#c4a67a] transition-colors">
                Save Notes
            </button>
        </div>
    `;

    overlay.classList.remove('hidden');
}

window.saveOrderNotes = async (orderId) => {
    const notes = document.getElementById('order-notes-input')?.value;
    if (notes !== undefined) {
        // Save notes to order (would update in database)
        const order = allOrders.find(o => o.id === orderId);
        if (order) {
            order.notes = notes;
            // In production, would call updateOrder API
            alert('Notes saved!');
        }
    }
};

function hideOrderDetailModal() {
    const overlay = document.getElementById('owner-order-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
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

function updateZodiacInput() {
    const checkboxes = document.querySelectorAll('.zodiac-checkbox:checked');
    const zodiacs = Array.from(checkboxes)
        .map(cb => cb.dataset.zodiac)
        .filter(z => z && z !== 'all');
    const zodiacInput = document.getElementById('owner-product-zodiac');
    if (zodiacInput) {
        zodiacInput.value = zodiacs.join(',');
    }
}

window.updateOrderStatus = async (orderId, status) => {
    await updateOrderStatus(orderId, status);
    // Update local order
    const order = allOrders.find(o => o.id === orderId);
    if (order) {
        order.status = status;
    }
    // Recalculate sales and refresh display
    calculateSalesMetrics();
    filterOrders();
};

window.showOrderDetail = (orderId) => {
    const order = currentOrders.find(o => o.id === orderId);
    if (order) {
        showOrderDetailModal(order);
    }
};
