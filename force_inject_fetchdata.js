const fs = require('fs');

const pagePath = 'd:/사고관리시스템/web-app/src/app/page.js';
let content = fs.readFileSync(pagePath, 'utf8');

const target1 = `  // ── 데이터 로드 ──
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
    
  }, []);`;

const target2 = `  // ── 데이터 로드 ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/data');
        const data = await res.json();
        if (data.rows) { setRows(data.rows); setDirtyRows(new Set()); setDataVersion(v => v + 1); }
        if (data.insRows) setInsRows(data.insRows);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);`;

if (content.includes('fetchData();')) {
  console.log('ALREADY_HAS_FETCHDATA');
} else {
  // 정규식으로 안전 교체
  content = content.replace(/const fetchData = async \(\) => \{[\s\S]*?\}\s*;\s*\n\s*\}, \[\]\);/, (match) => {
    return match.replace(/\},\s*\[\]\);$/, 'fetchData();\n  }, []);');
  });
  fs.writeFileSync(pagePath, content, 'utf8');
  console.log('FORCE_INJECT_FETCHDATA_SUCCESS');
}
