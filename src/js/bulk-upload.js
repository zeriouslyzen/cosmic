// Bulk Upload Functionality
import { createProduct } from './owner.js';

let bulkUploadFiles = [];
let manualProducts = [];
let currentBulkMethod = 'files';

export function showBulkUploadModal() {
    const modal = document.getElementById('bulk-upload-modal-overlay');
    if (modal) {
        modal.classList.remove('hidden');
        resetBulkUpload();
    }
}

export function hideBulkUploadModal() {
    const modal = document.getElementById('bulk-upload-modal-overlay');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function resetBulkUpload() {
    bulkUploadFiles = [];
    manualProducts = [];
    currentBulkMethod = 'files';
    
    const filesPreview = document.getElementById('bulk-files-preview');
    const filesCount = document.getElementById('bulk-files-count');
    const manualList = document.getElementById('manual-products-list');
    
    if (filesPreview) filesPreview.innerHTML = '';
    if (filesCount) filesCount.textContent = '0';
    if (manualList) manualList.innerHTML = '';
    
    switchBulkMethod('files');
}

function switchBulkMethod(method) {
    currentBulkMethod = method;
    
    // Update tabs
    document.querySelectorAll('.bulk-tab-btn').forEach(btn => {
        if (btn.dataset.method === method) {
            btn.classList.add('active', 'text-white', 'border-b-2', 'border-tan-500');
            btn.classList.remove('text-gray-400');
        } else {
            btn.classList.remove('active', 'text-white', 'border-b-2', 'border-tan-500');
            btn.classList.add('text-gray-400');
        }
    });
    
    // Update content
    document.querySelectorAll('.bulk-method-content').forEach(content => {
        if (content.id === `bulk-method-${method}`) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
}

// File upload method
function handleBulkFiles(files) {
    Array.from(files).forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            alert(`File ${file.name} is too large (max 10MB)`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            bulkUploadFiles.push({
                file: file,
                dataUrl: e.target.result,
                type: file.type.startsWith('image/') ? 'image' : 'video',
                name: file.name.replace(/\.[^/.]+$/, '') // Remove extension
            });
            updateBulkFilesPreview();
        };
        
        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsDataURL(file);
        }
    });
}

function updateBulkFilesPreview() {
    const preview = document.getElementById('bulk-files-preview');
    const count = document.getElementById('bulk-files-count');
    
    if (count) count.textContent = bulkUploadFiles.length;
    if (!preview) return;
    
    preview.innerHTML = bulkUploadFiles.map((item, index) => `
        <div class="relative group">
            <div class="aspect-square bg-gray-900 rounded overflow-hidden border border-gray-700">
                ${item.type === 'image' 
                    ? `<img src="${item.dataUrl}" class="w-full h-full object-cover">`
                    : `<video src="${item.dataUrl}" class="w-full h-full object-cover" muted></video>`
                }
            </div>
            <button onclick="removeBulkFile(${index})" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
            <input type="text" value="${item.name}" onchange="updateBulkFileName(${index}, this.value)" 
                   class="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs" 
                   placeholder="Product name">
        </div>
    `).join('');
}

window.removeBulkFile = (index) => {
    bulkUploadFiles.splice(index, 1);
    updateBulkFilesPreview();
};

window.updateBulkFileName = (index, name) => {
    if (bulkUploadFiles[index]) {
        bulkUploadFiles[index].name = name;
    }
};

// CSV import method
function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const products = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const product = {};
            headers.forEach((header, i) => {
                product[header] = values[i] || '';
            });
            return product;
        });
        
        showCSVPreview(products);
    };
    reader.readAsText(file);
}

function showCSVPreview(products) {
    const preview = document.getElementById('csv-preview');
    const table = document.getElementById('csv-preview-table');
    
    if (!preview || !table) return;
    
    preview.classList.remove('hidden');
    
    const headers = ['title', 'price', 'zodiac', 'category', 'description', 'image_url'];
    table.innerHTML = `
        <thead>
            <tr class="border-b border-gray-700">
                ${headers.map(h => `<th class="text-left p-2">${h}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${products.slice(0, 10).map(p => `
                <tr class="border-b border-gray-800">
                    ${headers.map(h => `<td class="p-2">${(p[h] || '').substring(0, 20)}</td>`).join('')}
                </tr>
            `).join('')}
        </tbody>
    `;
    
    // Store for saving
    window.csvProducts = products;
}

// Manual entry method
function addManualProduct() {
    manualProducts.push({
        title: '',
        price: '',
        zodiac: '',
        category: '',
        description: '',
        image_url: ''
    });
    updateManualProductsList();
}

function updateManualProductsList() {
    const list = document.getElementById('manual-products-list');
    if (!list) return;
    
    list.innerHTML = manualProducts.map((product, index) => `
        <div class="glass-card rounded p-3 space-y-2">
            <div class="flex justify-between items-center mb-2">
                <h5 class="text-white text-sm font-semibold">Product ${index + 1}</h5>
                <button onclick="removeManualProduct(${index})" class="text-red-400 hover:text-red-300 text-xs">Remove</button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <input type="text" value="${product.title}" onchange="updateManualProduct(${index}, 'title', this.value)" 
                       placeholder="Title" class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs">
                <input type="number" value="${product.price}" onchange="updateManualProduct(${index}, 'price', this.value)" 
                       placeholder="Price" step="0.01" class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs">
            </div>
            <div class="grid grid-cols-2 gap-2">
                <select onchange="updateManualProduct(${index}, 'zodiac', this.value)" 
                        class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs">
                    <option value="">All</option>
                    <option value="aries">Aries</option>
                    <option value="taurus">Taurus</option>
                    <option value="gemini">Gemini</option>
                    <option value="cancer">Cancer</option>
                    <option value="leo">Leo</option>
                    <option value="virgo">Virgo</option>
                    <option value="libra">Libra</option>
                    <option value="scorpio">Scorpio</option>
                    <option value="sagittarius">Sagittarius</option>
                    <option value="capricorn">Capricorn</option>
                    <option value="aquarius">Aquarius</option>
                    <option value="pisces">Pisces</option>
                </select>
                <input type="text" value="${product.category}" onchange="updateManualProduct(${index}, 'category', this.value)" 
                       placeholder="Category" class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs">
            </div>
            <textarea onchange="updateManualProduct(${index}, 'description', this.value)" 
                      placeholder="Description" rows="2" 
                      class="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs">${product.description}</textarea>
            <input type="url" value="${product.image_url}" onchange="updateManualProduct(${index}, 'image_url', this.value)" 
                   placeholder="Image URL" class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs">
        </div>
    `).join('');
}

window.removeManualProduct = (index) => {
    manualProducts.splice(index, 1);
    updateManualProductsList();
};

window.updateManualProduct = (index, field, value) => {
    if (manualProducts[index]) {
        manualProducts[index][field] = value;
    }
};

// Save all products
export async function saveBulkProducts() {
    const defaultZodiac = document.getElementById('bulk-default-zodiac')?.value || '';
    const defaultCategory = document.getElementById('bulk-default-category')?.value || '';
    
    let productsToSave = [];
    
    if (currentBulkMethod === 'files') {
        productsToSave = bulkUploadFiles.map(item => ({
            title: item.name || 'Untitled Product',
            price: 0, // Will need to be set manually or via form
            zodiac: defaultZodiac,
            category: defaultCategory,
            description: '',
            image_url: item.dataUrl
        }));
    } else if (currentBulkMethod === 'csv') {
        productsToSave = window.csvProducts || [];
    } else if (currentBulkMethod === 'manual') {
        productsToSave = manualProducts.filter(p => p.title && p.price);
    }
    
    if (productsToSave.length === 0) {
        alert('No products to save');
        return;
    }
    
    // Apply defaults
    productsToSave = productsToSave.map(p => ({
        ...p,
        zodiac: p.zodiac || defaultZodiac,
        category: p.category || defaultCategory,
        price: parseFloat(p.price) || 0
    }));
    
    // Save all products
    let successCount = 0;
    for (const product of productsToSave) {
        const result = await createProduct(product);
        if (result) successCount++;
    }
    
    alert(`Successfully saved ${successCount} out of ${productsToSave.length} products`);
    hideBulkUploadModal();
    
    // Trigger refresh
    if (typeof window.loadProducts === 'function') {
        await window.loadProducts();
    }
    
    // Notify main site
    window.dispatchEvent(new CustomEvent('products-updated'));
}

// Initialize bulk upload handlers
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.bulk-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchBulkMethod(btn.dataset.method);
        });
    });
    
    // File upload
    const bulkFilesInput = document.getElementById('bulk-files-input');
    const bulkSelectFiles = document.getElementById('bulk-select-files');
    const bulkUploadArea = document.querySelector('#bulk-method-files .border-dashed');
    
    if (bulkSelectFiles && bulkFilesInput) {
        bulkSelectFiles.addEventListener('click', () => bulkFilesInput.click());
    }
    
    if (bulkFilesInput) {
        bulkFilesInput.addEventListener('change', (e) => {
            handleBulkFiles(e.target.files);
        });
    }
    
    if (bulkUploadArea) {
        bulkUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            bulkUploadArea.classList.add('border-tan-500');
        });
        bulkUploadArea.addEventListener('dragleave', () => {
            bulkUploadArea.classList.remove('border-tan-500');
        });
        bulkUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            bulkUploadArea.classList.remove('border-tan-500');
            handleBulkFiles(e.dataTransfer.files);
        });
    }
    
    // CSV import
    const csvFileInput = document.getElementById('csv-file-input');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleCSVFile(file);
        });
    }
    
    // Manual entry
    const addManualBtn = document.getElementById('add-manual-product');
    if (addManualBtn) {
        addManualBtn.addEventListener('click', addManualProduct);
    }
    
    // Save button
    const bulkSaveBtn = document.getElementById('bulk-upload-save');
    if (bulkSaveBtn) {
        bulkSaveBtn.addEventListener('click', saveBulkProducts);
    }
    
    // Close buttons
    const bulkCloseBtn = document.getElementById('bulk-upload-close');
    const bulkCancelBtn = document.getElementById('bulk-upload-cancel');
    [bulkCloseBtn, bulkCancelBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', hideBulkUploadModal);
        }
    });
});

