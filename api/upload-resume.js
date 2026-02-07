const Busboy = require('busboy');
const { extractTextFromPDF } = require('../lib/pdf-extractor');
const { appendToSheet } = require('../lib/sheets-client');

// Helper to parse multipart form data
function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields = {};
    let fileBuffer = null;
    let filename = null;

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, info) => {
      filename = info.filename;
      const chunks = [];
      file.on('data', (data) => chunks.push(data));
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('finish', () => {
      resolve({ fields, fileBuffer, filename });
    });

    busboy.on('error', reject);

    req.pipe(busboy);
  });
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Parsing upload request...');
    const { fields, fileBuffer, filename } = await parseMultipartForm(req);

    // Validate inputs
    const jd = fields.jd || fields.job_description;
    const role = fields.role;

    if (!jd) {
      return res.status(400).json({ error: 'Job description (jd) is required' });
    }

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    if (!fileBuffer) {
      return res.status(400).json({ error: 'Resume PDF file is required' });
    }

    console.log(`Processing resume: ${filename}, Role: ${role}`);

    // Extract text from PDF
    console.log('Extracting text from PDF...');
    const resumeText = await extractTextFromPDF(fileBuffer);

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({ error: 'Failed to extract text from PDF. File may be corrupt or empty.' });
    }

    // Clean extracted text
    const cleanedResume = resumeText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    console.log(`Extracted ${cleanedResume.length} characters from resume`);

    // Add resume and JD to Google Sheets (NO question generation here)
    console.log('Adding to Google Sheets...');
    await appendToSheet(role, [
      jd,              // Column A: jd
      cleanedResume,   // Column B: resume
      new Date().toISOString(), // Column C: uploadedAt
      role             // Column D: role
      // Column E (jd_clarifications) will be added in generate-questions endpoint
    ]);

    // Return success
    return res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        filename,
        role,
        resumeLength: cleanedResume.length,
        uploadedAt: new Date().toISOString(),
        jd_preview: jd.substring(0, 200) + '...'
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
