const DEEPSEEK_BASE = "https://api.deepseek.com/v1";
const MODEL = "deepseek-chat";

function getApiKey(res) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    res.status(500).json({ error: "DEEPSEEK_API_KEY is not set. Add it in your Vercel project environment variables." });
    return null;
  }
  return key;
}

async function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
  });
}

function parseJson(text) {
  try { return JSON.parse(text); }
  catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    return {};
  }
}

async function deepseekChat(apiKey, messages, jsonMode = false) {
  const body = {
    model: MODEL,
    messages,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  };
  const resp = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`DeepSeek API error ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const pathname = url.pathname;
  const route = pathname.replace(/^\/api/, "");

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = getApiKey(res);
  if (!apiKey) return;

  const body = await readBody(req);

  if (route === "/generate-course") {
    const { department } = body;
    try {
      const text = await deepseekChat(apiKey, [
        {
          role: "system",
          content: 'You are a professional university curriculum designer. Return ONLY a valid JSON object with fields: school (string, set to "University Level"), code (string, e.g. "MTH 101"), title (string), description (string), topics (array of objects with fields: title, chapter, chapter_order, order).',
        },
        {
          role: "user",
          content: `Create ONE highly realistic, comprehensive university course for the "${department}" department. Include at least 8 progressive topics.`,
        },
      ], true);
      return res.status(200).json(parseJson(text));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (route === "/generate-study") {
    const { topic, course, level, department, school } = body;
    try {
      const text = await deepseekChat(apiKey, [
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
      ], true);
      return res.status(200).json(parseJson(text));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (route === "/generate-image-prompt") {
    const { title, department } = body;
    try {
      const text = await deepseekChat(apiKey, [
        {
          role: "user",
          content: `Generate a short 1-sentence prompt for an AI image generator for a university course titled "${title}" in the ${department} department. Style: elegant, modern, academic 3D illustration. No text in image. Output ONLY the prompt sentence, nothing else.`,
        },
      ], false);
      return res.status(200).json({ content: text.trim() || `educational illustration for ${title} ${department}` });
    } catch {
      return res.status(200).json({ content: `educational illustration for ${title} ${department}` });
    }
  }

  if (route === "/generate-quiz") {
    const { courseTitle, courseCode, topicTitle, numQuestions } = body;
    const num = numQuestions || 5;
    try {
      const text = await deepseekChat(apiKey, [
        {
          role: "system",
          content: `You are a university professor. Return ONLY a valid JSON object with a single field "questions" — an array of exactly ${num} multiple-choice questions. Each question must have: question (string), options (array of exactly 4 strings), correctIndex (integer 0-3), explanation (1-2 sentence string).`,
        },
        {
          role: "user",
          content: `Generate exactly ${num} challenging but fair exam questions about the topic "${topicTitle}" from the course ${courseTitle} (${courseCode}).`,
        },
      ], true);
      const parsed = parseJson(text);
      return res.status(200).json(parsed.questions || []);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (route === "/quiz-explain") {
    const { question, options, correctIndex, chosenIndex, userQuery } = body;
    try {
      const correctAnswer = options?.[correctIndex] ?? "Unknown";
      const chosenAnswer = chosenIndex !== undefined ? (options?.[chosenIndex] ?? "Not answered") : "Not answered";
      const text = await deepseekChat(apiKey, [
        {
          role: "system",
          content: "You are Kortex AI, a helpful university tutor. Answer the student's question about the quiz question clearly and concisely in 2-4 sentences. Be educational and encouraging.",
        },
        {
          role: "user",
          content: `Quiz question: "${question}"\nOptions: ${options?.join(", ")}\nCorrect answer: "${correctAnswer}"\nStudent chose: "${chosenAnswer}"\n\nStudent's question: "${userQuery}"`,
        },
      ], false);
      return res.status(200).json({ explanation: text.trim() || "I couldn't generate an explanation. Please try again." });
    } catch {
      return res.status(500).json({ explanation: "Failed to get an explanation. Please try again." });
    }
  }

  if (route === "/chat") {
    const { messages, systemInstruction } = body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const chatMessages = [
        {
          role: "system",
          content: systemInstruction || "You are Kortex AI, a helpful and friendly educational assistant for university students. Be clear, concise, and educational.",
        },
        ...(messages || []),
      ];

      const resp = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: MODEL, messages: chatMessages, stream: true }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        res.write(`data: ${JSON.stringify({ text: "Error connecting to AI. Please try again." })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.delta?.content || "";
            if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
          } catch {}
        }
      }

      res.write("data: [DONE]\n\n");
      return res.end();
    } catch (e) {
      res.write(`data: ${JSON.stringify({ text: "I'm having trouble connecting right now. Please try again in a moment." })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }
  }

  return res.status(404).json({ error: `Unknown route: ${route}` });
}
