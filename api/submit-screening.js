const { readSheet, updateSheet } = require('../lib/sheets-client');
const { scoreResume } = require('../lib/gemini-client');
const { sendResultsEmail } = require('../lib/email-sender');

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
    const body = req.body;

    // Validate HR answers
    const { answer1, answer2, answer3, answer4, role } = body;

    if (!answer1 || !answer2 || !answer3 || !answer4) {
      return res.status(400).json({
        error: 'All 4 answers are required',
        received: {
          answer1: !!answer1,
          answer2: !!answer2,
          answer3: !!answer3,
          answer4: !!answer4
        }
      });
    }

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    console.log(`Starting screening for role: ${role}`);

    // Structure HR answers
    const hrAnswers = {
      role_context: answer1,
      must_have_skills: answer2,
      team_environment: answer3,
      deal_breakers: answer4
    };

    // Read all resumes from Google Sheet
    console.log('Reading resumes from Google Sheets...');
    const rows = await readSheet(role);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'No resumes found for this role',
        role: role
      });
    }

    console.log(`Found ${rows.length} resumes to score`);

    // Score each resume
    const results = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      console.log(`Scoring resume ${i + 1}/${rows.length}...`);

      try {
        const scoring = await scoreResume(row.jd, row.resume, hrAnswers);

        results.push({
          row_number: row.row_number,
          jd: row.jd,
          resume: row.resume,
          jd_clarification: JSON.stringify(hrAnswers),
          score: scoring.match_score || 0,
          strengths: JSON.stringify(scoring.strengths || []),
          gaps: JSON.stringify(scoring.gaps || []),
          justification: scoring.justification || '',
          recommendation: scoring.recommendation || '',
          interview_priority: scoring.interview_priority || '',
          role: role
        });
      } catch (error) {
        console.error(`Error scoring resume ${i + 1}:`, error);
        // Continue with other resumes even if one fails
        results.push({
          row_number: row.row_number,
          score: 0,
          recommendation: 'Error',
          justification: `Failed to score: ${error.message}`
        });
      }
    }

    // Sort by score and add rank
    results.sort((a, b) => b.score - a.score);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    console.log('Updating Google Sheets with results...');

    // Update each row in Google Sheets
    for (const result of results) {
      // Get existing data from the row
      const existingRow = rows.find(r => r.row_number === result.row_number);

      const values = [
        result.jd,                    // Column A: jd
        result.resume,                // Column B: resume
        existingRow.uploadedAt,       // Column C: uploadedAt
        result.role,                  // Column D: role
        existingRow.jd_clarifications,// Column E: jd_clarifications (questions)
        result.rank,                  // Column F: rank
        result.jd_clarification,      // Column G: jd_clarification (HR answers)
        result.score,                 // Column H: score
        result.strengths,             // Column I: strengths
        result.gaps,                  // Column J: gaps
        result.justification,         // Column K: justification
        result.recommendation,        // Column L: recommendation
        result.interview_priority     // Column M: interview_priority
      ];

      await updateSheet(role, result.row_number, values);
    }

    // Send email summary
    console.log('Sending email summary...');
    await sendResultsEmail(results, role);

    // Return success
    return res.status(200).json({
      success: true,
      message: 'Screening completed successfully',
      data: {
        total_candidates: results.length,
        summary: {
          strong_yes: results.filter(r => r.recommendation === 'Strong Yes').length,
          yes: results.filter(r => r.recommendation === 'Yes').length,
          maybe: results.filter(r => r.recommendation === 'Maybe').length,
          no: results.filter(r => r.recommendation === 'No').length
        },
        top_5: results.slice(0, 5).map(r => ({
          rank: r.rank,
          score: r.score,
          recommendation: r.recommendation
        }))
      }
    });

  } catch (error) {
    console.error('Screening error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
