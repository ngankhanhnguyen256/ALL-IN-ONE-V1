import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

let ai = null;
function getAI() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set.");
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

const upload = multer({ dest: '/tmp/' });
const app = express();
app.use(express.json({ limit: "50mb" }));

app.post("/api/cut-video-url", async (req, res) => {
  try {
      const { videoUrl, startTime, endTime } = req.body;
      if (!videoUrl) return res.status(400).json({ error: "Missing videoUrl" });
      const start = parseFloat(startTime);
      const end = parseFloat(endTime);
      const duration = end - start;
      if (isNaN(start) || isNaN(end) || duration <= 0) return res.status(400).json({ error: "Invalid time range" });
      const outputPath = /tmp/output_ + Date.now() + .mp4;
      ffmpeg(videoUrl)
          .setStartTime(start)
          .duration(duration)
          .outputOptions(['-c:v libx264', '-preset superfast', '-c:a aac'])
          .output(outputPath)
          .on('end', () => {
              res.sendFile(outputPath, () => {
                  try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
              });
          })
          .on('error', (err) => {
              res.status(500).json({ error: "Failed to cut video on server" });
          })
          .run();
  } catch (error) { res.status(500).json({ error: error.message || "Failed to cut video" }); }
});

app.post("/api/cut-video", upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Missing video file" });
  const startTime = parseFloat(req.body.startTime);
  const endTime = parseFloat(req.body.endTime);
  const duration = endTime - startTime;
  if (isNaN(startTime) || isNaN(endTime) || duration <= 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Invalid time range" });
  }
  const inputPath = req.file.path;
  const outputPath = inputPath + _out.mp4;
  ffmpeg(inputPath)
      .setStartTime(startTime)
      .duration(duration)
      .outputOptions(['-c:v libx264', '-preset superfast', '-c:a aac'])
      .output(outputPath)
      .on('end', () => {
          res.sendFile(outputPath, () => {
              try {
                  if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
              } catch (e) {}
          });
      })
      .on('error', (err) => {
          try { fs.unlinkSync(inputPath); } catch (e) {}
          res.status(500).json({ error: "Failed to cut video on server" });
      })
      .run();
});

app.post("/api/analyze", async (req, res) => {
  try {
    const aiClient = getAI();
    const { mimeType, data, prompt } = req.body; 
    if (!data) return res.json({ transcript: [], summary: "Mock" });
    const MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    let parsedResult = null;
    let lastError = null;
    for (const modelName of MODELS) {
        try {
            const response = await aiClient.models.generateContent({
                model: modelName,
                contents: [
                    { inlineData: { mimeType: mimeType || "audio/wav", data: data } },
                    { text: prompt || "Analyze this audio/video. Provide JSON." }
                ],
            });
            let resultText = (response.text || "{}").replace(/^`json\s*/i, '').replace(/\s*`$/i, '').trim();
            parsedResult = JSON.parse(resultText);
            break; 
        } catch (error) { lastError = error; }
    }
    if (!parsedResult) throw lastError;
    res.json(parsedResult);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/analyze-stream", async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  try {
    const aiClient = getAI();
    const { mimeType, data, prompt } = req.body;
    const resultStream = await aiClient.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [
        { inlineData: { mimeType: mimeType || "audio/wav", data: data } },
        { text: prompt || "Phân tích video này..." }
      ]
    });
    for await (const chunk of resultStream) {
      if (chunk.text) res.write(data:  + JSON.stringify({ text: chunk.text }) + \n\n);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    res.write(data:  + JSON.stringify({ error: error.message }) + \n\n);
    res.end();
  }
});



export default app;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(Server running on port  + PORT);
  });
}