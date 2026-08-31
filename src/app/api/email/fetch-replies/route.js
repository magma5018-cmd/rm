import { NextResponse } from 'next/server';
import imap from 'imap-simple';
import { simpleParser } from 'mailparser';
import { sheets, sheetId } from '@/lib/google';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const gmailUser = body.aiGmail || 'magma5018@gmail.com';
    const gmailAppPassword = body.gmailAppPassword || 'gojffulntemnfqfy';

    if (!gmailUser || !gmailAppPassword) {
      return NextResponse.json({ success: false, error: '지메일 계정 주소 또는 앱 비밀번호가 설정되지 않았습니다.' }, { status: 400 });
    }

    const config = {
      imap: {
        user: gmailUser.trim(),
        password: gmailAppPassword.trim().replace(/\s+/g, ''),
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
      }
    };

    const connection = await imap.connect(config);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const results = [];

    // 구글 시트 데이터 미리 가져오기
    let sheetData = [];
    let accHeaders = [];
    if (sheetId) {
      try {
        const sheetRes = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: 'Accidents!A1:BZ1000',
        });
        sheetData = sheetRes.data.values || [];
        if (sheetData.length > 0) accHeaders = sheetData[0];
      } catch (sErr) {
        console.error('Sheet fetch in IMAP failed:', sErr);
      }
    }

    for (const item of messages) {
      const allParts = item.parts.find(part => part.which === '');
      const parsed = await simpleParser(allParts.body);

      const subject = parsed.subject || '';
      let rawText = parsed.text || '';
      
      // 만약 text가 비어있으면 html에서 텍스트만 깨끗하게 정제
      if (!rawText && parsed.html) {
        rawText = parsed.html.replace(/<style[\s\S]*?<\/style>/gi, '')
                             .replace(/<script[\s\S]*?<\/script>/gi, '')
                             .replace(/<[^>]+>/g, ' ')
                             .replace(/\s+/g, ' ');
      } else {
        rawText = rawText.replace(/<style[\s\S]*?<\/style>/gi, '');
      }

      // 📌 1. 사고번호 100% 정밀 파싱 (YYYYMMDD-순번 형태: 예: 20260831-1, 20250516-1)
      const accidentNoMatch = (subject + ' ' + rawText).match(/\b\d{8}-\d+\b/) || (subject + ' ' + rawText).match(/사고번호[\s:]*([0-9-]+)/i);
      const accidentNo = accidentNoMatch ? (accidentNoMatch[1] || accidentNoMatch[0]) : null;

      if (!accidentNo) {
        continue; // 사고번호가 없는 일반 스팸/사내 메일은 제외
      }

      // 📌 2. 답장 텍스트 정제 (인용구 및 서명 제거, 핵심 내용만 추출)
      let cleanText = rawText;
      // 이전 메일 인용선(-----Original Message-----, On ... wrote:) 이후 제거
      cleanText = cleanText.split(/-----Original Message-----|보낸 사람:|From:|On.*wrote:/i)[0];
      cleanText = cleanText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const imageAttachments = (parsed.attachments || []).filter(att => att.contentType && att.contentType.startsWith('image/'));
      let imageSnippet = '';
      if (imageAttachments.length > 0) {
        imageSnippet = ` [📸 AI 사진분석: 첨부 이미지 ${imageAttachments.length}장 감지 완료]`;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const summaryContent = cleanText.substring(0, 150) + imageSnippet;

      results.push({
        accidentNo: accidentNo,
        subject: subject,
        from: parsed.from?.text || '',
        date: todayStr,
        text: summaryContent,
        summary: `[AI 답장수신] ${summaryContent}`,
        imageCount: imageAttachments.length
      });

      // 📌 3. 구글 시트 진행경과에 실시간 자동 추가 저장!
      if (sheetId && sheetData.length > 1 && accHeaders.length > 0) {
        const accNoIdx = accHeaders.indexOf('사고번호');
        const progIdx = accHeaders.indexOf('진행경과');

        if (accNoIdx !== -1 && progIdx !== -1) {
          for (let rIdx = 1; rIdx < sheetData.length; rIdx++) {
            const rowNo = sheetData[rIdx][accNoIdx];
            if (rowNo === accidentNo) {
              let existingProg = [];
              const rawProgStr = sheetData[rIdx][progIdx] || '';
              if (rawProgStr.trim().startsWith('[')) {
                try { existingProg = JSON.parse(rawProgStr); } catch (e) {}
              } else if (rawProgStr.trim() !== '') {
                existingProg = [{ date: todayStr, text: rawProgStr.trim() }];
              }

              // 새 진행경과 항목 추가
              existingProg.push({
                date: todayStr,
                text: summaryContent
              });

              // 구글 시트에 업데이트
              const cellRange = `Accidents!${String.fromCharCode(65 + progIdx)}${rIdx + 1}`;
              await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: cellRange,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[JSON.stringify(existingProg)]] }
              }).catch(err => console.error('Update progress to sheet error:', err));

              break;
            }
          }
        }
      }
    }

    connection.end();

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      items: results,
      message: `총 ${results.length}건의 답장 텍스트 및 사진을 감지하여 구글 시트 진행경과에 자동 업데이트했습니다.`
    });

  } catch (error) {
    console.error('Gmail IMAP Fetch Error:', error);
    let errorMsg = error.message || '지메일함 접속 중 오류가 발생했습니다.';
    if (error.textCode === 'AUTHENTICATIONFAILED' || errorMsg.includes('Invalid credentials')) {
      errorMsg = '지메일 계정 로그인 실패! 16자리 앱 비밀번호가 정확한지 확인해주세요.';
    }
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
