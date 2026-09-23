const MAX_BYTES = 24_000;
const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

// Netlify enforces this across function instances, before email delivery.
export const config = {
    rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};

export default async function contact(req) {
    if (req.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
        return json({ error: 'Please submit the contact form as JSON.' }, 415);
    }
    if (Number(req.headers.get('content-length')) > MAX_BYTES) return json({ error: 'Your message is too long.' }, 413);

    let body;
    try {
        // Bound reads even when Content-Length is absent or inaccurate.
        const reader = req.body?.getReader();
        if (!reader) return json({ error: 'Please enter your details.' }, 400);
        const chunks = [];
        let length = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            length += value.byteLength;
            if (length > MAX_BYTES) {
                await reader.cancel();
                return json({ error: 'Your message is too long.' }, 413);
            }
            chunks.push(value);
        }
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        return json({ error: 'Please check your details and try again.' }, 400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Please enter your details.' }, 400);
    if (typeof body.company === 'string' && body.company.trim()) return json({ success: true });
    for (const key of ['name', 'email', 'message']) {
        if (typeof body[key] !== 'string') return json({ error: 'Name, email and message are required.' }, 400);
    }
    if (body.phone != null && typeof body.phone !== 'string') return json({ error: 'Please enter a valid phone number.' }, 400);
    const name = body.name.trim();
    const email = body.email.trim();
    const message = body.message.trim();
    const phone = (body.phone || '').trim();
    if (!name || name.length > 100 || /[\r\n]/.test(name)) return json({ error: 'Please enter a name of up to 100 characters.' }, 400);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Please enter a valid email address.' }, 400);
    if (phone && !/^[0-9+\s().-]{7,20}$/.test(phone)) return json({ error: 'Please enter a valid phone number.' }, 400);
    if (message.length < 10 || message.length > 5000) return json({ error: 'Please write between 10 and 5,000 characters.' }, 400);
    if (!process.env.RESEND_API_KEY) return json({ error: 'Online messaging is temporarily unavailable. Please email or call the salon.' }, 503);

    try {
        // Send only to the salon. Do not send arbitrary enquiry content to unverified visitors.
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10_000),
            body: JSON.stringify({
                from: process.env.RESEND_FROM?.trim() || 'Band of Men <send@bandofmen.uk>',
                to: [process.env.CONTACT_TO?.trim() || 'info@bandofmen.co.uk'],
                reply_to: email,
                subject: `Website enquiry from ${name}`,
                text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\n\n${message}`
            })
        });
        const receipt = await response.json().catch(() => null);
        if (!response.ok || !receipt?.id) return json({ error: 'We couldn’t send your message. Please try again or email the salon.' }, 502);
        return json({ success: true });
    } catch {
        return json({ error: 'We couldn’t confirm delivery. Please try again or email the salon.' }, 502);
    }
}
