const fs = require('fs');

const pagePath = 'd:/사고관리시스템/web-app/src/app/page.js';
let content = fs.readFileSync(pagePath, 'utf8');

// 1. 사이드바 AI 설정 버튼 제거
const navItemRegex = /<div className=\{`nav-item \${activeMenu === 'ai_settings'[\s\S]*?<\/div>/;
content = content.replace(navItemRegex, '');

// 2. 제목 매핑 제거
content = content.replace(/\{activeMenu === 'ai_settings' && 'AI 모델 및 API 키 설정'\}/g, '');

// 3. 메인 AI 설정 카드 블록(activeMenu === 'ai_settings')만 정밀 제거
const startCardStr = `{activeMenu === 'ai_settings' && (`;
const startIndex = content.indexOf(startCardStr);

if (startIndex !== -1) {
  // 해당 카드 닫는 </div> ); 지점 찾기
  const endCardStr = `              </div>\n            )}`;
  const endIndex = content.indexOf(endCardStr, startIndex);
  if (endIndex !== -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex + endCardStr.length);
    console.log('ONLY_AI_SETTINGS_CARD_REMOVED');
  }
}

fs.writeFileSync(pagePath, content, 'utf8');
