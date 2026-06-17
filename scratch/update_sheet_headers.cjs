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

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.GOOGLE_CLIENT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });
const sheetId = env.GOOGLE_SHEET_ID;

// 새로운 헤더 순서 정의
const NEW_HEADERS = [
  'ID', '사고번호', '사고일', '사고접수일', '가이드제공일', '사업부', '부서', '담당자', '실화주', '고객사', '귀책사', '사고명', '사고내용', '진행경과', '대표이사 보고사항', '대표이사 보고일', '사고금액(텍스트)', '사고액', '배상액', '회수액', '손실액', '완료보고', '완료방법', '보험접수', '접수일', '보험사', '접수보험', '사건번호', '증권번호', '보험보상여부', '보험보상유형', '보험금', '파일수', '드라이브URL'
];

async function run() {
  try {
    console.log('Sheet ID:', sheetId);
    
    // 1. 기존 데이터 전체 읽기
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Accidents!A1:AZ1000',
    });

    const rows = getResponse.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found in sheet.');
      return;
    }

    const oldHeaders = rows[0];
    const dataRows = rows.slice(1);
    console.log('Old Headers:', oldHeaders);

    // 2. 새로운 헤더 순서에 맞게 데이터 재정렬
    const updatedValues = [NEW_HEADERS];

    for (const row of dataRows) {
      // oldHeaders 기준으로 객체 매핑
      const rowObj = {};
      oldHeaders.forEach((header, idx) => {
        rowObj[header] = row[idx] || '';
      });

      // 신규 필드 기본값 부여 (사고접수일은 사고일이 있다면 사고일로 복사, 나머지는 빈값)
      if (!rowObj['사고접수일']) {
        rowObj['사고접수일'] = rowObj['사고일'] || '';
      }
      if (!rowObj['가이드제공일']) {
        rowObj['가이드제공일'] = '';
      }
      if (!rowObj['대표이사 보고사항']) {
        rowObj['대표이사 보고사항'] = '';
      }
      if (!rowObj['대표이사 보고일']) {
        rowObj['대표이사 보고일'] = '';
      }

      // NEW_HEADERS 순서대로 값 배열 생성
      const newRow = NEW_HEADERS.map(header => rowObj[header] || '');
      updatedValues.push(newRow);
    }

    // 3. 시트 클리어 (기존 데이터를 완전히 지우고 새 구조로 쓰기 위함)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'Accidents!A1:AZ1000',
    });

    // 4. 새 데이터 쓰기
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Accidents!A1:${googleColumnName(NEW_HEADERS.length)}${updatedValues.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: updatedValues,
      },
    });

    console.log('Successfully updated sheet headers and data mapping!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// 컬럼 인덱스를 A, B, C... Z, AA 형태로 변환하는 함수
function googleColumnName(num) {
  let name = '';
  while (num > 0) {
    let temp = (num - 1) % 26;
    name = String.fromCharCode(65 + temp) + name;
    num = (num - temp - 1) / 26;
  }
  return name;
}

run();
