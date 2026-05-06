/* ============================================
   BAND OF MEN - Main JavaScript
   ============================================
   Main entry point, scroll reveals, and init
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // WebP detection
    const supportsWebp = (() => {
        try {
            const canvas = document.createElement('canvas');
            return canvas.toDataURL('image/webp').startsWith('data:image/webp');
        } catch (e) {
            return false;
        }
    })();

    window.__bomSupportsWebp = supportsWebp;

    if (supportsWebp) {
        document.querySelectorAll('img[src$=".jpeg"], img[src$=".jpg"]').forEach((img) => {
            const src = img.getAttribute('src');
            if (!src) return;
            img.setAttribute('src', src.replace(/\.(jpe?g)$/i, '.webp'));
        });
    }

    // Keep a CSS var in sync with the real header height
    const updateHeaderHeightVar = () => {
        const header = document.querySelector('header');
        if (!header) return;
        const h = Math.ceil(header.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--header-height-dyn', `${h}px`);
    };

    updateHeaderHeightVar();
    window.addEventListener('resize', () => {
        window.requestAnimationFrame(updateHeaderHeightVar);
    }, { passive: true });
    window.addEventListener('orientationchange', () => {
        setTimeout(updateHeaderHeightVar, 150);
    }, { passive: true });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerHeight = document.querySelector('header')?.offsetHeight || 70;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Intro image load handling
    const introImg = document.querySelector('.intro-img');
    if (introImg) {
        if (introImg.complete) {
            introImg.classList.add('loaded');
        } else {
            introImg.addEventListener('load', () => {
                introImg.classList.add('loaded');
            }, { once: true });
        }
    }

    // Mobile map hover effect on scroll
    const mapSide = document.querySelector('.map-side');
    const isTouchLike = window.matchMedia('(hover: none), (pointer: coarse)').matches;

    if (mapSide && isTouchLike && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                mapSide.classList.toggle('in-view', entry.isIntersecting);
            });
        }, { threshold: 0.35 });
        observer.observe(mapSide);
    }

    // Header scroll state
    const header = document.querySelector('header');
    const syncHeaderScrollState = () => {
        if (!header) return;
        header.classList.toggle('scrolled', window.scrollY > 24);
    };
    syncHeaderScrollState();
    window.addEventListener('scroll', syncHeaderScrollState, { passive: true });

    // ========================================
    // Scroll-Reveal Animation System
    // ========================================
    const revealElements = document.querySelectorAll('.reveal');
    
    if (revealElements.length > 0 && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.08,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach((el) => revealObserver.observe(el));
    } else {
        // Fallback: show all immediately
        revealElements.forEach((el) => el.classList.add('revealed'));
    }

    // Console branding
    console.log('%c BAND OF MEN ', 'background: #c5a059; color: #060b09; font-size: 20px; font-weight: bold; padding: 10px; font-family: "Playfair Display", serif;');
    console.log('%c Legendary Grooming ', 'color: #7a9990; font-size: 12px;');
});
