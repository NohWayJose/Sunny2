// Solar Dashboard — annular visualisation
// Copyright (C) 2024-2026 Greg Lubel
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

/**
 * Main Dashboard Controller
 * Handles UI interactions and coordinates annular visualization
 */

// Global state
let annularViz = null;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Solar Dashboard initializing...');
    
    // Hide the old controls that are no longer needed
    hideOldControls();
    
    // Initialize UI components
    initializeHamburgerMenu();
    initializeAboutModal();
    initializeSettingsModal();
    initializeStatsToggle();
    initializeSidebarToggles();
    setupKeyboardZoom();

    // Initialize annular visualization first (don't wait for stats)
    await initializeAnnularViz();
    
    // Load summary statistics in background (non-blocking)
    updateSummaryStats().catch(err => console.error('Failed to load stats:', err));
});

/**
 * Initialize hamburger menu
 */
function initializeHamburgerMenu() {
    console.log('Initializing hamburger menu...');
    const hamburger = document.getElementById('hamburger-menu');
    const menuDropdown = document.getElementById('menu-dropdown');
    
    console.log('Hamburger element:', hamburger);
    console.log('Menu dropdown element:', menuDropdown);
    
    if (hamburger && menuDropdown) {
        console.log('Adding hamburger click listener');
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Hamburger clicked, toggling menu');
            menuDropdown.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !menuDropdown.contains(e.target)) {
                menuDropdown.classList.remove('active');
            }
        });
        console.log('Hamburger menu initialized successfully');
    } else {
        console.error('Hamburger menu elements not found!');
    }
}

/**
 * Initialize settings modal with label font size adjuster
 */
function initializeSettingsModal() {
    const menuItem   = document.getElementById('settings-menu-item');
    const modal      = document.getElementById('settings-modal');
    const closeBtn   = document.getElementById('settings-modal-close');
    const upBtn      = document.getElementById('font-size-up');
    const downBtn    = document.getElementById('font-size-down');
    const display    = document.getElementById('font-size-display');
    const menuDropdown = document.getElementById('menu-dropdown');

    if (!menuItem || !modal) return;

    const STEPS = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0];
    let currentStep = 0;

    function applyStep() {
        const scale = STEPS[currentStep];
        display.textContent = `${Math.round(scale * 100)}%`;
        downBtn.disabled = currentStep === 0;
        upBtn.disabled   = currentStep === STEPS.length - 1;
        if (window.annularViz) window.annularViz.setLabelFontScale(scale);
    }

    menuItem.addEventListener('click', () => {
        modal.classList.add('active');
        if (menuDropdown) menuDropdown.classList.remove('active');
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('active'); });

    upBtn.addEventListener('click', () => { if (currentStep < STEPS.length - 1) { currentStep++; applyStep(); } });
    downBtn.addEventListener('click', () => { if (currentStep > 0) { currentStep--; applyStep(); } });

    applyStep();
}

/**
 * Initialize about modal
 */
function initializeAboutModal() {
    console.log('Initializing about modal...');
    const aboutMenuItem = document.getElementById('about-menu-item');
    const modal = document.getElementById('about-modal');
    const modalClose = document.getElementById('modal-close');
    const menuDropdown = document.getElementById('menu-dropdown');
    
    console.log('About menu item:', aboutMenuItem);
    console.log('Modal:', modal);
    console.log('Modal close:', modalClose);
    
    if (aboutMenuItem && modal && modalClose) {
        // Open modal
        aboutMenuItem.addEventListener('click', () => {
            console.log('About clicked, opening modal');
            modal.classList.add('active');
            if (menuDropdown) {
                menuDropdown.classList.remove('active');
            }
        });
        
        // Close modal
        modalClose.addEventListener('click', () => {
            console.log('Close button clicked');
            modal.classList.remove('active');
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('Clicked outside modal');
                modal.classList.remove('active');
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                console.log('Escape pressed');
                modal.classList.remove('active');
            }
        });
        console.log('About modal initialized successfully');
    } else {
        console.error('About modal elements not found!');
    }
}

/**
 * Initialize stats toggle
 */
function initializeStatsToggle() {
    console.log('Initializing stats toggle...');
    const statsToggle = document.getElementById('stats-toggle');
    const statsContainer = document.getElementById('statsContainer');
    const toggleArrow = statsToggle?.querySelector('.toggle-arrow');
    
    console.log('Stats toggle:', statsToggle);
    console.log('Stats container:', statsContainer);
    
    if (statsToggle && statsContainer) {
        statsToggle.addEventListener('click', () => {
            console.log('Stats toggle clicked');
            statsContainer.classList.toggle('collapsed');
            if (toggleArrow) {
                toggleArrow.textContent = statsContainer.classList.contains('collapsed') ? '▶' : '▼';
            }
        });
        console.log('Stats toggle initialized successfully');
    } else {
        console.error('Stats toggle elements not found!');
    }
}

/**
 * Initialize sidebar toggle functionality
 */
function initializeSidebarToggles() {
    const isMobile = () => window.innerWidth <= 768;
    
    // Track sidebar states
    const sidebarState = {
        legend: { wasOpen: false, isOpen: true },
        controls: { wasOpen: false, isOpen: true }
    };
    
    // Legend sidebar toggle
    const legendToggle = document.getElementById('legend-toggle');
    const legendSidebar = document.getElementById('legend-sidebar');
    const controlsSidebar = document.getElementById('controls-sidebar');
    
    // On mobile, start with both sidebars collapsed
    if (isMobile()) {
        if (legendSidebar) {
            legendSidebar.classList.add('collapsed');
            sidebarState.legend.isOpen = false;
        }
        if (controlsSidebar) {
            controlsSidebar.classList.add('collapsed');
            sidebarState.controls.isOpen = false;
        }
        // Setup mobile swipe gestures
        setupMobileSwipeGestures(legendSidebar, controlsSidebar, sidebarState);
        // Setup pinch-to-zoom on the visualization
        setupPinchZoom();
    }
    
    if (legendToggle && legendSidebar) {
        legendToggle.addEventListener('click', () => {
            const wasCollapsed = legendSidebar.classList.contains('collapsed');
            
            if (wasCollapsed) {
                // Opening legend sidebar
                legendSidebar.classList.remove('collapsed');
                sidebarState.legend.isOpen = true;
                
                // If controls sidebar is open, save its state and collapse it
                if (!controlsSidebar.classList.contains('collapsed')) {
                    sidebarState.controls.wasOpen = true;
                    controlsSidebar.classList.add('collapsed');
                    sidebarState.controls.isOpen = false;
                    const controlsIcon = document.querySelector('#controls-toggle .toggle-icon');
                    if (controlsIcon) controlsIcon.textContent = '◀';
                }
            } else {
                // Closing legend sidebar
                legendSidebar.classList.add('collapsed');
                sidebarState.legend.isOpen = false;
                
                // If controls sidebar was open before, restore it
                if (sidebarState.controls.wasOpen) {
                    controlsSidebar.classList.remove('collapsed');
                    sidebarState.controls.isOpen = true;
                    sidebarState.controls.wasOpen = false;
                    const controlsIcon = document.querySelector('#controls-toggle .toggle-icon');
                    if (controlsIcon) controlsIcon.textContent = '▶';
                }
            }
            
            const icon = legendToggle.querySelector('.toggle-icon');
            if (icon) {
                icon.textContent = legendSidebar.classList.contains('collapsed') ? '▶' : '◀';
            }
            
            // Trigger resize after animation completes
            setTimeout(() => {
                if (annularViz) {
                    annularViz.handleResize();
                }
            }, 300);
        });
    }
    
    // Controls sidebar toggle
    const controlsToggle = document.getElementById('controls-toggle');
    
    if (controlsToggle && controlsSidebar) {
        controlsToggle.addEventListener('click', () => {
            const wasCollapsed = controlsSidebar.classList.contains('collapsed');
            
            if (wasCollapsed) {
                // Opening controls sidebar
                controlsSidebar.classList.remove('collapsed');
                sidebarState.controls.isOpen = true;
                
                // If legend sidebar is open, save its state and collapse it
                if (!legendSidebar.classList.contains('collapsed')) {
                    sidebarState.legend.wasOpen = true;
                    legendSidebar.classList.add('collapsed');
                    sidebarState.legend.isOpen = false;
                    const legendIcon = document.querySelector('#legend-toggle .toggle-icon');
                    if (legendIcon) legendIcon.textContent = '▶';
                }
            } else {
                // Closing controls sidebar
                controlsSidebar.classList.add('collapsed');
                sidebarState.controls.isOpen = false;
                
                // If legend sidebar was open before, restore it
                if (sidebarState.legend.wasOpen) {
                    legendSidebar.classList.remove('collapsed');
                    sidebarState.legend.isOpen = true;
                    sidebarState.legend.wasOpen = false;
                    const legendIcon = document.querySelector('#legend-toggle .toggle-icon');
                    if (legendIcon) legendIcon.textContent = '◀';
                }
            }
            
            const icon = controlsToggle.querySelector('.toggle-icon');
            if (icon) {
                icon.textContent = controlsSidebar.classList.contains('collapsed') ? '◀' : '▶';
            }
            
            // Trigger resize after animation completes
            setTimeout(() => {
                if (annularViz) {
                    annularViz.handleResize();
                }
            }, 300);
        });
    }
}

/**
 * Setup mobile swipe gestures for sidebars
 */
function setupMobileSwipeGestures(legendSidebar, controlsSidebar, sidebarState) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    const handleTouchStart = (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        // Reset end to start so a tap (no touchmove) always gives delta = 0
        touchEndX = touchStartX;
        touchEndY = touchStartY;
    };
    
    const handleTouchMove = (e) => {
        touchEndX = e.touches[0].clientX;
        touchEndY = e.touches[0].clientY;
    };
    
    const handleTouchEnd = () => {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // Only trigger if horizontal swipe is dominant
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                // Swipe right - open legend, close controls
                if (legendSidebar.classList.contains('collapsed')) {
                    legendSidebar.classList.remove('collapsed');
                    sidebarState.legend.isOpen = true;
                    if (!controlsSidebar.classList.contains('collapsed')) {
                        controlsSidebar.classList.add('collapsed');
                        sidebarState.controls.isOpen = false;
                    }
                }
            } else {
                // Swipe left - open controls, close legend
                if (controlsSidebar.classList.contains('collapsed')) {
                    controlsSidebar.classList.remove('collapsed');
                    sidebarState.controls.isOpen = true;
                    if (!legendSidebar.classList.contains('collapsed')) {
                        legendSidebar.classList.add('collapsed');
                        sidebarState.legend.isOpen = false;
                    }
                }
            }
        }
    };
    
    // Swipe on legend sidebar to close it (only on swipe, not tap)
    if (legendSidebar) {
        legendSidebar.addEventListener('touchstart', handleTouchStart);
        legendSidebar.addEventListener('touchmove', handleTouchMove);
        legendSidebar.addEventListener('touchend', (e) => {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            // Only close if it's a clear horizontal swipe (not a tap or vertical scroll)
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50 && !legendSidebar.classList.contains('collapsed')) {
                legendSidebar.classList.add('collapsed');
                sidebarState.legend.isOpen = false;
            }
        });
    }
    
    // Swipe on controls sidebar to close it (only on swipe, not tap)
    if (controlsSidebar) {
        controlsSidebar.addEventListener('touchstart', handleTouchStart);
        controlsSidebar.addEventListener('touchmove', handleTouchMove);
        controlsSidebar.addEventListener('touchend', (e) => {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            // Only close if it's a clear horizontal swipe (not a tap or vertical scroll)
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 50 && !controlsSidebar.classList.contains('collapsed')) {
                controlsSidebar.classList.add('collapsed');
                sidebarState.controls.isOpen = false;
            }
        });
    }
    
    // Swipe from edges to open
    document.addEventListener('touchstart', (e) => {
        const touchX = e.touches[0].clientX;
        const screenWidth = window.innerWidth;
        
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        
        // Left edge - prepare to open legend
        if (touchX < 50 && legendSidebar && legendSidebar.classList.contains('collapsed')) {
            const tempTouchMove = (e) => {
                touchEndX = e.touches[0].clientX;
                touchEndY = e.touches[0].clientY;
            };
            const tempTouchEnd = () => {
                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;
                if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 50) {
                    legendSidebar.classList.remove('collapsed');
                    sidebarState.legend.isOpen = true;
                    if (controlsSidebar && !controlsSidebar.classList.contains('collapsed')) {
                        controlsSidebar.classList.add('collapsed');
                        sidebarState.controls.isOpen = false;
                    }
                }
                document.removeEventListener('touchmove', tempTouchMove);
                document.removeEventListener('touchend', tempTouchEnd);
            };
            document.addEventListener('touchmove', tempTouchMove);
            document.addEventListener('touchend', tempTouchEnd, { once: true });
        }
        // Right edge - prepare to open controls
        else if (touchX > screenWidth - 50 && controlsSidebar && controlsSidebar.classList.contains('collapsed')) {
            const tempTouchMove = (e) => {
                touchEndX = e.touches[0].clientX;
                touchEndY = e.touches[0].clientY;
            };
            const tempTouchEnd = () => {
                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;
                if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50) {
                    controlsSidebar.classList.remove('collapsed');
                    sidebarState.controls.isOpen = true;
                    if (legendSidebar && !legendSidebar.classList.contains('collapsed')) {
                        legendSidebar.classList.add('collapsed');
                        sidebarState.legend.isOpen = false;
                    }
                }
                document.removeEventListener('touchmove', tempTouchMove);
                document.removeEventListener('touchend', tempTouchEnd);
            };
            document.addEventListener('touchmove', tempTouchMove);
            document.addEventListener('touchend', tempTouchEnd, { once: true });
        }
    });
    
}

/**
 * Hide old dashboard controls (view type, date pickers, update buttons)
 */
function hideOldControls() {
    const controls = document.querySelector('.controls');
    if (controls) {
        controls.style.display = 'none';
    }
}

/**
 * Initialize annular visualization
 */
async function initializeAnnularViz() {
    try {
        console.log('Initializing annular visualization...');

        // Set year slider max to current year dynamically
        const yearSlider = document.getElementById('year-slider');
        if (yearSlider) {
            const currentYear = new Date().getFullYear();
            yearSlider.max = currentYear;
            yearSlider.value = Math.round((parseInt(yearSlider.min) + currentYear) / 2);
        }

        // Create annular visualization instance
        annularViz = new AnnularVisualization('annular-viz');
        window.annularViz = annularViz;

/**
 * Update summary statistics from current data
 */
async function updateSummaryStats() {
    try {
        // Use API utility with shorter time range (last 30 days for faster load)
        const dateRange = API.getLastNDays(30);
        const result = await API.getDailyData(dateRange.start, dateRange.end);
        
        if (result.summary) {
            document.getElementById('totalGeneration').textContent =
                parseFloat(result.summary.totalGeneration).toLocaleString();
            document.getElementById('avgGeneration').textContent =
                parseFloat(result.summary.avgDailyGeneration).toFixed(1);
            document.getElementById('dataPoints').textContent =
                result.summary.totalDays;
            
            if (result.summary.peakDay) {
                document.getElementById('peakPeriod').textContent = result.summary.peakDay.date;
                document.getElementById('peakValue').textContent =
                    `${parseFloat(result.summary.peakDay.totalKwh).toFixed(1)} kWh`;
            }
        }
    } catch (error) {
        console.error('Error updating summary stats:', error);
    }
}
        
        // Initialize it
        await annularViz.initialize();
        
        console.log('Annular visualization initialized successfully');
        hideLoading();
        
    } catch (error) {
        console.error('Failed to initialize annular visualization:', error);
        console.error('Error details:', error.message, error.stack);
        showError('Failed to initialize visualization: ' + error.message);
        hideLoading();
    }
}

/**
 * Show loading indicator
 */
function showLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

/**
 * Show error message
 */
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorMessage && errorText) {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
    }
    hideLoading();
}

/**
 * Hide error message
 */
function hideError() {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

/**
 * Keyboard zoom: Up/+ to zoom in, Down/- to zoom out.
 * Mirrors the mobile pinch-to-zoom range (1x–2x) in 0.1 steps.
 */
function setupKeyboardZoom() {
    const target = document.querySelector('.viz-container');
    if (!target) return;

    target.style.transformOrigin = 'center center';
    let currentScale = 1.0;

    document.addEventListener('keydown', (e) => {
        // Don't intercept when typing in a control
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        let changed = false;
        if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
            currentScale = Math.min(3.0, parseFloat((currentScale + 0.1).toFixed(1)));
            changed = true;
        } else if (e.key === 'ArrowDown' || e.key === '-') {
            currentScale = Math.max(1.0, parseFloat((currentScale - 0.1).toFixed(1)));
            changed = true;
        }

        if (changed) {
            e.preventDefault();
            target.style.transform = currentScale === 1.0 ? '' : `scale(${currentScale})`;
        }
    });

    target.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        currentScale = Math.min(3.0, Math.max(1.0, parseFloat((currentScale + delta).toFixed(1))));
        target.style.transform = currentScale === 1.0 ? '' : `scale(${currentScale})`;
    }, { passive: false });
}

/**
 * Two-finger pinch-to-zoom for the visualization (mobile only).
 * Scales between 1x and 2x, centred on the element.
 */
function setupPinchZoom() {
    const target = document.querySelector('.viz-container');
    if (!target) return;

    target.style.transformOrigin = 'center center';

    let currentScale = 1;
    let startScale = 1;
    let startDist = null;

    function pinchDist(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    target.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            startDist = pinchDist(e.touches);
            startScale = currentScale;
        }
    }, { passive: true });

    target.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && startDist !== null) {
            e.preventDefault();
            const scale = Math.min(3, Math.max(1, startScale * pinchDist(e.touches) / startDist));
            currentScale = scale;
            target.style.transform = `scale(${scale})`;
        }
    }, { passive: false });

    target.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            startDist = null;
        }
    }, { passive: true });
}

// Log when dashboard is ready
console.log('Solar Dashboard loaded successfully');

// Made with Bob
