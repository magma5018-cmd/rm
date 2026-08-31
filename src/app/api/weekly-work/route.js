import { NextResponse } from 'next/server';
import { sheets, sheetId } from '@/lib/google';

const SHEET_NAME = 'weekly_work';
const HEADERS = ['주차', '내용', '최종수정일'];

// 구글 시트 확인 및 없으면 생성 함수
async function ensureSheetExists() {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  let sheet = meta.data.sheets.find((s) => s.properties.title === SHEET_NAME);
  
  if (!sheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: SHEET_NAME },
            },
          },
        ],
      },
    });
    // 헤더 추가
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A1:C1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADERS] },
    });
  }
}

// GET: 특정 주차의 차주 업무 가져오기
export async function GET(request) {
  try {
    if (!sheetId) throw new Error('GOOGLE_SHEET_ID is not defined');
    const { searchParams } = new URL(request.url);
    const weekKey = searchParams.get('weekKey');

    if (!weekKey) {
      return NextResponse.json({ success: false, message: 'weekKey가 필요합니다.' }, { status: 400 });
    }

    await ensureSheetExists();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A2:C`,
    });

    const rows = response.data.values || [];
    const found = rows.find((r) => r[0] === weekKey);

    return NextResponse.json({
      success: true,
      content: found ? found[1] : '',
      updatedAt: found ? found[2] : null,
    });
  } catch (error) {
    console.error('Weekly Work GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 특정 주차의 차주 업무 저장/업데이트하기
export async function POST(request) {
  try {
    if (!sheetId) throw new Error('GOOGLE_SHEET_ID is not defined');
    const { weekKey, content } = await request.json();

    if (!weekKey) {
      return NextResponse.json({ success: false, message: 'weekKey가 필요합니다.' }, { status: 400 });
    }

    await ensureSheetExists();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A2:C`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === weekKey);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (rowIndex >= 0) {
      // 기존 행 업데이트 (A2부터 시작이므로 rowIndex + 2)
      const targetRow = rowIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A${targetRow}:C${targetRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[weekKey, content || '', now]],
        },
      });
    } else {
      // 새 행 추가
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A:C`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[weekKey, content || '', now]],
        },
      });
    }

    return NextResponse.json({ success: true, message: '구글 시트에 성공적으로 저장되었습니다.' });
  } catch (error) {
    console.error('Weekly Work POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
