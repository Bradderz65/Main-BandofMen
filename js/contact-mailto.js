/* Contact form mailto handler: opens user's default email client with prefilled content. */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const name = document.getElementById('contactName')?.value?.trim() || '';
        const email = document.getElementById('contactEmail')?.value?.trim() || '';
        const message = document.getElementById('contactMessage')?.value?.trim() || '';

        const subject = `Website enquiry from ${name || 'customer'}`;
        const body = [
            `Name: ${name}`,
            `Email: ${email}`,
            '',
            'Message:',
            message
        ].join('\n');

        const mailto = `mailto:info@bandofmen.co.uk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
    });
});
