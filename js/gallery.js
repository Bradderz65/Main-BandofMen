/* ============================================
   BAND OF MEN - Gallery
   ============================================
   Gallery expand/collapse functionality
   ============================================ */

const Gallery = {
    grid: null,
    buttonTop: null,
    buttonBottom: null,
    isExpanded: false,
    openedAtY: null,
    openedAtTargetY: null,

    init() {
        this.grid = document.getElementById('gallery-grid');
        this.buttonTop = document.getElementById('gallery-btn');
        this.buttonBottom = document.getElementById('gallery-btn-bottom');
        
        // Show first 4 items initially
        this.showInitialItems();
        this.syncButtons();
        
        // Initialize lightbox
        this.initLightbox();
    },

    initLightbox() {
        // Create lightbox elements
        const lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <button class="lightbox-close" aria-label="Close">&times;</button>
            <button class="lightbox-prev" aria-label="Previous">&#10094;</button>
            <img class="lightbox-img" src="" alt="">
            <button class="lightbox-next" aria-label="Next">&#10095;</button>
        `;
        document.body.appendChild(lightbox);
        
        // Add click handlers to gallery images
        const items = document.querySelectorAll('.gallery-item img');
        items.forEach((img, index) => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => this.openLightbox(index));
        });
        
        // Close handlers
        lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) this.closeLightbox();
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;
            if (e.key === 'Escape') this.closeLightbox();
            if (e.key === 'ArrowLeft') this.prevImage();
            if (e.key === 'ArrowRight') this.nextImage();
        });
        
        // Prev/Next buttons
        lightbox.querySelector('.lightbox-prev').addEventListener('click', () => this.prevImage());
        lightbox.querySelector('.lightbox-next').addEventListener('click', () => this.nextImage());
    },

    openLightbox(index) {
        this.currentImageIndex = index;
        const lightbox = document.getElementById('lightbox');
        const img = lightbox.querySelector('.lightbox-img');
        const items = document.querySelectorAll('.gallery-item img');
        
        img.src = items[index].src;
        img.alt = items[index].alt;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeLightbox() {
        const lightbox = document.getElementById('lightbox');
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    },

    prevImage() {
        const items = document.querySelectorAll('.gallery-item img');
        this.currentImageIndex = (this.currentImageIndex - 1 + items.length) % items.length;
        this.updateLightboxImage();
    },

    nextImage() {
        const items = document.querySelectorAll('.gallery-item img');
        this.currentImageIndex = (this.currentImageIndex + 1) % items.length;
        this.updateLightboxImage();
    },

    updateLightboxImage() {
        const items = document.querySelectorAll('.gallery-item img');
        const lightbox = document.getElementById('lightbox');
        const img = lightbox.querySelector('.lightbox-img');
        img.src = items[this.currentImageIndex].src;
        img.alt = items[this.currentImageIndex].alt;
    },

    getHeaderOffset() {
        const header = document.querySelector('header');
        return header ? Math.ceil(header.getBoundingClientRect().height) : 70;
    },

    rememberOpenPosition() {
        // Store where the user was when they expanded the gallery so "Show Less" can return them there.
        this.openedAtY = window.scrollY;

        if (this.buttonTop) {
            const headerOffset = this.getHeaderOffset();
            const rect = this.buttonTop.getBoundingClientRect();
            const y = rect.top + window.scrollY - headerOffset - 16;
            this.openedAtTargetY = Math.max(0, Math.floor(y));
        } else {
            this.openedAtTargetY = this.openedAtY;
        }
    },

    returnToOpenPosition() {
        const target = typeof this.openedAtTargetY === 'number' ? this.openedAtTargetY : this.openedAtY;
        if (typeof target !== 'number') return;

        window.scrollTo({ top: target, behavior: 'smooth' });
    },

    showInitialItems() {
        if (!this.grid) return;
        
        const items = this.grid.querySelectorAll('.gallery-item:nth-child(-n+4)');
        items.forEach(item => {
            item.classList.add('visible');
        });
    },

    toggle() {
        if (!this.grid || !this.buttonTop) return;

        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
        
        this.isExpanded = !this.isExpanded;
    },

    expand() {
        this.rememberOpenPosition();
        this.grid.classList.add('expanded');
        this.setButtonText('Show Less');
        
        // Show items 5+ with staggered animation
        const items = this.grid.querySelectorAll('.gallery-item:nth-child(n+5)');
        items.forEach((item, index) => {
            item.style.display = 'block';
            item.style.transitionDelay = `${index * 0.05}s`;
            setTimeout(() => {
                item.classList.add('visible');
            }, 10);
        });
    },

    collapse() {
        // Scroll first so the browser doesn't keep us pinned to the bottom as the page height shrinks.
        this.returnToOpenPosition();

        this.grid.classList.remove('expanded');
        this.setButtonText('Show More');
        
        // Animate out items 5+
        const items = this.grid.querySelectorAll('.gallery-item:nth-child(n+5)');
        items.forEach(item => {
            item.classList.remove('visible');
            item.style.transitionDelay = '0s';
        });
        
        // Hide after animation
        setTimeout(() => {
            items.forEach(item => {
                item.style.display = 'none';
            });
        }, 400);
    },

    setButtonText(text) {
        if (this.buttonTop) this.buttonTop.textContent = text;
        if (this.buttonBottom) this.buttonBottom.textContent = text === 'Show More' ? 'Show Less' : text;
        // Note: bottom button is only visible when expanded (CSS).
    },

    syncButtons() {
        // Ensure initial labels are correct if markup changes.
        this.setButtonText(this.isExpanded ? 'Show Less' : 'Show More');
    }
};

// Global function for onclick handler
function toggleGallery() {
    Gallery.toggle();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Gallery.init();
});
