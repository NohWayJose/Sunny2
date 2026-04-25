/**
 * Tab Manager - Handles tab switching and lazy loading
 */

class TabManager {
    constructor() {
        this.currentTab = 'generation';
        this.roiLoaded = false;
        this.init();
    }

    init() {
        // Add click handlers to tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        console.log('Tab Manager initialized');
    }

    switchTab(tabName) {
        // Update button states
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab pane visibility
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Lazy load ROI data when tab is first opened
        if (tabName === 'roi' && !this.roiLoaded) {
            console.log('Loading ROI data for the first time...');
            this.loadROIData();
            this.roiLoaded = true;
        }

        this.currentTab = tabName;
    }

    async loadROIData() {
        try {
            // Initialize ROI charts
            if (window.roiCharts) {
                await window.roiCharts.init();
            } else {
                // Create new instance if not exists
                window.roiCharts = new ROICharts();
                await window.roiCharts.init();
            }
        } catch (error) {
            console.error('Error loading ROI data:', error);
        }
    }
}

// Initialize tab manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tabManager = new TabManager();
    });
} else {
    window.tabManager = new TabManager();
}

// Made with Bob
