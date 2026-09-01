import { NextResponse } from 'next/server';
import { sheets, sheetId } from '@/lib/google';

// 📌 구글 시트 'Settings' 탭 자동 생성 및 확인 보장 함수
async function ensureSettingsTab() {
  if (!sheetId) return;
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheetNames = (meta.data.sheets || []).map(s => s.properties.title);

    // Settings 탭이 없으면 자동으로 탭 생성
    if (!sheetNames.includes('Settings')) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: 'Settings' } } }]
        }
      });

      // 기본 초기값 기록
      const defaultRows = [
        ['Key', 'Value'],
        ['toEmails', 'mhs810@hansol.com, magma5018@gmail.com'],
        ['senderName', '마형석'],
        ['aiGmail', 'magma5018@gmail.com'],
        ['gmailAppPassword', 'gojffulntemnfqfy'],
        ['bccEmail', ''],
        ['checkInterval', '5'],
        ['sendDay', 'MON'],
        ['sendTime', '09:00'],
        ['activeSmtpEngine', 'gmail']
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Settings!A1:B10',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: defaultRows }
      });
    }
  } catch (err) {
    console.error('ensureSettingsTab error:', err);
  }
}

// 📌 GET: 구글 시트 'Settings' 탭에서 설정값 읽어오기 (어느 PC에서든 100% 동기화 복구)
export async function GET() {
  try {
    await ensureSettingsTab();

    if (!sheetId) {
      return NextResponse.json({ success: false, error: '구글 시트 ID가 설정되지 않았습니다.' }, { status: 400 });
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Settings!A1:B50',
    });

    const rows = res.data.values || [];
    const settingsMap = {};
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0]) {
        settingsMap[rows[i][0]] = rows[i][1] || '';
      }
    }

    return NextResponse.json({
      success: true,
      settings: settingsMap
    });
  } catch (error) {
    console.error('Fetch Settings API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 📌 POST: 구글 시트 'Settings' 탭에 설정값 영구 저장하기 (어떤 컴터에서든 100% 영구 저장)
export async function POST(req) {
  try {
    await ensureSettingsTab();
    const body = await req.json();

    const {
      toEmails = '',
      senderName = '마형석',
      aiGmail = 'magma5018@gmail.com',
      gmailAppPassword = 'gojffulntemnfqfy',
      bccEmail = '',
      checkInterval = '5',
      sendDay = 'MON',
      sendTime = '09:00',
      activeSmtpEngine = 'gmail'
    } = body;

    const toEmailsStr = Array.isArray(toEmails) ? toEmails.join(', ') : String(toEmails);

    const updateRows = [
      ['Key', 'Value'],
      ['toEmails', toEmailsStr],
      ['senderName', senderName],
      ['aiGmail', aiGmail],
      ['gmailAppPassword', gmailAppPassword],
      ['bccEmail', bccEmail],
      ['checkInterval', String(checkInterval)],
      ['sendDay', sendDay],
      ['sendTime', sendTime],
      ['activeSmtpEngine', activeSmtpEngine]
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Settings!A1:B10',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: updateRows }
    });

    return NextResponse.json({
      success: true,
      message: '구글 시트 Settings 탭에 설정이 100% 영구 저장되었습니다.'
    });
  } catch (error) {
    console.error('Save Settings API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
