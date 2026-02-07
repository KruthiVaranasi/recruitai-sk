const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateQuestions(jd) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

  const systemPrompt = `You are an elite Technical Recruitment Strategist with 15+ years of experience hiring for top tech companies (Google, Amazon, Meta, OpenAI). Your expertise lies in translating vague job descriptions into precise, actionable hiring criteria that predict candidate success.

**CONTEXT:**
A hiring manager has provided the a job description:

**YOUR MISSION:**
Generate EXACTLY 4 strategic clarifying questions that will transform this JD into a precise hiring rubric. Your questions must uncover the hidden requirements and real-world constraints that aren't explicitly stated but are critical for finding the right candidate.

**QUESTION FRAMEWORK:**

**Question 1: Role Context & Urgency**
Understand the business reality driving this hire. Ask about:
- Why is this role being created NOW? (New product launch? Replacement? Team scaling?)
- What specific problem will this person solve in their first 90 days?
- What's the urgency level? (Critical/launch-blocking vs. nice-to-have)
- What happens if this role remains unfilled for 3 more months?

**Question 2: Must-Have vs. Nice-to-Have Skills (De-Risk the Hire)**
The JD lists many skills, but which are truly non-negotiable? Ask about:
- Which 3-5 skills are absolute deal-breakers? (Without these, candidate fails regardless of other strengths)
- Which skills can be learned on the job within 3-6 months?
- Are there any "proxy skills" that demonstrate capability even if not explicitly listed?
- What's the minimum acceptable proficiency level for must-have skills?

**Question 3: Team Dynamics & Cultural Fit**
Understand the team environment and what personality/work style succeeds. Ask about:
- Team size, structure, and reporting relationships
- Work style expectations (Autonomous self-starter? Collaborative team player?)
- Is this person expected to lead/mentor others, or be an individual contributor?
- What type of candidate has thrived in this team before?

**Question 4: Hidden Deal-Breakers & Red Flags**
Identify the absolute disqualifiers that aren't obvious from the JD. Ask about:
- Are there any automatic disqualifiers?
- Any "culture fit" red flags to watch for?
- Technical constraints
- Availability constraints

**OUTPUT FORMAT:**
Return your questions in this EXACT format:

🎯 QUESTION 1: Role Context & First 90 Days
[Your specific, targeted question]

🔧 QUESTION 2: Technical Must-Haves vs. Nice-to-Haves
[Your specific question]

👥 QUESTION 3: Team Environment & Success Profile
[Your specific question]

🚫 QUESTION 4: Deal-Breakers & Automatic Disqualifiers
[Your specific question]`;

  const prompt = `${systemPrompt}\n\n**Job Description:**\n${jd}\n\nGenerate your 4 questions now.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to generate questions with AI');
  }
}

async function scoreResume(jd, resume, hrAnswers) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8000,
    }
  });

  const systemPrompt = `You are an expert technical recruiter and candidate evaluator. Your task is to score this candidate against the job requirements using semantic matching and deep analysis.

**Job Description:**
${jd}

**Requirements (from HR clarification):**
- Role Context: ${hrAnswers.role_context}
- Must-Have Skills: ${hrAnswers.must_have_skills}
- Team Environment: ${hrAnswers.team_environment}
- Deal-Breakers: ${hrAnswers.deal_breakers}

**Evaluation Instructions:**

1. **Scoring Criteria (0-100 scale):**
   - Technical Skills Match (40%): How well do their skills align with must-haves?
   - Experience Match (30%): Years of experience, role relevance, company scale
   - Cultural & Contextual Fit (20%): First 90 days priorities, urgency alignment
   - Overall Potential (10%): Achievements, growth trajectory, unique strengths

2. **Provide:**
   - Overall match score (0-100)
   - Score breakdown by category
   - Top 3 strengths with evidence from resume
   - Top 3 gaps or concerns
   - Detailed justification
   - Hiring recommendation (Strong Yes / Yes / Maybe / No)
   - Interview priority (High / Medium / Low)

**Output Format (ONLY valid JSON, no markdown):**

{
  "match_score": 87,
  "score_breakdown": {
    "technical_skills": 35,
    "experience": 28,
    "cultural_fit": 16,
    "potential": 8
  },
  "strengths": [
    "Specific strength 1 with evidence",
    "Specific strength 2 with evidence",
    "Specific strength 3 with evidence"
  ],
  "gaps": [
    "Specific gap 1",
    "Specific gap 2"
  ],
  "justification": "Detailed explanation",
  "recommendation": "Strong Yes",
  "interview_priority": "High"
}

**IMPORTANT:** Output ONLY valid JSON with no markdown formatting.`;

  const prompt = `${systemPrompt}\n\n**Candidate Resume:**\n${resume}\n\nScore this candidate now.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Remove markdown code blocks if present
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Try to parse the entire text first (sometimes it's just valid JSON)
    try {
      return JSON.parse(text);
    } catch (e) {
      // If that fails, try extracting JSON object
    }

    // Find the JSON object by matching braces
    let startIndex = text.indexOf('{');
    if (startIndex === -1) {
      console.error('AI response (no JSON found):', text.substring(0, 500));
      throw new Error('No JSON object found in response');
    }

    // Find matching closing brace
    let braceCount = 0;
    let endIndex = -1;
    for (let i = startIndex; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      if (text[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }

    if (endIndex === -1) {
      console.error('AI response (incomplete JSON):', text.substring(0, 1000));
      throw new Error('Incomplete JSON object in response');
    }

    const jsonStr = text.substring(startIndex, endIndex);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Gemini Scoring Error:', error);
    if (error instanceof SyntaxError) {
      console.error('Invalid JSON received from AI');
    }
    throw new Error('Failed to score resume with AI');
  }
}

module.exports = { generateQuestions, scoreResume };
