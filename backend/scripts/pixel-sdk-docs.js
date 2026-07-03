import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sdkFile = path.resolve(__dirname, '../src/services/pixelPanelSDK.js');
const outputDocs = path.resolve(__dirname, '../plugins/SDK_DOCUMENTATION.md');

function generateDocs() {
    const code = fs.readFileSync(sdkFile, 'utf8');
    
    let docs = `# PixelPanel Plugin SDK Documentation\n\n`;
    docs += `Welcome to the PixelPanel Plugin SDK. This documentation is auto-generated from the SDK source.\n\n`;
    docs += `## 🔒 Security Sandbox\n`;
    docs += `Plugins are executed within a restricted Node.js \`vm\` context. You do not have access to \`require\`, \`process\`, or the host file system. You must use the \`sdk\` object provided globally.\n\n`;
    
    docs += `## Available APIs\n\n`;
    
    // Very basic regex to pull out JSDoc and method signatures
    const regex = /\/\*\*\s*\n([^\*]*\*.*?\n)+?\s*\*\/\s*\n\s*(?:[a-zA-Z0-9_]+)\s*:\s*\((.*?)\)/gm;
    
    let match;
    while ((match = regex.exec(code)) !== null) {
        const fullComment = match[0];
        const params = match[2];
        
        // Extract the description
        const descMatch = fullComment.match(/\/\*\*([\s\S]*?)\*\//);
        const description = descMatch ? descMatch[1].replace(/\*/g, '').trim() : '';
        
        // Extract the method name (rough)
        const methodMatch = fullComment.match(/\*\/\s*\n\s*([a-zA-Z0-9_]+)\s*:/);
        const methodName = methodMatch ? methodMatch[1] : 'Method';
        
        docs += `### \`sdk.*.${methodName}(${params})\`\n`;
        docs += `${description}\n\n`;
    }
    
    fs.writeFileSync(outputDocs, docs);
    console.log(`Generated SDK Documentation at: ${outputDocs}`);
}

generateDocs();
