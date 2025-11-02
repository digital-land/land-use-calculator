import fs from 'fs';
import path from 'path';
import { readdir } from 'fs/promises';

async function generateGeographies() {
  const dir = path.resolve('static/data/geographies');
  const files = await readdir(dir);

  // Only keep .bin files
  const bins = files.filter(f => f.endsWith('.bin'));

  const outDir = path.resolve('static/data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, 'geographies.json'),
    JSON.stringify(bins, null, 2)
  );

  console.log('geographies.json generated ✅');
}

generateGeographies();
