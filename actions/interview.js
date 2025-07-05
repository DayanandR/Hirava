"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Robust JSON parsing function
function parseAIResponse(text) {
  // Remove markdown code blocks
  let cleaned = text.replace(/```(?:json)?\n?/g, "").trim();

  // Remove any text before the first { or [
  const jsonStart = Math.min(
    cleaned.indexOf("{") === -1 ? Infinity : cleaned.indexOf("{"),
    cleaned.indexOf("[") === -1 ? Infinity : cleaned.indexOf("[")
  );

  if (jsonStart !== Infinity) {
    cleaned = cleaned.substring(jsonStart);
  }

  // Remove any text after the last } or ]
  const jsonEnd = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));

  if (jsonEnd !== -1) {
    cleaned = cleaned.substring(0, jsonEnd + 1);
  }

  // Try multiple parsing strategies
  const strategies = [
    // Strategy 1: Parse as-is
    (text) => JSON.parse(text),

    // Strategy 2: Fix common issues
    (text) => {
      const fixed = text
        .replace(/,(\s*[}\]])/g, "$1") // Remove trailing commas
        .replace(/([^\\])"/g, '$1\\"') // Escape unescaped quotes (be careful with this)
        .replace(/\n/g, "\\n") // Escape newlines in strings
        .replace(/\t/g, "\\t"); // Escape tabs
      return JSON.parse(fixed);
    },

    // Strategy 3: Extract JSON using regex
    (text) => {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("No JSON object found");
    },

    // Strategy 4: Try to fix quote issues specifically
    (text) => {
      let fixed = text
        // Fix double quotes that might be causing issues
        .replace(/""([^"]*)""/g, '"$1"')
        // Fix quotes around array elements
        .replace(/"\[([^\]]*)\]"/g, "[$1]");
      return JSON.parse(fixed);
    },
  ];

  let lastError = null;

  for (const strategy of strategies) {
    try {
      const result = strategy(cleaned);
      // Validate the result has the expected structure
      if (result && typeof result === "object") {
        return result;
      }
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  // If all strategies fail, throw the last error
  throw new Error(
    `JSON parsing failed: ${lastError?.message || "Unknown error"}`
  );
}

// Generate fallback quiz
function getFallbackQuiz(industry, skills) {
  return [
    {
      question: `What is the most important skill for a ${industry} professional?`,
      options: [
        "Technical expertise",
        "Communication skills",
        "Problem-solving ability",
        "Time management",
      ],
      correctAnswer: "Problem-solving ability",
      explanation:
        "Problem-solving is crucial across all technical roles as it combines technical knowledge with analytical thinking.",
    },
    {
      question: "How would you approach learning new technologies?",
      options: [
        "Self-study only",
        "Formal training courses",
        "Hands-on practice with mentorship",
        "Reading documentation exclusively",
      ],
      correctAnswer: "Hands-on practice with mentorship",
      explanation:
        "Combining practical experience with guidance from experienced professionals is the most effective learning approach.",
    },
    {
      question:
        "What's the best way to handle a challenging technical problem?",
      options: [
        "Work on it alone until solved",
        "Ask for help immediately",
        "Break it down into smaller parts",
        "Look for similar solutions online",
      ],
      correctAnswer: "Break it down into smaller parts",
      explanation:
        "Breaking complex problems into manageable components is a fundamental problem-solving technique.",
    },
  ];
}

export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    Generate 10 technical interview questions for a ${
      user.industry
    } professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.
    
    Each question should be multiple choice with 4 options.
    
    IMPORTANT: Return ONLY valid JSON with no additional text, explanations, or formatting.
    The JSON must be properly formatted with no syntax errors.
    
    Use this exact JSON structure:
    {
      "questions": [
        {
          "question": "Your question here",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": "Option 1",
          "explanation": "Why this is correct"
        }
      ]
    }
    
    Make sure:
    - All strings are properly quoted
    - No trailing commas
    - No unescaped quotes within strings
    - Valid JSON syntax throughout
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log("Raw AI response:", text); // Debug logging

    const quiz = parseAIResponse(text);

    // Validate the quiz structure
    if (!quiz || !quiz.questions || !Array.isArray(quiz.questions)) {
      console.error("Invalid quiz structure:", quiz);
      throw new Error("Invalid quiz structure - missing questions array");
    }

    // Validate each question
    const validQuestions = quiz.questions.filter((q) => {
      const isValid =
        q.question &&
        q.options &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.correctAnswer &&
        q.explanation;

      if (!isValid) {
        console.warn("Invalid question filtered out:", q);
      }

      return isValid;
    });

    if (validQuestions.length === 0) {
      console.error("No valid questions found, using fallback");
      return getFallbackQuiz(user.industry, user.skills);
    }

    // Return at least 3 questions, use fallback if needed
    if (validQuestions.length < 3) {
      const fallbackQuestions = getFallbackQuiz(user.industry, user.skills);
      return [...validQuestions, ...fallbackQuestions].slice(0, 10);
    }

    return validQuestions.slice(0, 10); // Limit to 10 questions
  } catch (error) {
    console.error("Error generating quiz:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });

    // Return fallback quiz instead of throwing
    console.log("Returning fallback quiz due to error");
    return getFallbackQuiz(user.industry, user.skills);
  }
}

export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
      
      Return only the improvement tip text, no additional formatting.
    `;

    try {
      const tipResult = await model.generateContent(improvementPrompt);
      improvementTip = tipResult.response.text().trim();
      console.log("Generated improvement tip:", improvementTip);
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      // Continue without improvement tip if generation fails
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}
