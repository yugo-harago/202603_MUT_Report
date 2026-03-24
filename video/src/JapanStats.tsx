import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ─── Layout constants ────────────────────────────────────────────────────────
const W = 1280;
const H = 720;

// Main dot grid (Scene 1 & 2)
const COLS = 40;
const ROWS = 25;
const TOTAL_DOTS = COLS * ROWS; // 1 000
const SPACING = 28;
const DOT_R = 5; // kept for glow-ring radii
// Person icon dimensions (viewBox "0 0 10 15")
const PW = 10; // width of main-grid person
const PH = 15; // height of main-grid person
const MPW = 20; // width of mini-grid person
const MPH = 30; // height of mini-grid person
const GRID_W = (COLS - 1) * SPACING;
const GRID_H = (ROWS - 1) * SPACING;
const GRID_LEFT = (W - GRID_W) / 2;
const GRID_TOP = (H - GRID_H) / 2 + 10;

// Scene-3 mini grid (10×10 = 100 "Christians", 1 is SDA)
const MINI_COLS = 10;
const MINI_SPACING = 52;
const MINI_R = 7;
const MINI_GRID_W = (MINI_COLS - 1) * MINI_SPACING;
const MINI_GRID_H = (MINI_COLS - 1) * MINI_SPACING;
const MINI_LEFT = (W - MINI_GRID_W) / 2;
const MINI_TOP = (H - MINI_GRID_H) / 2 + 10;
const SDA_INDEX = 44; // row 4, col 4 — roughly central

// ─── Colour palette ──────────────────────────────────────────────────────────
const BG = "#05050E";
const DOT_IDLE = "#1a1a38";
const DOT_JAPAN = "#252550";
const DOT_CHRISTIAN = "#e8e8ff";
const DOT_SDA = "#FFD700";
const JAPAN_RED = "#BC002D";
const GOLD = "#FFD700";
const WHITE = "#FFFFFF";

// ─── Statistics ───────────────────────────────────────────────────────────────
const JAPAN_POP = 125_330_000;
const CHRISTIAN_POP = 1_910_000;
const CHRISTIAN_PCT = "1.5";
const SDA_POP = 15_000;
const SDA_PCT = "0.012";

// ─── Christian dot indices (12 dots = 1.2 %) ─────────────────────────────────
// Rows 11–12, cols 18–23 — centre of the grid
const CHRISTIAN_INDICES = new Set<number>([
  11 * COLS + 18, 11 * COLS + 19, 11 * COLS + 20,
  11 * COLS + 21, 11 * COLS + 22, 11 * COLS + 23,
  12 * COLS + 18, 12 * COLS + 19, 12 * COLS + 20,
  12 * COLS + 21, 12 * COLS + 22, 12 * COLS + 23,
]);

// Pre-computed dot positions (module-level constant — computed once)
const ALL_DOTS = Array.from({ length: TOTAL_DOTS }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return { x: GRID_LEFT + col * SPACING, y: GRID_TOP + row * SPACING, col, row };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function clamp(v: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, v));
}

// ─── Shared: Japanese background motifs ──────────────────────────────────────
function JapanBg({ opacity = 1 }: { opacity?: number }) {
  return (
    <AbsoluteFill style={{ opacity }}>
      <img
        src={staticFile("img/JapanSimple.svg")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.12,
        }}
      />
    </AbsoluteFill>
  );
}

// ─── Shared: Animated number counter ─────────────────────────────────────────
function Counter({
  value,
  startFrame,
  endFrame,
  color = WHITE,
  size = 64,
}: {
  value: number;
  startFrame: number;
  endFrame: number;
  color?: string;
  size?: number;
}) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  return (
    <span
      style={{
        fontFamily: "'Courier New', monospace",
        fontSize: size,
        fontWeight: 700,
        color,
        letterSpacing: -1,
      }}
    >
      {fmt(Math.round(p * value))}
    </span>
  );
}

// ─── Scene 1: Full Japan population ──────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const DOTS_START = Math.round(fps * 0.15);
  const TEXT_START = Math.round(fps * 1.3);
  const FADE_OUT = Math.round(fps * 2.5);

  const sceneOp = interpolate(frame, [FADE_OUT, fps * 3], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerOp = interpolate(frame, [0, Math.round(fps * 0.25)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textOp = interpolate(frame, [TEXT_START, TEXT_START + Math.round(fps * 0.3)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: BG, opacity: sceneOp }}>
      <JapanBg />

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 28,
          width: "100%",
          textAlign: "center",
          opacity: headerOp,
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: JAPAN_RED,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Statistical Rarity
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 26,
            color: WHITE,
            fontWeight: 300,
            letterSpacing: 3,
          }}
        >
          Seventh-day Adventists in Japan
        </div>
      </div>

      {/* Person-icon grid */}
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <symbol id="person" viewBox="0 0 10 15">
            <circle cx="5" cy="3" r="2.8" />
            <path d="M 5 7 C 1.8 7 0 9.5 0 15 L 10 15 C 10 9.5 8.2 7 5 7 Z" />
          </symbol>
        </defs>
        {ALL_DOTS.map((d, i) => {
          const stagger = (d.row * 0.028 + d.col * 0.007) * fps;
          const p = clamp(
            interpolate(frame, [DOTS_START + stagger, DOTS_START + stagger + 12], [0, 1])
          );
          return (
            <g key={i} transform={`translate(${d.x},${d.y}) scale(${p})`} opacity={p * 0.85}>
              <use href="#person" x={-PW / 2} y={-PH / 2} width={PW} height={PH} fill={DOT_JAPAN} />
            </g>
          );
        })}
      </svg>

      {/* Stats */}
      <div
        style={{
          position: "absolute",
          bottom: 58,
          width: "100%",
          textAlign: "center",
          opacity: textOp,
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 12,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: "#7777a0",
            marginBottom: 6,
          }}
        >
          Total Population
        </div>
        <Counter value={JAPAN_POP} startFrame={TEXT_START} endFrame={TEXT_START + Math.round(fps * 0.8)} />
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 12,
            color: "#55556e",
            letterSpacing: 2,
            marginTop: 8,
          }}
        >
          Each figure represents ≈ 125,000 people
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 2: Christian minority ─────────────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const FADE_IN_END = Math.round(fps * 0.4);
  const DIM_START = Math.round(fps * 0.4);
  const DIM_END = Math.round(fps * 1.0);
  const GLOW_END = Math.round(fps * 1.6);
  const TEXT_START = Math.round(fps * 1.5);
  const FADE_OUT = Math.round(fps * 2.4);

  const sceneOp = interpolate(
    frame,
    [0, FADE_IN_END, FADE_OUT, Math.round(fps * 2.8)],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const dimP = interpolate(frame, [DIM_START, DIM_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const glowP = interpolate(frame, [DIM_END, GLOW_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const textOp = interpolate(frame, [TEXT_START, TEXT_START + Math.round(fps * 0.3)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: BG, opacity: sceneOp }}>
      <JapanBg opacity={0.55} />

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 28,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: JAPAN_RED,
            fontWeight: 700,
          }}
        >
          Christianity in Japan
        </div>
      </div>

      {/* Person-icon grid */}
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <symbol id="person" viewBox="0 0 10 15">
            <circle cx="5" cy="3" r="2.8" />
            <path d="M 5 7 C 1.8 7 0 9.5 0 15 L 10 15 C 10 9.5 8.2 7 5 7 Z" />
          </symbol>
        </defs>
        {ALL_DOTS.map((d, i) => {
          const isC = CHRISTIAN_INDICES.has(i);

          if (isC) {
            const glowR = DOT_R + interpolate(glowP, [0, 1], [0, DOT_R * 0.9]);
            return (
              <g key={i} transform={`translate(${d.x},${d.y})`}>
                {/* Glow rings stay as circles behind the icon */}
                <circle cx={0} cy={0} r={glowR * 4} fill={DOT_CHRISTIAN} opacity={glowP * 0.12} />
                <circle cx={0} cy={0} r={glowR * 2} fill={DOT_CHRISTIAN} opacity={glowP * 0.2} />
                <use href="#person" x={-PW / 2} y={-PH / 2} width={PW} height={PH} fill={DOT_CHRISTIAN} opacity={0.95} />
              </g>
            );
          }

          const op = interpolate(dimP, [0, 1], [0.82, 0.07]);
          return (
            <g key={i} transform={`translate(${d.x},${d.y})`} opacity={op}>
              <use href="#person" x={-PW / 2} y={-PH / 2} width={PW} height={PH} fill={DOT_IDLE} />
            </g>
          );
        })}
      </svg>

      {/* Stats */}
      <div
        style={{
          position: "absolute",
          bottom: 58,
          width: "100%",
          textAlign: "center",
          opacity: textOp,
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 12,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: "#7777a0",
            marginBottom: 6,
          }}
        >
          Christians in Japan
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <Counter value={CHRISTIAN_POP} startFrame={TEXT_START} endFrame={TEXT_START + Math.round(fps * 0.8)} size={60} />
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 32,
              color: "#ccccee",
              fontWeight: 300,
            }}
          >
            ({CHRISTIAN_PCT}%)
          </span>
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 12,
            color: "#55556e",
            letterSpacing: 2,
            marginTop: 8,
          }}
        >
          Only {CHRISTIAN_PCT}% of Japan's population identifies as Christian
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 3: SDA isolation ───────────────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const FADE_IN_END = Math.round(fps * 0.4);
  const SPOTLIGHT_START = Math.round(fps * 0.2);
  const SPOTLIGHT_END = Math.round(fps * 0.7);
  const GRID_START = Math.round(fps * 0.6);
  const GRID_END = Math.round(fps * 1.2);
  const DIM_START = Math.round(fps * 1.1);
  const DIM_END = Math.round(fps * 1.7);
  const GLOW_END = Math.round(fps * 2.1);
  const TEXT_START = Math.round(fps * 1.9);

  const sceneOp = interpolate(frame, [0, FADE_IN_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Single white spotlight dot (pre-grid phase)
  const spotP = spring({
    frame: frame - SPOTLIGHT_START,
    fps,
    config: { damping: 200 },
    durationInFrames: SPOTLIGHT_END - SPOTLIGHT_START,
  });
  const spotR = interpolate(spotP, [0, 1], [0, 18]);
  const spotOp = interpolate(frame, [GRID_START, GRID_END], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Mini grid appearance
  const gridOp = interpolate(frame, [GRID_START, GRID_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dimP = interpolate(frame, [DIM_START, DIM_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const glowP = interpolate(frame, [DIM_END, GLOW_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const textOp = interpolate(frame, [TEXT_START, TEXT_START + Math.round(fps * 0.3)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow breathing pulse on the SDA dot
  const pulse = 1 + Math.sin((frame / fps) * Math.PI * 1.2) * 0.18 * glowP;

  // Arrow label opacity
  const arrowOp = interpolate(frame, [DIM_END, DIM_END + Math.round(fps * 0.4)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sdaDotCol = SDA_INDEX % MINI_COLS;
  const sdaDotRow = Math.floor(SDA_INDEX / MINI_COLS);
  const sdaCx = MINI_LEFT + sdaDotCol * MINI_SPACING;
  const sdaCy = MINI_TOP + sdaDotRow * MINI_SPACING;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, #0a0a1e 0%, ${BG} 70%)`,
        opacity: sceneOp,
      }}
    >
      <JapanBg opacity={0.03} />

      {/* Single spotlight dot — transitions to the grid */}
      <svg width={W} height={H} style={{ position: "absolute", opacity: spotOp }}>
        <circle cx={W / 2} cy={H / 2 + 10} r={spotR * 4} fill={DOT_CHRISTIAN} opacity={0.06} />
        <circle cx={W / 2} cy={H / 2 + 10} r={spotR * 2} fill={DOT_CHRISTIAN} opacity={0.12} />
        <circle cx={W / 2} cy={H / 2 + 10} r={spotR} fill={DOT_CHRISTIAN} opacity={0.9} />
      </svg>

      {/* Section label */}
      <div
        style={{
          position: "absolute",
          top: 28,
          width: "100%",
          textAlign: "center",
          opacity: gridOp,
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 12,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: GOLD,
            fontWeight: 600,
          }}
        >
          Within Japan's Christian Community
        </div>
      </div>

      {/* 10 × 10 mini grid */}
      <svg width={W} height={H} style={{ position: "absolute", opacity: gridOp }}>
        <defs>
          <symbol id="mini-person" viewBox="0 0 10 15">
            <circle cx="5" cy="3" r="2.8" />
            <path d="M 5 7 C 1.8 7 0 9.5 0 15 L 10 15 C 10 9.5 8.2 7 5 7 Z" />
          </symbol>
        </defs>

        {/* Caption */}
        <text
          x={W / 2}
          y={MINI_TOP - 28}
          textAnchor="middle"
          fill="#7777a0"
          fontSize={12}
          letterSpacing={2}
          fontFamily="sans-serif"
        >
          For every 100 Christians in Japan…
        </text>

        {Array.from({ length: 100 }, (_, i) => {
          const col = i % MINI_COLS;
          const row = Math.floor(i / MINI_COLS);
          const cx = MINI_LEFT + col * MINI_SPACING;
          const cy = MINI_TOP + row * MINI_SPACING;
          const isSDA = i === SDA_INDEX;

          if (isSDA) {
            const glowR = MINI_R * 1.3 * pulse;
            return (
              <g key={i} transform={`translate(${cx},${cy})`}>
                {/* Glow rings centered on the icon */}
                <circle cx={0} cy={0} r={glowR * 6} fill={GOLD} opacity={glowP * 0.05} />
                <circle cx={0} cy={0} r={glowR * 3.5} fill={GOLD} opacity={glowP * 0.1} />
                <circle cx={0} cy={0} r={glowR * 2} fill={GOLD} opacity={glowP * 0.2} />
                <use href="#mini-person" x={-MPW / 2} y={-MPH / 2} width={MPW} height={MPH} fill={DOT_SDA} opacity={1} />
              </g>
            );
          }

          // Staggered appearance
          const dotOp = clamp(
            interpolate(frame, [GRID_START + i * 0.12, GRID_START + i * 0.12 + 6], [0, 1])
          );
          const dimmedOp = interpolate(dimP, [0, 1], [1, 0.1]);

          return (
            <g key={i} transform={`translate(${cx},${cy})`} opacity={dotOp * dimmedOp}>
              <use href="#mini-person" x={-MPW / 2} y={-MPH / 2} width={MPW} height={MPH} fill={DOT_CHRISTIAN} />
            </g>
          );
        })}

        {/* Dashed arrow pointing to SDA dot */}
        <g opacity={arrowOp}>
          <line
            x1={sdaCx + MPW / 2 + 6}
            y1={sdaCy - MPH / 2 - 6}
            x2={sdaCx + 80}
            y2={sdaCy - 70}
            stroke={GOLD}
            strokeWidth={1.2}
            strokeDasharray="5 4"
          />
          <text
            x={sdaCx + 86}
            y={sdaCy - 76}
            fill={GOLD}
            fontSize={11}
            letterSpacing={2}
            fontFamily="sans-serif"
          >
            Seventh-day Adventist
          </text>
        </g>
      </svg>

      {/* Stats */}
      <div
        style={{
          position: "absolute",
          bottom: 52,
          width: "100%",
          textAlign: "center",
          opacity: textOp,
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 12,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: GOLD,
            marginBottom: 6,
          }}
        >
          Seventh-day Adventists in Japan
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <Counter
            value={SDA_POP}
            startFrame={TEXT_START}
            endFrame={TEXT_START + Math.round(fps * 0.7)}
            color={GOLD}
            size={60}
          />
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 28,
              color: "#ccaa44",
              fontWeight: 300,
            }}
          >
            (~{SDA_PCT}%)
          </span>
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 12,
            color: "#55556e",
            letterSpacing: 2,
            marginTop: 8,
          }}
        >
          Approximately 1 in every 8,300 people in Japan is a Seventh-day Adventist
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Outro ────────────────────────────────────────────────────────────────────
function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op = interpolate(frame, [0, Math.round(fps * 0.4), Math.round(fps * 1.0), Math.round(fps * 1.4)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = 1 + Math.sin((frame / fps) * Math.PI * 1.5) * 0.2;

  return (
    <AbsoluteFill style={{ background: BG, opacity: op }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {/* Pulsing gold dot */}
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: GOLD,
            boxShadow: `0 0 ${30 * pulse}px ${10 * pulse}px ${GOLD}55`,
            transform: `scale(${pulse})`,
            marginBottom: 18,
          }}
        />

        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 30,
            fontWeight: 300,
            color: WHITE,
            letterSpacing: 5,
            textAlign: "center",
          }}
        >
          Small in number.
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 24,
            fontWeight: 500,
            color: GOLD,
            letterSpacing: 4,
            textAlign: "center",
          }}
        >
          Significant in mission.
        </div>

        <div
          style={{
            marginTop: 36,
            fontFamily: "sans-serif",
            fontSize: 11,
            color: "#44445a",
            letterSpacing: 4,
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          Seventh-day Adventist Church · Japan Union Mission
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 4: Tokyo ───────────────────────────────────────────────────────────
// Covers subtitles 6–10 (16 s = 384 frames)
// Sub 6–7 (~0.4–7.1 s):  "Until 2025, Tokyo was the largest urban area…"
// Sub 8–9 (~7.6–11.9 s): "Nearly one-third of the population lives here"
// Sub 10  (~12.3–16 s):  "Yet, Tokyo remains largely unreached."
//
// Tokyo/Kanto approximate screen position after objectFit:contain of 479×547 SVG in 1280×720:
//   map width ≈ 631 px, left offset ≈ 324 px
//   SVG ~(350, 345) → screen ~(784, 454)
const TOKYO_X = 784;
const TOKYO_Y = 454;

function TokyoScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Phase 1: "Tokyo was the largest urban area" (subs 6–7) ──
  const FADE_IN_END = Math.round(fps * 0.5);
  const TITLE_START = Math.round(fps * 0.4);       // ~sub 6 relative start
  const HIGHLIGHT_START = Math.round(fps * 1.0);

  // ── Phase 2: "Nearly one-third …" (subs 8–9) — holds static after frame 191 ──
  const PHASE2_START = Math.round(fps * 7.6);      // ~sub 8

  const sceneOp = interpolate(frame, [0, FADE_IN_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleOp = interpolate(
    frame,
    [TITLE_START, TITLE_START + Math.round(fps * 0.5), PHASE2_START - Math.round(fps * 0.5), PHASE2_START],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const highlightScale = spring({
    frame: frame - HIGHLIGHT_START,
    fps,
    config: { damping: 120, stiffness: 80 },
  });

  const phase2Op = interpolate(
    frame,
    [PHASE2_START, PHASE2_START + Math.round(fps * 0.5)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const mapOp = interpolate(
    frame,
    [0, FADE_IN_END],
    [0, 0.4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const clampedHighlight = Math.min(highlightScale, 1);

  return (
    <AbsoluteFill style={{ background: BG, opacity: sceneOp }}>
      {/* Japan map — more prominent than the background usage */}
      <img
        src={staticFile("img/JapanSimple.svg")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          opacity: mapOp,
        }}
      />

      {/* Tokyo highlight ring */}
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* Outer glow */}
        <circle cx={TOKYO_X} cy={TOKYO_Y} r={90 * clampedHighlight} fill={JAPAN_RED} opacity={clampedHighlight * 0.08} />
        <circle cx={TOKYO_X} cy={TOKYO_Y} r={55 * clampedHighlight} fill={JAPAN_RED} opacity={clampedHighlight * 0.14} />
        {/* Ring */}
        <circle
          cx={TOKYO_X}
          cy={TOKYO_Y}
          r={40 * clampedHighlight}
          fill="none"
          stroke={JAPAN_RED}
          strokeWidth={1.5}
          opacity={clampedHighlight * 0.9}
        />
        {/* Label */}
        <text
          x={TOKYO_X + 48}
          y={TOKYO_Y + 5}
          fill={JAPAN_RED}
          fontSize={13}
          letterSpacing={4}
          fontFamily="sans-serif"
          fontWeight="600"
          opacity={clampedHighlight}
        >
          TOKYO
        </text>
      </svg>

      {/* Phase 1: largest urban area */}
      <div
        style={{
          position: "absolute",
          top: 52,
          width: "100%",
          textAlign: "center",
          opacity: titleOp,
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 12,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: JAPAN_RED,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          Tokyo, Japan
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 28,
            color: WHITE,
            fontWeight: 300,
            letterSpacing: 2,
            lineHeight: 1.5,
          }}
        >
          Until 2025, the largest urban area<br />in the entire world.
        </div>
      </div>

      {/* Phase 2: one-third population */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          width: "100%",
          textAlign: "center",
          opacity: phase2Op,
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 12,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: "#7777a0",
            marginBottom: 10,
          }}
        >
          Population Concentration
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 32,
            color: WHITE,
            fontWeight: 300,
            lineHeight: 1.5,
          }}
        >
          Nearly{" "}
          <span style={{ color: JAPAN_RED, fontWeight: 700 }}>1 in 3</span>{" "}
          Japanese people<br />
          <span style={{ fontSize: 28, letterSpacing: 1 }}>lives in the greater Tokyo area.</span>
        </div>
      </div>

    </AbsoluteFill>
  );
}

// ─── Root composition ─────────────────────────────────────────────────────────
// Scene timing (all in frames at 30 fps):
//   Scene1: 0   → 600   (20 s)
//   Scene2: 540 → 1200  (22 s)  ← 2 s overlap with Scene1
//   Scene3: 1140→ 1800  (22 s)  ← 2 s overlap with Scene2
//   Outro:  1740→ 2040  (10 s)  ← 2 s overlap with Scene3
// Total: 2040 frames = 68 s

export function JapanAdventistStats() {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Sequence from={0} durationInFrames={3 * fps} premountFor={fps}>
        <Scene1 />
      </Sequence>
      <Sequence from={Math.round(2.5 * fps)} durationInFrames={3 * fps} premountFor={fps}>
        <Scene2 />
      </Sequence>
      <Sequence from={5 * fps} durationInFrames={3 * fps} premountFor={fps}>
        <Scene3 />
      </Sequence>
      <Sequence from={Math.round(7.5 * fps)} durationInFrames={384} premountFor={fps}>
        <TokyoScene />
      </Sequence>
    </AbsoluteFill>
  );
}
