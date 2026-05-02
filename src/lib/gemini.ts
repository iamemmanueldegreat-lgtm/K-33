import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenAI({ apiKey });

export const generateStudyContent = async (topic: string, course: string, level: string) => {
  const prompt = `You are a specialized AI tutor for Nigerian University students. 
  Create a detailed, easy-to-understand study guide for the topic "${topic}" in the course "${course}" for ${level} level. 
  Use relatable Nigerian examples and clear explanations. 
  Include:
  1. Key concepts
  2. Detailed explanation
  3. Practical examples relevant to Nigeria
  4. 3 interactive summary points.
  Format your response in Markdown.`;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return result.text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate study content. Please try again.");
  }
};

export const generateCourseImagePrompt = async (title: string, department: string) => {
  const prompt = `Generate a short, descriptive 1-sentence prompt for an AI image generator (like Stable Diffusion) for a university course titled "${title}" in the ${department} department. 
  The image should be an elegant, modern, academic 3D illustration or a digital art style. 
  Avoid text in the image. Keep it professional, clean and educational.
  Output ONLY the short prompt string.`;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return result.text.trim();
  } catch (error) {
    console.error("AI Generation Error:", error);
    return `educational illustration for ${title} ${department}`;
  }
};
