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
      password
    } = body;

    if (!smtpHost) {
      return NextResponse.json({ success: false, error: '보내는 메일 서버(SMTP) 주소가 입력되지 않았습니다.' }, { status: 400 });
    }

    if (!fromEmail) {
      return NextResponse.json({ success: false, error: '전자 메일 주소가 입력되지 않았습니다.' }, { status: 400 });
    }

    const portNum = parseInt(smtpPort, 10) || 25;
    const transporterOptions = {
      host: smtpHost,
      port: portNum,
      secure: portNum === 465,
      tls: {
        rejectUnauthorized: false
      }
    };

    if (username && password) {
      transporterOptions.auth = {
        user: username,
        pass: password
      };
    }

    const transporter = nodemailer.createTransport(transporterOptions);
    await transporter.verify();

    // 수신인 목록 구성 (fromEmail 및 aiGmail)
    const recipientList = [];
    if (fromEmail) recipientList.push(fromEmail.trim());
    if (aiGmail && aiGmail.trim() !== '' && !recipientList.includes(aiGmail.trim())) {
      recipientList.push(aiGmail.trim());
    }

    const recipientsStr = recipientList.join(', ');

    const mailOptions = {
      from: `"${senderName}" <${fromEmail}>`,
      to: recipientsStr,
      replyTo: aiGmail ? `${fromEmail}, ${aiGmail}` : fromEmail,
      subject: `[사고관리시스템] 테스트 메일 - 지메일 연동 확인용`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #2563eb;">📧 사고관리시스템 이메일 발송 테스트</h2>
          <p>안녕하세요, <strong>${senderName} (${fromEmail})</strong>님!</p>
          <p>회사 메일 서버(<strong>${smtpHost}:${portNum}</strong>)를 통한 테스트 메일이 정상 발송되었습니다.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <ul style="color: #475569; font-size: 0.9rem; line-height: 1.6;">
            <li><strong>발신자:</strong> ${fromEmail}</li>
            <li><strong>수신자 목록:</strong> ${recipientsStr}</li>
            ${bccEmail ? `<li><strong>숨은참조(BCC):</strong> ${bccEmail}</li>` : ''}
            <li><strong>AI 답장 감지 지메일:</strong> ${aiGmail || '미지정'}</li>
            <li><strong>발송시각:</strong> ${new Date().toLocaleString('ko-KR')}</li>
          </ul>
          <p style="color: #64748b; font-size: 0.85rem; margin-top: 20px; background: #f8fafc; padding: 10px; border-radius: 6px;">
            💡본 메일로 [전체 답장]을 보내주시면 Gemini AI가 답장 내용을 요약하여 사고 진행경과에 자동으로 등록합니다.
          </p>
        </div>
      `
    };

    if (bccEmail && bccEmail.trim() !== '') {
      mailOptions.bcc = bccEmail.split(',').map(s => s.trim()).filter(Boolean);
    }

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      response: info.response,
      recipients: recipientsStr
    });

  } catch (error) {
    console.error('SMTP Email Error:', error);
    let errorMessage = error.message || '이메일 발송 중 알 수 없는 오류가 발생했습니다.';
    
    if (error.code === 'EDNS' || error.code === 'ENOTFOUND') {
      errorMessage = `메일 서버 주소(${error.hostname})를 찾을 수 없습니다. SMTP 주소를 확인해주세요.`;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errorMessage = `메일 서버 포트에 연결할 수 없습니다. (포트 번호 및 방화벽 확인 필요)`;
    } else if (error.code === 'EAUTH' || error.responseCode === 535) {
      errorMessage = `로그인 인증에 실패했습니다. ECHO 접속 ID 및 비밀번호를 확인해주세요.`;
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
