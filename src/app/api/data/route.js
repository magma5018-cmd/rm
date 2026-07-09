import { NextResponse } from 'next/server';
import { sheets, sheetId } from '@/lib/google';

// 시트 이름 정의
const ACCIDENT_SHEET = 'Accidents';
const INSURANCE_SHEET = 'Insurance';

export async function GET() {
  try {
    if (!sheetId) throw new Error('GOOGLE_SHEET_ID is not defined');

    // 두 시트의 데이터를 동시에 가져옴
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: [`${ACCIDENT_SHEET}!A1:BZ1000`, `${INSURANCE_SHEET}!A2:AE1000`],
    });

    const accidentDataRaw = response.data.valueRanges[0].values || [];
    const insuranceData = response.data.valueRanges[1].values || [];

    // 첫 번째 행은 헤더로 파싱
    const accHeaders = accidentDataRaw[0] || [];
    const accidentData = accidentDataRaw.slice(1);

    const getAccVal = (row, headerName) => {
      const idx = accHeaders.indexOf(headerName);
      if (idx === -1) return '';
      return row[idx] || '';
    };

    // 데이터를 앱 포맷으로 변환 (헤더명 기준 매핑)
    const usedAccIds = new Set();
    const rowsRaw = accidentData.map((row, i) => {
      let id = parseInt(row[0]); // ID는 항상 첫 컬럼(0)
      if (isNaN(id) || usedAccIds.has(id)) {
        id = 20000 + i;
        while (usedAccIds.has(id)) { id++; }
      }
      usedAccIds.add(id);

      return {
        id,
        사고번호: getAccVal(row, '사고번호'),
        사고일: getAccVal(row, '사고일'),
        사고접수일: getAccVal(row, '사고접수일'),
        가이드제공일: getAccVal(row, '가이드제공일'),
        사업부: getAccVal(row, '사업부'),
        부서: getAccVal(row, '부서'),
        담당자: getAccVal(row, '담당자'),
        실화주: getAccVal(row, '실화주'),
        고객사: getAccVal(row, '고객사'),
        귀책사: getAccVal(row, '귀책사'),
        사고명: getAccVal(row, '사고명'),
        사고내용: getAccVal(row, '사고내용'),
        진행경과: (() => {
          let raw = getAccVal(row, '진행경과');
          // 구버전 fallback
          if (!raw && row[29] && row[29].startsWith('[')) {
            raw = row[29];
          }
          if (!raw || !raw.trim()) return [];

          // 1) JSON 배열이면 그대로 파싱
          if (raw.trim().startsWith('[')) {
            try { return JSON.parse(raw); } catch(e) {}
          }

          // 2) 일반 텍스트 → 줄 단위로 분리해 항목화
          return raw.split(/\n+/).map(l => l.trim()).filter(Boolean).map(line => {
            const m = line.match(/^(\d{4}-\d{2}-\d{2})[:\s]+(.+)/);
            if (m) return { date: m[1], text: m[2].trim() };
            return { date: '', text: line };
          });
        })(),
        '대표이사 보고사항': getAccVal(row, '대표이사 보고사항'),
        '대표이사 보고일': getAccVal(row, '대표이사 보고일'),
        '사고금액(텍스트)': getAccVal(row, '사고금액(텍스트)'),
        사고액:       getAccVal(row, '사고액'),
        배상액:       getAccVal(row, '배상액'),
        회수액:       getAccVal(row, '회수액'),
        손실액:       getAccVal(row, '손실액'),
        완료보고: (() => {
          const val = getAccVal(row, '완료보고');
          return (val === '완료' || val === '미완료' || val === '완료 (클레임 청구)' || val === '완료 (클레임 없음)') ? val : '미완료';
        })(),
        완료보고일: getAccVal(row, '완료보고일'),
        완료방법: getAccVal(row, '완료방법'),
        보험접수: (() => {
          const val = getAccVal(row, '보험접수');
          return (val === 'Y' || val === 'N') ? val : 'N';
        })(),
        접수일:       getAccVal(row, '접수일'),
        보험사:       getAccVal(row, '보험사'),
        접수보험:     getAccVal(row, '접수보험'),
        사건번호:     getAccVal(row, '사건번호'),
        증권번호:     getAccVal(row, '증권번호'),
        자기부담금:   getAccVal(row, '자기부담금'),
        보험보상여부: getAccVal(row, '보험보상여부'),
        보험보상유형: getAccVal(row, '보험보상유형'),
        보험금:       getAccVal(row, '보험금'),
        fileCount:    parseInt(getAccVal(row, '파일수') || '0'),
        driveUrl:     getAccVal(row, '드라이브URL') || null,
        
        // 인명/물적 피해 상세 데이터
        '인명 피해 여부': getAccVal(row, '인명 피해 여부') || 'N',
        '재해자 성명':    getAccVal(row, '재해자 성명'),
        '재해자 성별':    getAccVal(row, '재해자 성별'),
        '재해자 나이':    getAccVal(row, '재해자 나이'),
        '재해자 국적':    getAccVal(row, '재해자 국적'),
        '재해자 소속':    getAccVal(row, '재해자 소속'),
        '재해자 근무형태': getAccVal(row, '재해자 근무형태'),
        '재해자 고용형태': getAccVal(row, '재해자 고용형태'),
        '재해자 직종':    getAccVal(row, '재해자 직종'),
        '상해부위':       getAccVal(row, '상해부위'),
        '상해종류':       getAccVal(row, '상해종류'),
        '상해정도':       getAccVal(row, '상해정도'),
        '물적 자산명':    getAccVal(row, '물적 자산명'),
        '물적 손상원인':  getAccVal(row, '물적 손상원인'),
        '물적 피해비용':  getAccVal(row, '물적 피해비용'),
        '사고 심각도':    getAccVal(row, '사고 심각도'),
        '사고 발생가능성': getAccVal(row, '사고 발생가능성'),
        '사고 위험등급':  getAccVal(row, '사고 위험등급'),
        '인명 피해 상세 내용': getAccVal(row, '인명 피해 상세 내용'),
      };
    });

    // 사고번호 자동 채번 (비어있는 경우)
    const seqMap = {};
    rowsRaw.forEach(r => {
      if (r.사고번호 && r.사고번호.includes('-')) {
        const parts = r.사고번호.split('-');
        const prefix = parts[0];
        const seq = parseInt(parts[1]) || 0;
        if (!seqMap[prefix] || seq > seqMap[prefix]) {
          seqMap[prefix] = seq;
        }
      }
    });

    const rows = rowsRaw.map(r => {
      if (!r.사고번호 || r.사고번호.trim() === '') {
        // 사고접수일이 있으면 사고접수일 기반, 없으면 사고일 기반, 없으면 오늘 날짜
        const dateStr = r.사고접수일 ? r.사고접수일 : (r.사고일 ? r.사고일 : new Date().toISOString().split('T')[0]);
        const prefix = dateStr.replace(/-/g, '');
        const nextSeq = (seqMap[prefix] || 0) + 1;
        seqMap[prefix] = nextSeq;
        r.사고번호 = `${prefix}-${nextSeq}`;
      }
      return r;
    });

    const usedInsIds = new Set();
    const insRows = insuranceData.map((row, i) => {
      let id = parseInt(row[0]);
      // 보험 ID도 동일하게 유니크 보장
      if (isNaN(id) || usedInsIds.has(id)) {
        id = 20000 + i;
        while (usedInsIds.has(id)) { id++; }
      }
      usedInsIds.add(id);
      // 구글 시트 데이터 구조 변경 감지 로직 개선
      // 새로운 구조: ID(0), 구분(1), 보험명(2), 드라이브URL(3), 성격(4) ...
      // 이전 구조: ID(0), 구분(1), 보험명(2), 성격(3), 보상내용(4) ... 드라이브URL(15)
      
      const valAt3 = String(row[3] || '').trim();
      const valAt15 = String(row[15] || '').trim();
      
      const isUrl = (val) => val.startsWith('http') || val.includes('drive.google.com');
      
      let isNewIns = false;
      if (isUrl(valAt3)) {
        isNewIns = true;
      } else if (isUrl(valAt15)) {
        isNewIns = false;
      } else {
        // 둘 다 URL이 아닌 경우 (비어있거나 잘못된 데이터)
        // 만약 컬럼 3이 비어있지 않고 URL도 아니면 높은 확률로 '성격' 데이터임 (구구조)
        if (valAt3 !== '' && !isUrl(valAt3)) {
          isNewIns = false;
        } else {
          // 컬럼 3이 비어있으면 신규 구조로 가정 (사용자가 전체 저장을 눌렀을 가능성이 높음)
          isNewIns = true;
        }
      }

      return {
        id,
        구분: row[1] || '',
        보험명: row[2] || '',
        driveUrl: isNewIns ? row[3] : (row[15] || null),
        성격: (isNewIns ? row[4] : row[3]) || '',
        보상내용: (isNewIns ? row[5] : row[4]) || '',
        계약자: (isNewIns ? row[6] : row[5]) || '',
        피보험자: (isNewIns ? row[7] : row[6]) || '',
        보상한도: (isNewIns ? row[8] : row[7]) || '',
        자기부담금: (isNewIns ? row[9] : row[8]) || '',
        보험사: (isNewIns ? row[10] : row[9]) || '',
        currency: (isNewIns ? row[11] : row[10]) || '',
        보험료금액: (isNewIns ? row[12] : row[11]) || '',
        '보험 시작일': (isNewIns ? row[13] : row[12]) || '',
        '보험 종료일': (isNewIns ? row[14] : row[13]) || '',
        비고: (isNewIns ? row[15] : row[14]) || '',
        상태: (isNewIns ? row[16] : row[16]) || '계약 유지중',
      };
    });

    return NextResponse.json({ rows, insRows });
  } catch (error) {
    console.error('Error fetching data from Sheets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { rows, insRows } = await request.json();

    // 시트 헤더 정의 (UI 순서와 동일하게)
    const accidentHeaders = [
      'ID', '사고번호', '사고일', '사고접수일', '가이드제공일', '사업부', '부서', '담당자',
      '실화주', '고객사', '귀책사', '사고명', '사고내용', '진행경과', '대표이사 보고사항', '대표이사 보고일',
      '사고금액(텍스트)', '사고액', '배상액', '회수액', '자기부담금', '손실액',
      '완료보고', '완료보고일', '완료방법',
      '보험접수', '접수일', '보험사', '접수보험',
      '사건번호', '증권번호', '보험보상여부', '보험보상유형', '보험금',
      '파일수', '드라이브URL',
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

    const insuranceHeaders = [
      'ID', '구분', '보험명', '드라이브URL', '성격', '보상내용', '계약자', '피보험자',
      '보상한도', '자기부담금', '보험사', 'Currency', '보험료금액',
      '보험 시작일', '보험 종료일', '비고', '상태'
    ];

    // 사고 데이터 변환 (헤더 순서와 일치시킴)
    const accidentValues = rows.map(r => [
      r.id, r.사고번호, r.사고일, r['사고접수일'] || '', r['가이드제공일'] || '', r.사업부, r.부서, r.담당자,
      r.실화주, r.고객사, r.귀책사, r.사고명, r.사고내용, JSON.stringify(r.진행경과 || []),
      r['대표이사 보고사항'] || '', r['대표이사 보고일'] || '',
      r['사고금액(텍스트)'], r.사고액, r.배상액, r.회수액, r.자기부담금 || '', r.손실액,
      r.완료보고, r['완료보고일'] || '', r.완료방법,
      r.보험접수, r.접수일, r.보험사, r.접수보험,
      r.사건번호, r.증권번호, r.보험보상여부, r.보험보상유형, r.보험금,
      r.fileCount, r.driveUrl,
      r['인명 피해 여부'] || 'N',
      r['재해자 성명'] || '',
      r['재해자 성별'] || '',
      r['재해자 나이'] || '',
      r['재해자 국적'] || '',
      r['재해자 소속'] || '',
      r['재해자 근무형태'] || '',
      r['재해자 고용형태'] || '',
      r['재해자 직종'] || '',
      r['상해부위'] || '',
      r['상해종류'] || '',
      r['상해정도'] || '',
      r['물적 자산명'] || '',
      r['물적 손상원인'] || '',
      r['물적 피해비용'] || '',
      r['사고 심각도'] || '',
      r['사고 발생가능성'] || '',
      r['사고 위험등급'] || '',
      r['인명 피해 상세 내용'] || ''
    ]);

    // 보험 데이터 변환
    const insuranceValues = insRows.map(r => [
      r.id, r.구분, r.보험명, r.driveUrl, r.성격, r.보상내용, r.계약자, r.피보험자,
      r.보상한도, r.자기부담금, r.보험사, r.currency, r.보험료금액,
      r['보험 시작일'], r['보험 종료일'], r.비고, r.상태 || '계약 유지중',
    ]);

    // 시트 초기화 (기존 데이터가 남아있는 현상 방지)
    const accMaxCol = googleColumnName(accidentHeaders.length);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${ACCIDENT_SHEET}!A2:${accMaxCol}1000`,
    });
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${INSURANCE_SHEET}!A2:Q1000`,
    });

    // 시트 업데이트 (기존 내용 덮어쓰기)
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `${ACCIDENT_SHEET}!A1:${accMaxCol}1`, values: [accidentHeaders] },
          { range: `${ACCIDENT_SHEET}!A2:${accMaxCol}${accidentValues.length + 1}`, values: accidentValues },
          { range: `${INSURANCE_SHEET}!A1:Q1`, values: [insuranceHeaders] },
          { range: `${INSURANCE_SHEET}!A2:Q${insuranceValues.length + 1}`, values: insuranceValues },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving data to Sheets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 컬럼 인덱스를 A, B, C... Z, AA 형태로 변환하는 유틸리티
function googleColumnName(num) {
  let name = '';
  while (num > 0) {
    let temp = (num - 1) % 26;
    name = String.fromCharCode(65 + temp) + name;
    num = (num - temp - 1) / 26;
  }
  return name;
}
