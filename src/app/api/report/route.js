import { NextResponse } from 'next/server';
import { sheets, sheetId } from '@/lib/google';

const SHEET_NAME = 'accident report';

const HEADERS = [
  'ID',
  '접수일시',
  '작성자 이메일',
  '작성자 이름',
  '담당영업팀/영업사원',
  '담당운영팀/운영사원',
  '운송 종류',
  '수출자(Shipper)',
  '수입자(Consignee)',
  '인코텀즈(Incoterms)',
  '세부 운송 모드',
  'House B/L 번호',
  'Master B/L 번호',
  '선사/항공사 명',
  '해외 파트너/법인',
  '화물 품목(아이템)',
  '출발지 및 출발일(POL/ATD)',
  '도착지 및 도착일(POD/ATA)',
  '총 선적 물량',
  '총 화물 가액',
  '파손 물량',
  '파손건 CI Value',
  '법적 계약 관계',
  '운송 주선 범위(SOW)',
  '사고 발생 구간',
  '구체적 사고 발생 장소',
  '화물 인도 증빙 상태',
  '거래처(화주) 명',
  '상차지(출발지)',
  '하차지(도착지)',
  '운송장/배차 번호',
  '화물 품목 및 피해 물량',
  '실제 발생 손해액',
  '실제 수행 주체',
  '사고 최초 인지 일시',
  '과실 책임 주체',
  '사고 원인 분류',
  '상세 사고 경위',
  '드라이브URL',
  '인명 피해 여부',
  '재해자 성명',
  '재해자 성별',
  '재해자 나이',
  '재해자 국적',
  '재해자 소속',
  '재해자 근무형태',
  '재해자 고용형태',
  '재해자 직종',
  '상해부위',
  '상해종류',
  '상해정도',
  '물적 자산명',
  '물적 손상원인',
  '물적 피해비용',
  '사고 심각도',
  '사고 발생가능성',
  '사고 위험등급',
  '인명 피해 상세 내용'
];

export async function POST(request) {
  try {
    if (!sheetId) throw new Error('GOOGLE_SHEET_ID is not defined');

    const body = await request.json();

    // 1. 스프레드시트 정보 조회하여 'accident report' 시트가 있는지 확인
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    
    const currentSheet = meta.data.sheets.find(
      (s) => s.properties.title === SHEET_NAME
    );
    let numericalSheetId = currentSheet ? currentSheet.properties.sheetId : null;

    // 2. 시트가 없으면 생성
    if (!currentSheet) {
      const addSheetRes = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: SHEET_NAME,
                },
              },
            },
          ],
        },
      });
      numericalSheetId = addSheetRes.data.replies[0].addSheet.properties.sheetId;
    }

    // 3. 기존 행 수를 읽어서 ID 계산 및 헤더 누락 시 보정
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A:A`,
    });
    const existingRows = readRes.data.values || [];
    const hasHeader = existingRows.length > 0 && existingRows[0][0] === 'ID';

    // 헤더가 아예 없는 경우 (시트가 비어있거나 첫 행이 ID가 아님)
    if (!hasHeader) {
      if (existingRows.length === 0) {
        // 완전히 비어있을 때는 첫 행에 헤더 업데이트
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${SHEET_NAME}!A1:BZ1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [HEADERS],
          },
        });
      } else {
        // 이미 데이터가 존재하지만 첫 행이 ID가 아닐 경우 맨 위에 행을 1줄 추가하고 헤더 기입
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [
              {
                insertDimension: {
                  range: {
                    sheetId: numericalSheetId,
                    dimension: 'ROWS',
                    startIndex: 0,
                    endIndex: 1,
                  },
                  inheritFromBefore: false,
                },
              },
            ],
          },
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${SHEET_NAME}!A1:BZ1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [HEADERS],
          },
        });
      }
    }

    // ID 및 신규/수정 구분 계산
    let isUpdate = false;
    let finalId = '';
    let rowNumber = -1;

    if (body.reportId) {
      const targetIndex = existingRows.findIndex((row) => row && row[0] === body.reportId);
      if (targetIndex !== -1) {
        isUpdate = true;
        rowNumber = targetIndex + 1; // 1-indexed row number
        finalId = body.reportId;
      }
    }

    if (!isUpdate) {
      const nextIdNumber = existingRows.length - (hasHeader ? 1 : 0);
      finalId = `AR-${String(nextIdNumber).padStart(4, '0')}`;
    }

    // 4. 입력 데이터 정렬하여 행 데이터 생성
    const now = new Date();
    // KST 시간대 변환
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)).toISOString().replace('T', ' ').substring(0, 19);

    const rowData = [
      finalId,                            // 1. ID
      kstTime,                            // 2. 접수일시
      body.qEmail || '',                  // 3. 작성자 이메일
      body.qName || '',                   // 4. 작성자 이름
      body.qSalesDept || '',              // 5. 담당영업팀/영업사원
      body.qOpsDept || '',                // 6. 담당운영팀/운영사원
      body.qCarriageType || '',           // 7. 운송 종류
      body.qIntlShipper || '',            // 8. 수출자(Shipper)
      body.qIntlConsignee || '',          // 9. 수입자(Consignee)
      body.qIntlIncoterms || '',          // 10. 인코텀즈
      body.qIntlMode || '',               // 11. 세부 운송 모드
      body.qIntlHbl || '',                // 12. House B/L 번호
      body.qIntlMbl || '',                // 13. Master B/L 번호
      body.qIntlLiner || '',              // 14. 선사/항공사 명
      body.qIntlPartner || '',            // 15. 해외 파트너/법인
      body.qIntlItem || '',               // 16. 화물 품목(아이템)
      body.qIntlPolAtd || '',             // 17. 출발지 및 출발일(POL/ATD)
      body.qIntlPodAta || '',             // 18. 도착지 및 도착일(POD/ATA)
      body.qIntlTotalQty || '',           // 19. 총 선적 물량
      body.qIntlValue || '',              // 20. 총 화물 가액
      body.qIntlLossQty || '',            // 21. 파손 물량
      body.qIntlLossValue || '',          // 22. 파손건 CI Value
      body.qIntlContract || '',           // 23. 법적 계약 관계
      body.qIntlSow || '',                // 24. 운송 주선 범위(SOW)
      body.qIntlStage || '',              // 25. 사고 발생 구간
      body.qIntlLocation || '',           // 26. 구체적 사고 발생 장소
      body.qIntlProof || '',              // 27. 화물 인도 증빙 상태
      body.qDomClient || '',              // 28. 거래처(화주) 명
      body.qDomOrigin || '',              // 29. 상차지(출발지)
      body.qDomDestination || '',         // 30. 하차지(도착지)
      body.qDomWaybill || '',             // 31. 운송장/배차 번호
      body.qDomItem || '',                // 32. 화물 품목 및 피해 물량
      body.qDomLossAmount || '',          // 33. 실제 발생 손해액
      body.actualSubcontractor || '',     // 34. 실제 수행 주체 (A-11, B-8)
      body.firstCognizanceDate || '',     // 35. 사고 최초 인지 일시 (A-13, B-10)
      body.faultParty || '',              // 36. 과실 책임 주체 (A-14, B-7)
      body.causeClassification || '',     // 37. 사고 원인 분류 (A-15, B-9)
      body.qDetails || '',                // 38. 상세 사고 경위 (Q19)
      body.driveUrl || '',                // 39. 드라이브URL (Q20)
      body.qHumanInjury || 'N',
      body.qInjuryName || '',
      body.qInjuryGender || '',
      body.qInjuryAge || '',
      body.qInjuryNationality || '',
      body.qInjuryAffiliation || '',
      body.qInjuryWorkType || '',
      body.qInjuryEmployType || '',
      body.qInjuryJob || '',
      body.qInjuryPart || '',
      body.qInjuryType || '',
      body.qInjurySeverity || '',
      body.qPropertyAsset || '',
      body.qPropertyCause || '',
      body.qPropertyCost || '',
      body.qRiskSeverity || '',
      body.qRiskProbability || '',
      body.qRiskRating || '',
      body.qHumanInjuryDetails || ''
    ];

    // 5. 시트에 데이터 추가 또는 업데이트
    if (isUpdate && rowNumber !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A${rowNumber}:BZ${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A:A`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });
    }

    return NextResponse.json({ success: true, id: finalId });
  } catch (error) {
    console.error('Error saving report to Sheets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
