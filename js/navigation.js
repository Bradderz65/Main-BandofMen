const toggle = document.getElementById('menuToggle');
const menu = document.getElementById('mobileMenu');
if (toggle && menu) {
    toggle.hidden = false;
    const closeMenu = (restoreFocus = false) => {
        menu.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.querySelector('.menu-toggle-label').textContent = 'Menu';
        if (restoreFocus) toggle.focus();
    };
    toggle.addEventListener('click', () => {
        const open = menu.hidden;
        menu.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.querySelector('.menu-toggle-label').textContent = open ? 'Close' : 'Menu';
    });
    menu.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (!link) return;
        closeMenu();
        if (link.hash && link.origin === location.origin) {
            const target = document.getElementById(link.hash.slice(1));
            if (target) {
                target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            }
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !menu.hidden) closeMenu(true);
    });
    document.addEventListener('click', (event) => {
        if (!menu.hidden && !event.target.closest('.site-header')) closeMenu();
    });
    // This is an inline disclosure, not a modal. Keyboard users can tab out.
    document.querySelector('.site-header').addEventListener('focusout', (event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) closeMenu();
    });
    matchMedia('(min-width: 851px)').addEventListener('change', (event) => {
        if (event.matches) closeMenu();
    });
}
