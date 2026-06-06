import { Router, type IRouter } from "express";
import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";

const router: IRouter = Router();

const Type = {
  OBJECT: "object",
  ARRAY: "array",
  STRING: "string",
  INTEGER: "integer",
};

function parseJsonSafe(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(jsonrepair(text));
    } catch {
      return {};
    }
  }
}

function getGeminiClient(): GoogleGenAI {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  return new GoogleGenAI({ apiKey: geminiKey });
}

router.post("/generate-course", async (req, res) => {
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
        systemInstruction:
          "You are a professional university curriculum designer. Return ONLY a valid JSON object matching the requested schema.",
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
                  order: { type: Type.INTEGER },
                },
                required: ["title", "chapter", "chapter_order", "order"],
              },
            },
          },
          required: ["school", "code", "title", "description", "topics"],
        },
      },
    } as any);

    const responseText = response.text || "{}";
    return res.json(parseJsonSafe(responseText));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to generate course" });
  }
});

router.post("/generate-study", async (req, res) => {
  const { topic, course, level, department, school } = req.body;

  const systemPrompt = `You are Kortex AI, an AI tutor for university students. Teach topics clearly and adapt to the student's department (${department || "General"}), course (${course || "General"}), and level (${level || "Undergraduate"}).

Structure your 'content' using these markdown sections:
### Definition
### Why It Is Important
### Main Components or Concepts
### Detailed Explanation
### Examples
### Real-Life Applications
### Summary
### Key Points to Remember
### Common Examination Questions

Return ONLY valid JSON with: content (detailed markdown study guide), key_takeaways (markdown string), quiz_questions (array of 5 questions).`;

  const prompt = `Write a detailed study guide, key takeaways, and exactly 5 quiz questions for topic "${topic}" in course "${course}" for a ${level || "Undergraduate"} student in ${department || "General"} department at ${school || "University"}.`;

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
            content: { type: Type.STRING },
            key_takeaways: { type: Type.STRING },
            quiz_questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ["question", "options", "correctIndex", "explanation"],
              },
            },
          },
          required: ["content", "key_takeaways", "quiz_questions"],
        },
      },
    } as any);

    const responseText = response.text || "{}";
    return res.json(parseJsonSafe(responseText));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to generate study content" });
  }
});

router.post("/generate-image-prompt", async (req, res) => {
  const { title, department } = req.body;
  const prompt = `Generate a short 1-sentence prompt for an AI image generator for a university course titled "${title}" in the ${department} department. Academic, modern, 3D illustration style. No text in image. Output ONLY the prompt string.`;

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });
    return res.json({ content: response.text?.trim() || `educational illustration for ${title} ${department}` });
  } catch (error: any) {
    return res.json({ content: `educational illustration for ${title} ${department}` });
  }
});

router.post("/generate-quiz", async (req, res) => {
  const { courseTitle, courseCode, topicTitle, numQuestions } = req.body;
  const num = numQuestions || 5;

  try {
    const prompt = `You are a professor teaching ${courseTitle} (${courseCode}). Generate exactly ${num} multiple-choice exam questions about the topic: "${topicTitle}". Each question must have 4 options. Keep explanations concise (1-2 sentences).`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Return ONLY a JSON object with a 'questions' array. No commentary.",
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
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ["question", "options", "correctIndex", "explanation"],
              },
            },
          },
          required: ["questions"],
        },
      },
    } as any);

    const responseText = response.text || "{}";
    const parsed = parseJsonSafe(responseText);
    return res.json(parsed.questions || []);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to generate quiz" });
  }
});

router.post("/chat", async (req, res) => {
  const { messages, systemInstruction, model } = req.body;

  try {
    const ai = getGeminiClient();
    const activeModel = "gemini-1.5-flash";

    const responseStream = await ai.models.generateContentStream({
      model: activeModel,
      contents: messages || [],
      config: {
        systemInstruction: systemInstruction || "You are Kortex AI, a helpful educational assistant.",
      },
    } as any);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of responseStream) {
      const text = (chunk as any).text || "";
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    return res.end();
  } catch (error: any) {
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || "Chat failed" });
    }
    res.write(`data: ${JSON.stringify({ text: "I'm having trouble connecting right now. Please try again." })}\n\n`);
    res.write("data: [DONE]\n\n");
    return res.end();
  }
});

export default router;
