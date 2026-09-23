const tablist = document.querySelector('.menu-selector');
if (tablist) {
    const tabs = [...tablist.querySelectorAll('button')];
    tablist.setAttribute('role', 'tablist');
    const select = (selected, focus = false) => {
        tabs.forEach((tab) => {
            const active = tab === selected;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
            const panel = document.getElementById(tab.getAttribute('aria-controls'));
            panel.setAttribute('role', 'tabpanel');
            panel.tabIndex = 0;
            panel.hidden = !active;
        });
        if (focus) selected.focus({ preventScroll: true });
    };
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => select(tab));
        tab.addEventListener('keydown', (event) => {
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
            if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = tabs.length - 1;
            if (next !== undefined) {
                event.preventDefault();
                select(tabs[next], true);
            }
        });
    });
    select(tabs[0]);
}
