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
    const nameIdx = headers.indexOf('사고명');
    
    console.log('완료보고 Index:', reportIdx, '완료방법 Index:', methodIdx);
    
    const stats = {};
    const methodStats = {};
    
    rows.slice(1).forEach((r, rowIdx) => {
      const reportVal = r[reportIdx] || '';
      const methodVal = r[methodIdx] || '';
      const occurVal = r[occurIdx] || '';
      const nameVal = r[nameIdx] || '';
      
      if (!nameVal.trim()) return; // 빈 행 제외
      
      stats[reportVal] = (stats[reportVal] || 0) + 1;
      methodStats[methodVal] = (methodStats[methodVal] || 0) + 1;
      
      if (reportVal.includes('무의') || reportVal.includes('무이') || methodVal.includes('무의') || methodVal.includes('무이')) {
        console.log(`Row ${rowIdx + 2}: [사고명: ${nameVal}] [완료보고: ${reportVal}] [완료방법: ${methodVal}] [사고액: ${occurVal}]`);
      }
    });
    
    console.log('\n--- 완료보고 분포 ---');
    console.log(stats);
    
    console.log('\n--- 완료방법 분포 ---');
    console.log(methodStats);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
