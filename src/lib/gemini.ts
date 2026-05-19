export const generateCourseForDepartment = async (department: string) => {
  try {
    const res = await fetch("/api/generate-course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ department }),
    });
    if (!res.ok) throw new Error("Network response was not ok");
    return await res.json();
  } catch (error) {
    console.error("AI Generation Error for department:", department, error);
    return null;
  }
};

export const generateStudyContent = async (topic: string, course: string, level: string) => {
  try {
    const res = await fetch("/api/generate-study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, course, level }),
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.content;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate study content. Please try again.");
  }
};

export const generateCourseImagePrompt = async (title: string, department: string) => {
  try {
    const res = await fetch("/api/generate-image-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, department }),
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.content;
  } catch (error) {
    console.error("AI Generation Error:", error);
    return `educational illustration for ${title} ${department}`;
  }
};
