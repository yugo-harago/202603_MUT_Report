import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
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
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.045 }}
      >
        {/* Mount Fuji */}
        <path d={`M 320 ${H} L 640 200 L 960 ${H} Z`} fill={WHITE} />
        <path d="M 608 270 L 640 200 L 672 270 Z" fill={WHITE} />
        {/* Torii gate */}
        <g transform="translate(1080 310)">
          <rect x="-80" y="0" width="160" height="14" rx="2" fill={WHITE} />
          <rect x="-65" y="22" width="130" height="9" rx="2" fill={WHITE} />
          <rect x="-52" y="31" width="13" height="130" rx="2" fill={WHITE} />
          <rect x="39" y="31" width="13" height="130" rx="2" fill={WHITE} />
        </g>
        {/* Scattered cherry blossoms */}
        {[...Array(18)].map((_, k) => {
          const bx = ((k * 79 + 60) % (W - 120)) + 60;
          const by = ((k * 53 + 80) % 380) + 40;
          return (
            <g key={k} transform={`translate(${bx} ${by})`} opacity="0.55">
              {[0, 72, 144, 216, 288].map((a, j) => (
                <ellipse
                  key={j}
                  cx={Math.cos((a * Math.PI) / 180) * 9}
                  cy={Math.sin((a * Math.PI) / 180) * 9}
                  rx="5.5"
                  ry="3"
                  fill={WHITE}
                  transform={`rotate(${a})`}
                />
              ))}
            </g>
          );
        })}
      </svg>
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

  const DOTS_START = 1 * fps;
  const TEXT_START = 11 * fps;
  const FADE_OUT = 18 * fps;

  const sceneOp = interpolate(frame, [FADE_OUT, 20 * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerOp = interpolate(frame, [0, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textOp = interpolate(frame, [TEXT_START, TEXT_START + fps], [0, 1], {
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
          const stagger = (d.row * 0.14 + d.col * 0.035) * fps;
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
        <Counter value={JAPAN_POP} startFrame={TEXT_START} endFrame={TEXT_START + fps * 3} />
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

  const FADE_IN_END = fps * 2;
  const DIM_START = fps * 2;
  const DIM_END = fps * 5;
  const GLOW_END = fps * 7;
  const TEXT_START = fps * 7;
  const FADE_OUT = fps * 20;

  const sceneOp = interpolate(
    frame,
    [0, FADE_IN_END, FADE_OUT, fps * 22],
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
  const textOp = interpolate(frame, [TEXT_START, TEXT_START + fps], [0, 1], {
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
          <Counter value={CHRISTIAN_POP} startFrame={TEXT_START} endFrame={TEXT_START + fps * 2} size={60} />
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

  const FADE_IN_END = fps * 2;
  const SPOTLIGHT_START = fps * 1;
  const SPOTLIGHT_END = fps * 4;
  const GRID_START = fps * 3;
  const GRID_END = fps * 6;
  const DIM_START = fps * 5.5;
  const DIM_END = fps * 8.5;
  const GLOW_END = fps * 11;
  const TEXT_START = fps * 10;

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
  const textOp = interpolate(frame, [TEXT_START, TEXT_START + fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow breathing pulse on the SDA dot
  const pulse = 1 + Math.sin((frame / fps) * Math.PI * 1.2) * 0.18 * glowP;

  // Arrow label opacity
  const arrowOp = interpolate(frame, [DIM_END, DIM_END + fps], [0, 1], {
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
            interpolate(frame, [GRID_START + i * 0.6, GRID_START + i * 0.6 + 12], [0, 1])
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
            endFrame={TEXT_START + fps * 2}
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

  const op = interpolate(frame, [0, fps, fps * 7, fps * 9], [0, 1, 1, 0], {
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
      <Sequence from={0} durationInFrames={20 * fps} premountFor={fps}>
        <Scene1 />
      </Sequence>
      <Sequence from={18 * fps} durationInFrames={22 * fps} premountFor={fps}>
        <Scene2 />
      </Sequence>
      <Sequence from={38 * fps} durationInFrames={22 * fps} premountFor={fps}>
        <Scene3 />
      </Sequence>
      <Sequence from={58 * fps} durationInFrames={10 * fps} premountFor={fps}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
}
