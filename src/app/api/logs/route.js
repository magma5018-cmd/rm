import { NextResponse } from 'next/server';
import { sheets, sheetId } from '@/lib/google';

// 📌 Logs 탭 존재 확인 및 자동 생성
async function ensureLogsTab() {
  if (!sheetId) return;
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheetNames = (meta.data.sheets || []).map(s => s.properties.title);

    if (!sheetNames.includes('Logs')) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: 'Logs' } } }]
        }
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Logs!A1:C1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['Timestamp', 'Type', 'Message']] }
      });
    }
  } catch (err) {
    console.error('ensureLogsTab error:', err);
  }
}

// 📌 1개월(30일) 경과 지난 오래된 로그 자동 삭제 로직 (Auto Pruning)
async function pruneOldLogs() {
  if (!sheetId) return;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Logs!A2:C1000',
    });

    const rows = res.data.values || [];
    if (rows.length === 0) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 30일 이내의 최신 로그만 남기기
    const freshRows = rows.filter(r => {
      if (!r[0]) return false;
      const logDate = new Date(r[0]);
      return isNaN(logDate.getTime()) || logDate >= thirtyDaysAgo;
    });

    // 지워진 행이 있을 때 구글 시트 업데이트
    if (freshRows.length < rows.length) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: 'Logs!A2:C1000'
      });

      if (freshRows.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `Logs!A2:C${freshRows.length + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: freshRows }
        });
      }
      console.log(`[Log-Pruner] 🧹 한 달(30일) 지난 오래된 로그 ${rows.length - freshRows.length}건을 구글 시트에서 자동 삭제했습니다.`);
    }
  } catch (err) {
    console.error('pruneOldLogs Error:', err);
  }
}

// GET: 구글 시트 Logs 탭에서 최근 30일치 최신 히스토리 로그 불러오기
export async function GET() {
  try {
    await ensureLogsTab();
    await pruneOldLogs(); // 1개월 지난 오래된 로그 자동 청소

    if (!sheetId) return NextResponse.json({ success: false, logs: [] });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Logs!A2:C1000',
    });

    const rows = res.data.values || [];
    const logs = rows.map(r => `[${r[0] || ''}] ${r[2] || ''}`).filter(Boolean).reverse();

    return NextResponse.json({ success: true, logs });
  } catch (err) {
    console.error('Fetch Logs API Error:', err);
    return NextResponse.json({ success: false, logs: [] });
  }
}

// POST: 구글 시트 Logs 탭에 로그 1건 영구 추가 기록
export async function POST(req) {
  try {
    await ensureLogsTab();
    const { type = 'INFO', message = '' } = await req.json();

    const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const newLogRow = [[timestamp, type, message]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Logs!A1:C1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: newLogRow }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Save Log API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
