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
      smtpHost = 'smtp.gmail.com',
      smtpPort = 587,
      username = 'magma5018@gmail.com',
      password = 'gojffulntemnfqfy',
      rows = []
    } = body;

    const senderEmail = fromEmail || aiGmail || 'magma5018@gmail.com';
    const authPass = password || 'gojffulntemnfqfy';

    // 📌 수신인(To) 이메일 태그 목록 전체 추출 (mhs810@hansol.com, magma5018@gmail.com 등)
    let globalRecipients = [];
    if (Array.isArray(toEmails) && toEmails.length > 0) {
      globalRecipients = toEmails.map(s => typeof s === 'string' ? s.trim() : (s.email || '')).filter(s => s && s.includes('@'));
    }

    // 1. 발송 대상 사고 건 선별
    const targetRows = Array.isArray(rows) 
      ? rows.filter(r => r && (r.autoEmail === 'Y' || r.autoEmail === 'y') && r.managerEmail && typeof r.managerEmail === 'string' && r.managerEmail.trim().includes('@')) 
      : [];

    if (targetRows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '발송 대상이 없습니다. (자동발송(Y)로 설정되고 담당자 이메일 주소가 입력된 사고 건만 발송됩니다.)' 
      }, { status: 200 });
    }

    const portNum = parseInt(smtpPort, 10) || 587;
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

      // 📌 100% 명확한 해결: 사고 담당자 이메일 + 설정 화면에 등록된 수신인 태그(mhs810@hansol.com 포함) 전체를 100% 통합 수신자로 묶기!
      const recipientsSet = new Set(globalRecipients);
      recipientsSet.add(managerEmail);

      const finalRecipientsList = Array.from(recipientsSet).filter(Boolean);
      const finalRecipientsStr = finalRecipientsList.join(', ');

      // 📌 진행경과 히스토리 파싱
      let progressList = [];
      if (Array.isArray(row.진행경과)) {
        progressList = row.진행경과;
      } else if (typeof row.진행경과 === 'string' && row.진행경과.trim() !== '') {
        try {
          const parsed = JSON.parse(row.진행경과);
          if (Array.isArray(parsed)) progressList = parsed;
        } catch (e) {
          progressList = row.진행경과.split(/\n+/).map(l => ({ date: '', text: l.trim() }));
        }
      }

      let progressHtml = '';
      if (progressList.length > 0) {
        progressHtml = '<div style="margin-bottom: 20px;">' +
          '<h3 style="font-size: 0.95rem; font-weight: 800; color: #1e3a8a; margin: 0 0 8px 0;">📋 진행경과 (상세 이력 총 ' + progressList.length + '건)</h3>' +
          '<div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px;">';
        
        progressList.forEach((p, idx) => {
          const pDate = p.date ? '[' + p.date + '] ' : '';
          progressHtml += '<div style="font-size: 0.88rem; padding: 6px 0; border-bottom: ' + (idx === progressList.length - 1 ? 'none' : '1px dashed #e2e8f0') + '; color: #334155;">' +
            '<strong style="color: #2563eb;">' + pDate + '</strong>' + (p.text || '') +
          '</div>';
        });

        progressHtml += '</div></div>';
      }

      const subjectTitle = '[사고 리포트] ' + accTitle + ' (사고번호: ' + accNo + ')';
      const headerTitle = '🚨 [사고 관리 리포트] ' + accTitle + ' (사고번호: ' + accNo + ')';

      const mailHtml = '<div style="font-family: sans-serif; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; max-width: 700px; background: #ffffff; margin: 0;">' +
        '<div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 20px 24px; border-radius: 10px; margin-bottom: 20px;">' +
          '<h2 style="margin:0; font-size: 1.25rem; font-weight: 800;">' + headerTitle + '</h2>' +
          '<p style="margin: 6px 0 0 0; font-size: 0.88rem; opacity: 0.95;">담당자 전용 사고 진행 및 AI 답장 자동 업데이트 리포트입니다.</p>' +
        '</div>' +

        '<div style="background: #f0fdf4; padding: 16px 20px; border-radius: 10px; border: 1px solid #bbf7d0; margin-bottom: 20px;">' +
          '<h3 style="margin: 0 0 8px 0; color: #166534; font-size: 1rem; font-weight: 800;">📸 Gemini AI 사고 진행사항 자동 업데이트 안내</h3>' +
          '<p style="margin: 0; font-size: 0.88rem; color: #15803d; line-height: 1.6;">' +
            '본 메일로 <strong>[전체 답장]</strong>을 보내시면서 사고 진행사항 텍스트, 또는 이메일 캡쳐본을 보내주시면 AI가 사고 진행경과를 업데이트 합니다.' +
          '</p>' +
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
            '<td style="padding: 10px 14px; border: 1px solid #e2e8f0;">' + accManager + ' (' + managerEmail + ')</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold;">사고 내용</td>' +
            '<td colspan="3" style="padding: 10px 14px; border: 1px solid #e2e8f0; line-height: 1.6;">' + accContent + '</td>' +
          '</tr>' +
        '</table>' +

        progressHtml +

        '<div style="background: #f8fafc; padding: 14px 18px; border-radius: 8px; font-size: 0.82rem; color: #64748b; border: 1px solid #e2e8f0; text-align: center;">' +
          '본 이메일은 사고 관리 시스템에서 수신인 지정(To: ' + finalRecipientsStr + ')으로 자동 발송된 리포트입니다.' +
        '</div>' +
      '</div>';

      const mailOptions = {
        from: '"' + senderName + '" <' + senderEmail + '>',
        to: finalRecipientsStr,
        replyTo: aiGmail || senderEmail,
        subject: subjectTitle,
        html: mailHtml
      };

      if (bccEmail && typeof bccEmail === 'string' && bccEmail.trim() !== '') {
        mailOptions.bcc = bccEmail.split(',').map(s => s.trim()).filter(Boolean);
      }

      await transporter.sendMail(mailOptions);
      sentCount++;
      sentResults.push({ accNo, recipient: finalRecipientsStr });
    }

    return NextResponse.json({
      success: true,
      sentCount,
      sentResults,
      message: '총 ' + sentCount + '건의 사고 리포트가 수신인 목록 전체(' + globalRecipients.join(', ') + ')에게 성공적으로 발송되었습니다.'
    }, { status: 200 });

  } catch (error) {
    console.error('Email Route Error:', error);
    return NextResponse.json({ success: false, error: error.message || '이메일 발송 중 예외가 발생했습니다.' }, { status: 200 });
  }
}
