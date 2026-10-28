import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const D=path.dirname(fileURLToPath(import.meta.url));
const S='C:/Users/jusan/.codex/plugins/cache/openai-primary-runtime/presentations/26.1020.11348/skills/presentations';
process.env.RUNTIME_NODE_MODULES='C:/Users/jusan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {finalizePresentation}=await import(pathToFileURL(path.join(S,'container_tools/artifact_tool_utils.mjs')));
try {
 const r=await finalizePresentation({workspaceDir:path.resolve(D,'..'),candidatePath:path.join(D,'candidate.pptx'),finalPath:path.resolve(D,'../output/Aethon-IR-20261027-v5.2.pptx'),pythonExecutable:'C:/Users/jusan/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:path.join(S,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(S,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','15240000,8572500','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','8','--require-native-table-slide','13','--require-native-table-slide','18'],requiredNativeTableOwnerSlides:[8,13,18],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:['Malgun Gothic']},verifyArtifactToolImport:true,receiptPath:path.join(D,'final-v5.2.validation.json')});
 console.log(JSON.stringify(r));
} catch(e) {console.error(String(e.stack).slice(0,5000));process.exitCode=2;}


