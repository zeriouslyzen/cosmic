// Owner Dashboard JavaScript
import { ownerLogin, checkOwnerAccess, getDashboardStats, createProduct, updateProduct, deleteProduct, getOrders, updateOrderStatus, getSetting, setSetting } from './owner.js';
import { getProducts } from './api.js';
import { showBulkUploadModal, hideBulkUploadModal, saveBulkProducts } from './bulk-upload.js';
import { dropshippingManager } from './dropshipping.js';

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
const sections = ['my-site', 'orders', 'post-item', 'messages', 'settings'];
let currentWizardStep = 1;
let wizardProductData = {
    stock_quantity: 0,
    stock_location: '',
    low_stock_threshold: 10,
    title: '',
    price: 0,
    category: '',
    zodiac: '',
    description: '',
    image_url: '',
    image_urls: [],
    sku: '',
    is_dropshipped: false,
    dropship_source: '',
    dropship_product_id: '',
    dropship_api_data: null
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - Initializing dashboard...');
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
        debugInfo.style.display = 'block';
        debugInfo.textContent = 'JS Loading...';
    }

    try {
        // STRICT SECURITY: Check access before doing ANYTHING
        const hasAccess = await checkOwnerAccess();
        if (!hasAccess) {
            console.warn('Unauthorized access attempt redirecting to login...');
            window.location.href = './owner-login.html';
            return;
        }

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
            showPostItemWizard();
        });
    }

    // Initialize wizard
    initWizard();

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
            const paymentCrypto = document.getElementById('setting-payment-crypto')?.checked;
            const paymentVenmo = document.getElementById('setting-payment-venmo')?.checked;
            const paymentCashapp = document.getElementById('setting-payment-cashapp')?.checked;
            const paymentZelle = document.getElementById('setting-payment-zelle')?.checked;
            const paymentAppleCash = document.getElementById('setting-payment-apple-cash')?.checked;

            const venmoHandle = document.getElementById('setting-venmo-handle')?.value;
            const cashappHandle = document.getElementById('setting-cashapp-handle')?.value;
            const zelleHandle = document.getElementById('setting-zelle-handle')?.value;
            const appleCashHandle = document.getElementById('setting-apple-cash-handle')?.value;

            const refundDays = document.getElementById('setting-refund-days')?.value;
            const newOrderAlerts = document.getElementById('setting-new-order-alerts')?.checked;

            // Integration fields - use full value if still masked
            const getValueOrFull = (id) => {
                const el = document.getElementById(id);
                if (!el) return null;
                if (el.value.includes('****************')) {
                    return el.dataset.fullValue || null;
                }
                return el.value;
            };

            const stripeKey = getValueOrFull('setting-stripe-key');
            const stripeSecret = getValueOrFull('setting-stripe-secret');
            const shopifyUrl = getValueOrFull('setting-shopify-url');
            const shopifyToken = getValueOrFull('setting-shopify-token');
            const squareId = getValueOrFull('setting-square-id');
            const squareToken = getValueOrFull('setting-square-token');

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
            await setSetting('payment_crypto', paymentCrypto);
            await setSetting('payment_venmo', paymentVenmo);
            await setSetting('payment_cashapp', paymentCashapp);
            await setSetting('payment_zelle', paymentZelle);
            await setSetting('payment_apple_cash', paymentAppleCash);

            await setSetting('venmo_handle', venmoHandle);
            await setSetting('cashapp_handle', cashappHandle);
            await setSetting('zelle_handle', zelleHandle);
            await setSetting('apple_cash_handle', appleCashHandle);

            await setSetting('refund_days', refundDays);
            await setSetting('new_order_alerts', newOrderAlerts);

            await setSetting('stripe_key', stripeKey);
            await setSetting('stripe_secret', stripeSecret);
            await setSetting('shopify_url', shopifyUrl);
            await setSetting('shopify_token', shopifyToken);
            await setSetting('square_id', squareId);
            await setSetting('square_token', squareToken);

            // Re-mask after save
            loadSettings();

            // Notify main site of live status change
            window.dispatchEvent(new CustomEvent('live-status-updated', { detail: { isLive: liveStatus } }));

            alert('Settings saved successfully!');
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

    // CapCut Integration
    const openCapCutBtn = document.getElementById('open-capcut-btn');
    if (openCapCutBtn) {
        openCapCutBtn.addEventListener('click', () => {
            // Open CapCut web editor in a new window
            const capcutUrl = 'https://www.capcut.com/editor';
            window.open(capcutUrl, '_blank', 'noopener,noreferrer');
        });
    }

    // Camera controls (kept for manual use if needed)
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

    // Sign Out button
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            const { supabaseClient } = await import('./supabase.js');
            await supabaseClient.auth.signOut();
            window.location.href = './owner-login.html';
        });
    }

    // Social Media Hub Buttons
    const socialWhatnotBtn = document.getElementById('social-whatnot-btn');
    if (socialWhatnotBtn) {
        socialWhatnotBtn.addEventListener('click', async () => {
            const url = await getSetting('whatnot_url');
            if (url) {
                window.open(url, '_blank');
            } else {
                alert('Whatnot URL not configured. Please set it in Settings.');
            }
        });
    }

    const socialFacebookBtn = document.getElementById('social-facebook-btn');
    if (socialFacebookBtn) {
        socialFacebookBtn.addEventListener('click', async () => {
            const url = await getSetting('social_facebook_url');
            if (url) {
                window.open(url, '_blank');
            } else {
                alert('Facebook URL not configured. Please set it in Settings.');
            }
        });
    }

    const socialInstagramBtn = document.getElementById('social-instagram-btn');
    if (socialInstagramBtn) {
        socialInstagramBtn.addEventListener('click', async () => {
            const url = await getSetting('social_instagram_url');
            if (url) {
                window.open(url, '_blank');
            } else {
                alert('Instagram URL not configured. Please set it in Settings.');
            }
        });
    }

    const socialTiktokBtn = document.getElementById('social-tiktok-btn');
    if (socialTiktokBtn) {
        socialTiktokBtn.addEventListener('click', async () => {
            const url = await getSetting('social_tiktok_url');
            if (url) {
                window.open(url, '_blank');
            } else {
                alert('TikTok URL not configured. Please set it in Settings.');
            }
        });
    }

    // Post Announcement Button
    const postAnnouncementBtn = document.getElementById('post-announcement-btn');
    if (postAnnouncementBtn) {
        postAnnouncementBtn.addEventListener('click', () => {
            const title = prompt('Announcement Title:');
            if (!title) return;
            const message = prompt('Announcement Message:');
            if (!message) return;

            // Save announcement (would integrate with database)
            alert(`Announcement posted!\n\nTitle: ${title}\nMessage: ${message}\n\n(Database integration pending)`);
        });
    }

    // Personalization Zodiac Toggle
    const zodiacToggle = document.getElementById('personalization-zodiac-toggle');
    if (zodiacToggle) {
        zodiacToggle.addEventListener('change', async (e) => {
            await setSetting('personalization_zodiac_enabled', e.target.checked);
            console.log('Zodiac personalization:', e.target.checked ? 'Enabled' : 'Disabled');
        });
    }

    // Hashtag Copy Buttons
    document.querySelectorAll('.hashtag-set-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tags = btn.dataset.tags;
            navigator.clipboard.writeText(tags);
            const originalText = btn.innerHTML;
            btn.innerHTML = btn.innerHTML.replace('Copy', '✓ Copied!');
            setTimeout(() => btn.innerHTML = originalText, 1500);
        });
    });

    // Copy Link Buttons
    document.querySelectorAll('.copy-link-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            navigator.clipboard.writeText(url);
            btn.textContent = '✓';
            setTimeout(() => btn.textContent = 'Copy', 1500);
        });
    });

    // Initialize Content Calendar
    initContentCalendar();

    // Settings Tab Switching
    const settingsTabs = document.querySelectorAll('.settings-tab-btn');
    const settingsContents = document.querySelectorAll('.settings-tab-content');

    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            settingsTabs.forEach(t => {
                t.classList.remove('active', 'bg-gray-900', 'text-white');
                t.classList.add('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
            });

            // Add active class to clicked tab
            tab.classList.add('active', 'bg-gray-900', 'text-white');
            tab.classList.remove('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');

            // Hide all content
            settingsContents.forEach(content => content.classList.add('hidden'));

            // Show selected content
            const tabId = tab.dataset.tab;
            const targetContent = document.querySelector(`.settings-tab-content[data-tab="${tabId}"]`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
        });
    });
});

// Navigation functions
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const section = item.dataset.section;
            if (section === 'post-item') {
                showPostItemWizard();
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

    // Seed phone numbers for existing orders if missing (DEV ONLY)
    const storedOrders = JSON.parse(localStorage.getItem('all_orders') || '[]');
    let ordersUpdated = false;
    storedOrders.forEach(order => {
        if (!order.customer_phone) {
            order.customer_phone = '555-0199'; // Mock number
            ordersUpdated = true;
        }
    });
    if (ordersUpdated) {
        localStorage.setItem('all_orders', JSON.stringify(storedOrders));
        console.log('Seeded mock phone numbers for orders');
    }

    await loadProducts();
    await loadOrders();
    await loadSettings();
    loadMessages();
    loadRecentActivity();
    loadMarketingMetrics();
}

async function loadProducts() {
    const products = await getProducts();
    currentProducts = products || [];
    // Update widget stats when products are loaded
    updateWidgetStats();
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
                    ${orderDate ? `<p class="text-gray-500 text-xs">${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>` : ''}
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
    const settings = {
        'stardust_rate': 'setting-stardust-rate',
        'checkin_bonus': 'setting-checkin_bonus',
        'whatnot_username': 'setting-whatnot-username',
        'live_schedule': 'setting-live-schedule',
        'whatnot_url': 'setting-whatnot-url',
        'email_notifications': 'setting-email-notifications',
        'sms_notifications': 'setting-sms-notifications',
        'live_status': 'setting-live-status',
        'default_shipping': 'setting-default-shipping',
        'processing_days': 'setting-processing_days',
        'auto_process': 'setting-auto-process',
        'confirmation_email': 'setting-confirmation-email',
        'shipping_email': 'setting-shipping-email',
        'send_order_updates': 'setting-send-order-updates',
        'payment_stripe': 'setting-payment-stripe',
        'payment_crypto': 'setting-payment-crypto',
        'payment_venmo': 'setting-payment-venmo',
        'payment_cashapp': 'setting-payment-cashapp',
        'payment_zelle': 'setting-payment-zelle',
        'payment_apple_cash': 'setting-payment-apple-cash',
        'venmo_handle': 'setting-venmo-handle',
        'cashapp_handle': 'setting-cashapp-handle',
        'zelle_handle': 'setting-zelle-handle',
        'apple_cash_handle': 'setting-apple-cash-handle',
        'refund_days': 'setting-refund-days',
        'new_order_alerts': 'setting-new-order-alerts',
        // Integration fields
        'stripe_key': 'setting-stripe-key',
        'stripe_secret': 'setting-stripe-secret',
        'shopify_url': 'setting-shopify-url',
        'shopify_token': 'setting-shopify-token',
        'square_id': 'setting-square-id',
        'square_token': 'setting-square-token'
    };

    for (const [key, elementId] of Object.entries(settings)) {
        const value = await getSetting(key);
        const el = document.getElementById(elementId);
        if (el && value !== null && value !== undefined) {
            if (el.type === 'checkbox') {
                el.checked = (value === true || value === 'true');
            } else {
                // Mask sensitive keys
                if (key.includes('key') || key.includes('secret') || key.includes('token')) {
                    el.value = maskSensitiveValue(value);
                    el.dataset.fullValue = value; // Store for submission if unchanged
                } else {
                    el.value = value;
                }
            }
        }
    }
}

function maskSensitiveValue(value) {
    if (!value || value.length < 10) return value;
    const prefix = value.substring(0, 8);
    return `${prefix}****************`;
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
                    <p class="text-xs text-gray-500">Phone</p>
                    <div class="flex items-center gap-2">
                        <p class="text-gray-900">${order.customer_phone || 'Not provided'}</p>
                        ${order.customer_phone ? `
                        <a href="sms:${order.customer_phone}" class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded hover:bg-green-200 transition-colors" title="Text Customer">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                            Text
                        </a>
                        ` : ''}
                    </div>
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

// ========== POST ITEM WIZARD FUNCTIONS ==========

function showPostItemWizard(productId = null) {
    switchSection('post-item');
    resetWizard();
    if (productId) {
        loadProductIntoWizard(productId);
    }
    updateWidgetStats();
}

function resetWizard() {
    currentWizardStep = 1;
    wizardProductData = {
        stock_quantity: 0,
        stock_location: '',
        low_stock_threshold: 10,
        title: '',
        price: 0,
        category: '',
        zodiac: '',
        description: '',
        image_url: '',
        image_urls: [],
        sku: '',
        is_dropshipped: false,
        dropship_source: '',
        dropship_product_id: '',
        dropship_api_data: null
    };
    updateWizardStep(1);
    syncWizardDataToForm();
}

function syncWizardDataToForm() {
    // Sync wizard data to form fields
    const stockQty = document.getElementById('wizard-stock-quantity');
    const stockLoc = document.getElementById('wizard-stock-location');
    const lowStock = document.getElementById('wizard-low-stock-threshold');
    const title = document.getElementById('wizard-product-title');
    const price = document.getElementById('wizard-product-price');
    const category = document.getElementById('wizard-product-category');
    const desc = document.getElementById('wizard-product-description');
    const sku = document.getElementById('wizard-sku');
    const isDropshipped = document.getElementById('wizard-is-dropshipped');
    const dropshipSource = document.getElementById('wizard-dropship-source');
    const dropshipId = document.getElementById('wizard-dropship-product-id');

    if (stockQty) stockQty.value = wizardProductData.stock_quantity || 0;
    if (stockLoc) stockLoc.value = wizardProductData.stock_location || '';
    if (lowStock) lowStock.value = wizardProductData.low_stock_threshold || 10;
    if (title) title.value = wizardProductData.title || '';
    if (price) price.value = wizardProductData.price || 0;
    if (category) category.value = wizardProductData.category || '';
    if (desc) desc.value = wizardProductData.description || '';
    if (sku) sku.value = wizardProductData.sku || '';
    if (isDropshipped) isDropshipped.checked = wizardProductData.is_dropshipped || false;
    if (dropshipSource) dropshipSource.value = wizardProductData.dropship_source || '';
    if (dropshipId) dropshipId.value = wizardProductData.dropship_product_id || '';

    // Update dropshipping fields visibility
    const dropshipFields = document.getElementById('wizard-dropshipping-fields');
    if (dropshipFields) {
        dropshipFields.classList.toggle('hidden', !wizardProductData.is_dropshipped);
    }

    // Update zodiac checkboxes
    if (wizardProductData.zodiac) {
        const zodiacs = wizardProductData.zodiac.split(',').map(z => z.trim());
        document.querySelectorAll('.wizard-zodiac-checkbox').forEach(cb => {
            cb.checked = zodiacs.includes(cb.dataset.zodiac);
        });
    }

    updateProductSummary();
}

function syncFormToWizardData() {
    // Sync form fields to wizard data
    const stockQty = document.getElementById('wizard-stock-quantity');
    const stockLoc = document.getElementById('wizard-stock-location');
    const lowStock = document.getElementById('wizard-low-stock-threshold');
    const title = document.getElementById('wizard-product-title');
    const price = document.getElementById('wizard-product-price');
    const category = document.getElementById('wizard-product-category');
    const desc = document.getElementById('wizard-product-description');
    const sku = document.getElementById('wizard-sku');
    const isDropshipped = document.getElementById('wizard-is-dropshipped');
    const dropshipSource = document.getElementById('wizard-dropship-source');
    const dropshipId = document.getElementById('wizard-dropship-product-id');

    wizardProductData.stock_quantity = stockQty ? parseInt(stockQty.value) || 0 : 0;
    wizardProductData.stock_location = stockLoc ? stockLoc.value : '';
    wizardProductData.low_stock_threshold = lowStock ? parseInt(lowStock.value) || 10 : 10;
    wizardProductData.title = title ? title.value : '';
    wizardProductData.price = price ? parseFloat(price.value) || 0 : 0;
    wizardProductData.category = category ? category.value : '';
    wizardProductData.description = desc ? desc.value : '';
    wizardProductData.sku = sku ? sku.value : '';
    wizardProductData.is_dropshipped = isDropshipped ? isDropshipped.checked : false;
    wizardProductData.dropship_source = dropshipSource ? dropshipSource.value : '';
    wizardProductData.dropship_product_id = dropshipId ? dropshipId.value : '';

    // Get zodiac from checkboxes
    const zodiacCheckboxes = document.querySelectorAll('.wizard-zodiac-checkbox:checked');
    const zodiacs = Array.from(zodiacCheckboxes)
        .map(cb => cb.dataset.zodiac)
        .filter(z => z && z !== 'all');
    wizardProductData.zodiac = zodiacs.join(',');

    updateProductSummary();
}

function updateProductSummary() {
    const summaryTitle = document.getElementById('summary-title');
    const summaryPrice = document.getElementById('summary-price');
    const summaryStock = document.getElementById('summary-stock');
    const summarySku = document.getElementById('summary-sku');

    if (summaryTitle) summaryTitle.textContent = wizardProductData.title || '-';
    if (summaryPrice) summaryPrice.textContent = wizardProductData.price ? `$${wizardProductData.price.toFixed(2)}` : '-';
    if (summaryStock) summaryStock.textContent = wizardProductData.stock_quantity || 0;
    if (summarySku) summarySku.textContent = wizardProductData.sku || '-';
}

function updateWizardStep(step) {
    currentWizardStep = step;

    // Map step numbers to step names
    const stepNames = ['stock', 'product', 'edit', 'serial'];
    const stepName = stepNames[step - 1];

    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(stepEl => {
        stepEl.classList.add('hidden');
        stepEl.classList.remove('active');
    });

    // Show current step
    const currentStepEl = document.querySelector(`.wizard-step[data-step="${stepName}"]`);
    if (currentStepEl) {
        currentStepEl.classList.remove('hidden');
        currentStepEl.classList.add('active');
    }

    // Update step indicators
    document.querySelectorAll('.wizard-step-indicator').forEach((indicator, index) => {
        const stepNum = index + 1;
        indicator.classList.remove('active', 'completed');
        if (stepNum < step) {
            indicator.classList.add('completed');
        } else if (stepNum === step) {
            indicator.classList.add('active');
        }
    });

    // Update progress bar
    const progressFill = document.querySelector('.wizard-progress-fill');
    if (progressFill) {
        progressFill.style.width = `${(step / 4) * 100}%`;
    }

    // Update navigation buttons
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    const publishBtn = document.getElementById('wizard-publish-btn');

    if (prevBtn) {
        prevBtn.classList.toggle('hidden', step === 1);
    }
    if (nextBtn) {
        nextBtn.classList.toggle('hidden', step === 4);
    }
    if (publishBtn) {
        publishBtn.classList.toggle('hidden', step !== 4);
    }
}

function nextWizardStep() {
    if (currentWizardStep < 4) {
        syncFormToWizardData();
        if (validateCurrentStep()) {
            updateWizardStep(currentWizardStep + 1);
        }
    }
}

function prevWizardStep() {
    if (currentWizardStep > 1) {
        syncFormToWizardData();
        updateWizardStep(currentWizardStep - 1);
    }
}

function validateCurrentStep() {
    if (currentWizardStep === 1) {
        // Stock step - no validation needed, can proceed with defaults
        return true;
    } else if (currentWizardStep === 2) {
        // Validate product details step
        const title = document.getElementById('wizard-product-title');
        const price = document.getElementById('wizard-product-price');

        if (!title || !title.value.trim()) {
            alert('Please enter a product title');
            return false;
        }
        if (!price || !price.value || parseFloat(price.value) <= 0) {
            alert('Please enter a valid price');
            return false;
        }
    } else if (currentWizardStep === 3) {
        // Media step - validate at least one image is uploaded
        if (!wizardProductData.image_url && wizardProductData.image_urls.length === 0) {
            const proceed = confirm('No images uploaded. You can add images later, but it\'s recommended to add at least one now. Continue anyway?');
            return proceed;
        }
    }
    return true;
}

async function saveWizardDraft() {
    syncFormToWizardData();
    // Save draft to localStorage
    const drafts = JSON.parse(localStorage.getItem('product_drafts') || '[]');
    const draft = {
        id: 'draft-' + Date.now(),
        ...wizardProductData,
        created_at: new Date().toISOString()
    };
    drafts.push(draft);
    localStorage.setItem('product_drafts', JSON.stringify(drafts));
    alert('Draft saved!');
    updateWidgetStats();
}

async function publishWizardProduct() {
    syncFormToWizardData();

    if (!wizardProductData.title || !wizardProductData.price) {
        alert('Please complete all required fields');
        return;
    }

    if (!wizardProductData.image_url && wizardProductData.image_urls.length === 0) {
        alert('Please upload at least one image');
        return;
    }

    // Generate SKU if not set
    if (!wizardProductData.sku) {
        wizardProductData.sku = generateSKU();
    }

    const productData = {
        title: wizardProductData.title,
        price: wizardProductData.price,
        category: wizardProductData.category || 'Just In',
        zodiac: wizardProductData.zodiac || 'just-in',
        description: wizardProductData.description,
        image_url: wizardProductData.image_url || (wizardProductData.image_urls[0] || ''),
        image_urls: wizardProductData.image_urls.length > 0 ? wizardProductData.image_urls : [wizardProductData.image_url],
        stock_quantity: wizardProductData.stock_quantity || 0,
        stock_location: wizardProductData.stock_location || '',
        low_stock_threshold: wizardProductData.low_stock_threshold || 10,
        sku: wizardProductData.sku,
        is_dropshipped: wizardProductData.is_dropshipped || false,
        dropship_source: wizardProductData.dropship_source || null,
        dropship_product_id: wizardProductData.dropship_product_id || null,
        dropship_api_data: wizardProductData.dropship_api_data || null
    };

    const created = await createProduct(productData);
    if (created) {
        alert('Product published successfully!');
        resetWizard();
        await loadDashboard();
        updateWidgetStats();
        window.dispatchEvent(new CustomEvent('products-updated'));
    } else {
        alert('Failed to publish product. Please try again.');
    }
}

function generateSKU() {
    const prefix = 'CD';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

function initWizard() {
    // Wizard navigation buttons
    const nextBtn = document.getElementById('wizard-next-btn');
    const prevBtn = document.getElementById('wizard-prev-btn');
    const publishBtn = document.getElementById('wizard-publish-btn');
    const saveDraftBtn = document.getElementById('wizard-save-draft-btn');

    if (nextBtn) nextBtn.addEventListener('click', nextWizardStep);
    if (prevBtn) prevBtn.addEventListener('click', prevWizardStep);
    if (publishBtn) publishBtn.addEventListener('click', publishWizardProduct);
    if (saveDraftBtn) saveDraftBtn.addEventListener('click', saveWizardDraft);

    // Dropshipping toggle
    const isDropshipped = document.getElementById('wizard-is-dropshipped');
    if (isDropshipped) {
        isDropshipped.addEventListener('change', (e) => {
            const dropshipFields = document.getElementById('wizard-dropshipping-fields');
            if (dropshipFields) {
                dropshipFields.classList.toggle('hidden', !e.target.checked);
            }
            const dropshipTracking = document.getElementById('wizard-dropship-tracking');
            if (dropshipTracking) {
                dropshipTracking.classList.toggle('hidden', !e.target.checked);
            }
        });
    }

    // Dropshipping import buttons
    const importTemuBtn = document.getElementById('import-temu-btn');
    const importAliExpressBtn = document.getElementById('import-aliexpress-btn');

    if (importTemuBtn) {
        importTemuBtn.addEventListener('click', () => importFromDropshipping('temu'));
    }
    if (importAliExpressBtn) {
        importAliExpressBtn.addEventListener('click', () => importFromDropshipping('aliexpress'));
    }

    // Bulk upload widget button
    const bulkUploadWidgetBtn = document.getElementById('bulk-upload-widget-btn');
    if (bulkUploadWidgetBtn) {
        bulkUploadWidgetBtn.addEventListener('click', () => {
            showBulkUploadModal();
        });
    }

    // SKU generation
    const generateSkuBtn = document.getElementById('generate-sku-btn');
    if (generateSkuBtn) {
        generateSkuBtn.addEventListener('click', () => {
            const skuInput = document.getElementById('wizard-sku');
            if (skuInput) {
                skuInput.value = generateSKU();
            }
        });
    }

    // Stock management buttons
    const addStockBtn = document.getElementById('add-stock-btn');
    const removeStockBtn = document.getElementById('remove-stock-btn');
    const transferStockBtn = document.getElementById('transfer-stock-btn');

    if (addStockBtn) {
        addStockBtn.addEventListener('click', () => {
            const qty = prompt('Enter quantity to add:');
            if (qty && !isNaN(qty)) {
                const stockQty = document.getElementById('wizard-stock-quantity');
                if (stockQty) {
                    stockQty.value = parseInt(stockQty.value) + parseInt(qty);
                    addStockHistory('add', parseInt(qty));
                }
            }
        });
    }

    if (removeStockBtn) {
        removeStockBtn.addEventListener('click', () => {
            const qty = prompt('Enter quantity to remove:');
            if (qty && !isNaN(qty)) {
                const stockQty = document.getElementById('wizard-stock-quantity');
                if (stockQty) {
                    const current = parseInt(stockQty.value);
                    const remove = parseInt(qty);
                    stockQty.value = Math.max(0, current - remove);
                    addStockHistory('remove', remove);
                }
            }
        });
    }

    if (transferStockBtn) {
        transferStockBtn.addEventListener('click', () => {
            const qty = prompt('Enter quantity to transfer:');
            const location = prompt('Enter destination location:');
            if (qty && !isNaN(qty) && location) {
                const stockQty = document.getElementById('wizard-stock-quantity');
                const stockLoc = document.getElementById('wizard-stock-location');
                if (stockQty && stockLoc) {
                    const current = parseInt(stockQty.value);
                    const transfer = parseInt(qty);
                    stockQty.value = Math.max(0, current - transfer);
                    stockLoc.value = location;
                    addStockHistory('transfer', transfer, location);
                }
            }
        });
    }

    // Wizard form field listeners for auto-sync
    const wizardFields = [
        'wizard-stock-quantity', 'wizard-stock-location', 'wizard-low-stock-threshold',
        'wizard-product-title', 'wizard-product-price', 'wizard-product-category',
        'wizard-product-description', 'wizard-sku', 'wizard-dropship-source', 'wizard-dropship-product-id'
    ];

    wizardFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                syncFormToWizardData();
            });
        }
    });

    // Zodiac checkboxes
    document.querySelectorAll('.wizard-zodiac-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            syncFormToWizardData();
        });
    });

    // Media upload for wizard
    const wizardFileInput = document.getElementById('wizard-product-file');
    const wizardUploadArea = document.getElementById('wizard-upload-area');

    if (wizardFileInput && wizardUploadArea) {
        wizardUploadArea.addEventListener('click', () => wizardFileInput.click());
        wizardFileInput.addEventListener('change', (e) => {
            handleWizardFileUpload(e.target.files);
        });
    }

    // CapCut button for wizard
    const wizardCapCutBtn = document.getElementById('wizard-open-capcut-btn');
    if (wizardCapCutBtn) {
        wizardCapCutBtn.addEventListener('click', () => {
            window.open('https://www.capcut.com/editor', '_blank');
        });
    }
}

function addStockHistory(action, quantity, location = null) {
    const historyList = document.getElementById('stock-history-list');
    if (!historyList) return;

    if (historyList.querySelector('p.text-gray-500')) {
        historyList.innerHTML = '';
    }

    const entry = document.createElement('div');
    entry.className = 'flex justify-between items-center text-sm py-2 border-b border-gray-200';
    const actionText = action === 'add' ? 'Added' : action === 'remove' ? 'Removed' : 'Transferred';
    const locationText = location ? ` to ${location}` : '';
    entry.innerHTML = `
        <span class="text-gray-600">${actionText} ${quantity}${locationText}</span>
        <span class="text-gray-400 text-xs">${new Date().toLocaleString()}</span>
    `;
    historyList.insertBefore(entry, historyList.firstChild);
}

async function importFromDropshipping(platform) {
    const platformName = platform === 'temu' ? 'Temu' : 'AliExpress';
    const exampleUrl = platform === 'temu'
        ? 'https://www.temu.com/example-product-p-123456.html'
        : 'https://www.aliexpress.com/item/100500123456789.html';

    const url = prompt(`Enter ${platformName} product URL:\n\nExample: ${exampleUrl}`);
    if (!url) return;

    try {
        // Show loading state
        const importBtn = document.getElementById(`import-${platform}-btn`);
        const originalText = importBtn ? importBtn.textContent : '';
        if (importBtn) {
            importBtn.disabled = true;
            importBtn.textContent = 'Importing...';
        }

        console.log(`Starting import from ${platform}: ${url}`);
        const platformData = await dropshippingManager.importFromURL(url);
        const mappedData = dropshippingManager.mapDropshippingToProduct(platformData);

        // Reset button
        if (importBtn) {
            importBtn.disabled = false;
            importBtn.textContent = originalText;
        }

        // Fill wizard with imported data
        wizardProductData = {
            ...wizardProductData,
            ...mappedData
        };

        // Ensure we are in the wizard section and sync data
        if (typeof showPostItemWizard === 'function') {
            showPostItemWizard();
        } else {
            switchSection('post-item');
        }
        syncWizardDataToForm();

        // Auto-enable dropshipping toggle
        const isDropshipped = document.getElementById('wizard-is-dropshipped');
        if (isDropshipped) {
            isDropshipped.checked = true;
            const dropshipFields = document.getElementById('wizard-dropshipping-fields');
            if (dropshipFields) dropshipFields.classList.remove('hidden');
        }

        // Scroll to the first field to show it worked
        const titleField = document.getElementById('wizard-product-title');
        if (titleField) {
            titleField.focus();
            titleField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        alert(`Success! Product ID ${mappedData.dropship_product_id} imported from ${platformName}.\n\nNote: In this development version, details like title and description should be reviewed/completed manually.`);
    } catch (error) {
        console.error('Import error:', error);
        alert(`Failed to import from ${platformName}.\n\nError: ${error.message}\n\nPlease ensure the URL matches the expected pattern.`);

        // Reset button on error
        const importBtn = document.getElementById(`import-${platform}-btn`);
        if (importBtn) {
            importBtn.disabled = false;
            importBtn.textContent = platform === 'temu' ? 'Import from Temu' : 'Import from AliExpress';
        }
    }
}

function handleWizardFileUpload(files) {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            if (!wizardProductData.image_url) {
                wizardProductData.image_url = dataUrl;
            }
            if (!wizardProductData.image_urls.includes(dataUrl)) {
                wizardProductData.image_urls.push(dataUrl);
            }

            // Display in gallery
            const gallery = document.getElementById('wizard-media-gallery');
            const previewContainer = document.getElementById('wizard-preview-container');
            if (gallery && previewContainer) {
                previewContainer.classList.remove('hidden');
                const isVideo = file.type.startsWith('video/');
                const mediaEl = document.createElement('div');
                mediaEl.className = 'relative rounded-lg overflow-hidden border border-gray-300';
                mediaEl.innerHTML = `
                    ${isVideo
                        ? `<video src="${dataUrl}" class="w-full h-32 object-cover" controls></video>`
                        : `<img src="${dataUrl}" class="w-full h-32 object-cover">`
                    }
                    <button type="button" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 text-xs remove-media-btn">×</button>
                `;
                gallery.appendChild(mediaEl);

                // Remove button handler
                mediaEl.querySelector('.remove-media-btn').addEventListener('click', () => {
                    mediaEl.remove();
                    wizardProductData.image_urls = wizardProductData.image_urls.filter(url => url !== dataUrl);
                    if (wizardProductData.image_url === dataUrl) {
                        wizardProductData.image_url = wizardProductData.image_urls[0] || '';
                    }
                    if (gallery.children.length === 0) {
                        previewContainer.classList.add('hidden');
                    }
                });
            }
        };
        reader.readAsDataURL(file);
    });
}

function updateWidgetStats() {
    // Update widget stats
    const totalProducts = currentProducts.length;
    const drafts = JSON.parse(localStorage.getItem('product_drafts') || '[]').length;
    const lowStock = currentProducts.filter(p => (p.stock_quantity || 0) < (p.low_stock_threshold || 10)).length;

    const totalProductsEl = document.getElementById('widget-total-products');
    const draftsEl = document.getElementById('widget-drafts');
    const lowStockEl = document.getElementById('widget-low-stock');

    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (draftsEl) draftsEl.textContent = drafts;
    if (lowStockEl) lowStockEl.textContent = lowStock;
}

async function loadProductIntoWizard(productId) {
    const products = await getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    wizardProductData = {
        stock_quantity: product.stock_quantity || 0,
        stock_location: product.stock_location || '',
        low_stock_threshold: product.low_stock_threshold || 10,
        title: product.title || '',
        price: product.price || 0,
        category: product.category || '',
        zodiac: product.zodiac || '',
        description: product.description || '',
        image_url: product.image_url || '',
        image_urls: product.image_urls || [],
        sku: product.sku || '',
        is_dropshipped: product.is_dropshipped || false,
        dropship_source: product.dropship_source || '',
        dropship_product_id: product.dropship_product_id || '',
        dropship_api_data: product.dropship_api_data || null
    };

    syncWizardDataToForm();
}

// Marketing & Growth Center Functions

function loadRecentActivity() {
    const feed = document.getElementById('recent-activity-feed');
    if (!feed) return;

    // Mock recent activity data with SVG icons
    const mockActivities = [
        {
            type: 'purchase',
            user: 'Customer',
            product: 'Crystal Necklace',
            time: '2 minutes ago',
            icon: '<svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>'
        },
        {
            type: 'view',
            user: 'Visitor',
            product: 'Zodiac Ring',
            time: '5 minutes ago',
            icon: '<svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>'
        },
        {
            type: 'cart_add',
            user: 'Customer',
            product: 'Moonstone Bracelet',
            time: '12 minutes ago',
            icon: '<svg class="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>'
        },
        {
            type: 'message',
            user: 'Customer',
            message: 'Asked about shipping',
            time: '18 minutes ago',
            icon: '<svg class="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>'
        }
    ];

    feed.innerHTML = mockActivities.map(activity => `
        <div class="flex items-center gap-2 p-1.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
            ${activity.icon}
            <span class="flex-1 truncate text-gray-700">
                ${activity.type === 'message' ? activity.message : activity.product}
            </span>
            <span class="text-gray-400 text-[9px]">${activity.time.replace(' minutes ago', 'm').replace(' ago', '')}</span>
        </div>
    `).join('');
}

function loadMarketingMetrics() {
    // Mock metrics data
    const visitorsToday = document.getElementById('metric-visitors-today');
    const conversionRate = document.getElementById('metric-conversion-rate');
    const popularProduct = document.getElementById('metric-popular-product');
    const topZodiac = document.getElementById('metric-top-zodiac');

    if (visitorsToday) visitorsToday.textContent = Math.floor(Math.random() * 100 + 20);
    if (conversionRate) conversionRate.textContent = `${(Math.random() * 5 + 2).toFixed(1)}%`;
    if (popularProduct) popularProduct.textContent = 'Crystal Necklace';

    const zodiacSymbols = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
    if (topZodiac) topZodiac.textContent = zodiacSymbols[Math.floor(Math.random() * zodiacSymbols.length)];
}

function initContentCalendar() {
    const calendarContainer = document.getElementById('content-calendar-week');
    if (!calendarContainer) return;

    const today = new Date();
    const dayOfWeek = today.getDay();

    // Platform colors for mock scheduled posts
    const platforms = [
        { color: 'bg-purple-400', label: 'W' }, // Whatnot
        { color: 'bg-pink-400', label: 'I' },   // Instagram
        { color: 'bg-gray-800', label: 'T' },   // TikTok
        { color: 'bg-blue-400', label: 'F' }    // Facebook
    ];

    let calendarHTML = '';
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - dayOfWeek + i);
        const dayNum = date.getDate();
        const isToday = i === dayOfWeek;

        // Random mock posts for some days
        const hasPosts = Math.random() > 0.5;
        const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];

        calendarHTML += `
            <div class="text-center p-2 rounded ${isToday ? 'bg-[#D2B48C] text-white' : 'bg-gray-50'}">
                <span class="text-xs font-bold">${dayNum}</span>
                ${hasPosts ? `<div class="w-4 h-4 ${randomPlatform.color} rounded-full mx-auto mt-1 text-white text-[8px] flex items-center justify-center">${randomPlatform.label}</div>` : '<div class="h-5"></div>'}
            </div>
        `;
    }
    calendarContainer.innerHTML = calendarHTML;
}
