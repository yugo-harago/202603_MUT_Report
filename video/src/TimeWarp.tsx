import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const W = 1280;
const H = 720;

// ─── Pre-computed geometry (module-level, computed once) ──────────────────────

const NUM_STREAKS = 90;
const STREAKS = Array.from({ length: NUM_STREAKS }, (_, i) => ({
  angle: (i / NUM_STREAKS) * Math.PI * 2,
  r0: 55 + ((i * 37 + 11) % 65),          // inner radius 55–120
  width: 0.4 + (((i * 53 + 7) % 12) / 12) * 2.2, // 0.4–2.6
  lenFactor: 0.45 + ((i * 61 + 19) % 55) / 100,   // 0.45–1.0
}));

const NUM_PARTICLES = 60;
const PARTICLES = Array.from({ length: NUM_PARTICLES }, (_, i) => ({
  angle: ((i * 97 + 23) % 360) * (Math.PI / 180),
  r0: 10 + ((i * 41 + 13) % 80),
  size: 1.2 + ((i * 29 + 7) % 5),
  speedFactor: 0.25 + ((i * 67 + 17) % 75) / 100,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function lerpColor(
  t: number,
  stops: [number, number][], // [r, g, b] pairs at t=0,0.5,1
): string {
  const clampT = Math.max(0, Math.min(1, t));
  const r = Math.round(interpolate(clampT, [0, 0.5, 1], [stops[0][0], stops[1][0], stops[2][0]]));
  const g = Math.round(interpolate(clampT, [0, 0.5, 1], [stops[0][1], stops[1][1], stops[2][1]]));
  const b = Math.round(interpolate(clampT, [0, 0.5, 1], [stops[0][2], stops[1][2], stops[2][2]]));
  return `rgb(${r},${g},${b})`;
}

// Year color: electric blue ─→ white ─→ gold
const YEAR_COLOR_STOPS: [number, number][] = [
  [80, 120, 255],   // 2020: electric blue
  [220, 230, 255],  // 2023: near-white
  [255, 215, 0],    // 2026: gold
];

// ─── Main component ───────────────────────────────────────────────────────────
export function TimeWarp() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Year interpolation: slow start → rapid → smooth landing ──
  const yearRaw = interpolate(
    frame,
    [0, fps * 0.4, fps * 1.8, fps * 3.6, fps * 4.5],
    [2020, 2020, 2024.5, 2026, 2026],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );
  const yearDisplay = Math.round(yearRaw);
  const colorP = (yearRaw - 2020) / 6; // 0 → 1

  // ── Speed factor (0–1) ────────────────────────────────────────
  const speed = interpolate(
    frame,
    [0, fps * 0.4, fps * 1.4, fps * 3.2, fps * 4.1],
    [0, 0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Scene fade ────────────────────────────────────────────────
  const sceneOp = interpolate(
    frame,
    [0, fps * 0.25, fps * 4.6, fps * 5],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Colors ────────────────────────────────────────────────────
  const yearColor = lerpColor(colorP, YEAR_COLOR_STOPS);
  const bgInner = lerpColor(colorP, [[4, 4, 22], [8, 5, 18], [14, 8, 4]]);

  // ── Motion blur on year number ────────────────────────────────
  const yearBlur = speed * 12;

  // ── RGB glitch offset at peak speed ──────────────────────────
  const glitchAmp = Math.max(0, speed - 0.45) / 0.55;
  const glitchX = Math.sin(frame * 4.3) * 14 * glitchAmp;
  const glitchY = Math.cos(frame * 2.9) * 6 * glitchAmp;

  // ── White flash when landing on 2026 ─────────────────────────
  const flashOp = interpolate(
    frame,
    [fps * 3.6, fps * 3.85, fps * 4.3],
    [0, 0.55, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Labels ────────────────────────────────────────────────────
  const movingLabelOp = interpolate(
    speed,
    [0, 0.25, 0.85, 1],
    [0, 1, 1, 0.1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const hereNowOp = interpolate(
    frame,
    [fps * 4.0, fps * 4.4],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Timeline bar ──────────────────────────────────────────────
  const timelineOp = interpolate(
    frame,
    [0, fps * 0.4],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const timelineP = Math.max(0, Math.min(1, (yearRaw - 2020) / 6));

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 60% 55% at center, ${bgInner} 0%, #03030f 70%)`,
        opacity: sceneOp,
      }}
    >
      {/* ── Speed streaks ─────────────────────────────────────── */}
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={yearColor} stopOpacity={speed * 0.2} />
            <stop offset="100%" stopColor={yearColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Radial glow behind streaks */}
        <ellipse
          cx={W / 2}
          cy={H / 2}
          rx={180 + speed * 260}
          ry={110 + speed * 160}
          fill="url(#coreGlow)"
        />

        {STREAKS.map((s, i) => {
          const endR = s.r0 + speed * 520 * s.lenFactor;
          const x1 = W / 2 + Math.cos(s.angle) * s.r0;
          const y1 = H / 2 + Math.sin(s.angle) * s.r0;
          const x2 = W / 2 + Math.cos(s.angle) * endR;
          const y2 = H / 2 + Math.sin(s.angle) * endR;
          const op = speed * (0.18 + s.lenFactor * 0.55);
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={yearColor}
              strokeWidth={s.width}
              opacity={op}
            />
          );
        })}
      </svg>

      {/* ── Particles streaming outward ────────────────────────── */}
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {PARTICLES.map((p, i) => {
          const traveled = speed * 380 * p.speedFactor;
          const r = p.r0 + traveled;
          const cx = W / 2 + Math.cos(p.angle) * r;
          const cy = H / 2 + Math.sin(p.angle) * r;
          // Fade out as particle moves far from center
          const fadeRatio = 1 - Math.min(1, traveled / (380 * p.speedFactor + 1));
          const pOp = speed * 0.8 * fadeRatio;
          return (
            <circle
              key={i}
              cx={cx} cy={cy}
              r={p.size}
              fill={yearColor}
              opacity={Math.max(0, pOp)}
            />
          );
        })}
      </svg>

      {/* ── "TIME IS MOVING" label ─────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 58,
          width: "100%",
          textAlign: "center",
          opacity: movingLabelOp,
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 11,
            letterSpacing: 10,
            textTransform: "uppercase",
            color: yearColor,
            fontWeight: 600,
          }}
        >
          time is moving
        </span>
      </div>

      {/* ── Year display ───────────────────────────────────────── */}
      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {/* Glitch: red channel */}
        <span
          style={{
            position: "absolute",
            fontFamily: "'Courier New', monospace",
            fontSize: 210,
            fontWeight: 700,
            color: `rgba(255,55,55,${glitchAmp * 0.45})`,
            transform: `translate(${glitchX * 2}px,${-glitchY}px)`,
            filter: `blur(${yearBlur * 0.5}px)`,
            userSelect: "none",
            letterSpacing: -6,
          }}
        >
          {yearDisplay}
        </span>

        {/* Glitch: cyan channel */}
        <span
          style={{
            position: "absolute",
            fontFamily: "'Courier New', monospace",
            fontSize: 210,
            fontWeight: 700,
            color: `rgba(0,220,255,${glitchAmp * 0.45})`,
            transform: `translate(${-glitchX}px,${glitchY * 2}px)`,
            filter: `blur(${yearBlur * 0.5}px)`,
            userSelect: "none",
            letterSpacing: -6,
          }}
        >
          {yearDisplay}
        </span>

        {/* Main year */}
        <span
          style={{
            position: "relative",
            fontFamily: "'Courier New', monospace",
            fontSize: 210,
            fontWeight: 700,
            color: yearColor,
            filter: `blur(${yearBlur}px)`,
            textShadow: `
              0 0 ${50 - speed * 30}px ${yearColor},
              0 0 ${100 - speed * 60}px ${yearColor}66
            `,
            transform: `scale(${1 + speed * 0.07})`,
            letterSpacing: -6,
            userSelect: "none",
          }}
        >
          {yearDisplay}
        </span>
      </AbsoluteFill>

      {/* ── "WE ARE HERE NOW" at landing ──────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 130,
          width: "100%",
          textAlign: "center",
          opacity: hereNowOp,
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 12,
            letterSpacing: 9,
            textTransform: "uppercase",
            color: "#FFD700",
            fontWeight: 700,
          }}
        >
          we are here now
        </span>
      </div>

      {/* ── Timeline bar ──────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 52,
          left: "13%",
          right: "13%",
          opacity: timelineOp,
        }}
      >
        {/* Year ticks */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 7,
          }}
        >
          {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => {
            const lit = yearRaw >= y - 0.5;
            return (
              <span
                key={y}
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 11,
                  color: lit ? yearColor : "#2a2a44",
                  fontWeight: yearDisplay === y ? 700 : 400,
                  letterSpacing: 1,
                }}
              >
                {y}
              </span>
            );
          })}
        </div>

        {/* Track */}
        <div
          style={{
            position: "relative",
            height: 2,
            background: "#16163a",
            borderRadius: 2,
          }}
        >
          {/* Filled portion */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${timelineP * 100}%`,
              background: yearColor,
              boxShadow: `0 0 8px 2px ${yearColor}88`,
              borderRadius: 2,
            }}
          />
          {/* Cursor dot */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${timelineP * 100}%`,
              transform: "translate(-50%, -50%)",
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: yearColor,
              boxShadow: `0 0 14px 5px ${yearColor}`,
            }}
          />
        </div>
      </div>

      {/* ── White landing flash ────────────────────────────────── */}
      <AbsoluteFill
        style={{ background: "white", opacity: flashOp, pointerEvents: "none" }}
      />
    </AbsoluteFill>
  );
}
