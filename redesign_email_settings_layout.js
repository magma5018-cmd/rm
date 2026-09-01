const fs = require('fs');

const pagePath = 'd:/사고관리시스템/web-app/src/app/page.js';
let content = fs.readFileSync(pagePath, 'utf8');

// 이메일 설정 UI 블록 전체를 스마트 2분할(Left 50%, Right 50%) & 스마트 아코디언(ON/OFF 접기)으로 전면 교체
const startMarker = `{/* ════════ ⚙️ 이메일 발송 설정 (수신인 지정 & 지메일/ECHO 전송) ════════ */}`;
const endMarker = `{/* 🖥️ 실시간 테스트 발송 진행 로그 (상태 모니터링) */}`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(`{/* ════════ 🤖 AI 모델 및 API 키 설정 ════════ */}`);

if (startIndex !== -1 && endIndex !== -1) {
  const newEmailSettingsSection = `{/* ════════ ⚙️ 이메일 발송 설정 (스마트 50:50 2분할 & 아코디언 레이아웃) ════════ */}
          {activeMenu === 'email_settings' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
              
              {/* 👈 [왼쪽 50%] Gmail / ECHO 아코디언 전송 설정 박스 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* 1️⃣ Gmail 설정 카드 (ON/OFF에 따라 접힘/펼침) */}
                <div className="panel" style={{ padding: '24px', background: activeSmtpEngine === 'gmail' ? '#ffffff' : '#f8fafc', borderRadius: '14px', border: activeSmtpEngine === 'gmail' ? '2px solid #22c55e' : '1px solid var(--border)', transition: 'all 0.25s ease' }}>
                  
                  {/* 카드 헤더 (클릭 시 토글 접기/펼치기 가능) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setActiveSmtpEngine(activeSmtpEngine === 'gmail' ? 'none' : 'gmail')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.4rem' }}>📧</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>주간 자동 이메일 발송 설정 (Gmail 계정)</h2>
                          {activeSmtpEngine === 'gmail' ? (
                            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '99px' }}>현재 실전 작동 중 (1순위)</span>
                          ) : (
                            <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px' }}>대기 상태 (OFF)</span>
                          )}
                        </div>
                        {activeSmtpEngine === 'gmail' && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                            구글 지메일(Gmail) 메일 서버를 활용해 사외 차단 없이 100% 자동 전송 및 요약을 수행합니다.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ON / OFF 스위치 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: activeSmtpEngine === 'gmail' ? '#22c55e' : '#94a3b8' }}>
                        {activeSmtpEngine === 'gmail' ? '● ON (사용중)' : '○ OFF'}
                      </span>
                      <button 
                        onClick={() => setActiveSmtpEngine(activeSmtpEngine === 'gmail' ? 'none' : 'gmail')}
                        style={{
                          width: '46px', height: '24px', borderRadius: '99px',
                          background: activeSmtpEngine === 'gmail' ? '#22c55e' : '#cbd5e1',
                          border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s ease'
                        }}
                      >
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                          position: 'absolute', top: '3px',
                          left: activeSmtpEngine === 'gmail' ? '25px' : '3px',
                          transition: 'left 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      </button>
                    </div>
                  </div>

                  {/* ON 상태일 때만 세부 폼 쫘악 펼침 (OFF일 때는 1줄 헤더만 세련되게 표시) */}
                  {activeSmtpEngine === 'gmail' && (
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                      
                      {/* 수신인 태그 목록 */}
                      <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#166534' }}>
                          📩 수신인(To) 이메일 목록 (쉼표 , 또는 Enter 입력)
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', minHeight: '38px', padding: '6px 10px', background: '#ffffff', border: '1px solid var(--border)', borderRadius: '6px' }}>
                          {recipientsList.map((email, idx) => (
                            <span key={idx} style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid #bae6fd', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              ✉️ {email}
                              <button 
                                onClick={() => setRecipientsList(recipientsList.filter((_, i) => i !== idx))}
                                style={{ background: 'transparent', border: 'none', color: '#0284c7', fontSize: '0.85rem', cursor: 'pointer', padding: 0, fontWeight: 800 }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                          <input 
                            type="text"
                            value={recipientInput}
                            onChange={e => {
                              const val = e.target.value;
                              if (val.includes(',') || val.includes(';')) {
                                const parts = val.split(/[,;]/).map(s => s.trim()).filter(Boolean);
                                setRecipientsList([...new Set([...recipientsList, ...parts])]);
                                setRecipientInput('');
                              } else {
                                setRecipientInput(val);
                              }
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (recipientInput.trim()) {
                                  const clean = recipientInput.trim();
                                  if (!recipientsList.includes(clean)) setRecipientsList([...recipientsList, clean]);
                                  setRecipientInput('');
                                }
                              }
                            }}
                            placeholder="수신 이메일 작성 후 쉼표 입력..."
                            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.82rem', flex: 1, minWidth: '150px' }}
                          />
                        </div>
                      </div>

                      {/* 세부 옵션 입력 폼 */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>👤 발신자 성명</label>
                          <input type="text" value={emailSettings.senderName || '마형석'} onChange={e => setEmailSettings({ ...emailSettings, senderName: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>📧 지메일 주소</label>
                          <input type="email" value={emailSettings.aiGmail || 'magma5018@gmail.com'} onChange={e => setEmailSettings({ ...emailSettings, aiGmail: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>🔑 앱 비밀번호 (16자리)</label>
                          <input type="password" value={emailSettings.gmailAppPassword || 'gojffulntemnfqfy'} onChange={e => setEmailSettings({ ...emailSettings, gmailAppPassword: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>👥 숨은참조 (BCC)</label>
                          <input type="email" value={emailSettings.bccEmail} onChange={e => setEmailSettings({ ...emailSettings, bccEmail: e.target.value })} placeholder="bcc@company.com" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>⏱️ AI 답장 수신 감지 주기</label>
                          <select value={emailSettings.checkInterval || '5'} onChange={e => setEmailSettings({ ...emailSettings, checkInterval: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', fontSize: '0.85rem' }}>
                            <option value="1">매 1분 마다 (실시간)</option>
                            <option value="5">매 5분 마다 (권장)</option>
                            <option value="15">매 15분 마다</option>
                            <option value="30">매 30분 마다</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>📅 자동 발송 요일/시간</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <select value={emailSettings.sendDay} onChange={e => setEmailSettings({ ...emailSettings, sendDay: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', fontSize: '0.82rem' }}>
                              <option value="MON">월요일</option>
                              <option value="TUE">화요일</option>
                              <option value="WED">수요일</option>
                              <option value="THU">목요일</option>
                              <option value="FRI">금요일</option>
                            </select>
                            <select value={emailSettings.sendTime} onChange={e => setEmailSettings({ ...emailSettings, sendTime: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', fontSize: '0.82rem' }}>
                              <option value="08:00">08:00</option>
                              <option value="09:00">09:00</option>
                              <option value="14:00">14:00</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 모음 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <button 
                          className="btn"
                          disabled={isTestingEmail}
                          style={{ background: '#22c55e', color: 'white', border: 'none', padding: '8px 14px', fontWeight: 700, fontSize: '0.8rem' }}
                          onClick={async () => {
                            setIsTestingEmail(true);
                            const time = new Date().toLocaleTimeString('ko-KR');
                            setTestEmailLogs([
                              \`[\${time}] 🔄 Gmail 메일 서버(smtp.gmail.com:587) 접속 중...\`,
                              \`[\${time}] 🔑 지메일 계정(\${emailSettings.aiGmail || 'magma5018@gmail.com'}) 앱 비밀번호 인증 중...\`
                            ]);
                            try {
                              const res = await fetch('/api/email/test', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  ...emailSettings,
                                  smtpHost: 'smtp.gmail.com',
                                  smtpPort: '587',
                                  fromEmail: recipientsList.join(', '),
                                  aiGmail: emailSettings.aiGmail || 'magma5018@gmail.com',
                                  username: emailSettings.aiGmail || 'magma5018@gmail.com',
                                  password: emailSettings.gmailAppPassword || 'gojffulntemnfqfy'
                                })
                              });
                              const data = await res.json();
                              const t2 = new Date().toLocaleTimeString('ko-KR');
                              if (data.success) {
                                setTestEmailLogs(prev => [
                                  ...prev,
                                  \`[\${t2}] ✅ Gmail 접속 및 인증 100% 성공!\`,
                                  \`[\${t2}] 🎉 [실제 발송 성공] 지메일 서버를 통해 메일이 수신함으로 전달되었습니다!\`
                                ]);
                              } else {
                                setTestEmailLogs(prev => [...prev, \`[\${t2}] ❌ [Gmail 발송 에러] \${data.error}\`]);
                              }
                            } catch (err) {
                              const t2 = new Date().toLocaleTimeString('ko-KR');
                              setTestEmailLogs(prev => [...prev, \`[\${t2}] ❌ [통신 오류] \${err.message}\`]);
                            } finally {
                              setIsTestingEmail(false);
                            }
                          }}
                        >
                          ✉️ 테스트 발송
                        </button>
                        <button 
                          className="btn" 
                          disabled={isTestingEmail}
                          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 14px', fontWeight: 800 }}
                          onClick={async () => {
                            const validTargetRows = rows.filter(r => (r.autoEmail === 'Y' || r.autoEmail === 'y') && r.managerEmail && typeof r.managerEmail === 'string' && r.managerEmail.includes('@'));
                            if (validTargetRows.length === 0) {
                              alert('⚠️ 발송 가능한 대상이 없습니다!\n\n* 조건: [자동발송(Y/N)] 열이 "Y"로 설정되어 있고, [담당자 이메일] 열에 실제 이메일 주소가 작성되어 있는 사고만 발송됩니다.');
                              return;
                            }
                            if (!confirm(\`🚀 담당자 이메일이 등록된 \${validTargetRows.length}건의 사고 리포트를 해당 담당자에게 즉시 발송하시겠습니까?\`)) return;

                            setIsTestingEmail(true);
                            const time = new Date().toLocaleTimeString('ko-KR');
                            const targetSummary = validTargetRows.map(r => \`[\${r.사고번호}] \${r.담당자 || '담당자'}(\${r.managerEmail})\`).join(', ');
                            
                            setTestEmailLogs([
                              \`[\${time}] 🚀 사고 리포트 이메일 발송 시작 (발송 대상: 총 \${validTargetRows.length}건)...\`,
                              \`[\${time}] 🔍 [발송 타겟 수신자] \${targetSummary}\`,
                              \`[\${time}] 📤 지메일 메일 서버(smtp.gmail.com:587)로 1:1 리포트 패킷 전송 중...\`
                            ]);

                            try {
                              const res = await fetch('/api/email/send-reports', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  senderName: emailSettings.senderName || '마형석',
                                  fromEmail: emailSettings.aiGmail || 'magma5018@gmail.com',
                                  toEmails: recipientsList,
                                  bccEmail: emailSettings.bccEmail,
                                  aiGmail: emailSettings.aiGmail || 'magma5018@gmail.com',
                                  smtpHost: 'smtp.gmail.com',
                                  smtpPort: '587',
                                  username: emailSettings.aiGmail || 'magma5018@gmail.com',
                                  password: emailSettings.gmailAppPassword || 'gojffulntemnfqfy',
                                  rows: validTargetRows
                                })
                              });
                              const data = await res.json();
                              const tFinal = new Date().toLocaleTimeString('ko-KR');
                              if (data.success) {
                                const details = (data.sentResults || []).map(item => \`[\${tFinal}] ✅ [전송 성공] 사고번호: \${item.accNo} ➔ 수신자: \${item.recipient}\`);
                                setTestEmailLogs(prev => [
                                  ...prev,
                                  ...details,
                                  \`[\${tFinal}] 🎉 \${data.message || '담당자 지정 사고 리포트가 성공적으로 발송되었습니다.'}\`
                                ]);
                                alert(\`🎉 [발송 완료]\\n총 \${data.sentCount || validTargetRows.length}건의 사고 리포트가 담당자 이메일로 1:1 발송되었습니다.\`);
                              } else {
                                setTestEmailLogs(prev => [...prev, \`[\${tFinal}] ❌ 발송 오류: \${data.error}\`]);
                                alert('❌ 발송 오류: ' + data.error);
                              }
                            } catch (err) {
                              const tFinal = new Date().toLocaleTimeString('ko-KR');
                              setTestEmailLogs(prev => [...prev, \`[\${tFinal}] ❌ 통신 에러: \${err.message}\`]);
                              alert('❌ 통신 에러: ' + err.message);
                            } finally {
                              setIsTestingEmail(false);
                            }
                          }}
                        >
                          🚀 리포트 전체 발송
                        </button>
                        <button 
                          className="btn" 
                          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '8px 12px', fontWeight: 600, fontSize: '0.8rem' }}
                          onClick={async () => {
                            setIsTestingEmail(true);
                            const time = new Date().toLocaleTimeString('ko-KR');
                            setTestEmailLogs(prev => [...prev, \`[\${time}] 📥 지메일함(\${emailSettings.aiGmail}) IMAP 접속 중...\`]);
                            try {
                              const res = await fetch('/api/email/fetch-replies', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(emailSettings)
                              });
                              const data = await res.json();
                              const t2 = new Date().toLocaleTimeString('ko-KR');
                              if (data.success) {
                                setTestEmailLogs(prev => [
                                  ...prev,
                                  \`[\${t2}] ✅ 지메일함 접속 성공!\`,
                                  \`[\${t2}] 📥 읽지 않은 사고 답장 메일 \${data.processedCount}건 감지 및 시트 업데이트 완료!\`,
                                  ...(data.items || []).map(item => \`[\${t2}] 🎯 사고번호: \${item.accidentNo} | 요약: \${item.summary}\`)
                                ]);
                              } else {
                                setTestEmailLogs(prev => [...prev, \`[\${t2}] ❌ [지메일 수신 실패] \${data.error}\`]);
                              }
                            } catch (err) {
                              const t2 = new Date().toLocaleTimeString('ko-KR');
                              setTestEmailLogs(prev => [...prev, \`[\${t2}] ❌ [지메일 접속 오류] \${err.message}\`]);
                            } finally {
                              setIsTestingEmail(false);
                            }
                          }}
                        >
                          📥 AI 답장 수신
                        </button>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '8px 16px', fontWeight: 700, fontSize: '0.8rem' }} 
                          onClick={() => {
                            alert('🎉 Gmail 계정 설정이 정상적으로 저장되었습니다.');
                          }}
                        >
                          💾 설정 저장
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2️⃣ ECHO 계정 설정 카드 (OFF 상태 시 1줄 컴팩트 헤더로 깔끔하게 접어둠) */}
                <div className="panel" style={{ padding: '24px', background: activeSmtpEngine === 'echo' ? '#ffffff' : '#f8fafc', borderRadius: '14px', border: activeSmtpEngine === 'echo' ? '2px solid #3b82f6' : '1px solid var(--border)', transition: 'all 0.25s ease' }}>
                  
                  {/* 카드 헤더 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setActiveSmtpEngine(activeSmtpEngine === 'echo' ? 'none' : 'echo')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.4rem' }}>🏢</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>주간 자동 이메일 발송 설정 (ECHO 계정)</h2>
                          {activeSmtpEngine === 'echo' ? (
                            <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '99px' }}>현재 작동 중</span>
                          ) : (
                            <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px' }}>대기 상태 (OFF)</span>
                          )}
                        </div>
                        {activeSmtpEngine === 'echo' && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                            한솔 사내 메일 서버(echohub.hansol.com:25)를 통해 내부 담당자들에게 메일을 전송합니다.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ON / OFF 스위치 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: activeSmtpEngine === 'echo' ? '#3b82f6' : '#94a3b8' }}>
                        {activeSmtpEngine === 'echo' ? '● ON (사용중)' : '○ OFF'}
                      </span>
                      <button 
                        onClick={() => setActiveSmtpEngine(activeSmtpEngine === 'echo' ? 'none' : 'echo')}
                        style={{
                          width: '46px', height: '24px', borderRadius: '99px',
                          background: activeSmtpEngine === 'echo' ? '#3b82f6' : '#cbd5e1',
                          border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s ease'
                        }}
                      >
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                          position: 'absolute', top: '3px',
                          left: activeSmtpEngine === 'echo' ? '25px' : '3px',
                          transition: 'left 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      </button>
                    </div>
                  </div>

                  {/* ECHO ON 상태일 때 펼침 */}
                  {activeSmtpEngine === 'echo' && (
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>👤 사용자 이름</label>
                          <input type="text" placeholder="예: 마형석" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>📧 전자 메일 주소</label>
                          <input type="email" placeholder="mhs810@hansol.com" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" style={{ padding: '8px 16px', fontWeight: 700, fontSize: '0.8rem' }}>💾 ECHO 설정 저장</button>
                      </div>
                    </div>
                  )}

                </div>

              </div>


              {/* 👉 [오른쪽 50%] 실시간 테스트 발송 진행 로그 (상태 모니터링) 전면 고정 */}
              <div className="panel" style={{ padding: '24px', background: '#0f172a', color: '#f8fafc', borderRadius: '14px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid #1e293b', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
                
                {/* 로그 헤더 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🖥️</span>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#60a5fa' }}>실시간 테스트 발송 진행 로그 (상태 모니터링)</h3>
                  </div>
                  {testEmailLogs.length > 0 && (
                    <button 
                      onClick={() => setTestEmailLogs([])} 
                      style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      🗑️ 로그 지우기
                    </button>
                  )}
                </div>

                {/* 로그 콘솔 박스 */}
                <div style={{ flex: 1, background: '#020617', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.6, overflowY: 'auto', maxHeight: '500px' }}>
                  {testEmailLogs.length === 0 ? (
                    <div style={{ color: '#475569', textAlign: 'center', marginTop: '140px' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📡</div>
                      발송 버튼이나 AI 수신 테스트 버튼을 클릭하시면<br/>실시간 진행 상태 및 모니터링 로그가 여기에 표시됩니다.
                    </div>
                  ) : (
                    testEmailLogs.map((log, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          marginBottom: '6px', 
                          wordBreak: 'break-all',
                          color: log.includes('❌') ? '#f87171' : (log.includes('✅') || log.includes('🎉') ? '#4ade80' : '#93c5fd')
                        }}
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>
          )}`;

  content = content.substring(0, startIndex) + newEmailSettingsSection + content.substring(endIndex);
  fs.writeFileSync(pagePath, content, 'utf8');
  console.log('REDESIGN_EMAIL_SETTINGS_LAYOUT_SUCCESSFUL');
} else {
  console.log('MARKER_NOT_FOUND', startIndex, endIndex);
}
