import { Resend } from 'resend';

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildShell(content) {
    return `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:24px;background:#080f0d;font-family:Arial,sans-serif;color:#e0e6e4;">
            <div style="max-width:640px;margin:0 auto;background:#0f1f1c;border:1px solid rgba(197,160,89,0.2);">
                <div style="padding:24px 28px;border-bottom:1px solid rgba(197,160,89,0.2);">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:0.08em;">
                        BAND OF <span style="color:#c5a059;">MEN</span>
                    </h1>
                    <p style="margin:8px 0 0;color:#8ca39d;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;">
                        Refined. Rugged. Rare.
                    </p>
                </div>
                <div style="padding:24px 28px;">
                    ${content}
                </div>
                <div style="padding:18px 28px;border-top:1px solid rgba(255,255,255,0.05);color:#8ca39d;font-size:12px;">
                    200 Leadwell Lane, Robin Hood, Wakefield, WF3 3AE
                </div>
            </div>
        </body>
        </html>
    `;
}

export default async (req) => {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    try {
        if (!process.env.RESEND_API_KEY) {
            return json({
                error: 'Email provider is not configured: RESEND_API_KEY is missing.'
            }, 500);
        }

        const body = await req.json().catch(() => null);
        const name = String(body?.name || '').trim();
        const email = String(body?.email || '').trim().toLowerCase();
        const message = String(body?.message || '').trim();
        const company = String(body?.company || '').trim(); // honeypot

        if (company) {
            return json({ success: true });
        }

        if (!name || !email || !message) {
            return json({ error: 'Name, email, and message are required.' }, 400);
        }

        if (!isValidEmail(email)) {
            return json({ error: 'Please enter a valid email address.' }, 400);
        }

        if (message.length < 10) {
            return json({ error: 'Message must be at least 10 characters.' }, 400);
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const from =
            (process.env.RESEND_FROM && process.env.RESEND_FROM.trim()) ||
            'Band of Men <send@bandofmen.uk>';
        const to =
            (process.env.CONTACT_TO && process.env.CONTACT_TO.trim()) ||
            'info@bandofmen.co.uk';

        const { error } = await resend.emails.send({
            from,
            to: [to],
            replyTo: email,
            subject: `Website enquiry from ${name}`,
            text: [
                `Name: ${name}`,
                `Email: ${email}`,
                '',
                'Message:',
                message
            ].join('\n'),
            html: buildShell(`
                <p style="margin:0 0 14px;color:#8ca39d;font-size:13px;">New website enquiry</p>
                <p style="margin:0 0 12px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
                <p style="margin:0 0 12px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
                <p style="margin:0 0 8px;"><strong>Message:</strong></p>
                <div style="white-space:pre-wrap;background:rgba(0,0,0,0.22);padding:16px;border-left:3px solid #c5a059;">${escapeHtml(message)}</div>
            `)
        });

        if (error) {
            console.error('Contact email send error:', error);
            return json({ error: 'Failed to send message.' }, 500);
        }

        const confirmation = await resend.emails.send({
            from,
            to: [email],
            subject: 'We have received your message - Band of Men',
            text: [
                `Hi ${name},`,
                '',
                'We have received your message and will get back to you shortly.',
                '',
                'Your message:',
                message,
                '',
                'Band of Men Barber Salon',
                '200 Leadwell Lane, Robin Hood, Wakefield, WF3 3AE'
            ].join('\n'),
            html: buildShell(`
                <p style="margin:0 0 14px;color:#8ca39d;font-size:13px;">Message received</p>
                <h2 style="margin:0 0 14px;color:#ffffff;font-size:26px;font-weight:700;">Hi ${escapeHtml(name)},</h2>
                <p style="margin:0 0 14px;line-height:1.7;color:#e0e6e4;">
                    We have received your message and will get back to you shortly.
                </p>
                <p style="margin:0 0 18px;line-height:1.7;color:#e0e6e4;">
                    If your enquiry is urgent, you can still contact us directly at
                    <a href="mailto:${escapeHtml(to)}" style="color:#c5a059;text-decoration:none;">${escapeHtml(to)}</a>.
                </p>
                <div style="background:rgba(0,0,0,0.22);padding:16px;border-left:3px solid #c5a059;">
                    <p style="margin:0 0 8px;color:#8ca39d;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Your message</p>
                    <div style="white-space:pre-wrap;color:#e0e6e4;">${escapeHtml(message)}</div>
                </div>
            `)
        });

        if (confirmation.error) {
            console.error('Contact confirmation email send error:', confirmation.error);
        }

        return json({
            success: true,
            message: 'Message sent successfully.',
            confirmationSent: !confirmation.error
        });
    } catch (error) {
        console.error('Contact function error:', error);
        return json({ error: 'Failed to send message.' }, 500);
    }
};
