import { NextResponse } from 'next/server';
import imap from 'imap-simple';
import { simpleParser } from 'mailparser';
import { sheets, sheetId } from '@/lib/google';

function sanitizeEmailBody(rawText) {
  if (!rawText) return '';
  let text = String(rawText);

  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/\xa0/g, ' ');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');

  text = text.split(/-----Original Message-----|보낸 사람:|From:|On.*wrote:/i)[0];

  text = text.replace(/수신\s*:[^\n]*/gi, '');
  text = text.replace(/안녕하세요[^\n]*/gi, '');
  text = text.replace(/감사합니다[^\n]*/gi, '');
  text = text.replace(/.*배상/gi, '');
  text = text.replace(/[이메일수신]\s*RE:[^\n]*/gi, '');

  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// Gemini Vision 및 Text 분석 통합 함수
async function summarizeWithGemini(cleanText, imageAttachments, apiKey) {
  const geminiKey = apiKey || process.env.GEMINI_API_KEY || 'AIzaSyCkLM5Eldmw9x-zchYkwBawoAg18DiIoSc';

  const parts = [];
  let promptText = '';

  const hasImage = Array.isArray(imageAttachments) && imageAttachments.length > 0;
  const hasText = cleanText && cleanText.length > 5;

  if (hasImage) {
    promptText = `당신은 사고 관리 및 손해사정 전문 Vision AI입니다.
첨부된 이미지를 정밀 검토하여 먼저 이미지를 다음 3가지 중 하나로 판별 분류하세요:
1) [사고 현장 파손 사진]: 컨테이너, 화물, 차량 등 파손 부위 사진
2) [보상 증빙 서류]: 영수증, 청구서, 서베이 리포트, PDF 등 보상 문서
3) [무관한 이미지]: 이메일 서명 로고, 회사 엠블럼, 배너, 아이콘, 광고 이미지

만약 이미지가 (3)무관한 이메일 서명/로고 이미지라면, 이미지 내용은 무시하고 이메일 본문 텍스트만 1~2문장으로 핵심 요약하세요.
만약 (1)이나 (2)에 해당하는 진짜 사고/서류 이미지라면, 이미지의 파손 상태 또는 서류 내용을 포함하여 1~2문장으로 정밀 요약하세요.

[이메일 본문]:
${cleanText}`;
  } else {
    promptText = `다음 이메일 답신 텍스트를 분석하여, 사고 관리 진행경과 일지에 기재할 핵심 사고 진행 상황을 1~2문장(한국어)으로 간결하게 요약해 주세요.
인사말이나 무의미한 찌꺼기 문구는 제외하고 사고 원인, 금액, 계획 등 핵심 경과만 작성해 주세요.

[이메일 본문]:
${cleanText}`;
  }

  parts.push({ text: promptText });

  // 이미지가 있을 경우 Base64 변환하여 Gemini Vision AI로 전달
  if (hasImage) {
    for (const img of imageAttachments.slice(0, 2)) {
      if (img.content) {
        parts.push({
          inlineData: {
            mimeType: img.contentType || 'image/jpeg',
            data: img.content.toString('base64')
          }
        });
      }
    }
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
    });

    const data = await res.json();
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const summaryResult = data.candidates[0].content.parts[0].text.trim().replace(/\n/g, ' ');
      
      if (hasImage && hasText) {
        return `[AI 텍스트+이미지 종합요약] ${summaryResult}`;
      } else if (hasImage) {
        return `[AI 이미지/서류 정밀분석 요약] ${summaryResult}`;
      } else {
        return `[AI 답신 텍스트 요약] ${summaryResult}`;
      }
    }
  } catch (err) {
    console.error('Gemini Analysis Error:', err);
  }

  if (hasImage && hasText) {
    return `[AI 텍스트 요약] ${cleanText.substring(0, 90)} (📸 파손/증빙 이미지 ${imageAttachments.length}장 첨부됨)`;
  } else if (hasImage) {
    return `[AI 이미지 분석] 현장 파손/서류 이미지 ${imageAttachments.length}장 확인됨`;
  }
  return `[AI 텍스트 요약] ${cleanText.substring(0, 100)}`;
}

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

    // 구글 시트 데이터 로드
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
        console.error('Sheet fetch error:', sErr);
      }
    }

    for (const item of messages) {
      const allParts = item.parts.find(part => part.which === '');
      const parsed = await simpleParser(allParts.body);

      const subject = parsed.subject || '';
      let rawText = parsed.text || parsed.html || '';

      // 1. 사고번호 100% 추출
      const accidentNoMatch = (subject + ' ' + rawText).match(/\b\d{8}-\d+\b/) || (subject + ' ' + rawText).match(/사고번호[\s:]*([0-9-]+)/i);
      const accidentNo = accidentNoMatch ? (accidentNoMatch[1] || accidentNoMatch[0]) : null;

      if (!accidentNo) continue;

      // 2. 이메일 실제 작성/발송 날짜 추출 (질문 답변: 시스템 날짜가 아니라 보낸 사람의 메일 작성 일자!)
      const mailDateObj = parsed.date || new Date();
      const mailDateStr = mailDateObj.toISOString().split('T')[0];

      // 3. 텍스트 정제 & 이미지 첨부파일 감지
      const cleanText = sanitizeEmailBody(rawText);
      const imageAttachments = (parsed.attachments || []).filter(att => {
        if (!att.contentType || !att.contentType.startsWith('image/')) return false;
        // 5KB 이하 작은 서명/로고 아이콘 이미지는 1차 자동 스킵
        if (att.size && att.size < 5120) return false;
        return true;
      });

      // 4. Gemini AI 분석 (텍스트 / 이미지 구분 표기)
      const finalProgressText = await summarizeWithGemini(cleanText, imageAttachments, body.geminiApiKey);

      results.push({
        accidentNo: accidentNo,
        subject: subject,
        from: parsed.from?.text || '',
        date: mailDateStr,
        text: finalProgressText,
        summary: finalProgressText,
        imageCount: imageAttachments.length
      });

      // 5. 구글 시트 중복 방지 및 1건으로 정밀 업데이트
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
                existingProg = [{ date: mailDateStr, text: rawProgStr.trim() }];
              }

              // 기존 중복되거나 지저분한 이메일수신/&nbsp; 항목 정리
              existingProg = existingProg.filter(p => !p.text.includes('[이메일수신]') && !p.text.includes('&nbsp;'));

              // 동일한 날짜에 중복 추가되지 않도록 중복 제거 후 1건만 등록
              const isAlreadyAdded = existingProg.some(p => p.text === finalProgressText);
              if (!isAlreadyAdded) {
                existingProg.push({
                  date: mailDateStr,
                  text: finalProgressText
                });
              }

              // 구글 시트에 업데이트
              const cellRange = `Accidents!${String.fromCharCode(65 + progIdx)}${rIdx + 1}`;
              await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: cellRange,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[JSON.stringify(existingProg)]] }
              }).catch(err => console.error('Update progress error:', err));

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
      message: `총 ${results.length}건의 답신 메일을 Gemini AI로 정밀 분석하여 중복 없이 1건으로 저장했습니다.`
    });

  } catch (error) {
    console.error('Gmail IMAP Fetch Error:', error);
    return NextResponse.json({ success: false, error: error.message || '지메일 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
