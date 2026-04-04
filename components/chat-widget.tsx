"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "assistant" | "user";
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const callChat = useCallback(async (conversation: Message[]): Promise<{ text: string; sessionId?: string; isComplete: boolean }> => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversation, sessionId }),
    });
    if (!res.ok) throw new Error("Chat request failed");
    return res.json();
  }, [sessionId]);

  const initializeChat = useCallback(async () => {
    if (isInitialized) return;
    setIsInitialized(true);
    setIsLoading(true);
    try {
      const { text, sessionId: newSessionId } = await callChat([{ role: "user", content: "Hello" }]);
      setMessages([{ role: "assistant", content: text }]);
      if (newSessionId) setSessionId(newSessionId);
    } catch {
      setMessages([{ role: "assistant", content: "Hi! I'm Nara, NUMAT's bamboo specialist. What project can I help you with today?" }]);
    }
    setIsLoading(false);
  }, [isInitialized, callChat]);

  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeChat();
    }
  }, [isOpen, isInitialized, initializeChat]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || submitted) return;
    const userMsg: Message = { role: "user", content: input };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);
    try {
      const { text, sessionId: newSessionId, isComplete } = await callChat(updated);
      setMessages([...updated, { role: "assistant", content: text }]);
      if (newSessionId) setSessionId(newSessionId);
      if (isComplete) setSubmitted(true);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had a connection issue. Please email us at hello@numat.ph" }]);
    }
    setIsLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {isOpen && (
        <div style={{
          position: "fixed", bottom: "88px", right: "24px",
          width: "360px", height: "520px",
          background: "#fff", borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          zIndex: 9999, border: "1px solid rgba(13,33,55,0.1)",
          animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          {/* Header */}
          <div style={{ background: "#0D2137", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "38px", height: "38px", borderRadius: "50%",
              background: "#1D9E75",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px", flexShrink: 0,
            }}>🌿</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: "14px", letterSpacing: "0.01em" }}>Nara</div>
              <div style={{ color: "#5DCAA5", fontSize: "11px", marginTop: "1px" }}>NUMAT Bamboo Specialist · Online</div>
            </div>
            <button onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "22px", lineHeight: 1, padding: "2px 6px" }}>×</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px",
            display: "flex", flexDirection: "column", gap: "10px",
            background: "#F8F7F5",
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%", padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                  background: msg.role === "user" ? "#0D2137" : "#fff",
                  color: msg.role === "user" ? "#fff" : "#1a1a1a",
                  fontSize: "13px", lineHeight: "1.55",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                  border: msg.role === "assistant" ? "1px solid rgba(0,0,0,0.05)" : "none",
                }}>{msg.content}</div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: "flex" }}>
                <div style={{
                  padding: "10px 16px", borderRadius: "4px 16px 16px 16px",
                  background: "#fff", border: "1px solid rgba(0,0,0,0.05)",
                  display: "flex", gap: "4px", alignItems: "center",
                }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: "6px", height: "6px", borderRadius: "50%", background: "#1D9E75",
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            {submitted && (
              <div style={{
                background: "#E1F5EE", border: "1px solid #1D9E75", borderRadius: "12px",
                padding: "12px 14px", fontSize: "12px", color: "#085041",
                textAlign: "center", lineHeight: 1.6,
              }}>
                ✓ Your details have been received.<br />A NUMAT specialist will reach out within 24 hours.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {!submitted && (
            <div style={{
              padding: "12px 14px", background: "#fff",
              borderTop: "1px solid rgba(0,0,0,0.06)",
              display: "flex", gap: "8px", alignItems: "center",
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={isLoading}
                placeholder="Type your message..."
                style={{
                  flex: 1, border: "1px solid #e8e8e8", borderRadius: "24px",
                  padding: "9px 16px", fontSize: "13px", outline: "none",
                  fontFamily: "inherit", background: "#F8F7F5", color: "#1a1a1a",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => (e.target.style.borderColor = "#1D9E75")}
                onBlur={e => (e.target.style.borderColor = "#e8e8e8")}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                style={{
                  width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                  background: input.trim() ? "#0D2137" : "#e5e5e5",
                  border: "none", cursor: input.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
          <div style={{ textAlign: "center", padding: "5px 0 7px", fontSize: "10px", color: "#bbb", background: "#fff" }}>
            Powered by NUMAT AI
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: "fixed", bottom: "24px", right: "24px",
          width: "56px", height: "56px", borderRadius: "50%",
          background: isOpen ? "#0D2137" : "#1D9E75",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10000,
          boxShadow: "0 4px 20px rgba(13,33,55,0.3)",
          transition: "all 0.2s ease",
        }}
        aria-label="Chat with NUMAT"
      >
        {isOpen
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        }
      </button>

      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(12px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
      `}</style>
    </>
  );
}
