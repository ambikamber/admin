// Analytics Manager Class
class AnalyticsManager {
    constructor() {
        this.db = firebase.firestore();
        
        // Initialize analytics if available
        try {
            this.analytics = firebase.analytics();
        } catch (error) {
            console.warn('Firebase Analytics initialization failed:', error);
            this.analytics = null;
        }
        
        // Create collections if they don't exist
        this.interactionsCollection = this.db.collection('interactions');
        this.productsCollection = this.db.collection('products');
        this.timeFilter = 30; // Default to 30 days
        this.interactionsChart = null;
        
        // Create a dummy document in interactions collection if it doesn't exist
        this.ensureInteractionsCollectionExists();
    }
    
    // Ensure interactions collection exists
    async ensureInteractionsCollectionExists() {
        try {
            // Check if collection exists by trying to get a document
            const snapshot = await this.interactionsCollection.limit(1).get();
            
            // If collection is empty, create a dummy document
            if (snapshot.empty) {
                console.log('Creating interactions collection with dummy document');
                await this.interactionsCollection.doc('dummy').set({
                    type: 'system',
                    message: 'Collection initialization',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error ensuring interactions collection exists:', error);
        }
    }

    // Initialize analytics dashboard
    async initializeDashboard() {
        try {
            // Set up event listeners
            document.getElementById('time-filter').addEventListener('change', (e) => {
                this.timeFilter = parseInt(e.target.value);
                this.loadAnalyticsData();
            });

            // Load initial data
            await this.loadAnalyticsData();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            alert('Error initializing dashboard. Please check the console for details.');
        }
    }

    // Load all analytics data
    async loadAnalyticsData() {
        try {
            // Show loading state
            this.showLoadingState();

            // Get date range based on time filter
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - this.timeFilter);

            // Get interactions within date range
            const snapshot = await this.interactionsCollection
                .where('timestamp', '>=', startDate)
                .orderBy('timestamp', 'asc')
                .get();

            const interactions = [];
            snapshot.forEach(doc => {
                // Skip the dummy document
                if (doc.id === 'dummy') return;
                
                // Add valid interactions
                if (doc.data().type && doc.data().productId) {
                    interactions.push({
                        id: doc.id,
                        ...doc.data()
                    });
                }
            });

            // Update dashboard with data
            this.updateTotalStats(interactions);
            this.updateInteractionsChart(interactions);
            await this.updateTopProducts(interactions);
            this.updateLocationStats(interactions);

        } catch (error) {
            console.error('Error loading analytics data:', error);
            
            // Show error message in the dashboard
            document.getElementById('total-views').textContent = 'Error';
            document.getElementById('total-whatsapp').textContent = 'Error';
            document.getElementById('conversion-rate').textContent = 'Error';
            
            document.getElementById('top-products-table').innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">Error loading data. Please check console for details.</td>
                </tr>
            `;
            
            document.getElementById('locations-table').innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">Error loading location data. Please check console for details.</td>
                </tr>
            `;
            
            // Clear chart if it exists
            if (this.interactionsChart) {
                this.interactionsChart.destroy();
                this.interactionsChart = null;
            }
            
            if (this.locationChart) {
                this.locationChart.destroy();
                this.locationChart = null;
            }
            
            // Show error message
            alert('Error loading analytics data: ' + error.message);
        }
    }

    // Show loading state
    showLoadingState() {
        document.getElementById('total-views').textContent = '...';
        document.getElementById('total-whatsapp').textContent = '...';
        document.getElementById('conversion-rate').textContent = '...';
        document.getElementById('top-products-table').innerHTML = `
            <tr>
                <td colspan="4" class="text-center">Loading data...</td>
            </tr>
        `;
        document.getElementById('locations-table').innerHTML = `
            <tr>
                <td colspan="4" class="text-center">Loading location data...</td>
            </tr>
        `;
    }

    // Update total stats
    updateTotalStats(interactions) {
        const viewInteractions = interactions.filter(i => i.type === 'view');
        const whatsappInteractions = interactions.filter(i => i.type === 'whatsapp');
        
        const totalViews = viewInteractions.length;
        const totalWhatsapp = whatsappInteractions.length;
        const conversionRate = totalViews > 0 ? ((totalWhatsapp / totalViews) * 100).toFixed(1) : '0.0';
        
        document.getElementById('total-views').textContent = totalViews;
        document.getElementById('total-whatsapp').textContent = totalWhatsapp;
        document.getElementById('conversion-rate').textContent = `${conversionRate}%`;
    }

    // Update interactions chart
    updateInteractionsChart(interactions) {
        try {
            // Group interactions by date
            const groupedData = this.groupInteractionsByDate(interactions);
            
            // Prepare data for chart
            const labels = Object.keys(groupedData);
            const viewsData = labels.map(date => groupedData[date].views || 0);
            const whatsappData = labels.map(date => groupedData[date].whatsapp || 0);
            
            // Create or update chart
            const ctx = document.getElementById('interactions-chart').getContext('2d');
            
            if (this.interactionsChart) {
                this.interactionsChart.destroy();
            }
            
            // If no data, show empty chart with message
            if (labels.length === 0) {
                this.interactionsChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['No Data'],
                        datasets: [{
                            label: 'No data available',
                            data: [0],
                            backgroundColor: '#f8f9fa'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
                return;
            }
            
            this.interactionsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Product Views',
                            data: viewsData,
                            borderColor: '#4a6de5',
                            backgroundColor: 'rgba(74, 109, 229, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'WhatsApp Clicks',
                            data: whatsappData,
                            borderColor: '#25D366',
                            backgroundColor: 'rgba(37, 211, 102, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error updating interactions chart:', error);
            // Create empty chart with error message
            const ctx = document.getElementById('interactions-chart').getContext('2d');
            if (this.interactionsChart) {
                this.interactionsChart.destroy();
            }
            this.interactionsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Error'],
                    datasets: [{
                        label: 'Error loading chart data',
                        data: [0],
                        backgroundColor: '#ffcccc'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
    }

    // Group interactions by date
    groupInteractionsByDate(interactions) {
        const groupedData = {};
        
        interactions.forEach(interaction => {
            // Skip if timestamp is missing or invalid
            if (!interaction.timestamp || typeof interaction.timestamp.toDate !== 'function') {
                return;
            }
            
            const date = new Date(interaction.timestamp.toDate());
            const dateStr = date.toLocaleDateString();
            
            if (!groupedData[dateStr]) {
                groupedData[dateStr] = { views: 0, whatsapp: 0 };
            }
            
            if (interaction.type === 'view') {
                groupedData[dateStr].views++;
            } else if (interaction.type === 'whatsapp') {
                groupedData[dateStr].whatsapp++;
            }
        });
        
        return groupedData;
    }

    // Update top products table
    async updateTopProducts(interactions) {
        try {
            // Group interactions by product
            const productInteractions = {};
            
            interactions.forEach(interaction => {
                const productId = interaction.productId;
                
                if (!productInteractions[productId]) {
                    productInteractions[productId] = { views: 0, whatsapp: 0, productId };
                }
                
                if (interaction.type === 'view') {
                    productInteractions[productId].views++;
                } else if (interaction.type === 'whatsapp') {
                    productInteractions[productId].whatsapp++;
                }
            });
            
            // Convert to array and sort by views
            const productsArray = Object.values(productInteractions);
            productsArray.sort((a, b) => b.views - a.views);
            
            // Get top 10 products
            const topProducts = productsArray.slice(0, 10);
            
            // Get product details
            const productDetails = await this.getProductDetails(topProducts.map(p => p.productId));
            
            // Render table
            const tableBody = document.getElementById('top-products-table');
            tableBody.innerHTML = '';
            
            if (topProducts.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">No data available</td>
                    </tr>
                `;
                return;
            }
            
            topProducts.forEach(product => {
                const productDetail = productDetails[product.productId] || { title: 'Unknown Product' };
                const conversionRate = product.views > 0 ? ((product.whatsapp / product.views) * 100).toFixed(1) : '0.0';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${productDetail.title || 'Unknown Product'}</td>
                    <td>${product.views}</td>
                    <td>${product.whatsapp}</td>
                    <td>${conversionRate}%</td>
                `;
                
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error updating top products:', error);
            const tableBody = document.getElementById('top-products-table');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">Error loading top products data</td>
                </tr>
            `;
        }
    }

    // Get product details
    async getProductDetails(productIds) {
        try {
            const productDetails = {};
            
            // If no product IDs, return empty object
            if (!productIds || productIds.length === 0) {
                return productDetails;
            }
            
            // Get products in batches to avoid too many reads
            const batches = [];
            for (let i = 0; i < productIds.length; i += 10) {
                const batch = productIds.slice(i, i + 10);
                batches.push(batch);
            }
            
            for (const batch of batches) {
                const promises = batch.map(productId => 
                    this.productsCollection.doc(productId).get()
                );
                
                const snapshots = await Promise.all(promises);
                
                snapshots.forEach(doc => {
                    if (doc.exists) {
                        productDetails[doc.id] = {
                            id: doc.id,
                            ...doc.data()
                        };
                    }
                });
            }
            
            return productDetails;
        } catch (error) {
            console.error('Error getting product details:', error);
            return {};
        }
    }

    // Update location stats
    updateLocationStats(interactions) {
        try {
            // Group interactions by location
            const locationData = this.groupInteractionsByLocation(interactions);
            
            // Update location chart
            this.updateLocationChart(locationData);
            
            // Update location table
            this.updateLocationTable(locationData);
        } catch (error) {
            console.error('Error updating location stats:', error);
            
            // Show error message in the location table
            document.getElementById('locations-table').innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">Error loading location data</td>
                </tr>
            `;
            
            // Clear chart if it exists
            if (this.locationChart) {
                this.locationChart.destroy();
                this.locationChart = null;
            }
        }
    }
    
    // Group interactions by location
    groupInteractionsByLocation(interactions) {
        const locationGroups = {};
        
        interactions.forEach(interaction => {
            // Skip if location data is missing
            if (!interaction.location) return;
            
            const country = interaction.location.country || 'Unknown';
            const region = interaction.location.region || 'Unknown';
            const city = interaction.location.city || 'Unknown';
            
            // Create location key
            const locationKey = `${country}|${region}|${city}`;
            
            if (!locationGroups[locationKey]) {
                locationGroups[locationKey] = {
                    country,
                    region,
                    city,
                    count: 0
                };
            }
            
            locationGroups[locationKey].count++;
        });
        
        // Convert to array and sort by count
        return Object.values(locationGroups).sort((a, b) => b.count - a.count);
    }
    
    // Update location chart
    updateLocationChart(locationData) {
        try {
            const ctx = document.getElementById('location-chart').getContext('2d');
            
            if (this.locationChart) {
                this.locationChart.destroy();
            }
            
            // If no data, show empty chart with message
            if (locationData.length === 0) {
                this.locationChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['No Data'],
                        datasets: [{
                            label: 'No location data available',
                            data: [0],
                            backgroundColor: '#f8f9fa'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
                return;
            }
            
            // Take top 10 locations for the chart
            const topLocations = locationData.slice(0, 10);
            
            // Prepare data for chart
            const labels = topLocations.map(loc => loc.country === 'Unknown' ? 'Unknown' : 
                (loc.city === 'Unknown' ? loc.country : `${loc.city}, ${loc.country}`));
            const counts = topLocations.map(loc => loc.count);
            
            // Create chart
            this.locationChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Interactions by Location',
                        data: counts,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Interactions: ${context.raw}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error updating location chart:', error);
            
            // Create empty chart with error message
            const ctx = document.getElementById('location-chart').getContext('2d');
            if (this.locationChart) {
                this.locationChart.destroy();
            }
            this.locationChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Error'],
                    datasets: [{
                        label: 'Error loading chart data',
                        data: [0],
                        backgroundColor: '#ffcccc'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
    }
    
    // Update location table
    updateLocationTable(locationData) {
        try {
            const tableBody = document.getElementById('locations-table');
            tableBody.innerHTML = '';
            
            if (locationData.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">No location data available</td>
                    </tr>
                `;
                return;
            }
            
            // Take top 20 locations for the table
            const topLocations = locationData.slice(0, 20);
            
            topLocations.forEach(location => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${location.country}</td>
                    <td>${location.region}</td>
                    <td>${location.city}</td>
                    <td>${location.count}</td>
                `;
                
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error updating location table:', error);
            const tableBody = document.getElementById('locations-table');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">Error loading location data</td>
                </tr>
            `;
        }
    }
}

// Initialize analytics when document is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if user is authenticated
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in, initialize analytics
                const analyticsManager = new AnalyticsManager();
                await analyticsManager.initializeDashboard();
                
                // Add event listener for dashboard link
                document.getElementById('dashboard-link').addEventListener('click', () => {
                    // Hide all panels
                    document.querySelectorAll('.admin-panel').forEach(panel => {
                        panel.style.display = 'none';
                    });
                    
                    // Show dashboard panel
                    document.getElementById('dashboard').style.display = 'block';
                    
                    // Update active link
                    document.querySelectorAll('.nav-links a').forEach(link => {
                        link.classList.remove('active');
                    });
                    document.getElementById('dashboard-link').classList.add('active');
                });
            }
        });
    } catch (error) {
        console.error('Error initializing analytics:', error);
        alert('Error initializing analytics. Please check the console for details.');
    }
}); 