const form = document.getElementById('contactForm');
if (form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const status = document.getElementById('contactStatus');
    const fallback = document.getElementById('contactFallback');
    let sending = false;
    const setStatus = (message, isError = false) => {
        status.textContent = message;
        status.classList.toggle('is-error', isError);
    };
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (sending || !form.reportValidity()) return;
        const values = Object.fromEntries(new FormData(form));
        for (const key of Object.keys(values)) values[key] = values[key].trim();
        if (!values.name || values.message.length < 10) {
            setStatus('Please enter your name and a message of at least 10 characters.', true);
            (!values.name ? form.elements.name : form.elements.message).focus();
            return;
        }
        const emailBody = `Name: ${values.name}\nEmail: ${values.email}\nPhone: ${values.phone || 'Not provided'}\n\n${values.message}`;
        fallback.href = `mailto:info@bandofmen.co.uk?subject=${encodeURIComponent(`Website enquiry from ${values.name}`)}&body=${encodeURIComponent(emailBody)}`;
        fallback.hidden = true;
        sending = true;
        submitButton.disabled = true;
        form.setAttribute('aria-busy', 'true');
        setStatus('Sending your message…');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch('/.netlify/functions/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
                signal: controller.signal
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || data?.success !== true) {
                if (response.status === 400 || response.status === 413 || response.status === 429) {
                    setStatus(response.status === 429 ? 'Please wait a minute before sending another message.' : (data?.error || 'Please check your details and try again.'), true);
                    return;
                }
                throw new Error('Sending unavailable');
            }
            form.reset();
            setStatus('Message sent. Sam will get back to you using the details you provided.');
        } catch {
            setStatus('We couldn’t confirm your message was sent. Your text is still here. Try again, or use the link below to send it from your email app.', true);
            fallback.hidden = false;
        } finally {
            clearTimeout(timeout);
            sending = false;
            submitButton.disabled = false;
            form.removeAttribute('aria-busy');
        }
    });
}
