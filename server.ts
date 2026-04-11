import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { Resend } from "resend";
import twilio from "twilio";

dotenv.config();

let resendClient: Resend | null = null;
function getResendClient() {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resendClient = new Resend(key);
  return resendClient;
}

let twilioClientInstance: any = null;
function getTwilioClient() {
  if (twilioClientInstance) return twilioClientInstance;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  
  if (!sid || !token || !sid.startsWith('AC')) {
    return null;
  }
  
  try {
    twilioClientInstance = twilio(sid, token);
    return twilioClientInstance;
  } catch (error) {
    console.error("Failed to initialize Twilio client:", error);
    return null;
  }
}

const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const twilioWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.post("/api/send-bulk-whatsapp", async (req, res) => {
    const { content, recipients } = req.body; // recipients is array of phone numbers
    const twilioClient = getTwilioClient();

    if (!twilioClient || !twilioWhatsApp) {
      console.warn("Twilio WhatsApp configuration missing. Simulating WhatsApp send.");
      return res.json({ 
        success: true, 
        message: "WhatsApp sending simulated (Twilio config missing)",
        count: recipients.length 
      });
    }

    try {
      const results = await Promise.all(recipients.map(async (to: string) => {
        try {
          // Format number for WhatsApp if not already
          const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
          const formattedFrom = twilioWhatsApp.startsWith('whatsapp:') ? twilioWhatsApp : `whatsapp:${twilioWhatsApp}`;

          const message = await twilioClient.messages.create({
            body: content,
            from: formattedFrom,
            to: formattedTo
          });
          return { to, sid: message.sid, success: true };
        } catch (err) {
          return { to, error: err instanceof Error ? err.message : String(err), success: false };
        }
      }));

      const successCount = results.filter(r => r.success).length;
      res.json({ success: true, results, count: successCount });
    } catch (error) {
      console.error("Error sending bulk WhatsApp:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.post("/api/send-bulk-email", async (req, res) => {
    const { subject, content, recipients } = req.body;
    const resend = getResendClient();

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

  app.post("/api/send-bulk-sms", async (req, res) => {
    const { content, recipients } = req.body;
    const twilioClient = getTwilioClient();

    if (!twilioClient || !twilioPhone) {
      console.warn("Twilio configuration missing. Simulating SMS send.");
      return res.json({ 
        success: true, 
        message: "SMS sending simulated (Twilio config missing)",
        count: recipients.length 
      });
    }

    try {
      const results = await Promise.all(recipients.map(async (to: string) => {
        try {
          const message = await twilioClient.messages.create({
            body: content,
            from: twilioPhone,
            to: to
          });
          return { to, sid: message.sid, success: true };
        } catch (err) {
          return { to, error: err instanceof Error ? err.message : String(err), success: false };
        }
      }));

      const successCount = results.filter(r => r.success).length;
      res.json({ success: true, results, count: successCount });
    } catch (error) {
      console.error("Error sending bulk SMS:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.post("/api/send-fee-reminders", async (req, res) => {
    const { reminders } = req.body; // Array of { email, studentName, amount, dueDate, type: 'upcoming' | 'overdue' }
    const resend = getResendClient();

    if (!resend) {
      console.warn("RESEND_API_KEY not found. Simulating fee reminders.");
      return res.json({ 
        success: true, 
        message: "Fee reminders simulated (RESEND_API_KEY missing)",
        count: reminders.length 
      });
    }

    try {
      const results = await Promise.all(reminders.map(async (reminder: any) => {
        const { email, studentName, amount, dueDate, type } = reminder;
        const subject = type === 'overdue' 
          ? `URGENT: Overdue Fee Payment for ${studentName}` 
          : `Reminder: Upcoming Fee Deadline for ${studentName}`;
        
        const content = type === 'overdue'
          ? `Dear Parent,<br><br>This is an urgent reminder that the fee payment of <b>${amount}</b> for <b>${studentName}</b> was due on <b>${dueDate}</b> and is currently overdue.<br><br>Please settle the outstanding amount at your earliest convenience to avoid any late fees.`
          : `Dear Parent,<br><br>This is a friendly reminder that the fee payment of <b>${amount}</b> for <b>${studentName}</b> is due on <b>${dueDate}</b>.<br><br>Please ensure the payment is made by the deadline.`;

        try {
          await resend.emails.send({
            from: "EduManage Pro <onboarding@resend.dev>",
            to: [email],
            subject: subject,
            html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: ${type === 'overdue' ? '#ef4444' : '#4f46e5'};">EduManage Pro Fee Notification</h2>
                    <div style="line-height: 1.6;">${content}</div>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">This is an automated message from your school management system.</p>
                  </div>`,
          });
          return { email, success: true };
        } catch (err) {
          return { email, success: false, error: err };
        }
      }));

      const successCount = results.filter(r => r.success).length;
      res.json({ success: true, count: successCount, results });
    } catch (error) {
      console.error("Error sending fee reminders:", error);
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
