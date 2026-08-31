import fs from 'fs';
import path from 'path';

// .env.local 파일 직접 읽기 및 process.env에 바인딩
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const { sheets, sheetId } = await import('../src/lib/google.js');

async function run() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Accidents!A1:BZ1000',
    });
    
    const rows = response.data.values || [];
    const headers = rows[0] || [];
    
    const targetIds = ['10036', '10044', '10065'];
    const targetRows = rows.slice(1).filter(r => targetIds.includes(r[0]));

    targetRows.forEach(targetRow => {
      console.log('=== Row ID:', targetRow[0], '===');
      targetRow.forEach((val, i) => {
        if (val && val !== '') {
          console.log(`Index ${i} (${headers[i] || 'No Header'}): "${val}"`);
        }
      });
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
