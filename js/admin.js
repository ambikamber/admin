document.addEventListener('DOMContentLoaded', () => {
    // Handle landing page loader with a more professional animation
    const landingLoader = document.querySelector('.landing-loader');
    const loaderText = document.querySelector('.loader-text');
    
    if (landingLoader) {
        // Array of loading messages to display
        const loadingMessages = [
            "Initializing dashboard...",
            "Loading product data...",
            "Preparing admin interface...",
            "Almost ready..."
        ];
        
        let messageIndex = 0;
        
        // Change loading message every 1.2 seconds
        const messageInterval = setInterval(() => {
            if (messageIndex < loadingMessages.length - 1) {
                messageIndex++;
                loaderText.textContent = loadingMessages[messageIndex];
            } else {
                clearInterval(messageInterval);
            }
        }, 1200);
        
        // Simulate a more realistic loading time (2.5 seconds)
        setTimeout(() => {
            // Add class for smooth fade out
            landingLoader.classList.add('fade-out');
            
            // Remove from DOM after transition completes
            setTimeout(() => {
                landingLoader.remove();
                clearInterval(messageInterval);
            }, 700); // Match this with the CSS transition time
        }, 4000); // 4 seconds total loading time
    }

    // Initialize the admin panel once products and categories are loaded
    document.addEventListener('products-loaded', () => {
        loadProductTable();
        setupEventListeners();
        initializePanels();
    });
    
    document.addEventListener('categories-loaded', () => {
        loadCategoryList();
    });
});

// Initialize panels
function initializePanels() {
    // Hide all panels initially
    document.querySelectorAll('.admin-panel').forEach(panel => {
        if (panel.id !== 'products') {
            panel.style.display = 'none';
        }
    });
    
    // Add event listeners for navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            // Prevent default action
            e.preventDefault();
            
            // Get target panel id
            const targetId = link.getAttribute('href').substring(1);
            
            // Hide all panels
            document.querySelectorAll('.admin-panel').forEach(panel => {
                panel.style.display = 'none';
            });
            
            // Show target panel
            document.getElementById(targetId).style.display = 'block';
            
            // Update active link
            document.querySelectorAll('.nav-links a').forEach(navLink => {
                navLink.classList.remove('active');
            });
            link.classList.add('active');
            
            // Close mobile menu when a link is clicked
            closeMobileMenu();
        });
    });
}

// Load products into the table
async function loadProductTable(sortOption = null, searchQuery = null) {
    const tableBody = document.getElementById('product-table-body');
    tableBody.innerHTML = '';
    
    // Show loading indicator
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-indicator">Loading products...</td></tr>';
    
    try {
        let products = await productManager.getAllProducts();
        
        // Apply search filter if specified
        if (searchQuery) {
            const query = searchQuery.toLowerCase().trim();
            products = products.filter(product => 
                product.title.toLowerCase().includes(query)
            );
        } else {
            // Get search query from input if available
            const searchInput = document.getElementById('product-search');
            if (searchInput && searchInput.value.trim()) {
                const query = searchInput.value.toLowerCase().trim();
                products = products.filter(product => 
                    product.title.toLowerCase().includes(query)
                );
            }
        }
        
        // Apply sorting if specified
        if (sortOption) {
            products = sortProducts(products, sortOption);
        } else {
            // Get sort option from select if available
            const sortSelect = document.getElementById('product-sort');
            if (sortSelect && sortSelect.value) {
                products = sortProducts(products, sortSelect.value);
            }
        }
        
        // Clear loading indicator
        tableBody.innerHTML = '';
        
        if (products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="empty-message">No products found. Add your first product!</td></tr>';
            return;
        }
        
        products.forEach(product => {
            const row = createProductRow(product);
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading product table:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="error-message">Error loading products. Please try again.</td></tr>';
    }
}

// Sort products based on the selected option
function sortProducts(products, sortOption) {
    switch (sortOption) {
        case 'title-asc':
            return products.sort((a, b) => a.title.localeCompare(b.title));
        case 'title-desc':
            return products.sort((a, b) => b.title.localeCompare(a.title));
        case 'price-asc':
            return products.sort((a, b) => a.price - b.price);
        case 'price-desc':
            return products.sort((a, b) => b.price - a.price);
        case 'category-asc':
            return products.sort((a, b) => a.category.localeCompare(b.category));
        case 'newest':
            return products.sort((a, b) => {
                // Sort by createdAt timestamp if available
                const aTime = a.createdAt ? a.createdAt.toDate().getTime() : 0;
                const bTime = b.createdAt ? b.createdAt.toDate().getTime() : 0;
                return bTime - aTime; // Newest first
            });
        default:
            return products;
    }
}

// Create a table row for a product
function createProductRow(product) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${product.id.substring(0, 8)}...</td>
        <td><img src="${product.image}" alt="${product.title}" onerror="this.src='https://via.placeholder.com/60x60?text=No+Image'"></td>
        <td>${product.title}</td>
        <td>${product.category}</td>
        <td>₹${product.price.toFixed(2)}</td>
        <td class="product-actions">
            <button class="edit-btn" data-id="${product.id}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" data-id="${product.id}">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    return row;
}

// Load categories into the list
async function loadCategoryList() {
    const categoryList = document.getElementById('category-list');
    if (!categoryList) return;
    
    categoryList.innerHTML = '<li class="loading-indicator">Loading categories...</li>';
    
    try {
        const categories = await productManager.getAllCategories();
        
        // Clear loading indicator
        categoryList.innerHTML = '';
        
        if (categories.length === 0) {
            categoryList.innerHTML = '<li class="empty-message">No categories found.</li>';
            return;
        }
        
        // Load category select options
        await loadCategoryOptions();
        
        // For each category, create a list item
        for (const category of categories) {
            const count = await productManager.getCategoryUsageCount(category);
            const isInUse = count > 0;
            
            const li = document.createElement('li');
            li.className = isInUse ? 'in-use' : '';
            li.innerHTML = `
                <div class="category-info">
                    <span class="category-name">${category}</span>
                    <span class="category-count">${count} product${count !== 1 ? 's' : ''}</span>
                </div>
                <button class="delete-category-btn" data-category="${category}" ${isInUse ? 'disabled' : ''}>
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            categoryList.appendChild(li);
        }
    } catch (error) {
        console.error('Error loading category list:', error);
        categoryList.innerHTML = '<li class="error-message">Error loading categories. Please try again.</li>';
    }
}

// Load category options into select elements
async function loadCategoryOptions() {
    const categorySelects = document.querySelectorAll('select#product-category');
    if (!categorySelects.length) return;
    
    try {
        const categories = await productManager.getAllCategories();
        
        categorySelects.forEach(select => {
            // Save current value if it exists
            const currentValue = select.value;
            
            // Clear options
            select.innerHTML = '';
            
            // Add options for each category
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category.charAt(0).toUpperCase() + category.slice(1); // Capitalize first letter
                select.appendChild(option);
            });
            
            // Restore selected value if it exists and is still valid
            if (currentValue && categories.includes(currentValue)) {
                select.value = currentValue;
            }
        });
    } catch (error) {
        console.error('Error loading category options:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add product button
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            openProductModal();
        });
    }
    
    // Product search input
    const productSearch = document.getElementById('product-search');
    if (productSearch) {
        // Debounce search to avoid too many reloads
        let searchTimeout;
        productSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const sortSelect = document.getElementById('product-sort');
                const currentSort = sortSelect ? sortSelect.value : null;
                loadProductTable(currentSort, productSearch.value);
                
                // Toggle clear button visibility
                const clearBtn = document.getElementById('search-clear-btn');
                if (clearBtn) {
                    clearBtn.style.display = productSearch.value ? 'block' : 'none';
                }
            }, 300); // 300ms debounce
        });
    }
    
    // Search clear button
    const searchClearBtn = document.getElementById('search-clear-btn');
    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            const productSearch = document.getElementById('product-search');
            if (productSearch) {
                productSearch.value = '';
                searchClearBtn.style.display = 'none';
                
                // Reload products without search filter
                const sortSelect = document.getElementById('product-sort');
                const currentSort = sortSelect ? sortSelect.value : null;
                loadProductTable(currentSort, '');
            }
        });
    }
    
    // Product sort dropdown
    const productSort = document.getElementById('product-sort');
    if (productSort) {
        productSort.addEventListener('change', () => {
            const productSearch = document.getElementById('product-search');
            const currentSearch = productSearch ? productSearch.value : null;
            loadProductTable(productSort.value, currentSearch);
        });
    }
    
    // Add category button
    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', async () => {
            await addCategory();
        });
    }
    
    // New category input - allow Enter key to submit
    const newCategoryInput = document.getElementById('new-category');
    if (newCategoryInput) {
        newCategoryInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await addCategory();
            }
        });
    }
    
    // Delete category buttons
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-category-btn:not([disabled])')) {
            const button = e.target.closest('.delete-category-btn');
            const category = button.getAttribute('data-category');
            openDeleteCategoryModal(category);
        }
    });
    
    // Edit product buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.edit-btn')) {
            const button = e.target.closest('.edit-btn');
            const productId = button.getAttribute('data-id');
            openProductModal(productId);
        }
    });
    
    // Delete product buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) {
            const button = e.target.closest('.delete-btn');
            const productId = button.getAttribute('data-id');
            openDeleteModal(productId);
        }
    });
    
    // Close modal buttons
    const closeButtons = document.querySelectorAll('.close-modal, .cancel-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            closeAllModals();
        });
    });
    
    // Product form submission
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveProduct();
        });
    }
    
    // Delete product confirmation
    const deleteProductBtn = document.querySelector('#delete-modal .delete-btn');
    if (deleteProductBtn) {
        deleteProductBtn.addEventListener('click', async () => {
            const productId = deleteProductBtn.getAttribute('data-id');
            await deleteProduct(productId);
        });
    }
    
    // Delete category confirmation
    const deleteCategoryBtn = document.querySelector('#delete-category-modal .delete-btn');
    if (deleteCategoryBtn) {
        deleteCategoryBtn.addEventListener('click', async () => {
            const category = deleteCategoryBtn.getAttribute('data-category');
            await deleteCategory(category);
        });
    }
    
    // Setup image drag and drop functionality
    setupImageDragAndDrop();
    
    // Image URL input for preview (for backward compatibility)
    const imageInput = document.getElementById('product-image');
    const imagePreview = document.getElementById('image-preview');
    
    if (imageInput && imagePreview) {
        imageInput.addEventListener('input', () => {
            if (imageInput.value && !imageInput.value.startsWith('data:image')) {
                updateImagePreview(imageInput.value, imagePreview);
            }
        });
    }
    
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            navLinks.classList.toggle('active');
            
            // Toggle icon between bars and times
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                if (icon.classList.contains('fa-bars')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }
    
    // Close mobile menu when clicking on external links
    const externalLinks = document.querySelectorAll('.nav-links a:not([href^="#"])');
    externalLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Close mobile menu if open
            closeMobileMenu();
            
            // Handle logout
            firebase.auth().signOut().then(() => {
                // Redirect to login page or show login form
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error('Error signing out:', error);
                showNotification('Error signing out. Please try again.', 'error');
            });
        });
    }
}

// Function to close mobile menu
function closeMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    
    if (navLinks && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        
        // Change icon back to bars
        const icon = mobileMenuBtn?.querySelector('i');
        if (icon && icon.classList.contains('fa-times')) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
}

// Add a new category
async function addCategory() {
    const newCategoryInput = document.getElementById('new-category');
    if (!newCategoryInput) return;
    
    const categoryName = newCategoryInput.value.trim();
    if (!categoryName) {
        showNotification('Please enter a category name', 'error');
        return;
    }
    
    try {
        showLoadingOverlay('Adding category...');
        await productManager.addCategory(categoryName);
        
        // Clear input
        newCategoryInput.value = '';
        
        // Reload category list
        await loadCategoryList();
        
        hideLoadingOverlay();
        showNotification('Category added successfully!');
    } catch (error) {
        hideLoadingOverlay();
        showNotification(error.message || 'Error adding category', 'error');
    }
}

// Delete a category
async function deleteCategory(categoryName) {
    try {
        showLoadingOverlay('Deleting category...');
        await productManager.deleteCategory(categoryName);
        
        // Reload category list
        await loadCategoryList();
        
        // Close modal
        closeAllModals();
        
        hideLoadingOverlay();
        showNotification('Category deleted successfully!');
    } catch (error) {
        hideLoadingOverlay();
        showNotification(error.message || 'Error deleting category', 'error');
    }
}

// Open delete category confirmation modal
function openDeleteCategoryModal(category) {
    const modal = document.getElementById('delete-category-modal');
    if (!modal) return;
    
    const deleteBtn = modal.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.setAttribute('data-category', category);
    }
    
    // Update modal text
    const modalText = modal.querySelector('p:not(.warning-text)');
    if (modalText) {
        modalText.textContent = `Are you sure you want to delete the category "${category}"? This action cannot be undone.`;
    }
    
    // Show modal
    modal.style.display = 'block';
}

// Setup image drag and drop functionality
function setupImageDragAndDrop() {
    const dropArea = document.getElementById('image-drop-area');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');
    const imageInput = document.getElementById('product-image');
    
    if (!dropArea || !fileInput || !imagePreview || !imageInput) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('dragover');
    }
    
    function unhighlight() {
        dropArea.classList.remove('dragover');
    }
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
            handleFiles(files);
        }
    }
    
    // Handle file input change
    fileInput.addEventListener('change', function() {
        if (this.files.length) {
            handleFiles(this.files);
        }
    });
    
    // Click on drop area should trigger file input
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    function handleFiles(files) {
        const file = files[0]; // Only process the first file
        
        if (file && file.type.match('image.*')) {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Image size exceeds 5MB limit. Please choose a smaller image.', 'error');
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const imageDataUrl = e.target.result;
                
                // Update hidden input with base64 data
                imageInput.value = imageDataUrl;
                
                // Update preview
                updateImagePreview(imageDataUrl, imagePreview);
            };
            
            reader.readAsDataURL(file);
        } else {
            showNotification('Please select a valid image file (JPG, PNG, WebP).', 'error');
        }
    }
}

// Update image preview
function updateImagePreview(imageUrl, previewElement) {
    // Clear previous preview
    previewElement.innerHTML = '';
    
    if (imageUrl) {
        // Create image element
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Product Preview';
        
        // Handle loading errors
        img.onerror = () => {
            previewElement.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Invalid image</p>
                </div>
            `;
        };
        
        // Add image to preview
        previewElement.appendChild(img);
    } else {
        // Show placeholder
        previewElement.innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-image"></i>
                <p>Image Preview</p>
            </div>
        `;
    }
}

// Open product modal for add or edit
async function openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('product-form');
    const imagePreview = document.getElementById('image-preview');
    const dropArea = document.getElementById('image-drop-area');
    
    // Reset form
    form.reset();
    
    // Reset image preview
    if (imagePreview) {
        imagePreview.innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-image"></i>
                <p>Image Preview</p>
            </div>
        `;
    }
    
    // Reset drop area
    if (dropArea) {
        dropArea.classList.remove('dragover');
    }
    
    // Load category options
    await loadCategoryOptions();
    
    if (productId) {
        // Edit mode
        modalTitle.textContent = 'Edit Product';
        
        try {
            // Show loading in the form
            showFormLoading(form);
            
            // Get product data
            const product = await productManager.getProductById(productId);
            
            // Hide loading
            hideFormLoading(form);
            
            if (product) {
                // Fill form with product data
                document.getElementById('product-id').value = product.id;
                document.getElementById('product-title').value = product.title;
                document.getElementById('product-category').value = product.category;
                document.getElementById('product-price').value = product.price;
                document.getElementById('product-image').value = product.image;
                document.getElementById('product-description').value = product.description;
                
                // Update image preview
                if (imagePreview && product.image) {
                    updateImagePreview(product.image, imagePreview);
                }
                
                // No need to extract WhatsApp number as we're using a fixed number
            } else {
                closeAllModals();
                showNotification('Product not found. It may have been deleted.', 'error');
                return;
            }
        } catch (error) {
            console.error('Error loading product for edit:', error);
            closeAllModals();
            showNotification('Error loading product. Please try again.', 'error');
            return;
        }
    } else {
        // Add mode
        modalTitle.textContent = 'Add New Product';
        document.getElementById('product-id').value = '';
    }
    
    // Show modal
    modal.style.display = 'block';
}

// Open delete confirmation modal
function openDeleteModal(productId) {
    const modal = document.getElementById('delete-modal');
    const deleteBtn = modal.querySelector('.delete-btn');
    
    // Set product ID on delete button
    deleteBtn.setAttribute('data-id', productId);
    
    // Show modal
    modal.style.display = 'block';
}

// Close all modals
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Save product (add or update)
async function saveProduct() {
    const form = document.getElementById('product-form');
    const productId = document.getElementById('product-id').value;
    
    // Show loading state
    showFormLoading(form);
    
    try {
        // Get form values
        const title = document.getElementById('product-title').value;
        const category = document.getElementById('product-category').value;
        const price = document.getElementById('product-price').value;
        const description = document.getElementById('product-description').value;
        const image = document.getElementById('product-image').value;
        const whatsappNumber = '917080480777'; // Fixed WhatsApp number
        
        // Validate image
        if (!image) {
            showNotification('Please upload an image for the product.', 'error');
            return;
        }
        
        // Create product object
        const productData = {
            title,
            category,
            price,
            image,
            description,
            whatsappNumber
        };
        
        // Show loading overlay
        showLoadingOverlay(productId ? 'Updating product...' : 'Adding product...');
        
        // Save product
        if (productId) {
            // Update existing product
            await productManager.updateProduct(productId, productData);
        } else {
            // Add new product
            await productManager.addProduct(productData);
        }
        
        // Get current sort option and search query
        const sortSelect = document.getElementById('product-sort');
        const currentSort = sortSelect ? sortSelect.value : null;
        const searchInput = document.getElementById('product-search');
        const currentSearch = searchInput ? searchInput.value : null;
        
        // Reload product table with current sort option and search query
        await loadProductTable(currentSort, currentSearch);
        
        // Hide loading overlay
        hideLoadingOverlay();
        
        // Close modal
        closeAllModals();
        
        // Show success message
        showNotification(productId ? 'Product updated successfully!' : 'Product added successfully!');
        
    } catch (error) {
        console.error('Error saving product:', error);
        hideLoadingOverlay();
        showNotification(error.message || 'Error saving product. Please try again.', 'error');
    } finally {
        // Hide loading state
        hideFormLoading(form);
    }
}

// Delete product
async function deleteProduct(productId) {
    // Show loading overlay
    showLoadingOverlay('Deleting product...');
    
    try {
        // Delete the product
        await productManager.deleteProduct(productId);
        
        // Get current sort option and search query
        const sortSelect = document.getElementById('product-sort');
        const currentSort = sortSelect ? sortSelect.value : null;
        const searchInput = document.getElementById('product-search');
        const currentSearch = searchInput ? searchInput.value : null;
        
        // Reload product table with current sort option and search query
        await loadProductTable(currentSort, currentSearch);
        
        // Reload category list to update usage counts
        await loadCategoryList();
        
        // Hide loading overlay
        hideLoadingOverlay();
        
        // Close modal
        closeAllModals();
        
        // Show success message
        showNotification('Product deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting product:', error);
        hideLoadingOverlay();
        showNotification('Error deleting product. Please try again.', 'error');
    }
}

// Validate image URL
function validateImageUrl(url) {
    if (!url) return false;
    
    if (!isValidUrl(url)) {
        showNotification('Please enter a valid URL for the image', 'error');
        return false;
    }
    
    return true;
}

// Check if string is a valid URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Show notification
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Show loading overlay
function showLoadingOverlay(message = 'Loading...') {
    // Create overlay if it doesn't exist
    let overlay = document.querySelector('.loading-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        `;
        document.body.appendChild(overlay);
    } else {
        overlay.querySelector('.loading-message').textContent = message;
    }
    
    // Show overlay
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
}

// Hide loading overlay
function hideLoadingOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

// Show loading in a form
function showFormLoading(form) {
    // Disable all inputs and buttons
    const inputs = form.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
        input.disabled = true;
    });
    
    // Add loading class to form
    form.classList.add('loading');
    
    // Add loading spinner
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'form-loading-spinner';
    form.appendChild(loadingSpinner);
}

// Hide loading in a form
function hideFormLoading(form) {
    // Enable all inputs and buttons
    const inputs = form.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
        input.disabled = false;
    });
    
    // Remove loading class from form
    form.classList.remove('loading');
    
    // Remove loading spinner
    const loadingSpinner = form.querySelector('.form-loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.remove();
    }
} 
