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
    
    const dateIdx = headers.indexOf('사고일');
    const reportIdx = headers.indexOf('완료보고');
    const methodIdx = headers.indexOf('완료방법');
    const nameIdx = headers.indexOf('사고명');
    
    const dashStartDate = '2025-12-31';
    const dashEndDate = '2026-07-14';
    
    let totalCount = 0;
    let oldNoClaimCount = 0;
    let newNoClaimCount = 0;
    
    rows.slice(1).forEach((r, rowIdx) => {
      const dateVal = r[dateIdx] || '';
      const reportVal = r[reportIdx] || '';
      const methodVal = r[methodIdx] || '';
      const nameVal = r[nameIdx] || '';
      
      if (!nameVal.trim()) return;
      if (dateVal < dashStartDate || dateVal > dashEndDate) return;
      
      totalCount++;
      
      const isOldNoClaim = reportVal === '완료 (클레임 없음)';
      if (isOldNoClaim) oldNoClaimCount++;
      
      const isNewNoClaim = reportVal.includes('클레임 없음') || methodVal.includes('면책') || methodVal.includes('무이의') || methodVal.includes('무의이');
      if (isNewNoClaim) newNoClaimCount++;
      
      if (isNewNoClaim && !isOldNoClaim) {
        console.log(`Row ${rowIdx + 2}: [사고명: ${nameVal}] [사고일: ${dateVal}] [완료보고: ${reportVal}] [완료방법: ${methodVal}]`);
      }
    });
    
    console.log(`Total Rows in Date Range: ${totalCount}`);
    console.log(`Old No Claim Count: ${oldNoClaimCount}`);
    console.log(`New No Claim Count: ${newNoClaimCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
