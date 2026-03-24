import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const W = 1280;
const H = 720;

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG = "#05050E";
const JAPAN_RED = "#BC002D";
const GOLD = "#FFD700";
const WHITE = "#FFFFFF";

// ─── Timing constants at 24 fps ───────────────────────────────────────────────
// Relative to subtitle 14 start (01:00:40.458)
const f = (s: number) => Math.round(s * 24);

const T = {
  // Phase 1 — house church / small groups / multiplying (subs 14-16)
  P1_START:  f(0),
  GROUPS:    f(2.833),   // sub 15
  MULTIPLY:  f(3.792),   // sub 16

  // Phase 2 — the vision: 30 congregations, hundreds of groups (subs 17-19)
  P2_START:  f(6.083),
  HUNDREDS:  f(9.167),   // sub 18
  TOKYO:     f(11.958),  // sub 19

  // Phase 3 — not addition (subs 20-21)
  P3_START:  f(14.625),
  NOT_BUILD: f(17.583),  // sub 21

  // Phase 4 — multiplication of disciples (subs 22-24)
  P4_START:  f(19.583),
  MUT_TEXT:  f(23.042),  // sub 23
  MULT_DISC: f(24.417),  // sub 24

  END:       f(26.458),
};

// ─── Pre-computed geometry ────────────────────────────────────────────────────

// Phase 1: golden-angle spiral from centre — 55 nodes
const NET_COUNT = 55;
const NET_NODES = Array.from({ length: NET_COUNT }, (_, i) => {
  const angle = ((i * 137.508) % 360) * (Math.PI / 180);
  const radius = i === 0 ? 0 : 28 + Math.sqrt(i) * 52;
  return {
    x: Math.max(80, Math.min(W - 80, W / 2 + Math.cos(angle) * radius)),
    y: Math.max(80, Math.min(H - 80, H / 2 + Math.sin(angle) * radius * 0.68)),
    r: i === 0 ? 8 : 3 + ((i * 31) % 3),
  };
});

// Each node's nearest predecessor (for edge drawing)
const NET_PARENT = NET_NODES.map((n, i) => {
  if (i === 0) return -1;
  let minD = Infinity;
  let near = 0;
  for (let j = 0; j < i; j++) {
    const dx = n.x - NET_NODES[j].x;
    const dy = n.y - NET_NODES[j].y;
    const d = dx * dx + dy * dy;
    if (d < minD) { minD = d; near = j; }
  }
  return near;
});

// Phase 2: 30 congregation nodes, slight right-centre bias (Tokyo region on map)
const CONGREGATION_NODES = Array.from({ length: 30 }, (_, i) => {
  const angle = ((i * 137.508) % 360) * (Math.PI / 180);
  const radius = 45 + ((i * 73 + 11) % 155);
  return {
    x: Math.max(160, Math.min(W - 160, W * 0.56 + Math.cos(angle) * radius * 1.25)),
    y: Math.max(110, Math.min(H - 110, H * 0.50 + Math.sin(angle) * radius * 0.88)),
  };
});

// 5 small-group nodes per congregation
const GROUP_NODES = CONGREGATION_NODES.flatMap((c, ci) =>
  Array.from({ length: 5 }, (_, j) => {
    const angle = (j * 72 + ci * 17) * (Math.PI / 180);
    const r = 28 + ((ci * 7 + j * 11) % 22);
    return {
      x: Math.max(80, Math.min(W - 80, c.x + Math.cos(angle) * r)),
      y: Math.max(80, Math.min(H - 80, c.y + Math.sin(angle) * r)),
      ci,
    };
  })
);

// Phase 4 burst: extra nodes radiating outward for multiplication visual
const BURST_NODES = Array.from({ length: 80 }, (_, i) => {
  const angle = ((i * 97.3) % 360) * (Math.PI / 180);
  const radius = 60 + ((i * 43 + 7) % 280);
  return {
    x: Math.max(40, Math.min(W - 40, W / 2 + Math.cos(angle) * radius)),
    y: Math.max(40, Math.min(H - 40, H / 2 + Math.sin(angle) * radius * 0.72)),
    delay: ((i * 11) % 30), // 0–29 frame stagger
    size: 2 + ((i * 19) % 4),
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function fi(frame: number, start: number, dur = 18): number {
  return clamp01(interpolate(frame, [start, start + dur], [0, 1]));
}

function fio(frame: number, inStart: number, outStart: number, dur = 18): number {
  return clamp01(
    interpolate(frame, [inStart, inStart + dur, outStart, outStart + dur], [0, 1, 1, 0])
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function MissionVision() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Node appearance frames (Phase 1) ──
  // Nodes 0-36: 2.5f stagger, then accelerate at T.MULTIPLY
  const nodeFrame = (i: number) => {
    const BASE = 5;
    if (i <= 36) return BASE + i * 2.5;
    return BASE + 36 * 2.5 + (i - 36) * 1.0;
  };

  // ── Phase 2 stagger ──
  const CONG_STAGGER = 3;
  const CONG_FIRST = T.P2_START + 20;
  const GROUP_AFTER = 20; // frames after congregation, extra per group

  // ── Opacity layers ──
  const sceneOp = interpolate(
    frame,
    [0, 14, T.END - 18, T.END],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const p1NodesOp = interpolate(
    frame,
    [T.P2_START, T.P2_START + 30],
    [1, 0.1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const p2NodesOp = interpolate(
    frame,
    [T.P2_START + 5, T.P2_START + 25, T.P3_START, T.P3_START + 24],
    [0, 1, 1, 0.1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const mapOp = interpolate(
    frame,
    [0, 30, T.P2_START, T.P2_START + 36, T.P3_START, T.P3_START + 30, T.P4_START],
    [0.05, 0.05, 0.05, 0.2, 0.2, 0.06, 0.06],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Phase 1 labels ──
  const houseLabelOp   = fio(frame, T.P1_START + 8,  T.MULTIPLY + 15);
  const groupsLabelOp  = fio(frame, T.GROUPS,         T.P2_START + 10);
  const multiplyLabelOp = fio(frame, T.MULTIPLY,      T.P2_START + 10);

  // ── Phase 2 labels ──
  const visionHeaderOp  = fio(frame, T.P2_START + 10, T.P3_START - 24);
  const congCountOp     = fio(frame, T.HUNDREDS,       T.P3_START - 24);
  const groupsCountOp   = fio(frame, T.TOKYO,          T.P3_START - 24);

  // ── Phase 3 ──
  const plusOp    = fio(frame, T.P3_START,      T.P4_START - 20);
  const strikeP   = clamp01(interpolate(frame, [T.P3_START + 42, T.P3_START + 88], [0, 1]));
  const notAddOp  = fio(frame, T.P3_START + 10, T.P4_START - 20);
  const notBuildOp = fi(frame, T.NOT_BUILD);

  // ── Phase 4 ──
  const multSymbolOp = fi(frame, T.P4_START, 12);
  const multScale    = spring({ frame: frame - T.P4_START, fps, config: { damping: 110, stiffness: 90 } });
  const burstOp      = fi(frame, T.P4_START + 10, 20);
  const goalLineOp   = fi(frame, T.P4_START + 8);
  const mutTextOp    = fi(frame, T.MUT_TEXT);
  const multDiscOp   = fi(frame, T.MULT_DISC);

  return (
    <AbsoluteFill style={{ background: BG, opacity: sceneOp }}>

      {/* ── Japan map (ghost) ─────────────────────────────────────────────── */}
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

      {/* ── Phase 1: Spreading network ────────────────────────────────────── */}
      <svg width={W} height={H} style={{ position: "absolute", opacity: p1NodesOp }}>
        {/* Edges */}
        {NET_NODES.map((n, i) => {
          const parentIdx = NET_PARENT[i];
          if (parentIdx === -1) return null;
          const p = NET_NODES[parentIdx];
          const nf = nodeFrame(i);
          const op = clamp01(interpolate(frame, [nf, nf + 10], [0, 1]));
          if (op === 0) return null;
          return (
            <line
              key={`ne${i}`}
              x1={p.x} y1={p.y} x2={n.x} y2={n.y}
              stroke={WHITE} strokeWidth={0.6} opacity={op * 0.18}
            />
          );
        })}

        {/* Nodes */}
        {NET_NODES.map((n, i) => {
          const nf = nodeFrame(i);
          const op = clamp01(interpolate(frame, [nf, nf + 12], [0, 1]));
          if (op === 0) return null;
          const isCenter = i === 0;
          return (
            <g key={`nn${i}`} transform={`translate(${n.x},${n.y})`} opacity={op}>
              {isCenter && (
                <circle cx={0} cy={0} r={n.r * 3} fill={JAPAN_RED} opacity={0.15} />
              )}
              <circle cx={0} cy={0} r={n.r} fill={isCenter ? JAPAN_RED : WHITE} opacity={0.88} />
            </g>
          );
        })}
      </svg>

      {/* ── Phase 1 labels ───────────────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 54, width: "100%", textAlign: "center", opacity: houseLabelOp }}>
        <span style={{ fontFamily: "sans-serif", fontSize: 11, letterSpacing: 8, textTransform: "uppercase", color: JAPAN_RED, fontWeight: 700 }}>
          House Church Planting Movement
        </span>
      </div>

      <div style={{ position: "absolute", bottom: 80, width: "100%", textAlign: "center" }}>
        <div style={{ opacity: groupsLabelOp, marginBottom: 8 }}>
          <span style={{ fontFamily: "sans-serif", fontSize: 22, letterSpacing: 2, color: WHITE, fontWeight: 300 }}>
            Small Groups Community
          </span>
        </div>
        <div style={{ opacity: multiplyLabelOp }}>
          <span style={{ fontFamily: "sans-serif", fontSize: 14, letterSpacing: 6, textTransform: "uppercase", color: GOLD, fontWeight: 600 }}>
            Multiplying all over the place
          </span>
        </div>
      </div>

      {/* ── Phase 2: Congregation + group nodes ──────────────────────────── */}
      <svg width={W} height={H} style={{ position: "absolute", opacity: p2NodesOp }}>
        {/* Group-to-congregation lines */}
        {CONGREGATION_NODES.map((c, ci) => {
          const cf = CONG_FIRST + ci * CONG_STAGGER;
          const op = clamp01(interpolate(frame, [cf + 8, cf + 20], [0, 1]));
          if (op === 0) return null;
          return GROUP_NODES
            .filter(g => g.ci === ci)
            .map((g, j) => (
              <line
                key={`cgl${ci}_${j}`}
                x1={c.x} y1={c.y} x2={g.x} y2={g.y}
                stroke={WHITE} strokeWidth={0.4} opacity={op * 0.16}
              />
            ));
        })}

        {/* Small group dots */}
        {GROUP_NODES.map((g, i) => {
          const cf = CONG_FIRST + g.ci * CONG_STAGGER;
          const gf = cf + GROUP_AFTER + (i % 5) * 2;
          const op = clamp01(interpolate(frame, [gf, gf + 10], [0, 1]));
          if (op === 0) return null;
          return <circle key={`gn${i}`} cx={g.x} cy={g.y} r={3} fill={WHITE} opacity={op * 0.65} />;
        })}

        {/* Congregation nodes (larger, red, spring pop-in) */}
        {CONGREGATION_NODES.map((c, ci) => {
          const cf = CONG_FIRST + ci * CONG_STAGGER;
          const op = clamp01(interpolate(frame, [cf, cf + 14], [0, 1]));
          if (op === 0) return null;
          const s = Math.min(
            spring({ frame: frame - cf, fps, config: { damping: 180, stiffness: 200 } }),
            1
          );
          return (
            <g key={`cn${ci}`} transform={`translate(${c.x},${c.y})`} opacity={op}>
              <circle cx={0} cy={0} r={12 * s} fill={JAPAN_RED} opacity={0.18} />
              <circle cx={0} cy={0} r={6 * s} fill={JAPAN_RED} />
            </g>
          );
        })}
      </svg>

      {/* ── Phase 2 labels ───────────────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 54, width: "100%", textAlign: "center", opacity: visionHeaderOp }}>
        <span style={{ fontFamily: "sans-serif", fontSize: 11, letterSpacing: 8, textTransform: "uppercase", color: JAPAN_RED, fontWeight: 700 }}>
          The Vision
        </span>
      </div>

      <div style={{ position: "absolute", bottom: 68, width: "100%", textAlign: "center" }}>
        <div style={{ opacity: congCountOp, marginBottom: 6 }}>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 58, fontWeight: 700, color: JAPAN_RED }}>30</span>
          <span style={{ fontFamily: "sans-serif", fontSize: 22, color: WHITE, fontWeight: 300, letterSpacing: 2, marginLeft: 14 }}>Congregations</span>
        </div>
        <div style={{ opacity: groupsCountOp }}>
          <span style={{ fontFamily: "sans-serif", fontSize: 18, color: WHITE, fontWeight: 300, letterSpacing: 2 }}>
            + hundreds of{" "}
            <span style={{ color: GOLD, fontWeight: 600 }}>small groups</span>
            {" "}all over Tokyo
          </span>
        </div>
      </div>

      {/* ── Phase 3: NOT + (crossed out) ─────────────────────────────────── */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: plusOp }}>
        <svg width={220} height={220} viewBox="-110 -110 220 220">
          {/* Vertical bar of + */}
          <rect x="-13" y="-60" width="26" height="120" rx="5" fill={WHITE} opacity={0.8} />
          {/* Horizontal bar of + */}
          <rect x="-60" y="-13" width="120" height="26" rx="5" fill={WHITE} opacity={0.8} />
          {/* Animated strike-through line */}
          <line
            x1={-78 + (1 - strikeP) * 156}
            y1={78 - (1 - strikeP) * 156}
            x2={78}
            y2={-78}
            stroke={JAPAN_RED}
            strokeWidth={10}
            strokeLinecap="round"
            opacity={strikeP}
          />
        </svg>
      </AbsoluteFill>

      {/* Phase 3 text labels */}
      <div style={{ position: "absolute", top: 54, width: "100%", textAlign: "center", opacity: notAddOp }}>
        <span style={{ fontFamily: "sans-serif", fontSize: 13, letterSpacing: 6, textTransform: "uppercase", color: JAPAN_RED, fontWeight: 700 }}>
          Not simply adding
        </span>
      </div>

      <div style={{ position: "absolute", bottom: 80, width: "100%", textAlign: "center", opacity: notAddOp }}>
        <div style={{ opacity: notBuildOp }}>
          <span style={{ fontFamily: "sans-serif", fontSize: 17, color: "#7777a0", letterSpacing: 3 }}>
            Not simply building church buildings
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={{ fontFamily: "sans-serif", fontSize: 14, color: "#44445a", letterSpacing: 5, textTransform: "uppercase" }}>
            Not addition.
          </span>
        </div>
      </div>

      {/* ── Phase 4: × multiplication burst ──────────────────────────────── */}

      {/* Burst nodes radiating from center */}
      <svg width={W} height={H} style={{ position: "absolute", opacity: burstOp }}>
        {BURST_NODES.map((b, i) => {
          const bf = T.P4_START + b.delay;
          const op = clamp01(interpolate(frame, [bf, bf + 14], [0, 1]));
          if (op === 0) return null;
          return (
            <g key={`burst${i}`}>
              <circle cx={b.x} cy={b.y} r={b.size} fill={GOLD} opacity={op * 0.5} />
              <circle cx={b.x} cy={b.y} r={b.size * 0.5} fill={WHITE} opacity={op * 0.7} />
            </g>
          );
        })}
      </svg>

      {/* × symbol */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: multSymbolOp }}>
        <span
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 200,
            fontWeight: 700,
            color: GOLD,
            textShadow: `0 0 50px ${GOLD}99, 0 0 110px ${GOLD}44`,
            transform: `scale(${Math.min(multScale, 1.05)})`,
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          ×
        </span>
      </AbsoluteFill>

      {/* Phase 4 top label */}
      <div style={{ position: "absolute", top: 54, width: "100%", textAlign: "center", opacity: goalLineOp }}>
        <span style={{ fontFamily: "sans-serif", fontSize: 11, letterSpacing: 7, textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>
          The Goal of Mission Unusual Tokyo
        </span>
      </div>

      {/* Phase 4 bottom labels */}
      <div style={{ position: "absolute", bottom: 60, width: "100%", textAlign: "center" }}>
        <div style={{ opacity: mutTextOp, marginBottom: 8 }}>
          <span style={{ fontFamily: "sans-serif", fontSize: 20, color: WHITE, fontWeight: 300, letterSpacing: 5 }}>
            Mission Unusual Tokyo
          </span>
        </div>
        <div style={{ opacity: multDiscOp }}>
          <span
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 38,
              fontWeight: 700,
              color: GOLD,
              letterSpacing: 1,
              textShadow: `0 0 30px ${GOLD}66`,
            }}
          >
            Multiplication of Disciples
          </span>
        </div>
      </div>

    </AbsoluteFill>
  );
}
