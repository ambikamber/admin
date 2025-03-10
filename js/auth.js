// Authentication Module
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase Auth
    const auth = firebase.auth();
    
    // Check if we're on the login page
    const isLoginPage = window.location.pathname.includes('login.html');
    
    // Check authentication state
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            if (isLoginPage) {
                // Redirect to admin panel if already logged in
                window.location.href = 'index.html';
            }
        } else {
            // No user is signed in
            if (!isLoginPage) {
                // Redirect to login page if not logged in
                window.location.href = 'login.html';
            }
        }
    });
    
    // Handle login form submission
    if (isLoginPage) {
        const loginForm = document.getElementById('login-form');
        const loginError = document.getElementById('login-error');
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Clear previous error
            loginError.style.display = 'none';
            
            // Show loading state
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
            
            try {
                // Sign in with email and password
                await auth.signInWithEmailAndPassword(email, password);
                // Redirect will happen automatically via onAuthStateChanged
            } catch (error) {
                // Handle errors
                console.error('Login error:', error);
                loginError.textContent = getAuthErrorMessage(error.code);
                loginError.style.display = 'block';
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }
    
    // Add logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                // Close mobile menu if it's open
                if (typeof closeMobileMenu === 'function') {
                    closeMobileMenu();
                } else {
                    // Fallback if the function is not available
                    const navLinksContainer = document.querySelector('.nav-links');
                    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
                    if (navLinksContainer && navLinksContainer.classList.contains('active')) {
                        navLinksContainer.classList.remove('active');
                        
                        // Change icon back to bars
                        const icon = mobileMenuBtn.querySelector('i');
                        if (icon && icon.classList.contains('fa-times')) {
                            icon.classList.remove('fa-times');
                            icon.classList.add('fa-bars');
                        }
                    }
                }
                
                await auth.signOut();
                // Redirect will happen automatically via onAuthStateChanged
            } catch (error) {
                console.error('Logout error:', error);
                alert('Error signing out. Please try again.');
            }
        });
    }
});

// Helper function to get user-friendly error messages
function getAuthErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Invalid email address format.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/too-many-requests':
            return 'Too many failed login attempts. Please try again later.';
        default:
            return 'An error occurred during login. Please try again.';
    }
} 