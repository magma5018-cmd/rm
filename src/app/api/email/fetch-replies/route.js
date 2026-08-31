import { NextResponse } from 'next/server';
import imap from 'imap-simple';
import { simpleParser } from 'mailparser';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const gmailUser = body.aiGmail || 'magma5018@gmail.com';
    const gmailAppPassword = body.gmailAppPassword || 'gojffulntemnfqfy';

    if (!gmailUser || !gmailAppPassword) {
      return NextResponse.json({ success: false, error: '지메일 계정 주소 또는 앱 비밀번호가 설정되지 않았습니다.' }, { status: 400 });
    }

    // IMAP 접속 설정
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

    // 읽지 않은 메일 검색
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const results = [];

    for (const item of messages) {
      const allParts = item.parts.find(part => part.which === '');
      const parsed = await simpleParser(allParts.body);

      const subject = parsed.subject || '';
      const textBody = parsed.text || parsed.html || '';

      // 사고번호 추출 패턴 ([사고번호: 20260507-1] 또는 사고번호: 20260507-1 등)
      const accidentNoMatch = subject.match(/(?:사고번호|사고|ID)[\s:]*([A-Za-z0-9-]+)/i);
      const accidentNo = accidentNoMatch ? accidentNoMatch[1] : null;

      // 🔥 [엄격한 필터링] 사고번호가 명확히 포함된 메일만 골라내고 일반/개인 메일은 무시(Skip)
      if (!accidentNo) {
        continue;
      }

      if (textBody) {
        let summaryText = textBody.substring(0, 100).replace(/\n/g, ' ').trim();
        if (textBody.length > 50) {
          summaryText = `[AI 자동요약] ${summaryText}...`;
        }

        results.push({
          accidentNo: accidentNo,
          subject: subject,
          from: parsed.from?.text || '',
          date: new Date().toISOString().split('T')[0],
          summary: summaryText,
          originalBodySnippet: textBody.substring(0, 200)
        });
      }
    }

    connection.end();

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      items: results
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
