const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

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

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.GOOGLE_CLIENT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });
const sheetId = env.GOOGLE_SHEET_ID;

async function check() {
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: ['Accidents!A1:ZZ1', 'accident report!A1:ZZ1']
  });
  
  const output = {
    accidents: res.data.valueRanges[0].values[0],
    accidentReport: res.data.valueRanges[1].values[0]
  };
  
  fs.writeFileSync(path.join(__dirname, 'headers_output.txt'), JSON.stringify(output, null, 2), 'utf8');
  console.log('Saved headers to headers_output.txt');
}

check().catch(err => {
  fs.writeFileSync(path.join(__dirname, 'headers_output.txt'), err.stack, 'utf8');
});
