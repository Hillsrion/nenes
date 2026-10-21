import { readFile, writeFile } from 'node:fs/promises';
import { renderSymptomIllustration } from './lib/symptom-illustrations.mjs';

const definitions = JSON.parse(await readFile(new URL('../config/symptom-photo-illustrations.json', import.meta.url), 'utf8'));
const output = new URL('../public/images/symptoms/updated/', import.meta.url);

for (const [index, definition] of definitions.entries()) {
  await writeFile(new URL(`symptoms-0${index + 1}.svg`, output), renderSymptomIllustration(definition).contours);
}
