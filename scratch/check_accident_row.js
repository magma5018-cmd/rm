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
    console.log('Using Sheet ID:', sheetId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Accidents!A1:BZ1000',
    });
    
    const rows = response.data.values || [];
    const headers = rows[0] || [];
    console.log('Headers:', headers);
    
    const targetRows = rows.slice(1).filter(r => {
      const idx = headers.indexOf('사고액');
      return r[idx] && r[idx].replace(/,/g, '').includes('298302421');
    });

    console.log('Found target rows:', targetRows.length);
    targetRows.forEach(r => {
      console.log('--- Row ---');
      headers.forEach((h, i) => {
        if (r[i]) {
          console.log(`${h}: ${r[i]}`);
        }
      });
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
