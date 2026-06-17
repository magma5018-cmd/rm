const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// .env.local 파싱
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let value = m[2] ? m[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[m[1]] = value;
  }
});

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.GOOGLE_CLIENT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });
const sheetId = env.GOOGLE_SHEET_ID;

// driveUrl에서 폴더 ID 추출
function extractFolderId(url) {
  if (!url) return null;
  const match = url.match(/([a-zA-Z0-9_-]{25,})/);
  return match ? match[1] : null;
}

async function run() {
  try {
    console.log('Fetching Google Sheet data to find existing Drive URLs...');
    
    // 1. 사고 데이터 및 보험 데이터 가져오기
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: ['Accidents!A1:AZ1000', 'Insurance!A1:AE1000'],
    });

    const accidentRows = response.data.valueRanges[0].values || [];
    const insuranceRows = response.data.valueRanges[1].values || [];

    const folderIds = new Set();

    // 사고 데이터에서 드라이브 URL 추출
    if (accidentRows.length > 1) {
      const accHeaders = accidentRows[0];
      const urlIdx = accHeaders.indexOf('드라이브URL');
      if (urlIdx !== -1) {
        accidentRows.slice(1).forEach(row => {
          const url = row[urlIdx];
          const fid = extractFolderId(url);
          if (fid) folderIds.add(fid);
        });
      }
    }

    // 보험 데이터에서 드라이브 URL 추출 (보험 시트의 'driveUrl' 헤더 탐색)
    if (insuranceRows.length > 1) {
      const insHeaders = insuranceRows[0];
      // driveUrl 또는 드라이브URL 또는 증권파일 등 모든 열 탐색
      const urlIdx = insHeaders.findIndex(h => h && (h.includes('driveUrl') || h.includes('드라이브') || h.includes('증권파일')));
      if (urlIdx !== -1) {
        insuranceRows.slice(1).forEach(row => {
          const url = row[urlIdx];
          const fid = extractFolderId(url);
          if (fid) folderIds.add(fid);
        });
      }
    }

    const uniqueIds = Array.from(folderIds);
    console.log(`Found ${uniqueIds.length} unique Google Drive folders/files to update.`);

    if (uniqueIds.length === 0) {
      console.log('No existing Drive URLs found.');
      return;
    }

    // 2. 각 폴더에 대해 순차적으로 권한 변경
    let successCount = 0;
    let failCount = 0;

    for (const fileId of uniqueIds) {
      try {
        console.log(`Updating permission for ID: ${fileId}...`);
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
          supportsAllDrives: true,
        });
        console.log(`-> Successfully shared folder/file: ${fileId}`);
        successCount++;
      } catch (err) {
        console.error(`-> Failed for ID: ${fileId}. Error: ${err.message}`);
        failCount++;
      }
    }

    console.log(`\n=== Migration Report ===`);
    console.log(`Total attempted: ${uniqueIds.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);

  } catch (error) {
    console.error('Migration error:', error);
  }
}

run();
