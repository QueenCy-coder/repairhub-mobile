// Local test only: sends the "payment succeeded" notice Paystack would send, signed with the local test key.
//   node tools/local-paystack-webhook.mjs <reference> <amount in naira>
// The reference is shown by the app's checkout (esc_...); the local API runs in Paystack mock mode.
import crypto from 'node:crypto';
const [ref, amount] = process.argv.slice(2);
const body = JSON.stringify({ event: 'charge.success', data: { reference: ref, amount: Number(amount) * 100 } });
const sig = crypto.createHmac('sha512', 'local-webhook-test-key').update(body).digest('hex');
const r = await fetch('http://localhost:5055/api/transactions/webhook/paystack', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-paystack-signature': sig }, body });
console.log('webhook', r.status);
