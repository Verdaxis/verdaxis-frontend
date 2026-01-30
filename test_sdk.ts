import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyBehFqq1YYR0OqQllK1QunU6h_P4uu8OpI";
const genAI = new GoogleGenAI(apiKey);

async function run() {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-lite",
    tools: [{ googleSearch: {} }] 
  });

  const result = await model.generateContent("What is the current price of Brent Crude oil? Return JSON {\"price\": \"val\"}");
  console.log(JSON.stringify(result.response, null, 2));
}

run();
