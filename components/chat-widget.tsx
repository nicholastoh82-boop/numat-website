"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "assistant" | "user";
  content: string;
}

declare global {
  interface Window {
    Calendly?: { initInlineWidgets: () => void };
  }
}

const N8N_WEBHOOK = "https://nicholastoh.app.n8n.cloud/webhook/numat-lead";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);
  const [meetingBooked, setMeetingBooked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const sessionIdRef = useRef<string>("");
  const pageUrlRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
    pageUrlRef.current = window.location.href;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, submitted]);

  useEffect(() => {
    if (isOpen && !isMinimized && !submitted) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized, submitted, isLoading]);

  // Listen for Calendly booking confirmation
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.event === "calendly.event_scheduled") {
        setMeetingBooked(true);
        fetch(N8N_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "NARA",
            lead_source: "Website",
            session_id: sessionIdRef.current,
            meeting_booked: true,
          }),
        }).catch(() => {});
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const callChat = useCallback(
    async (conversation: Message[]): Promise<{ text: string; isComplete: boolean; tier?: string; score?: number }> => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation,
          session_id: sessionIdRef.current,
          page_url: pageUrlRef.current,
        }),
      });
      if (!res.ok) throw new Error("Chat request failed");
      return res.json();
    },
    []
  );

  const fireWebhook = useCallback((conversation: Message[]) => {
    const fullConvo = conversation
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");
    const emailMatch = fullConvo.match(
      /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/
    );
    fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "NARA",
        lead_source: "Website",
        session_id: sessionIdRef.current,
        email: emailMatch?.[0] || null,
        notes: `NARA conversation:\n\n${fullConvo}`,
      }),
    }).catch(() => {});
  }, []);

  const initializeChat = useCallback(async () => {
    if (isInitialized) return;
    setIsInitialized(true);
    setIsLoading(true);
    try {
      const { text } = await callChat([{ role: "user", content: "Hello" }]);
      setMessages([{ role: "assistant", content: text }]);
    } catch {
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! I'm NARA, NUMAT's bamboo specialist. What project can I help you with today?",
        },
      ]);
    }
    setIsLoading(false);
  }, [isInitialized, callChat]);

  useEffect(() => {
    if (isOpen && !isInitialized) initializeChat();
  }, [isOpen, isInitialized, initializeChat]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || submitted) return;
    const userMsg: Message = { role: "user", content: input };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);
    try {
      const { text, isComplete, tier } = await callChat(updated);
      const finalMessages: Message[] = [
        ...updated,
        { role: "assistant", content: text },
      ];
      setMessages(finalMessages);
      if (isComplete) {
        setSubmitted(true);
        fireWebhook(finalMessages);
        // Only show Calendly for HOT leads (score 7+)
        setShowCalendly(tier === "HOT");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I had a connection issue. Please email us at sales@numat.ph",
        },
      ]);
    }
    setIsLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
  };

  const handleToggle = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    } else if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsMinimized(true);
    }
  };

  const windowHeight = submitted && showCalendly ? "680px" : "560px";
  const windowVisible = isOpen && !isMinimized;

  return (
    <>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "88px",
            right: "24px",
            width: "380px",
            height: windowVisible ? windowHeight : "0px",
            maxHeight: windowVisible ? "calc(100vh - 160px)" : "0px",
            opacity: windowVisible ? 1 : 0,
            pointerEvents: windowVisible ? "auto" : "none",
            background: "#fff",
            borderRadius: "16px",
            boxShadow: windowVisible
              ? "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)"
              : "none",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999,
            border: "1px solid rgba(13,33,55,0.1)",
            transition: "height 0.3s ease, opacity 0.2s ease, max-height 0.3s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#0D2137",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            <img
              src="/nara_icon_1.jpeg"
              alt="NARA"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "15px",
                  letterSpacing: "0.01em",
                }}
              >
                NARA
              </div>
              <div style={{ color: "#5DCAA5", fontSize: "11px", marginTop: "1px" }}>
                Online
              </div>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              aria-label="Minimize chat"
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontSize: "20px",
                lineHeight: 1,
                padding: "2px 8px",
                flexShrink: 0,
              }}
            >
              −
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setIsMinimized(false);
              }}
              aria-label="Close chat"
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontSize: "20px",
                lineHeight: 1,
                padding: "2px 6px",
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              background: "#F8F7F5",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "user"
                        ? "16px 16px 4px 16px"
                        : "4px 16px 16px 16px",
                    background: msg.role === "user" ? "#0D2137" : "#fff",
                    color: msg.role === "user" ? "#fff" : "#1a1a1a",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                    border:
                      msg.role === "assistant"
                        ? "1px solid rgba(0,0,0,0.06)"
                        : "none",
                    whiteSpace: "pre-wrap",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.+?)\*/g, "<em>$1</em>"),
                  }}
                />
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div style={{ display: "flex" }}>
                <div
                  style={{
                    padding: "10px 16px",
                    borderRadius: "4px 16px 16px 16px",
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.06)",
                    display: "flex",
                    gap: "4px",
                    alignItems: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#1D9E75",
                        animation: `naraBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Lead submitted — HOT: show Calendly */}
            {submitted && showCalendly && !meetingBooked && (
              <>
                <div
                  style={{
                    background: "#E1F5EE",
                    border: "1px solid #1D9E75",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    fontSize: "12px",
                    color: "#085041",
                    textAlign: "center",
                    lineHeight: 1.6,
                    marginTop: "4px",
                    flexShrink: 0,
                  }}
                >
                  ✓ Your details have been received. A NUMAT specialist will
                  reach out within 24 hours.
                  <br />
                  <span style={{ fontWeight: 600 }}>
                    Book a discovery call below:
                  </span>
                </div>
                <div
                  style={{
                    flexShrink: 0,
                    borderRadius: "12px",
                    overflow: "hidden",
                    marginTop: "4px",
                  }}
                >
                  <iframe
                    src="https://calendly.com/numat/product-discovery-call?hide_gdpr_banner=1&primary_color=1D9E75&embed_type=Inline"
                    width="100%"
                    height="380"
                    style={{ border: "none" }}
                    title="Book a discovery call"
                  />
                </div>
              </>
            )}

            {/* Lead submitted — WARM/COLD: no Calendly, just confirmation */}
            {submitted && !showCalendly && !meetingBooked && (
              <div
                style={{
                  background: "#E1F5EE",
                  border: "1px solid #1D9E75",
                  borderRadius: "12px",
                  padding: "16px",
                  fontSize: "13px",
                  color: "#085041",
                  textAlign: "center",
                  lineHeight: 1.7,
                  marginTop: "4px",
                  flexShrink: 0,
                }}
              >
                ✓ Thank you — your details have been received.
                <br />
                Our team will review your project and reach out within 24 hours
                with the best recommendations for your needs.
              </div>
            )}

            {/* Meeting booked confirmation */}
            {meetingBooked && (
              <div
                style={{
                  background: "#0D2137",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  fontSize: "12px",
                  color: "#5DCAA5",
                  textAlign: "center",
                  lineHeight: 1.6,
                  flexShrink: 0,
                }}
              >
                🎉 Your meeting is booked!
                <br />
                Check your email for the calendar invite.
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area — hidden after lead submitted */}
          {!submitted && (
            <div
              style={{
                padding: "10px 12px",
                background: "#fff",
                borderTop: "1px solid rgba(0,0,0,0.06)",
                display: "flex",
                gap: "8px",
                alignItems: "flex-end",
                flexShrink: 0,
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKey}
                disabled={isLoading}
                rows={1}
                placeholder="Type your message… (Shift+Enter for new line)"
                style={{
                  flex: 1,
                  border: "1px solid #e8e8e8",
                  borderRadius: "16px",
                  padding: "9px 14px",
                  fontSize: "13px",
                  outline: "none",
                  fontFamily: "inherit",
                  background: "#F8F7F5",
                  color: "#1a1a1a",
                  resize: "none",
                  overflow: "hidden",
                  lineHeight: "1.5",
                  transition: "border-color 0.15s",
                  minHeight: "38px",
                  maxHeight: "100px",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#1D9E75")}
                onBlur={(e) => (e.target.style.borderColor = "#e8e8e8")}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  background:
                    input.trim() && !isLoading ? "#0D2137" : "#e5e5e5",
                  border: "none",
                  cursor: input.trim() && !isLoading ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s",
                  marginBottom: "1px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}

          <div
            style={{
              textAlign: "center",
              padding: "5px 0 7px",
              fontSize: "10px",
              color: "#bbb",
              background: "#fff",
              flexShrink: 0,
            }}
          >
            Powered by NARA · NUMAT AI
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={handleToggle}
        aria-label="Chat with NARA"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "52px",
          height: "52px",
          borderRadius: "10px",
          background: "#0D2137",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          boxShadow: "0 4px 20px rgba(13,33,55,0.35)",
          transition: "transform 0.2s ease",
          overflow: "hidden",
          padding: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {isOpen && !isMinimized ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <img
            src="/nara_icon_1.jpeg"
            alt="NARA"
            style={{ width: "52px", height: "52px", objectFit: "cover", borderRadius: "50%" }}
          />
        )}
        {isMinimized && (
          <span
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#1D9E75",
              border: "2px solid #0D2137",
            }}
          />
        )}
      </button>

      <style>{`
        @keyframes naraSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes naraBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}