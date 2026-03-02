import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  AgentProvider,
  type CompleteMessage,
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
      "Ears perked up, ready to go",
      "Charging up for the next task",
    ],
  },
  thinking: {
    label: "Thinking",
    color: "#ffd700",
    bubbles: [
      "Hmm, let me think...",
      "Processing your request...",
      "Analyzing the problem...",
      "Digging through evidence...",
      "Almost got it...",
      "Drawing a cause-and-effect map...",
      "Verifying my hypothesis...",
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
      "Making the complex simple",
      "Every step is reversible",
      "Steady, we got this!",
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
      "Don't panic, isolating the issue",
      "Reproducing before fixing...",
    ],
  },
};

const CAT_BUBBLES = [
  "Meow~",
  "Purr purr…",
  "Tail wag!",
  "Sunny spot ☀️",
  "Hello there!",
  "I'm the office mascot",
  "Stretch~",
  "Time for treats?",
  "Best view from here",
  "Nap time zzz",
];

// ============================================================================
// Sprite Helpers
// ============================================================================

/** Compute absolute CSS position from game coordinates + origin + scale */
function pos(
  x: number,
  y: number,
  ox: number,
  oy: number,
  w: number,
  h: number,
  z: number,
  s: number = 1,
): React.CSSProperties {
  return {
    position: "absolute",
    left: x - ox * w * s,
    top: y - oy * h * s,
    zIndex: z,
    ...(s !== 1 && { transform: `scale(${s})`, transformOrigin: "0 0" }),
  };
}

// ============================================================================
// SpriteSheet — animated spritesheet via direct DOM manipulation (no re-renders)
// ============================================================================

function SpriteSheet({
  src,
  frameWidth,
  frameHeight,
  columns,
  totalFrames,
  startFrame = 0,
  fps = 12,
  playing = true,
  staticFrame = 0,
  style,
}: {
  src: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  totalFrames: number;
  startFrame?: number;
  fps?: number;
  playing?: boolean;
  staticFrame?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!playing) {
      const col = staticFrame % columns;
      const row = Math.floor(staticFrame / columns);
      el.style.backgroundPosition = `-${col * frameWidth}px -${row * frameHeight}px`;
      return;
    }

    let frame = startFrame;
    const tick = () => {
      const col = frame % columns;
      const row = Math.floor(frame / columns);
      el.style.backgroundPosition = `-${col * frameWidth}px -${row * frameHeight}px`;
      frame = startFrame + ((frame - startFrame + 1) % totalFrames);
    };
    tick();
    const id = setInterval(tick, 1000 / fps);
    return () => clearInterval(id);
  }, [playing, src, frameWidth, frameHeight, columns, totalFrames, startFrame, fps, staticFrame]);

  return (
    <div
      ref={ref}
      style={{
        width: frameWidth,
        height: frameHeight,
        backgroundImage: `url(${src})`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated" as const,
        ...style,
      }}
    />
  );
}

// ============================================================================
// ClickableSprite — static spritesheet, random frame, changes on click
// ============================================================================

function ClickableSprite({
  src,
  frameWidth,
  frameHeight,
  columns,
  totalFrames,
  style,
}: {
  src: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  totalFrames: number;
  style?: React.CSSProperties;
}) {
  const [frameIndex, setFrameIndex] = useState(() =>
    Math.floor(Math.random() * totalFrames),
  );

  const col = frameIndex % columns;
  const row = Math.floor(frameIndex / columns);

  return (
    <div
      style={{
        width: frameWidth,
        height: frameHeight,
        backgroundImage: `url(${src})`,
        backgroundPosition: `-${col * frameWidth}px -${row * frameHeight}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated" as const,
        cursor: "pointer",
        ...style,
      }}
      onClick={() => setFrameIndex(Math.floor(Math.random() * totalFrames))}
    />
  );
}

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
// Pixel Office — Main Layout
// ============================================================================

function PixelOffice() {
  const { isTaskRunning, streamingMessages } = useAgentContext();
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout>>();

  // When task finishes, keep "working" status for 30s before returning to idle
  useEffect(() => {
    if (isTaskRunning) {
      // Task started — clear any pending cooldown
      clearTimeout(cooldownTimer.current);
      setCooldown(true);
    } else if (cooldown) {
      // Task ended — start 30s cooldown
      cooldownTimer.current = setTimeout(() => setCooldown(false), 10000);
      return () => clearTimeout(cooldownTimer.current);
    }
  }, [isTaskRunning]);

  const agentStatus: AgentStatus = isTaskRunning
    ? streamingMessages.length > 0
      ? "working"
      : "thinking"
    : cooldown
      ? "working"
      : "idle";

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <OfficeScene status={agentStatus} />
    </div>
  );
}

// ============================================================================
// Office Scene — pixel art background + animated furniture + character
// ============================================================================

function OfficeScene({ status }: { status: AgentStatus }) {
  // ── Responsive scaling: 1280×720 game canvas scaled to fit viewport ──
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const resize = () => {
      setScale(Math.min(window.innerWidth / 1280, window.innerHeight / 720));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Speech bubble ──
  const [bubble, setBubble] = useState("");
  const bubbleTimer = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    const show = () => {
      const texts = STATUS_CONFIG[status].bubbles;
      setBubble(texts[Math.floor(Math.random() * texts.length)]);
      setTimeout(() => setBubble(""), 3500);
    };
    show();
    bubbleTimer.current = setInterval(show, 8000);
    return () => clearInterval(bubbleTimer.current);
  }, [status]);

  // ── Cat bubble ──
  const [catBubble, setCatBubble] = useState("");
  useEffect(() => {
    const show = () => {
      setCatBubble(CAT_BUBBLES[Math.floor(Math.random() * CAT_BUBBLES.length)]);
      setTimeout(() => setCatBubble(""), 4000);
    };
    const t1 = setTimeout(show, 5000);
    const t2 = setInterval(show, 18000);
    return () => {
      clearTimeout(t1);
      clearInterval(t2);
    };
  }, []);

  // ── Error bug ping-pong movement ──
  const errorBugRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (status !== "error") return;
    let x = 1007;
    let dir = 1;
    let raf: number;
    const animate = () => {
      x += 0.6 * dir;
      if (x >= 1111) {
        x = 1111;
        dir = -1;
      }
      if (x <= 1007) {
        x = 1007;
        dir = 1;
      }
      if (errorBugRef.current) {
        errorBugRef.current.style.left = `${x - 0.5 * 180 * 0.9}px`;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  const isIdle = status === "idle";
  const isWorking = status === "working" || status === "thinking";
  const isError = status === "error";

  // Bubble anchor based on state
  const bubbleAnchor = useMemo(() => {
    if (isIdle) return { x: 798, y: 200 }; // above sofa center
    if (isError) return { x: 1060, y: 160 }; // above error area
    return { x: 217, y: 250 }; // above desk
  }, [isIdle, isError]);

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: "#1a1a2e" }}
    >
      <div
        style={{
          width: 1280,
          height: 720,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          position: "relative",
          backgroundImage: "url('/static/office_bg_small.webp')",
          backgroundSize: "1280px 720px",
          imageRendering: "pixelated",
          overflow: "hidden",
          border: "4px solid #e94560",
          flexShrink: 0,
        }}
      >
        {/* ═══════════ FURNITURE LAYER ═══════════ */}

        {/* Server Room (animated when not idle, static frame 0 when idle) */}
        <SpriteSheet
          src="/static/serverroom-spritesheet.webp"
          frameWidth={180}
          frameHeight={251}
          columns={40}
          totalFrames={40}
          fps={6}
          playing={!isIdle}
          staticFrame={0}
          style={pos(1021, 142, 0.5, 0.5, 180, 251, 2)}
        />

        {/* Poster (clickable, random frame) */}
        <ClickableSprite
          src="/static/posters-spritesheet.webp"
          frameWidth={160}
          frameHeight={160}
          columns={4}
          totalFrames={32}
          style={pos(252, 66, 0.5, 0.5, 160, 160, 4)}
        />

        {/* Plants ×3 (clickable, random frame) */}
        <ClickableSprite
          src="/static/plants-spritesheet.webp"
          frameWidth={160}
          frameHeight={160}
          columns={4}
          totalFrames={16}
          style={pos(565, 178, 0.5, 0.5, 160, 160, 5)}
        />
        <ClickableSprite
          src="/static/plants-spritesheet.webp"
          frameWidth={160}
          frameHeight={160}
          columns={4}
          totalFrames={16}
          style={pos(230, 185, 0.5, 0.5, 160, 160, 5)}
        />
        <ClickableSprite
          src="/static/plants-spritesheet.webp"
          frameWidth={160}
          frameHeight={160}
          columns={4}
          totalFrames={16}
          style={pos(977, 496, 0.5, 0.5, 160, 160, 5)}
        />

        {/* Sofa: animated (agent resting) when idle, static when active */}
        {isIdle ? (
          <SpriteSheet
            src="/static/sofa-busy-spritesheet.webp"
            frameWidth={256}
            frameHeight={256}
            columns={48}
            totalFrames={48}
            fps={12}
            style={pos(670, 144, 0, 0, 256, 256, 10)}
          />
        ) : (
          <div
            style={{
              ...pos(670, 144, 0, 0, 256, 256, 10),
              width: 256,
              height: 256,
              backgroundImage: "url('/static/sofa-idle.webp')",
              backgroundSize: "256px 256px",
              imageRendering: "pixelated",
            }}
          />
        )}

        {/* Sync animation (depth 40) — shows when syncing, hidden otherwise */}
        {/* Future: enable when syncing state is added */}

        {/* Error Bug (visible + animated when error, ping-pong movement) */}
        {isError && (
          <div
            ref={errorBugRef}
            style={{
              position: "absolute",
              top: 221 - 0.5 * 180 * 0.9,
              left: 1007 - 0.5 * 180 * 0.9,
              zIndex: 50,
            }}
          >
            <SpriteSheet
              src="/static/error-bug-spritesheet-grid.webp"
              frameWidth={180}
              frameHeight={180}
              columns={20}
              totalFrames={96}
              fps={12}
              style={{ transform: "scale(0.9)", transformOrigin: "0 0" }}
            />
          </div>
        )}

        {/* ☕ Coffee Machine (always animated) */}
        <SpriteSheet
          src="/static/coffee-machine-spritesheet.webp"
          frameWidth={230}
          frameHeight={230}
          columns={12}
          totalFrames={96}
          fps={12.5}
          style={pos(659, 397, 0.5, 0.5, 230, 230, 99)}
        />

        {/* 🖥️ Star Working at Desk (visible when working/thinking) */}
        {isWorking && (
          <SpriteSheet
            src="/static/star-working-spritesheet-grid.webp"
            frameWidth={230}
            frameHeight={144}
            columns={35}
            totalFrames={192}
            fps={12}
            style={pos(217, 293, 0.5, 0.5, 230, 144, 900, 1.32)}
          />
        )}

        {/* Desk (static, always visible) */}
        <div
          style={{
            ...pos(218, 377, 0.5, 0.5, 276, 212, 1000),
            width: 276,
            height: 212,
            backgroundImage: "url('/static/desk-v2.png')",
            backgroundSize: "276px 212px",
            imageRendering: "pixelated",
          }}
        />

        {/* Flower on desk (clickable) */}
        <ClickableSprite
          src="/static/flowers-spritesheet.webp"
          frameWidth={65}
          frameHeight={65}
          columns={4}
          totalFrames={16}
          style={pos(310, 365, 0.5, 0.5, 65, 65, 1100)}
        />

        {/* 🐱 Cat (clickable) — near coffee machine */}
        <ClickableSprite
          src="/static/cats-spritesheet.webp"
          frameWidth={160}
          frameHeight={160}
          columns={4}
          totalFrames={16}
          style={pos(800, 540, 0.5, 0.5, 160, 160, 2000)}
        />

        {/* ═══════════ BUBBLES ═══════════ */}

        {/* Agent speech bubble */}
        {bubble && (
          <div
            className="speech-bubble"
            style={{
              position: "absolute",
              left: bubbleAnchor.x,
              top: bubbleAnchor.y - 70,
              transform: "translateX(-50%)",
              zIndex: 3000,
            }}
          >
            {bubble}
          </div>
        )}

        {/* Cat bubble */}
        {catBubble && (
          <div
            style={{
              position: "absolute",
              left: 800,
              top: 540 - 110,
              transform: "translateX(-50%)",
              zIndex: 3000,
              background: "#fffbeb",
              border: "2px solid #d4a574",
              padding: "4px 10px",
              fontSize: "11px",
              color: "#8b6914",
              whiteSpace: "nowrap",
              fontFamily: "'ArkPixel', monospace",
            }}
          >
            {catBubble}
          </div>
        )}

        {/* ═══════════ UI OVERLAYS ═══════════ */}

        {/* Title plaque */}
        <div
          style={{
            position: "absolute",
            left: 640,
            bottom: 14,
            transform: "translateX(-50%)",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
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
              fontFamily: "'ArkPixel', monospace",
            }}
          >
            Agent0 Star Office
          </span>
          <span style={{ fontSize: "18px" }}>⭐</span>
        </div>

        {/* Status indicator */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            background: "rgba(0,0,0,0.75)",
            border: `2px solid ${STATUS_CONFIG[status].color}`,
          }}
        >
          <span
            className={`status-dot ${status === "working" ? "working" : status}`}
            style={{ background: STATUS_CONFIG[status].color }}
          />
          <span
            style={{ fontSize: "12px", color: STATUS_CONFIG[status].color }}
          >
            {STATUS_CONFIG[status].label}
          </span>
        </div>

        {/* Chat panel */}
        <div
          style={{
            position: "absolute",
            top: 540,
            left: 35,
            zIndex: 20,
            width: 360,
            height: 168,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ChatPanel />
        </div>
      </div>
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
  const [tab, setTab] = useState<"dialogue" | "history">("dialogue");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === "history") {
      historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, tab]);

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

  const lastAgentMsg = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const agentText =
    lastAgentMsg?.content
      .filter((b) => b.type === "text" && "text" in b && b.text)
      .map((b) => ("text" in b ? b.text : ""))
      .join("") ?? "";
  const userText =
    lastUserMsg?.content
      .filter((b) => b.type === "text" && "text" in b)
      .map((b) => ("text" in b ? b.text : ""))
      .join("") ?? "";
  const streamingText = streamingMessages
    .filter((sm) => sm.type === "streaming_text")
    .map((sm) => (sm.type === "streaming_text" ? sm.text : ""))
    .join("");

  const inputStyle = {
    background: "rgba(240, 220, 180, 0.5)",
    border: "2px solid #8d6e63",
    color: "#2c1810",
    fontFamily: "'ArkPixel', monospace",
    fontSize: "13px",
    outline: "none",
  } as const;

  return (
    <div className="chat-overlay flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-2 py-1 border-b-2 border-[#8d6e63]">
        <div className="flex gap-1">
          <button
            className={`pixel-btn ${tab === "dialogue" ? "pixel-btn-primary" : ""}`}
            style={{ fontSize: "11px", padding: "3px 8px" }}
            onClick={() => setTab("dialogue")}
          >
            💬 Chat
          </button>
          <button
            className={`pixel-btn ${tab === "history" ? "pixel-btn-primary" : ""}`}
            style={{ fontSize: "11px", padding: "3px 8px" }}
            onClick={() => setTab("history")}
          >
            📜 Log
          </button>
        </div>
        {tab === "history" && (
          <button
            className="pixel-btn"
            style={{ fontSize: "11px", padding: "3px 8px" }}
            onClick={() => clearMessageHistory()}
            disabled={isClearingMessages || isTaskRunning}
          >
            🗑
          </button>
        )}
      </div>

      {tab === "dialogue" ? (
        /* ── Game dialogue view ── */
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 flex flex-col p-3 gap-2 min-h-0">
            <div className="dialogue-box flex-1 overflow-y-auto">
              {streamingText ? (
                <>
                  {streamingText}
                  <span className="typing-cursor" />
                </>
              ) : isTaskRunning ? (
                <span className="dialogue-thinking">
                  <PixelSpinner /> thinking...
                </span>
              ) : agentText ? (
                agentText
              ) : (
                <span className="dialogue-placeholder">
                  Hi! I'm your Personal Assistant. How can I help you today?
                </span>
              )}
            </div>
          </div>

          {userText && (
            <div
              className="px-3 pb-1"
              style={{ fontSize: "11px", color: "#5d4037" }}
            >
              <span style={{ opacity: 0.7 }}>You:</span>{" "}
              {userText.length > 80 ? userText.slice(0, 80) + "…" : userText}
            </div>
          )}

          <div className="p-2 border-t-2 border-[#8d6e63]">
            <div className="flex gap-2 items-center">
              <span
                style={{
                  color: "#5d4037",
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                ▶
              </span>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Say something…"
                disabled={isTaskRunning}
                rows={1}
                className="flex-1 resize-none px-2 py-1"
                style={{
                  ...inputStyle,
                  minHeight: "32px",
                  maxHeight: "80px",
                }}
                onFocus={(e) => {
                  (e.target as HTMLTextAreaElement).style.borderColor =
                    "#5d4037";
                }}
                onBlur={(e) => {
                  (e.target as HTMLTextAreaElement).style.borderColor =
                    "#8d6e63";
                }}
              />
              {isTaskRunning ? (
                <button
                  className="pixel-btn"
                  onClick={cancelCurrentTask}
                  style={{
                    background: "#c0392b",
                    borderColor: "#922b21",
                    padding: "4px 8px",
                  }}
                >
                  ■
                </button>
              ) : (
                <button
                  className="pixel-btn pixel-btn-primary"
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  style={{ padding: "4px 8px" }}
                >
                  ↵
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── History / log view ── */
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
          {isLoadingMessages && (
            <div
              style={{
                color: "#8d6e63",
                fontSize: "12px",
                textAlign: "center",
                padding: "12px 0",
              }}
            >
              Loading…
            </div>
          )}
          {messages.length === 0 && !isLoadingMessages && (
            <div
              style={{
                color: "#8d6e63",
                fontSize: "12px",
                textAlign: "center",
                padding: "12px 0",
              }}
            >
              No messages yet.
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={historyEndRef} />
        </div>
      )}
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
          const resultBlock = block as {
            type: "tool_result";
            name: string;
            success: boolean;
            content: Array<{ type: string; text?: string }>;
          };
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
                  <div
                    key={j}
                    style={{
                      marginTop: "2px",
                      color: "#9ca3af",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {c.text?.slice(0, 200)}
                    {(c.text?.length ?? 0) > 200 ? "..." : ""}
                  </div>
                ))}
            </div>
          );
        }
        if (block.type === "thinking" && "thinking" in block) {
          return (
            <details
              key={i}
              style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}
            >
              <summary style={{ cursor: "pointer", color: "#ffd700" }}>
                💭 Reasoning
              </summary>
              <div
                style={{
                  padding: "4px 8px",
                  background: "#1a1a2e",
                  border: "1px solid #4a4f5f",
                  marginTop: "2px",
                  whiteSpace: "pre-wrap",
                }}
              >
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
