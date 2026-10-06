import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";

// Initialize Gemini SDK
// Note: We initialize this inside the route or lazily if we want to avoid startup crash on missing key
let ai: GoogleGenAI | null = null;
function getAI() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    ai = new GoogleGenAI({ 
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

const upload = multer({ dest: '/tmp/uploads/' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 audio/video
  app.use(express.json({ limit: "50mb" }));

  // Server-side video cutting using native ffmpeg from URL
  app.post("/api/cut-video-url", async (req, res) => {
    try {
        const { videoUrl, startTime, endTime } = req.body;
        
        if (!videoUrl) return res.status(400).json({ error: "Missing videoUrl" });
        const start = parseFloat(startTime);
        const end = parseFloat(endTime);
        const duration = end - start;

        if (isNaN(start) || isNaN(end) || duration <= 0) {
            return res.status(400).json({ error: "Invalid time range" });
        }

        const inputPath = `/tmp/input_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp4`;
        const outputPath = `${inputPath}_out.mp4`;

        // We can use ffmpeg to read directly from the URL!
        // Note: For some URLs (like TikTok), ffmpeg might need specific headers,
        // so we download it to a temporary file first just to be safe.
        
        const videoRes = await fetch(videoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.tiktok.com/',
                'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5'
            }
        });
        
        if (!videoRes.ok) throw new Error("Could not fetch video URL");
        
        const arrayBuffer = await videoRes.arrayBuffer();
        fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

        const cmd = `ffmpeg -y -ss ${start} -i "${inputPath}" -t ${duration} -c:v libx264 -preset superfast -c:a aac "${outputPath}"`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error("FFMPEG CUT ERROR:", stderr);
                try { fs.unlinkSync(inputPath); } catch (e) {}
                return res.status(500).json({ error: "Failed to cut video on server" });
            }

            res.sendFile(outputPath, (err) => {
                try {
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                } catch (e) {}
            });
        });

    } catch (error: any) {
        console.error("Cut URL Error:", error);
        res.status(500).json({ error: error.message || "Failed to cut video" });
    }
  });

  // Server-side video cutting using native ffmpeg
  app.post("/api/cut-video", upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Missing video file" });
    }

    const startTime = parseFloat(req.body.startTime);
    const endTime = parseFloat(req.body.endTime);
    const duration = endTime - startTime;

    if (isNaN(startTime) || isNaN(endTime) || duration <= 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Invalid time range" });
    }

    const inputPath = req.file.path;
    const outputPath = `${inputPath}_out.mp4`;

    // Re-encode video for frame-accurate cutting without freezing, place -ss before -i for fast seeking
    const cmd = `ffmpeg -y -ss ${startTime} -i "${inputPath}" -t ${duration} -c:v libx264 -preset superfast -c:a aac "${outputPath}"`;
    
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error("FFMPEG CUT ERROR:", stderr);
            try { fs.unlinkSync(inputPath); } catch (e) {}
            return res.status(500).json({ error: "Failed to cut video on server" });
        }

        res.sendFile(outputPath, (err) => {
            // Cleanup after sending
            try {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) {}
        });
    });
  });

  // API Routes
  app.post("/api/analyze", async (req, res) => {
    try {
      const aiClient = getAI();
      const { mimeType, data, prompt } = req.body; // data is base64
      
      // In a production app, we might upload to Gemini File API first for large files.
      // For this prototype, we use inline data for smaller chunks or simulate if not provided.
      
      if (!data) {
        // Fallback mock if no actual file data is sent, to ensure it works even without real video
        const mockResponse = {
          transcript: [
            { time: "0:05", text: "Welcome to this video tutorial." },
            { time: "0:12", text: "Today we will learn about video editing." },
            { time: "0:25", text: "Let's get started with the basics." }
          ],
          summary: "This video is a tutorial on video editing basics, covering essential tools and techniques for beginners."
        };
        return res.json(mockResponse);
      }

      const MODELS = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-2.5-flash",
        "gemini-3.5-transcribe"
      ];

      let parsedResult = null;
      let lastError: any = null;

      for (const modelName of MODELS) {
          try {
              console.log(`[AI ROUTER] Trying model: ${modelName}...`);
              const response = await aiClient.models.generateContent({
                  model: modelName,
                  contents: {
                      parts: [
                          {
                              inlineData: {
                                  mimeType: mimeType || "audio/wav",
                                  data: data,
                              },
                          },
                          {
                              text: prompt || "Analyze this audio/video. Provide a JSON response with two keys: 'transcript' (array of objects with 'time' like '0:15' and 'text') and 'summary' (a string summarizing the content). Do not use markdown blocks, just raw JSON.",
                          },
                      ]
                  },
                  // config removed to maximize compatibility
              });

              let resultText = response.text || "{}";
              resultText = resultText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
              
              console.log(`[AI ROUTER] Raw result from ${modelName}:`, resultText);
              
              parsedResult = JSON.parse(resultText);
              
              console.log(`[AI ROUTER] Success with ${modelName}!`);
              break; // Break the loop on success
          } catch (error: any) {
              console.warn(`[AI ROUTER] Model ${modelName} failed:`, error.message);
              lastError = error;
              // Loop will continue to the next model
          }
      }

      if (!parsedResult) {
          throw lastError || new Error("All AI models in the router failed.");
      }

      res.json(parsedResult);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to process audio with AI" });
    }
  });

  // AI Creative Script Generation Route
  app.post("/api/generate-creative-script", async (req, res) => {
    try {
      const aiClient = getAI();
      const { originalTranscript, tone, context } = req.body;

      if (!originalTranscript || typeof originalTranscript !== 'string') {
        return res.status(400).json({ error: "Thiếu nội dung kịch bản gốc." });
      }

      const systemPrompt = `Bạn là một chuyên gia sáng tạo kịch bản video ngắn và review triệu view trên TikTok, YouTube Shorts, Reels, Facebook Reels.
Nhiệm vụ của bạn:
1. Đọc kịch bản/lời thoại gốc của video được cung cấp.
2. Dựa trên ngữ cảnh và toàn bộ nội dung thoại của video gốc, sáng tạo ra một kịch bản thoại mới mang nội dung tương tự nhưng cuốn hút, hấp dẫn và giữ chân người xem cao nhất.
3. Kịch bản thoại mới cần:
   - Có Hook mở đầu cực mạnh, thu hút sự chú ý ngay từ giây đầu tiên.
   - Diễn đạt tự nhiên, chân thực, mượt mà, dùng câu từ bắt tai, gần gũi, văn phong nói tự nhiên của người Việt.
   - Giữ trọn các thông tin quan trọng, tính năng hoặc điểm nhấn của sản phẩm/nội dung trong video gốc.
   - Thêm đầy đủ dấu chấm, dấu phẩy, dấu chấm than và ngắt nghỉ tự nhiên đúng ngữ pháp để khi đọc hoặc dùng AI lồng tiếng nghe như người thật.
4. QUY TẮC ĐỊNH DẠNG:
   - Chia kịch bản thành các đoạn ngắn (tương đương mỗi đoạn 10-15s), ngăn cách mỗi đoạn bằng 2 dấu xuống dòng (khoảng trống).
   - TUYỆT ĐỐI KHÔNG thêm các nhãn như "[Đoạn 1]", "[Hook]", "[Mở đầu]", "[Call to Action]" hoặc markdown tiêu đề. Chỉ trả về lời thoại thuần túy liền mạch sẵn sàng để đọc/lồng tiếng.`;

      const userPrompt = `Đây là toàn bộ lời thoại của video gốc:
"""
${originalTranscript}
"""
${tone ? `Yêu cầu thêm về phong cách: ${tone}\n` : ''}${context ? `Ngữ cảnh bổ sung: ${context}\n` : ''}
Hãy viết lại một kịch bản thoại mới sáng tạo, cuốn hút và tự nhiên nhất:`;

      const MODELS = [
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-2.5-flash",
      ];

      let generatedScript = "";
      let lastError: any = null;

      for (const modelName of MODELS) {
        try {
          console.log(`[AI SCRIPT REWRITE] Trying model: ${modelName}...`);
          const response = await aiClient.models.generateContent({
            model: modelName,
            contents: [
              {
                text: `${systemPrompt}\n\n${userPrompt}`
              }
            ],
          });

          if (response.text) {
            generatedScript = response.text.trim();
            // Clean any code block if returned
            generatedScript = generatedScript.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
            console.log(`[AI SCRIPT REWRITE] Success with ${modelName}!`);
            break;
          }
        } catch (error: any) {
          console.warn(`[AI SCRIPT REWRITE] Model ${modelName} failed:`, error.message);
          lastError = error;
        }
      }

      if (!generatedScript) {
        throw lastError || new Error("Không thể tạo kịch bản mới từ các AI models.");
      }

      res.json({ script: generatedScript });
    } catch (error: any) {
      console.error("Creative Script Generation Error:", error);
      res.status(500).json({ error: error.message || "Lỗi tạo kịch bản mới bằng AI." });
    }
  });

  app.post("/api/get-tiktok-url", async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "Missing url" });

        const tikwmRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`);
        if (!tikwmRes.ok) throw new Error("TikWM API request failed");
        
        const tikwmData = await tikwmRes.json();
        const directUrl = tikwmData?.data?.play;
        if (!directUrl) throw new Error("Không thể trích xuất link video từ TikTok");

        res.json({ directUrl });
    } catch (e: any) {
        console.error("Get URL Error:", e);
        res.status(500).json({ error: e.message || "Lỗi lấy link" });
    }
  });

  // TikTok Server-side Download Route
  app.post("/api/download-tiktok", async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: "Missing url" });
        }

        // 1. Lấy link video trực tiếp qua API (Server-to-Server)
        const tikwmRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`);
        if (!tikwmRes.ok) throw new Error("TikWM API request failed");
        
        const tikwmData = await tikwmRes.json();
        const directUrl = tikwmData?.data?.play;
        if (!directUrl) throw new Error("Không thể trích xuất link video từ TikTok");

        // 2. Tải luồng video
        const videoRes = await fetch(directUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.tiktok.com/',
                'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5'
            }
        });
        
        if (!videoRes.ok) throw new Error(`Lỗi tải video: ${videoRes.status}`);

        // 3. Trả thẳng luồng dữ liệu (Stream) về giao diện
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Access-Control-Allow-Origin", "*");
        
        const { Readable } = await import("stream");
        if (videoRes.body) {
            Readable.fromWeb(videoRes.body as any).pipe(res);
        } else {
            res.status(500).json({ error: "Video rỗng" });
        }
    } catch (e: any) {
        console.error("Download Error:", e);
        res.status(500).json({ error: e.message || "Lỗi tải video" });
    }
  });

  // (Removed COOP/COEP headers as we use single-threaded ffmpeg)

  // Proxy Route for bypassing CORS
  app.all("/api/proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).send("No url provided");
      }

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        const lowerKey = key.toLowerCase();
        if (
            lowerKey !== 'host' && 
            lowerKey !== 'connection' && 
            lowerKey !== 'origin' &&
            lowerKey !== 'referer' &&
            lowerKey !== 'user-agent' &&
            lowerKey !== 'accept' &&
            lowerKey !== 'accept-encoding' &&
            !lowerKey.startsWith('sec-') &&
            value
        ) {
            if (Array.isArray(value)) {
                headers.append(key, value.join(', '));
            } else {
                headers.append(key, value as string);
            }
        }
      }

      // Add specific spoofing headers for TikTok/Douyin prevention
      headers.set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
      headers.set('Referer', 'https://www.tiktok.com/');
      headers.set('Accept', 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5');

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      });

      res.status(response.status);
      response.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (
            lowerKey !== 'access-control-allow-origin' &&
            lowerKey !== 'content-encoding' &&
            lowerKey !== 'content-length'
        ) {
             res.setHeader(key, value);
        }
      });
      // Allow CORS for our frontend
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (response.body) {
         // Use Readable.fromWeb to pipe the web stream to the Express response
         const { Readable } = await import('stream');
         Readable.fromWeb(response.body as any).pipe(res);
      } else {
         res.end();
      }
      
    } catch (e: any) {
        res.status(500).json({ error: e.message });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
