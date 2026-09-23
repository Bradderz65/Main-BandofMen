const grid = document.getElementById('gallery-grid');
const dialog = document.getElementById('lightbox');
const more = document.getElementById('gallery-btn');
if (grid && dialog && typeof dialog.showModal === 'function') {
    const items = [...grid.querySelectorAll('.gallery-item')];
    const image = dialog.querySelector('.lightbox-img');
    const caption = dialog.querySelector('.lightbox-caption');
    const counter = dialog.querySelector('.lightbox-counter');
    const pageSize = 6;
    let shown = pageSize;
    let current = 0;
    let trigger;
    const showItems = () => {
        items.forEach((item, i) => { item.hidden = i >= shown; });
        document.getElementById('gallery-count').textContent = `${Math.min(shown, items.length)} of ${items.length} cuts`;
        more.textContent = shown >= items.length ? 'Show fewer cuts −' : `Show ${Math.min(pageSize, items.length - shown)} more cuts +`;
    };
    more.hidden = items.length <= pageSize;
    more.addEventListener('click', () => {
        const previous = shown;
        shown = shown >= items.length ? pageSize : Math.min(shown + pageSize, items.length);
        showItems();
        if (shown > previous) items[previous].focus();
        else {
            items[0].focus({ preventScroll: true });
            grid.scrollIntoView({ block: 'start' });
        }
    });
    const update = () => {
        const source = items[current].querySelector('img');
        image.src = items[current].href;
        image.alt = source.alt;
        caption.textContent = items[current].dataset.caption;
        counter.textContent = `${current + 1} / ${items.length}`;
    };
    const advance = (step) => { current = (current + step + items.length) % items.length; update(); };
    items.forEach((item, i) => item.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        current = i;
        trigger = item;
        update();
        dialog.showModal();
        document.body.classList.add('modal-open');
    }));
    dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('.lightbox-prev').addEventListener('click', () => advance(-1));
    dialog.querySelector('.lightbox-next').addEventListener('click', () => advance(1));
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
            const controls = [...dialog.querySelectorAll('button')];
            const first = controls[0];
            const last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            advance(event.key === 'ArrowLeft' ? -1 : 1);
        }
    });
    dialog.addEventListener('close', () => {
        document.body.classList.remove('modal-open');
        trigger?.focus({ preventScroll: true });
    });
    let start;
    image.addEventListener('touchstart', (event) => {
        const point = event.changedTouches[0];
        start = { x: point.clientX, y: point.clientY };
    }, { passive: true });
    image.addEventListener('touchend', (event) => {
        if (!start) return;
        const point = event.changedTouches[0];
        const dx = point.clientX - start.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(point.clientY - start.y)) advance(dx > 0 ? -1 : 1);
        start = null;
    }, { passive: true });
    showItems();
}
