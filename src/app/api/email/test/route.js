import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const {
      senderName = '마형석',
      fromEmail = 'magma5018@gmail.com',
      toEmails = [],
      bccEmail,
      aiGmail = 'magma5018@gmail.com',
      password = 'gojffulntemnfqfy',
      rows = []
    } = body;

    const senderEmail = fromEmail || aiGmail || 'magma5018@gmail.com';
    const authPass = password || 'gojffulntemnfqfy';

    // 📌 수신인(To) 이메일 태그 목록 추출
    let globalRecipients = [];
    if (Array.isArray(toEmails) && toEmails.length > 0) {
      globalRecipients = toEmails.map(s => typeof s === 'string' ? s.trim() : (s.email || '')).filter(s => s && s.includes('@'));
    }

    if (globalRecipients.length === 0) {
      globalRecipients = [senderEmail];
    }

    // 테스트용 샘플 사고 1건 선택 (없으면 기본 샘플)
    const sampleRow = (Array.isArray(rows) && rows.length > 0) ? rows[0] : {
      사고번호: '20260831-1',
      사고명: '컨테이너 바나나 미끄러짐 사고',
      사고일: '2026-08-31',
      사업부: '지원혁신',
      부서: 'rm',
      담당자: '마형석',
      managerEmail: 'mhs810@hansol.com',
      사고내용: '고속도로에서 바나나를 밟고 미끄러져 전복됨 (시스템 테스트 발송)',
      진행경과: [{ date: '2026-08-31', text: '[테스트] 시스템 발송 정상 연동 점검용 메일입니다.' }]
    };

    const accNo = sampleRow.사고번호 || '20260831-1';
    const accTitle = sampleRow.사고명 || '사고 관리 테스트 리포트';
    const accDate = sampleRow.사고일 || '2026-08-31';
    const accDept = ((sampleRow.사업부 || '') + ' ' + (sampleRow.부서 || '')).trim() || '지원혁신 rm';
    const accManager = sampleRow.담당자 || '마형석';
    const accContent = sampleRow.사고내용 || '테스트 발송 메일입니다.';

    const finalRecipientsStr = globalRecipients.join(', ');

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: 'magma5018@gmail.com', pass: authPass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
      tls: { rejectUnauthorized: false }
    });

    const subjectTitle = '[현황확인요청 - 테스트] ' + accTitle + ' (사고번호: ' + accNo + ')';
    const headerTitle = '🚨 ' + accTitle + ' (사고번호: ' + accNo + ')';

    const mailHtml = '<div style="font-family: sans-serif; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; max-width: 700px; background: #ffffff; margin: 0;">' +
      '<div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 20px 24px; border-radius: 10px; margin-bottom: 20px;">' +
        '<h2 style="margin:0; font-size: 1.25rem; font-weight: 800;">' + headerTitle + '</h2>' +
        '<p style="margin: 6px 0 0 0; font-size: 0.88rem; opacity: 0.95;">지메일 연동 및 발송 수신 상태 점검 전용 테스트 이메일입니다.</p>' +
      '</div>' +

      '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem;">' +
        '<tr>' +
          '<td style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold; width: 22%;">사고명</td>' +
          '<td colspan="3" style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">' + accTitle + '</td>' +
        '</tr>' +
        '<tr>' +
          '<td style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold; width: 22%;">사고번호</td>' +
          '<td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: bold; color: #2563eb;">' + accNo + '</td>' +
          '<td style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold; width: 22%;">사고일자</td>' +
          '<td style="padding: 10px 14px; border: 1px solid #e2e8f0;">' + accDate + '</td>' +
        '</tr>' +
        '<tr>' +
          '<td style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold;">소속 부서</td>' +
          '<td style="padding: 10px 14px; border: 1px solid #e2e8f0;">' + accDept + '</td>' +
          '<td style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold;">담당자</td>' +
          '<td style="padding: 10px 14px; border: 1px solid #e2e8f0;">' + accManager + '</td>' +
        '</tr>' +
        '<tr>' +
          '<td style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold;">사고 내용</td>' +
          '<td colspan="3" style="padding: 10px 14px; border: 1px solid #e2e8f0; line-height: 1.6;">' + accContent + '</td>' +
        '</tr>' +
      '</table>' +

      '<div style="background: #f8fafc; padding: 14px 18px; border-radius: 8px; font-size: 0.82rem; color: #64748b; border: 1px solid #e2e8f0; text-align: center;">' +
        '본 이메일은 지메일 발송 연동 점검용 테스트 메일입니다. (수신: ' + finalRecipientsStr + ')' +
      '</div>' +
    '</div>';

    const mailOptions = {
      from: '"' + senderName + '" <' + senderEmail + '>',
      to: finalRecipientsStr,
      replyTo: aiGmail || senderEmail,
      subject: subjectTitle,
      html: mailHtml
    };

    if (bccEmail && bccEmail.trim()) mailOptions.bcc = bccEmail.trim();

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: '테스트 이메일이 수신인 목록(' + finalRecipientsStr + ')으로 100% 정상 발송되었습니다.'
    });

  } catch (error) {
    console.error('Test Email API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}