const fs = require('fs');
const path = require('path');

// 1. page.js 수정
const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.js');
let pageContent = fs.readFileSync(pagePath, 'utf8').replace(/\r\n/g, '\n');

// 1-1. 상태 정의 추가
const targetState = "  const [qCarriageType, setQCarriageType] = useState(''); // 'international' | 'domestic'";
const replacementState = `  const [qCarriageType, setQCarriageType] = useState(''); // 'international' | 'domestic'

  // 인명 및 물적 피해 상세 정보 상태
  const [qHumanInjury, setQHumanInjury] = useState('N'); // 'N' | 'Y'
  const [qHumanInjuryDetails, setQHumanInjuryDetails] = useState('');
  const [qInjuryName, setQInjuryName] = useState('');
  const [qInjuryGender, setQInjuryGender] = useState('');
  const [qInjuryAge, setQInjuryAge] = useState('');
  const [qInjuryNationality, setQInjuryNationality] = useState('');
  const [qInjuryAffiliation, setQInjuryAffiliation] = useState('');
  const [qInjuryWorkType, setQInjuryWorkType] = useState('');
  const [qInjuryEmployType, setQInjuryEmployType] = useState('');
  const [qInjuryJob, setQInjuryJob] = useState('');
  const [qInjuryPart, setQInjuryPart] = useState('');
  const [qInjuryType, setQInjuryType] = useState('');
  const [qInjurySeverity, setQInjurySeverity] = useState('');
  const [qPropertyAsset, setQPropertyAsset] = useState('');
  const [qPropertyCause, setQPropertyCause] = useState('');
  const [qPropertyCost, setQPropertyCost] = useState('');
  const [qRiskSeverity, setQRiskSeverity] = useState('');
  const [qRiskProbability, setQRiskProbability] = useState('');`;

if (pageContent.includes(targetState)) {
  pageContent = pageContent.replace(targetState, replacementState);
  console.log('1-1. Successfully added states to page.js');
} else {
  console.log('1-1. Failed to find state injection target in page.js');
}

// 1-2. resetQuestionnaire 추가
const targetReset = "    setQCarriageType('');";
const replacementReset = `    setQCarriageType('');
    setQHumanInjury('N');
    setQHumanInjuryDetails('');
    setQInjuryName('');
    setQInjuryGender('');
    setQInjuryAge('');
    setQInjuryNationality('');
    setQInjuryAffiliation('');
    setQInjuryWorkType('');
    setQInjuryEmployType('');
    setQInjuryJob('');
    setQInjuryPart('');
    setQInjuryType('');
    setQInjurySeverity('');
    setQPropertyAsset('');
    setQPropertyCause('');
    setQPropertyCost('');
    setQRiskSeverity('');
    setQRiskProbability('');`;

if (pageContent.includes(targetReset)) {
  pageContent = pageContent.replace(targetReset, replacementReset);
  console.log('1-2. Successfully added reset states to page.js');
} else {
  console.log('1-2. Failed to find reset target in page.js');
}

// 1-3. 유효성 검사 추가 (2군데)
const targetValidation1 = `        if (!qCarriageType) {
          alert('운송 종류를 선택해 주세요.');
          return;
        }
        setReportStep(2);`;

const replacementValidation1 = `        if (!qCarriageType) {
          alert('운송 종류를 선택해 주세요.');
          return;
        }
        if (qHumanInjury === 'Y') {
          if (!qInjuryName.trim()) { alert('재해자 성명을 입력해 주세요.'); return; }
          if (!qInjuryGender) { alert('재해자 성별을 선택해 주세요.'); return; }
          if (!qInjuryAge.trim()) { alert('재해자 나이를 입력해 주세요.'); return; }
          if (!qInjuryAffiliation.trim()) { alert('재해자 소속을 입력해 주세요.'); return; }
          if (!qInjuryPart.trim()) { alert('상해부위를 입력해 주세요.'); return; }
          if (!qInjuryType.trim()) { alert('상해종류를 입력해 주세요.'); return; }
          if (!qInjurySeverity) { alert('상해정도를 선택해 주세요.'); return; }
          if (!qRiskSeverity) { alert('사고 심각도를 선택해 주세요.'); return; }
          if (!qRiskProbability) { alert('사고 발생가능성을 선택해 주세요.'); return; }
          if (!qHumanInjuryDetails.trim()) { alert('인명 피해 상세 내용을 입력해 주세요.'); return; }
        }
        setReportStep(2);`;

if (pageContent.includes(targetValidation1)) {
  pageContent = pageContent.replace(targetValidation1, replacementValidation1);
  console.log('1-3a. Successfully updated step 1 validation block in page.js');
} else {
  console.log('1-3a. Failed to find step 1 validation block in page.js');
}

const targetValidation2 = `    if (!qCarriageType) {
      alert('운송 종류를 선택해 주세요.');
      return;
    }`;

const replacementValidation2 = `    if (!qCarriageType) {
      alert('운송 종류를 선택해 주세요.');
      return;
    }

    if (qHumanInjury === 'Y') {
      if (!qInjuryName.trim()) { alert('재해자 성명을 입력해 주세요.'); return; }
      if (!qInjuryGender) { alert('재해자 성별을 선택해 주세요.'); return; }
      if (!qInjuryAge.trim()) { alert('재해자 나이를 입력해 주세요.'); return; }
      if (!qInjuryAffiliation.trim()) { alert('재해자 소속을 입력해 주세요.'); return; }
      if (!qInjuryPart.trim()) { alert('상해부위를 입력해 주세요.'); return; }
      if (!qInjuryType.trim()) { alert('상해종류를 입력해 주세요.'); return; }
      if (!qInjurySeverity) { alert('상해정도를 선택해 주세요.'); return; }
      if (!qRiskSeverity) { alert('사고 심각도를 선택해 주세요.'); return; }
      if (!qRiskProbability) { alert('사고 발생가능성을 선택해 주세요.'); return; }
      if (!qHumanInjuryDetails.trim()) { alert('인명 피해 상세 내용을 입력해 주세요.'); return; }
    }`;

if (pageContent.includes(targetValidation2)) {
  pageContent = pageContent.replace(targetValidation2, replacementValidation2);
  console.log('1-3b. Successfully updated submission validation block in page.js');
} else {
  console.log('1-3b. Failed to find submission validation block in page.js');
}

// 1-4. Payload 추가
const targetPayload = `        qCarriageType,`;
const replacementPayload = `        qCarriageType,
        qHumanInjury,
        qInjuryName,
        qInjuryGender,
        qInjuryAge,
        qInjuryNationality,
        qInjuryAffiliation,
        qInjuryWorkType,
        qInjuryEmployType,
        qInjuryJob,
        qInjuryPart,
        qInjuryType,
        qInjurySeverity,
        qPropertyAsset,
        qPropertyCause,
        qPropertyCost,
        qRiskSeverity,
        qRiskProbability,
        qRiskRating: (qRiskSeverity && qRiskProbability) ? (parseInt(qRiskSeverity) * parseInt(qRiskProbability)).toString() : '',
        qHumanInjuryDetails,`;

if (pageContent.includes(targetPayload)) {
  pageContent = pageContent.replace(targetPayload, replacementPayload);
  console.log('1-4. Successfully updated payload in page.js');
} else {
  console.log('1-4. Failed to find payload target in page.js');
}

// 1-5. UI Form 렌더링 치환
const targetUI = `                      <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px', fontSize: '0.78rem' }}>AI가 완성한 최종 보고서가 전송될 본인의 사내 웹메일 주소와 관련 부서 담당 정보를 정확히 입력해 주세요.</small>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>Q1. 운송 종류 선택 <span style={{ color: 'var(--danger)' }}>*</span></label>`;

const replacementUI = `                      <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px', fontSize: '0.78rem' }}>AI가 완성한 최종 보고서가 전송될 본인의 사내 웹메일 주소와 관련 부서 담당 정보를 정확히 입력해 주세요.</small>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>Q0-1. 인명 사고 발생 여부 <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <div style={{ display: 'flex', gap: '20px', marginBottom: qHumanInjury === 'Y' ? '8px' : '0px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: qHumanInjury === 'N' ? 700 : 500 }}>
                          <input
                            type="radio"
                            name="qHumanInjury"
                            value="N"
                            checked={qHumanInjury === 'N'}
                            onChange={() => {
                              setQHumanInjury('N');
                              setQHumanInjuryDetails('');
                              setQInjuryName('');
                              setQInjuryGender('');
                              setQInjuryAge('');
                              setQInjuryNationality('');
                              setQInjuryAffiliation('');
                              setQInjuryWorkType('');
                              setQInjuryEmployType('');
                              setQInjuryJob('');
                              setQInjuryPart('');
                              setQInjuryType('');
                              setQInjurySeverity('');
                              setQPropertyAsset('');
                              setQPropertyCause('');
                              setQPropertyCost('');
                              setQRiskSeverity('');
                              setQRiskProbability('');
                            }}
                          />
                          없음 (N)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: qHumanInjury === 'Y' ? 700 : 500 }}>
                          <input
                            type="radio"
                            name="qHumanInjury"
                            value="Y"
                            checked={qHumanInjury === 'Y'}
                            onChange={() => setQHumanInjury('Y')}
                          />
                          있음 (Y)
                        </label>
                      </div>

                      {qHumanInjury === 'Y' && (
                        <div style={{
                          marginTop: '16px',
                          padding: '20px',
                          background: '#f8fafc',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px'
                        }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)' }}>🩺 인명 피해 상세 정보 입력</h4>
                          
                          {/* 1. 재해자 인적사항 */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>재해자 성명 <span style={{ color: 'var(--danger)' }}>*</span></label>
                              <input type="text" value={qInjuryName} onChange={(e) => setQInjuryName(e.target.value)} style={inputStyle} placeholder="성명" required={qHumanInjury === 'Y'} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>성별 <span style={{ color: 'var(--danger)' }}>*</span></label>
                              <select value={qInjuryGender} onChange={(e) => setQInjuryGender(e.target.value)} style={selectStyle} required={qHumanInjury === 'Y'}>
                                <option value="">선택</option>
                                <option value="남">남</option>
                                <option value="여">여</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>나이 <span style={{ color: 'var(--danger)' }}>*</span></label>
                              <input type="text" value={qInjuryAge} onChange={(e) => setQInjuryAge(e.target.value.replace(/[^0-9]/g, ''))} style={inputStyle} placeholder="나이(숫자)" required={qHumanInjury === 'Y'} />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>국적</label>
                              <input type="text" value={qInjuryNationality} onChange={(e) => setQInjuryNationality(e.target.value)} style={inputStyle} placeholder="예: 대한민국" />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>소속 <span style={{ color: 'var(--danger)' }}>*</span></label>
                              <input type="text" value={qInjuryAffiliation} onChange={(e) => setQInjuryAffiliation(e.target.value)} style={inputStyle} placeholder="예: 본사, 협력업체명" required={qHumanInjury === 'Y'} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>직종</label>
                              <input type="text" value={qInjuryJob} onChange={(e) => setQInjuryJob(e.target.value)} style={inputStyle} placeholder="예: 물류관리, 운전원" />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>근무형태</label>
                              <input type="text" value={qInjuryWorkType} onChange={(e) => setQInjuryWorkType(e.target.value)} style={inputStyle} placeholder="예: 상근, 교대근무" />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>고용형태</label>
                              <input type="text" value={qInjuryEmployType} onChange={(e) => setQInjuryEmployType(e.target.value)} style={inputStyle} placeholder="예: 정규직, 계약직, 지입차주" />
                            </div>
                          </div>

                          {/* 2. 상해 정보 */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>상해부위 <span style={{ color: 'var(--danger)' }}>*</span></label>
                              <input type="text" value={qInjuryPart} onChange={(e) => setQInjuryPart(e.target.value)} style={inputStyle} placeholder="예: 손가락, 허리 등" required={qHumanInjury === 'Y'} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>상해종류 <span style={{ color: 'var(--danger)' }}>*</span></label>
                              <input type="text" value={qInjuryType} onChange={(e) => setQInjuryType(e.target.value)} style={inputStyle} placeholder="예: 골절, 타박상 등" required={qHumanInjury === 'Y'} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>상해정도 <span style={{ color: 'var(--danger)' }}>*</span></label>
                              <select value={qInjurySeverity} onChange={(e) => setQInjurySeverity(e.target.value)} style={selectStyle} required={qHumanInjury === 'Y'}>
                                <option value="">선택</option>
                                <option value="경상">경상</option>
                                <option value="중상">중상</option>
                                <option value="사망">사망</option>
                                <option value="기타">기타</option>
                              </select>
                            </div>
                          </div>

                          {/* 3. 물적 피해 정보 */}
                          <h4 style={{ margin: '8px 0 4px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)' }}>🏗️ 물적 피해 정보 입력</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>물적 자산명</label>
                              <input type="text" value={qPropertyAsset} onChange={(e) => setQPropertyAsset(e.target.value)} style={inputStyle} placeholder="예: 지게차, 랙 설비 등" />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>물적 손상원인</label>
                              <input type="text" value={qPropertyCause} onChange={(e) => setQPropertyCause(e.target.value)} style={inputStyle} placeholder="예: 충돌, 추락" />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>물적 피해비용 (원)</label>
                              <input type="text" value={qPropertyCost} onChange={(e) => setQPropertyCost(e.target.value.replace(/[^0-9]/g, ''))} style={inputStyle} placeholder="숫자만 입력" />
                            </div>
                          </div>

                          {/* 4. 사고 위험 평가 */}
                          <h4 style={{ margin: '8px 0 4px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)' }}>⚠️ 사고 위험성 평가</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>사고 심각도 (1~5) <span style={{ color: 'var(--danger)' }}>*</span></label>
                              <select value={qRiskSeverity} onChange={(e) => setQRiskSeverity(e.target.value)} style={selectStyle} required={qHumanInjury === 'Y'}>
                                <option value="">선택</option>
                                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>사고 발생가능성 (1~5) <span style={{ color: 'var(--danger)' }}>*</span></label>
                              <select value={qRiskProbability} onChange={(e) => setQRiskProbability(e.target.value)} style={selectStyle} required={qHumanInjury === 'Y'}>
                                <option value="">선택</option>
                                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>사고 위험등급 (자동 계산)</label>
                              <input type="text" value={(qRiskSeverity && qRiskProbability) ? (parseInt(qRiskSeverity) * parseInt(qRiskProbability)) : ''} style={{ ...inputStyle, background: '#e2e8f0', fontWeight: 'bold' }} disabled placeholder="심각도 x 발생가능성" />
                            </div>
                          </div>

                          {/* 5. 기존 간략내용 */}
                          <div style={{ marginTop: '8px' }}>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>인명 피해 상세 내용 (종합) <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input
                              type="text"
                              value={qHumanInjuryDetails}
                              onChange={(e) => setQHumanInjuryDetails(e.target.value)}
                              placeholder="예: 지입차주 1명 타박상 (병원 치료 후 귀가)"
                              style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                              required={qHumanInjury === 'Y'}
                            />
                            <small style={{ color: 'var(--danger)', display: 'block', marginTop: '4px', fontSize: '0.78rem' }}>* 인명 피해 상황(부상자 수, 상태 등)을 간략히 기술해 주세요.</small>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>Q1. 운송 종류 선택 <span style={{ color: 'var(--danger)' }}>*</span></label>`;

if (pageContent.includes(targetUI)) {
  pageContent = pageContent.replace(targetUI, replacementUI);
  console.log('1-5. Successfully replaced UI Form in page.js');
} else {
  console.log('1-5. Failed to find UI Form target in page.js');
}

// 1-6. 국외 내륙운송 옵션 추가
const targetIntlMode = `{['FCL 해상수출', 'LCL 해상수출', '항공수출', '해상수입', '항공수입'].map(opt => <option key={opt} value={opt}>{opt}</option>)}`;
const replacementIntlMode = `{['FCL 해상수출', 'LCL 해상수출', '항공수출', '해상수입', '항공수입', '국외 내륙운송'].map(opt => <option key={opt} value={opt}>{opt}</option>)}`;

if (pageContent.includes(targetIntlMode)) {
  pageContent = pageContent.replace(targetIntlMode, replacementIntlMode);
  console.log('1-6. Successfully added 국외 내륙운송 to page.js');
} else {
  console.log('1-6. Failed to find target IntlMode in page.js');
}

fs.writeFileSync(pagePath, pageContent, 'utf8');


// 2. api/report/route.js 수정
const apiPath = path.join(__dirname, '..', 'src', 'app', 'api', 'report', 'route.js');
let apiContent = fs.readFileSync(apiPath, 'utf8').replace(/\r\n/g, '\n');

// HEADERS 배열 수정
const oldHeaders = `  '상세 사고 경위',
  '드라이브URL'
];`;

const newHeaders = `  '상세 사고 경위',
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
];`;

if (apiContent.includes(oldHeaders)) {
  apiContent = apiContent.replace(oldHeaders, newHeaders);
  console.log('2-1. Successfully updated HEADERS in API route.js');
} else {
  console.log('2-1. Failed to update HEADERS in API route.js');
}

// rowData 배열 수정
const oldRowData = `      body.qDetails || '',                // 38. 상세 사고 경위 (Q19)
      body.driveUrl || ''                 // 39. 드라이브URL (Q20)
    ];`;

const newRowData = `      body.qDetails || '',                // 38. 상세 사고 경위 (Q19)
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
    ];`;

if (apiContent.includes(oldRowData)) {
  apiContent = apiContent.replace(oldRowData, newRowData);
  console.log('2-2. Successfully updated rowData in API route.js');
} else {
  console.log('2-2. Failed to update rowData in API route.js');
}

// AZ -> BZ 범위 수정
apiContent = apiContent.replace(/:AZ1/g, ':BZ1');
apiContent = apiContent.replace(/:AZ\$\{rowNumber\}/g, ':BZ\${rowNumber}');
console.log('2-3. Successfully updated Excel ranges from AZ to BZ');

fs.writeFileSync(apiPath, apiContent, 'utf8');
console.log('All file updates completed.');
