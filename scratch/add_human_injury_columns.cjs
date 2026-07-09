const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// .env.local 파싱
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let value = m[2] ? m[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[m[1]] = value;
  }
});

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.GOOGLE_CLIENT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });
const sheetId = env.GOOGLE_SHEET_ID;

// 추가할 신규 인명/물적 사고 상세 컬럼 정의
const NEW_COLUMNS = [
  '인명 피해 여부',
  '재해자 성명',
  '재해자 성별',
  '재해자 나이',
  '재해자 국적',
  '재해자 소속',
  '재해자 근무형태',
  '재해자 고용형태',
  '재해자 직종',
  '상해부위',
  '상해종류',
  '상해정도',
  '물적 자산명',
  '물적 손상원인',
  '물적 피해비용',
  '사고 심각도',
  '사고 발생가능성',
  '사고 위험등급',
  '인명 피해 상세 내용'
];

async function migrateTab(tabName) {
  console.log(`Migrating tab: ${tabName}`);
  
  // 1. 첫 번째 행(헤더) 읽기
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:ZZ1`,
  });

  const currentHeaders = res.data.values ? res.data.values[0] : [];
  console.log(`Current ${tabName} headers count:`, currentHeaders.length);

  // 2. 누락된 컬럼 찾기
  const missingCols = [];
  NEW_COLUMNS.forEach(col => {
    if (!currentHeaders.includes(col)) {
      missingCols.push(col);
    }
  });

  if (missingCols.length === 0) {
    console.log(`No missing columns in ${tabName}. Already up to date!`);
    return;
  }

  console.log(`Missing columns in ${tabName}:`, missingCols);

  // 3. 누락된 컬럼을 기존 헤더 뒤에 추가
  const updatedHeaders = [...currentHeaders];
  missingCols.forEach(col => {
    updatedHeaders.push(col);
  });

  // 4. 헤더 업데이트
  const lastColLetter = googleColumnName(updatedHeaders.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:${lastColLetter}1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [updatedHeaders],
    },
  });

  console.log(`Updated ${tabName} headers to include missing columns.`);
}

function googleColumnName(num) {
  let name = '';
  while (num > 0) {
    let temp = (num - 1) % 26;
    name = String.fromCharCode(65 + temp) + name;
    num = (num - temp - 1) / 26;
  }
  return name;
}

async function run() {
  try {
    console.log('Using Sheet ID:', sheetId);
    await migrateTab('Accidents');
    await migrateTab('accident report');
    console.log('Migration finished successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  }
}

run();
