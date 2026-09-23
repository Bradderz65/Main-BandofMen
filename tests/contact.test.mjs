import test from 'node:test';
import assert from 'node:assert/strict';
import contact from '../netlify/functions/contact.js';
const valid = { name: 'Test Visitor', email: 'visitor@example.com', phone: '', message: 'A test enquiry that must never be sent.' };
const request = (body, headers = {}) => new Request('http://localhost/.netlify/functions/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('validates method, malformed input and required details before contacting provider', async () => {
    assert.equal((await contact(new Request('http://localhost/'))).status, 405);
    assert.equal((await contact(request(valid, { 'Content-Type': 'text/plain' }))).status, 415);
    for (const body of ['{broken', null, [], {}, { ...valid, name: ' ' }, { ...valid, email: 'invalid' }, { ...valid, phone: 'abc' }, { ...valid, message: 'short' }]) {
        assert.equal((await contact(request(body))).status, 400);
    }
});
test('bounds field and body sizes with and without Content-Length', async () => {
    assert.equal((await contact(request({ ...valid, message: 'x'.repeat(5001) }))).status, 400);
    assert.equal((await contact(request({ ...valid, message: 'x'.repeat(25000) }))).status, 413);
    assert.equal((await contact(request(valid, { 'Content-Length': '25000' }))).status, 413);
});
test('honeypot returns without sending and missing configuration fails honestly', async () => {
    const key = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    try {
        assert.deepEqual(await (await contact(request({ ...valid, company: 'bot' }))).json(), { success: true });
        const response = await contact(request(valid));
        assert.equal(response.status, 503);
        assert.doesNotMatch(await response.text(), /API_KEY|DATABASE/);
    } finally { if (key) process.env.RESEND_API_KEY = key; }
});
test('sends only to the salon and only confirms a provider receipt', async (t) => {
    const key = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = 'test-only-not-a-real-key';
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        calls.push({ url, data: JSON.parse(options.body) });
        return Response.json({ id: 'mock-receipt' });
    });
    try {
        const response = await contact(request(valid));
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { success: true });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, 'https://api.resend.com/emails');
        assert.deepEqual(calls[0].data.to, [process.env.CONTACT_TO?.trim() || 'info@bandofmen.co.uk']);
        assert.equal(calls[0].data.reply_to, valid.email);
        assert.match(calls[0].data.text, /A test enquiry/);
    } finally { if (key) process.env.RESEND_API_KEY = key; else delete process.env.RESEND_API_KEY; }
});
test('provider rejection, malformed success and network failure never claim delivery', async (t) => {
    const key = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = 'test-only-not-a-real-key';
    try {
        for (const result of [() => Response.json({ error: 'provider problem' }, { status: 500 }), () => Response.json({}), () => { throw new Error('offline'); }]) {
            const mock = t.mock.method(globalThis, 'fetch', async () => result());
            const response = await contact(request(valid));
            assert.equal(response.status, 502);
            assert.equal((await response.json()).success, undefined);
            mock.mock.restore();
        }
    } finally { if (key) process.env.RESEND_API_KEY = key; else delete process.env.RESEND_API_KEY; }
});
