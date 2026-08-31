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

    // 1. SMTP 트랜스포터 생성
    const portNum = parseInt(smtpPort, 10) || 25;
    const transporterOptions = {
      host: smtpHost,
      port: portNum,
      secure: portNum === 465, // 465포트는 SSL 사용
      tls: {
        rejectUnauthorized: false // 인가되지 않은 자체 서명 SSL 서티 허용
      }
    };

    if (username && password) {
      transporterOptions.auth = {
        user: username,
        pass: password
      };
    }

    const transporter = nodemailer.createTransport(transporterOptions);

    // 2. 서버 커넥션/인증 테스트
    await transporter.verify();

    // 3. 테스트 이메일 옵션 구성
    // AI 지메일이 등록되어 있으면 수신인/참조 목록에 추가
    let recipients = fromEmail;
    if (aiGmail) {
      recipients += `, ${aiGmail}`;
    }

    const mailOptions = {
      from: `"${senderName}" <${fromEmail}>`,
      to: recipients,
      subject: `[테스트 메일] 사고관리시스템 이메일 발송 연동 테스트`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">📧 사고관리시스템 이메일 발송 테스트</h2>
          <p>안녕하세요, <strong>${senderName} (${fromEmail})</strong>님!</p>
          <p>회사 이메일 서버(<strong>${smtpHost}:${portNum}</strong>)를 통한 테스트 메일이 성공적으로 전송되었습니다.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <ul style="color: #475569; font-size: 0.9rem;">
            <li><strong>보낸이:</strong> ${fromEmail}</li>
            <li><strong>수신인:</strong> ${recipients}</li>
            ${bccEmail ? `<li><strong>숨은참조(BCC):</strong> ${bccEmail}</li>` : ''}
            <li><strong>발송시각:</strong> ${new Date().toLocaleString('ko-KR')}</li>
          </ul>
          <p style="color: #64748b; font-size: 0.85rem; margin-top: 20px;">본 메일은 이메일 발송 설정 기능의 상호 테스트용으로 발송된 메일입니다.</p>
        </div>
      `
    };

    if (bccEmail) {
      mailOptions.bcc = bccEmail;
    }

    // 4. 테스트 메일 실제 발송
    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      response: info.response,
      recipients: recipients
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
