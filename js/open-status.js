/* ============================================
   BAND OF MEN - Open / Closed Indicator
   ============================================
   Computes status using salon hours in UK time
   (Europe/London) and renders small badges.
   ============================================ */

(function () {
    const SHOP_TIME_ZONE = 'Europe/London';

    // 0 = Sun ... 6 = Sat
    const HOURS = {
        0: [],
        1: [{ start: '09:00', end: '18:00' }], // Mon
        2: [{ start: '09:00', end: '18:00' }], // Tue
        3: [{ start: '09:00', end: '18:00' }], // Wed
        4: [{ start: '09:00', end: '19:00' }], // Thu
        5: [{ start: '09:00', end: '19:00' }], // Fri
        6: [{ start: '08:00', end: '16:00' }], // Sat
    };

    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const WEEKDAY_TO_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

    function parseHM(hm) {
        const [h, m] = hm.split(':').map(Number);
        return (h * 60) + (m || 0);
    }

    function getZonedNowParts(date) {
        // Pulls weekday + time parts in the salon's timezone.
        const dtf = new Intl.DateTimeFormat('en-GB', {
            timeZone: SHOP_TIME_ZONE,
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        const parts = dtf.formatToParts(date);
        const out = {};
        for (const p of parts) out[p.type] = p.value;

        const weekday = out.weekday; // e.g. "Mon"
        const hour = Number(out.hour);
        const minute = Number(out.minute);
        return { weekday, hour, minute };
    }

    function computeStatus(now = new Date()) {
        const { weekday, hour, minute } = getZonedNowParts(now);
        const dow = WEEKDAY_TO_INDEX[weekday];
        const nowMin = (hour * 60) + minute;

        const todays = (HOURS[dow] || []).map(i => ({
            start: i.start,
            end: i.end,
            startMin: parseHM(i.start),
            endMin: parseHM(i.end),
        }));

        // Open now?
        for (const interval of todays) {
            if (nowMin >= interval.startMin && nowMin < interval.endMin) {
                return {
                    isOpen: true,
                    detail: `Closes ${interval.end}`,
                };
            }
        }

        // Find next opening time (today or later)
        let next = null;
        for (let offset = 0; offset <= 7; offset++) {
            const day = (dow + offset) % 7;
            const intervals = (HOURS[day] || []).map(i => ({
                start: i.start,
                startMin: parseHM(i.start),
            }));
            if (intervals.length === 0) continue;

            if (offset === 0) {
                const laterToday = intervals.find(i => i.startMin > nowMin);
                if (laterToday) {
                    next = { day, offset, start: laterToday.start };
                    break;
                }
            } else {
                // Use the first interval start for that day.
                intervals.sort((a, b) => a.startMin - b.startMin);
                next = { day, offset, start: intervals[0].start };
                break;
            }
        }

        if (!next) {
            return {
                isOpen: false,
                detail: 'See hours below',
            };
        }

        if (next.offset === 0) {
            return {
                isOpen: false,
                detail: `Opens ${next.start}`,
            };
        }

        return {
            isOpen: false,
            detail: `Opens ${DAY_LABELS[next.day]} ${next.start}`,
        };
    }

    function renderStatus(el, status) {
        if (!el) return;

        el.classList.toggle('is-open', !!status.isOpen);
        el.classList.toggle('is-closed', !status.isOpen);
        el.setAttribute('title', 'Based on salon hours (UK time)');

        const label = status.isOpen ? 'Open now' : 'Closed now';
        el.innerHTML = `
            <span class="open-status__dot" aria-hidden="true"></span>
            <span class="open-status__label">${label}</span>
            <span class="open-status__detail">${status.detail}</span>
        `.trim();
    }

    function update() {
        const status = computeStatus(new Date());
        renderStatus(document.getElementById('openStatusHero'), status);
        renderStatus(document.getElementById('openStatusContact'), status);
    }

    function scheduleMinuteUpdates() {
        // Update immediately, then align to the next minute for clean status changes.
        update();
        const d = new Date();
        const msToNextMinute = (60 - d.getSeconds()) * 1000 - d.getMilliseconds();
        setTimeout(() => {
            update();
            setInterval(update, 60 * 1000);
        }, msToNextMinute);
    }

    document.addEventListener('DOMContentLoaded', () => {
        try {
            scheduleMinuteUpdates();
        } catch (e) {
            // If timezone formatting fails for any reason, fail quietly.
            console.warn('Open/Closed indicator unavailable:', e);
        }
    });
})();
