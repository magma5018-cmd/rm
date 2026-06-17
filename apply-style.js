const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function applyStyle() {
    // 1. .env.local 파일에서 설정 읽기
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim().replace(/^"|"$/g, '') : null;
    };

    const email = getEnv('GOOGLE_CLIENT_EMAIL');
    const privateKey = getEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');
    const spreadsheetId = getEnv('GOOGLE_SHEET_ID');

    const auth = new google.auth.GoogleAuth({
        credentials: { client_email: email, private_key: privateKey },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 2. 시트 정보 가져오기 (각 탭의 ID 확인)
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const requests = [];
    const tabs = ['Accidents', 'Insurance'];

    for (const tabName of tabs) {
        const sheet = spreadsheet.data.sheets.find(s => s.properties.title === tabName);
        if (!sheet) continue;

        const sheetId = sheet.properties.sheetId;
        const columnCount = tabName === 'Accidents' ? 30 : 17; // 헤더 개수

        requests.push(
            // [1] 헤더 스타일 (1행: 네이비 배경 + 흰색 굵은 글씨)
            {
                repeatCell: {
                    range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
                    cell: {
                        userEnteredFormat: {
                            backgroundColor: { red: 0.1, green: 0.2, blue: 0.4 },
                            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
                            horizontalAlignment: 'CENTER',
                            verticalAlignment: 'MIDDLE'
                        }
                    },
                    fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                }
            },
            // [2] 데이터 영역 스타일 (A2부터 끝까지: 가운데 정렬 + 테두리)
            {
                repeatCell: {
                    range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: columnCount },
                    cell: {
                        userEnteredFormat: {
                            horizontalAlignment: 'CENTER',
                            verticalAlignment: 'MIDDLE',
                            padding: { left: 5, right: 5 }
                        }
                    },
                    fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,padding)'
                }
            },
            // [3] 테두리 설정
            {
                updateBorders: {
                    range: { sheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: columnCount },
                    top: { style: 'SOLID', color: { red: 0.7, green: 0.7, blue: 0.7 } },
                    bottom: { style: 'SOLID', color: { red: 0.7, green: 0.7, blue: 0.7 } },
                    left: { style: 'SOLID', color: { red: 0.7, green: 0.7, blue: 0.7 } },
                    right: { style: 'SOLID', color: { red: 0.7, green: 0.7, blue: 0.7 } },
                    innerHorizontal: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
                    innerVertical: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } }
                }
            },
            // [4] 첫 번째 행 틀 고정
            {
                updateSheetProperties: {
                    properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
                    fields: 'gridProperties.frozenRowCount'
                }
            }
        );
    }

    // 3. 스타일 업데이트 실행
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests }
    });

    console.log('✨ 구글 시트 스타일이 성공적으로 적용되었습니다!');
}

applyStyle().catch(err => {
    console.error('❌ 스타일 적용 중 오류 발생:', err);
});
