const { google } = require('googleapis');

// Initialize Google Sheets API
function getGoogleAuth() {
  let credentials;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // Preferred: full JSON stored as single env var (no key formatting issues)
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else {
    // Fallback: separate email + key env vars
    credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
}

// Ensure sheet tab exists, create if it doesn't
async function ensureSheetExists(sheetName) {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Try to get the spreadsheet to check if the sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
    });

    const sheetExists = spreadsheet.data.sheets.some(
      (sheet) => sheet.properties.title === sheetName
    );

    const headers = [
      'jd',
      'resume',
      'uploadedAt',
      'role',
      'jd_clarifications',
      'rank',
      'jd_clarification',
      'score',
      'strengths',
      'gaps',
      'justification',
      'recommendation',
      'interview_priority',
      'filename'
    ];

    if (!sheetExists) {
      // Create the sheet tab
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
      console.log(`Created new sheet tab: ${sheetName}`);
    }

    // Always ensure headers are in row 1 (handles new sheets + existing sheets missing headers)
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `'${sheetName}'!A1:N1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });
    console.log(`Headers set for sheet: ${sheetName}`);
  } catch (error) {
    console.error('Error ensuring sheet exists:', error);
    throw new Error(`Failed to create sheet tab: ${error.message}`);
  }
}

async function appendToSheet(sheetName, values) {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Ensure the sheet tab exists
    await ensureSheetExists(sheetName);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `'${sheetName}'!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [values],
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error appending to sheet:', error);
    throw new Error(`Failed to write to Google Sheets: ${error.message}`);
  }
}

async function readSheet(sheetName) {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `'${sheetName}'!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    // Convert to array of objects
    const headers = rows[0];
    return rows.slice(1).map((row, index) => {
      const obj = { row_number: index + 2 }; // +2 because header is row 1, data starts at row 2
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      return obj;
    });
  } catch (error) {
    console.error('Error reading sheet:', error);
    throw new Error(`Failed to read from Google Sheets: ${error.message}`);
  }
}

async function updateSheet(sheetName, rowNumber, values) {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `'${sheetName}'!A${rowNumber}:Z${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [values],
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error updating sheet:', error);
    throw new Error(`Failed to update Google Sheets: ${error.message}`);
  }
}

module.exports = { appendToSheet, readSheet, updateSheet };
