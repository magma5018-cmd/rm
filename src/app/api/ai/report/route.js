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

    const carriageType = body.qCarriageType;
    const isIntl = carriageType === 'international';
    const isDom = carriageType === 'domestic';

    const intlSection = isIntl ? `
[국제 운송 상세 정보]
- 수출자(Shipper): ${body.qIntlShipper || '미기재'}
- 수입자(Consignee): ${body.qIntlConsignee || '미기재'}
- 거래조건(Incoterms): ${body.qIntlIncoterms || '미기재'}
- 세부 운송 모드: ${body.qIntlMode || '미기재'}
- House B/L 번호: ${body.qIntlHbl || '미기재'}
- Master B/L 번호: ${body.qIntlMbl || '미기재'}
- 선사/항공사명: ${body.qIntlLiner || '미기재'}
- 해외 파트너/법인: ${body.qIntlPartner || '미기재'}
- 화물 품목: ${body.qIntlItem || '미기재'}
- POL(출발항)/ATD(실제 출발일): ${body.qIntlPolAtd || '미기재'}
- POD(도착항)/ATA(실제 도착일): ${body.qIntlPodAta || '미기재'}
- 총 선적 물량 (수량 또는 중량): ${body.qIntlTotalQty || '미기재'}
- 총 화물 가액 (Invoice Value): ${body.qIntlValue || '미기재'}
- 파손 물량: ${body.qIntlLossQty || '미기재'}
- 파손건 CI Value (보험 청구 가액): ${body.qIntlLossValue || '미기재'}
- 법적 계약 관계: ${body.qIntlContract || '미기재'}
- SOW (한솔로지스틱스 업무 범위): ${body.qIntlSow || '미기재'}
- 사고 발생 추정 구간: ${body.qIntlStage || '미기재'}
- 구체적 사고 발생 장소: ${body.qIntlLocation || '미기재'}
- 화물 인도 증빙 상태 (Clean/Claused Receipt): ${body.qIntlProof || '미기재'}
` : '';

    const domSection = isDom ? `
[국내 운송 상세 정보]
- 거래처(화주)명: ${body.qDomClient || '미기재'}
- 상차지 (출발지): ${body.qDomOrigin || '미기재'}
- 하차지 (도착지): ${body.qDomDestination || '미기재'}
- 운송장/배차번호: ${body.qDomWaybill || '미기재'}
- 화물 품목 및 피해 물량: ${body.qDomItem || '미기재'}
- 실제 발생 손해액: ${body.qDomLossAmount || '미기재'}
` : '';

    const prompt = `
너는 한솔로지스틱스의 물류 사고/클레임 처리 전문가이자 보고서 작성 전문가야.
제공된 사고접수 상세 데이터를 분석하여, 사내 보고용 공식 '물류 사고 발생 보고서(초안)'를 매우 전문적이고 격식 있는 어조로 작성해줘.

[공통 작성 규칙]
1. 보고서 최상단에 접수 ID, 작성자, 담당 부서 정보를 반드시 마크다운 표 형태(예: | 접수 ID | 작성자 | 담당 부서 |)로 요약하여 가장 먼저 노출하고, 그 아래에 '물류 사고 발생 보고서' 제목을 크게 배치할 것. 절대 <table> 이나 <tr> 같은 HTML 태그를 기재하지 말 것.
2. 마크다운(Markdown) 문법을 적극 활용하여 제목(#, ##), 소제목, 강조(**굵게**), 리스트(-), 구분선(---) 등으로 구조적이고 깔끔한 보고서 레이아웃을 구성할 것.
3. 데이터가 제공되지 않았거나 빈 값인 항목은 '미기재' 또는 '확인 중'으로 표기하여 보고서의 정합성을 유지할 것.
4. 보고 시점 기준의 객관적인 '사고 현황 및 사실 관계'만을 기록하며, 임의로 향후 대책, 보상 방안, 재발 방지 대책 등을 지어내어 기재하지 말 것.
5. 전문적인 물류 용어를 사용하여 신뢰감을 주되, 비즈니스 한글 맞춤법과 띄어쓰기를 엄격히 준수할 것.
6. 인명 피해가 존재하는 경우(있음), 보고서 요약 내용이나 사실 관계 본문에 인명 피해 상태(부상자 수, 부상 상태 및 긴급 조치 사항 등)를 반드시 사실에 입각하여 명확하고 비중 있게 기록할 것.
7. [필수 피드백 제공] 보고서 최상단(제목 바로 아래)에 '💡 AI 데이터 정합성 피드백 및 개선 조언' 섹션을 반드시 구성할 것.
   - 이 섹션에서는 입력받은 데이터들을 기반으로, 보험 청구 및 공식 클레임 진행을 위해 현재 입력된 정보 중 부족하거나 누락된 구체적 팩트(예: 파손 수량 미기재, 화물 가액 부재, 사고 경위의 시간/장소 모호성 등)가 있는지 정밀 분석하여 2~3줄 이내로 직설적으로 조언할 것.
   - 만약 모든 데이터가 빈틈없이 충실하고 완벽하게 기재되었다면, '누락 데이터 없음 (보험 심사 적합)' 판정을 적어줄 것.
8. [보고서 섹션 순서 규정 (필수)]
   반드시 아래의 번호 및 섹션 순서대로 본문 보고서를 작성할 것:
   - 섹션 1. 사고 개요 (접수 정보, 상세 운송 정보 등)
   - 섹션 2. 사고 원인 및 경위 (사고 원인 분류, 과실 책임 주체, 최초 인지 일시, 육하원칙 상세 사고 경위, 드라이브 증빙 링크 등)
   - 섹션 3. 사고 현황 및 손해 규모 (사고 발생 구간, 구체적 사고 발생 장소, 화물 품목 및 피해 물량, 파손건 CI Value, 실손해 보상액 등)
   - 섹션 4. 법적 계약 및 책임 관계 (실제 수행 주체, 법적 계약 관계, SOW 운송 주선 범위 등)
9. [상세 사고 경위 서술 핵심 규칙 - 최우선 반영 요구]
   상세 사고 경위는 반드시 아래 4단계 흐름으로 구성하며, 각 단계에 해당하는 데이터를 빠짐없이 반영할 것.

   [1단계 - 운송 배경 서술]
   - 경위 서술 첫머리에 해당 화물의 운송 배경을 먼저 기술할 것.
   - 국제 운송인 경우: B/L번호(HBL/MBL), 선사/항공사명, POL(출발항)/ATD → POD(도착항)/ATA 구간, Shipper → Consignee 거래 관계, 거래조건(Incoterms), 화물 품목 및 총 선적 물량을 명시할 것.
   - 국내 운송인 경우: 운송장/배차번호, 거래처명, 상차지 → 하차지 구간, 화물 품목을 명시할 것.

   [2단계 - 육하원칙 사고 경위 서술]
   - 제공된 육하원칙 5개 항목(누가/언제/어디서/무엇을/어떻게-왜)을 각각 별도의 소항목(**[누가]**, **[언제]**, **[어디서]**, **[무엇을]**, **[어떻게/왜]**)으로 구분하여 나열할 것.
   - 각 항목에 기재된 고유명사(회사명, 담당자명), 지명, 물품명, 날짜, 수량 등을 그대로 활용하여 절대 축약하거나 생략하지 말 것.
   - 5개 소항목 나열 이후, 이를 통합하는 서술형 사고 경위 단락(3~5문장)을 추가로 구성할 것.

   [3단계 - 피해 규모 명시]
   - 경위 서술 내에 파손 물량, CI Value(보험 청구 가액), 실손해 추정액(또는 실발생 손해액)을 명확히 수치로 기재할 것.
   - 피해 금액이 미기재인 경우 '확인 중'으로 표기하고, 화물 인도 증빙 상태(Clean/Claused Receipt)를 반드시 병기할 것.

   [4단계 - 책임 소재 서술]
   - 실제 운송 수행 주체(운송인/차주/수탁사)와 현장에서 판단된 과실 책임 주체를 명확히 기재할 것.
   - SOW(한솔로지스틱스 업무 범위) 및 법적 계약 관계를 근거로, 귀책 판단의 기준이 된 사실관계(예: 계약상 운송 구간, 인도 시점 등)를 간략히 병기할 것.
   - 단, 임의로 최종 법적 책임을 단정하거나 보상 의무를 선언하지 말 것. 사실 관계만 서술할 것.

[사고 접수 기본 정보]
- 접수 ID: ${body.id || '신규'}
- 작성자: ${body.qName || '미기재'} (${body.qEmail || '미기재'})
- 담당 부서: 영업팀 [${body.qSalesDept || '미기재'}] / 운영팀 [${body.qOpsDept || '미기재'}]
- 운송 종류: ${isIntl ? '국제 운송 (International Carriage)' : isDom ? '국내 내륙 운송 (Domestic Carriage)' : '운송 없음 (기타)'}
- 인명 피해 여부: ${body.qHumanInjury === 'Y' ? '있음' : '없음'}
- 인명 피해 상세 내용: ${body.qHumanInjuryDetails || '해당 없음'}

${intlSection}
${domSection}

[공통 사고 원인 및 경위 정보]
- 실제 수행 주체 (운송인/차주): ${body.actualSubcontractor || '미기재'}
- 최초 인지 일시: ${body.firstCognizanceDate || '미기재'}
- 과실 책임 주체 (현장 판단): ${body.faultParty || '미기재'}
- 사고 원인 분류: ${body.causeClassification || '미기재'}
- 증빙 링크 (드라이브): ${body.driveUrl || '미첨부'}

[상세 사고 경위 - 육하원칙 개별 항목 (이 5가지 항목 모두를 경위서에 상세히 반영할 것)]
- 누가 (Who/피해 인지 주체): ${body.qDetailsWho || '미기재'}
- 언제 (When/사고 일시): ${body.qDetailsWhen || '미기재'}
- 어디서 (Where/사고 장소): ${body.qDetailsWhere || '미기재'}
- 무엇을 (What/피해 내용): ${body.qDetailsWhat || '미기재'}
- 어떻게/왜 (How/Why - 사고 원인 및 정황): ${body.qDetailsHow || '미기재'}

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
