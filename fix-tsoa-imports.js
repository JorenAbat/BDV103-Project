/* eslint-env node */
/* eslint-disable no-undef */
import fs from 'fs';

const file = './build/tsoa-routes.ts';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  // Add .js to any import from hello.route (matches the actual tsoa generation pattern)
  content = content.replace(/from '([^']*hello\.route)'/g, "from '$1.js'");
  fs.writeFileSync(file, content);
  console.log('Patched tsoa-routes.ts for ESM import extensions.');
} else {
  console.warn('No tsoa-routes.ts file found to patch.');
} 