import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from '@oai/artifact-tool';
const dir='C:/Users/jusan/Desktop/AethonP/artifacts/aethon-ir-v5/build';
const p=Presentation.load(JSON.parse(await fs.readFile(dir+'/presentation.json','utf8')));
p.slides.keep([0,1]);
await (await PresentationFile.exportPptx(p)).save(dir+'/import-test-2pages.pptx');
console.log('Two-page import test created');
