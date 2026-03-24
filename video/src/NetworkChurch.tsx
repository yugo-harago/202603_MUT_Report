import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const W = 1280;
const H = 720;
const BG = "#05050E";
const JAPAN_RED = "#BC002D";
const GOLD = "#FFD700";
const WHITE = "#FFFFFF";

// Distinct bright colors for each house, white-themed palette
const HOUSE_COLORS = [
  "#FF6B6B", // coral
  "#FF9F43", // orange
  "#FFD700", // gold
  "#A8E063", // lime
  "#54A0FF", // sky blue
  "#C56CFF", // violet
  "#FF6BAE", // pink
  "#00D2D3", // teal
  "#48DBFB", // cyan
  "#FF9FF3", // lavender
];

// ─── Network layout ───────────────────────────────────────────────────────────
// 10 nodes arranged in an ellipse, centred on screen
const N = 10;
const NET_RX = 210; // horizontal radius
const NET_RY = 155; // vertical radius

const NODES = Array.from({ length: N }, (_, i) => {
  const angle = (i / N) * Math.PI * 2 - Math.PI / 2; // start at 12 o'clock
  return {
    x: W / 2 + Math.cos(angle) * NET_RX,
    y: H / 2 + Math.sin(angle) * NET_RY,
  };
});

// Edges: ring connections + 5 diameter cross-connections
const RING_EDGES: [number, number][] = Array.from({ length: N }, (_, i) => [i, (i + 1) % N]);
const CROSS_EDGES: [number, number][] = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]];
const ALL_EDGES = [...RING_EDGES, ...CROSS_EDGES]; // 15 edges total

// ─── Timing: relative to sub 76 start (01:03:45.125), 24 fps ─────────────────
const f = (s: number) => Math.round(s * 24);

const T = {
  NODES_START:   f(0.3),    // nodes begin appearing
  NET_CONNECT:   f(2.0),    // edges start drawing (sub 77)
  NET_LABEL:     f(3.333),  // "one network" (sub 78)
  SUPPORT:       f(4.791),  // "support each other" (sub 79)
  TRAINING:      f(6.750),  // "host trainings" (sub 80)
  SHARE:         f(8.166),  // "share responsibilities" (sub 81)
  FUNCTIONS:     f(10.416), // "various church functions" (sub 82)
  TITHE:         f(12.250), // "tithe" badge (sub 83)
  OFFERING:      f(13.541), // "offering" badge (sub 84)
  BOARD:         f(13.800), // "board meetings" badge (sub 84, staggered)
  END:           f(15.250),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function c01(v: number) { return Math.max(0, Math.min(1, v)); }

function fi(frame: number, start: number, dur = 16): number {
  return c01(interpolate(frame, [start, start + dur], [0, 1]));
}

function fio(frame: number, inS: number, outS: number, dur = 16): number {
  return c01(interpolate(frame, [inS, inS + dur, outS, outS + dur], [0, 1, 1, 0]));
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function FunctionBadge({
  label,
  scale,
  opacity,
}: {
  label: string;
  scale: number;
  opacity: number;
}) {
  return (
    <div
      style={{
        opacity,
        transform: `scale(${Math.min(scale, 1)})`,
        transformOrigin: "center",
        border: `1px solid ${GOLD}99`,
        borderRadius: 6,
        padding: "10px 32px",
        background: "#05050Eee",
        minWidth: 200,
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontFamily: "sans-serif",
          fontSize: 13,
          letterSpacing: 5,
          textTransform: "uppercase",
          color: GOLD,
          fontWeight: 700,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Main composition ─────────────────────────────────────────────────────────
export function NetworkChurch() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene fade
  const sceneOp = interpolate(
    frame,
    [0, 12, T.END - 16, T.END],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Phase 1: nodes appear ─────────────────────────────────────────────────
  const NODE_STAGGER = (T.NET_CONNECT - T.NODES_START) / N; // ~4.1 f per node

  // ── Phase 2: edges draw in ────────────────────────────────────────────────
  const EDGE_STAGGER = 3; // frames between each edge

  // ── Phase 3: support pulse ────────────────────────────────────────────────
  const supportOp = fio(frame, T.SUPPORT, T.TRAINING - 8);
  const supportSin = 0.5 + 0.5 * Math.sin(((frame - T.SUPPORT) / fps) * Math.PI * 3.5);
  const edgePulse = supportOp * supportSin;

  // ── Phase 4: training gather ──────────────────────────────────────────────
  const trainingOp = fio(frame, T.TRAINING, T.SHARE - 8);
  const trainingRing = 45 + trainingOp * 25 * Math.abs(Math.sin(((frame - T.TRAINING) / fps) * Math.PI * 3.5));

  // ── Labels ────────────────────────────────────────────────────────────────
  const tenGroupsOp    = fio(frame, T.NODES_START + 6, T.NET_LABEL - 10);
  const networkLabelOp = fi(frame, T.NET_LABEL);
  const supportLabelOp = fio(frame, T.SUPPORT + 6, T.TRAINING - 6);
  const trainingLabelOp = fio(frame, T.TRAINING + 6, T.SHARE - 6);
  const shareLabelOp   = fi(frame, T.SHARE);
  const functionsOp    = fi(frame, T.FUNCTIONS);

  // ── Badge spring scales ────────────────────────────────────────────────────
  const titheScale    = spring({ frame: frame - T.TITHE,    fps, config: { damping: 160, stiffness: 200 } });
  const offeringScale = spring({ frame: frame - T.OFFERING, fps, config: { damping: 160, stiffness: 200 } });
  const boardScale    = spring({ frame: frame - T.BOARD,    fps, config: { damping: 160, stiffness: 200 } });

  // Node subtle pulse during support phase
  const nodePulseScale = 1 + edgePulse * 0.06;

  return (
    <AbsoluteFill style={{ background: BG, opacity: sceneOp }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
<radialGradient id="cglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.22" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={JAPAN_RED} stopOpacity="0.1" />
            <stop offset="100%" stopColor={JAPAN_RED} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Support aura over whole network */}
        <ellipse
          cx={W / 2} cy={H / 2}
          rx={NET_RX * 1.2} ry={NET_RY * 1.2}
          fill="url(#sglow)"
          opacity={edgePulse}
        />

        {/* Training: golden gather ring */}
        <circle
          cx={W / 2} cy={H / 2}
          r={trainingRing}
          fill="url(#cglow)"
          opacity={trainingOp * 0.6}
        />
        <circle
          cx={W / 2} cy={H / 2}
          r={trainingRing}
          fill="none"
          stroke={GOLD}
          strokeWidth={1.2}
          strokeDasharray="6 5"
          opacity={trainingOp * 0.55}
        />

        {/* Edges */}
        {ALL_EDGES.map(([a, b], ei) => {
          const na = NODES[a];
          const nb = NODES[b];
          const ef = T.NET_CONNECT + ei * EDGE_STAGGER;
          const eOp = c01(interpolate(frame, [ef, ef + 16], [0, 1]));
          if (eOp === 0) return null;

          const isCross = ei >= N; // cross edges are indices 10-14
          const baseOp = isCross ? 0.12 : 0.22;
          const finalOp = eOp * (baseOp + edgePulse * 0.45);
          const strokeW = (isCross ? 0.6 : 0.9) + edgePulse * 1.2;

          return (
            <line
              key={`e${ei}`}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke={WHITE}
              strokeWidth={strokeW}
              opacity={finalOp}
            />
          );
        })}

        {/* Nodes */}
        {NODES.map((n, i) => {
          const nf = T.NODES_START + i * NODE_STAGGER;
          const nOp = c01(interpolate(frame, [nf, nf + 14], [0, 1]));
          if (nOp === 0) return null;

          const s = Math.min(
            spring({ frame: frame - nf, fps, config: { damping: 150, stiffness: 180 } }),
            1
          );
          const totalScale = s * nodePulseScale;

          const color = HOUSE_COLORS[i % HOUSE_COLORS.length];
          return (
            <g key={`n${i}`} opacity={nOp} transform={`translate(${n.x},${n.y}) scale(${totalScale})`}>
              {/* Ambient glow */}
              <circle cx={0} cy={0} r={34} fill={color} opacity={0.12} />
              {/* Chimney */}
              <rect x={5} y={-24} width={5} height={10} rx={1} fill={color} />
              {/* Roof */}
              <polygon points="-16,-5 0,-22 16,-5" fill={color} />
              {/* Roof highlight */}
              <polygon points="-16,-5 0,-22 16,-5" fill={WHITE} opacity={0.12} />
              {/* Walls */}
              <rect x={-11} y={-5} width={22} height={16} rx={1.5} fill={WHITE} opacity={0.92} />
              {/* Left window */}
              <rect x={-9} y={-2} width={6} height={5} rx={1} fill={color} opacity={0.75} />
              {/* Right window */}
              <rect x={3} y={-2} width={6} height={5} rx={1} fill={color} opacity={0.75} />
              {/* Door */}
              <rect x={-2.5} y={4} width={5} height={7} rx={1} fill={color} opacity={0.85} />
            </g>
          );
        })}
      </svg>

      {/* ── "10 Small Groups" header (Phase 1) ─────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 50,
          width: "100%",
          textAlign: "center",
          opacity: tenGroupsOp,
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 11,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: JAPAN_RED,
            fontWeight: 700,
          }}
        >
          10 Small Groups · House Church Groups
        </span>
      </div>

      {/* ── "One Network of Churches" (Phase 2) ────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 50,
          width: "100%",
          textAlign: "center",
          opacity: networkLabelOp,
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 11,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: JAPAN_RED,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Together
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 28,
            color: WHITE,
            fontWeight: 300,
            letterSpacing: 3,
          }}
        >
          One Network of Churches
        </div>
      </div>

      {/* ── "Supporting each other" (Phase 3) ──────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          width: "100%",
          textAlign: "center",
          opacity: supportLabelOp,
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 18,
            letterSpacing: 3,
            color: WHITE,
            fontWeight: 300,
          }}
        >
          Supporting each other
        </span>
      </div>

      {/* ── "Host trainings together" (Phase 4) ────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          width: "100%",
          textAlign: "center",
          opacity: trainingLabelOp,
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 18,
            letterSpacing: 3,
            color: GOLD,
            fontWeight: 300,
          }}
        >
          Host trainings together
        </span>
      </div>

      {/* ── "Shared Responsibilities" (Phase 5+) ───────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 50,
          width: "100%",
          textAlign: "center",
          opacity: shareLabelOp,
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 11,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#6666a0",
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Shared Responsibilities
        </div>
        <div style={{ opacity: functionsOp }}>
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 16,
              color: WHITE,
              fontWeight: 300,
              letterSpacing: 2,
            }}
          >
            Various church functions
          </span>
        </div>
      </div>

      {/* ── Function badges (Phase 6) — centred in the network ring ──────────── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "center",
          opacity: shareLabelOp,
        }}
      >
        <FunctionBadge
          label="Tithe"
          scale={titheScale}
          opacity={fi(frame, T.TITHE, 14)}
        />
        <FunctionBadge
          label="Offering"
          scale={offeringScale}
          opacity={fi(frame, T.OFFERING, 14)}
        />
        <FunctionBadge
          label="Board Meetings"
          scale={boardScale}
          opacity={fi(frame, T.BOARD, 14)}
        />
      </div>
    </AbsoluteFill>
  );
}

