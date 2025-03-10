// This script helps you create an admin user in Firebase Authentication
// Run this script in your browser console after initializing Firebase

/**
 * Creates a new admin user in Firebase Authentication
 * @param {string} email - The email address for the admin user
 * @param {string} password - The password for the admin user (must be at least 6 characters)
 */
async function createAdminUser(email, password) {
    try {
        // Check if Firebase is initialized
        if (!firebase || !firebase.auth) {
            console.error('Firebase is not initialized. Please run this script on a page where Firebase is loaded.');
            return;
        }
        
        // Create user with email and password
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('Admin user created successfully!');
        console.log('User ID:', user.uid);
        console.log('Email:', user.email);
        
        // Note: In a production environment, you would typically use Firebase Cloud Functions
        // to securely set custom claims for admin users. This script is for demonstration purposes.
        
        return user;
    } catch (error) {
        console.error('Error creating admin user:', error.message);
        throw error;
    }
}

// Example usage:
// createAdminUser('admin@example.com', 'securepassword123');

/**
 * Instructions for setting up an admin user:
 * 
 * 1. Open your login.html page in a browser
 * 2. Open the browser console (F12 or right-click > Inspect > Console)
 * 3. Copy and paste this entire script into the console
 * 4. Call the createAdminUser function with your desired email and password:
 *    createAdminUser('your-admin-email@example.com', 'your-secure-password')
 * 5. You should see a success message with the user ID and email
 * 6. You can now use these credentials to log in to your admin panel
 */ 