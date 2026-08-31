const fs = require('fs');
const filePath = 'd:/사고관리시스템/web-app/src/app/page.js';
const content = fs.readFileSync(filePath, 'utf8');

// page.js 안의 initialRows 또는 저장된 사고 데이터 분석용 스크립트
const initialRowsMatch = content.match(/const initialAccidentRows = (\[[\s\S]*?\]);/);

if (initialRowsMatch) {
  try {
    // 평가
    const evalCode = `const data = ${initialRowsMatch[1]}; return data;`;
    const rows = new Function(evalCode)();
    
    console.log('=== 전체 데이터 건수:', rows.length);
    
    const summary = {};
    rows.forEach(r => {
      const rep = r.완료보고 || '미입력(미완료)';
      const method = r.완료방법 || '미입력';
      const key = `완료보고:[${rep}] / 완료방법:[${method}]`;
      summary[key] = (summary[key] || 0) + 1;
    });

    console.log('=== 상태별 집계 현황 ===');
    console.log(JSON.stringify(summary, null, 2));

  } catch(e) {
    console.log('EVAL_ERROR:', e.message);
  }
} else {
  console.log('INITIAL_ROWS_NOT_FOUND');
}
