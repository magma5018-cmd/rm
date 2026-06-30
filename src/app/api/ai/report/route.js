import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    const body = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
너는 한솔로지스틱스의 물류 사고/클레임 처리 전문가이자 보고서 작성 전문가야.
다음 제공된 사고접수 상세 항목 정보를 바탕으로, 사내 보고용 공식 '물류 사고 발생 보고서(초안)'를 전문적이고 육하원칙에 맞게 신뢰성 있는 어조로 작성해줘.

[보고서 작성 규칙]
1. 보고서 제목은 반드시 '물류 사고 발생 보고서'로 시작할 것.
2. 마크다운(Markdown) 형식을 사용하여 제목, 소제목, 표 등을 구조적으로 표현할 것.
3. 제공된 데이터가 빈 칸인 항목은 굳이 언급하지 않거나 '미기재'로 처리하여 보고서의 가독성을 높일 것.
4. 사고 개요, 사고 상세 경위, 피해 규모, 귀책 및 책임소재, 향후 대응 계획 및 재발 방지 대책 항목을 반드시 포함할 것.
5. 전문적이고 간결한 비즈니스 어조를 사용하고 불필요한 수식어는 피할 것.

[사고 접수 데이터]
- ID: ${body.id || '신규'}
- 작성자: ${body.qName || ''} (${body.qEmail || ''})
- 담당 부서: 영업팀 [${body.qSalesDept || '미기재'}] / 운영팀 [${body.qOpsDept || '미기재'}]
- 운송 종류: ${body.qCarriageType || ''}

${body.qCarriageType === 'international' ? `
[국제 운송 상세]
- 수출자(Shipper): ${body.qIntlShipper || ''}
- 수입자(Consignee): ${body.qIntlConsignee || ''}
- 거래조건(Incoterms): ${body.qIntlIncoterms || ''}
- 세부 운송 모드: ${body.qIntlMode || ''}
- B/L 번호: House B/L [${body.qIntlHbl || ''}], Master B/L [${body.qIntlMbl || ''}]
- 선사/항공사: ${body.qIntlLiner || ''}
- 해외 파트너/법인: ${body.qIntlPartner || ''}
- 화물 품목: ${body.qIntlItem || ''}
- POL/ATD: ${body.qIntlPolAtd || ''}
- POD/ATA: ${body.qIntlPodAta || ''}
- 총 선적 물량: ${body.qIntlTotalQty || ''}
- 총 화물 가액: ${body.qIntlValue || ''}
- 파손 물량: ${body.qIntlLossQty || ''}
- 파손건 CI Value: ${body.qIntlLossValue || ''}
- 법적 계약 관계: ${body.qIntlContract || ''}
- SOW (업무 범위): ${body.qIntlSow || ''}
- 사고 발생 구간: ${body.qIntlStage || ''}
- 구체적 사고 발생 장소: ${body.qIntlLocation || ''}
- 화물 인도 증빙 상태: ${body.qIntlProof || ''}
` : `
[국내 운송 상세]
- 거래처(화주)명: ${body.qDomClient || ''}
- 상차지: ${body.qDomOrigin || ''}
- 하차지: ${body.qDomDestination || ''}
- 운송장/배차번호: ${body.qDomWaybill || ''}
- 화물 품목 및 피해 물량: ${body.qDomItem || ''}
- 실제 발생 손해액: ${body.qDomLossAmount || ''}
`}

[공통 사고 정보]
- 실제 수행 주체: ${body.actualSubcontractor || ''}
- 최초 인지 일시: ${body.firstCognizanceDate || ''}
- 과실 책임 주체: ${body.faultParty || ''}
- 사고 원인 분류: ${body.causeClassification || ''}
- 상세 사고 경위: ${body.qDetails || ''}
- 증빙 링크(드라이브): ${body.driveUrl || ''}

위 데이터를 기반으로 작성된 완성도 높은 보고서를 출력해줘.
`;

    console.log('Generating AI Report via Gemini (2.5 Flash)...');
    const result = await model.generateContent([{ text: prompt }]);
    const reportText = result.response.text();

    return NextResponse.json({ success: true, report: reportText });
  } catch (error) {
    console.error('AI Report Gen Error:', error);
    return NextResponse.json({ error: error.message || 'AI 보고서 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
