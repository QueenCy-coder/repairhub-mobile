// Runs the RepairHub API on your computer for app testing, with a local MongoDB (no install needed).
//   BACKEND_DIR=/path/to/RepairHub_api node tools/run-local-api.mjs     → http://localhost:5055/api
// The backend repo must have had `npm install` run. Data persists in .local-api-db next to this folder.
// A local admin (credentials in .local-api-db/admin.json) and the app's categories are seeded on start.
// Payments use the API's Paystack mock mode; uploads are stored locally instead of Cloudinary.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import http from 'node:http';
import module from 'node:module';
import os from 'node:os';

const here = path.dirname(fileURLToPath(import.meta.url));
const api = path.resolve(process.env.BACKEND_DIR ?? path.join(here, '../backend-api'));
const dbPath = path.resolve(here, '../.local-api-db');
fs.mkdirSync(path.join(dbPath, 'db'), { recursive: true });

// Local-only admin; its random password is kept in .local-api-db/admin.json (never sent anywhere else).
const adminFile = path.join(dbPath, 'admin.json');
if (!fs.existsSync(adminFile)) fs.writeFileSync(adminFile, JSON.stringify({ email: 'local-admin@example.com', password: crypto.randomBytes(12).toString('base64url') }));
const admin = JSON.parse(fs.readFileSync(adminFile, 'utf8'));

const { MongoMemoryServer } = await import(pathToFileURL(path.join(api, 'node_modules/mongodb-memory-server/index.js')).href);
const mongo = await MongoMemoryServer.create({ instance: { dbPath: path.join(dbPath, 'db'), storageEngine: 'wiredTiger', port: 27055 } });
Object.assign(process.env, {
  MONGO_URI: mongo.getUri('repairhub'),
  JWT_SECRET: process.env.JWT_SECRET || 'local-dev-only-secret-not-for-production-use',
  PAYSTACK_MOCK: 'true',
  // Local only: lets test scripts sign a mock "charge.success" webhook (no real Paystack account involved).
  PAYSTACK_SECRET_KEY: 'local-webhook-test-key',
  PORT: process.env.PORT || '5055',
  NODE_ENV: 'development',
});
process.chdir(api);

// Photo/document uploads: swap the backend's Cloudinary config for a local stand-in that saves files here and
// serves them on port 5056 at this Mac's Wi-Fi address (so phones on the same network can load them too).
const mediaDir = path.join(dbPath, 'media');
fs.mkdirSync(mediaDir, { recursive: true });
const lan = Object.values(os.networkInterfaces()).flat().find(i => i && i.family === 'IPv4' && !i.internal)?.address ?? 'localhost';
process.env.LOCAL_MEDIA_DIR = mediaDir;
process.env.LOCAL_MEDIA_URL = `http://${lan}:5056/media`;
const stub = pathToFileURL(path.join(here, 'local-cloudinary.mjs')).href;
module.registerHooks({
  resolve(spec, ctx, next) {
    const r = next(spec, ctx);
    return r.url.endsWith('/backend-api/config/cloudinary.js') ? { ...r, url: stub } : r;
  },
});
const TYPES = { jpg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4', pdf: 'application/pdf' };
http.createServer((req, res) => {
  const file = path.join(mediaDir, path.basename(decodeURIComponent((req.url || '').split('?')[0])));
  if (!req.url?.startsWith('/media/') || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[file.split('.').pop()] ?? 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=86400' });
  fs.createReadStream(file).pipe(res);
}).listen(5056);

const { default: mongoose } = await import(pathToFileURL(path.join(api, 'node_modules/mongoose/index.js')).href);
const { default: bcrypt } = await import(pathToFileURL(path.join(api, 'node_modules/bcryptjs/index.js')).href);
const { default: User } = await import(pathToFileURL(path.join(api, 'model/userModel.js')).href);
const { default: Category } = await import(pathToFileURL(path.join(api, 'model/serviceCategoryModel.js')).href);

await mongoose.connect(process.env.MONGO_URI);
if (!(await User.findOne({ email: admin.email }))) {
  await User.create({ fullName: 'Local Admin', email: admin.email, passwordHash: await bcrypt.hash(admin.password, 12), role: 'admin' });
  console.log('Seeded local admin', admin.email);
}
for (const [name, isActive] of [['Smartphones', true], ['Laptops', true], ['Tablets', true], ['Desktops', true], ['Printers', true], ['TVs', false], ['Refrigerators', false]]) {
  if (!(await Category.findOne({ name }))) { await Category.create({ name, isActive }); console.log('Seeded category', name); }
}

await import(pathToFileURL(path.join(api, 'index.js')).href);
const stop = async () => { await mongo.stop({ doCleanup: false }); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
