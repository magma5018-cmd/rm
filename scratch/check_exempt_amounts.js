import fs from 'fs';
import path from 'path';

// .env.local 파일 로딩
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const { sheets, sheetId } = await import('../src/lib/google.js');

const parseAmount = (val) => {
  if (!val) return 0;
  const num = Number(String(val).replace(/[^0-9-]/g, ''));
  return isNaN(num) ? 0 : num;
};

async function run() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Accidents!A1:BZ1000',
    });
    
    const rows = response.data.values || [];
    const headers = rows[0] || [];
    
    const reportIdx = headers.indexOf('완료보고');
    const methodIdx = headers.indexOf('완료방법');
    const occurIdx = headers.indexOf('사고액');
    const compIdx = headers.indexOf('배상액');
    const recovIdx = headers.indexOf('회수액');
    const lossIdx = headers.indexOf('손실액');
    const nameIdx = headers.indexOf('사고명');
    
    rows.slice(1).forEach((r, rowIdx) => {
      const reportVal = r[reportIdx] || '';
      const methodVal = r[methodIdx] || '';
      const occurVal = r[occurIdx] || '';
      const compVal = r[compIdx] || '';
      const recovVal = r[recovIdx] || '';
      const lossVal = r[lossIdx] || '';
      const nameVal = r[nameIdx] || '';
      
      if (!nameVal.trim()) return;
      
      const hasExemptKeywords = reportVal.includes('클레임 없음') || methodVal.includes('면책') || methodVal.includes('무이의') || methodVal.includes('무의이');
      
      if (hasExemptKeywords) {
        const comp = parseAmount(compVal);
        const loss = parseAmount(lossVal);
        if (comp > 0 || loss > 0) {
          console.log(`Row ${rowIdx + 2}: [사고명: ${nameVal}] [완료보고: ${reportVal}] [완료방법: ${methodVal}] [사고액: ${occurVal}] [배상액: ${compVal}] [손실액: ${lossVal}]`);
        }
      }
    });
    
    console.log('Exempt check completed.');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
