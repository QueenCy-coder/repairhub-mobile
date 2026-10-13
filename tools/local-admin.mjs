// Admin actions on the LOCAL test API (see run-local-api.mjs), for testing the app end to end.
//   node tools/local-admin.mjs pending | approve <id> | reject <id> "<feedback>" | disputes
//                              resolve <id> release|refund|partial [amount] | withdrawals | paywd <id> | stats
// Uses the local admin account created by run-local-api.mjs (.local-api-db/admin.json). Never points at a real server.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const API = 'http://localhost:5055/api';
const a = JSON.parse(fs.readFileSync(path.join(here, '../.local-api-db/admin.json'), 'utf8'));
const tok = (await (await fetch(API + '/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) })).json()).data.token;
const call = async (m, p, b) => (await (await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: b ? JSON.stringify(b) : undefined })).json());
const [cmd, arg, arg2] = process.argv.slice(2);
const out = x => console.log(typeof x === 'string' ? x : JSON.stringify(x));
if (cmd === 'pending') out((await call('GET', '/technician-profiles/pending')).data.map(p => ({ id: p._id, name: p.userId?.fullName, areas: p.serviceAreas, docs: p.verificationDocs.length, cats: p.serviceCategoryIds.length })));
if (cmd === 'approve') out((await call('PATCH', `/technician-profiles/${arg}/verify`, { decision: 'approve' })).message);
if (cmd === 'reject') out((await call('PATCH', `/technician-profiles/${arg}/verify`, { decision: 'reject', feedback: arg2 })).message);
if (cmd === 'disputes') out((await call('GET', '/disputes?status=open')).data.map(d => ({ id: d._id, reason: d.reason, job: d.repairJobId?._id, pay: d.repairJobId?.payment?.status })));
if (cmd === 'resolve') out((await call('PATCH', `/disputes/${arg}/resolve`, { decision: arg2, ...(arg2 === 'partial' ? { refundAmount: Number(process.argv[5]) } : {}), note: 'Reviewed by RepairHub (local test).' })).message);
if (cmd === 'withdrawals') out((await call('GET', '/admin/withdrawals')).data.map(w => ({ id: w._id, amount: w.amount, status: w.status, who: w.userId?.fullName })));
if (cmd === 'paywd') out((await call('PATCH', `/admin/withdrawals/${arg}`, { decision: 'paid' })).message);
if (cmd === 'stats') out((await call('GET', '/admin/stats')).data);
