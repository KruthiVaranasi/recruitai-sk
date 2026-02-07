# Complete Workflow Documentation

## 📋 3-Step Process

### **Step 1: Upload Resumes (Multiple calls)**

**Endpoint:** `POST /api/upload-resume`

**Purpose:** HR uploads resumes one by one

**Input:**
- `resume_pdf`: PDF file (form-data)
- `jd`: Job description text (form-data)
- `role`: Job title / role name (form-data)

**What happens:**
1. PDF text is extracted
2. Data is saved to Google Sheets under a tab named `{role}`
3. Columns saved: jd, resume, uploadedAt, role

**Response:**
```json
{
  "success": true,
  "message": "Resume uploaded successfully",
  "data": {
    "filename": "john_doe.pdf",
    "role": "Senior Engineer",
    "resumeLength": 5420,
    "uploadedAt": "2026-02-07T10:30:00.000Z",
    "jd_preview": "We are looking for..."
  }
}
```

**Lovable calls this:** Every time HR uploads a new resume

---

### **Step 2: Generate Questions (Once per role)**

**Endpoint:** `POST /api/generate-questions`

**Purpose:** After all resumes are uploaded, generate clarifying questions

**Input:**
```json
{
  "role": "Senior Engineer"
}
```

**What happens:**
1. Reads JD from the first row of the sheet
2. Uses Gemini AI to generate 4 strategic clarifying questions
3. Updates ALL rows in the sheet with these questions (column E)

**Response:**
```json
{
  "success": true,
  "message": "Questions generated successfully",
  "data": {
    "role": "Senior Engineer",
    "total_resumes": 10,
    "questions": [
      {
        "title": "Role Context & First 90 Days",
        "question": "What specific problem will this person solve..."
      },
      {
        "title": "Technical Must-Haves vs. Nice-to-Haves",
        "question": "Which 3-5 skills are absolute deal-breakers..."
      },
      {
        "title": "Team Environment & Success Profile",
        "question": "What type of candidate has thrived in this team..."
      },
      {
        "title": "Deal-Breakers & Automatic Disqualifiers",
        "question": "Are there any automatic disqualifiers..."
      }
    ],
    "jd_preview": "We are looking for..."
  }
}
```

**Lovable calls this:** Once, after HR finishes uploading all resumes

---

### **Step 3: Screen & Rank (Once per role)**

**Endpoint:** `POST /api/submit-screening`

**Purpose:** HR answers questions, system scores and ranks all candidates

**Input:**
```json
{
  "answer1": "This role is critical for our Q2 product launch...",
  "answer2": "Must-have: 5+ years Python, production ML experience...",
  "answer3": "Small team of 4 engineers, need autonomous self-starter...",
  "answer4": "Deal-breaker: Must have visa status to work in US...",
  "role": "Senior Engineer"
}
```

**What happens:**
1. Reads all resumes from Google Sheets for this role
2. For each resume, uses Gemini AI to score against JD + HR answers
3. Generates: score (0-100), strengths, gaps, justification, recommendation
4. Sorts by score and assigns rank
5. Updates Google Sheets with all screening data
6. Sends email summary to HR

**Response:**
```json
{
  "success": true,
  "message": "Screening completed successfully",
  "data": {
    "total_candidates": 10,
    "summary": {
      "strong_yes": 2,
      "yes": 4,
      "maybe": 3,
      "no": 1
    },
    "top_5": [
      { "rank": 1, "score": 92, "recommendation": "Strong Yes" },
      { "rank": 2, "score": 87, "recommendation": "Strong Yes" },
      { "rank": 3, "score": 81, "recommendation": "Yes" },
      { "rank": 4, "score": 76, "recommendation": "Yes" },
      { "rank": 5, "score": 71, "recommendation": "Yes" }
    ]
  }
}
```

**Lovable calls this:** Once, after HR answers the 4 questions

---

## 📊 Complete Google Sheets Schema

Each role has its own sheet tab (tab name = role name).

### **After Step 1 (Upload):**
| Col | Name | Type | Example |
|-----|------|------|---------|
| A | jd | text | "We are looking for a Senior Engineer with..." |
| B | resume | text | "JOHN DOE\nSenior Software Engineer..." |
| C | uploadedAt | timestamp | "2026-02-07T10:30:00.000Z" |
| D | role | text | "Senior Engineer" |

### **After Step 2 (Questions):**
| Col | Name | Type | Example |
|-----|------|------|---------|
| E | jd_clarifications | text | "🎯 QUESTION 1: Role Context...\n🔧 QUESTION 2:..." |

### **After Step 3 (Screening):**
| Col | Name | Type | Example |
|-----|------|------|---------|
| F | rank | number | 1 |
| G | jd_clarification | JSON string | '{"role_context":"...","must_have_skills":"..."}' |
| H | score | number | 92 |
| I | strengths | JSON array | '["7 years Python experience","Led ML team"]' |
| J | gaps | JSON array | '["No Kubernetes experience","Limited AWS"]' |
| K | justification | text | "Strong candidate with extensive ML background..." |
| L | recommendation | text | "Strong Yes" |
| M | interview_priority | text | "High" |

---

## 📧 Email Sent to HR (After Step 3)

**Subject:** ✅ Resume Screening Complete - 10 Candidates Analyzed (Senior Engineer)

**Body:**
```
Hi HR Team,

Resume screening has completed successfully for role: Senior Engineer

📊 SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Candidates: 10

Recommendations:
  ✅ Strong Yes: 2
  ✓  Yes: 4
  ⚠️  Maybe: 3
  ❌ No: 1

📋 NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Review detailed results in Google Sheet:
   https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit

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
Generated at: 2/7/2026, 10:45:30 AM
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────┐
│  LOVABLE FRONTEND                               │
└─────────────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
   [Upload Resume 1]       [Upload Resume 2...N]
        ↓                       ↓
POST /api/upload-resume   (Repeat N times)
        ↓
   ┌────────────────────────────┐
   │  Google Sheets             │
   │  Columns: A-D              │
   │  (jd, resume, date, role)  │
   └────────────────────────────┘
        ↓
   [HR clicks "Generate Questions"]
        ↓
POST /api/generate-questions
        ↓
   ┌────────────────────────────┐
   │  Google Sheets             │
   │  Column E added            │
   │  (jd_clarifications)       │
   └────────────────────────────┘
        ↓
   [Lovable shows 4 questions to HR]
        ↓
   [HR answers questions]
        ↓
POST /api/submit-screening
        ↓
   ┌────────────────────────────┐
   │  Gemini AI scores          │
   │  each resume               │
   └────────────────────────────┘
        ↓
   ┌────────────────────────────┐
   │  Google Sheets             │
   │  Columns F-M added         │
   │  (rank, score, etc.)       │
   └────────────────────────────┘
        ↓
   ┌────────────────────────────┐
   │  Email sent to HR          │
   └────────────────────────────┘
        ↓
   [Lovable shows summary]
```

---

## 🧪 Testing the Flow

### Test with curl:

**1. Upload a resume:**
```bash
curl -X POST https://your-vercel-url.vercel.app/api/upload-resume \
  -F "resume_pdf=@resume.pdf" \
  -F "jd=We are looking for a Senior Engineer..." \
  -F "role=Senior Engineer"
```

**2. Generate questions:**
```bash
curl -X POST https://your-vercel-url.vercel.app/api/generate-questions \
  -H "Content-Type: application/json" \
  -d '{"role":"Senior Engineer"}'
```

**3. Submit screening:**
```bash
curl -X POST https://your-vercel-url.vercel.app/api/submit-screening \
  -H "Content-Type: application/json" \
  -d '{
    "answer1": "Critical for Q2 launch",
    "answer2": "5+ years Python, ML experience",
    "answer3": "Small team, autonomous",
    "answer4": "Must have work visa",
    "role": "Senior Engineer"
  }'
```

---

## ✅ Checklist for HR

- [ ] Upload all resumes for a role (Step 1 - multiple times)
- [ ] Click "Generate Questions" (Step 2 - once)
- [ ] Answer all 4 questions (Step 3 - once)
- [ ] Review email and Google Sheet results
- [ ] Schedule interviews with top candidates
