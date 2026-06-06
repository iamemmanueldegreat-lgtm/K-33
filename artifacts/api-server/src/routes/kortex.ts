import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { jsonrepair } from "jsonrepair";

const router: IRouter = Router();

function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not set. Add it in the Secrets panel.");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com/v1",
  });
}

const MODEL = "deepseek-chat";

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

router.post("/generate-course", async (req, res) => {
  const { department } = req.body;

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are a professional university curriculum designer. Return ONLY a valid JSON object with fields: school (string, set to "University Level"), code (string, e.g. "MTH 101"), title (string), description (string), topics (array of objects with fields: title, chapter, chapter_order, order).',
        },
        {
          role: "user",
          content: `Create ONE highly realistic, comprehensive university course for the "${department}" department. Include at least 8 progressive topics.`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "{}";
    return res.json(parseJsonSafe(text));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to generate course" });
  }
});

router.post("/generate-study", async (req, res) => {
  const { topic, course, level, department, school } = req.body;

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are Kortex AI, an expert university tutor. Adapt all explanations to: department (${department || "General"}), course (${course || "General"}), level (${level || "Undergraduate"}), school (${school || "University"}).

Structure the "content" field using these markdown sections (always insert blank lines between sections):
### Definition
### Why It Is Important
### Main Components or Concepts
### Detailed Explanation
### Examples
### Real-Life Applications
### Summary
### Key Points to Remember
### Common Examination Questions

Return ONLY a valid JSON object with exactly these fields:
- "content": detailed markdown study guide (string)
- "key_takeaways": key learning points in markdown (string)  
- "quiz_questions": array of exactly 5 objects, each with: question (string), options (array of 4 strings), correctIndex (integer 0-3), explanation (string)`,
        },
        {
          role: "user",
          content: `Write a detailed study guide, key takeaways, and exactly 5 quiz questions for the topic "${topic}" in the course "${course}" for a ${level || "Undergraduate"} student.`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "{}";
    return res.json(parseJsonSafe(text));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to generate study content" });
  }
});

router.post("/generate-image-prompt", async (req, res) => {
  const { title, department } = req.body;

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: `Generate a short 1-sentence prompt for an AI image generator for a university course titled "${title}" in the ${department} department. Style: elegant, modern, academic 3D illustration. No text in image. Output ONLY the prompt sentence, nothing else.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim() || `educational illustration for ${title} ${department}`;
    return res.json({ content });
  } catch (error: any) {
    return res.json({ content: `educational illustration for ${title} ${department}` });
  }
});

router.post("/generate-quiz", async (req, res) => {
  const { courseTitle, courseCode, topicTitle, numQuestions } = req.body;
  const num = numQuestions || 5;

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a university professor. Return ONLY a valid JSON object with a single field "questions" — an array of exactly ${num} multiple-choice questions. Each question must have: question (string), options (array of exactly 4 strings), correctIndex (integer 0-3), explanation (1-2 sentence string).`,
        },
        {
          role: "user",
          content: `Generate exactly ${num} challenging but fair exam questions about the topic "${topicTitle}" from the course ${courseTitle} (${courseCode}).`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = parseJsonSafe(text);
    return res.json(parsed.questions || []);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to generate quiz" });
  }
});

router.post("/chat", async (req, res) => {
  const { messages, systemInstruction } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const client = getClient();

    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemInstruction || "You are Kortex AI, a helpful and friendly educational assistant for university students. Be clear, concise, and educational.",
      },
      ...(messages || []),
    ];

    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
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
    res.write(`data: ${JSON.stringify({ text: "I'm having trouble connecting right now. Please try again in a moment." })}\n\n`);
    res.write("data: [DONE]\n\n");
    return res.end();
  }
});

export default router;
