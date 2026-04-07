import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.post("/api/send-bulk-email", async (req, res) => {
    const { subject, content, recipients } = req.body;

    if (!resend) {
      console.warn("RESEND_API_KEY not found. Simulating email send.");
      // Simulate success for demo if no key
      return res.json({ 
        success: true, 
        message: "Email sending simulated (RESEND_API_KEY missing)",
        count: recipients.length 
      });
    }

    try {
      // Resend allows sending to multiple recipients (up to 50 per call in free tier)
      // For real production, we might want to batch these or use a loop for larger lists
      const { data, error } = await resend.emails.send({
        from: "EduManage Pro <onboarding@resend.dev>",
        to: recipients,
        subject: subject,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #4f46e5;">EduManage Pro Notification</h2>
                <div style="line-height: 1.6;">${content.replace(/\n/g, '<br>')}</div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">This is an automated message from your school management system.</p>
              </div>`,
      });

      if (error) {
        return res.status(400).json({ success: false, error });
      }

      res.json({ success: true, data, count: recipients.length });
    } catch (error) {
      console.error("Error sending bulk email:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
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
