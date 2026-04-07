const express = require("express");
const cors = require("cors");
require("dotenv").config();

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const AGENT_ID = process.env.AGENT_ID;
const API_KEY = process.env.RETELL_API_KEY;
const PORT = process.env.PORT || 3000;
const RETELL_API_BASE = "https://api.retellai.com";
const allowedOrigins = [
  "https://lpu-voice-agent.vercel.app",
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [])
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    }
  })
);
app.use(express.json());
const LPU_ADMISSIONS_STYLE = `You are the official LPU (Lovely Professional University) admissions chatbot.
Keep replies short, warm, and professional.
Main goal: help students book a campus visit and admissions counseling.
When user wants campus visit, collect in order: full name, program/course interest, visit date and time, email.
After collecting date like Monday, confirm exact date clearly before booking.
Tone should match this style: “Great! I’d be happy to help you schedule a campus visit.”`;

// ✅ Create session
app.post("/session", async (req, res) => {
  try {
    if (!API_KEY || !AGENT_ID) {
      return res.status(500).json({
        error: "Missing RETELL_API_KEY or AGENT_ID environment variables"
      });
    }

    const response = await fetch(`${RETELL_API_BASE}/create-chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agent_id: AGENT_ID
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.message || "Session failed"
      });
    }

    res.json({
      sessionId: data.chat_id
    });
  } catch (err) {
    console.error("Session error:", err);
    res.status(500).json({ error: "Session failed" });
  }
});

// ✅ Send message
app.post("/message", async (req, res) => {
  try {
    if (!API_KEY || !AGENT_ID) {
      return res.status(500).json({
        error: "Missing RETELL_API_KEY or AGENT_ID environment variables"
      });
    }

    const { message, sessionId } = req.body;

    const response = await fetch(`${RETELL_API_BASE}/create-chat-completion`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: sessionId,
        content: `${LPU_ADMISSIONS_STYLE}\n\nStudent message: ${message}`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.message || "Message failed"
      });
    }

    const firstAgentMessage = data?.messages?.find((msg) => msg.role === "agent");

    res.json({
      reply: firstAgentMessage?.content || "No reply"
    });
  } catch (err) {
    console.error("Message error:", err);
    res.status(500).json({ error: "Message failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
