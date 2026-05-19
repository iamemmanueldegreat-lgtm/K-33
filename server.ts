import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const DEFAULT_MODEL = "gemini-3-flash-preview";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API Routes
  app.post("/api/generate-course", async (req, res) => {
    try {
      const { department } = req.body;
      const prompt = `You are a curriculum designer for a university. Create ONE real-life 100L or 200L course for the "${department}" department.
  Include:
  1. school (choose randomly between "University of Benin (UNIBEN)" or "Auchi Polytechnic")
  2. code (e.g. "MTH 101")
  3. title
  4. description
  5. topics: an array of 2 topics for this course. Each topic should have a "title" and "content" (a correct, detailed academic explanation of the topic, around 100-150 words).
  
  Output as JSON.`;

      const result = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: { 
          responseMimeType: "application/json" 
        }
      });

      res.json(JSON.parse(result.text || "{}"));
    } catch (error) {
      console.error("AI Generation Error for department:", error);
      res.status(500).json({ error: "Failed to generate course" });
    }
  });

  app.post("/api/generate-study", async (req, res) => {
    try {
      const { topic, course, level } = req.body;
      const prompt = `You are a specialized AI tutor for Nigerian University students. 
  Create a detailed, easy-to-understand study guide for the topic "${topic}" in the course "${course}" for ${level} level. 
  Use relatable Nigerian examples and clear explanations. 
  Include:
  1. Key concepts
  2. Detailed explanation
  3. Practical examples relevant to Convergence
  4. 3 interactive summary points.
  Format your response in Markdown.`;

      const result = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      res.json({ content: result.text });
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "Failed to generate study content" });
    }
  });

  app.post("/api/generate-image-prompt", async (req, res) => {
    try {
      const { title, department } = req.body;
      const prompt = `Generate a short, descriptive 1-sentence prompt for an AI image generator (like Stable Diffusion) for a university course titled "${title}" in the ${department} department. 
  The image should be an elegant, modern, academic 3D illustration or a digital art style. 
  Avoid text in the image. Keep it professional, clean and educational.
  Output ONLY the short prompt string.`;

      const result = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      res.json({ content: result.text?.trim() || `educational illustration for ${title} ${department}` });
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.json({ content: `educational illustration for ${req.body.title} ${req.body.department}` });
    }
  });

  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { courseTitle, courseCode, topicTitle, numQuestions } = req.body;
      const prompt = `You are a knowledgeable professor teaching ${courseTitle} (Code: ${courseCode}). 
      The student just studied the topic: "${topicTitle}". Generate exactly ${numQuestions} multiple-choice test questions suitable for a university exam about *this specific topic only*.
      Make the questions challenging but fair. They must have exactly 4 options.
      
      Respond as a JSON object with a "questions" array, where each object has:
      - "question" (string)
      - "options" (array of exactly 4 strings)
      - "correctIndex" (integer 0-3)
      - "explanation" (string)
      `;

      const result = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: { 
          responseMimeType: "application/json" 
        }
      });

      let generatedStr = result.text?.trim() || "[]";
      let generatedQuestions: any[] = [];
      const parsed = JSON.parse(generatedStr);
      if (Array.isArray(parsed)) {
        generatedQuestions = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        generatedQuestions = parsed.questions;
      } else {
        const arrays = Object.values(parsed).find(Array.isArray) as any[] | undefined;
        generatedQuestions = arrays || [];
      }

      res.json(generatedQuestions);
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "Failed to generate quiz" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is missing.");
      }

      const chat = ai.chats.create({
        model: DEFAULT_MODEL,
        config: {
          systemInstruction: "You are Kortex Ai, a helpful and intelligent AI assistant. Anytime you are asked about your identity, who you are, or who is speaking, your answer should be Kortex Ai."
        }
      });

      // Filter out system messages as they are handled by config above
      const userMessages = messages.filter((m: any) => m.role !== 'system');
      
      // We send all previous messages except the last one to build history
      // and the last one via sendMessageStream.
      // Alternatively, we can just use the last message if we don't want history management complexity here.
      // But for a chat, history is better.
      const lastMessage = userMessages.pop();
      
      // If there's history, we might want to initialize chat with it.
      // For simplicity in this replacement, we'll send the last message.
      
      const responseStream = await chat.sendMessageStream({
        message: lastMessage.content
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of responseStream) {
        const textChunk = chunk.text || "";
        if (textChunk) {
          res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Chat API Error:", error);
      res.status(500).json({ error: error.message || "Failed to communicate with chat API" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
