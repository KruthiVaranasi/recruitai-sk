const { readSheet, updateSheet } = require('../lib/sheets-client');
const { generateQuestions } = require('../lib/gemini-client');

// Helper to extract questions from AI text
function extractQuestions(text) {
  const questions = [];

  // Match emoji format questions
  const emojiPattern = /[🎯🔧👥🚫]\s*QUESTION\s*\d+[:\s]+([^\n]+)\n([^🎯🔧👥🚫]+)/gi;
  let match;

  while ((match = emojiPattern.exec(text)) !== null) {
    questions.push({
      title: match[1].trim(),
      question: match[2].trim()
    });
  }

  // Fallback: numbered format
  if (questions.length === 0) {
    const numberedPattern = /(?:Question\s*)?(\d+)[.:\s]+([^\n]+(?:\n(?!\d+[.:])[^\n]+)*)/gi;
    while ((match = numberedPattern.exec(text)) !== null) {
      questions.push({
        title: `Question ${match[1]}`,
        question: match[2].trim()
      });
    }
  }

  // Ensure exactly 4 questions
  while (questions.length < 4) {
    questions.push({
      title: `Question ${questions.length + 1}`,
      question: 'Please provide clarification for this aspect of the role.'
    });
  }

  return questions.slice(0, 4);
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
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role (job_title) is required' });
    }

    console.log(`Generating questions for role: ${role}`);

    // Read the first row from the sheet to get the JD
    const rows = await readSheet(role);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'No resumes found for this role. Upload resumes first.',
        role: role
      });
    }

    // Get JD from first row (all rows should have same JD)
    const jd = rows[0].jd;

    if (!jd) {
      return res.status(400).json({
        error: 'Job description not found in sheet'
      });
    }

    console.log('Generating clarifying questions with Gemini AI...');

    // Generate questions using Gemini AI
    const questionsText = await generateQuestions(jd);

    console.log('Updating all rows with questions...');

    // Update ALL rows to add questions in column E
    for (const row of rows) {
      const values = [
        row.jd,
        row.resume,
        row.uploadedAt,
        row.role,
        questionsText  // Column E: jd_clarifications
      ];

      await updateSheet(role, row.row_number, values);
    }

    // Parse questions for response
    const questions = extractQuestions(questionsText);

    // Return success with questions
    return res.status(200).json({
      success: true,
      message: 'Questions generated successfully',
      data: {
        role: role,
        total_resumes: rows.length,
        questions: questions,
        jd_preview: jd.substring(0, 200) + '...'
      }
    });

  } catch (error) {
    console.error('Generate questions error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
