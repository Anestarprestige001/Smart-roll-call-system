import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const outputFile = path.join(publicDir, 'version.json');

const buildId = process.env.VITE_BUILD_ID || process.env.GITHUB_SHA || `build-${Date.now()}`;

const payload = {
  version: buildId,
  generatedAt: new Date().toISOString(),
};

writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Generated ${outputFile} with version ${buildId}`);
