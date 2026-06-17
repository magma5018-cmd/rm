import { sheets, sheetId } from '../src/lib/google.js';
import dotenv from 'dotenv';
import path from 'path';

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  try {
    const sId = process.env.GOOGLE_SHEET_ID || sheetId;
    console.log('Sheet ID:', sId);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sId,
      range: 'Accidents!A1:AI1',
    });
    
    console.log('Current Headers in Accidents:');
    console.log(response.data.values ? response.data.values[0] : 'No data');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
