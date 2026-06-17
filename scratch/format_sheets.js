const { google } = require('googleapis');

async function formatSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // 1. 시트 목록 및 ID 확인
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const tabs = ['Accidents', 'Insurance'];
    
    const requests = [];

    for (const tabName of tabs) {
        const sheet = spreadsheet.data.sheets.find(s => s.properties.title === tabName);
        if (!sheet) continue;

        const sheetId = sheet.properties.sheetId;

        // 스타일 적용 요청 추가
        requests.push(
            // 1. 헤더 행 디자인 (1행)
            {
                repeatCell: {
                    range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                    cell: {
                        userEnteredFormat: {
                            backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, // 짙은 네이비
                            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 11 },
                            horizontalAlignment: 'CENTER',
                            verticalAlignment: 'MIDDLE'
                        }
                    },
                    fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                }
            },
            // 2. 전체 데이터 영역 테두리 및 텍스트 정렬
            {
                repeatCell: {
                    range: { sheetId, startRowIndex: 1 },
                    cell: {
                        userEnteredFormat: {
                            verticalAlignment: 'MIDDLE',
                            padding: { left: 5, right: 5 }
                        }
                    },
                    fields: 'userEnteredFormat(verticalAlignment,padding)'
                }
            },
            // 3. 헤더 고정 (첫 번째 행)
            {
                updateSheetProperties: {
                    properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
                    fields: 'gridProperties.frozenRowCount'
                }
            },
            // 4. 전체 테두리 적용 (헤더 포함)
            {
                updateBorders: {
                    range: { sheetId, startRowIndex: 0 },
                    top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                    bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                    left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                    right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                    innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0.9, green: 0.9, blue: 0.9 } },
                    innerVertical: { style: 'SOLID', width: 1, color: { red: 0.9, green: 0.9, blue: 0.9 } }
                }
            }
        );
    }

    if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: { requests }
        });
        console.log('✅ 시트 스타일 적용 완료!');
    }
}

formatSheets().catch(console.error);
