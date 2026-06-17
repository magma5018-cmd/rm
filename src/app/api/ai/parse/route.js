import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    const { text = '', images = [] } = await request.json();

    if (!text.trim() && images.length === 0) {
      return NextResponse.json({ error: '텍스트나 이미지가 제공되지 않았습니다.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Gemini 2.5 Flash 모델 사용
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
 너는 물류 사고/클레임 처리 전문가야.
 다음 제공된 텍스트와 이미지(카톡 캡처 등) 정보를 분석해서 사고 내용을 추출해줘.
 결과는 오직 JSON 형식으로만 반환해. 다른 설명은 절대 추가하지 마.

 추출해야 할 JSON 키와 설명:
 - 사고일 (YYYY-MM-DD 형식. 텍스트에 날짜가 명시되지 않으면 빈칸)
 - 사업부 (물류Biz 등)
 - 부서 (원문에서 '~~팀' 또는 '~~법인'으로 끝나는 단어)
 - 담당자 (이름)
 - 실화주 (실제 화물 주인)
 - 고객사 (계약 고객사)
 - 귀책사 (운송사, 창고, 자사, 제3자 등)
 - 사고명 (제품·수량·파손 상황 모두 포함)
 - 사고내용 (육하원칙을 모두 포함해 상세히 서술)
 - 사고액 (천 단위 콤마 포함)
 - 배상액 (천 단위 콤마 포함)

 원문 텍스트:
 ${text}
 `;

    const parts = [{ text: prompt }];
    for (const img of images) {
      parts.push({
        inlineData: {
          data: img.base64,
          mimeType: img.mimeType,
        },
      });
    }

    console.log('Sending request to Gemini API (2.5 Flash)...');
    const result = await model.generateContent(parts);
    const responseText = result.response.text();

    // 마크다운 제거 및 JSON 파싱
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json/, '').replace(/```$/,'').trim();
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```/, '').replace(/```$/,'').trim();
    }

    const parsedData = JSON.parse(cleanText);
    console.log('Gemini Parsed Data:', parsedData);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('AI Parse Error:', error);
    return NextResponse.json({ error: error.message || 'AI 분석 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
