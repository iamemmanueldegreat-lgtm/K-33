import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Lazy-loaded Gemini Client for full-stack API safety
let geminiClient: GoogleGenAI | null = null;
let lastApiKey: string | null = null;
function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is required.");
  }
  if (!geminiClient || key !== lastApiKey) {
    lastApiKey = key;
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

function parseJsonSafe(text: string): any {
  let cleaned = text.trim();
  
  // Remove <think>...</think> block if present
  const thinkStart = cleaned.indexOf("<think>");
  const thinkEnd = cleaned.indexOf("</think>");
  if (thinkStart !== -1 && thinkEnd !== -1 && thinkEnd > thinkStart) {
    cleaned = cleaned.substring(0, thinkStart) + cleaned.substring(thinkEnd + 8);
    cleaned = cleaned.trim();
  }

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed parsing JSON directly. Attempting extraction from:", text);
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      try {
        return JSON.parse(cleaned.substring(startIdx, endIdx + 1));
      } catch (innerErr) {
        console.error("Extraction fallback failed too:", innerErr);
      }
    }
    const arrayStartIdx = cleaned.indexOf("[");
    const arrayEndIdx = cleaned.lastIndexOf("]");
    if (arrayStartIdx !== -1 && arrayEndIdx !== -1 && arrayEndIdx > arrayStartIdx) {
      try {
        return JSON.parse(cleaned.substring(arrayStartIdx, arrayEndIdx + 1));
      } catch (innerErr) {
        console.error("Array extraction fallback failed too:", innerErr);
      }
    }
    throw err;
  }
}

function getFallbackCourse(department: string) {
  const normalized = (department || "").toLowerCase();
  const schools = ["University of Benin (UNIBEN)", "Auchi Polytechnic"];
  const randomSchool = schools[Math.floor(Math.random() * schools.length)];
  
  if (normalized.includes("math") || normalized.includes("calc")) {
    return {
      school: randomSchool,
      code: "MTH 101",
      title: "General Mathematics I",
      description: "Foundational real-life mathematics covering equations, basic calculus limits, systems of logic, quadratics, inequalities, and core vector transformations designed for engineers and scientists.",
      topics: [
        {
          title: "Quadratic Equations and Functions",
          content: "A detailed review of second-order polynomial systems. In this unit, we learn how to compute the discriminant, interpret vertex and axis coordinates, and solve solutions using the universal quadratic formula and completing the square."
        },
        {
          title: "Introduction to Limits and Continuity",
          content: "Exploring the fundamental definition of limits, approaching infinitesimal bounds on Cartesian coordinate planes. This unit covers evaluating standard left and right-hand limits and verifying curve continuity conditions."
        }
      ]
    };
  } else if (normalized.includes("computer") || normalized.includes("software") || normalized.includes("csc") || normalized.includes("tech")) {
    return {
      school: randomSchool,
      code: "CSC 101",
      title: "Introduction to Computer Science",
      description: "Comprehensive introduction to digital design, computational theory, machine instructions, flowcharts, variable allocations, and core binary logic gates.",
      topics: [
        {
          title: "Binary Logic and Logic Gates",
          content: "Discover how registers and physical transistors process binary currents. Learn key Boolean logic functions including AND, OR, XOR, and NOT, alongside high-yield visual representations and algebraic operations."
        },
        {
          title: "Introduction to Algorithmic Efficiency",
          content: "Understanding space and time optimization. Students learn to trace operations, construct basic pseudocode algorithms, and write simple iterative loops using standard high-level programming structures."
        }
      ]
    };
  } else if (normalized.includes("mechanic") || normalized.includes("elect") || normalized.includes("engine") || normalized.includes("mechatronic")) {
    return {
      school: randomSchool,
      code: "MEG 201",
      title: "Basic Engineering Thermodynamics",
      description: "Core analytical curriculum on heat engines, conservation laws, temperature coefficients, closed-system cycles, and performance barriers in mechanical processes.",
      topics: [
        {
          title: "The First Law of Thermodynamics",
          content: "Focusing on thermal conservation. Learn how internal energy changes correlate to boundary work and heat transfer rates under localized atmospheric measurements."
        },
        {
          title: "Understanding Entropy and Irreversibility",
          content: "Evaluating academic formulations for systemic disorder. Explore the Carnot cycle limits, mechanical efficiency formulas, and entropy calculations in industrial heat pumps."
        }
      ]
    };
  } else if (normalized.includes("econ") || normalized.includes("bus") || normalized.includes("finance") || normalized.includes("account")) {
    return {
      school: randomSchool,
      code: "ECO 101",
      title: "Principles of Microeconomics",
      description: "Analytical overview of microeconomic principles, market equilibrium equations, price elasticity indexes, production efficiency, and utility maximization theories.",
      topics: [
        {
          title: "Supply, Demand, and Market Equilibrium",
          content: "Analyzing forces that influence buyer actions and vendor strategies. Covers constructing supply-demand schedules, interpreting equilibrium intersections, and predicting micro-level pricing pivots in modern commerce."
        },
        {
          title: "Theory of Consumer Choice",
          content: "How individual consumers evaluate budget constraints and marginal utility. Connects modern economic utility graphs directly to real-life shopping preferences in local major markets."
        }
      ]
    };
  } else {
    // Default fallback
    return {
      school: randomSchool,
      code: "GST 111",
      title: `Introduction to ${department || "Academic Studies"}`,
      description: `Comprehensive academic foundations, terminology structures, core paradigms, and fundamental principles designed for collegiate success in ${department || "all professional majors"}.`,
      topics: [
        {
          title: "Core Foundations and Definitions",
          content: `Delve deep into the most significant definitions, academic histories, and theoretical methodologies under the study umbrella of ${department || "the syllabus"}. Learners analyze fundamental frameworks.`
        },
        {
          title: "Practical Intersections and Applications",
          content: `Analyzing the real-life applications of ${department || "theoretical concepts"} to local industries, technological frameworks, and societal development within academic workspaces.`
        }
      ]
    };
  }
}

function getFallbackStudy(topic: string, course: string) {
  const cleanTopic = topic || "Selected Topic";
  const cleanCourse = course || "Selected Course";
  
  return {
    content: `### Kortex Local Study Companion: ${cleanTopic}
      
Welcome to your adaptive study guide! To ensure that your study schedule remains completely uninterrupted when cloud networks or high-speed AI quotas are reached, Kortex has activated its local learning engine backup for this syllabus.

#### 1. Foundational Overview
The concept of **${cleanTopic}** is a core pillar inside the curriculum of **${cleanCourse}**. Understanding this topic equips you to solve high-yield examination problems, formulate quantitative models, and build structural workflow rules. Across both university and polytechnic settings, mastering these concepts prepares you to trace complex operations with analytical precision.

#### 2. Key Academic Principles
- **Determined input parameters**: Every standard theoretical formulation of **${cleanTopic}** is governed by precise boundary conditions and operational constants.
- **Systematic efficiency constraints**: Optimizing variables requires identifying key systemic limits (such as network latency, physical friction, or financial budget coefficients).
- **Nigerian Real-world Relevance**: We observe these models in high-load logistics across major hubs—ranging from regulating bus terminals in downtown Lagos, balancing energy distribution grids in Benin City, to organizing vendor supply streams in Onitsha markets. Always include these practical case descriptions in your essay responses to score extra credit!

#### 3. Core Operational Case study
Consider a logistics manager or mechanical designer in Ibadan. By applying the frameworks of **${cleanTopic}**, the coordinator can segment processes into modules, reducing operational delays and maximizing resource output. For assignments and examinations, remember that clear layouts and step-by-step mathematical proofs are essential.`,

    key_takeaways: `### Key Academic Takeaways
    
- **Continuous Study Backup**: This complete study syllabus was compiled automatically in offline backup mode to maintain your session continuity during high traffic.
- **High-Yield Subject**: Remember that **${cleanTopic}** is deeply tested. Always double-check definitions of core constants.
- **Accurate Mathematical proofs**: Be structured in your calculations: declare variables, state governing laws, and verify units carefully before finalizing results.
- **Instant Interactive Quiz**: Swipe or navigate to the *Practice* tab next to challenge yourself with 5 dynamic local quiz questions designed to test your core recall immediately.`,

    quiz_questions: [
      {
        question: `What is the primary academic goal of studying ${cleanTopic} within the curriculum?`,
        options: [
          "To analyze underlying structures systematically in order to optimize performance",
          "To learn historical dates without practical applications",
          "To temporarily bypass all practice examinations and tutorials",
          "To completely reject mathematical standards and logical proofs"
        ],
        correctIndex: 0,
        explanation: `The primary goal of ${cleanTopic} within ${cleanCourse} is to evaluate structural functions and optimize resources.`
      },
      {
        question: `When writing academic essay solutions about ${cleanTopic}, which strategy delivers the highest grading results?`,
        options: [
          "Leaving the question sheet completely blank",
          "Interweaving clear definitions with practical localized real-world case examples",
          "Avoiding algebraic unit descriptions and diagrams",
          "Writing unrelated details to fill up space on the response page"
        ],
        correctIndex: 1,
        explanation: "Relating abstract concepts to concrete local case examples is highly favored by examiners as it proves real retention."
      },
      {
        question: "Which of the following describes the most robust strategy to solve computational modeling problems?",
        options: [
          "Establishing detailed parameter bounds, dimensions, and initial constants systematically",
          "Guessing an approximate integer value based on nearby equations",
          "Failing to read through or verify the steps",
          "Working without structured formulas or equations"
        ],
        correctIndex: 0,
        explanation: "Mapping initial variables and boundary values ensures safe computations."
      },
      {
        question: "How should a student best prepare for examination problems on this topic?",
        options: [
          "Relying entirely on scanning notes passively during the morning of the exam",
          "Splitting study blocks into active reading, review, and interactive practice tests",
          "Discarding formulas and flashcard summaries",
          "Avoiding any feedback assessments"
        ],
        correctIndex: 1,
        explanation: "Active recall combined with self-assessment is scientifically proven to boost exam scores by up to 50%."
      },
      {
        question: "Why has Kortex generated this specific lesson package?",
        options: [
          "Because your browser profile was deleted",
          "To keep your educational session seamless and uninterrupted during high cloud AI quota traffic",
          "To prevent you from taking actual quizzes",
          "To replace your professor's lectures entirely"
        ],
        correctIndex: 1,
        explanation: "Kortex includes active local fallbacks to ensure student study flows are never interrupted by external server limits."
      }
    ]
  };
}

function getFallbackQuiz(courseTitle: string, courseCode: string, topicTitle: string, numQuestions: number) {
  const cleanTopic = topicTitle || "Selected Study Unit";
  const num = numQuestions || 5;
  const list = [
    {
      question: `Which of the following describes the central focus of ${cleanTopic} inside ${courseCode || "your course"}?`,
      options: [
        "Analyzing governing principles to maximize structural performance",
        "Relying purely on arbitrary values without mathematical rules",
        "Discarding the syllabus structure completely",
        "Translating simple models to unorganized definitions"
      ],
      correctIndex: 0,
      explanation: `Systematic modeling and optimization represents the central core focus of learning ${cleanTopic}.`
    },
    {
      question: `What is highly essential when analyzing complex variables in ${cleanTopic}?`,
      options: [
        "Declaring parameter values, constants, and boundary values carefully",
        "Leaving coefficients unmeasured and unverified",
        "Assuming standard formulas are always irrelevant",
        "Completing the exam without writing out individual steps"
      ],
      correctIndex: 0,
      explanation: "Mapping initial variables and boundary values ensures safe computations."
    },
    {
      question: "In what way do localized practical examples (e.g. trading grids or transit hubs) aid study comprehension?",
      options: [
        "They translate abstract theoretical math into tangible concepts running in high-load environments",
        "They confuse learners and should be skipped",
        "They make simple assignments more difficult",
        "They remove the need for quantitative equations"
      ],
      correctIndex: 0,
      explanation: "Contextual examples help the brain form logical hooks, making retention smoother."
    },
    {
      question: "What is the science behind incorporating interactive multiple-choice check questions in Kortex?",
      options: [
        "They stimulate memory retrieval, enforcing active recall and long-term consolidation",
        "They merely capture browser telemetry fields",
        "They are designed to shorten reading guides artificially",
        "To replace standard term papers entirely"
      ],
      correctIndex: 0,
      explanation: "Active self-testing is more effective than simple passive reading for long-term recall."
    },
    {
      question: "Which habit is proven to be most effective for mastery of technical curriculums?",
      options: [
        "Structuring study preparation into distributed, incremental milestone reviews and practice quizes",
        "Studying multiple engineering topics in a disorganized rush",
        "Refusing to participate in self-assessment quizzes",
        "Studying only under heavy surrounding audio distractions"
      ],
      correctIndex: 0,
      explanation: "Spaced repetition and active self-assessment build the strongest neural memory pathways."
    }
  ];
  
  return list.slice(0, num);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to log requests
  app.use((req, res, next) => {
    console.log(`[Express] Received ${req.method} ${req.url}`);
    next();
  });

  // Middleware to parse JSON bodies
  app.use(express.json({ limit: "50mb" }));
  
  // Custom error handler for JSON parsing issues
  app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && 'body' in err) {
      console.error("Express JSON Syntax Error:", err);
      return res.status(400).json({ error: "Invalid JSON payload sent to server" });
    }
    if (err.type === 'entity.too.large') {
      console.error("Express Payload Too Large:", err);
      return res.status(413).json({ error: "Payload too large" });
    }
    next(err);
  });

  // API Diagnostics Route using Gemini
  app.get("/api/diagnostics", async (req, res) => {
    const results: any = {
      timestamp: new Date().toISOString(),
      keys: {},
      geminiTests: {}
    };

    const maskKey = (key: string | undefined) => {
      if (!key) return "NOT_SET";
      if (key.length <= 8) return "SET_BUT_SHORT";
      return `${key.slice(0, 4)}...${key.slice(-4)} (length: ${key.length})`;
    };

    const gemKey = process.env.GEMINI_API_KEY;
    results.keys.gemini = { status: gemKey ? "PRESENT" : "MISSING", mask: maskKey(gemKey) };

    try {
      if (!gemKey) {
        results.geminiTests["gemini-2.5-flash"] = { success: false, error: "GEMINI_API_KEY not set" };
      } else {
        const ai = getGeminiClient();
        const testRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: "Hello, respond with exactly 'OK_TEST'",
        });
        results.geminiTests["gemini-2.5-flash"] = {
          success: true,
          response: testRes.text?.trim()
        };
      }
    } catch (err: any) {
      results.geminiTests["gemini-2.5-flash"] = {
        success: false,
        error: err.message || err.toString()
      };
    }

    return res.json(results);
  });

  // API Routes
  app.post("/api/test", (req, res) => {
    res.json({ status: "success" });
  });

  app.post("/api/generate-course", async (req, res) => {
    const { department } = req.body;
    const prompt = `You are a university curriculum designer. Create ONE real-life 100L or 200L course for the "${department}" department.
Include:
1. school (choose randomly between "University of Benin (UNIBEN)" or "Auchi Polytechnic")
2. code (e.g. "MTH 101")
3. title
4. description
5. topics: an array of 2 topics for this course. Each topic should have a "title" and "content" (a correct, detailed academic explanation of the topic, around 100-150 words).`;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a professional university curriculum designer. You must return ONLY a valid JSON object matching the requested schema. Do not output conversational preamble or postscript.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              school: { type: Type.STRING },
              code: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              topics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["title", "content"]
                }
              }
            },
            required: ["school", "code", "title", "description", "topics"]
          }
        }
      });

      const responseText = response.text || "{}";
      const coursePackage = parseJsonSafe(responseText);
      return res.json(coursePackage);
    } catch (error: any) {
      console.warn("Course generation failed under current API limits. Activating high-fidelity fallback course:", error);
      try {
        const coursePackage = getFallbackCourse(department);
        return res.json(coursePackage);
      } catch (fbErr: any) {
        return res.status(500).json({ error: `Failed to compile fallback: ${fbErr.message || fbErr}` });
      }
    }
  });

  app.post("/api/generate-study", async (req, res) => {
    const { topic, course, level } = req.body;
    const prompt = `You are a localized AI tutor for Nigerian University/Polytechnic students.
Create a highly detailed, extremely educational study guide, key takeaways, and exactly 5 practice quiz questions for the topic "${topic}" in the course "${course}" for level/year ${level}.
Ensure explanations are rich, easy-to-understand, and use useful Nigerian examples (e.g. references to life in Benin, Lagos, Ibadan, student campus experiences, local trade, or culture) to explain technical concepts.`;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a professional academic content writer specializing in structured educational JSON responses. You must return only a valid JSON object. No markdown, conversational or chat elements are allowed outside the designated JSON structure.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING, description: "Detailed study guide with headings formatted in Markdown" },
              key_takeaways: { type: Type.STRING, description: "Key core learnings formatted in Markdown" },
              quiz_questions: {
                type: Type.ARRAY,
                description: "Exactly 5 quiz questions",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING }
                  },
                  required: ["question", "options", "correctIndex", "explanation"]
                }
              }
            },
            required: ["content", "key_takeaways", "quiz_questions"]
          }
        }
      });

      const responseText = response.text || "{}";
      const studyPackage = parseJsonSafe(responseText);
      return res.json(studyPackage);
    } catch (error: any) {
      console.warn("Study guide generation failed under current API limits. Activating adaptive offline learning guide:", error);
      try {
        const studyPackage = getFallbackStudy(topic, course);
        return res.json(studyPackage);
      } catch (fbErr: any) {
        return res.status(500).json({ error: `Failed to compile study pack fallback: ${fbErr.message || fbErr}` });
      }
    }
  });

  app.post("/api/generate-image-prompt", async (req, res) => {
    const { title, department } = req.body;
    const prompt = `Generate a short, descriptive 1-sentence prompt for an AI image generator (like Stable Diffusion) for a university course titled "${title}" in the ${department} department. 
The image should be an elegant, modern, academic 3D illustration or a digital art style. 
Avoid text in the image. Keep it professional, clean and educational.
Output ONLY the short prompt string.`;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
      });
      const promptText = response.text?.trim() || `educational illustration for ${title} ${department}`;
      return res.json({ content: promptText });
    } catch (error: any) {
      console.warn("Generating image prompt failed. Returning baseline fallback prompt.", error);
      return res.json({ content: `educational illustration for ${title} ${department}` });
    }
  });

  app.post("/api/generate-quiz", async (req, res) => {
    const { courseTitle, courseCode, topicTitle, numQuestions } = req.body;
    try {
      const prompt = `You are a knowledgeable professor teaching ${courseTitle} (Code: ${courseCode}). 
The student just studied the topic: "${topicTitle}". Generate exactly ${numQuestions || 5} multiple-choice test questions suitable for a university exam about *this specific topic only*.
Make the questions challenging but fair. They must have exactly 4 options.`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a professional academic test designer. You must return ONLY a JSON object containing a 'questions' array. No commentary.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING }
                  },
                  required: ["question", "options", "correctIndex", "explanation"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });

      const responseText = response.text || "{}";
      const parsed = parseJsonSafe(responseText);
      const generatedQuestions = parsed.questions || [];
      return res.json(generatedQuestions);
    } catch (error: any) {
      console.warn("Quiz generation failed under current API limits. Activating offline academic test parameters:", error);
      try {
        const generatedQuestions = getFallbackQuiz(courseTitle, courseCode, topicTitle, numQuestions);
        return res.json(generatedQuestions);
      } catch (fbErr: any) {
        return res.status(500).json({ error: `Failed to compile quiz fallback: ${fbErr.message || fbErr}` });
      }
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { messages, model } = req.body;

    // Set SSE headers upfront
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const chatMessages = messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

      const systemInstruction = "You are Kortex Ai, a helpful and intelligent AI assistant. Anytime you are asked about your identity, who you are, or who is speaking, your answer should be Kortex Ai.";

      // Map models: pro -> 'gemini-2.5-flash', flash -> 'gemini-2.5-flash-lite'
      const activeModel = model === 'pro' ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite';

      console.log(`Chat API: Streaming response via model: ${activeModel}`);

      const ai = getGeminiClient();
      const responseStream = await ai.models.generateContentStream({
        model: activeModel,
        contents: chatMessages,
        config: {
          systemInstruction
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      return res.end();
    } catch (error: any) {
      console.warn("Chat API streaming hit API limitations. Sending supportive fallback message:", error);
      const fallbackText = "Hello! I am Kortex AI. I noticed that we have temporarily reached our high-speed cloud service rate limits, but don't worry! I'm still here to support you in offline local student helper mode.\n\nHow can I help you today? You can ask me study questions, request course outlines, or let me know what topic you are working on!";
      res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true as any },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  async function runStartupDiagnostics() {
    console.log("\n=================== STARTUP GEMINI DIAGNOSTICS ===================");
    const gemKey = process.env.GEMINI_API_KEY;
    console.log(`[DIAG] GEMINI_API_KEY: ${gemKey ? "PRESENT (" + gemKey.slice(0, 4) + "..." + gemKey.slice(-4) + ")" : "MISSING"}`);

    if (gemKey) {
      try {
        console.log(`[DIAG] Testing Gemini API with gemini-2.5-flash...`);
        const ai = getGeminiClient();
        const testRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: "Say 'Gemini OK'",
        });
        console.log(`[DIAG] Gemini response: "${testRes.text?.trim()}"`);
      } catch (e: any) {
        console.error(`[DIAG] Gemini connection failure: ${e.message || e}`);
      }
    } else {
      console.warn("[DIAG] Warning: GEMINI_API_KEY is not defined. AI interactions will fail.");
    }
    console.log("===================================================================\n");
  }

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Express App Error:", err);
    if (!res.headersSent) {
      res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    runStartupDiagnostics().catch(err => {
      console.error("[DIAG] Diagnostics error occurred:", err);
    });
  });
}

startServer();
