const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.js');
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

// Keep lines 0-522 (up to and including sendPreview closing brace)
// Keep lines 919 onwards (from checkAndGeneratePreMeetingDocs onwards)
const keep1 = lines.slice(0, 523); // 0-522
const keep2 = lines.slice(919); // 919 to end

const newLines = [...keep1, ...keep2];
fs.writeFileSync(filePath, newLines.join('\n'));

console.log(`✅ Cleaned up index.js: ${lines.length} -> ${newLines.length} lines`);
console.log(`Deleted ${lines.length - newLines.length} lines of duplicate code`);
