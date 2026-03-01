import { useEffect, useRef, useState, useCallback } from "react";
import {
  AgentProvider,
  type CompleteMessage,
  type StreamingMessage,
  TaskApiClient,
  useAgentContext,
} from "@/lib/zypher-ui";

const client = new TaskApiClient({
  baseUrl:
    import.meta.env.VITE_API_URL ??
    new URL("/api/agent", window.location.origin).toString(),
});

// ============================================================================
// Agent Status Types
// ============================================================================

type AgentStatus = "idle" | "thinking" | "working" | "error";

const STATUS_CONFIG: Record<
  AgentStatus,
  { label: string; color: string; bubbles: string[] }
> = {
  idle: {
    label: "Idle",
    color: "#94a3b8",
    bubbles: [
      "Standing by...",
      "Ready when you are!",
      "Tidying the desk...",
      "☕ Coffee time~",
      "Waiting for your command",
    ],
  },
  thinking: {
    label: "Thinking",
    color: "#ffd700",
    bubbles: [
      "Hmm, let me think...",
      "Processing your request...",
      "Analyzing the problem...",
      "Running through possibilities...",
      "Almost got it...",
    ],
  },
  working: {
    label: "Working",
    color: "#22c55e",
    bubbles: [
      "Focus mode: ON",
      "Making progress!",
      "Writing the response...",
      "Crafting your answer...",
      "On it!",
    ],
  },
  error: {
    label: "Error",
    color: "#e94560",
    bubbles: [
      "Oops, something went wrong!",
      "Bug detected!",
      "Let me try again...",
      "Error encountered...",
    ],
  },
};

// ============================================================================
// App
// ============================================================================

function App() {
  return (
    <AgentProvider client={client}>
      <PixelOffice />
    </AgentProvider>
  );
}

// ============================================================================
// Pixel Office - Main Layout
// ============================================================================

function PixelOffice() {
  const { isTaskRunning, streamingMessages } = useAgentContext();

  const agentStatus: AgentStatus = isTaskRunning
    ? streamingMessages.length > 0
      ? "working"
      : "thinking"
    : "idle";

  return (
    <div className="flex flex-col items-center min-h-screen p-4 gap-4">
      {/* Office Scene */}
      <OfficeScene status={agentStatus} />

      {/* Bottom: Chat Panel */}
      <div className="w-full max-w-[1280px] flex flex-col md:flex-row gap-4">
        <ChatPanel />
      </div>

      {/* Status bar */}
      <StatusBar status={agentStatus} />
    </div>
  );
}

// ============================================================================
// Office Scene (pixel art background + animated character)
// ============================================================================

function OfficeScene({ status }: { status: AgentStatus }) {
  const [bubble, setBubble] = useState("");
  const bubbleTimerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const show = () => {
      const texts = STATUS_CONFIG[status].bubbles;
      setBubble(texts[Math.floor(Math.random() * texts.length)]);
      setTimeout(() => setBubble(""), 3500);
    };

    show();
    bubbleTimerRef.current = setInterval(show, 8000);
    return () => clearInterval(bubbleTimerRef.current);
  }, [status]);

  // Character position based on status
  const charPositions: Record<AgentStatus, { left: string; top: string }> = {
    idle: { left: "52%", top: "35%" },
    thinking: { left: "25%", top: "55%" },
    working: { left: "25%", top: "55%" },
    error: { left: "78%", top: "30%" },
  };

  const pos = charPositions[status];

  return (
    <div className="office-scene pixel-border">
      {/* Title plaque */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4"
        style={{
          background: "#5d4037",
          border: "3px solid #3e2723",
          padding: "6px 30px",
        }}
      >
        <span style={{ fontSize: "18px" }}>⭐</span>
        <span
          style={{
            color: "#ffd700",
            fontSize: "16px",
            fontWeight: "bold",
            letterSpacing: "2px",
            textShadow: "1px 1px 0 #000",
          }}
        >
          Pixel Agent Office
        </span>
        <span style={{ fontSize: "18px" }}>⭐</span>
      </div>

      {/* Agent Character */}
      <div
        className="absolute transition-all duration-1000 ease-in-out"
        style={{
          left: pos.left,
          top: pos.top,
          transform: "translate(-50%, -50%)",
          zIndex: 10,
        }}
      >
        {/* Speech bubble */}
        {bubble && (
          <div className="speech-bubble" style={{ bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: "8px" }}>
            {bubble}
          </div>
        )}

        {/* Character */}
        <PixelCharacter status={status} />

        {/* Name tag */}
        <div
          className="text-center mt-1"
          style={{
            fontSize: "13px",
            color: "#fff",
            textShadow: "1px 1px 2px #000, -1px -1px 2px #000",
            letterSpacing: "1px",
          }}
        >
          Agent
        </div>
      </div>

      {/* Status indicator overlay */}
      <div
        className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-1.5"
        style={{
          background: "rgba(0,0,0,0.75)",
          border: `2px solid ${STATUS_CONFIG[status].color}`,
        }}
      >
        <span
          className={`status-dot ${status === "working" ? "working" : status}`}
          style={{ background: STATUS_CONFIG[status].color }}
        />
        <span style={{ fontSize: "12px", color: STATUS_CONFIG[status].color }}>
          {STATUS_CONFIG[status].label}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Pixel Character (CSS pixel art)
// ============================================================================

function PixelCharacter({ status }: { status: AgentStatus }) {
  const isAnimated = status === "working" || status === "thinking";

  return (
    <div
      className={isAnimated ? "pixel-bounce" : ""}
      style={{
        width: "48px",
        height: "48px",
        margin: "0 auto",
        position: "relative",
        imageRendering: "pixelated",
      }}
    >
      {/* Pixel art character using CSS */}
      <svg
        viewBox="0 0 16 16"
        width="48"
        height="48"
        style={{ imageRendering: "pixelated" }}
      >
        {/* Body */}
        <rect x="5" y="2" width="6" height="5" fill={STATUS_CONFIG[status].color} />
        {/* Head */}
        <rect x="4" y="0" width="8" height="4" fill="#ffd700" />
        {/* Eyes */}
        <rect x="5" y="1" width="2" height="2" fill="#000" />
        <rect x="9" y="1" width="2" height="2" fill="#000" />
        {/* Eye sparkle */}
        <rect x="5" y="1" width="1" height="1" fill="#fff" />
        <rect x="9" y="1" width="1" height="1" fill="#fff" />
        {/* Mouth */}
        {status === "error" ? (
          <rect x="6" y="3" width="4" height="1" fill="#e94560" />
        ) : status === "working" || status === "thinking" ? (
          <>
            <rect x="7" y="3" width="2" height="1" fill="#333" />
          </>
        ) : (
          <>
            <rect x="6" y="3" width="4" height="1" fill="#333" />
            <rect x="7" y="3" width="2" height="1" fill="#ffa" />
          </>
        )}
        {/* Legs */}
        <rect x="5" y="7" width="2" height="3" fill="#555" />
        <rect x="9" y="7" width="2" height="3" fill="#555" />
        {/* Feet */}
        <rect x="4" y="10" width="3" height="1" fill="#8b4513" />
        <rect x="9" y="10" width="3" height="1" fill="#8b4513" />
        {/* Arms */}
        {status === "working" ? (
          <>
            <rect x="3" y="3" width="2" height="3" fill={STATUS_CONFIG[status].color} />
            <rect x="11" y="2" width="2" height="3" fill={STATUS_CONFIG[status].color} />
          </>
        ) : status === "thinking" ? (
          <>
            <rect x="3" y="4" width="2" height="3" fill={STATUS_CONFIG[status].color} />
            <rect x="11" y="2" width="2" height="2" fill={STATUS_CONFIG[status].color} />
            <rect x="12" y="0" width="2" height="2" fill={STATUS_CONFIG[status].color} />
          </>
        ) : (
          <>
            <rect x="3" y="3" width="2" height="4" fill={STATUS_CONFIG[status].color} />
            <rect x="11" y="3" width="2" height="4" fill={STATUS_CONFIG[status].color} />
          </>
        )}
        {/* Hat/Antenna for thinking */}
        {status === "thinking" && (
          <>
            <rect x="7" y="-1" width="2" height="1" fill="#ffd700" />
            <rect x="8" y="-2" width="1" height="1" fill="#e94560" />
          </>
        )}
        {/* Error sparks */}
        {status === "error" && (
          <>
            <rect x="1" y="0" width="1" height="1" fill="#e94560" />
            <rect x="14" y="1" width="1" height="1" fill="#e94560" />
            <rect x="2" y="5" width="1" height="1" fill="#ff6b81" />
            <rect x="13" y="4" width="1" height="1" fill="#ff6b81" />
          </>
        )}
      </svg>
    </div>
  );
}

// ============================================================================
// Chat Panel
// ============================================================================

function ChatPanel() {
  const {
    messages,
    streamingMessages,
    isTaskRunning,
    isLoadingMessages,
    isClearingMessages,
    runTask,
    clearMessageHistory,
    cancelCurrentTask,
  } = useAgentContext();

  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessages]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isTaskRunning) return;
    runTask(input.trim());
    setInput("");
    inputRef.current?.focus();
  }, [input, isTaskRunning, runTask]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="pixel-panel flex-1 flex flex-col" style={{ height: "400px", minWidth: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-[#4a4f5f]">
        <div className="pixel-title border-b-0 pb-0 flex-1">
          — Chat with Agent —
        </div>
        <button
          className="pixel-btn"
          onClick={() => clearMessageHistory()}
          disabled={isClearingMessages || isTaskRunning}
          style={{ fontSize: "11px", padding: "4px 10px" }}
        >
          🗑 Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ minHeight: 0 }}>
        {isLoadingMessages && (
          <div className="text-center" style={{ color: "#9ca3af", fontSize: "12px", padding: "20px 0" }}>
            Loading messages...
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Streaming */}
        {streamingMessages.length > 0 && (
          <div className="chat-bubble-agent">
            {streamingMessages.map((sm) => (
              <StreamingBlock key={sm.id} message={sm} />
            ))}
            <span className="typing-cursor" />
          </div>
        )}

        {/* Thinking indicator */}
        {isTaskRunning && streamingMessages.length === 0 && !isLoadingMessages && (
          <div className="chat-bubble-agent flex items-center gap-2">
            <PixelSpinner />
            <span style={{ fontSize: "12px", color: "#ffd700" }}>Thinking...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t-2 border-[#4a4f5f]">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the agent something..."
            disabled={isTaskRunning}
            rows={1}
            className="flex-1 resize-none px-3 py-2"
            style={{
              background: "#1a1a2e",
              border: "2px solid #555",
              color: "#e0e0e0",
              fontFamily: "'ArkPixel', monospace",
              fontSize: "13px",
              outline: "none",
              minHeight: "38px",
              maxHeight: "100px",
            }}
            onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "#e94560"; }}
            onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "#555"; }}
          />
          {isTaskRunning ? (
            <button className="pixel-btn" onClick={cancelCurrentTask} style={{ background: "#e94560" }}>
              ■ Stop
            </button>
          ) : (
            <button
              className="pixel-btn pixel-btn-primary"
              onClick={handleSubmit}
              disabled={!input.trim()}
            >
              Send ↵
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Chat Message
// ============================================================================

function ChatMessage({ message }: { message: CompleteMessage }) {
  if (message.role === "user") {
    const textBlocks = message.content.filter((b) => b.type === "text");
    if (textBlocks.length === 0) return null;

    return (
      <div className="chat-bubble-user">
        {textBlocks.map((b, i) => (
          <div key={i} style={{ fontSize: "13px" }}>
            {"text" in b ? b.text : ""}
          </div>
        ))}
      </div>
    );
  }

  // Assistant
  return (
    <div className="chat-bubble-agent">
      {message.content.map((block, i) => {
        if (block.type === "text" && "text" in block && block.text) {
          return (
            <div key={i} style={{ fontSize: "13px", lineHeight: "1.6" }}>
              {block.text}
            </div>
          );
        }
        if (block.type === "tool_use" && "name" in block) {
          return (
            <div
              key={i}
              style={{
                fontSize: "11px",
                color: "#ffd700",
                padding: "4px 8px",
                background: "#1a1a2e",
                border: "1px solid #4a4f5f",
                marginTop: "4px",
              }}
            >
              🔧 Tool: {block.name}
            </div>
          );
        }
        if (block.type === "tool_result" && "name" in block) {
          const resultBlock = block as { type: "tool_result"; name: string; success: boolean; content: Array<{ type: string; text?: string }> };
          return (
            <div
              key={i}
              style={{
                fontSize: "11px",
                color: resultBlock.success ? "#22c55e" : "#e94560",
                padding: "4px 8px",
                background: "#1a1a2e",
                border: `1px solid ${resultBlock.success ? "#22c55e" : "#e94560"}`,
                marginTop: "4px",
                maxHeight: "100px",
                overflow: "auto",
              }}
            >
              {resultBlock.success ? "✅" : "❌"} {resultBlock.name}
              {resultBlock.content
                .filter((c) => c.type === "text")
                .map((c, j) => (
                  <div key={j} style={{ marginTop: "2px", color: "#9ca3af", whiteSpace: "pre-wrap" }}>
                    {c.text?.slice(0, 200)}
                    {(c.text?.length ?? 0) > 200 ? "..." : ""}
                  </div>
                ))}
            </div>
          );
        }
        if (block.type === "thinking" && "thinking" in block) {
          return (
            <details key={i} style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
              <summary style={{ cursor: "pointer", color: "#ffd700" }}>💭 Reasoning</summary>
              <div style={{ padding: "4px 8px", background: "#1a1a2e", border: "1px solid #4a4f5f", marginTop: "2px", whiteSpace: "pre-wrap" }}>
                {(block as { thinking: string }).thinking}
              </div>
            </details>
          );
        }
        return null;
      })}
    </div>
  );
}

// ============================================================================
// Streaming Block
// ============================================================================

function StreamingBlock({ message }: { message: StreamingMessage }) {
  if (message.type === "streaming_text") {
    return <span style={{ fontSize: "13px", lineHeight: "1.6" }}>{message.text}</span>;
  }
  if (message.type === "streaming_tool_use") {
    return (
      <div
        style={{
          fontSize: "11px",
          color: "#ffd700",
          padding: "4px 8px",
          background: "#1a1a2e",
          border: "1px solid #4a4f5f",
          marginTop: "4px",
        }}
      >
        🔧 Using: {message.toolUseName}...
      </div>
    );
  }
  return null;
}

// ============================================================================
// Status Bar
// ============================================================================

function StatusBar({ status }: { status: AgentStatus }) {
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2"
      style={{
        background: "rgba(0,0,0,0.8)",
        padding: "8px 20px",
        border: `2px solid ${STATUS_CONFIG[status].color}`,
        fontSize: "13px",
      }}
    >
      <span
        className={`status-dot ${status}`}
        style={{ background: STATUS_CONFIG[status].color }}
      />
      <span style={{ color: STATUS_CONFIG[status].color }}>
        [{STATUS_CONFIG[status].label}]
      </span>
      <span style={{ color: "#9ca3af" }}>
        {status === "idle" && "Standing by, ready for your commands"}
        {status === "thinking" && "Processing your request..."}
        {status === "working" && "Generating response..."}
        {status === "error" && "An error occurred"}
      </span>
    </div>
  );
}

// ============================================================================
// Pixel Spinner
// ============================================================================

function PixelSpinner() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: "6px",
            height: "6px",
            background: "#ffd700",
            animation: `pixel-spinner 1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes pixel-spinner {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

export default App;
