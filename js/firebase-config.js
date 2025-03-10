const firebaseConfig = {
  apiKey: "AIzaSyCDJQKi7fpq_86mKfwmmLRkut-eQMy44Ns",
  authDomain: "ambikamber-c50b2.firebaseapp.com",
  projectId: "ambikamber-c50b2",
  storageBucket: "ambikamber-c50b2.firebasestorage.app",
  messagingSenderId: "417730230739",
  appId: "1:417730230739:web:e0b5c30e4bd79afb4fd726",
  measurementId: "G-WZ6KEX7KV6"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
  
  // Initialize Analytics if available
  if (firebase.analytics) {
    firebase.analytics();
    console.log('Firebase Analytics initialized');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Initialize Firestore
const db = firebase.firestore();

// Collection references
const productsCollection = db.collection('products');
const categoriesCollection = db.collection('categories');
const interactionsCollection = db.collection('interactions');

// Export the database and collection references
const firebaseDB = {
  db,
  productsCollection,
  categoriesCollection,
  interactionsCollection
}; 
