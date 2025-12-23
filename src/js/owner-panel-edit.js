// Manages edit mode for About and Live slide panels

import { supabase } from './supabase.js';
import { toast } from './utils/toast.js';

class OwnerPanelEditor {
    constructor() {
        this.isOwner = false;
        this.editMode = false;
        this.currentPanel = null;
        this.originalContent = {};
        this.init();
    }

    async init() {
        // Check if user is owner
        await this.checkOwnerStatus();

        // Set up panel event listeners
        this.setupPanelListeners();

        // Load saved content from Supabase
        if (this.isOwner) {
            await this.loadPanelContent();
        }
    }

    async checkOwnerStatus() {
        // Check localStorage for owner email
        const ownerEmail = localStorage.getItem('owner_email');

        if (ownerEmail) {
            this.isOwner = true;
            return;
        }

        // Check Supabase auth
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Check if user is owner (you can add custom claim or specific email check)
                // For now, using a simple check - you can customize this
                const ownerEmails = ['owner@cosmic-deals.com']; // Add your owner email
                this.isOwner = ownerEmails.includes(user.email);
            }
        } catch (error) {
            console.log('Auth check skipped (Supabase not configured)');
        }
    }

    setupPanelListeners() {
        // Listen for panel open events
        const aboutTrigger = document.getElementById('about-trigger');
        const liveTrigger = document.getElementById('live-trigger');

        if (aboutTrigger) {
            aboutTrigger.addEventListener('click', () => {
                setTimeout(() => this.initializePanel('about'), 300);
            });
        }

        if (liveTrigger) {
            liveTrigger.addEventListener('click', () => {
                setTimeout(() => this.initializePanel('live'), 300);
            });
        }
    }

    initializePanel(panelType) {
        const panel = document.getElementById(`${panelType}-panel`);
        if (!panel) return;

        this.currentPanel = panelType;

        // Show edit button if owner
        if (this.isOwner) {
            const editBtn = panel.querySelector('.panel-edit-btn');
            if (editBtn) {
                editBtn.style.display = 'block';
            }
        }
    }

    toggleEditMode(panelType) {
        this.editMode = !this.editMode;
        const panel = document.getElementById(`${panelType}-panel`);
        if (!panel) return;

        if (this.editMode) {
            // Enter edit mode
            this.enterEditMode(panel, panelType);
        } else {
            // Exit edit mode
            this.exitEditMode(panel, panelType);
        }
    }

    enterEditMode(panel, panelType) {
        // Save original content for cancel
        this.saveOriginalContent(panel);

        // Make text editable
        const editableElements = panel.querySelectorAll('[data-editable]');
        editableElements.forEach(el => {
            el.contentEditable = true;
            el.classList.add('editing');
        });

        // Show upload controls
        const profileUpload = panel.querySelector('.owner-profile-upload');
        const storefrontUpload = panel.querySelector('.owner-storefront-upload');

        if (profileUpload) profileUpload.style.display = 'block';
        if (storefrontUpload) storefrontUpload.style.display = 'block';

        // Show save/cancel buttons
        const controls = panel.querySelector('.panel-editor-controls');
        if (controls) controls.style.display = 'flex';

        // Update edit button text
        const editBtn = panel.querySelector('.panel-edit-btn');
        if (editBtn) editBtn.textContent = 'Editing...';
    }

    exitEditMode(panel, panelType, save = false) {
        // Make text non-editable
        const editableElements = panel.querySelectorAll('[data-editable]');
        editableElements.forEach(el => {
            el.contentEditable = false;
            el.classList.remove('editing');
        });

        // Hide upload controls
        const profileUpload = panel.querySelector('.owner-profile-upload');
        const storefrontUpload = panel.querySelector('.owner-storefront-upload');

        if (profileUpload) profileUpload.style.display = 'none';
        if (storefrontUpload) storefrontUpload.style.display = 'none';

        // Hide save/cancel buttons
        const controls = panel.querySelector('.panel-editor-controls');
        if (controls) controls.style.display = 'none';

        // Update edit button text
        const editBtn = panel.querySelector('.panel-edit-btn');
        if (editBtn) editBtn.textContent = 'Edit';
    }

    saveOriginalContent(panel) {
        const editableElements = panel.querySelectorAll('[data-editable]');
        this.originalContent = {};

        editableElements.forEach(el => {
            const key = el.dataset.editable;
            this.originalContent[key] = el.innerHTML;
        });
    }

    restoreOriginalContent(panel) {
        const editableElements = panel.querySelectorAll('[data-editable]');

        editableElements.forEach(el => {
            const key = el.dataset.editable;
            if (this.originalContent[key]) {
                el.innerHTML = this.originalContent[key];
            }
        });
    }

    async saveChanges(panelType) {
        const panel = document.getElementById(`${panelType}-panel`);
        if (!panel) return;

        // Collect all editable content
        const editableElements = panel.querySelectorAll('[data-editable]');
        const content = {};

        editableElements.forEach(el => {
            const key = el.dataset.editable;
            content[key] = el.innerHTML;
        });

        // Get image URLs
        const profileImg = panel.querySelector('.owner-profile-pic img');
        const storefrontImg = panel.querySelector('.owner-storefront-img img');

        if (profileImg) content.profileImage = profileImg.src;
        if (storefrontImg) content.storefrontImage = storefrontImg.src;

        // Save to Supabase
        try {
            const settingKey = `${panelType}_panel_content`;
            console.log(`Attempting to save ${panelType} content to Supabase...`, content);

            const { error } = await supabase
                .from('owner_settings')
                .upsert({
                    key: settingKey,
                    value: content,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'key'
                });

            if (error) {
                console.error(`Supabase save error for ${panelType}:`, error);
                throw error;
            }

            console.log(`${panelType} panel content saved successfully to Supabase`);
            toast.success('Changes saved to cloud!');

        } catch (error) {
            console.error('Save failed, falling back to localStorage:', error);
            const settingKey = `${panelType}_panel_content`;

            try {
                localStorage.setItem(settingKey, JSON.stringify(content));
                console.log(`${panelType} panel content saved to localStorage fallback`);
                toast.warning('Offline: Changes saved locally only.');
            } catch (e) {
                console.error('LocalStorage fallback also failed:', e);
                toast.error('Failed to save changes. Content too large?');
            }
        }

        this.exitEditMode(panel, panelType, true);
    }

    cancelChanges(panelType) {
        const panel = document.getElementById(`${panelType}-panel`);
        if (!panel) return;

        // Restore original content
        this.restoreOriginalContent(panel);

        // Exit edit mode
        this.exitEditMode(panel, panelType, false);
    }

    async loadPanelContent() {
        // Load About panel content
        await this.loadSinglePanelContent('about');

        // Load Live panel content
        await this.loadSinglePanelContent('live');
    }

    async loadSinglePanelContent(panelType) {
        const settingKey = `${panelType}_panel_content`;
        let content = null;

        // Try loading from Supabase
        try {
            const { data, error } = await supabase
                .from('owner_settings')
                .select('value')
                .eq('key', settingKey)
                .single();

            if (!error && data) {
                content = data.value;
            }
        } catch (error) {
            console.log(`Supabase not configured, using localStorage for ${panelType}`);
        }

        // Fallback to localStorage
        if (!content) {
            const stored = localStorage.getItem(settingKey);
            if (stored) {
                content = JSON.parse(stored);
            }
        }

        // Apply content to panel
        if (content) {
            this.applyContentToPanel(panelType, content);
        }
    }

    applyContentToPanel(panelType, content) {
        const panel = document.getElementById(`${panelType}-panel`);
        if (!panel) return;

        // Apply text content
        Object.keys(content).forEach(key => {
            if (key === 'profileImage' || key === 'storefrontImage') return;

            const element = panel.querySelector(`[data-editable="${key}"]`);
            if (element) {
                element.innerHTML = content[key];
            }
        });

        // Apply images
        if (content.profileImage) {
            const profileImg = panel.querySelector('.owner-profile-pic img');
            if (profileImg) profileImg.src = content.profileImage;
        }

        if (content.storefrontImage) {
            const storefrontImg = panel.querySelector('.owner-storefront-img img');
            if (storefrontImg) storefrontImg.src = content.storefrontImage;
        }
    }

    async handleImageUpload(panelType, imageType, file) {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.warning('Image size must be less than 5MB');
            return;
        }

        try {
            // Try uploading to Supabase storage
            const fileName = `${panelType}-${imageType}-${Date.now()}.${file.name.split('.').pop()}`;
            const filePath = `${imageType}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('panel-images')
                .upload(filePath, file);

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('panel-images')
                .getPublicUrl(filePath);

            // Update image in panel
            this.updatePanelImage(panelType, imageType, publicUrl);

        } catch (error) {
            console.log('Supabase storage not configured, using data URL');

            // Fallback to data URL (base64)
            const reader = new FileReader();
            reader.onload = (e) => {
                this.updatePanelImage(panelType, imageType, e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    updatePanelImage(panelType, imageType, imageUrl) {
        const panel = document.getElementById(`${panelType}-panel`);
        if (!panel) return;

        const imgElement = panel.querySelector(`.owner-${imageType}-pic img, .owner-${imageType}-img img`);
        if (imgElement) {
            imgElement.src = imageUrl;
            imgElement.style.display = 'block';
        }
    }
}

// Initialize panel editor when DOM is ready and expose to window
let panelEditor;

document.addEventListener('DOMContentLoaded', () => {
    panelEditor = new OwnerPanelEditor();
    // Expose to window for inline onclick handlers
    window.panelEditor = panelEditor;
});

// Export for use in other modules
export { panelEditor, OwnerPanelEditor };
