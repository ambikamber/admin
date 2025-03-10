// Default product data
const defaultProducts = [
    {
        id: 1,
        title: "Test Nameplate",
        category: "wooden",
        price: 1999.99,
        image: "https://imgur.com/ZLIVXpZ.jpg",
        description: "Beautiful Nameplate",
        whatsappLink: "https://wa.me/1234567890?text=I'm%20interested%20in%20your%20Test%20Nameplate%20for%20$199.99"
    }
];

// Default categories
const defaultCategories = ['acrylic', 'wooden'];

// Product Management Class
class ProductManager {
    constructor() {
        this.products = [];
        this.categories = [];
        this.initialized = false;
        this.initializeProducts();
    }

    // Initialize products and categories from Firestore
    async initializeProducts() {
        try {
            // Initialize categories first
            await this.initializeCategories();
            
            // Check if products collection exists and has documents
            const snapshot = await productsCollection.get();
            
            if (snapshot.empty) {
                // If no products exist, seed with default products
                console.log('No products found in database. Seeding with default products...');
                await this.seedDefaultProducts();
            } else {
                console.log('Products loaded from database');
            }
            
            this.initialized = true;
            
            // Dispatch an event to notify that products are loaded
            document.dispatchEvent(new CustomEvent('products-loaded'));
            
        } catch (error) {
            console.error('Error initializing products:', error);
            // Fallback to default products if there's an error
            this.products = [...defaultProducts];
            this.categories = [...defaultCategories];
            this.initialized = true;
            document.dispatchEvent(new CustomEvent('products-loaded'));
        }
    }
    
    // Initialize categories from Firestore
    async initializeCategories() {
        try {
            // Check if categories collection exists
            const categoriesRef = db.collection('categories');
            const snapshot = await categoriesRef.get();
            
            if (snapshot.empty) {
                // If no categories exist, seed with default categories
                console.log('No categories found in database. Seeding with default categories...');
                await this.seedDefaultCategories();
            } else {
                // Load categories from database
                this.categories = snapshot.docs.map(doc => doc.id);
                console.log('Categories loaded from database:', this.categories);
            }
            
            // Dispatch an event to notify that categories are loaded
            document.dispatchEvent(new CustomEvent('categories-loaded'));
            
            return this.categories;
        } catch (error) {
            console.error('Error initializing categories:', error);
            this.categories = [...defaultCategories];
            document.dispatchEvent(new CustomEvent('categories-loaded'));
            return this.categories;
        }
    }
    
    // Seed database with default categories
    async seedDefaultCategories() {
        try {
            // Create a batch write
            const batch = db.batch();
            
            // Add each default category to the batch
            for (const category of defaultCategories) {
                const docRef = db.collection('categories').doc(category);
                batch.set(docRef, { 
                    name: category,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Commit the batch
            await batch.commit();
            
            // Update local categories
            this.categories = [...defaultCategories];
            
            console.log('Default categories added to database');
            return this.categories;
        } catch (error) {
            console.error('Error seeding default categories:', error);
            return [];
        }
    }

    // Seed database with default products
    async seedDefaultProducts() {
        try {
            // Create a batch write
            const batch = db.batch();
            
            // Add each default product to the batch
            for (const product of defaultProducts) {
                const docRef = productsCollection.doc();
                const productWithoutId = { ...product };
                delete productWithoutId.id; // Remove the id as Firestore will generate one
                batch.set(docRef, productWithoutId);
            }
            
            // Commit the batch
            await batch.commit();
            console.log('Default products added to database');
            
        } catch (error) {
            console.error('Error seeding default products:', error);
        }
    }

    // Get all products from Firestore
    async getAllProducts() {
        try {
            const snapshot = await productsCollection.get();
            this.products = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            return this.products;
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    }

    // Get product by ID from Firestore
    async getProductById(id) {
        try {
            const doc = await productsCollection.doc(id).get();
            if (doc.exists) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            } else {
                console.log('No product found with ID:', id);
                return null;
            }
        } catch (error) {
            console.error('Error getting product by ID:', error);
            return null;
        }
    }

    // Add a new product to Firestore
    async addProduct(product) {
        try {
            // Validate image
            if (!product.image) {
                throw new Error('Product image is required');
            }
            
            // Validate category
            if (!this.categories.includes(product.category)) {
                throw new Error('Invalid category');
            }
            
            // Create new product object without WhatsApp number
            const newProduct = {
                title: product.title,
                category: product.category,
                price: parseFloat(product.price),
                image: product.image,
                description: product.description,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add to Firestore
            const docRef = await productsCollection.add(newProduct);
            
            // Now that we have the ID, generate the WhatsApp link
            const productId = docRef.id;
            const whatsappLink = this.generateWhatsAppLink(product.title, product.price, null, productId);
            
            // Update the product with the WhatsApp link
            await docRef.update({
                whatsappLink: whatsappLink
            });
            
            return productId;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    // Update an existing product in Firestore
    async updateProduct(id, updatedProduct) {
        try {
            // Validate image
            if (!updatedProduct.image) {
                throw new Error('Product image is required');
            }
            
            // Validate category
            if (!this.categories.includes(updatedProduct.category)) {
                throw new Error('Invalid category');
            }
            
            // Create WhatsApp link with the correct product ID
            const whatsappLink = this.generateWhatsAppLink(
                updatedProduct.title, 
                updatedProduct.price, 
                null,  // No need for phone number as we're using a fixed one
                id  // Use the existing product ID
            );
            
            // Create updated product object
            const productData = {
                title: updatedProduct.title,
                category: updatedProduct.category,
                price: parseFloat(updatedProduct.price),
                image: updatedProduct.image,
                description: updatedProduct.description,
                whatsappLink: whatsappLink,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Get product reference
            const productRef = productsCollection.doc(id);
            
            // Check if product exists
            const doc = await productRef.get();
            if (!doc.exists) {
                throw new Error('Product not found');
            }
            
            // Update in Firestore
            await productRef.update(productData);
            
            // Return updated product with ID
            return {
                id,
                ...productData
            };
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    // Delete a product from Firestore
    async deleteProduct(id) {
        try {
            await productsCollection.doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }
    
    // Get all categories
    async getAllCategories() {
        try {
            // Refresh categories from database
            const snapshot = await db.collection('categories').get();
            this.categories = snapshot.docs.map(doc => doc.id);
            return this.categories;
        } catch (error) {
            console.error('Error getting categories:', error);
            return this.categories; // Return cached categories if there's an error
        }
    }
    
    // Add a new category
    async addCategory(categoryName) {
        try {
            // Validate category name (lowercase, no spaces)
            categoryName = categoryName.trim().toLowerCase();
            
            if (!categoryName) {
                throw new Error('Category name cannot be empty');
            }
            
            if (categoryName.includes(' ')) {
                throw new Error('Category name cannot contain spaces');
            }
            
            if (this.categories.includes(categoryName)) {
                throw new Error('Category already exists');
            }
            
            // Add to Firestore
            await db.collection('categories').doc(categoryName).set({
                name: categoryName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local categories
            this.categories.push(categoryName);
            
            return categoryName;
        } catch (error) {
            console.error('Error adding category:', error);
            throw error;
        }
    }
    
    // Delete a category
    async deleteCategory(categoryName) {
        try {
            // Check if category is in use
            if (await this.isCategoryInUse(categoryName)) {
                throw new Error('Cannot delete category that is in use by products');
            }
            
            // Delete from Firestore
            await db.collection('categories').doc(categoryName).delete();
            
            // Update local categories
            this.categories = this.categories.filter(cat => cat !== categoryName);
            
            return true;
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    }
    
    // Check if a category is in use by any products
    async isCategoryInUse(categoryName) {
        try {
            const snapshot = await productsCollection.where('category', '==', categoryName).limit(1).get();
            return !snapshot.empty;
        } catch (error) {
            console.error('Error checking if category is in use:', error);
            return true; // Assume it's in use if there's an error (safer)
        }
    }
    
    // Get category usage count
    async getCategoryUsageCount(categoryName) {
        try {
            const snapshot = await productsCollection.where('category', '==', categoryName).get();
            return snapshot.size;
        } catch (error) {
            console.error('Error getting category usage count:', error);
            return 0;
        }
    }

    // Generate WhatsApp link
    generateWhatsAppLink(title, price, phoneNumber, productId) {
        // Ensure we have a valid product ID
        if (!productId) {
            console.warn('Product ID is undefined in generateWhatsAppLink');
        }
        
        // Always use the fixed WhatsApp number
        const fixedPhoneNumber = '917080480777';
        
        const productDetailUrl = `https://ambikamber.shop/product-detail.html?id=${productId || ''}`;
        const message = `I'm interested in your ${title} for ₹${parseFloat(price).toFixed(2)}\n\nView product: ${productDetailUrl}`;
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${fixedPhoneNumber}?text=${encodedMessage}`;
    }
    
    // Check if string is a valid URL
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
}

// Initialize the product manager
const productManager = new ProductManager();

// Export the products for use in other scripts
let products = [];

// Listen for products loaded event
document.addEventListener('products-loaded', async () => {
    products = await productManager.getAllProducts();
}); 
