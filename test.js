const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "hello"
  });
  console.log("TEXT is function?", typeof response.text);
  console.log("TEXT:", response.text);
}
test().catch(console.error);
