/* Contact form handler for Netlify Functions, with mailto fallback if unavailable. */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    if (!form) return;
    const submitButton = form.querySelector('button[type="submit"]');
    const status = document.getElementById('contactStatus');

    function setStatus(message, isError = false) {
        if (!status) return;
        status.textContent = message;
        status.style.color = isError ? '#d7a5a5' : '';
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = document.getElementById('contactName')?.value?.trim() || '';
        const email = document.getElementById('contactEmail')?.value?.trim() || '';
        const message = document.getElementById('contactMessage')?.value?.trim() || '';
        const company = form.elements.company?.value?.trim() || '';

        if (!name || !email || !message) {
            setStatus('Please complete all fields before sending.', true);
            return;
        }

        submitButton?.setAttribute('disabled', 'disabled');
        setStatus('Sending message...');

        try {
            const response = await fetch('/.netlify/functions/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message, company })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                // Keep validation-style errors in the page instead of falling back to mailto.
                if (response.status >= 400 && response.status < 500) {
                    setStatus(data?.error || 'Please check your details and try again.', true);
                    return;
                }

                throw new Error(data?.error || 'Failed to send message.');
            }

            form.reset();
            setStatus(
                data?.confirmationSent === false
                    ? 'Message sent. We will get back to you soon.'
                    : 'Message sent. We will get back to you soon, and you should receive a confirmation email.'
            );
            return;
        } catch (error) {
            setStatus('Online send unavailable. Opening your email app instead.', true);
        } finally {
            submitButton?.removeAttribute('disabled');
        }

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
