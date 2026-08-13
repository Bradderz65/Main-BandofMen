/* ============================================
   BAND OF MEN - Gallery
   ============================================
   Paginated gallery + accessible lightbox
   ============================================ */

const Gallery = {
    PAGE_SIZE: 12,
    grid: null,
    button: null,
    footer: null,
    items: [],
    shownCount: 0,
    currentImageIndex: 0,
    lastFocus: null,
    lightbox: null,
    focusables: [],

    getBestSrc(src) {
        if (!src) return src;
        if (window.__bomSupportsWebp === true) {
            return src.replace(/\.(jpe?g)$/i, '.webp');
        }
        return src;
    },

    init() {
        this.grid = document.getElementById('gallery-grid');
        this.button = document.getElementById('gallery-btn');
        this.footer = document.querySelector('.gallery-footer');
        this.items = this.grid ? Array.from(this.grid.querySelectorAll('.gallery-item')) : [];

        this.prepareDeferredImages();
        this.showUpTo(this.PAGE_SIZE, { animate: true });
        this.initLightbox();
    },

    prepareDeferredImages() {
        this.items.forEach((item, index) => {
            const img = item.querySelector('img');
            if (!img) return;
            img.decoding = 'async';
            if (index >= this.PAGE_SIZE && img.getAttribute('src') && !img.dataset.src) {
                img.dataset.src = img.getAttribute('src');
                img.removeAttribute('src');
            }
        });
    },

    showUpTo(count, { animate = false } = {}) {
        const next = Math.min(count, this.items.length);
        this.items.forEach((item, index) => {
            if (index < next) {
                this.ensureImageLoaded(index);
                item.classList.add('is-shown');
                if (animate && index >= this.shownCount) {
                    item.style.transitionDelay = `${(index - this.shownCount) * 0.04}s`;
                    requestAnimationFrame(() => item.classList.add('visible'));
                } else {
                    item.classList.add('visible');
                }
            } else {
                item.classList.remove('is-shown', 'visible');
                item.style.transitionDelay = '0s';
            }
        });
        this.shownCount = next;
        this.syncButton();
    },

    ensureImageLoaded(index) {
        const item = this.items[index];
        const img = item?.querySelector('img');
        if (!img) return;

        if (!img.getAttribute('src') && img.dataset.src) {
            img.src = this.getBestSrc(img.dataset.src);
        }

        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
        }
    },

    toggle() {
        if (this.shownCount < this.items.length) {
            this.showUpTo(this.shownCount + this.PAGE_SIZE, { animate: true });
            return;
        }
        this.collapse();
    },

    collapse() {
        const header = document.querySelector('header');
        const offset = header ? Math.ceil(header.getBoundingClientRect().height) : 70;
        const top = this.grid
            ? this.grid.getBoundingClientRect().top + window.scrollY - offset - 16
            : 0;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        this.showUpTo(this.PAGE_SIZE);
    },

    syncButton() {
        if (!this.button || !this.footer) return;
        const extra = this.items.length > this.PAGE_SIZE;
        this.footer.classList.toggle('is-visible', extra);
        if (!extra) return;

        if (this.shownCount < this.items.length) {
            const remaining = this.items.length - this.shownCount;
            const next = Math.min(this.PAGE_SIZE, remaining);
            this.button.textContent = `Show ${next} more`;
        } else {
            this.button.textContent = 'Show less';
        }
    },

    initLightbox() {
        const lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';
        lightbox.setAttribute('role', 'dialog');
        lightbox.setAttribute('aria-modal', 'true');
        lightbox.setAttribute('aria-label', 'Haircut gallery');
        lightbox.innerHTML = `
            <button type="button" class="lightbox-close" aria-label="Close gallery">&times;</button>
            <button type="button" class="lightbox-prev" aria-label="Previous haircut">&#10094;</button>
            <img class="lightbox-img" src="" alt="">
            <button type="button" class="lightbox-next" aria-label="Next haircut">&#10095;</button>
            <div class="lightbox-counter" aria-live="polite"></div>
        `;
        document.body.appendChild(lightbox);
        this.lightbox = lightbox;
        this.focusables = Array.from(lightbox.querySelectorAll('button'));

        this.items.forEach((item, index) => {
            item.addEventListener('click', () => this.openLightbox(index));
        });

        lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) this.closeLightbox();
        });

        document.addEventListener('keydown', (e) => this.onKeydown(e));
        lightbox.querySelector('.lightbox-prev').addEventListener('click', () => this.prevImage());
        lightbox.querySelector('.lightbox-next').addEventListener('click', () => this.nextImage());

        this.initSwipeHandlers(lightbox);
    },

    onKeydown(e) {
        if (!this.lightbox?.classList.contains('active')) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            this.closeLightbox();
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.prevImage();
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.nextImage();
            return;
        }
        if (e.key === 'Tab') {
            this.trapFocus(e);
        }
    },

    trapFocus(e) {
        if (this.focusables.length === 0) return;
        const first = this.focusables[0];
        const last = this.focusables[this.focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    },

    initSwipeHandlers(lightbox) {
        let touchStartX = 0;
        const minSwipeDistance = 50;
        const img = lightbox.querySelector('.lightbox-img');

        const markStart = (x) => { touchStartX = x; };
        const markEnd = (x) => {
            const distance = x - touchStartX;
            if (Math.abs(distance) > minSwipeDistance) {
                if (distance > 0) this.prevImage();
                else this.nextImage();
            }
        };

        img.addEventListener('touchstart', (e) => markStart(e.changedTouches[0].screenX), { passive: true });
        img.addEventListener('touchend', (e) => markEnd(e.changedTouches[0].screenX), { passive: true });
        lightbox.addEventListener('touchstart', (e) => {
            if (e.target === lightbox) markStart(e.changedTouches[0].screenX);
        }, { passive: true });
        lightbox.addEventListener('touchend', (e) => {
            if (e.target === lightbox) markEnd(e.changedTouches[0].screenX);
        }, { passive: true });
    },

    openLightbox(index) {
        this.currentImageIndex = index;
        this.lastFocus = document.activeElement;
        this.updateLightboxImage();
        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.lightbox.querySelector('.lightbox-close').focus();
    },

    closeLightbox() {
        this.lightbox.classList.remove('active');
        document.body.style.overflow = '';
        if (this.lastFocus && typeof this.lastFocus.focus === 'function') {
            this.lastFocus.focus();
        }
    },

    prevImage() {
        this.currentImageIndex = (this.currentImageIndex - 1 + this.items.length) % this.items.length;
        this.updateLightboxImage();
    },

    nextImage() {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.items.length;
        this.updateLightboxImage();
    },

    updateLightboxImage() {
        this.ensureImageLoaded(this.currentImageIndex);
        const item = this.items[this.currentImageIndex];
        const source = item?.querySelector('img');
        const img = this.lightbox.querySelector('.lightbox-img');
        const counter = this.lightbox.querySelector('.lightbox-counter');
        if (!source || !img) return;

        img.src = source.src || this.getBestSrc(source.dataset.src);
        img.alt = source.alt || item.dataset.caption || '';
        if (counter) {
            counter.textContent = `${this.currentImageIndex + 1} / ${this.items.length}`;
        }
    }
};

function toggleGallery() {
    Gallery.toggle();
}

document.addEventListener('DOMContentLoaded', () => {
    Gallery.init();
});
