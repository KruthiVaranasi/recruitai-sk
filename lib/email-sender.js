const nodemailer = require('nodemailer');

async function sendResultsEmail(results, role) {
  // Skip email if credentials not configured
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD ||
      process.env.GMAIL_USER === 'your_email@gmail.com') {
    console.log('Email credentials not configured, skipping email notification');
    return;
  }

  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const totalCandidates = results.length;
  const strongYes = results.filter(r => r.recommendation === 'Strong Yes').length;
  const yes = results.filter(r => r.recommendation === 'Yes').length;
  const maybe = results.filter(r => r.recommendation === 'Maybe').length;
  const no = results.filter(r => r.recommendation === 'No').length;

  const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/edit`;

  const emailBody = `Hi HR Team,

Resume screening has completed successfully for role: ${role}

📊 SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Candidates: ${totalCandidates}

Recommendations:
  ✅ Strong Yes: ${strongYes}
  ✓  Yes: ${yes}
  ⚠️  Maybe: ${maybe}
  ❌ No: ${no}

📋 NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Review detailed results in Google Sheet:
   ${googleSheetUrl}

2. The sheet includes for each candidate:
   • Score (0-100)
   • Rank
   • Strengths
   • Gaps
   • Justification
   • Recommendation
   • Interview Priority

3. Select candidates for interviews based on:
   • High scores (80+)
   • "Strong Yes" or "Yes" recommendations
   • "High" interview priority

All candidates are ranked by score - check the top 5 first!

---
🤖 Powered by Resume Screener AI
Generated at: ${new Date().toLocaleString()}
`;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.HR_EMAIL,
    subject: `✅ Resume Screening Complete - ${totalCandidates} Candidates Analyzed (${role})`,
    text: emailBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Email sending error:', error);
    // Don't throw - email is optional
  }
}

module.exports = { sendResultsEmail };
