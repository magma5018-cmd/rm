'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

// ── 고유 ID 생성기 ──
let _nextId = 2;
const genId = () => _nextId++;

// ── 정렬용 숫자 파싱 (컴포넌트 외부) ──
const parseNum = (v) => (v ? Number(String(v).replace(/[^0-9-]/g, '')) || 0 : 0);
const SORT_NUM_COLS = new Set(['사고액', '배상액', '회수액', '손실액', '보험금']);
const SORT_SKIP_COLS = new Set(['사고내용', '사고금액(텍스트)']);

// ── textarea 자동 높이 조절 ──
const autoResize = (el) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.max(34, el.scrollHeight) + 'px';
};

// ── 차트 Y축 금액 포맷 ──
const fmtAxisVal = (v) => {
  if (v === 0) return '0';
  if (v >= 100000000) return `${(v / 100000000).toFixed(v % 100000000 === 0 ? 0 : 1)}억`;
  if (v >= 10000000) return `${Math.round(v / 10000000)}천만`;
  if (v >= 1000000) return `${Math.round(v / 1000000)}백만`;
  if (v >= 10000) return `${Math.round(v / 10000)}만`;
  return v.toLocaleString();
};

// ── 빈 사고 행 템플릿 ──
const COLUMN_TOOLTIPS = {
  '사고액': '사고로 인해 발생한 총 피해 규모 (원가 기준 총액)',
  '배상액': '보험사 또는 귀책처로부터 구상하여 돌려받을 금액',
  '회수액': '파손 화물 처분 등을 통해 자체적으로 회수한 금액',
  '자기부담금': '보험 처리 시 당사가 부담해야 하는 공제 금액',
  '손실액': '당사가 최종 부담하는 순 손실액 (사고액 - 배상액 - 회수액 - 보험금)'
};

const emptyRow = () => {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: genId(),
    사고번호: '', 사고일: today, '사고접수일': today, '가이드제공일': '', 사업부: '', 부서: '', 담당자: '',
    실화주: '', 고객사: '', 귀책사: '', 사고명: '',
    사고내용: '', '대표이사 보고사항': '', '대표이사 보고일': '', 사고액: '', 배상액: '', 회수액: '',
    손실액: '', 완료보고: '미완료', 완료방법: '',
    보험접수: 'N', 접수일: today, 보험사: '', 접수보험: '',
    사건번호: '', 증권번호: '', 자기부담금: '', 보험보상여부: '', 보험보상유형: '', 보험금: '',
    fileCount: 0,   // 업로드된 파일 수
    driveUrl: null, // 구글드라이브 폴더 URL (연동 후 채워짐)
    진행경과: [],
  };
};

// ── 빈 보험 행 템플릿 ──
let _insId = 2;
const genInsId = () => _insId++;
const emptyInsRow = () => {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: genInsId(),
    구분: '', 보험명: '', 성격: '', 보상내용: '', 계약자: '', 피보험자: '',
    보상한도: '', 자기부담금: '', 보험사: '', currency: '', 보험료금액: '',
    '보험 시작일': today, '보험 종료일': today, 비고: '', 상태: '계약 유지중', driveUrl: null,
  };
};

// ── 초기 사고 데이터 ──
const INIT_ROWS = [
  {
    id: 1,
    사고번호: '20260507-1', 사고일: '2026-05-07', '사고접수일': '2026-05-07', '가이드제공일': '2026-05-08', 사업부: '물류Biz', 부서: '물류운영팀', 담당자: '홍길동',
    실화주: 'A전자', 고객사: 'B물류', 귀책사: '제3자 운송사', 사고명: '적재함 파손',
    사고내용: '지게차 충돌', '대표이사 보고사항': 'O', '대표이사 보고일': '2026-05-08', 사고액: '2,500,000', 배상액: '1,000,000', 회수액: '0',
    손실액: '1,500,000', 완료보고: '미완료', 완료: false,
    보험접수: 'Y', 접수일: '2026-05-08', 보험사: '삼성화재', 접수보험: 'MMIP',
    사건번호: 'C-12345', 증권번호: 'P-99999', 자기부담금: '0', 보험보상여부: '보상대상', 보험보상유형: '물적피해', 보험금: '1,500,000',
    fileCount: 2,
    driveUrl: 'https://drive.google.com',
    진행경과: [
      { date: '2026-05-07', text: '사고 최초 접수. 현장 조사 의뢰 완료.' },
      { date: '2026-05-08', text: '보험사 접수 완료. 클레임 번호 발급.' },
    ],
  },
];

// ── 초기 보험 데이터 ──
const INIT_INS = [
  {
    id: 1,
    구분: '본사', 보험명: '재산종합보험', 성격: 'WBD',
    보상내용: '화재 등에 인한 건물/재고 손해 보상',
    계약자: '로지스틱스',
    피보험자: '로지스틱스, 로지스루, 로지스마일 등',
    보상한도: '가입금액: 2667억원', 자기부담금: '손해액 10%', 보험사: '현대해상',
    currency: 'KRW', 보험료금액: '330,050,300',
    '보험 시작일': '2025-10-25', '보험 종료일': '2026-10-24',
    비고: '재고가액 20억 이상 거점 가입 (20억 이하 MMIP로 커버)',
    driveUrl: 'https://drive.google.com',
  },
];

// ─────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  padding: '12px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
  outline: 'none'
};

const selectStyle = {
  width: '100%',
  padding: '12px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
  outline: 'none',
  background: 'white',
  cursor: 'pointer'
};

const causeDetailsMap = {
  '장비결함': ['공컨테이너 자체 불량', '온도조절 장치 고장', '차량 결함', '기타 장비결함'],
  '운송하역 파손': ['지게차 충격', '크레인 충격', '도로 충돌/전도', '상하역 낙하', '기타 파손'],
  '포장불량': ['라싱/쇼어링 부실', '완충재 부족', '박스 강도 부족', '기타 포장불량'],
  '환경요인': ['우천 침수', '해수 침투', '결로 현상', '기타 환경요인']
};

export default function Home() {
  // 로그인 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // ── 신규 사고접수 설문지 상태 ──
  const [authViewMode, setAuthViewMode] = useState('select'); // 'select' | 'login' | 'report'
  const [reportStep, setReportStep] = useState(1); // 1, 2, 3
  const [qEmail, setQEmail] = useState('');
  const [qName, setQName] = useState('');
  const [qSalesDept, setQSalesDept] = useState('');
  const [qOpsDept, setQOpsDept] = useState('');
  const [qCarriageType, setQCarriageType] = useState(''); // 'international' | 'domestic'

  // 국제 운송 추가 항목
  const [qIntlItem, setQIntlItem] = useState('');
  const [qIntlLiner, setQIntlLiner] = useState('');
  const [qIntlPartner, setQIntlPartner] = useState('');
  const [qIntlPolAtd, setQIntlPolAtd] = useState('');
  const [qIntlPodAta, setQIntlPodAta] = useState('');
  const [qIntlTotalQty, setQIntlTotalQty] = useState('');
  const [qIntlLossQty, setQIntlLossQty] = useState('');
  const [qIntlLossValue, setQIntlLossValue] = useState('');
  const [qIntlLocation, setQIntlLocation] = useState('');
  
  // 섹션 A: 국제 운송
  const [qIntlShipper, setQIntlShipper] = useState('');
  const [qIntlConsignee, setQIntlConsignee] = useState('');
  const [qIntlIncoterms, setQIntlIncoterms] = useState('');
  const [qIntlMode, setQIntlMode] = useState('');
  const [qIntlHbl, setQIntlHbl] = useState('');
  const [qIntlMbl, setQIntlMbl] = useState('');
  const [qIntlCurrency, setQIntlCurrency] = useState('USD');
  const [qIntlValue, setQIntlValue] = useState('');
  const [qIntlContract, setQIntlContract] = useState('');
  const [qIntlSow, setQIntlSow] = useState('');
  const [qIntlStage, setQIntlStage] = useState([]);

  const handleStageCheckboxChange = (option) => {
    if (option === '모름') {
      if (qIntlStage.includes('모름')) {
        setQIntlStage([]);
      } else {
        setQIntlStage(['모름']);
      }
    } else {
      let updated = qIntlStage.filter(val => val !== '모름');
      if (updated.includes(option)) {
        updated = updated.filter(val => val !== option);
      } else {
        updated.push(option);
      }
      setQIntlStage(updated);
    }
  };
  const [qIntlSubcontractor, setQIntlSubcontractor] = useState('');
  const [qIntlProof, setQIntlProof] = useState('');
  const [qIntlDate, setQIntlDate] = useState('');
  const [qIntlFault, setQIntlFault] = useState('');
  const [qIntlCauseCategory, setQIntlCauseCategory] = useState('');
  const [qIntlCauseDetail, setQIntlCauseDetail] = useState('');

  // 섹션 B: 국내 내륙 운송
  const [qDomClient, setQDomClient] = useState('');
  const [qDomOrigin, setQDomOrigin] = useState('');
  const [qDomDestination, setQDomDestination] = useState('');
  const [qDomWaybill, setQDomWaybill] = useState('');
  const [qDomItem, setQDomItem] = useState('');
  const [qDomLossAmount, setQDomLossAmount] = useState('');
  const [qDomFault, setQDomFault] = useState('');
  const [qDomSubcontractor, setQDomSubcontractor] = useState('');
  const [qDomCause, setQDomCause] = useState('');
  const [qDomDate, setQDomDate] = useState('');

  // 공통 마무리
  const [qDetails, setQDetails] = useState('');
  const [qFiles, setQFiles] = useState([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [currentReportId, setCurrentReportId] = useState(null);
  const [aiReportText, setAiReportText] = useState('');
  const [isGeneratingAIReport, setIsGeneratingAIReport] = useState(false);

  const resetQuestionnaire = () => {
    setReportStep(1);
    setCurrentReportId(null);
    setAiReportText('');
    setIsGeneratingAIReport(false);
    setQEmail('');
    setQName('');
    setQSalesDept('');
    setQOpsDept('');
    setQCarriageType('');
    setQIntlItem('');
    setQIntlLiner('');
    setQIntlPartner('');
    setQIntlPolAtd('');
    setQIntlPodAta('');
    setQIntlTotalQty('');
    setQIntlLossQty('');
    setQIntlLossValue('');
    setQIntlLocation('');
    setQIntlShipper('');
    setQIntlConsignee('');
    setQIntlIncoterms('');
    setQIntlMode('');
    setQIntlHbl('');
    setQIntlMbl('');
    setQIntlCurrency('USD');
    setQIntlValue('');
    setQIntlContract('');
    setQIntlSow('');
    setQIntlStage([]);
    setQIntlSubcontractor('');
    setQIntlProof('');
    setQIntlDate('');
    setQIntlFault('');
    setQIntlCauseCategory('');
    setQIntlCauseDetail('');
    setQDomClient('');
    setQDomOrigin('');
    setQDomDestination('');
    setQDomWaybill('');
    setQDomItem('');
    setQDomLossAmount('');
    setQDomFault('');
    setQDomSubcontractor('');
    setQDomCause('');
    setQDomDate('');
    setQDetails('');
    setQFiles([]);
  };

  const handleReportSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    // 1단계나 2단계 입력창에서 엔터 키 입력 시 자동 제출 방지 및 다음 단계 이동
    if (reportStep < 3) {
      if (reportStep === 1) {
        if (!qEmail || !qEmail.toLowerCase().endsWith('@hansol.com')) {
          alert('사내 이메일 주소(@hansol.com)를 입력해 주세요.');
          return;
        }
        if (!qCarriageType) {
          alert('운송 종류를 선택해 주세요.');
          return;
        }
        setReportStep(2);
      } else if (reportStep === 2) {
        setReportStep(3);
      }
      return;
    }
    
    // 이메일 유효성 검사
    if (!qEmail || !qEmail.toLowerCase().endsWith('@hansol.com')) {
      alert('사내 이메일 주소(@hansol.com)를 입력해 주세요.');
      return;
    }

    if (!qCarriageType) {
      alert('운송 종류를 선택해 주세요.');
      return;
    }

    setIsSubmittingReport(true);

    try {
      const driveUrl = '이메일 첨부 접수 예정';

      // 2. 구글 시트에 설문 내용 저장
      const payload = {
        reportId: currentReportId, // 수정 재전송 시 사용
        qEmail,
        qName,
        qSalesDept,
        qOpsDept,
        qCarriageType,
        // 국제 운송
        qIntlShipper,
        qIntlConsignee,
        qIntlIncoterms,
        qIntlMode,
        qIntlHbl,
        qIntlMbl,
        qIntlValue: qCarriageType === 'international' && qIntlValue ? `${qIntlCurrency} ${qIntlValue}` : '',
        qIntlContract,
        qIntlSow,
        qIntlStage: Array.isArray(qIntlStage) ? qIntlStage.join(', ') : qIntlStage,
        qIntlProof,
        qIntlItem,
        qIntlLiner,
        qIntlPartner,
        qIntlPolAtd,
        qIntlPodAta,
        qIntlTotalQty,
        qIntlLossQty,
        qIntlLossValue,
        qIntlLocation,
        // 국내 운송
        qDomClient,
        qDomOrigin,
        qDomDestination,
        qDomWaybill,
        qDomItem,
        qDomLossAmount: qCarriageType === 'domestic' && qDomLossAmount ? `${qDomLossAmount}원` : '',
        // 통합 필드 매핑
        actualSubcontractor: qCarriageType === 'international' ? qIntlSubcontractor : qDomSubcontractor,
        firstCognizanceDate: qCarriageType === 'international' ? qIntlDate : qDomDate,
        faultParty: qCarriageType === 'international' ? qIntlFault : qDomFault,
        causeClassification: qCarriageType === 'international' ? `${qIntlCauseCategory} > ${qIntlCauseDetail}` : qDomCause,
        // 경위 및 증빙
        qDetails,
        driveUrl
      };

      const saveRes = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!saveRes.ok) {
        throw new Error('구글 시트 저장에 실패했습니다.');
      }

      const saveDataResult = await saveRes.json();
      setCurrentReportId(saveDataResult.id); // 받아온 ID 설정 (덮어쓰기용)

      // 4단계(AI 보고서 화면)로 넘어가면서 AI 생성 상태 돌입
      setReportStep(4);
      setIsGeneratingAIReport(true);

      const aiRes = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          id: saveDataResult.id
        }),
      });

      if (!aiRes.ok) {
        throw new Error('AI 보고서 생성에 실패했습니다.');
      }

      const aiData = await aiRes.json();
      setAiReportText(aiData.report);
    } catch (err) {
      console.error(err);
      alert('사고 접수 및 AI 보고서 생성 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSubmittingReport(false);
      setIsGeneratingAIReport(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'init1234') {
      setIsAuthenticated(true);
    } else {
      alert('비밀번호가 일치하지 않습니다.');
    }
  };

  // UI 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dashStartDate, setDashStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dashEndDate, setDashEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeMenu, setActiveMenu] = useState('list');
  const [insActiveTab, setInsActiveTab] = useState('all');
  const [weekOffset, setWeekOffset] = useState(0); // 0=이번주, -1=지난주, ...
  const [weeklyExpandedId, setWeeklyExpandedId] = useState(null); // 확장된 카드 ID
  const [renewalExpanded, setRenewalExpanded] = useState({ urgent: true, prepare: true, safe: false }); // 보험 갱신 아코디언 상태
  const [deferredListRender, setDeferredListRender] = useState(false); // 탭 전환 시 지연 렌더링 제어

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);

  // 사고 데이터
  const [rows, setRows] = useState([]);
  const [checkedRows, setCheckedRows] = useState(new Set());
  const [deleteMode, setDeleteMode] = useState(false);
  const [dirtyRows, setDirtyRows] = useState(new Set()); // 미저장 수정 행
  const [dataVersion, setDataVersion] = useState(0); // uncontrolled input 리셋용

  // 보험 데이터
  const [insRows, setInsRows] = useState([]);
  const [checkedIns, setCheckedIns] = useState(new Set());
  const [insDeleteMode, setInsDeleteMode] = useState(false);

  // 처리경과 모달
  const [progressModal, setProgressModal] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newText, setNewText] = useState('');

  // AI 신규 접수 모달
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiImages, setAiImages] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 대시보드 드릴다운 필터
  const [drillFilter, setDrillFilter] = useState(null); // { type: 'month'|'dept', value: '...' }
  const [drillDetail, setDrillDetail] = useState(null); // 슬라이드 패널에 표시할 사고 행

  // 목록 테이블 정렬
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' }); // key: 컬럼명 | null
  const [insSortConfig, setInsSortConfig] = useState({ key: null, dir: 'asc' });

  // 삭제확인 팝업
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [insDeleteConfirm, setInsDeleteConfirm] = useState(false);

  // 파일 업로드 관련
  const [uploadTarget, setUploadTarget] = useState(null);
  const fileInputRef = useRef(null);

  // 파일 관리 모달
  const [fileManageTarget, setFileManageTarget] = useState(null); // row ID
  const [fileList, setFileList] = useState([]);
  const [fileManageLoading, setFileManageLoading] = useState(false);

  // ── 파일 관리 모달 열기 (Drive 실제 파일 수로 자동 동기화) ──
  const openFileManage = async (rowId) => {
    const row = rows.find(r => r.id === rowId);
    if (!row?.driveUrl) return;
    
    // 폴더명을 서버에서 검색용으로 사용할 수 있도록 생성
    const folderName = `${row.사고번호}_${row.사고명}_${row.부서}_${row.담당자}`;
    
    setFileManageTarget(rowId);
    setFileList([]);
    setFileManageLoading(true);
    try {
      const res = await fetch(`/api/upload?driveUrl=${encodeURIComponent(row.driveUrl)}&folderName=${encodeURIComponent(folderName)}`);
      const data = await res.json();
      const actualFiles = data.files || [];
      setFileList(actualFiles);

      // Drive 실제 파일 수와 저장된 fileCount가 다르면 자동 보정
      // (단, 조회 결과가 0개인 경우는 권한 문제 등으로 인한 오류일 수 있으므로 함부로 0으로 초기화하지 않음)
      if (actualFiles.length > 0 && actualFiles.length !== row.fileCount) {
        const newRows = rows.map(r =>
          r.id === rowId ? { ...r, fileCount: actualFiles.length } : r
        );
        setRows(newRows);
        saveData(newRows, insRows, false);
      }
    } catch (err) {
      alert('파일 목록을 불러오지 못했습니다: ' + err.message);
    } finally {
      setFileManageLoading(false);
    }
  };

  // ── 파일 삭제 (Drive + 상태) ──
  const handleFileDelete = async (fileId) => {
    if (!window.confirm('이 파일을 구글 드라이브에서 삭제하시겠습니까?')) return;
    try {
      const res = await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // 1. 목록에서 제거
      const newFileList = fileList.filter(f => f.id !== fileId);
      setFileList(newFileList);

      // 2. 파일 수 업데이트 및 주소 삭제 판단 (파일이 0개면 주소도 지움)
      const newRows = rows.map(r =>
        r.id === fileManageTarget
          ? { 
              ...r, 
              fileCount: newFileList.length, 
              driveUrl: newFileList.length === 0 ? '' : r.driveUrl 
            }
          : r
      );

      // 3. 상태 업데이트 및 구글 시트 즉시 저장
      setRows(newRows);
      await saveData(newRows, insRows, false);
      
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  // 탭 전환 시 지연 렌더링 (체감 속도 개선)
  useEffect(() => {
    if (activeMenu === 'list') {
      setDeferredListRender(false);
      const timer = setTimeout(() => setDeferredListRender(true), 0);
      return () => clearTimeout(timer);
    } else {
      setDeferredListRender(false);
    }
  }, [activeMenu]);

  // ── 데이터 로드 ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/data');
        const data = await res.json();
        if (data.rows) { setRows(data.rows); setDirtyRows(new Set()); setDataVersion(v => v + 1); }
        if (data.insRows) setInsRows(data.insRows);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── 데이터 저장 ──
  const saveData = async (currentRows = rows, currentInsRows = insRows, showAlert = true) => {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: currentRows, insRows: currentInsRows }),
      });
      if (!res.ok) throw new Error('Save failed');
      setDirtyRows(new Set()); // 저장 완료 시 미저장 표시 초기화
      if (showAlert) alert('구글 스프레드시트에 저장되었습니다.');
    } catch (err) {
      console.error('Save error:', err);
      if (showAlert) alert('저장 중 오류가 발생했습니다.');
    }
  };

  const insFileInputRef = useRef(null);
  const [insUploadTarget, setInsUploadTarget] = useState(null);

  // ── 컬럼 리사이즈 ──
  const INIT_COL_WIDTHS = {
    // 사고 내용
    '사고번호': 110, '사고일': 110, '사고접수일': 110, '가이드제공일': 110, '사업부': 90, '부서': 90, '담당자': 80,
    '실화주': 90, '고객사': 90, '귀책사': 100, '사고명': 120,
    '사고내용': 200, '대표이사 보고사항': 110, '대표이사 보고일': 110, '사고액': 100, '배상액': 100, '회수액': 80,
    '손실액': 90, '완료보고': 80, '완료방법': 120,
    // 보험 접수
    '보험접수': 80, '접수일': 110, '보험사': 90, '접수보험': 90,
    '사건번호': 100, '증권번호': 100, '자기부담금': 100,
    '보험보상여부': 90, '보험보상유형': 90, '보험금': 100,
    // 처리경과 / 첨부파일
    '처리경과': 220, '체크행': 40, '첨부파일': 120,
    // 전사 보험가입 현황 전용
    '구분': 80, '보험명': 150, '성격': 80,
    '보상내용': 240, '계약자': 120, '피보험자': 220,
    '보상한도': 180, '자기부담금': 150,
    'currency': 100, '보험료금액': 140,
    '보험 시작일': 130, '보험 종료일': 130, '상태': 130, '잔여 기간': 100,
    '비고': 300,
    '증권파일': 160,
  };
  const [colWidths, setColWidths] = useState(INIT_COL_WIDTHS);
  const resizeInfo = useRef(null); // { col, startX, startWidth }

  const startResize = useCallback((col, e) => {
    e.preventDefault();
    resizeInfo.current = { col, startX: e.clientX, startWidth: colWidths[col] || 100 };
  }, [colWidths]);

  useEffect(() => {
    const onMove = (e) => {
      if (!resizeInfo.current) return;
      const { col, startX, startWidth } = resizeInfo.current;
      const newW = Math.max(60, startWidth + (e.clientX - startX));
      setColWidths(prev => ({ ...prev, [col]: newW }));
    };
    const onUp = () => { resizeInfo.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // th 내부에 디스플레이할 리사이즈 핸들 만들기
  const ResizeHandle = ({ col }) => (
    <div
      onMouseDown={e => startResize(col, e)}
      style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px',
        cursor: 'col-resize', zIndex: 10,
        background: 'transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.35)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    />
  );

  const thStyle = (col, extra = {}) => ({
    position: 'relative',
    width: colWidths[col] || 90,
    minWidth: colWidths[col] || 60,
    maxWidth: colWidths[col] || 9999,
    overflow: 'hidden',
    userSelect: 'none',
    ...extra,
  });

  // ── 필터 + 정렬 ──
  const filteredRows = useMemo(() => {
    const arr = rows.filter(r => {
      // 미저장 수정 행은 탭 필터를 무시하고 항상 현재 탭에 표시
      if (dirtyRows.has(r.id)) {
        if (startDate && r.사고일 < startDate) return false;
        if (endDate && r.사고일 > endDate) return false;
        return true;
      }
      if (activeTab === 'active' && r.완료보고 === '완료') return false;
      if (activeTab === 'done' && r.완료보고 !== '완료') return false;
      if (startDate && r.사고일 < startDate) return false;
      if (endDate && r.사고일 > endDate) return false;
      return true;
    });
    if (!sortConfig.key) return arr;
    const { key, dir } = sortConfig;
    const mul = dir === 'asc' ? 1 : -1;
    return [...arr].sort((a, b) => {
      const va = a[key] ?? '';
      const vb = b[key] ?? '';
      if (SORT_NUM_COLS.has(key)) return (parseNum(va) - parseNum(vb)) * mul;
      return String(va).localeCompare(String(vb), 'ko') * mul;
    });
  }, [rows, activeTab, startDate, endDate, sortConfig]);

  const filteredInsRows = useMemo(() => {
    let result = insRows.filter(r => {
      if (insActiveTab === 'all') return true;
      const isArchived = (r.상태 === '갱신완료(보관)' || r.상태 === '계약해지(보관)');
      if (insActiveTab === 'active' && isArchived) return false;
      if (insActiveTab === 'done' && !isArchived) return false;
      return true;
    });

    if (insSortConfig.key) {
      result = [...result].sort((a, b) => {
        let v1 = a[insSortConfig.key] || '';
        let v2 = b[insSortConfig.key] || '';
        if (!isNaN(v1.replace?.(/,/g, '')) && !isNaN(v2.replace?.(/,/g, ''))) {
          v1 = Number(String(v1).replace(/[^0-9.-]/g, ''));
          v2 = Number(String(v2).replace(/[^0-9.-]/g, ''));
        }
        if (v1 < v2) return insSortConfig.dir === 'asc' ? -1 : 1;
        if (v1 > v2) return insSortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [insRows, insActiveTab, insSortConfig]);

  // ── 사고 셀 수정 ──
  const updateCell = useCallback((id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        // 금액 관련 필드가 수정되면 손실액 자동 계산 (손실액 = 사고액 - 배상액 - 회수액 - 보험금)
        if (['사고액', '배상액', '회수액', '보험금'].includes(field)) {
          const occur = parseAmount(updated['사고액']);
          const comp = parseAmount(updated['배상액']);
          const recov = parseAmount(updated['회수액']);
          const insPay = parseAmount(updated['보험금']);
          const calcLoss = occur - comp - recov - insPay;
          updated['손실액'] = calcLoss > 0 ? calcLoss.toLocaleString() : '0';
        }
        return updated;
      }
      return r;
    }));
    setDirtyRows(prev => prev.has(id) ? prev : new Set([...prev, id]));
  }, []);

  // ── 사고 신규 행 추가 ──
  const addEmptyRow = () => {
    setRows(prev => {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayPrefix = todayStr.replace(/-/g, ''); // 예: 20260507

      const todaysAccidents = prev.filter(r => r.사고번호 && r.사고번호.startsWith(todayPrefix));
      let nextSeq = 1;
      if (todaysAccidents.length > 0) {
        const seqs = todaysAccidents.map(r => parseInt(r.사고번호.split('-')[1]) || 0);
        nextSeq = Math.max(...seqs) + 1;
      }
      const newAccidentNo = `${todayPrefix}-${nextSeq}`;

      const newRow = { ...emptyRow(), 사고번호: newAccidentNo };
      return [...prev, newRow];
    });
  };

  // ── 방향키 이동 핸들러 ──
  const handleTableKeyDown = (e, tableType) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const target = e.target;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    const rIdx = parseInt(target.getAttribute('data-row'));
    const cIdx = parseInt(target.getAttribute('data-col'));
    if (isNaN(rIdx) || isNaN(cIdx)) return;

    let canMove = false;
    if (target.tagName === 'SELECT' || target.type === 'date') {
      // select나 date는 텍스트 커서가 없으므로 무조건 이동 대상 (단, 상하는 보통 옵션/날짜 선택이므로 좌우만 허용하는 것이 편하지만, 엑셀처럼 쓰려면 상하도 허용)
      canMove = true;
    } else {
      const isAtStart = target.selectionStart === 0;
      const isAtEnd = target.selectionEnd === target.value?.length;
      if (e.key === 'ArrowLeft' && isAtStart) canMove = true;
      if (e.key === 'ArrowRight' && isAtEnd) canMove = true;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') canMove = true;
    }

    if (canMove) {
      let nextR = rIdx;
      let nextC = cIdx;
      if (e.key === 'ArrowUp') nextR -= 1;
      if (e.key === 'ArrowDown') nextR += 1;
      if (e.key === 'ArrowLeft') nextC -= 1;
      if (e.key === 'ArrowRight') nextC += 1;

      const nextEl = document.querySelector(`[data-table="${tableType}"][data-row="${nextR}"][data-col="${nextC}"]`);
      if (nextEl) {
        if (target.tagName !== 'SELECT' || (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault(); // 기본 스크롤 및 커서 이동 방지
        }
        nextEl.focus();
      }
    }
  };

  // ── 사고 삭제 모드 토글 ──
  const toggleDeleteMode = () => {
    setDeleteMode(v => !v);
    setCheckedRows(new Set());
    setDeleteConfirm(false);
  };
  const toggleCheck = id =>
    setCheckedRows(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const confirmDelete = () => {
    setRows(prev => {
      const newRows = prev.filter(r => !checkedRows.has(r.id));
      saveData(newRows, insRows, false); // 최신 행 전달
      return newRows;
    });
    setCheckedRows(new Set());
    setDeleteMode(false);
    setDeleteConfirm(false);
  };

  // ── 보험 셀 수정 ──
  const updateIns = useCallback((id, field, value) =>
    setInsRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r)), []);
  const addEmptyIns = () => setInsRows(prev => {
    const newId = prev.length > 0 ? Math.max(...prev.map(r => Number(r.id) || 0)) + 1 : 1;
    return [...prev, { ...emptyInsRow(), id: newId }];
  });
  const toggleInsDeleteMode = () => {
    setInsDeleteMode(v => !v);
    setCheckedIns(new Set());
    setInsDeleteConfirm(false);
  };
  const toggleInsCheck = id =>
    setCheckedIns(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const confirmInsDelete = () => {
    setInsRows(prev => {
      const newRows = prev.filter(r => !checkedIns.has(r.id));
      saveData(rows, newRows, false);
      return newRows;
    });
    setCheckedIns(new Set());
    setInsDeleteMode(false);
    setInsDeleteConfirm(false);
  };

  // ── 파일 업로드 (실제 구글 드라이브 연동) ──
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!uploadTarget || files.length === 0) return;

    const targetId = uploadTarget; // 비동기 중 closure 안전하게 캡처
    setIsLoading(true);

    const row = rows.find(r => r.id === targetId);
    if (!row) { setIsLoading(false); return; }

    // 요청하신 규칙: 사고번호_사고명_부서_담당자
    const folderName = `${row.사고번호 || '미채번'}_${row.사고명 || '사고명없음'}_${row.부서 || '부서미상'}_${row.담당자 || '담당자미상'}`;
    
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('folderName', folderName);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `서버 오류 (${res.status})`);
      }

      // 1. 업로드된 폴더 링크 확보
      const newDriveUrl = data.driveUrl || row.driveUrl;

      // 2. Drive에서 실제 파일 수 조회해서 정확하게 반영
      const uploadedCount = files.length;
      let actualCount = (row.fileCount || 0) + uploadedCount;
      try {
        if (newDriveUrl) {
          const listRes = await fetch(`/api/upload?driveUrl=${encodeURIComponent(newDriveUrl)}`);
          const listData = await listRes.json();
          // 조회 결과가 0이라도 방금 올린 파일 수(uploadedCount)보다 작으면 무시하거나 합산 보정
          if (listData.files && listData.files.length > 0) {
            actualCount = listData.files.length;
          } else if (row.fileCount === 0) {
            // 처음 업로드하는 경우 최소한 방금 올린 개수만큼은 표시
            actualCount = uploadedCount;
          }
        }
      } catch (e) {
        console.warn('파일 수 조회 실패, 증분값 사용:', e);
      }

      // 3. 상태 업데이트 및 시트 저장
      const newRows = rows.map(r =>
        r.id === targetId
          ? { ...r, fileCount: actualCount, driveUrl: newDriveUrl }
          : r
      );
      
      setRows(newRows);
      // 즉시 구글 시트에 저장하여 새로고침 후에도 유지되도록 함
      await saveData(newRows, insRows, false);
      
      alert(`업로드 완료: ${files.length}개의 파일이 저장되었습니다.\n(총 ${actualCount}개)`);
    } catch (err) {
      console.error('Upload error:', err);
      alert('업로드 실패: ' + err.message);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadTarget(null);
    }
  };

  // ── 보험증권 파일 업로드 ──
  const handleInsFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!insUploadTarget || files.length === 0) return;

    setIsLoading(true);

    const row = insRows.find(r => r.id === insUploadTarget);
    const startStr = (row['보험 시작일'] || '').replace(/-/g, '');
    const endStr = (row['보험 종료일'] || '').replace(/-/g, '');

    // 앱스 스크립트에서 이중 폴더로 생성할 수 있도록 슬래시(/)로 경로 지정
    const folderName = `보험증권/${row.보험명 || '미상'}_${startStr}_${endStr}`;

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('folderName', folderName);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        const firstFileUrl = data.files[0]?.url;
        const newInsRows = insRows.map(r =>
          r.id === insUploadTarget
            ? { ...r, driveUrl: firstFileUrl || r.driveUrl }
            : r
        );
        setInsRows(newInsRows);
        saveData(rows, newInsRows, false);
        alert('보험증권 파일이 구글 드라이브에 업로드되었습니다.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      if (insFileInputRef.current) insFileInputRef.current.value = '';
      setInsUploadTarget(null);
    }
  };

  // ── AI 자동 접수 처리 ──
  const handleAiPaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result.split(',')[1];
          setAiImages(prev => [...prev, {
            base64: base64Data,
            mimeType: file.type,
            preview: event.target.result
          }]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeAiImage = (idx) => {
    setAiImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAiSubmit = async () => {
    if (!aiText.trim() && aiImages.length === 0) return alert('텍스트나 이미지를 붙여넣어 주세요.');

    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText, images: aiImages })
      });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.error || 'AI 분석 실패');

      const parsed = data.data;

      setRows(prev => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayPrefix = todayStr.replace(/-/g, '');

        const todaysAccidents = prev.filter(r => r.사고번호 && r.사고번호.startsWith(todayPrefix));
        let nextSeq = 1;
        if (todaysAccidents.length > 0) {
          const seqs = todaysAccidents.map(r => parseInt(r.사고번호.split('-')[1]) || 0);
          nextSeq = Math.max(...seqs) + 1;
        }
        const newAccidentNo = `${todayPrefix}-${nextSeq}`;

        const newId = prev.length > 0 ? Math.max(...prev.map(r => r.id)) + 1 : 1;
        const newRow = {
          ...emptyRow(),
          id: newId,
          사고번호: newAccidentNo,
          사고일: parsed.사고일 || todayStr,
          '사고접수일': todayStr,
          '가이드제공일': '',
          '대표이사 보고사항': '',
          '대표이사 보고일': '',
          사업부: parsed.사업부 || '',
          부서: parsed.부서 || '',
          담당자: parsed.담당자 || '',
          실화주: parsed.실화주 || '',
          고객사: parsed.고객사 || '',
          귀책사: parsed.귀책사 || '',
          사고명: parsed.사고명 || 'AI 자동 추출 건',
          사고내용: parsed.사고내용 || '',
          사고액: parsed.사고액 || '',
          배상액: parsed.배상액 || ''
        };

        const newRows = [newRow, ...prev];
        saveData(newRows, insRows, false); // 조용히 자동 저장
        return newRows;
      });

      alert('AI가 성공적으로 사고를 추출하여 자동 접수했습니다!');
      setAiModalOpen(false);
      setAiText('');
      setAiImages([]);
    } catch (err) {
      console.error(err);
      alert('AI 분석 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  // ── 처리경과 ──
  const openProgress = rowId => { setProgressModal(rowId); setNewDate(new Date().toISOString().slice(0, 10)); setNewText(''); };
  const addProgressEntry = () => {
    if (!newDate || !newText.trim()) return;
    const updatedRows = rows.map(r =>
      r.id === progressModal
        ? { ...r, 진행경과: [...r.진행경과, { date: newDate, text: newText.trim() }] }
        : r
    );
    setRows(updatedRows);
    setDirtyRows(prev => new Set([...prev, progressModal]));
    setNewText('');
  };
  const deleteProgressEntry = (index) => {
    if (!window.confirm('이 진행사항을 삭제하시겠습니까?')) return;
    const updatedRows = rows.map(r =>
      r.id === progressModal
        ? { ...r, 진행경과: r.진행경과.filter((_, i) => i !== index) }
        : r
    );
    setRows(updatedRows);
    setDirtyRows(prev => new Set([...prev, progressModal]));
  };
  const modalRow = rows.find(r => r.id === progressModal);

  const COLS_ACCIDENT = [
    '사고번호', '사고일', '사고접수일', '가이드제공일',
    '사업부', '부서', '담당자', '실화주', '고객사', '귀책사', '사고명', '사고내용',
    '대표이사 보고사항', '대표이사 보고일',
    '사고금액(텍스트)', '사고액', '배상액', '회수액', '자기부담금', '손실액'
  ];
  const COLS_INSURANCE = ['보험접수', '접수일', '보험사', '접수보험', '사건번호', '증권번호', '자기부담금', '보험보상여부', '보험보상유형', '보험금'];
  const DATE_FIELDS = new Set(['사고일', '사고접수일', '가이드제공일', '대표이사 보고일', '접수일', '보험 시작일', '보험 종료일', '완료보고일']);
  const LONG_TEXT = new Set(['사고내용', '보상내용', '비고', '사고명', '피보험자', '사고금액(텍스트)', '처리경과', '완료방법']);
  const NUM_FIELDS = new Set(['사고액', '배상액', '회수액', '손실액', '보험금', '자기부담금']);
  const INS_COLS = [
    { key: '구분', w: 80 }, { key: '보험명', w: 150 }, { key: '성격', w: 80 },
    { key: '보상내용', w: 240 }, { key: '계약자', w: 120 }, { key: '피보험자', w: 220 },
    { key: '보상한도', w: 180 }, { key: '자기부담금', w: 150 }, { key: '보험사', w: 120 },
    { key: 'currency', w: 100 }, { key: '보험료금액', w: 140 },
    { key: '보험 시작일', w: 130 }, { key: '보험 종료일', w: 130 }, { key: '상태', w: 130 }, { key: '잔여 기간', w: 100 },
    { key: '비고', w: 300 },
  ];

  // ── 대시보드 통계 집계 로직 ──
  const parseAmount = (val) => {
    if (!val) return 0;
    const num = Number(String(val).replace(/[^0-9-]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const dashboardStats = useMemo(() => {
    // 선택된 기간 내의 사고만 필터링
    const targetRows = rows.filter(r => {
      if (!r.사고일) return false;
      if (dashStartDate && r.사고일 < dashStartDate) return false;
      if (dashEndDate && r.사고일 > dashEndDate) return false;
      if (!r.사고명 || r.사고명.trim() === '') return false;
      return true;
    });

    const totalCount = targetRows.length;
    let totalOccur = 0;
    let totalRecov = 0;
    let totalLoss = 0;

    const deptCount = {};
    const monthlyData = {};

    // 차트 범위를 위한 월 목록 생성 (선택된 기간의 모든 월)
    const parseDateSafe = (str) => {
      if (!str) return new Date();
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d || 1);
    };

    const start = parseDateSafe(dashStartDate);
    const end = parseDateSafe(dashEndDate);
    let curr = new Date(start.getFullYear(), start.getMonth(), 1);
    while (curr <= end) {
      const label = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[label] = { occur: 0, loss: 0, count: 0 };
      curr.setMonth(curr.getMonth() + 1);
    }

    targetRows.forEach(r => {
      const occur = parseAmount(r.사고액);
      const recov = parseAmount(r.배상액) + parseAmount(r.회수액);
      const loss = parseAmount(r.손실액);

      totalOccur += occur;
      totalRecov += recov;
      totalLoss += loss;

      const dept = r.부서 || r.사업부 || '소속 미상';
      deptCount[dept] = (deptCount[dept] || 0) + 1;

      const [y, m] = r.사고일.split('-').map(Number);
      const label = `${y}-${String(m).padStart(2, '0')}`;
      if (monthlyData[label]) {
        monthlyData[label].occur += occur;
        monthlyData[label].loss += loss;
        monthlyData[label].count += 1;
      }
    });

    const sortedDepts = Object.entries(deptCount).sort((a, b) => b[1] - a[1]);
    const topDepts = sortedDepts.map(d => ({
      name: d[0],
      count: d[1],
      percent: totalCount > 0 ? Math.round((d[1] / totalCount) * 100) : 0
    }));

    const monthsArray = Object.keys(monthlyData).sort().map(m => ({
      month: m.split('-')[1] + '월',
      year: m.split('-')[0],
      occur: monthlyData[m].occur,
      loss: monthlyData[m].loss,
      count: monthlyData[m].count
    }));

    let maxVal = 0;
    monthsArray.forEach(m => {
      if (m.occur > maxVal) maxVal = m.occur;
      if (m.loss > maxVal) maxVal = m.loss;
    });

    const chartData = monthsArray.map(m => ({
      month: m.month,
      year: m.year,
      occurPct: maxVal > 0 ? (m.occur / maxVal) * 100 : 0,
      lossPct: maxVal > 0 ? (m.loss / maxVal) * 100 : 0,
      occurRaw: m.occur,
      lossRaw: m.loss,
      count: m.count
    }));

    return {
      totalCount,
      totalOccur,
      totalRecov,
      totalLoss,
      topDepts,
      chartData,
      chartMaxVal: maxVal
    };
  }, [rows, dashStartDate, dashEndDate]);

  // ── 드릴다운 데이터 계산 ──
  const drillRows = useMemo(() => {
    if (!drillFilter) return [];
    return rows.filter(r => {
      if (!r.사고일) return false;
      if (dashStartDate && r.사고일 < dashStartDate) return false;
      if (dashEndDate && r.사고일 > dashEndDate) return false;
      if (!r.사고명 || r.사고명.trim() === '') return false;
      if (drillFilter.type === 'month') {
        const d = new Date(r.사고일);
        const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return label === drillFilter.value;
      }
      if (drillFilter.type === 'dept') {
        const dept = r.부서 || r.사업부 || '소속 미상';
        return dept === drillFilter.value;
      }
      return false;
    });
  }, [rows, drillFilter, dashStartDate, dashEndDate]);

  const toggleDrill = (type, value) => {
    setDrillFilter(prev => {
      if (prev && prev.type === type && prev.value === value) return null;
      return { type, value };
    });
  };

  const handleSort = (key) => {
    setSortConfig(prev =>
      prev.key === key
        ? prev.dir === 'asc' ? { key, dir: 'desc' } : { key: null, dir: 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const handleInsSort = (key) => {
    setInsSortConfig(prev =>
      prev.key === key
        ? prev.dir === 'asc' ? { key, dir: 'desc' } : { key: null, dir: 'asc' }
        : { key, dir: 'asc' }
    );
  };

  // 날짜 객체를 YYYY-MM-DD 문자열로 변환 (시차 무시)
  const toLocalDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 기간 설정 헬퍼 함수
  const setRangePreset = (type) => {
    const today = new Date();
    let start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let end = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    switch (type) {
      case '1Y':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case '6M':
        // 당월 포함 6개월 (5개월 전 1일부터 오늘까지)
        start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        break;
      case 'Q1': 
        start = new Date(today.getFullYear(), 0, 1); 
        end = new Date(today.getFullYear(), 2, 31); 
        break;
      case 'Q2': 
        start = new Date(today.getFullYear(), 3, 1); 
        end = new Date(today.getFullYear(), 5, 30); 
        break;
      case 'Q3': 
        start = new Date(today.getFullYear(), 6, 1); 
        end = new Date(today.getFullYear(), 8, 30); 
        break;
      case 'Q4': 
        start = new Date(today.getFullYear(), 9, 1); 
        end = new Date(today.getFullYear(), 11, 31); 
        break;
      case 'H1': 
        start = new Date(today.getFullYear(), 0, 1); 
        end = new Date(today.getFullYear(), 5, 30); 
        break;
      case 'H2': 
        start = new Date(today.getFullYear(), 6, 1); 
        end = new Date(today.getFullYear(), 11, 31); 
        break;
      case 'THIS_YEAR':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
    }
    setDashStartDate(toLocalDateStr(start));
    setDashEndDate(toLocalDateStr(end));
  };

  // ── 주간 리포트 로직 ──
  const weeklyData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    // 선택된 주차의 월요일 계산
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    // 선택된 주차의 일요일 계산
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const ws = toLocalDateStr(weekStart);
    const we = toLocalDateStr(weekEnd);
    const todayStr = toLocalDateStr(today);

    const newThisWeek = rows.filter(r => r.사고접수일 >= ws && r.사고접수일 <= we && r.사고명 && r.사고명.trim() !== '');
    const inProgress = rows.filter(r => r.완료보고 !== '완료' && r.사고명 && r.사고명.trim() !== '');
    const completedThisWeek = rows.filter(r => {
      if (r.완료보고 !== '완료') return false;
      // 완료보고일 기준으로 필터링하되 없으면 마지막 진행경과 날짜로 대체
      const completeDate = r.완료보고일 || (r.진행경과 && r.진행경과.length > 0 ? r.진행경과[r.진행경과.length - 1].date : null);
      if (!completeDate) return false;
      return completeDate >= ws && completeDate <= we;
    });

    // 경고 레벨 계산
    const getAlertLevel = (r) => {
      const prog = r.진행경과 || [];
      const accidentDate = new Date(r.사고일 + 'T00:00:00');
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const daysSince = Math.floor((now - accidentDate) / 86400000);
      const hasAmount = parseAmount(r.사고액) > 0;
      if (daysSince >= 30) return { level: 'danger', label: '장기 미처리', days: daysSince, color: '#ef4444' };
      if (r.보험접수 === 'N' && hasAmount) return { level: 'warning', label: '보험 미접수', days: daysSince, color: '#f59e0b' };
      if (daysSince <= 7) return { level: 'ok', label: '정상 진행', days: daysSince, color: '#10b981' };
      return { level: 'normal', label: '진행중', days: daysSince, color: '#64748b' };
    };

    const alertRows = inProgress.map(r => ({ ...r, alert: getAlertLevel(r) }))
      .sort((a, b) => {
        const order = { danger: 0, warning: 1, normal: 2, ok: 3 };
        return (order[a.alert.level] ?? 9) - (order[b.alert.level] ?? 9) || b.alert.days - a.alert.days;
      });

    const needsAttention = alertRows.filter(r => r.alert.level === 'danger' || r.alert.level === 'warning');

    // 보험 갱신 관리
    const insuranceRenewals = insRows
      .filter(r => r.상태 !== '갱신완료(보관)' && r.상태 !== '계약해지(보관)')
      .map(r => {
        const endDate = new Date(r['보험 종료일']);
        const daysLeft = Math.ceil((endDate - today) / 86400000);
        let renewLevel = 'safe';
        let renewColor = '#10b981';
        if (daysLeft < 0) { renewLevel = 'expired'; renewColor = '#6b7280'; }
        else if (daysLeft <= 30) { renewLevel = 'urgent'; renewColor = '#ef4444'; }
        else if (daysLeft <= 90) { renewLevel = 'prepare'; renewColor = '#f59e0b'; }
        return { ...r, daysLeft, renewLevel, renewColor };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const renewalCount = insuranceRenewals.filter(r => r.daysLeft <= 90 && r.daysLeft >= 0).length;

    // 주차 표시 텍스트 (ISO 8601 기준 목요일 기준 계산)
    const thursday = new Date(weekStart);
    thursday.setDate(weekStart.getDate() + 3);
    
    const displayYear = thursday.getFullYear();
    const displayMonth = thursday.getMonth() + 1;
    
    const firstDayOfMonth = new Date(displayYear, displayMonth - 1, 1);
    const firstThursdayOffset = (11 - firstDayOfMonth.getDay()) % 7;
    const firstThursday = new Date(displayYear, displayMonth - 1, 1 + firstThursdayOffset);
    
    const weekNum = Math.ceil(((thursday - firstThursday) / 86400000) / 7) + 1;
    const weekLabel = `${displayYear}년 ${displayMonth}월 ${weekNum}주차 (${String(weekStart.getMonth() + 1).padStart(2, '0')}.${String(weekStart.getDate()).padStart(2, '0')} ~ ${String(weekEnd.getMonth() + 1).padStart(2, '0')}.${String(weekEnd.getDate()).padStart(2, '0')})`;

    return { weekLabel, ws, we, newThisWeek, inProgress, completedThisWeek, alertRows, needsAttention, insuranceRenewals, renewalCount };
  }, [rows, insRows, weekOffset]);

  /* ================================================================ */
  const sortMark = (key) => SORT_SKIP_COLS.has(key) ? null : (
    <span style={{ marginLeft: '3px', fontSize: '0.58rem', verticalAlign: 'middle', color: sortConfig.key === key ? 'var(--primary)' : '#d1d5db' }}>
      {sortConfig.key === key ? (sortConfig.dir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  const insSortMark = (key) => (
    <span style={{ marginLeft: '3px', fontSize: '0.58rem', verticalAlign: 'middle', color: insSortConfig.key === key ? 'white' : 'rgba(255,255,255,0.5)' }}>
      {insSortConfig.key === key ? (insSortConfig.dir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  if (!isAuthenticated) {
    if (authViewMode === 'report') {
      const renderStepIndicator = () => {
        const progressPercent = ((reportStep - 1) / 3) * 80;
        return (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', position: 'relative', width: '100%' }}>
            <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '2px', background: '#e2e8f0', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: '15px', left: '10%', width: `${progressPercent}%`, height: '2px', background: 'var(--primary)', zIndex: 2, transition: 'width 0.3s ease' }} />
            
            {[1, 2, 3, 4].map((step) => {
              const stepNames = ['기본정보 입력', '상세 정보 입력', '경위 및 증빙', 'AI 보고서 초안'];
              const isActive = reportStep >= step;
              const isCurrent = reportStep === step;
              return (
                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, flex: 1 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isCurrent ? 'var(--primary)' : isActive ? 'var(--primary)' : '#e2e8f0',
                    color: isActive ? 'white' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: isCurrent ? '4px solid #eff6ff' : 'none',
                    transition: 'all 0.3s'
                  }}>
                    {step}
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text)' : 'var(--text-muted)', marginTop: '8px' }}>
                    {stepNames[step - 1]}
                  </span>
                </div>
              );
            })}
          </div>
        );
      };

      const renderStepContent = () => {
        switch (reportStep) {
          case 1:
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text)', borderBottom: '2px solid var(--border)', paddingBottom: '6px' }}>Q0. 작성자 및 담당 부서 정보</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>사내 이메일 주소 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        type="email"
                        value={qEmail}
                        onChange={(e) => setQEmail(e.target.value)}
                        placeholder="example@hansol.com"
                        style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>작성자 이름 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        type="text"
                        value={qName}
                        onChange={(e) => setQName(e.target.value)}
                        placeholder="홍길동"
                        style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>담당영업팀 / 영업사원 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        type="text"
                        value={qSalesDept}
                        onChange={(e) => setQSalesDept(e.target.value)}
                        placeholder="예: SALES1 / 김동하 책임"
                        style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>담당운영팀 / 운영사원 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        type="text"
                        value={qOpsDept}
                        onChange={(e) => setQOpsDept(e.target.value)}
                        placeholder="예: 운영1파트 / 김현정 책임"
                        style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px', fontSize: '0.78rem' }}>AI가 완성한 최종 보고서가 전송될 본인의 사내 웹메일 주소와 관련 부서 담당 정보를 정확히 입력해 주세요.</small>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>Q1. 운송 종류 선택 <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div
                      onClick={() => setQCarriageType('international')}
                      style={{
                        padding: '24px 16px',
                        borderRadius: '12px',
                        border: qCarriageType === 'international' ? '2.5px solid var(--primary)' : '1.5px solid var(--border)',
                        background: qCarriageType === 'international' ? '#eff6ff' : 'white',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '2rem' }}>🚢</span>
                      <strong style={{ fontSize: '0.95rem', color: qCarriageType === 'international' ? 'var(--primary)' : 'var(--text)' }}>국제 운송</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>해상/항공 수출입</span>
                    </div>
                    <div
                      onClick={() => setQCarriageType('domestic')}
                      style={{
                        padding: '24px 16px',
                        borderRadius: '12px',
                        border: qCarriageType === 'domestic' ? '2.5px solid var(--primary)' : '1.5px solid var(--border)',
                        background: qCarriageType === 'domestic' ? '#eff6ff' : 'white',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '2rem' }}>🚛</span>
                      <strong style={{ fontSize: '0.95rem', color: qCarriageType === 'domestic' ? 'var(--primary)' : 'var(--text)' }}>국내 내륙 운송</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>내륙 수송 및 배차</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          case 2:
            if (qCarriageType === 'international') {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '62vh', overflowY: 'auto', paddingRight: '6px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-1. Shipper 명 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qIntlShipper} onChange={(e) => setQIntlShipper(e.target.value)} style={inputStyle} placeholder="송하인/수출자" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-2. Consignee 명 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qIntlConsignee} onChange={(e) => setQIntlConsignee(e.target.value)} style={inputStyle} placeholder="수하인/수입자" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-3. 인코텀즈 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select value={qIntlIncoterms} onChange={(e) => setQIntlIncoterms(e.target.value)} style={selectStyle}>
                        <option value="">선택</option>
                        {['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP', '기타'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-4. 세부 운송 모드 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select value={qIntlMode} onChange={(e) => setQIntlMode(e.target.value)} style={selectStyle}>
                        <option value="">선택</option>
                        {['FCL 해상수출', 'LCL 해상수출', '항공수출', '해상수입', '항공수입'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-5. House B/L 번호 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qIntlHbl} onChange={(e) => setQIntlHbl(e.target.value)} style={inputStyle} placeholder="HBL 번호" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-6. Master B/L 번호</label>
                      <input type="text" value={qIntlMbl} onChange={(e) => setQIntlMbl(e.target.value)} style={inputStyle} placeholder="MBL 번호 (선택)" />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-7. 총 화물 가액 <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select value={qIntlCurrency} onChange={(e) => setQIntlCurrency(e.target.value)} style={{ ...selectStyle, width: '100px' }}>
                        <option value="USD">USD</option>
                        <option value="KRW">KRW</option>
                        <option value="EUR">EUR</option>
                        <option value="JPY">JPY</option>
                      </select>
                      <input type="text" value={qIntlValue} onChange={(e) => setQIntlValue(e.target.value.replace(/[^0-9,]/g, ''))} style={{ ...inputStyle, flex: 1 }} placeholder="숫자만 입력 (예: 50,000)" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-8. 당사 법적 계약 관계 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select value={qIntlContract} onChange={(e) => setQIntlContract(e.target.value)} style={selectStyle}>
                        <option value="">선택</option>
                        {['한솔 본사 계약', '해외법인 계약', '별도 계약서 없음'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-9. 당사 운송 주선 범위 (SOW) <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select value={qIntlSow} onChange={(e) => setQIntlSow(e.target.value)} style={selectStyle}>
                        <option value="">선택</option>
                        {['Door to Door', 'Door to Port', 'Port to Port', 'Port to Door'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-10. 사고 발생/추정 구간 (중복 선택 가능) <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'white' }}>
                        {['출발지 내륙', '출발지 터미널', '메인 국제운송', '도착지 터미널', '도착지 내륙', '모름'].map(opt => {
                          const isChecked = qIntlStage.includes(opt);
                          return (
                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: isChecked ? 700 : 500, color: isChecked ? 'var(--primary)' : 'var(--text)' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleStageCheckboxChange(opt)}
                                style={{ width: '13px', height: '13px', cursor: 'pointer' }}
                              />
                              {opt}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-11. 수행 주체 (하청업체명) <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qIntlSubcontractor} onChange={(e) => setQIntlSubcontractor(e.target.value)} style={inputStyle} placeholder="예: ○○○선사, 심천 트레일러사" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-12. 화물 인도 당시 증빙 상태 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select value={qIntlProof} onChange={(e) => setQIntlProof(e.target.value)} style={selectStyle}>
                        <option value="">선택</option>
                        {['Clean Receipt', 'Claused Receipt (인수증 리마크 기재 확보)'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-13. 사고 최초 인지 일시 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="datetime-local" value={qIntlDate} onChange={(e) => setQIntlDate(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-14. 1차 과실 책임 주체 (현장 판단) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select value={qIntlFault} onChange={(e) => setQIntlFault(e.target.value)} style={selectStyle}>
                      <option value="">선택</option>
                      {['하청 운송사·선사·항공사 과실', '화주·수출자 과실', '당사 자체 과실', '원인 불명'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-15. 사고 원인 대분류 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select value={qIntlCauseCategory} onChange={(e) => { setQIntlCauseCategory(e.target.value); setQIntlCauseDetail(''); }} style={selectStyle}>
                        <option value="">선택</option>
                        {['장비결함', '운송하역 파손', '포장불량', '환경요인'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-15 세부 중분류 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select value={qIntlCauseDetail} onChange={(e) => setQIntlCauseDetail(e.target.value)} style={selectStyle} disabled={!qIntlCauseCategory}>
                        <option value="">선택</option>
                        {qIntlCauseCategory && causeDetailsMap[qIntlCauseCategory].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-16. 화물 품목 (아이템) <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qIntlItem} onChange={(e) => setQIntlItem(e.target.value)} style={inputStyle} placeholder="예: ACRYLIC SOLID SURFACE (바닥재)" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-17. 선사/항공사 명 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qIntlLiner} onChange={(e) => setQIntlLiner(e.target.value)} style={inputStyle} placeholder="예: 쉽코(LCL), 머스크" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-18. 해외 파트너/법인 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qIntlPartner} onChange={(e) => setQIntlPartner(e.target.value)} style={inputStyle} placeholder="예: 한솔 미주법인, 해외 대리점" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-24. 구체적 사고 발생 장소 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qIntlLocation} onChange={(e) => setQIntlLocation(e.target.value)} style={inputStyle} placeholder="예: LX HAUSYS USA 공장" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-19. 출발지 및 출발일 (POL/ATD) <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qIntlPolAtd} onChange={(e) => setQIntlPolAtd(e.target.value)} style={inputStyle} placeholder="예: 6/1 BUSAN" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-20. 도착지 및 도착일 (POD/ATA) <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qIntlPodAta} onChange={(e) => setQIntlPodAta(e.target.value)} style={inputStyle} placeholder="예: 6/24 PLACENTIA, CA" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-21. 총 선적 물량 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qIntlTotalQty} onChange={(e) => setQIntlTotalQty(e.target.value)} style={inputStyle} placeholder="예: 2 PACKAGE" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-22. 파손 물량 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qIntlLossQty} onChange={(e) => setQIntlLossQty(e.target.value)} style={inputStyle} placeholder="예: 2 PLT (또는 확인중)" />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>A-23. 파손건 CI Value <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" value={qIntlLossValue} onChange={(e) => setQIntlLossValue(e.target.value)} style={inputStyle} placeholder="예: USD 8,995.20 (또는 확인중)" />
                  </div>
                </div>
              );
            } else {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '62vh', overflowY: 'auto', paddingRight: '6px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>B-1. 거래처 (화주) 명 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qDomClient} onChange={(e) => setQDomClient(e.target.value)} style={inputStyle} placeholder="예: 한솔유통" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>B-4. 운송장 또는 배차 번호 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qDomWaybill} onChange={(e) => setQDomWaybill(e.target.value)} style={inputStyle} placeholder="번호 입력" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>B-2. 상차지 (출발지) <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qDomOrigin} onChange={(e) => setQDomOrigin(e.target.value)} style={inputStyle} placeholder="예: 이천1센터" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>B-3. 하차지 (도착지) <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qDomDestination} onChange={(e) => setQDomDestination(e.target.value)} style={inputStyle} placeholder="예: 파주2디포" />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>B-5. 화물 품목 및 피해 물량 <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" value={qDomItem} onChange={(e) => setQDomItem(e.target.value)} style={inputStyle} placeholder="예: 전자부품 3 Pallet" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>B-6. 실제 발생 손해액 (원) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" value={qDomLossAmount} onChange={(e) => setQDomLossAmount(e.target.value.replace(/[^0-9,]/g, ''))} style={inputStyle} placeholder="숫자만 입력 (원)" />
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px', fontSize: '0.75rem', lineHeight: 1.4 }}>
                      ※ 국내 내륙운송은 국제 운송과 달리 SDR 책임 한도가 없으며, 실제 발생한 실손해액만큼만 보상하는 실손해 보상 원칙을 따릅니다. 원가 기준 예상 피해액을 기입해 주세요.
                    </small>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>B-7. 과실 책임 주체 (현장 판단) <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select value={qDomFault} onChange={(e) => setQDomFault(e.target.value)} style={selectStyle}>
                        <option value="">선택</option>
                        {['당사 지정 위탁 운송사(지입차주) 과실', '화주측 적재 부실', '당사 자체 과실', '원인 불명'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>B-8. 실제 운송 수행 업체/차주명 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={qDomSubcontractor} onChange={(e) => setQDomSubcontractor(e.target.value)} style={inputStyle} placeholder="업체 또는 성함" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>B-9. 사고 원인 분류 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select value={qDomCause} onChange={(e) => setQDomCause(e.target.value)} style={selectStyle}>
                        <option value="">선택</option>
                        {['차량 전도·충돌', '상하역 중 지게차 충격', '결로로 인한 곰팡이', '우천 침수(Wet)', '적재 고정 부실'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>B-10. 사고 최초 인지 일시 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="datetime-local" value={qDomDate} onChange={(e) => setQDomDate(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                </div>
              );
            }
          case 3:
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '8px', fontSize: '0.78rem', lineHeight: 1.45 }}>
                    <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>💡 현장 필수 작성 가이드 (육하원칙)</strong>
                    <strong>누가(Who)</strong>: 사고 유발 주체 (예: 도착지 물류사 Guchang)<br/>
                    <strong>언제(When)</strong>: 사고 발생 또는 최초 데미지 인지 시점<br/>
                    <strong>어디서(Where)</strong>: 구체적 장소 (예: 하이퐁 터미널 보관 야드)<br/>
                    <strong>무엇을(What)</strong>: 파손된 구체적 화물 및 패키지 상태 (예: 1 Pallet 젖음)<br/>
                    <strong>어떻게/왜(How/Why)</strong>: 컨테이너 반출 당시 상단 5cm 구멍 타공 발견 등
                  </div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Q19. 상세 사고 경위 <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <textarea
                    value={qDetails}
                    onChange={(e) => setQDetails(e.target.value)}
                    placeholder="가이드에 맞게 상세한 경위를 기술해 주세요."
                    style={{ width: '100%', height: '140px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.92rem', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
                <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '10px', border: '1px dashed #bbf7d0', marginTop: '12px' }}>
                  <strong style={{ color: '#166534', display: 'block', marginBottom: '6px', fontSize: '0.88rem' }}>📎 Q20. 현장 사진 및 증빙 자료 안내</strong>
                  <p style={{ fontSize: '0.8rem', color: '#1e3a1e', lineHeight: 1.5, margin: 0 }}>
                    용량 제한 및 안정적인 접수를 위해 파일 업로드 기능이 제외되었습니다. <br />
                    <strong>현장 실물 파손 사진 및 관련 서류(PDF 등)는 본 접수를 최종 제출하신 후, 본인 이메일로 수신되는 보고서 메일에 답장(회신)으로 직접 첨부하여 발송해 주시기 바랍니다.</strong>
                  </p>
                </div>
              </div>
            );
          case 4:
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                {isGeneratingAIReport ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      border: '4px solid #e2e8f0',
                      borderTopColor: 'var(--primary)',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.05rem' }}>Gemini가 전문 사고보고서 초안을 작성하고 있습니다...</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>구글 시트에 사고접수 저장을 완료하고 AI 보고서를 생성하는 중입니다.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--success)' }}>
                        ✓ 구글 시트 저장 및 AI 보고서 초안 작성이 완료되었습니다. (접수 ID: {currentReportId})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(aiReportText);
                          alert('보고서 내용이 클립보드에 복사되었습니다.');
                        }}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        📋 보고서 전체 복사
                      </button>
                    </div>

                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '24px',
                      background: '#f8fafc',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      maxHeight: '38vh',
                      fontFamily: 'inherit',
                      fontSize: '0.92rem',
                      lineHeight: 1.6,
                      color: '#1e293b',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {aiReportText || '보고서 생성 결과를 불러오는 데 실패했습니다. 다시 시도해 주세요.'}
                    </div>

                    <div style={{ background: '#eff6ff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                      <p style={{ fontSize: '0.82rem', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
                        💡 <strong>입력한 내용에 오타나 오류가 있으신가요?</strong> <br />
                        하단의 <strong>[수정하고 다시 쓰기]</strong> 버튼을 누르면 이전 단계로 돌아가 입력값을 수정한 후 재제출하실 수 있습니다. 재제출 시 구글 시트의 기존 행 데이터는 새로운 행을 만들지 않고 자동으로 업데이트됩니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          default:
            return null;
        }
      };

      const handleNext = () => {
        if (reportStep === 1) {
          if (!qEmail || !qEmail.toLowerCase().endsWith('@hansol.com')) {
            alert('사내 이메일 주소(@hansol.com)를 입력해 주세요.');
            return;
          }
          if (!qCarriageType) {
            alert('운송 종류를 선택해 주세요.');
            return;
          }
          setReportStep(2);
        } else if (reportStep === 2) {
          setReportStep(3);
        }
      };

      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh', background: '#f8fafc', padding: '20px' }}>
          <div className="panel" style={{ width: '920px', maxWidth: '98vw', minHeight: '680px', maxHeight: '94vh', background: 'white', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>📋 통합 사고접수 신청서</h2>
              <button
                type="button"
                onClick={() => {
                  resetQuestionnaire();
                  setAuthViewMode('select');
                }}
                className="btn btn-ghost"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                disabled={isSubmittingReport}
              >
                닫기
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '28px', flex: 1 }}>
              {renderStepIndicator()}
              <div>
                {renderStepContent()}
                
                {/* Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  {reportStep === 4 ? (
                    <button
                      type="button"
                      onClick={() => setReportStep(3)} // Step 3로 복귀하여 수정
                      className="btn btn-ghost"
                      style={{ padding: '12px 24px', fontWeight: 700, color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '8px' }}
                      disabled={isGeneratingAIReport}
                    >
                      ↩ 수정하고 다시 쓰기
                    </button>
                  ) : reportStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setReportStep(reportStep - 1)}
                      className="btn btn-ghost"
                      style={{ padding: '12px 24px', fontWeight: 700 }}
                      disabled={isSubmittingReport}
                    >
                      이전
                    </button>
                  ) : <div />}

                  {reportStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="btn btn-primary"
                      style={{ padding: '12px 28px', fontWeight: 700 }}
                    >
                      다음 단계
                    </button>
                  ) : reportStep === 3 ? (
                    <button
                      type="button"
                      onClick={handleReportSubmit}
                      className="btn btn-primary"
                      style={{ padding: '12px 32px', fontWeight: 700, background: 'var(--success)' }}
                      disabled={isSubmittingReport}
                    >
                      {isSubmittingReport ? '접수 처리중...' : '최종 접수 및 제출'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        resetQuestionnaire();
                        setAuthViewMode('select');
                      }}
                      className="btn btn-primary"
                      style={{ padding: '12px 32px', fontWeight: 700 }}
                      disabled={isGeneratingAIReport}
                    >
                      제출 완료 (닫기)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'center', alignItems: 'center', width: '100vw', minHeight: '100vh', background: '#f8fafc', padding: '20px' }}>
        
        {/* 칸 1: 전사 사고 및 보험관리 시스템 (바로 로그인 표시) */}
        <div className="panel" style={{ padding: '40px', width: '420px', height: '460px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', borderRadius: '16px', background: 'white' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '24px', marginTop: '10px' }}>🗂️</div>
          <h2 style={{ fontWeight: 800, color: 'var(--primary)', lineHeight: 1.4, fontSize: '1.75rem', marginBottom: '20px' }}>전사 사고 및<br/>보험관리 시스템</h2>
          
          <div style={{ width: '100%', marginTop: 'auto' }}>
            <form onSubmit={handleLogin}>
              <input 
                type="password" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                placeholder="비밀번호를 입력하세요" 
                style={{ width: '100%', padding: '16px', marginBottom: '16px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }}
              />
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '8px', fontWeight: 700, fontSize: '1.1rem' }}>로그인</button>
            </form>
          </div>
        </div>

        {/* 칸 2: 사고접수 시스템 */}
        <div className="panel" style={{ padding: '40px', width: '420px', height: '460px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', borderRadius: '16px', background: 'white', position: 'relative' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '24px', marginTop: '10px' }}>🤖</div>
          <h2 style={{ fontWeight: 800, color: 'var(--text)', lineHeight: 1.4, fontSize: '1.75rem', marginBottom: '16px' }}>사고접수 시스템</h2>
          
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
            <button 
              type="button"
              onClick={() => setAuthViewMode('report')}
              className="landing-btn-report"
            >
              📝 신규 사고접수
            </button>
            <button 
              type="button"
              className="landing-btn-manage"
              style={{ cursor: 'default' }}
            >
              🔐 사고접수 관리시스템
            </button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="app-container">

      {/* ── 사고 상세 슬라이드 패널 ── */}
      {drillDetail && (
        <>
          <div onClick={() => setDrillDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, width: '480px', maxWidth: '95vw', height: '100vh', background: 'white', zIndex: 1001, boxShadow: '-8px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.25s ease' }}>
            {/* 패널 헤더 */}
            <div style={{ padding: '20px 24px', background: 'var(--primary)', color: 'white', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', opacity: 0.75, marginBottom: '4px' }}>{drillDetail.사고번호}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.3, wordBreak: 'keep-all' }}>{drillDetail.사고명 || '(사고명 없음)'}</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: '6px' }}>{drillDetail.사고일} · {drillDetail.부서 || drillDetail.사업부 || '-'}</div>
                </div>
                <button onClick={() => setDrillDetail(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 700, flexShrink: 0, marginLeft: '16px', fontSize: '0.9rem' }}>✕</button>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: drillDetail.완료보고 === '완료' ? '#dcfce7' : '#fef9c3', color: drillDetail.완료보고 === '완료' ? '#166534' : '#854d0e' }}>{drillDetail.완료보고 || '미완료'}</span>
                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: drillDetail.보험접수 === 'Y' ? '#dbeafe' : 'rgba(255,255,255,0.15)', color: drillDetail.보험접수 === 'Y' ? '#1e40af' : 'rgba(255,255,255,0.9)' }}>보험 {drillDetail.보험접수 === 'Y' ? '접수' : '미접수'}</span>
              </div>
            </div>

            {/* 패널 본문 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* 금액 요약 */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>금액 요약</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { label: '사고액', key: '사고액', color: '#3b82f6', bg: '#eff6ff' },
                    { label: '배상액', key: '배상액', color: '#10b981', bg: '#f0fdf4' },
                    { label: '회수액', key: '회수액', color: '#0891b2', bg: '#ecfeff' },
                    { label: '손실액', key: '손실액', color: '#ef4444', bg: '#fef2f2' },
                  ].map(({ label, key, color, bg }) => (
                    <div key={key} style={{ background: bg, borderRadius: '10px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.7rem', color, fontWeight: 600, marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color }}>
                        {drillDetail[key] ? `₩${parseAmount(drillDetail[key]).toLocaleString()}` : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 기본 정보 */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>기본 정보</div>
                <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: '사고접수일', value: drillDetail['사고접수일'] },
                    { label: '가이드제공일', value: drillDetail['가이드제공일'] },
                    { label: '사업부', value: drillDetail.사업부 },
                    { label: '부서', value: drillDetail.부서 },
                    { label: '담당자', value: drillDetail.담당자 },
                    { label: '실화주', value: drillDetail.실화주 },
                    { label: '고객사', value: drillDetail.고객사 },
                    { label: '귀책사', value: drillDetail.귀책사 },
                  ].filter(item => item.value).map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                      <span style={{ width: '68px', flexShrink: 0, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 사고 내용 */}
              {drillDetail.사고내용 && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>사고 내용</div>
                  <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '14px 16px', fontSize: '0.85rem', lineHeight: 1.75, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{drillDetail.사고내용}</div>
                </div>
              )}

              {/* 진행경과 타임라인 */}
              {drillDetail.진행경과?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>진행경과 ({drillDetail.진행경과.length}건)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[...drillDetail.진행경과].reverse().map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '12px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === 0 ? 'var(--primary)' : '#cbd5e1' }} />
                          {i < drillDetail.진행경과.length - 1 && <div style={{ width: '2px', flex: 1, minHeight: '16px', background: '#e2e8f0', marginTop: '4px' }} />}
                        </div>
                        <div style={{ flex: 1, background: i === 0 ? '#eff6ff' : 'var(--bg)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.82rem' }}>
                          <div style={{ fontSize: '0.7rem', color: i === 0 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>{p.date}</div>
                          <div style={{ color: 'var(--text)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{p.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 보험 정보 */}
              {drillDetail.보험접수 === 'Y' && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>보험 정보</div>
                  <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { label: '보험사', value: drillDetail.보험사 },
                      { label: '접수보험', value: drillDetail.접수보험 },
                      { label: '사건번호', value: drillDetail.사건번호 },
                      { label: '증권번호', value: drillDetail.증권번호 },
                      { label: '자기부담금', value: drillDetail.자기부담금 ? `₩${parseAmount(drillDetail.자기부담금).toLocaleString()}` : null },
                      { label: '보상여부', value: drillDetail.보험보상여부 },
                      { label: '보상유형', value: drillDetail.보험보상유형 },
                      { label: '보험금', value: drillDetail.보험금 ? `₩${parseAmount(drillDetail.보험금).toLocaleString()}` : null },
                    ].filter(item => item.value).map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                        <span style={{ width: '64px', flexShrink: 0, color: '#3b82f6', fontWeight: 600 }}>{label}</span>
                        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 완료 정보 */}
              {(drillDetail.완료보고 === '완료' || drillDetail.완료보고일 || drillDetail.완료방법) && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>완료 정보</div>
                  <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                      <span style={{ width: '64px', flexShrink: 0, color: '#10b981', fontWeight: 600 }}>완료여부</span>
                      <span>{drillDetail.완료보고 || '-'}</span>
                    </div>
                    {drillDetail.완료보고일 && (
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                        <span style={{ width: '64px', flexShrink: 0, color: '#10b981', fontWeight: 600 }}>완료보고일</span>
                        <span>{drillDetail.완료보고일}</span>
                      </div>
                    )}
                    {drillDetail.완료방법 && (
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                        <span style={{ width: '64px', flexShrink: 0, color: '#10b981', fontWeight: 600 }}>완료방법</span>
                        <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{drillDetail.완료방법}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 대표이사 보고 정보 */}
              {(drillDetail['대표이사 보고사항'] || drillDetail['대표이사 보고일']) && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>대표이사 보고 정보</div>
                  <div style={{ background: '#f5f3ff', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {drillDetail['대표이사 보고사항'] && (
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                        <span style={{ width: '64px', flexShrink: 0, color: '#8b5cf6', fontWeight: 600 }}>보고여부</span>
                        <span style={{ fontWeight: 700, color: drillDetail['대표이사 보고사항'] === 'O' ? '#166534' : '#ef4444' }}>
                          {drillDetail['대표이사 보고사항'] === 'O' ? '보고완료 (O)' : '미보고 (X)'}
                        </span>
                      </div>
                    )}
                    {drillDetail['대표이사 보고일'] && (
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                        <span style={{ width: '64px', flexShrink: 0, color: '#8b5cf6', fontWeight: 600 }}>보고일</span>
                        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{drillDetail['대표이사 보고일']}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}

      {/* ─── SIDEBAR ─── */}
      <aside className="sidebar" style={{ width: isSidebarOpen ? 'var(--sidebar-width)' : '0' }}>
        <div className="sidebar-brand">🗂 전사 사고 및 보험관리</div>

        <button className="sidebar-action-btn" style={{ marginTop: '16px' }} onClick={() => setAiModalOpen(true)}>
          + 신규 사고 접수 (AI)
        </button>

        <div className="sidebar-nav">
          <div className="nav-section-label">사고관리</div>
          <div className={`nav-item ${activeMenu === 'list' ? 'active' : ''}`} onClick={() => setActiveMenu('list')}>
            📋 전사 사고 및 클레임 현황
          </div>
          <div className={`nav-item ${activeMenu === 'analytics' ? 'active' : ''}`} onClick={() => setActiveMenu('analytics')}>
            📈 사고현황 분석 대시보드
          </div>
          <div className={`nav-item ${activeMenu === 'weekly' ? 'active' : ''}`} onClick={() => setActiveMenu('weekly')}>
            📊 주간 사고보험 리포트
          </div>
          <div className="nav-divider" />
          <div className="nav-section-label">사고가이드</div>
          <div className="nav-item" onClick={() => window.open('https://gemini.google.com/gem/1ATRQWnWjfGWA15d4_26QbDaIFdAlpERF?usp=sharing', '_blank')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📖 사고보험처리 가이드(AI)</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }} title="새 창으로 열기">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </div>
          <div className="nav-divider" />
          <div className="nav-section-label">보험관리</div>
          <div className={`nav-item ${activeMenu === 'insurance' ? 'active' : ''}`} onClick={() => setActiveMenu('insurance')}>
            🛡️ 전사 보험가입 현황
          </div>
          <div className="nav-item" onClick={() => window.open('https://gemini.google.com/gem/12mY0bU-q2VLzL4zI2Fhs4AxGMb1f2NTc?usp=sharing', '_blank')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🤖 보험약관 챗봇(AI)</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }} title="새 창으로 열기">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </div>
        </div>

        <div className="sidebar-footer">
          API&nbsp;Status:&nbsp;<span style={{ color: '#86efac', fontWeight: 600 }}>Online</span>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <div className="main-content">
        <div className="topbar">
          <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
          <span className="topbar-title">
            {activeMenu === 'list' && '전사 사고 및 클레임 현황'}
            {activeMenu === 'analytics' && '사고현황 분석 대시보드'}
            {activeMenu === 'weekly' && '주간 사고보험 리포트'}
            {activeMenu === 'insurance' && '전사 보험가입 현황'}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* 상단 저장 버튼 제거 (필터 바로 이동) */}
          </div>
        </div>

        <div className="page-body">

          {/* ════════ 전사 사고 및 클레임 현황 ════════ */}
          {activeMenu === 'list' && (
            <>
              {/* Filter Bar + 액션 버튼 통합 */}
              <div className="filter-bar">
                <div className="tab-group">
                  {[['all', '전체 보기'], ['active', '진행중 (미완료)'], ['done', '완료됨']].map(([k, l]) => (
                    <button key={k} className={`tab-btn ${activeTab === k ? 'active' : ''}`} onClick={() => setActiveTab(k)}>{l}</button>
                  ))}
                </div>
                <div className="filter-sep" />
                <div className="date-filter">
                  <span>조회 기간</span>
                  <input className="date-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <span>~</span>
                  <input className="date-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div className="filter-sep" />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '7px 12px', whiteSpace: 'nowrap' }} onClick={addEmptyRow}>
                    + 신규 사고 추가 (수동)
                  </button>
                  <button
                    className="btn"
                    style={{ fontSize: '0.82rem', padding: '7px 12px', whiteSpace: 'nowrap', border: '1.5px solid var(--danger)', color: deleteMode ? 'white' : 'var(--danger)', background: deleteMode ? 'var(--danger)' : 'white' }}
                    onClick={toggleDeleteMode}
                  >
                    {deleteMode ? '✕ 선택 모드 종료' : '− 사고 삭제'}
                  </button>
                  {deleteMode && checkedRows.size > 0 && (
                    <button
                      className="btn"
                      style={{ fontSize: '0.82rem', padding: '7px 12px', whiteSpace: 'nowrap', background: 'var(--danger)', color: 'white', border: 'none' }}
                      onClick={() => setDeleteConfirm(true)}
                    >
                      🗑 삭제 진행 ({checkedRows.size}건)
                    </button>
                  )}
                  <div className="filter-sep" />
                  <button className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '7px 15px', background: '#10b981', borderColor: '#10b981', position: 'relative' }} onClick={() => saveData()}>
                    💾 전체 저장
                    {dirtyRows.size > 0 && (
                      <span style={{ position: 'absolute', top: '-7px', right: '-7px', background: '#ef4444', color: 'white', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', lineHeight: '1.4' }}>{dirtyRows.size}</span>
                    )}
                  </button>
                  {isLoading && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginLeft: '4px' }}>⚡ 동기화 중...</span>}
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {sortConfig.key && (
                    <button
                      onClick={() => setSortConfig({ key: null, dir: 'asc' })}
                      style={{ fontSize: '0.78rem', padding: '5px 10px', border: '1px solid var(--primary)', borderRadius: '6px', background: '#eff6ff', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      {sortConfig.key} {sortConfig.dir === 'asc' ? '▲' : '▼'} &nbsp;✕ 초기화
                    </button>
                  )}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    총 <strong style={{ color: 'var(--text)' }}>{filteredRows.length}</strong>건
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="table-wrap">
                {/* 숨겨진 파일 인풋 */}
                <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileUpload} />

                <table style={{ minWidth: '3200px' }}>
                  <thead>
                    <tr>
                      {deleteMode && <th rowSpan="2" style={{ background: '#fee2e2', width: '40px', minWidth: '40px', maxWidth: '40px', textAlign: 'center' }}>선택</th>}
                      <th rowSpan="2" style={{ ...thStyle('첨부파일'), background: '#f8fafc' }}>사고관련<br />첨부파일<ResizeHandle col="첨부파일" /></th>
                      <th colSpan={COLS_ACCIDENT.length + 1} className="group-head group-accident">사고 내용 및 진행 경과</th>
                      <th colSpan="3" style={{ background: '#f8fafc', borderRight: '1px solid #e2e8f0' }}>완료 보고</th>
                      <th colSpan={COLS_INSURANCE.length} className="group-head group-insurance">보험 접수 내용</th>
                    </tr>
                    <tr>
                      {COLS_ACCIDENT.slice(0, 12).map((c) => {
                        const sortable = !SORT_SKIP_COLS.has(c);
                        const active = sortConfig.key === c;
                        return (
                          <th key={c} className="detail-accident"
                            style={{ ...thStyle(c), cursor: sortable ? 'pointer' : 'default', background: active ? '#eff6ff' : thStyle(c).background, userSelect: 'none' }}
                            onClick={() => sortable && handleSort(c)}
                            title={COLUMN_TOOLTIPS[c] || ''}
                          >
                            {NUM_FIELDS.has(c)
                              ? <>{c}{sortMark(c)}<br /><span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>(단위:원)</span></>
                              : <>{c}{sortMark(c)}</>}
                            <ResizeHandle col={c} />
                          </th>
                        );
                      })}
                      <th style={{ ...thStyle('진행경과'), background: '#f8fafc', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                        진행경과(상세)<ResizeHandle col="진행경과" />
                      </th>
                      {COLS_ACCIDENT.slice(12).map((c) => {
                        const sortable = !SORT_SKIP_COLS.has(c);
                        const active = sortConfig.key === c;
                        return (
                          <th key={c} className="detail-accident"
                            style={{ ...thStyle(c), cursor: sortable ? 'pointer' : 'default', background: active ? '#eff6ff' : thStyle(c).background, userSelect: 'none' }}
                            onClick={() => sortable && handleSort(c)}
                            title={COLUMN_TOOLTIPS[c] || ''}
                          >
                            {NUM_FIELDS.has(c)
                              ? <>{c}{sortMark(c)}<br /><span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>(단위:원)</span></>
                              : <>{c}{sortMark(c)}</>}
                            <ResizeHandle col={c} />
                          </th>
                        );
                      })}
                      <th style={{ ...thStyle('완료보고'), background: sortConfig.key === '완료보고' ? '#eff6ff' : '#f8fafc', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('완료보고')}>
                        완료보고{sortMark('완료보고')}<ResizeHandle col="완료보고" />
                      </th>
                      <th style={{ ...thStyle('완료보고일'), background: sortConfig.key === '완료보고일' ? '#eff6ff' : '#f8fafc', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('완료보고일')}>
                        완료보고일{sortMark('완료보고일')}<ResizeHandle col="완료보고일" />
                      </th>
                      <th style={{ ...thStyle('완료방법'), background: '#f8fafc', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                        완료방법<ResizeHandle col="완료방법" />
                      </th>
                      {COLS_INSURANCE.map(c => {
                        const active = sortConfig.key === c;
                        return (
                          <th key={c} className="detail-insurance"
                            style={{ ...thStyle(c), cursor: 'pointer', background: active ? '#eff6ff' : thStyle(c).background, userSelect: 'none' }}
                            onClick={() => handleSort(c)}
                            title={COLUMN_TOOLTIPS[c] || ''}
                          >
                            {NUM_FIELDS.has(c)
                              ? <>{c}{sortMark(c)}<br /><span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>(단위:원)</span></>
                              : <>{c}{sortMark(c)}</>}
                            <ResizeHandle col={c} />
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody key={dataVersion} onKeyDown={(e) => handleTableKeyDown(e, 'acc')}>
                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={2 + COLS_ACCIDENT.length + 1 + COLS_INSURANCE.length + (deleteMode ? 1 : 0)}
                          style={{ padding: '40px', color: 'var(--text-muted)' }}>
                          조건에 해당하는 사고 건이 없습니다.
                        </td>
                      </tr>
                    )}
                    {filteredRows.map((row, rIdx) => (
                      <tr key={row.id} style={
                        deleteMode && checkedRows.has(row.id)
                          ? { background: '#fff1f2' }
                          : dirtyRows.has(row.id)
                          ? { background: '#fff5f5', borderLeft: '3px solid #ef4444' }
                          : {}
                      }>
                        {/* 체크박스 */}
                        {deleteMode && (
                          <td style={{ textAlign: 'center', background: '#fff1f2', width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                            <input type="checkbox" checked={checkedRows.has(row.id)} onChange={() => toggleCheck(row.id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                          </td>
                        )}
                        {/* 첨부파일 – 세로 중앙 정렬 */}
                        <td style={{ background: '#f8fafc', textAlign: 'center', verticalAlign: 'middle', minWidth: '100px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            {/* 파일 개수 배지 */}
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: row.fileCount > 0 ? 'var(--primary)' : 'var(--text-muted)', background: row.fileCount > 0 ? 'var(--primary-light)' : '#f1f5f9', padding: '2px 8px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
                              📁 {row.fileCount > 0 ? `${row.fileCount}개` : '없음'}
                            </span>
                            {/* 업로드 버튼 */}
                            <button className="upload-btn idle" style={{ padding: '4px 10px', fontSize: '0.73rem', width: '100%' }}
                              onClick={() => { setUploadTarget(row.id); setTimeout(() => fileInputRef.current?.click(), 50); }}>
                              📎 업로드
                            </button>
                            {/* 보기 / 파일 관리 버튼 (파일 있을 때만) */}
                            {row.fileCount > 0 && (<>
                              <button className="upload-btn done" style={{ padding: '4px 10px', fontSize: '0.73rem', width: '100%' }}
                                title="구글 드라이브 폴더 열기"
                                onClick={() => row.driveUrl && window.open(row.driveUrl, '_blank')}>
                                ☁ 보기
                              </button>
                              <button className="upload-btn idle" style={{ padding: '4px 10px', fontSize: '0.73rem', width: '100%', borderColor: '#ef4444', color: '#ef4444' }}
                                onClick={() => openFileManage(row.id)}>
                                🗑 파일 삭제
                              </button>
                            </>)}
                          </div>
                        </td>
                        {/* 사고내용 인라인 (앞부분 0-11) */}
                        {COLS_ACCIDENT.slice(0, 12).map((col, cIdx) => (
                          <td key={col} style={{ verticalAlign: 'middle', minWidth: '90px', position: LONG_TEXT.has(col) ? 'relative' : 'static' }}>
                            {DATE_FIELDS.has(col) ? (
                              <input data-table="acc" data-row={rIdx} data-col={cIdx} className="cell-input" type="date" defaultValue={row[col] || ''} onChange={e => updateCell(row.id, col, e.target.value)} style={{ minWidth: '110px' }} />
                            ) : LONG_TEXT.has(col) ? (
                              <textarea data-table="acc" data-row={rIdx} data-col={cIdx} className="cell-textarea" defaultValue={row[col] || ''} ref={autoResize} onInput={e => autoResize(e.target)} onBlur={e => { if (e.target.value !== (row[col] || '')) updateCell(row.id, col, e.target.value); }} style={{ textAlign: 'left' }} title={row[col] || ''} />
                            ) : NUM_FIELDS.has(col) ? (
                              <input data-table="acc" data-row={rIdx} data-col={cIdx} className="cell-input" defaultValue={row[col] || ''} onBlur={e => {
                                const numStr = e.target.value.replace(/[^0-9]/g, '');
                                const formatted = numStr ? Number(numStr).toLocaleString() : '';
                                if (formatted !== (row[col] || '')) { updateCell(row.id, col, formatted); e.target.value = formatted; }
                              }} placeholder="0" style={{ textAlign: 'right', paddingRight: '8px' }} />
                            ) : (
                              <input data-table="acc" data-row={rIdx} data-col={cIdx} className="cell-input" defaultValue={row[col] || ''} onBlur={e => { if (e.target.value !== (row[col] || '')) updateCell(row.id, col, e.target.value); }} />
                            )}
                          </td>
                        ))}

                        {/* 진행경과 – 컴팩트 (인덱스 12) */}
                        <td style={{ background: '#fdfaf6', minWidth: '200px', position: 'relative' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                            <div
                              className="cell-progress-text"
                              tabIndex={0}
                              title={row.진행경과.length > 0 ? `[${row.진행경과[row.진행경과.length - 1].date}] ${row.진행경과[row.진행경과.length - 1].text}` : '입력된 경과 없음'}
                            >
                              {row.진행경과.length > 0
                                ? <><strong style={{ color: 'var(--primary)' }}>{row.진행경과[row.진행경과.length - 1].date}&nbsp;</strong>{row.진행경과[row.진행경과.length - 1].text}</>
                                : <span style={{ color: 'var(--text-muted)' }}>입력된 경과 없음</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>총 {row.진행경과.length}건</span>
                              <button className="progress-btn" style={{ margin: 0, padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => openProgress(row.id)}>📝 등록/더보기</button>
                            </div>
                          </div>
                        </td>

                        {/* 사고내용 인라인 (뒷부분 12-18 -> data-col 13-19) */}
                        {COLS_ACCIDENT.slice(12).map((col, cIdx) => (
                          <td key={col} style={{ verticalAlign: 'middle', minWidth: '90px', position: LONG_TEXT.has(col) ? 'relative' : 'static' }}>
                            {col === '대표이사 보고사항' ? (
                              <select data-table="acc" data-row={rIdx} data-col={13 + cIdx} className="cell-select" value={row[col] || ''} onChange={e => updateCell(row.id, col, e.target.value)} style={{ minWidth: '80px' }}>
                                <option value="">-</option>
                                <option value="O">O</option>
                                <option value="X">X</option>
                              </select>
                            ) : DATE_FIELDS.has(col) ? (
                              <input data-table="acc" data-row={rIdx} data-col={13 + cIdx} className="cell-input" type="date" defaultValue={row[col] || ''} onChange={e => updateCell(row.id, col, e.target.value)} style={{ minWidth: '110px' }} />
                            ) : LONG_TEXT.has(col) ? (
                              <textarea data-table="acc" data-row={rIdx} data-col={13 + cIdx} className="cell-textarea" defaultValue={row[col] || ''} ref={autoResize} onInput={e => autoResize(e.target)} onBlur={e => { if (e.target.value !== (row[col] || '')) updateCell(row.id, col, e.target.value); }} style={{ textAlign: 'left' }} title={row[col] || ''} />
                            ) : NUM_FIELDS.has(col) ? (
                              <input data-table="acc" data-row={rIdx} data-col={13 + cIdx} className="cell-input" defaultValue={row[col] || ''} onBlur={e => {
                                const numStr = e.target.value.replace(/[^0-9]/g, '');
                                const formatted = numStr ? Number(numStr).toLocaleString() : '';
                                if (formatted !== (row[col] || '')) { updateCell(row.id, col, formatted); e.target.value = formatted; }
                              }} placeholder="0" style={{ textAlign: 'right', paddingRight: '8px' }} />
                            ) : (
                              <input data-table="acc" data-row={rIdx} data-col={13 + cIdx} className="cell-input" defaultValue={row[col] || ''} onBlur={e => { if (e.target.value !== (row[col] || '')) updateCell(row.id, col, e.target.value); }} />
                            )}
                          </td>
                        ))}

                        {/* 완료보고 (data-col 20) */}
                        <td style={{ verticalAlign: 'middle', minWidth: '90px' }}>
                          <select data-table="acc" data-row={rIdx} data-col={20} className="cell-select" value={row['완료보고'] || '미완료'} onChange={e => {
                            const val = e.target.value;
                            updateCell(row.id, '완료보고', val);
                            if (val === '완료' && !row['완료보고일']) {
                              updateCell(row.id, '완료보고일', new Date().toISOString().split('T')[0]);
                            }
                          }} style={{ minWidth: '90px' }}>
                            <option value="미완료">미완료</option>
                            <option value="완료">완료</option>
                          </select>
                        </td>
                        {/* 완료보고일 (data-col 21) */}
                        <td style={{ verticalAlign: 'middle', minWidth: '110px' }}>
                          <input data-table="acc" data-row={rIdx} data-col={21} className="cell-input" type="date" defaultValue={row['완료보고일'] || ''} onChange={e => updateCell(row.id, '완료보고일', e.target.value)} style={{ minWidth: '110px' }} />
                        </td>
                        {/* 완료방법 (data-col 22) */}
                        <td style={{ verticalAlign: 'middle', minWidth: '120px' }}>
                          <input data-table="acc" data-row={rIdx} data-col={22} className="cell-input" defaultValue={row['완료방법'] || ''} onBlur={e => { if (e.target.value !== (row['완료방법'] || '')) updateCell(row.id, '완료방법', e.target.value); }} placeholder="완료방법 입력" />
                        </td>
                        {/* 보험 인라인 (data-col 23+) */}
                        {COLS_INSURANCE.map((col, iIdx) => (
                          <td key={col} style={{ verticalAlign: 'middle' }}>
                            {col === '보험접수' ? (
                              <select data-table="acc" data-row={rIdx} data-col={23 + iIdx} className="cell-select" value={row[col] || 'N'} onChange={e => updateCell(row.id, col, e.target.value)}>
                                <option>Y</option><option>N</option>
                              </select>
                            ) : DATE_FIELDS.has(col) ? (
                              <input data-table="acc" data-row={rIdx} data-col={23 + iIdx} className="cell-input" type="date" defaultValue={row[col] || ''} onChange={e => updateCell(row.id, col, e.target.value)} style={{ minWidth: '110px' }} />
                            ) : NUM_FIELDS.has(col) ? (
                              <input data-table="acc" data-row={rIdx} data-col={23 + iIdx} className="cell-input" defaultValue={row[col] || ''} onBlur={e => {
                                const numStr = e.target.value.replace(/[^0-9]/g, '');
                                const formatted = numStr ? Number(numStr).toLocaleString() : '';
                                if (formatted !== (row[col] || '')) { updateCell(row.id, col, formatted); e.target.value = formatted; }
                              }} placeholder="0" style={{ textAlign: 'right', paddingRight: '8px' }} />
                            ) : (
                              <input data-table="acc" data-row={rIdx} data-col={23 + iIdx} className="cell-input" defaultValue={row[col] || ''} onBlur={e => { if (e.target.value !== (row[col] || '')) updateCell(row.id, col, e.target.value); }} />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ════════ 사고현황 분석 대시보드 ════════ */}
          {activeMenu === 'analytics' && (
            <div className="analytics-body" style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '10px' }}>
              {/* 기간 필터 컨트롤 바 */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--primary-light)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.2rem' }}>📅</div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>조회 기간 설정</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input className="cell-input" type="date" value={dashStartDate} onChange={e => setDashStartDate(e.target.value)} style={{ padding: '6px 10px', width: '140px' }} />
                        <span style={{ color: 'var(--border)' }}>~</span>
                        <input className="cell-input" type="date" value={dashEndDate} onChange={e => setDashEndDate(e.target.value)} style={{ padding: '6px 10px', width: '140px' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      ['1Y', '최근 1년'], ['6M', '최근 6개월'],
                      ['THIS_YEAR', '올해 전체'],
                      ['H1', '상반기'], ['H2', '하반기'],
                      ['Q1', '1분기'], ['Q2', '2분기'], ['Q3', '3분기'], ['Q4', '4분기']
                    ].map(([k, v]) => (
                      <button
                        key={k}
                        className="btn"
                        onClick={() => setRangePreset(k)}
                        style={{
                          fontSize: '0.8rem', padding: '8px 14px', borderRadius: '8px',
                          background: 'white', border: '1px solid var(--border)', color: 'var(--text-muted)',
                          fontWeight: 500, transition: 'all 0.2s'
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 통계 카드 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                {[
                  { label: '접수 사고 건수', value: `${dashboardStats.totalCount} 건`, sub: '선택 기간 기준', color: 'var(--text)' },
                  { label: '총 사고 발생액 합계', value: `₩ ${dashboardStats.totalOccur.toLocaleString()}`, sub: '발생액 기준 누계', color: 'var(--text)' },
                  { label: '보험 보상 및 회수액', value: `₩ ${dashboardStats.totalRecov.toLocaleString()}`, sub: '보상+배상+회수', color: 'var(--text)' },
                  { label: '회사 순 손실액 합계', value: `₩ ${dashboardStats.totalLoss.toLocaleString()}`, sub: '최종 손실 누계', color: '#ef4444', highlight: true }
                ].map((s, i) => (
                  <div key={i} className="panel" style={{ padding: '24px', border: s.highlight ? '2px solid #fee2e2' : '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '12px' }}>{s.label}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, marginBottom: '8px' }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* 차트 및 부서별 비중 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '24px' }}>
                <div className="panel" style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>월별 사고액 및 손실액 추이</h3>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <div style={{ width: '12px', height: '12px', background: '#bfdbfe', borderRadius: '3px' }} /> 발생 사고액
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '3px' }} /> 최종 손실액
                      </div>
                    </div>
                  </div>

                  <div style={{ paddingBottom: '28px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', height: '290px' }}>
                      {/* 왼쪽 Y축 - 사고액 */}
                      <div style={{ width: '58px', flexShrink: 0, display: 'flex', flexDirection: 'column', paddingRight: '6px' }}>
                        <div style={{ fontSize: '0.6rem', color: '#93c5fd', fontWeight: 700, textAlign: 'right', marginBottom: '4px', whiteSpace: 'nowrap' }}>사고액 (₩)</div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: '24px' }}>
                          {[1, 0.75, 0.5, 0.25, 0].map((pct) => (
                            <div key={pct} style={{ fontSize: '0.6rem', color: '#93c5fd', textAlign: 'right', lineHeight: 1 }}>
                              {fmtAxisVal(dashboardStats.chartMaxVal * pct)}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 차트 영역 */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '12px', position: 'relative', paddingBottom: '24px' }}>
                        {/* 수평 격자선 */}
                        <div style={{ position: 'absolute', inset: 0, bottom: '24px', pointerEvents: 'none' }}>
                          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                            <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: `${pct * 100}%`, borderTop: pct === 0 ? '2px solid var(--border)' : '1px dashed #e2e8f0' }} />
                          ))}
                        </div>
                        {dashboardStats.chartData.length > 0 ? dashboardStats.chartData.map((d, i) => {
                          const monthKey = `${d.year}-${d.month.replace('월', '').padStart(2, '0')}`;
                          const isSelected = drillFilter?.type === 'month' && drillFilter?.value === monthKey;
                          return (
                            <div
                              key={i}
                              onClick={() => toggleDrill('month', monthKey)}
                              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', position: 'relative', cursor: 'pointer', padding: '4px', borderRadius: '8px', background: isSelected ? 'var(--primary-light)' : 'transparent', transition: 'background 0.2s', zIndex: 1 }}
                            >
                              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '2px', alignItems: 'flex-end', height: '100%' }}>
                                <div
                                  style={{ width: '35%', height: `${Math.max(2, d.occurPct)}%`, background: isSelected ? '#60a5fa' : '#bfdbfe', borderRadius: '4px 4px 0 0', transition: 'all 0.2s' }}
                                  title={`${d.year} ${d.month} | ${d.count}건\n사고액: ₩${d.occurRaw.toLocaleString()}`}
                                />
                                <div
                                  style={{ width: '35%', height: `${Math.max(2, d.lossPct)}%`, background: isSelected ? '#1d4ed8' : 'var(--primary)', borderRadius: '4px 4px 0 0', transition: 'all 0.2s' }}
                                  title={`${d.year} ${d.month} | ${d.count}건\n손실액: ₩${d.lossRaw.toLocaleString()}`}
                                />
                              </div>
                              <div style={{ position: 'absolute', bottom: '-22px', fontSize: '0.7rem', color: isSelected ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isSelected ? 800 : 600, whiteSpace: 'nowrap' }}>
                                {d.month}
                              </div>
                            </div>
                          );
                        }) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>데이터가 없습니다.</div>
                        )}
                      </div>

                      {/* 오른쪽 Y축 - 손실액 */}
                      <div style={{ width: '58px', flexShrink: 0, display: 'flex', flexDirection: 'column', paddingLeft: '6px' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 700, textAlign: 'left', marginBottom: '4px', whiteSpace: 'nowrap' }}>손실액 (₩)</div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: '24px' }}>
                          {[1, 0.75, 0.5, 0.25, 0].map((pct) => (
                            <div key={pct} style={{ fontSize: '0.6rem', color: 'var(--primary)', textAlign: 'left', lineHeight: 1 }}>
                              {fmtAxisVal(dashboardStats.chartMaxVal * pct)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '32px' }}>부서별 사고 발생 비중</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '14px', flex: 1, maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                    {dashboardStats.topDepts.map((d, i) => {
                      const isSelected = drillFilter?.type === 'dept' && drillFilter?.value === d.name;
                      
                      // 부서 이름에서 핵심 2글자 추출 (예: '물류운영팀' -> '물류', 'IT지원팀' -> 'IT')
                      const shortName = d.name.replace(/팀$/, '').slice(0, 2);
                      
                      // 순위별 파스텔 톤 색상 지정
                      const colors = [
                        { bg: '#fee2e2', text: '#ef4444' }, // 1위: 위험 (빨강)
                        { bg: '#ffedd5', text: '#f97316' }, // 2위: 경고 (주황)
                        { bg: '#fef9c3', text: '#ca8a04' }, // 3위: 주의 (노랑)
                        { bg: '#e0f2fe', text: '#0284c7' }, // 4위: 일반 (파랑)
                        { bg: '#f3e8ff', text: '#a855f7' }, // 5위: 일반 (보라)
                        { bg: '#e2e8f0', text: '#64748b' }  // 기타 (회색)
                      ];
                      const color = colors[Math.min(i, colors.length - 1)];

                      return (
                        <div
                          key={i}
                          onClick={() => toggleDrill('dept', d.name)}
                          style={{
                            cursor: 'pointer',
                            padding: '12px 8px',
                            borderRadius: '12px',
                            background: isSelected ? 'var(--primary-light)' : '#f8fafc',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.08)' : 'none',
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) {
                              e.currentTarget.style.background = '#f1f5f9';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) {
                              e.currentTarget.style.background = '#f8fafc';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                            }
                          }}
                        >
                          {/* 원형 아이콘 */}
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: color.bg,
                              color: color.text,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                            }}
                          >
                            {shortName}
                          </div>
                          {/* 부서명 */}
                          <div
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: isSelected ? 'var(--primary-dark)' : 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              width: '100%',
                            }}
                            title={d.name}
                          >
                            {d.name}
                          </div>
                          {/* 건수 및 비율 */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)' }}>{d.count}건</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)' }}>{d.percent}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {dashboardStats.topDepts.length > 0 && (
                    <div style={{ marginTop: '32px', padding: '20px', background: 'var(--primary-light)', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--primary-dark)', fontWeight: 600, lineHeight: 1.6 }}>
                        💡 <strong>{dashboardStats.topDepts[0].name}</strong>의 사고 발생 비중이 가장 높습니다. 데이터 기반의 집중 관리가 필요합니다.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── 드릴다운 상세 패널 ── */}
              {drillFilter && drillRows.length > 0 && (
                <div className="panel" style={{ padding: '0', overflow: 'hidden', border: '2px solid var(--primary)', animation: 'fadeIn 0.25s ease' }}>
                  <div style={{ padding: '20px 24px', background: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.1rem' }}>{drillFilter.type === 'month' ? '📊' : '🏢'}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                          {drillFilter.type === 'month' ? `${drillFilter.value.split('-')[0]}년 ${parseInt(drillFilter.value.split('-')[1])}월` : drillFilter.value} 사고 상세
                        </div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>총 {drillRows.length}건</div>
                      </div>
                    </div>
                    <button onClick={() => setDrillFilter(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>✕ 닫기</button>
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                          {['사고번호', '사고일', '사고접수일', '가이드제공일', '부서', '사고명', '귀책사', '사고액', '손실액', '대표이사 보고', '완료보고', '완료보고일', '보험접수'].map(h => (
                            <th key={h} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                          <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border)', width: '1%' }} />
                        </tr>
                      </thead>
                      <tbody>
                        {drillRows.map((r, i) => (
                          <tr
                            key={r.id}
                            onClick={() => setDrillDetail(r)}
                            style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : '#fafbfc', cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafbfc'}
                          >
                            <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{r.사고번호}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{r.사고일}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{r.사고접수일 || '-'}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{r.가이드제공일 || '-'}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{r.부서 || r.사업부 || '-'}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'center', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.사고명}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{r.귀책사 || '-'}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}>{r.사고액 ? `₩${Number(String(r.사고액).replace(/[^0-9]/g, '')).toLocaleString()}` : '-'}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: '#ef4444' }}>{r.손실액 ? `₩${Number(String(r.손실액).replace(/[^0-9]/g, '')).toLocaleString()}` : '-'}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {r['대표이사 보고사항'] ? (
                                <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: r['대표이사 보고사항'] === 'O' ? '#e8f5e9' : '#ffebee', color: r['대표이사 보고사항'] === 'O' ? '#2e7d32' : '#c62828' }}>
                                  {r['대표이사 보고사항'] === 'O' ? `보고 (${r['대표이사 보고일'] || '날짜미상'})` : '미보고'}
                                </span>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: r.완료보고 === '완료' ? '#dcfce7' : '#fef9c3', color: r.완료보고 === '완료' ? '#166534' : '#854d0e' }}>
                                {r.완료보고 || '미완료'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{r.완료보고일 || '-'}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: r.보험접수 === 'Y' ? '#dbeafe' : '#f1f5f9', color: r.보험접수 === 'Y' ? '#1e40af' : '#64748b' }}>
                                {r.보험접수 === 'Y' ? '접수' : '미접수'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>›</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {drillFilter && drillRows.length === 0 && (
                <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
                  선택한 조건에 해당하는 사고 건이 없습니다.
                </div>
              )}
            </div>
          )}

          {/* ════════ 주간 사고보험 리포트 ════════ */}
          {activeMenu === 'weekly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* 주차 선택 바 */}
              <div className="panel" style={{ padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setWeekOffset(w => w - 1)} style={{ fontSize: '1rem', padding: '8px 16px' }}>◀ 이전주</button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>{weeklyData.weekLabel}</div>
                  {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>이번 주로 돌아가기</button>}
                </div>
                <button className="btn btn-ghost" onClick={() => setWeekOffset(w => w + 1)} style={{ fontSize: '1rem', padding: '8px 16px' }}>다음주 ▶</button>
              </div>

              {/* 요약 카드 5종 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                {[
                  { icon: '🆕', label: '금주 신규 접수', desc: '이번 주 내 접수 건', value: weeklyData.newThisWeek.length, unit: '건', color: 'var(--primary)', bg: 'var(--primary-light)' },
                  { icon: '🔄', label: '진행중 (미완료)', desc: '미완료된 모든 사고', value: weeklyData.inProgress.length, unit: '건', color: '#f59e0b', bg: '#fffbeb' },
                  { icon: '✅', label: '금주 완료 처리', desc: '이번 주 내 종결 건', value: weeklyData.completedThisWeek.length, unit: '건', color: '#10b981', bg: '#ecfdf5' },
                  { icon: '⚠️', label: '주의 필요', desc: '미접수3일/미종결14일↑', value: weeklyData.needsAttention.length, unit: '건', color: '#ef4444', bg: '#fef2f2' },
                  { icon: '🛡️', label: '보험 갱신 필요', desc: '만기 90일 이내 보험', value: weeklyData.renewalCount, unit: '건', color: '#8b5cf6', bg: '#f5f3ff' },
                ].map((c, i) => (
                  <div key={i} className="panel" style={{ padding: '18px 20px', borderLeft: `4px solid ${c.color}`, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '1.1rem' }}>{c.icon}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>{c.label}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, marginLeft: '2px' }}>{c.desc}</div>
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: 800, color: c.color }}>{c.value}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{c.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 금주 신규 접수 사고 */}
              <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🆕</span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>금주 신규 접수 사고</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>{weeklyData.newThisWeek.length}건</span>
                </div>
                {weeklyData.newThisWeek.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {weeklyData.newThisWeek.map((r, idx) => {
                      const isOpen = weeklyExpandedId === `new-${r.id}`;
                      const prog = r.진행경과 || [];
                      return (
                        <div key={r.id} style={{ borderBottom: '1px solid var(--border)', background: isOpen ? '#f0f7ff' : (idx % 2 === 0 ? 'white' : '#fafbfc') }}>
                          {/* 기본 헤더 — 클릭으로 토글 */}
                          <div
                            onClick={() => setWeeklyExpandedId(isOpen ? null : `new-${r.id}`)}
                            style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'background 0.15s' }}
                          >
                            <span style={{ fontSize: '0.8rem', color: isOpen ? 'var(--primary)' : '#64748b', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', fontWeight: 700 }}>▶</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.88rem' }}>{r.사고번호}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{r.사고명 || '-'}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '14px', fontSize: '0.76rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                <span>📅 {r.사고일}</span>
                                <span>🏢 {r.사업부} · {r.부서 || '-'}</span>
                                {r.담당자 && <span>👤 {r.담당자}</span>}
                                {r.사고액 && <span style={{ color: '#ef4444', fontWeight: 600 }}>💰 ₩{Number(String(r.사고액).replace(/[^0-9]/g, '')).toLocaleString()}</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '20px', background: r.보험접수 === 'Y' ? '#dbeafe' : '#fef3c7', color: r.보험접수 === 'Y' ? '#1e40af' : '#92400e', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {r.보험접수 === 'Y' ? '🛡️ 접수완료' : '⚠️ 미접수'}
                            </span>
                          </div>
                          {/* 확장 세부 정보 */}
                          {isOpen && (
                            <div style={{ padding: '0 20px 20px 44px', animation: 'fadeIn 0.2s ease' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', padding: '14px', background: 'white', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '12px' }}>
                                {[
                                  { label: '사고일', value: r.사고일 },
                                  { label: '사고접수일', value: r.사고접수일 || '-' },
                                  { label: '가이드제공일', value: r.가이드제공일 || '-' },
                                  { label: '사업부', value: r.사업부 },
                                  { label: '부서', value: r.부서 || '-' },
                                  { label: '담당자', value: r.담당자 || '-' },
                                  { label: '귀책사', value: `${r.귀책사구분 || ''}${r.귀책사 ? ` ${r.귀책사}` : ''}` || '-' },
                                  { label: '실화주', value: r.실화주 || '-' },
                                  { label: '고객사', value: r.고객사 || '-' },
                                  { label: '사고명', value: r.사고명 || '-' },
                                  { label: '사고액', value: r.사고액 ? `₩${Number(String(r.사고액).replace(/[^0-9]/g, '')).toLocaleString()}` : '-' },
                                  { label: '손실액', value: r.손실액 ? `₩${Number(String(r.손실액).replace(/[^0-9]/g, '')).toLocaleString()}` : '-' },
                                  { label: '대표이사 보고사항', value: r['대표이사 보고사항'] || '-' },
                                  { label: '대표이사 보고일', value: r['대표이사 보고일'] || '-' },
                                  { label: '보험접수', value: r.보험접수 === 'Y' ? `접수 (${r.보험사 || '-'}${r.접수보험 ? ` / ${r.접수보험}` : ''})` : '미접수' },
                                  { label: '완료보고', value: r.완료보고 || '-' },
                                  { label: '완료보고일', value: r.완료보고일 || '-' },
                                ].map((f, fi) => (
                                  <div key={fi} style={{ fontSize: '0.78rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{f.label}: </span>
                                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{f.value}</span>
                                  </div>
                                ))}
                              </div>
                              {r.사고내용 && (
                                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text)', marginBottom: '10px', lineHeight: 1.6, borderLeft: '3px solid var(--border)' }}>
                                  <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.72rem' }}>사고 내용</div>
                                  {r.사고내용}
                                </div>
                              )}
                              {prog.length > 0 && (
                                <div>
                                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>📋 진행경과</div>
                                  <div style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {[...prog].reverse().map((p, pi) => (
                                      <div key={pi} style={{ padding: '7px 10px', background: pi === 0 ? '#eff6ff' : 'var(--bg)', borderRadius: '6px', fontSize: '0.78rem', lineHeight: 1.5 }}>
                                        <span style={{ fontWeight: 700, color: pi === 0 ? 'var(--primary)' : 'var(--text-muted)', marginRight: '8px' }}>{p.date}</span>
                                        {p.text}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>이번 주에 신규 접수된 사고가 없습니다.</div>
                )}
              </div>

              {/* 금주 완료 처리 사고 */}
              <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fdf4' }}>
                  <span style={{ fontSize: '1.1rem' }}>✅</span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#166534' }}>금주 완료 처리 사고</h3>
                  <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700, marginLeft: '8px', opacity: 0.8 }}>{weeklyData.completedThisWeek.length}건</span>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {weeklyData.completedThisWeek.length > 0 ? weeklyData.completedThisWeek.map((r, i) => (
                    <div key={i} style={{ borderBottom: '1px solid var(--border)', background: weeklyExpandedId === `done-${r.id}` ? '#f0fdf4' : 'white', transition: 'background 0.2s' }}>
                      <div 
                        onClick={() => setWeeklyExpandedId(weeklyExpandedId === `done-${r.id}` ? null : `done-${r.id}`)}
                        style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', border: '1px solid #e2e8f0' }}>{r.사고번호 || '번호미상'}</span>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>{r.사고명}</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span>📅 <b>발생일:</b> {r.사고일 || '날짜미상'}</span>
                            <span style={{ width: '1px', height: '12px', background: '#e2e8f0' }} />
                            <span>👤 <b>담당:</b> {r.부서} · {r.담당자}</span>
                            <span style={{ width: '1px', height: '12px', background: '#e2e8f0' }} />
                            <span>🏢 <b>귀책사:</b> {r.귀책사 || '-'}</span>
                            <span style={{ width: '1px', height: '12px', background: '#e2e8f0' }} />
                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>💰 사고액: {r.사고액 ? `₩${Number(String(r.사고액).replace(/[^0-9]/g, '')).toLocaleString()}` : '0'}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', background: '#dcfce7', color: '#166534', fontSize: '0.72rem', fontWeight: 700 }}>종결완료 ✅</span>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>{weeklyExpandedId === `done-${r.id}` ? '상세닫기 ▲' : '상세보기 ▼'}</span>
                        </div>
                      </div>

                      {weeklyExpandedId === `done-${r.id}` && (
                        <div style={{ padding: '0 24px 20px 24px', marginLeft: '2px' }}>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ flex: 1, fontSize: '0.82rem', color: '#166534', fontWeight: 700, padding: '8px 12px', background: 'white', borderRadius: '6px', border: '1px dashed #bdf0d2' }}>
                              📅 완료보고일: {r.완료보고일 || '정보 없음'}
                            </div>
                            <div style={{ flex: 1, fontSize: '0.82rem', color: '#166534', fontWeight: 700, padding: '8px 12px', background: 'white', borderRadius: '6px', border: '1px dashed #bdf0d2' }}>
                              🏁 최종 완료방법: {r.완료방법 || '정보 없음'}
                            </div>
                          </div>
                          {/* 진행경과 상세 히스토리 */}
                          {r.진행경과 && r.진행경과.length > 0 && (
                            <div style={{ background: 'white', borderRadius: '8px', padding: '12px', borderLeft: '3px solid #10b981', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📋 진행경과 상세 (처리 히스토리)</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {r.진행경과.map((p, pi) => (
                                  <div key={pi} style={{ fontSize: '0.8rem', lineHeight: 1.5, display: 'flex', gap: '10px' }}>
                                    <span style={{ fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>[{p.date}]</span>
                                    <span style={{ color: 'var(--text)' }}>{p.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>이번 주에 완료된 사고가 없습니다.</div>
                  )}
                </div>
              </div>

              {/* 진행중 사고 현황 — 보험접수 / 미접수 좌우 분리 */}
              {(() => {
                const insured = weeklyData.alertRows.filter(r => r.보험접수 === 'Y').sort((a, b) => (b.사고일 || '').localeCompare(a.사고일 || ''));
                const uninsured = weeklyData.alertRows.filter(r => r.보험접수 !== 'Y').sort((a, b) => (b.사고일 || '').localeCompare(a.사고일 || ''));
                const renderCard = (r, i) => {
                  const prog = r.진행경과 || [];
                  const cardId = `prog-${r.id}`;
                  const isOpen = weeklyExpandedId === cardId;
                  return (
                    <div key={r.id} style={{ borderBottom: '1px solid var(--border)', background: isOpen ? '#fffbf0' : (i % 2 === 0 ? 'white' : '#fafbfc') }}>
                      {/* 기본 행 — 클릭으로 토글 */}
                      <div
                        onClick={() => setWeeklyExpandedId(isOpen ? null : cardId)}
                        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px' }}
                      >
                        <span style={{ fontSize: '0.75rem', color: isOpen ? 'var(--primary)' : '#94a3b8', fontWeight: 700, marginTop: '3px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.82rem' }}>{r.사고번호}</span>
                            <div style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, background: r.alert.color + '18', color: r.alert.color, border: `1px solid ${r.alert.color}40` }}>
                              {r.alert.label} · {r.alert.days}일
                            </div>
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '5px', lineHeight: 1.4 }}>{r.사고명 || '-'}</div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '0.74rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <span>📅 {r.사고일}</span>
                            <span>{r.부서 || r.사업부 || '-'}</span>
                            {r.담당자 && <span>👤 {r.담당자}</span>}
                            {r.사고액 && <span>💰 ₩{Number(String(r.사고액).replace(/[^0-9]/g, '')).toLocaleString()}</span>}
                          </div>
                          {r.보험접수 === 'Y' && r.보험사 && (
                            <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 500, marginTop: '4px' }}>🛡️ {r.보험사}</div>
                          )}
                        </div>
                      </div>
                      {/* 확장 세부 정보 */}
                      {isOpen && (
                        <div style={{ padding: '0 16px 16px 32px', animation: 'fadeIn 0.2s ease' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '10px' }}>
                            {[
                              { label: '사고일', value: r.사고일 },
                              { label: '사고접수일', value: r.사고접수일 || '-' },
                              { label: '가이드제공일', value: r.가이드제공일 || '-' },
                              { label: '사업부', value: r.사업부 },
                              { label: '부서', value: r.부서 || '-' },
                              { label: '담당자', value: r.담당자 || '-' },
                              { label: '귀책사', value: `${r.귀책사구분 || ''}${r.귀책사 ? ` ${r.귀책사}` : ''}` || '-' },
                              { label: '실화주', value: r.실화주 || '-' },
                              { label: '고객사', value: r.고객사 || '-' },
                              { label: '사고액', value: r.사고액 ? `₩${Number(String(r.사고액).replace(/[^0-9]/g, '')).toLocaleString()}` : '-' },
                              { label: '손실액', value: r.손실액 ? `₩${Number(String(r.손실액).replace(/[^0-9]/g, '')).toLocaleString()}` : '-' },
                              { label: '대표이사 보고사항', value: r['대표이사 보고사항'] || '-' },
                              { label: '대표이사 보고일', value: r['대표이사 보고일'] || '-' },
                              { label: '보험사', value: r.보험사 || '-' },
                              { label: '완료보고', value: r.완료보고 || '-' },
                              { label: '완료보고일', value: r.완료보고일 || '-' },
                            ].map((f, fi) => (
                              <div key={fi} style={{ fontSize: '0.76rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{f.label}: </span>
                                <span style={{ color: 'var(--text)', fontWeight: 500 }}>{f.value}</span>
                              </div>
                            ))}
                          </div>
                          {r.사고내용 && (
                            <div style={{ padding: '9px 12px', background: '#f8fafc', borderRadius: '7px', fontSize: '0.78rem', color: 'var(--text)', marginBottom: '10px', lineHeight: 1.6, borderLeft: '3px solid var(--border)' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', fontSize: '0.7rem' }}>사고 내용</div>
                              {r.사고내용}
                            </div>
                          )}
                          {prog.length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '7px' }}>📋 진행경과 ({prog.length}건)</div>
                              <div style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {[...prog].reverse().map((p, pi) => (
                                  <div key={pi} style={{ padding: '6px 10px', background: pi === 0 ? '#eff6ff' : 'var(--bg)', borderRadius: '6px', fontSize: '0.75rem', lineHeight: 1.5 }}>
                                    <span style={{ fontWeight: 700, color: pi === 0 ? 'var(--primary)' : 'var(--text-muted)', marginRight: '8px' }}>{p.date}</span>
                                    {p.text}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                };
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* 왼쪽: 보험 미접수 */}
                    <div className="panel" style={{ padding: '0', overflow: 'hidden', border: uninsured.length > 0 ? '2px solid #f59e0b' : '1px solid var(--border)' }}>
                      <div style={{ padding: '16px 20px', borderBottom: '2px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '10px', background: '#fffbeb' }}>
                        <span style={{ fontSize: '1rem' }}>⚠️</span>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#92400e' }}>보험 미접수</h3>
                        <span style={{ marginLeft: 'auto', padding: '3px 12px', borderRadius: '20px', background: '#fef3c7', color: '#92400e', fontSize: '0.8rem', fontWeight: 700 }}>{uninsured.length}건</span>
                        {uninsured.length > 0 && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>조치 필요!</span>}
                      </div>
                      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {uninsured.length > 0 ? uninsured.map((r, i) => renderCard(r, i)) : (
                          <div style={{ padding: '40px', textAlign: 'center', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>✅ 모든 사고가 보험 접수 완료!</div>
                        )}
                      </div>
                    </div>

                    {/* 오른쪽: 보험 접수 완료 */}
                    <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
                      <div style={{ padding: '16px 20px', borderBottom: '2px solid #2563eb', display: 'flex', alignItems: 'center', gap: '10px', background: '#eff6ff' }}>
                        <span style={{ fontSize: '1rem' }}>🛡️</span>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e40af' }}>보험 접수 완료</h3>
                        <span style={{ marginLeft: 'auto', padding: '3px 12px', borderRadius: '20px', background: '#dbeafe', color: '#1e40af', fontSize: '0.8rem', fontWeight: 700 }}>{insured.length}건</span>
                      </div>
                      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {insured.length > 0 ? insured.map((r, i) => renderCard(r, i)) : (
                          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>보험 접수된 진행중 사고가 없습니다.</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 보험 갱신 관리 */}
              <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc' }}>
                  <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>보험 갱신 관리</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>총 {weeklyData.insuranceRenewals.length}건 관리 중</span>
                </div>

                {/* 공통 보험 카드 렌더링 함수 */}
                {(() => {
                  const renderInsCard = (r, i) => (
                    <div key={i} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', borderLeft: `4px solid ${r.renewColor}`, background: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg)', color: 'var(--text-muted)', fontWeight: 700, border: '1px solid var(--border)' }}>{r.구분 || '구분없음'}</span>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{r.보험명}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>({r.보험사})</span>
                        </div>
                        <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, background: r.renewLevel === 'expired' ? '#f1f5f9' : (r.renewLevel === 'urgent' ? '#fef2f2' : (r.renewLevel === 'prepare' ? '#fffbeb' : '#f0fdf4')), color: r.renewColor }}>
                          {r.daysLeft < 0 ? `만기 경과 ${Math.abs(r.daysLeft)}일` : `D-${r.daysLeft}`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span>📅 {r['보험 시작일']} ~ {r['보험 종료일']}</span>
                        <span>💰 보험료: {r.보험료금액 ? `₩${Number(String(r.보험료금액).replace(/[^0-9]/g, '')).toLocaleString()}` : '-'}</span>
                        {r.보상한도 && <span>🔒 {r.보상한도}</span>}
                        {r.driveUrl && <button onClick={() => window.open(r.driveUrl, '_blank')} style={{ background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '6px', padding: '2px 10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>📄 증권보기</button>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #e2e8f0' }}>
                        <div><span style={{ fontWeight: 700, color: 'var(--text-muted)', marginRight: '8px' }}>📋 보상내용:</span> {r.보상내용 || '-'}</div>
                        <div><span style={{ fontWeight: 700, color: 'var(--text-muted)', marginRight: '8px' }}>📝 비고:</span> {r.비고 || '-'}</div>
                      </div>
                    </div>
                  );

                  // 데이터를 구분별로 그룹화하는 함수
                  const groupByDivision = (list) => {
                    const groups = {};
                    list.forEach(r => {
                      const div = r.구분 || '기타/미분류';
                      if (!groups[div]) groups[div] = [];
                      groups[div].push(r);
                    });
                    return groups;
                  };

                  const renderGroupedSection = (list) => {
                    const grouped = groupByDivision(list);
                    return Object.entries(grouped).map(([div, items], gIdx) => (
                      <div key={div}>
                        <div style={{ padding: '6px 24px', background: '#f8fafc', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--primary)' }}>●</span> {div} ({items.length}건)
                        </div>
                        {items.map(renderInsCard)}
                      </div>
                    ));
                  };

                  const urgentList = weeklyData.insuranceRenewals.filter(r => r.renewLevel === 'expired' || r.renewLevel === 'urgent');
                  const prepareList = weeklyData.insuranceRenewals.filter(r => r.renewLevel === 'prepare');
                  const safeList = weeklyData.insuranceRenewals.filter(r => r.renewLevel === 'safe');

                  return (
                    <>
                      {/* 섹션 1: 만기 임박 */}
                      <div 
                        onClick={() => setRenewalExpanded(prev => ({ ...prev, urgent: !prev.urgent }))}
                        style={{ padding: '12px 24px', background: '#fef2f2', fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderTop: '1px solid #fee2e2' }}
                      >
                        <span>🔴 만기 임박 / 만기 경과 ({urgentList.length})</span>
                        <span style={{ fontSize: '0.7rem' }}>{renewalExpanded.urgent ? '▲ 접기' : '▼ 펼치기'}</span>
                      </div>
                      {renewalExpanded.urgent && renderGroupedSection(urgentList)}

                      {/* 섹션 2: 갱신 준비 */}
                      <div 
                        onClick={() => setRenewalExpanded(prev => ({ ...prev, prepare: !prev.prepare }))}
                        style={{ padding: '12px 24px', background: '#fffbeb', fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderTop: '1px solid #fef3c7' }}
                      >
                        <span>🟡 갱신 준비 필요 (30~90일) ({prepareList.length})</span>
                        <span style={{ fontSize: '0.7rem' }}>{renewalExpanded.prepare ? '▲ 접기' : '▼ 펼치기'}</span>
                      </div>
                      {renewalExpanded.prepare && renderGroupedSection(prepareList)}

                      {/* 섹션 3: 안전 */}
                      <div 
                        onClick={() => setRenewalExpanded(prev => ({ ...prev, safe: !prev.safe }))}
                        style={{ padding: '12px 24px', background: '#f0fdf4', fontSize: '0.85rem', fontWeight: 700, color: '#10b981', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderTop: '1px solid #dcfce7' }}
                      >
                        <span>🟢 안전: 정상 유지 중 (91일 이상) ({safeList.length})</span>
                        <span style={{ fontSize: '0.7rem' }}>{renewalExpanded.safe ? '▲ 접기' : '▼ 펼치기'}</span>
                      </div>
                      {renewalExpanded.safe && renderGroupedSection(safeList)}

                      {(urgentList.length + prepareList.length + safeList.length) === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>유효한 보험 데이터가 없습니다.</div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ════════ 전사 보험가입 현황 ════════ */}
          {activeMenu === 'insurance' && (
            <>
              {/* 상단 탭 및 버튼 행 */}
              <div className="filter-bar" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '12px' }}>
                <div className="tab-group">
                  {[['all', '전체 보기'], ['active', '계약 유지중'], ['done', '만기/종료됨']].map(([k, l]) => (
                    <button key={k} className={`tab-btn ${insActiveTab === k ? 'active' : ''}`} onClick={() => setInsActiveTab(k)}>{l}</button>
                  ))}
                </div>
                <div className="filter-sep" />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 14px' }} onClick={addEmptyIns}>
                    + 신규 보험 추가
                  </button>
                  <button
                    className="btn"
                    style={{ fontSize: '0.85rem', padding: '8px 14px', border: '1.5px solid var(--danger)', color: insDeleteMode ? 'white' : 'var(--danger)', background: insDeleteMode ? 'var(--danger)' : 'white' }}
                    onClick={toggleInsDeleteMode}
                  >
                    {insDeleteMode ? '✕ 선택 모드 종료' : '− 보험 삭제'}
                  </button>
                  {insDeleteMode && checkedIns.size > 0 && (
                    <button
                      className="btn"
                      style={{ fontSize: '0.85rem', padding: '8px 14px', background: 'var(--danger)', color: 'white', border: 'none' }}
                      onClick={() => setInsDeleteConfirm(true)}
                    >
                      🗑 삭제 진행 ({checkedIns.size}건)
                    </button>
                  )}
                  <div className="filter-sep" />
                  <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 16px', background: '#10b981', borderColor: '#10b981' }} onClick={() => saveData()}>
                    💾 전체 저장
                  </button>
                  {isLoading && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginLeft: '4px' }}>⚡ 동기화 중...</span>}
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  총 <strong style={{ color: 'var(--text)' }}>{filteredInsRows.length}</strong>건
                </div>
              </div>

              <div className="table-wrap" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <input ref={insFileInputRef} type="file" style={{ display: 'none' }} onChange={handleInsFileUpload} />
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', flexShrink: 0 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>🛡️ 전사 보험가입 현황 리스트</h3>
                </div>
                <div style={{ overflow: 'auto', flex: 1 }}>
                  <table style={{ minWidth: '2800px', tableLayout: 'auto' }}>
                    <thead>
                      <tr>
                        {insDeleteMode && <th style={{ background: '#fee2e2', width: '40px', minWidth: '40px', maxWidth: '40px', textAlign: 'center' }}>선택</th>}
                        {INS_COLS.slice(0, 2).map(c => (
                          <th key={c.key} 
                            onClick={() => handleInsSort(c.key)}
                            style={{ ...thStyle(c.key, { background: '#1e40af', color: 'white', borderRight: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }), position: 'relative' }}
                          >
                            {c.key === 'currency' ? 'Currency' : c.key}
                            {insSortMark(c.key)}
                            <ResizeHandle col={c.key} />
                          </th>
                        ))}
                        <th style={{ ...thStyle('증권파일', { background: '#1e40af', color: 'white' }), position: 'relative' }}>
                          증권 파일관리<ResizeHandle col="증권파일" />
                        </th>
                        {INS_COLS.slice(2).map(c => (
                          <th key={c.key} 
                            onClick={() => handleInsSort(c.key)}
                            style={{ ...thStyle(c.key, { background: '#1e40af', color: 'white', borderRight: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }), position: 'relative' }}
                          >
                            {c.key === 'currency' ? 'Currency' : c.key === '보험료금액' ? '금액' : c.key === '보험 시작일' ? '시작일' : c.key === '보험 종료일' ? '종료일' : c.key}
                            {insSortMark(c.key)}
                            <ResizeHandle col={c.key} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody key={dataVersion} onKeyDown={(e) => handleTableKeyDown(e, 'ins')}>
                      {filteredInsRows.map((r, rIdx) => (
                        <tr key={r.id} style={insDeleteMode && checkedIns.has(r.id) ? { background: '#fff1f2' } : {}}>
                          {insDeleteMode && (
                            <td style={{ textAlign: 'center', background: '#fff1f2', width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                              <input type="checkbox" checked={checkedIns.has(r.id)} onChange={() => toggleInsCheck(r.id)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                            </td>
                          )}
                          {/* 보험명까지 출력 (0, 1) */}
                          {INS_COLS.slice(0, 2).map((c, cIdx) => (
                            <td key={c.key} style={{ verticalAlign: 'middle' }}>
                              <input data-table="ins" data-row={rIdx} data-col={cIdx} className="cell-input" defaultValue={r[c.key] || ''} onBlur={e => { if (e.target.value !== (r[c.key] || '')) updateIns(r.id, c.key, e.target.value); }} />
                            </td>
                          ))}

                          {/* 증권 파일관리 (보험명 바로 뒤) */}
                          <td style={{ textAlign: 'center', verticalAlign: 'middle', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', padding: '4px' }}>
                              {r.driveUrl && (
                                <button className="upload-btn done" style={{ padding: '4px 8px', fontSize: '0.72rem', width: '100%' }} onClick={() => window.open(r.driveUrl, '_blank')}>
                                  📄 증권 보기
                                </button>
                              )}
                              <button className="upload-btn idle" style={{ padding: '4px 8px', fontSize: '0.72rem', width: '100%' }} onClick={() => { setInsUploadTarget(r.id); setTimeout(() => insFileInputRef.current?.click(), 50); }}>
                                📎 파일 첨부
                              </button>
                              <button className="upload-btn idle" style={{ padding: '4px 8px', fontSize: '0.72rem', width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={() => {
                                const url = prompt("연결할 구글 드라이브 증권 파일 링크를 입력하세요:", r.driveUrl || '');
                                if (url !== null) {
                                  const newInsRows = insRows.map(ins => ins.id === r.id ? { ...ins, driveUrl: url } : ins);
                                  setInsRows(newInsRows);
                                  saveData(rows, newInsRows, false);
                                }
                              }}>
                                🔗 링크 입력
                              </button>
                            </div>
                          </td>

                          {/* 나머지 컬럼 (2번 인덱스부터 -> data-col은 2번부터) */}
                          {INS_COLS.slice(2).map((c, cIdx) => (
                            <td key={c.key} style={{ verticalAlign: 'middle', position: LONG_TEXT.has(c.key) ? 'relative' : 'static' }}>
                              {c.key === '잔여 기간' ? (
                                <div style={{
                                  textAlign: 'center', fontWeight: 700, color: (() => {
                                    if (!r['보험 종료일']) return 'var(--text-muted)';
                                    const diff = Math.ceil((new Date(r['보험 종료일']) - new Date()) / (1000 * 60 * 60 * 24));
                                    return diff < 0 ? 'var(--danger)' : diff < 30 ? '#f59e0b' : 'var(--success)';
                                  })()
                                }}>
                                  {(() => {
                                    if (!r['보험 종료일']) return '-';
                                    const diff = Math.ceil((new Date(r['보험 종료일']) - new Date()) / (1000 * 60 * 60 * 24));
                                    return diff < 0 ? `종료(D+${Math.abs(diff)})` : `D-${diff}`;
                                  })()}
                                </div>
                              ) : c.key === '상태' ? (
                                <select data-table="ins" data-row={rIdx} data-col={2 + cIdx} className="cell-select" value={r[c.key] || '계약 유지중'} onChange={e => updateIns(r.id, c.key, e.target.value)}>
                                  <option value="계약 유지중">계약 유지중</option>
                                  <option value="갱신 필요">갱신 필요</option>
                                  <option value="갱신완료(보관)">갱신완료(보관)</option>
                                  <option value="계약해지(보관)">계약해지(보관)</option>
                                </select>
                              ) : (c.key === '보험 시작일' || c.key === '보험 종료일') ? (
                                <input data-table="ins" data-row={rIdx} data-col={2 + cIdx} className="cell-input" type="date" defaultValue={r[c.key] || ''} onChange={e => updateIns(r.id, c.key, e.target.value)} style={{ minWidth: 'max-content' }} />
                              ) : LONG_TEXT.has(c.key) ? (
                                <textarea data-table="ins" data-row={rIdx} data-col={2 + cIdx} className="cell-textarea" defaultValue={r[c.key] || ''} ref={autoResize} onInput={e => autoResize(e.target)} onBlur={e => { if (e.target.value !== (r[c.key] || '')) updateIns(r.id, c.key, e.target.value); }} style={{ textAlign: 'left' }} title={r[c.key] || ''} />
                              ) : (
                                <input data-table="ins" data-row={rIdx} data-col={2 + cIdx} className="cell-input" defaultValue={r[c.key] || ''} onBlur={e => { if (e.target.value !== (r[c.key] || '')) updateIns(r.id, c.key, e.target.value); }} />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '16px 20px', background: '#f8fafc', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  💡 <b>안내:</b> 클릭하여 바로 텍스트를 수정할 수 있으며, <b>[📎 증권 문서 변경]</b> 버튼을 통해 새 PDF를 업로드하면 기존 구글 드라이브 파일과 링크가 자동으로 업데이트(덮어쓰기) 됩니다.
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ─── 처리경과 모달 ─── */}
      {progressModal !== null && modalRow && (
        <div className="modal-overlay" onClick={() => setProgressModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📝 처리경과 일지 — {modalRow.사고명}</h3>
              <button className="modal-close" onClick={() => setProgressModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="timeline">
                {modalRow.진행경과.map((e, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-dot">{i + 1}</div>
                    <div className="timeline-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <div>
                        <div className="timeline-date">{e.date}</div>
                        <div className="timeline-text">{e.text}</div>
                      </div>
                      <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.75rem', color: 'var(--danger)', height: 'fit-content' }} onClick={() => deleteProgressEntry(i)} title="삭제">
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="add-entry">
                <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>+ 진행사항 추가</strong>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                <textarea placeholder="이 날 처리된 내용을 입력하세요…" value={newText} onChange={e => setNewText(e.target.value)} />
                <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={addProgressEntry}>저장</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setProgressModal(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 파일 관리 모달 ─── */}
      {fileManageTarget && (
        <div className="modal-overlay" onClick={() => setFileManageTarget(null)}>
          <div className="modal" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📁 첨부파일 관리</h3>
              <button className="modal-close" onClick={() => setFileManageTarget(null)}>×</button>
            </div>
            <div className="modal-body" style={{ minHeight: '120px' }}>
              {fileManageLoading ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>파일 목록 불러오는 중…</div>
              ) : fileList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>파일이 없습니다.</div>
              ) : (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {fileList.map(f => (
                    <li key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <span style={{ flex: 1, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📄 <a href={f.webViewLink} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{f.name}</a>
                      </span>
                      {f.size && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{(f.size / 1024).toFixed(0)} KB</span>}
                      <button
                        onClick={() => handleFileDelete(f.id)}
                        style={{ padding: '4px 10px', fontSize: '0.78rem', fontWeight: 600, background: 'white', border: '1.5px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        🗑 삭제
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setFileManageTarget(null)}>닫기</button>
              {(() => {
                const row = rows.find(r => r.id === fileManageTarget);
                return row?.driveUrl ? (
                  <button className="btn btn-primary" onClick={() => window.open(row.driveUrl, '_blank')}>☁ 드라이브 폴더 열기</button>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─── 사고 삭제 확인 팝업 ─── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(false)}>
          <div className="modal" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑 사고 삭제 확인</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
                선택한 <strong style={{ color: 'var(--danger)' }}>{checkedRows.size}건</strong>의 사고를 삭제하시겠습니까?<br />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>이 작업은 되돌릴 수 없습니다.</span>
              </p>
              <ul style={{ marginTop: '12px', paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.8 }}>
                {rows.filter(r => checkedRows.has(r.id)).map(r => (
                  <li key={r.id} style={{ color: 'var(--danger)' }}>
                    <strong>{r.사고번호 || '-'}</strong> {r.사고명 || '(사고명 없음)'}
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(false)}>취소</button>
              <button className="btn btn-primary" style={{ background: 'var(--danger)', border: 'none' }} onClick={confirmDelete}>삭제 확인</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 보험 삭제 확인 팝업 ─── */}
      {insDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setInsDeleteConfirm(false)}>
          <div className="modal" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑 보험 삭제 확인</h3>
              <button className="modal-close" onClick={() => setInsDeleteConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
                선택한 <strong style={{ color: 'var(--danger)' }}>{checkedIns.size}건</strong>의 보험 내역을 삭제하시겠습니까?<br />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>이 작업은 되돌릴 수 없습니다.</span>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setInsDeleteConfirm(false)}>취소</button>
              <button className="btn btn-primary" style={{ background: 'var(--danger)', border: 'none' }} onClick={confirmInsDelete}>삭제 확인</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI 신규 사고 접수 모달 ─── */}
      {aiModalOpen && (
        <div className="modal-overlay" onClick={() => !isAiLoading && setAiModalOpen(false)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🤖 AI 신규 사고 자동 접수</h3>
              <button className="modal-close" onClick={() => !isAiLoading && setAiModalOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                이메일, 카카오톡 내용, 현장 사진(캡처) 등을 자유롭게 복사(Ctrl+C)해서 아래에 붙여넣기(Ctrl+V) 하세요.<br />
                AI가 내용을 분석하여 사고 접수 양식을 자동으로 채워줍니다.
              </p>

              <textarea
                style={{ width: '100%', height: '150px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', resize: 'vertical' }}
                placeholder="여기에 텍스트를 입력하거나 이미지(사진/캡처)를 바로 붙여넣기(Ctrl+V) 해보세요."
                value={aiText}
                onChange={e => setAiText(e.target.value)}
                onPaste={handleAiPaste}
                disabled={isAiLoading}
              />

              {aiImages.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                  {aiImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={img.preview} alt="Pasted" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => removeAiImage(idx)}
                        disabled={isAiLoading}
                        style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isAiLoading && (
                <div style={{ textAlign: 'center', padding: '15px 10px', color: 'var(--primary)', fontWeight: 600 }}>
                  <span style={{ display: 'inline-block', marginRight: '8px', animation: 'spin 1s linear infinite' }}>⏳</span> AI가 텍스트와 이미지를 분석하고 있습니다...
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAiModalOpen(false)} disabled={isAiLoading}>취소</button>
              <button className="btn btn-primary" onClick={handleAiSubmit} disabled={isAiLoading || (!aiText.trim() && aiImages.length === 0)}>
                ✨ AI 자동 분석 시작
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
