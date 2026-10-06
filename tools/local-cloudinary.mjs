// Local stand-in for config/cloudinary.js (used only by run-local-api.mjs on this Mac).
// Uploads are written to .local-api-db/media and served on port 5056, so photos work without a Cloudinary account.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Writable } from 'node:stream';

const dir = process.env.LOCAL_MEDIA_DIR;
const base = process.env.LOCAL_MEDIA_URL;

const sniff = (b) => (b[0] === 0x89 ? 'png' : b[0] === 0xff ? 'jpg' : b.slice(4, 8).toString() === 'ftyp' ? 'mp4' : b.slice(0, 4).toString() === '%PDF' ? 'pdf' : 'bin');

const cloudinary = {
  config() {},
  uploader: {
    upload_stream(opts, cb) {
      const chunks = [];
      return new Writable({
        write(c, _e, next) { chunks.push(c); next(); },
        final(done) {
          const buf = Buffer.concat(chunks);
          const id = `${(opts?.folder || 'repairhub').replace(/\W/g, '-')}-${crypto.randomBytes(6).toString('hex')}`;
          const file = `${id}.${sniff(buf)}`;
          fs.writeFileSync(path.join(dir, file), buf);
          cb(null, { secure_url: `${base}/${file}`, public_id: id });
          done();
        },
      });
    },
    destroy: async () => ({ result: 'ok' }),
  },
};
export default cloudinary;
export { cloudinary as v2 };
