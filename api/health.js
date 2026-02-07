module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env_check: {
      gemini_api_key: !!process.env.GEMINI_API_KEY,
      google_sheet_id: !!process.env.GOOGLE_SHEET_ID,
      google_service_account: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      gmail_configured: !!process.env.GMAIL_USER
    }
  });
};
