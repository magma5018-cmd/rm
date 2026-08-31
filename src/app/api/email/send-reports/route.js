import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      senderName = '사고관리시스템',
      fromEmail,
      toEmails = [],
      bccEmail,
      aiGmail,
      smtpHost,
      smtpPort = 25,
      username,
      password,
      rows = []
    } = body;

    if (!smtpHost || !fromEmail) {
      return NextResponse.json({ success: false, error: '이메일 설정 및 메일 서버 주소를 확인해주세요.' }, { status: 400 });
    }

    // 1. 발송 조건 엄격 필터링: autoEmail === 'Y' 이면서 '담당자 이메일(managerEmail)'이 실제로 존재하고 @를 포함하는 건만 발송!
    const targetRows = Array.isArray(rows) 
      ? rows.filter(r => (r.autoEmail === 'Y' || r.autoEmail === 'y') && r.managerEmail && typeof r.managerEmail === 'string' && r.managerEmail.trim().includes('@')) 
      : [];

    if (targetRows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '발송 대상이 없습니다. (자동발송(Y)로 설정되고 담당자 이메일 주소가 채워진 사고 건만 발송됩니다.)' 
      }, { status: 400 });
    }

    const portNum = parseInt(smtpPort, 10) || 25;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: portNum,
      secure: portNum === 465,
      auth: (username && password) ? { user: username, pass: password } : undefined,
      tls: { rejectUnauthorized: false }
    });

    await transporter.verify();

    let sentCount = 0;
    const sentResults = [];

    for (const row of targetRows) {
      const accNo = row.사고번호 || '미채번';
      const accTitle = row.사고명 || '사고 리포트';
      const accDate = row.사고일 || '-';
      const accDept = ((row.사업부 || '') + ' ' + (row.부서 || '')).trim() || '-';
      const accManager = row.담당자 || '-';
      const accContent = row.사고내용 || '내용 없음';
      const managerEmail = row.managerEmail.trim();

      // 수신자 설정: 해당 사고의 담당자 이메일 (매니저 이메일)
      const recipient = managerEmail;

      const mailHtml = '<div style="font-family: 'Malgun Gothic', sans-serif; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; max-width: 700px; background: #ffffff; margin: 0 auto;">' +
        '<div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 20px 24px; border-radius: 10px; margin-bottom: 20px;">' +
          '<h2 style="margin:0; font-size: 1.3rem; font-weight: 800;">🚨 [사고 관리 리포트] ' + accNo + '</h2>' +
          '<p style="margin: 6px 0 0 0; font-size: 0.88rem; opacity: 0.95;">담당자 전용 사고 진행 및 AI 답장 자동 업데이트 리포트입니다.</p>' +
        '</div>' +

        '<div style="background: #f0fdf4; padding: 16px 20px; border-radius: 10px; border: 1px solid #bbf7d0; margin-bottom: 20px;">' +
          '<h3 style="margin: 0 0 8px 0; color: #166534; font-size: 1rem; font-weight: 800;">📸 Gemini Vision AI 사진 및 증빙 자동 업데이트 안내</h3>' +
          '<p style="margin: 0; font-size: 0.88rem; color: #15803d; line-height: 1.6;">' +
            '본 메일로 <strong>[전체 답장]</strong>을 보내시면서 현장 파손 사진이나 보상 서류(PDF/이미지)를 첨부하시면, <strong>Gemini Vision AI가 사진과 첨부파일을 자동으로 정밀 분석하여 사고 진행경과에 일자별로 쏙 등록</strong>해 드립니다.' +
          '</p>' +
        '</div>' +

        '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem;">' +
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
            '<td style="padding: 10px 14px; border: 1px solid #e2e8f0;">' + accManager + ' (' + managerEmail + ')</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold;">사고명</td>' +
            '<td colspan="3" style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">' + accTitle + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold;">사고 내용</td>' +
            '<td colspan="3" style="padding: 10px 14px; border: 1px solid #e2e8f0; line-height: 1.6;">' + accContent + '</td>' +
          '</tr>' +
        '</table>' +

        '<div style="background: #f8fafc; padding: 14px 18px; border-radius: 8px; font-size: 0.82rem; color: #64748b; border: 1px solid #e2e8f0; text-align: center;">' +
          '본 이메일은 사고 관리 시스템에서 담당자 1:1 맞춤으로 자동 발송된 리포트입니다.' +
        '</div>' +
      '</div>';

      const mailOptions = {
        from: '"' + senderName + '" <' + fromEmail + '>',
        to: recipient,
        replyTo: aiGmail || fromEmail,
        subject: '[사고 리포트] ' + accNo + ' - ' + accTitle,
        html: mailHtml
      };

      if (bccEmail && typeof bccEmail === 'string' && bccEmail.trim() !== '') {
        mailOptions.bcc = bccEmail.split(',').map(s => s.trim()).filter(Boolean);
      }

      await transporter.sendMail(mailOptions);
      sentCount++;
      sentResults.push({ accNo, recipient });
    }

    return NextResponse.json({
      success: true,
      sentCount,
      sentResults,
      message: '총 ' + sentCount + '건의 담당자 지정 사고 리포트가 성공적으로 발송되었습니다.'
    });

  } catch (error) {
    console.error('Clean Email Route Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
