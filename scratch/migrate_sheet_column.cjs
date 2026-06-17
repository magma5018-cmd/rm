const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// .env.local 수동 파싱
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // 따옴표 제거
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

async function migrate() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const ACCIDENT_SHEET = 'Accidents';

  console.log('Target Sheet ID:', sheetId);
  try {
    // 1. 기존 데이터 전체 가져오기
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${ACCIDENT_SHEET}!A1:AZ1000`,
    });

    const values = res.data.values;
    if (!values || values.length === 0) {
      console.log('시트에 데이터가 존재하지 않습니다.');
      return;
    }

    const headers = values[0];
    console.log('현재 헤더:', headers);

    // 2. 이미 '완료보고일'이 존재하는지 확인
    if (headers.includes('완료보고일')) {
      console.log('이미 완료보고일 컬럼이 구글 시트에 반영되어 있습니다.');
      return;
    }

    // 3. 완료보고 컬럼 인덱스 찾기
    const targetIdx = headers.indexOf('완료보고');
    if (targetIdx === -1) {
      console.error('완료보고 컬럼을 찾을 수 없습니다. 마이그레이션을 중단합니다.');
      return;
    }

    const insertIdx = targetIdx + 1; // 완료보고 바로 오른쪽에 완료보고일 삽입
    console.log(`'완료보고일' 컬럼을 ${insertIdx}번 인덱스에 삽입합니다.`);

    // 4. 모든 행 데이터에 컬럼 삽입
    const migratedValues = values.map((row, idx) => {
      const newRow = [...row];
      if (idx === 0) {
        // 헤더 행에 '완료보고일' 삽입
        newRow.splice(insertIdx, 0, '완료보고일');
      } else {
        // 데이터 행에는 빈 값 삽입
        // (완료 상태인 행인 경우, 빈값으로 일단 둔 후 사용자가 웹에서 보거나 수정하게 함)
        newRow.splice(insertIdx, 0, '');
      }
      return newRow;
    });

    // 5. 안전을 위해 기존 시트 범위의 데이터를 지웁니다.
    // 기존에 AZ열까지 썼을 수 있으므로 넉넉하게 A1:AZ1000을 클리어합니다.
    console.log('기존 데이터를 안전하게 클리어합니다...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${ACCIDENT_SHEET}!A1:AZ1000`,
    });

    // 6. 업데이트된 새 데이터를 시트에 입력합니다.
    // 삽입으로 인해 전체 열 개수가 1개 증가함
    const maxColLetter = getColLetter(migratedValues[0].length);
    const updateRange = `${ACCIDENT_SHEET}!A1:${maxColLetter}${migratedValues.length}`;
    console.log(`새로운 데이터를 구글 시트에 업데이트합니다. 범위: ${updateRange}`);

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: migratedValues,
      },
    });

    console.log('🎉 구글 시트 마이그레이션이 성공적으로 완료되었습니다!');
  } catch (err) {
    console.error('마이그레이션 중 오류 발생:', err);
  }
}

// 컬럼 번호를 엑셀 열 문자(A, B, C... Z, AA, AB...)로 변환하는 함수
function getColLetter(colNum) {
  let temp, letter = '';
  while (colNum > 0) {
    temp = (colNum - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colNum = (colNum - temp - 1) / 26;
  }
  return letter;
}

migrate();
