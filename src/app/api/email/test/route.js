import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      senderName = '사고관리시스템',
      fromEmail,
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

    const portNum = parseInt(smtpPort, 10) || 25;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: portNum,
      secure: portNum === 465,
      auth: (username && password) ? { user: username, pass: password } : undefined,
      tls: { rejectUnauthorized: false }
    });

    await transporter.verify();

    // 등록된 사고 행 중 이메일 대상 추출
    const targetRows = Array.isArray(rows) ? rows.filter(r => (r.autoEmail !== 'N') && r.managerEmail && r.managerEmail.includes('@')) : [];

    // 사고 데이터가 있으면 테스트 문구가 아닌 '진짜 AI 사고 리포트 이메일'로 정밀 발송!
    if (targetRows.length > 0) {
      let sentCount = 0;
      for (const row of targetRows) {
        const accNo = row.사고번호 || '미채번';
        const accTitle = row.사고명 || '사고 리포트';
        const accDate = row.사고일 || '-';
        const accDept = (row.사업부 || '') + ' ' + (row.부서 || '');
        const accManager = row.담당자 || '-';
        const accContent = row.사고내용 || '내용 없음';
        const aiReportText = row['AI 보고서 내용'] || row.aiReportText || 'AI 종합 원인 분석 및 해결 가이드가 작성되어 있습니다.';

        const mailHtml = '<div style="font-family: Arial, sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 700px; background: #ffffff;">' +
          '<div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">' +
            '<h2 style="margin:0; font-size: 1.25rem;">🚨 [사고 관리 리포트] ' + accNo + '</h2>' +
            '<p style="margin: 4px 0 0 0; font-size: 0.85rem; opacity: 0.9;">담당자 전용 AI 종합 분석 및 진행 현황 리포트입니다.</p>' +
          '</div>' +
          '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem;">' +
            '<tr>' +
              '<td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold; width: 25%;">사고번호</td>' +
              '<td style="padding: 8px 12px; border: 1px solid #e2e8f0;">' + accNo + '</td>' +
              '<td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold; width: 25%;">사고일자</td>' +
              '<td style="padding: 8px 12px; border: 1px solid #e2e8f0;">' + accDate + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold;">소속 부서</td>' +
              '<td style="padding: 8px 12px; border: 1px solid #e2e8f0;">' + accDept + '</td>' +
              '<td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold;">담당자</td>' +
              '<td style="padding: 8px 12px; border: 1px solid #e2e8f0;">' + accManager + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold;">사고명</td>' +
              '<td colspan="3" style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #1e40af;">' + accTitle + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold;">사고 내용</td>' +
              '<td colspan="3" style="padding: 8px 12px; border: 1px solid #e2e8f0; line-height: 1.5;">' + accContent + '</td>' +
            '</tr>' +
          '</table>' +
          '<div style="background: #eff6ff; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 20px;">' +
            '<h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 1rem;">🤖 Gemini AI 종합 원인 및 대책 리포트</h3>' +
            '<div style="font-size: 0.88rem; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">' + aiReportText + '</div>' +
          '</div>' +
          '<div style="background: #f8fafc; padding: 12px 16px; border-radius: 6px; font-size: 0.82rem; color: #64748b; border: 1px solid #e2e8f0;">' +
            '💡 <strong>[안내]</strong> 본 메일로 <u>전체 답장(사진 및 첨부파일 포함)</u>을 보내주시면 Gemini Vision AI가 자동으로 파손 사진 및 서류를 분석하여 진행경과에 업데이트합니다.' +
          '</div>' +
        '</div>';

        const mailOptions = {
          from: '"' + senderName + '" <' + fromEmail + '>',
          to: row.managerEmail.trim(),
          replyTo: aiGmail || fromEmail,
          subject: '[사고 리포트] ' + accNo + ' - ' + accTitle,
          html: mailHtml
        };

        if (bccEmail && bccEmail.trim() !== '') {
          mailOptions.bcc = bccEmail.split(',').map(s => s.trim()).filter(Boolean);
        }

        await transporter.sendMail(mailOptions);
        sentCount++;
      }

      return NextResponse.json({
        success: true,
        message: '총 ' + sentCount + '건의 실제 사고 리포트가 담당자 이메일로 발송되었습니다.'
      });
    }

    // 사고 데이터가 없는 단순 연동 테스트인 경우
    const recipientList = [];
    if (fromEmail) recipientList.push(fromEmail.trim());
    if (aiGmail && aiGmail.trim() !== '' && !recipientList.includes(aiGmail.trim())) {
      recipientList.push(aiGmail.trim());
    }

    const mailOptions = {
      from: '"' + senderName + '" <' + fromEmail + '>',
      to: recipientList.join(', '),
      replyTo: aiGmail || fromEmail,
      subject: '[사고관리시스템] 테스트 메일 - 지메일 연동 확인용',
      html: '<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">' +
        '<h2 style="color: #2563eb;">📧 사고관리시스템 이메일 발송 테스트</h2>' +
        '<p>안녕하세요, <strong>' + senderName + ' (' + fromEmail + ')</strong>님!</p>' +
        '<p>회사 메일 서버(' + smtpHost + ':' + portNum + ')를 통한 테스트 메일이 정상 발송되었습니다.</p>' +
      '</div>'
    };

    const info = await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error('SMTP Email Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
