import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import { jsonrepair } from "jsonrepair";
import { GoogleGenAI } from "@google/genai";

const Type = {
  OBJECT: "object",
  ARRAY: "array",
  STRING: "string",
  INTEGER: "integer"
};

// Lazy-loaded AI clients
let openaiClient: OpenAI | null = null;
let lastApiKey: string | null = null;
let googleGenAIClient: GoogleGenAI | null = null;
let lastGeminiKey: string | null = null;

function getGeminiClient(): any {
  const geminiKey = process.env.GEMINI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  if (!geminiKey && !deepseekKey) {
    throw new Error(
      "No API Keys detected. Please set GEMINI_API_KEY or DEEPSEEK_API_KEY in your hosting environment."
    );
  }

  // Preferred Path: OpenAI / DeepSeek client via DEEPSEEK_API_KEY
  if (!openaiClient || deepseekKey !== lastApiKey) {
    if (deepseekKey) {
      lastApiKey = deepseekKey ?? null;
      openaiClient = new OpenAI({
        apiKey: deepseekKey,
        baseURL: "https://api.deepseek.com/v1"
      });
    }
  }

  // If DeepSeek key exists, use it exclusively as preferred by user
  if (deepseekKey && openaiClient) {
    return {
      models: {
        generateContent: async (args: any) => {
          let messages = [];
          let systemInstruction = "";
          
          if (args.config && args.config.systemInstruction) {
            systemInstruction = args.config.systemInstruction;
          }

          if (args.config && args.config.responseSchema) {
            const schemaStr = JSON.stringify(args.config.responseSchema);
            systemInstruction += `\n\nCRITICAL JSON SCHEMA REQUIREMENT:
You MUST return a JSON object conforming strictly to the following JSON Schema structure:
${schemaStr}

Ensure you output ONLY a valid stringified JSON object containing exactly the requested keys. Avoid wrapping JSON keys in custom types or lists unless explicitly requested. Do not output anything other than this JSON.`;
          }

          if (systemInstruction) {
            messages.push({ role: "system", content: systemInstruction });
          }

          if (typeof args.contents === "string") {
            messages.push({ role: "user", content: args.contents });
          } else if (Array.isArray(args.contents)) {
            for (const msg of args.contents) {
              const role = msg.role === 'model' ? 'assistant' : 'user';
              const content = msg.parts ? msg.parts[0].text : (msg.text || JSON.stringify(msg));
              messages.push({ role, content });
            }
          } else {
            messages.push({ role: "user", content: JSON.stringify(args.contents) });
          }
          
          let response_format;
          if (args.config && (args.config.responseMimeType === "application/json" || args.config.responseSchema)) {
            response_format = { type: "json_object" };
          }

          const res = await openaiClient!.chat.completions.create({
            model: "deepseek-chat",
            messages,
            response_format,
          });

          return {
            text: res.choices[0].message.content
          };
        },
        generateContentStream: async (args: any) => {
          let messages = [];
          if (args.config && args.config.systemInstruction) {
            messages.push({ role: "system", content: args.config.systemInstruction });
          }

          if (typeof args.contents === "string") {
            messages.push({ role: "user", content: args.contents });
          } else {
            for (const msg of args.contents) {
              const role = msg.role === 'model' ? 'assistant' : 'user';
              const content = msg.parts ? msg.parts[0].text : (msg.text || JSON.stringify(msg));
              messages.push({ role, content });
            }
          }
          
          const stream = await openaiClient!.chat.completions.create({
            model: "deepseek-chat",
            messages,
            stream: true
          });

          async function* streamGenerator() {
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content || "";
              yield { text };
            }
          }
          return streamGenerator();
        }
      }
    };
  }

  // Fallback Path: Official Gemini SDK via GEMINI_API_KEY
  if (geminiKey) {
    if (!googleGenAIClient || geminiKey !== lastGeminiKey) {
      lastGeminiKey = geminiKey;
      googleGenAIClient = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }

    return {
      models: {
        generateContent: async (args: any) => {
          let model = args.model || "gemini-3.5-flash";
          if (model === "deepseek-chat" || model.includes("deepseek") || model.includes("gemini-1.5")) {
            model = "gemini-3.5-flash";
          }

          const config: any = {};
          if (args.config) {
            if (args.config.systemInstruction) {
              config.systemInstruction = args.config.systemInstruction;
            }
            if (args.config.responseMimeType) {
              config.responseMimeType = args.config.responseMimeType;
            }
            if (args.config.responseSchema) {
              config.responseSchema = args.config.responseSchema;
            }
          }

          const response = await googleGenAIClient!.models.generateContent({
            model,
            contents: args.contents,
            config,
          });

          return {
            text: response.text
          };
        },
        generateContentStream: async (args: any) => {
          let model = args.model || "gemini-3.5-flash";
          if (model === "deepseek-chat" || model.includes("deepseek") || model.includes("gemini-1.5")) {
            model = "gemini-3.5-flash";
          }

          const config: any = {};
          if (args.config) {
            if (args.config.systemInstruction) {
              config.systemInstruction = args.config.systemInstruction;
            }
            if (args.config.responseMimeType) {
              config.responseMimeType = args.config.responseMimeType;
            }
            if (args.config.responseSchema) {
              config.responseSchema = args.config.responseSchema;
            }
          }

          const responseStream = await googleGenAIClient!.models.generateContentStream({
            model,
            contents: args.contents,
            config,
          });

          async function* googleStreamGenerator() {
            for await (const chunk of responseStream) {
              const text = chunk.text || "";
              yield { text };
            }
          }
          return googleStreamGenerator();
        }
      }
    };
  }
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
    // Attempt jsonrepair
    try {
      const repaired = jsonrepair(cleaned);
      return JSON.parse(repaired);
    } catch (repairErr) {
      console.error("jsonrepair parsing failed too:", repairErr);
    }

    console.error("Failed parsing JSON directly. Attempting extraction from:", text);
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      try {
        const potentialJson = cleaned.substring(startIdx, endIdx + 1);
        try {
          return JSON.parse(jsonrepair(potentialJson));
        } catch {
          return JSON.parse(potentialJson);
        }
      } catch (innerErr) {
        console.error("Extraction fallback failed too:", innerErr);
      }
    }
    const arrayStartIdx = cleaned.indexOf("[");
    const arrayEndIdx = cleaned.lastIndexOf("]");
    if (arrayStartIdx !== -1 && arrayEndIdx !== -1 && arrayEndIdx > arrayStartIdx) {
      try {
        const potentialArray = cleaned.substring(arrayStartIdx, arrayEndIdx + 1);
        try {
          return JSON.parse(jsonrepair(potentialArray));
        } catch {
          return JSON.parse(potentialArray);
        }
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

#### 1. Comprehensive Overview
The concept of **${cleanTopic}** is a core pillar inside the curriculum of **${cleanCourse}**. Understanding this topic equips you to solve complex problems, formulate models, and build structural workflow rules. Mastering these concepts prepares you to trace complex operations with analytical precision.

#### 2. Key Academic Principles
- **Determined input parameters**: Every standard theoretical formulation of **${cleanTopic}** is governed by precise boundary conditions and operational constants.
- **Systematic efficiency constraints**: Optimizing variables requires identifying key systemic limits (such as network latency, physical friction, or financial budget coefficients).
- **Real-world Application**: We observe these models in high-load scenarios across major industries—ranging from regulating systems, balancing distribution grids, to organizing supply streams. Always include practical case descriptions in your essay responses to demonstrate deep understanding.

#### 3. Core Operational Case study
By applying the frameworks of **${cleanTopic}**, you can segment processes into modules, reducing operational delays and maximizing resource output. For assignments and examinations, remember that clear layouts and step-by-step proofs are essential.`,

    key_takeaways: `### Key Academic Takeaways
    
- **Continuous Study Backup**: This complete study syllabus was compiled automatically in offline backup mode to maintain your session continuity.
- **Fundamental Importance**: Remember that **${cleanTopic}** serves as a foundational element. Always double-check definitions of core concepts.
- **Accurate Application**: Be structured in your problem solving: declare variables, state governing laws, and verify units carefully before finalizing results.
- **Instant Interactive Quiz**: Check out the *Practice* section below to challenge yourself with dynamic local quiz questions designed to test your core recall immediately.`,

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

export const app = express();
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
    const deepKey = process.env.DEEPSEEK_API_KEY;
    results.keys.gemini = { status: gemKey ? "PRESENT" : "MISSING", mask: maskKey(gemKey) };
    results.keys.deepseek = { status: deepKey ? "PRESENT" : "MISSING", mask: maskKey(deepKey) };

    try {
      if (!gemKey && !deepKey) {
        results.geminiTests["active-ai"] = { success: false, error: "Neither GEMINI_API_KEY nor DEEPSEEK_API_KEY is configured." };
      } else {
        const ai = getGeminiClient();
        const testRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: "Hello, respond with exactly 'OK_TEST'",
        });
        results.geminiTests["active-ai"] = {
          success: true,
          response: testRes.text?.trim()
        };
      }
    } catch (err: any) {
      results.geminiTests["active-ai"] = {
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
    const prompt = `You are a world-class university curriculum designer. Create ONE highly realistic, comprehensive course for the "${department}" department.
Include:
1. school (set as "University Level")
2. code (e.g. "MTH 101")
3. title
4. description
5. topics: an array of at least 8 progressive topics for this course. Each topic should have a "title", "chapter" (the module name), "chapter_order", and "order".`;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
                    chapter: { type: Type.STRING },
                    chapter_order: { type: Type.INTEGER },
                    order: { type: Type.INTEGER }
                  },
                  required: ["title", "chapter", "chapter_order", "order"]
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
      console.log(`Course generation failed under current API limits. Activating high-fidelity fallback course: ${error.message || error}`);
      try {
        const coursePackage = getFallbackCourse(department);
        return res.json(coursePackage);
      } catch (fbErr: any) {
        return res.status(500).json({ error: `Failed to compile fallback: ${fbErr.message || fbErr}` });
      }
    }
  });

  app.post("/api/generate-study", async (req, res) => {
    const { topic, course, level, department, school } = req.body;
    
    const systemPrompt = `You are an AI tutor built for students in universities, polytechnics, and colleges. Your role is to teach topics clearly, accurately, and in a way that matches the student's department, course, and level of study.

STUDENT PROFILE CONTEXT:
- Student Department: ${department || "General Studes"}
- Student Course: ${course || "General Course"}
- Student Level of Study: ${level || "Undergraduate"}
- School/College: ${school || "Institution"}

Core Goal
Your goal is not just to answer questions, but to help students understand concepts deeply. Explain topics as a good lecturer or tutor would, using simple language and clear examples.
Always assume that the student is learning and may have little or no prior knowledge of the topic.

Teaching Principles
1. Adapt to the Student's Course and Department
Tailor explanations to the student's department ("${department || "General"}"), course ("${course || "General"}"), academic level ("${level || "Undergraduate"}"), and area of specialization. Use examples and terminology that are relevant to "${department || "their field"}".
- Computer Science students should receive explanations with programming, networking, databases, and software examples.
- Mechanical Engineering students should receive engineering and machine-related examples.
- Business Administration students should receive business and management examples.
- Medical students should receive health and clinical examples.
Never give explanations that are unnecessarily advanced or unrelated to the student's discipline or level.

2. Use Simple Language
Use simple words and short sentences. Avoid complicated grammar and difficult vocabulary unless technical terms are necessary.
When technical terms are used: define them immediately, explain them in plain English, and give practical examples.
The goal is understanding, not sounding academic.

3. Structure Every Explanation
Organize explanations inside the 'content' string parameter using clear sections:
- Definition (Explain what the concept means)
- Why It Is Important (Explain why students need to know it)
- Main Components or Concepts (Break down the topic into smaller parts)
- Detailed Explanation (Explain each part carefully)
- How It Works (if applicable - describe the process step-by-step)
- Examples (Provide practical examples related to the student's field)
- Real-Life Applications (Show where the concept is used in practice)
- Advantages and Disadvantages (if applicable - explain benefits and limitations)
- Summary (Give a concise recap)

4. Explain Step by Step
Break difficult concepts into smaller pieces. Do not skip steps. Do not assume the student already understands previous concepts. Build explanations from basic to advanced.

5. Be Detailed
Provide complete explanations. Avoid one-paragraph answers for large topics. Explain why it exists, how it works, when/where it is used, and advantages/disadvantages.

6. Use Examples Frequently
Use examples throughout. Adapt examples to the student's level ("${level || "Undergraduate"}") and department ("${department || "General"}").

7. Compare Similar Concepts
When concepts are often confused, explain the differences clearly using Markdown tables whenever helpful (e.g., Router vs Switch, RAM vs ROM, HTTP vs HTTPS, Compiler vs Interpreter).

8. Use Analogies
Use familiar analogies to simplify difficult concepts.

9. Encourage Understanding Instead of Memorization
Focus on understanding why something works, what would happen if it did not exist, and common student mistakes.

10. Explain Mathematics and Formulas
If formulas are involved: write the formula, explain each variable, explain what the formula means, solve examples step-by-step, show units, and interpret the final answer.

11. Handle Programming Topics Properly
If programming is involved: explain the concept first, code examples next, line-by-line file details, common mistakes, explain output, real applications. Use comments inside code.

12. Use Tables When Appropriate
Use tables for differences, comparisons, advantages/disadvantages, features, and classifications.

13. Answer According to Study Level
Adjust explanation depth according to: ND1, ND2, HND, Undergraduate, Beginner, Intermediate, Advanced. The student is currently studying at the level "${level || "Undergraduate"}". Avoid teaching beyond this level.

14. Handle Examination Questions
If asked an exam question: explain topic first, then provide the answer, show reasoning, and teach the concepts.

15. Accuracy
Never invent facts.

16. End With Reinforcement
Finish the generated study content ('content' field) with:
- Key Points to Remember (Provide 3–10 important points)
- Common Examination Questions (Generate likely exam questions)
- Related Topics (Suggest concepts the student should learn next)

CRITICAL FORMATTING INSTRUCTIONS for Markdown:
- Use standard markdown headings (e.g., '### Heading Text').
- ALWAYS insert two separate newline characters (\\n\\n) before and after every single heading (###), bullet point, or paragraph. Do NOT merge headings with the following paragraph text under any circumstances, as they must render correctly inside standard React markdown parsers.
- Avoid using long block text with no line breaks. Use bullet points and numeric spacing separated by double newlines.

Response Style:
Be friendly, patient, clear, detailed, educational, and accurate. Avoid unnecessary jargon, overly academic language, extremely short answers, large blocks of text, or skipping explanations. Prioritize understanding over brevity.
Anytime you are asked about your identity, who you are, or who is speaking, your answer should be Kortex AI.

CRITICAL OBJECTIVE LIMITATION:
You must return ONLY a valid stringified JSON object matching the requested schema. No markdown, conversational or chat elements are allowed outside the designated JSON structure. The 'content' field must contain the detailed formatted study guide under the system prompt tutoring parameters, and 'key_takeaways' must contain the takeaways.`;

    const prompt = `Write a highly detailed, comprehensive study guide, key takeaways, and exactly 5 practice quiz questions for the topic "${topic}" in the course "${course}" suitable for a student at level "${level || 'Undergraduate'}" and department "${department || 'General'}".
Ensure the study guide content field conforms strictly to Kortex AI's tutoring principles and structured sections schema.`;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING, description: "Detailed study guide with headings formatted in Markdown under Kortex AI tutoring principles" },
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
      console.log(`Study guide generation failed under current API limits. Activating adaptive offline learning guide: ${error.message || error}`);
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
        model: "gemini-1.5-flash",
        contents: prompt,
      });
      const promptText = response.text?.trim() || `educational illustration for ${title} ${department}`;
      return res.json({ content: promptText });
    } catch (error: any) {
      console.log(`Generating image prompt failed. Returning baseline fallback prompt: ${error.message || error}`);
      return res.json({ content: `educational illustration for ${title} ${department}` });
    }
  });

  app.post("/api/generate-quiz", async (req, res) => {
    const { courseTitle, courseCode, topicTitle, numQuestions } = req.body;
    try {
      const prompt = `You are a knowledgeable professor teaching ${courseTitle} (Code: ${courseCode}). 
The student just studied the topic: "${topicTitle}". Generate exactly ${numQuestions || 5} multiple-choice test questions suitable for a university exam about *this specific topic only*.
Make the questions challenging but fair. They must have exactly 4 options.
For each question, the "explanation" (Retrieval Rationale) MUST be simple, short, and highly direct (strictly 1 or 2 sentences maximum), explaining in a very simple way why the correct option is correct and why.`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
      console.log(`Quiz generation failed under current API limits. Activating offline academic test parameters: ${error.message || error}`);
      try {
        const generatedQuestions = getFallbackQuiz(courseTitle, courseCode, topicTitle, numQuestions);
        return res.json(generatedQuestions);
      } catch (fbErr: any) {
        return res.status(500).json({ error: `Failed to compile quiz fallback: ${fbErr.message || fbErr}` });
      }
    }
  });

  app.post("/api/quiz-explain", async (req, res) => {
    const { question, options, correctIndex, chosenIndex, userQuery } = req.body;
    try {
      const correctOptionText = Array.isArray(options) && typeof correctIndex === "number" ? options[correctIndex] : "";
      const chosenOptionText = Array.isArray(options) && typeof chosenIndex === "number" ? options[chosenIndex] : "";

      const prompt = `You are Kortex AI, an expert academic tutor.
Below is a multiple-choice question from a practice quiz that a student just answered, along with their selected answer, the correct answer, and their follow-up question.

QUESTION DETAILS:
- Question: "${question}"
- Options:
  A: "${options?.[0] || ''}"
  B: "${options?.[1] || ''}"
  C: "${options?.[2] || ''}"
  D: "${options?.[3] || ''}"
- Correct Answer: Correct Index ${correctIndex} is "${correctOptionText}"
- Student Selected Answer: Selected Index ${chosenIndex} is "${chosenOptionText}"

STUDENT'S FOLLOW-UP QUESTION:
"${userQuery}"

Task:
Answer the student's question clearly, thoroughly, and encouragingly in 2 to 4 sentences. Explain the solution to help them understand the concept deeply.`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      return res.json({ explanation: response.text || "I apologize, but I could not formulate an answer right now. Please try again." });
    } catch (error: any) {
      console.error(`Quiz explanation failed:`, error);
      return res.status(500).json({ error: error.message || "Failed to generate explanation." });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { messages, model, student, topicTitle, studyContext, isAskAiDrawer } = req.body;
    const department = student?.department || "";
    const level = student?.level || "";
    const school = student?.school || "";
    const fullName = student?.fullName || "";

    // Set SSE headers upfront
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const chatMessages = messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

      let systemInstruction = `You are Kortex AI, an AI tutor built for students in universities, polytechnics, and colleges. Your role is to teach topics clearly, accurately, and in a way that matches the student's department, course, and level of study. Any time you are asked about your identity, who you are, or who is speaking, your answer should be Kortex AI.

STUDENT PROFILE CONTEXT:
- Student Name: ${fullName || "Student"}
- Department: ${department || "General"}
- Level of Study: ${level || "General"}
- School/Institution: ${school || "General"}

Core Goal
Your goal is not just to answer questions, but to help students understand concepts deeply. Explain topics as a good lecturer or tutor would, using simple language and clear examples.
Always assume that the student is learning and may have little or no prior knowledge of the topic.

---

Teaching Principles

1. Adapt to the Student's Course and Department
Tailor explanations to the student's:
- Department (User-specific field: ${department || "General"})
- Level of Study (User-specific level: ${level || "General"})
- Areas of specialization

Use examples and terminology that are relevant to that field.
- Computer Science students should receive explanations with programming, networking, databases, and software examples.
- Mechanical Engineering students should receive engineering and machine-related examples.
- Business Administration students should receive business and management examples.
- Medical students should receive health and clinical examples.

Never give explanations that are unnecessarily advanced or unrelated to the student's discipline.

---

2. Use Simple Language
Use simple words and short sentences. Avoid complicated grammar and difficult vocabulary unless technical terms are necessary.
When technical terms are used: define them immediately, explain them in plain English, and give practical examples.
The goal is understanding, not sounding academic.

---

3. Structure Every Explanation
Organize explanations using clear sections whenever possible:
- Definition (Explain what the concept means)
- Why It Is Important (Explain why students need to know it)
- Main Components or Concepts (Break down the topic into smaller parts)
- Detailed Explanation (Explain each part carefully)
- How It Works (if applicable - describe standard processes step-by-step)
- Examples (Provide practical examples related specifically to the student's field)
- Real-Life Applications (Show where the concept is used in practice)
- Advantages and Disadvantages (if applicable)
- Summary (Give a concise recap)

---

4. Explain Step by Step
Break difficult concepts into smaller pieces. Do not skip steps. Do not assume the student already understands previous concepts. Build explanations from basic to advanced.

---

5. Be Detailed
Provide complete explanations. Avoid extremely short answers or single-paragraph answers for large topics. Explain why it exists, how it works, when/where it is used, and advantages/disadvantages.

---

6. Use Examples Frequently
Use examples throughout the explanation. Examples should match the student's department ("${department || "General"}") and level ("${level || "General"}").

---

7. Compare Similar Concepts
When concepts are often confused, explain the differences clearly using Markdown tables (e.g., Router vs Switch, RAM vs ROM, Compiler vs Interpreter).

---

8. Use Analogies
Use familiar analogies to simplify difficult concepts.

---

9. Encourage Understanding Instead of Memorization
Focus on helping students understand concepts. Explain why something works, what would happen if it didn't exist, and common student mistakes.

---

10. Explain Mathematics and Formulas
If formulas are involved: write the formula, explain each variable, solve examples step-by-step, show units, and interpret the final answer. Do not skip calculation steps.

---

11. Handle Programming Topics Properly
For programming questions: explain the concept first, then provide code, explain it line by line, mention common mistakes, explain the output, and use comments inside.

---

12. Use Tables When Appropriate
Use tables for differences, comparisons, advantages and disadvantages, features, and classifications.

---

13. Answer According to Study Level
Adjust explanation depth according to: ND1, ND2, HND, Undergraduate, Beginner, Intermediate, Advanced. The student is currently studying at level "${level || "General"}". Avoid teaching beyond this level.

---

14. Handle Examination Questions
If asked an exam question: explain the topic first, then provide the full answer showing reasons, teaching the concept.

---

15. If the Question Is Ambiguous
If the user's request is highly ambiguous or vague, ask for their course, department, or level before answering.

---

16. Maintain Accuracy
Never invent facts.

---

17. End With Reinforcement
For medium or large help sessions, finish with:
- Key Points to Remember (3-10 points)
- Common Examination Questions
- Quick Quiz (3-5 questions)
- Related Topics

Response Style:
Be friendly, patient, clear, detailed, educational, and accurate.
Avoid unnecessary jargon, overly academic language, extremely short answers, large blocks of text, or skipping explanations. Prioritize understanding over brevity.`;

      if (topicTitle) {
        systemInstruction += `\n\n- CURRENTLY ACTIVE TOPIC BEING READ BY STUDENT: "${topicTitle}"`;
      }

      if (studyContext) {
        systemInstruction += `\n\n---
CONTEXT OF THE STUDY GUIDE/MATERIAL CURRENTLY BEING READ BY THE STUDENT:
The student is active on the learning screen of the topic "${topicTitle || 'Current Lesson'}". Confidently explain, clarify, or simplify questions about this specific teaching material:
"""
${studyContext}
"""

TUTORING INSTRUCTION REGARDING CONTEXT:
When the user asks questions or raises issues, prioritize referencing, explaining, and elaborating on the study material details provided above. Ensure your responses are tailored to help them master this core concept. Do not copy-paste large blocks verbatim unless requested; instead, explain, break down, give intuitive analogies, or guide step-by-step.`;
      }

      if (isAskAiDrawer) {
        systemInstruction += `\n\n---
CRITICAL DRAWER DIRECTIVE - CONCISE & FOCUSSED REPLY:
The student is asking a direct follow-up question via an overlays drawer directly on top of the learning lesson screen.
- DO NOT answer with a long, exhaustive explanation, essay, or structure that looks like another full lesson guide.
- Keep the response simple, normal, and extremely concise.
- Direct reply: Answer in 1 to 3 direct sentences, focusing purely on answering their precise query simply and helping them grasp that single detail immediately.
- Use casual but clear vocabulary, keeping it professional and highly friendly.`;
      }

      // Map models: pro -> 'gemini-1.5-flash', flash -> 'gemini-1.5-flash'
      const activeModel = model === 'pro' ? 'gemini-1.5-flash' : 'gemini-1.5-flash';

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
      console.log(`Chat API streaming hit API limitations. Sending supportive fallback message: ${error.message || error}`);
      const fallbackText = "Hello! I am Kortex AI. I noticed that we have temporarily reached our high-speed cloud service rate limits, but don't worry! I'm still here to support you in offline local student helper mode.\n\nHow can I help you today? You can ask me study questions, request course outlines, or let me know what topic you are working on!";
      res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    createViteServer({
      server: { middlewareMode: true, allowedHosts: true as any },
      appType: "spa",
    }).then(vite => {
      app.use(vite.middlewares);
      boot();
    });
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    boot();
  }

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Express App Error:", err);
    if (!res.headersSent) {
      res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
    }
  });

  function boot() {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

export default app;
