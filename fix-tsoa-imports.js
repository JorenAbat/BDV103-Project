/* eslint-env node */
/* eslint-disable no-undef */
import fs from 'fs';

const file = './build/tsoa-routes.ts';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  // Add .js to any import from hello.route (or other .ts files if needed)
  content = content.replace(/from '(\.\/?[\w/-]+hello\.route)'/g, "from '$1.js'");
  fs.writeFileSync(file, content);
  console.log('Patched tsoa-routes.ts for ESM import extensions.');
} else {
  console.warn('No tsoa-routes.ts file found to patch.');
} 