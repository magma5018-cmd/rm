const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/page.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Copy button replacement
const oldCopy = 'navigator.clipboard.writeText(aiReportText);';
const newCopy = 'navigator.clipboard.writeText(editedReportText);';
if (content.includes(oldCopy)) {
  content = content.replace(oldCopy, newCopy);
  console.log('1. Copy button replacement successful');
} else {
  console.log('1. Copy button already replaced or not found');
}

// 2. Div to Textarea replacement
const targetDivStr = `<div style={{
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
                            {aiReportText ? renderMarkdown(aiReportText) : '보고서 생성 결과를 불러오는 데 실패했습니다. 다시 시도해 주세요.'}
                          </div>`;

const textareaReplacement = `                          <textarea
                            value={editedReportText}
                            onChange={(e) => setEditedReportText(e.target.value)}
                            style={{
                              flex: 1,
                              overflowY: 'auto',
                              padding: '20px',
                              background: '#f8fafc',
                              border: '1px solid var(--border)',
                              borderRadius: '12px',
                              height: '38vh',
                              minHeight: '260px',
                              maxHeight: '44vh',
                              fontFamily: 'inherit',
                              fontSize: '0.92rem',
                              lineHeight: 1.6,
                              color: '#1e293b',
                              resize: 'vertical',
                              outline: 'none'
                            }}
                            placeholder="보고서 생성 결과를 불러오는 데 실패했습니다. 다시 시도해 주세요."
                          />`;

// Escape function for regex helper
function escapeRegExp(string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

const escapedDiv = escapeRegExp(targetDivStr).replace(/\s+/g, '\\s+');
const regexDiv = new RegExp(escapedDiv);

if (regexDiv.test(content)) {
  content = content.replace(regexDiv, textareaReplacement);
  console.log('2. Div to Textarea replacement successful');
} else {
  console.log('2. Target div not found');
}

// 3. Tip box replacement
const oldBlock = `<div style={{ background: '#eff6ff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                            <p style={{ fontSize: '0.82rem', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
                              💡 <strong>입력한 내용에 오타나 오류가 있으신가요?</strong> <br />
                              하단의 <strong>[수정하고 다시 쓰기]</strong> 버튼을 누르면 이전 단계로 돌아가 입력값을 수정한 후 재제출하실 수 있습니다. 재제출 시 구글 시트의 기존 행 데이터는 새로운 행을 만들지 않고 자동으로 업데이트됩니다.
                            </p>
                          </div>`;

const newBlock = `<div style={{ background: '#eff6ff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                            <p style={{ fontSize: '0.82rem', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
                              💡 <strong>보고서 내용을 화면에서 직접 수정할 수 있습니다.</strong><br />
                              수정이 완료되면 우측 상단의 <strong>[보고서 전체 복사]</strong> 버튼을 눌러 복사해 가세요. <br />
                              만약 입력값 자체(사고액 등)에 오타가 있다면 하단의 <strong>[수정하고 다시 쓰기]</strong> 버튼을 클릭하여 처음부터 수정할 수 있습니다.
                            </p>
                          </div>`;

const escapedBlock = escapeRegExp(oldBlock).replace(/\s+/g, '\\s+');
const regexBlock = new RegExp(escapedBlock);

if (regexBlock.test(content)) {
  content = content.replace(regexBlock, newBlock);
  console.log('3. Tip box replacement successful');
} else {
  console.log('3. Tip box block not found');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('All replacements completed successfully!');
