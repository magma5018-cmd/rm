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
const SHEET_NAME = 'accident report';

const HEADERS = [
  'ID',
  '접수일시',
  '작성자 이메일',
  '작성자 이름',
  '담당영업팀/영업사원',
  '담당운영팀/운영사원',
  '운송 종류',
  '수출자(Shipper)',
  '수입자(Consignee)',
  '인코텀즈(Incoterms)',
  '세부 운송 모드',
  'House B/L 번호',
  'Master B/L 번호',
  '선사/항공사 명',
  '해외 파트너/법인',
  '화물 품목(아이템)',
  '출발지 및 출발일(POL/ATD)',
  '도착지 및 도착일(POD/ATA)',
  '총 선적 물량',
  '총 화물 가액',
  '파손 물량',
  '파손건 CI Value',
  '법적 계약 관계',
  '운송 주선 범위(SOW)',
  '사고 발생 구간',
  '구체적 사고 발생 장소',
  '화물 인도 증빙 상태',
  '거래처(화주) 명',
  '상차지(출발지)',
  '하차지(도착지)',
  '운송장/배차 번호',
  '화물 품목 및 피해 물량',
  '실제 발생 손해액',
  '실제 수행 주체',
  '사고 최초 인지 일시',
  '과실 책임 주체',
  '사고 원인 분류',
  '상세 사고 경위',
  '드라이브URL'
];

async function run() {
  try {
    console.log('Sheet ID:', sheetId);
    
    // 1. 시트 메타데이터 조회하여 sheetId 확인
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    
    const targetSheet = meta.data.sheets.find(
      (s) => s.properties.title === SHEET_NAME
    );
    
    if (!targetSheet) {
      console.log(`Sheet "${SHEET_NAME}" not found.`);
      return;
    }
    
    const numericalSheetId = targetSheet.properties.sheetId;
    
    // 2. 기존 데이터 전체 읽기
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A1:AS1000`,
    });

    const rows = getResponse.data.values || [];
    console.log('Existing Rows:', rows.length);

    const hasHeader = rows.length > 0 && rows[0][0] === 'ID';
    
    if (hasHeader) {
      console.log('Header already exists.');
      return;
    }

    if (rows.length === 0) {
      // 비어있으면 1행에 작성
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A1:AZ1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [HEADERS],
        },
      });
      console.log('Headers written to empty sheet.');
    } else {
      // 데이터가 있으면 1행 추가 후 기입
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId: numericalSheetId,
                  dimension: 'ROWS',
                  startIndex: 0,
                  endIndex: 1,
                },
                inheritFromBefore: false,
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A1:AZ1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [HEADERS],
        },
      });
      console.log('Inserted headers at the top of the sheet and shifted data down.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
