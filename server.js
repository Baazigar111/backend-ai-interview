import 'dotenv/config';
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenAI } from "@google/genai";

const { json } = bodyParser;

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(json());

// Initialize the AI client using the API key from environment variables
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.post("/api/generateQuestions", async (req, res) => {
  try {
    const { role } = req.body;

    // 1. Define the mandatory JSON schema for the output array
    const questionSchema = {
      type: "ARRAY",
      description: "An array of exactly six interview questions.",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "NUMBER", description: "A unique identifier for the question (1-6)." },
          text: { type: "STRING", description: "The actual interview question text." },
          difficulty: { type: "STRING", description: "The difficulty level, must be 'easy', 'medium', or 'hard'." },
          timer: { type: "NUMBER", description: "The allocated time in seconds (must be 20, 60, or 120)." },
        },
        required: ["id", "text", "difficulty", "timer"],
      },
    };

    // 2. Use a System Instruction for better adherence to the structure and role
    const systemPrompt = `You are an expert interview question generator. Generate 6 interview questions for the role specified by the user. The questions must be divided exactly into 2 easy (20s), 2 medium (60s), and 2 hard (120s). Ensure the output strictly follows the provided JSON schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Role: ${role}`, // Pass the role as the main content
      config: {
        systemInstruction: systemPrompt,
        // Mandate JSON output
        responseMimeType: "application/json",
        responseSchema: questionSchema,
      },
    });

    // 3. Since we used responseMimeType: "application/json", the response.text
    // is now guaranteed to be clean JSON, eliminating the need for string stripping.
    const questions = JSON.parse(response.text);
    res.json({ questions });

  } catch (error) {
    console.error("Error generating questions:", error);
    // Provide a more descriptive error message to the client
    res.status(500).json({ error: "Failed to generate questions. Check server logs." });
  }
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
