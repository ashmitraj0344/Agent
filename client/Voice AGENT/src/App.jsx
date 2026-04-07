import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

const BACKEND_URL = "http://localhost:3000";
const QUICK_PROMPTS = [
  "I want to visit the LPU campus",
  "Tell me about B.Tech admissions",
  "Connect me with an admissions counselor"
];

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState("Connecting...");
  const [sessionError, setSessionError] = useState("");
  const chatEndRef = useRef(null);

  const createSession = useCallback(async () => {
    setStatus("Connecting...");

    try {
      const res = await fetch(`${BACKEND_URL}/session`, { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.sessionId) {
        throw new Error(data.error || "Could not create session");
      }

      setSessionId(data.sessionId);
      setSessionError("");
      setStatus("Connected");
      setMessages((prev) => {
        if (prev.length > 0) return prev;
        return [
          {
            role: "assistant",
            content:
              "Hello! Welcome to LPU Admissions. I can help you book a campus visit, connect you with a counselor, or guide you on courses. How can I assist you today?"
          }
        ];
      });
      return true;
    } catch (err) {
      console.error("Session error:", err);
      setSessionId(null);
      setStatus("Disconnected");
      setSessionError(err?.message || "Backend unavailable");
      return false;
    }
  }, []);

  useEffect(() => {
    let retryTimer;
    let cancelled = false;

    const connectWithRetry = async () => {
      const isConnected = await createSession();

      if (!isConnected && !cancelled) {
        retryTimer = setTimeout(connectWithRetry, 3000);
      }
    };

    connectWithRetry();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [createSession]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || !sessionId) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "No response" }
      ]);
    } catch (error) {
      console.error("Message error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Unable to reach backend." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <main className="app-shell">
      <section className="ums-shell">
        <aside className="ums-sidebar">
          <div className="ums-sidebar-brand">
            <div className="ums-mark">UMS</div>
            <div>
              <strong>LPU UMS</strong>
              <span>Student Support</span>
            </div>
          </div>

          <nav className="ums-nav">
            <button className="ums-nav-item active" type="button">Dashboard</button>
            <button className="ums-nav-item" type="button">LPU Live</button>
            <button className="ums-nav-item" type="button">My Class</button>
            <button className="ums-nav-item" type="button">Your DOST</button>
          </nav>

          <div className="ums-sidebar-footer">
            <div className="ums-mini-card">
              <span>Status</span>
              <strong>{sessionId ? "Connected" : "Disconnected"}</strong>
            </div>
          </div>
        </aside>

        <section className="chat-card">
          <header className="top-strip">
            <div className="brand-wrap">
                <img className="logo-mark" src="/lpu-logo.svg" alt="Lovely Professional University logo" />
              <div>
                <h1>LPU Admissions Assistant</h1>
                  <p>Lovely Professional University · Admissions Assistant</p>
              </div>
            </div>

            <div className="status-actions">
              <span className={`status-pill ${sessionId ? "ok" : "warn"}`}>{status}</span>
              {!sessionId && (
                <button className="retry-btn" onClick={createSession} type="button">
                  Retry
                </button>
              )}
            </div>
          </header>

          <section className="hero-banner">
            <h2>Admissions help in UMS look and feel</h2>
            <p>
              Ask about campus visit, course details, or admission support in a portal style inspired by LPU.
            </p>

            <div className="quick-prompts">
              {QUICK_PROMPTS.map((prompt) => (
                <button key={prompt} type="button" onClick={() => setInput(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          </section>

          <section className="chat-window" aria-live="polite">
            {messages.length === 0 ? (
              <div className="empty-state">
                Try: “I want to visit the LPU campus.”
              </div>
            ) : (
              messages.map((msg, index) => (
                <article
                  key={`${msg.role}-${index}`}
                  className={`bubble-row ${msg.role === "user" ? "user" : "assistant"}`}
                >
                  <p className="bubble">{msg.content}</p>
                </article>
              ))
            )}

            {loading && (
              <article className="bubble-row assistant">
                <p className="bubble typing">Thinking...</p>
              </article>
            )}

            <div ref={chatEndRef} />
          </section>

          <footer className="composer">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about campus visit, courses, or admissions..."
              rows={2}
              disabled={!sessionId}
            />
            <button onClick={sendMessage} disabled={loading || !sessionId || !input.trim()}>
              {loading ? "Sending..." : "Send"}
            </button>
          </footer>

          {!sessionId && (
            <p className="connection-note">
              Can’t connect to backend at {BACKEND_URL}. {sessionError}
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
