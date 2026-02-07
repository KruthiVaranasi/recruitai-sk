# Resume Screener Backend (Vercel)

AI-powered resume screening system converted from n8n workflow using **Google Gemini 2.0 Flash** (FREE tier).

## 🚀 Features

- PDF resume upload & text extraction
- AI-powered clarifying question generation (Google Gemini - FREE)
- Multi-resume scoring against job requirements
- Automated ranking and Google Sheets integration
- Email summary to HR

## 📦 Tech Stack

- **Vercel** - Serverless hosting (FREE)
- **Google Gemini 2.0 Flash** - AI question generation & resume scoring (FREE 1500 requests/day)
- **Google Sheets API** - Data storage
- **Gmail API** - Email notifications
- **pdf-parse** - PDF text extraction

## 🛠️ Setup

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd resume-screener-backend
npm install
```

### 2. Environment Variables

**IMPORTANT:** Do NOT create a `.env` file. You'll add these directly in Vercel dashboard.

Required variables:
- `GEMINI_API_KEY`: Get FREE key from https://makersuite.google.com/app/apikey
- `GOOGLE_SHEET_ID`: Your Google Sheet ID (from URL)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Service account email
- `GOOGLE_PRIVATE_KEY`: Service account private key
- `GMAIL_USER`: Your Gmail address
- `GMAIL_APP_PASSWORD`: Gmail app-specific password
- `HR_EMAIL`: Email to receive screening results

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

During deployment, you'll be prompted to add environment variables. Add all the variables listed above.

**OR** add them via Vercel Dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable one by one

## 📡 API Endpoints

### POST /api/upload-resume
Upload resume PDF and generate clarifying questions.

**Request:** (multipart/form-data)
- `resume_pdf`: PDF file
- `jd`: Job description text
- `role`: Role name (matches Google Sheet tab name)

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {"title": "...", "question": "..."},
      ...
    ],
    "role": "Senior Engineer"
  }
}
```

### POST /api/submit-screening
Submit HR answers and score all resumes for a role.

**Request:** (JSON)
```json
{
  "answer1": "Role context answer...",
  "answer2": "Must-have skills answer...",
  "answer3": "Team environment answer...",
  "answer4": "Deal-breakers answer...",
  "role": "Senior Engineer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_candidates": 10,
    "summary": {
      "strong_yes": 3,
      "yes": 4,
      "maybe": 2,
      "no": 1
    },
    "top_5": [...]
  }
}
```

### GET /api/health
Health check endpoint - verifies all environment variables are configured.

## 🔧 Google Sheets Setup

1. Create a Google Cloud Project: https://console.cloud.google.com/
2. Enable Google Sheets API
3. Create Service Account:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Download JSON key file
4. Share your Google Sheet with the service account email (Editor access)
5. Extract credentials from JSON:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`

**Sheet Structure:**
Each role should have its own sheet tab (matching the `role` field). Columns:
- A: jd
- B: resume
- C: uploadedAt
- D: role
- E: jd_clarifications
- F: rank
- G: jd_clarification (duplicate)
- H: score
- I: strengths
- J: gaps
- K: justification
- L: recommendation
- M: interview_priority

## 📧 Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other"
   - Copy the generated password
3. Use this as `GMAIL_APP_PASSWORD` in Vercel

## 💰 Cost

**$0/month** - Everything uses free tiers:
- Vercel: Free hobby plan
- Google Gemini: 1500 free requests/day
- Google Sheets API: Free tier
- Gmail: Free

## 🔒 Security

- Never commit `.env` file (already in `.gitignore`)
- All secrets managed in Vercel dashboard
- API keys encrypted at rest in Vercel
- Use HTTPS endpoints only

## 📝 License

MIT

---

**Built by:** [Your Name]
**Portfolio:** [Your Portfolio URL]
**GitHub:** [Your GitHub URL]
