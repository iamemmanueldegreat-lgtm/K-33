import { GoogleGenAI } from '@google/genai';
import { jsonrepair } from 'jsonrepair';

const MODEL = 'gemini-2.0-flash';

function getAI(): GoogleGenAI {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY is not set. Add it in the Secrets panel (key: VITE_GEMINI_API_KEY).'
    );
  }
  return new GoogleGenAI({ apiKey });
}

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

// ─── Course generation ──────────────────────────────────────────────────────

export const generateCourseForDepartment = async (department: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Create ONE highly realistic, comprehensive university course for the "${department}" department. Include at least 8 progressive topics.`,
      config: {
        responseMimeType: 'application/json',
        systemInstruction:
          'You are a professional university curriculum designer. Return ONLY a valid JSON object with fields: school (string, set to "University Level"), code (string, e.g. "MTH 101"), title (string), description (string), topics (array of objects with fields: title, chapter, chapter_order, order).',
      },
    });
    return parseJsonSafe(response.text ?? '{}');
  } catch (error) {
    console.error('AI Generation Error for department:', department, error);
    return null;
  }
};

// ─── Study guide + key takeaways + quiz ─────────────────────────────────────

export interface GeneratedStudyPackage {
  content: string;
  key_takeaways: string;
  quiz_questions: any[];
}

export const generateStudyContent = async (
  topic: string,
  course: string,
  level: string,
  department: string = '',
  school: string = ''
): Promise<GeneratedStudyPackage> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Write a detailed study guide, key takeaways, and exactly 5 quiz questions for the topic "${topic}" in the course "${course}" for a ${level || 'Undergraduate'} student.`,
    config: {
      responseMimeType: 'application/json',
      systemInstruction: `You are Kortex AI, an expert university tutor. Adapt all explanations to: department (${department || 'General'}), course (${course || 'General'}), level (${level || 'Undergraduate'}), school (${school || 'University'}).

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
  });
  const data = parseJsonSafe(response.text ?? '{}');
  return {
    content: data.content || '',
    key_takeaways: data.key_takeaways || '',
    quiz_questions: data.quiz_questions || [],
  };
};

// ─── Course image prompt ─────────────────────────────────────────────────────

export const generateCourseImagePrompt = async (
  title: string,
  department: string
) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Generate a short 1-sentence prompt for an AI image generator for a university course titled "${title}" in the ${department} department. Style: elegant, modern, academic 3D illustration. No text in image. Output ONLY the prompt sentence, nothing else.`,
    });
    return response.text?.trim() || `educational illustration for ${title} ${department}`;
  } catch (error) {
    console.error('AI Generation Error:', error);
    return `educational illustration for ${title} ${department}`;
  }
};

// ─── Quiz generation ─────────────────────────────────────────────────────────

export const generateQuiz = async (
  courseTitle: string,
  courseCode: string,
  topicTitle: string,
  numQuestions: number = 10
): Promise<any[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Generate exactly ${numQuestions} challenging but fair exam questions about the topic "${topicTitle}" from the course ${courseTitle} (${courseCode}).`,
    config: {
      responseMimeType: 'application/json',
      systemInstruction: `You are a university professor. Return ONLY a valid JSON object with a single field "questions" — an array of exactly ${numQuestions} multiple-choice questions. Each question must have: question (string), options (array of exactly 4 strings), correctIndex (integer 0-3), explanation (1-2 sentence string).`,
    },
  });
  const data = parseJsonSafe(response.text ?? '{}');
  return data.questions || [];
};

// ─── Quiz follow-up explanation ──────────────────────────────────────────────

export const explainQuizQuestion = async (
  question: string,
  options: string[],
  correctIndex: number,
  chosenIndex: number | undefined,
  userQuery: string
): Promise<string> => {
  const ai = getAI();
  const correctAnswer = options[correctIndex] ?? 'Unknown';
  const chosenAnswer =
    chosenIndex !== undefined ? (options[chosenIndex] ?? 'Not answered') : 'Not answered';

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Quiz question: "${question}"\nOptions: ${options.join(', ')}\nCorrect answer: "${correctAnswer}"\nStudent chose: "${chosenAnswer}"\n\nStudent's question: "${userQuery}"`,
    config: {
      systemInstruction:
        'You are Kortex AI, a helpful university tutor. Answer the student\'s question about the quiz question clearly and concisely in 2-4 sentences. Be educational and encouraging.',
    },
  });
  return response.text?.trim() || "I couldn't generate an explanation. Please try again.";
};

// ─── Streaming chat (shared by Chat page and AskAi drawer) ──────────────────

export type ChatMessage =
  | { role: 'user' | 'model'; parts: Array<{ text: string }> }
  | { role: 'user' | 'model'; content: string };

function normaliseToGeminiContents(
  messages: ChatMessage[]
): Array<{ role: string; parts: Array<{ text: string }> }> {
  return messages
    .filter((m) => {
      const text = 'parts' in m ? m.parts[0]?.text : m.content;
      return !!text;
    })
    .map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: 'parts' in m ? m.parts[0].text : m.content }],
    }));
}

export async function* streamChat(
  messages: ChatMessage[],
  systemInstruction: string
): AsyncGenerator<string> {
  const ai = getAI();
  const contents = normaliseToGeminiContents(messages);

  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents,
    config: { systemInstruction },
  });

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}
