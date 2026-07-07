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
제공된 사고접수 상세 데이터를 분석하여, 사내 보고용 공식 '물류 사고 발생 보고서(초안)'를 매우 전문적이고 격식 있는 어조로 작성해줘.

[공통 작성 규칙]
1. 보고서 제목은 반드시 '물류 사고 발생 보고서'로 시작하고, 하단에 접수 ID 및 작성자 정보를 표 형태로 요약할 것.
2. 마크다운(Markdown) 문법을 적극 활용하여 제목(#, ##), 소제목, 강조(**굵게**), 리스트(-), 구분선(---) 등으로 구조적이고 깔끔한 보고서 레이아웃을 구성할 것.
3. 데이터가 제공되지 않았거나 빈 값인 항목은 '미기재' 또는 '확인 중'으로 표기하여 보고서의 정합성을 유지할 것.
4. 보고 시점 기준의 객관적인 '사고 현황 및 사실 관계'만을 기록하며, 임의로 향후 대책, 보상 방안, 재발 방지 대책 등을 지어내어 기재하지 말 것.
5. 전문적인 물류 용어를 사용하여 신뢰감을 주되, 비즈니스 한글 맞춤법과 띄어쓰기를 엄격히 준수할 것.

[운송 형태별 세부 작성 가이드]
1. 국제 운송 (International Carriage)의 경우:
   - '인코텀즈(Incoterms) 조건'에 의거하여 위험 및 비용 분담 주체를 명시적으로 언급할 것.
   - B/L 정보(HBL, MBL)와 선적 정보(POL/ATD, POD/ATA)를 바탕으로 사고가 인지된 시점과 구간(예: 출발지 내륙, 메인 국제운송, 도착지 내륙 등)을 정밀히 대조하여 작성할 것.
   - 손해액 평가 시 CI Value와 화물 품목의 물량을 기재하여 손해 규모를 객관적으로 명시할 것.
2. 국내 내륙 운송 (Domestic Carriage)의 경우:
   - 운송장 및 배차 번호를 기반으로 한 배차 이력 및 수행 주체(차주/위탁사)를 명시할 것.
   - 국내 운송의 실손해 보상 원칙에 입각하여 피해액 규모를 기술할 것.
   - 상차지(출발지) 및 하차지(도착지) 사이의 수송 노선상 특이사항 및 최초 사고 인지 상황을 중점적으로 다룰 것.

[사고 접수 데이터]
- ID: ${body.id || '신규'}
- 작성자: ${body.qName || ''} (${body.qEmail || ''})
- 담당 부서: 영업팀 [${body.qSalesDept || '미기재'}] / 운영팀 [${body.qOpsDept || '미기재'}]
- 운송 종류: ${body.qCarriageType === 'international' ? '국제 운송' : '국내 내륙 운송'}

${body.qCarriageType === 'international' ? `
[국제 운송 상세 정보]
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
[국내 운송 상세 정보]
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

위 데이터를 기반으로 규정에 맞게 작성된 실무용 사고 발생 보고서를 작성해줘.

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
