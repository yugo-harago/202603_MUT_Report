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

// Timing relative to sub 96 start (01:04:35.208), 24 fps
const f = (s: number) => Math.round(s * 24);

const T = {
  ICON:    f(0.4),
  HEADER:  f(0.5),
  MEMBERS: f(1.792), // sub 97: "Japan, training of both church members"
  PASTORS: f(4.375), // sub 98: "and pastors is essential."
  END:     f(6.542),
};

export const TRAINING_ESSENTIAL_DURATION = T.END + 10; // 167 frames

function c01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

const MEMBER_DX = [-60, -30, 0, 30, 60];

// Key coordinates
const CROSS_X = 640;
const CROSS_Y = 210;
const MEM_X = 300;
const MEM_Y = 440;
const PAS_X = 980;
const PAS_Y = 440;
const CROSS_BOTTOM_Y = CROSS_Y + 70;

export function TrainingEssential() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOp = interpolate(frame, [0, 14, T.END - 12, T.END], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  function fi(start: number, dur = 16): number {
    return c01(interpolate(frame, [start, start + dur], [0, 1]));
  }

  const crossScale   = Math.min(spring({ frame: frame - T.ICON,              fps, config: { damping: 180, stiffness: 160 } }), 1);
  const membersScale = Math.min(spring({ frame: frame - T.MEMBERS,           fps, config: { damping: 180, stiffness: 160 } }), 1);
  const pastorsScale = Math.min(spring({ frame: frame - T.PASTORS,           fps, config: { damping: 180, stiffness: 160 } }), 1);
  const essentialScale = Math.min(spring({ frame: frame - (T.PASTORS + 12), fps, config: { damping: 160, stiffness: 200 } }), 1.02);

  const headerOp      = fi(T.HEADER);
  const membersOp     = fi(T.MEMBERS);
  const pastorsOp     = fi(T.PASTORS);
  const memberLabelOp = fi(T.MEMBERS + 10);
  const pastorLabelOp = fi(T.PASTORS + 10);
  const essentialOp   = fi(T.PASTORS + 12, 14);

  // Dashed lines draw progressively from icons toward the cross
  const membersLineP = c01(interpolate(frame, [T.MEMBERS + 6, T.MEMBERS + 28], [0, 1]));
  const pastorsLineP = c01(interpolate(frame, [T.PASTORS  + 6, T.PASTORS  + 26], [0, 1]));

  return (
    <AbsoluteFill style={{ background: BG, opacity: sceneOp }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>

        {/* Dashed line: church members → cross */}
        <line
          x1={MEM_X}
          y1={MEM_Y - 40}
          x2={MEM_X + (CROSS_X - MEM_X) * membersLineP}
          y2={(MEM_Y - 40) + (CROSS_BOTTOM_Y - (MEM_Y - 40)) * membersLineP}
          stroke={WHITE}
          strokeWidth={1.2}
          strokeDasharray="6 5"
          opacity={0.2 * membersLineP}
        />

        {/* Dashed line: pastors → cross */}
        <line
          x1={PAS_X}
          y1={PAS_Y - 40}
          x2={PAS_X + (CROSS_X - PAS_X) * pastorsLineP}
          y2={(PAS_Y - 40) + (CROSS_BOTTOM_Y - (PAS_Y - 40)) * pastorsLineP}
          stroke={GOLD}
          strokeWidth={1.2}
          strokeDasharray="6 5"
          opacity={0.25 * pastorsLineP}
        />

        {/* Church planting cross */}
        <g transform={`translate(${CROSS_X}, ${CROSS_Y}) scale(${crossScale})`}>
          <circle cx={0} cy={0} r={88} fill={JAPAN_RED} opacity={0.06} />
          <circle cx={0} cy={0} r={58} fill={JAPAN_RED} opacity={0.06} />
          {/* Vertical beam */}
          <rect x={-10} y={-60} width={20} height={120} rx={6} fill={JAPAN_RED} />
          {/* Horizontal beam */}
          <rect x={-46} y={-30} width={92} height={20} rx={6} fill={JAPAN_RED} />
          {/* Shine */}
          <rect x={-4} y={-60} width={5} height={120} rx={3} fill={WHITE} opacity={0.09} />
          {/* Center gem */}
          <circle cx={0} cy={0} r={8} fill={GOLD} />
        </g>

        {/* Church Members: 5 person silhouettes */}
        <g opacity={membersOp} transform={`translate(${MEM_X}, ${MEM_Y}) scale(${membersScale})`}>
          {MEMBER_DX.map((dx, i) => {
            const center = i === 2;
            const r  = center ? 10 : 7.5;
            const bw = center ? 16 : 12;
            const bh = center ? 22 : 17;
            return (
              <g key={i} transform={`translate(${dx}, 0)`} opacity={center ? 1 : 0.72}>
                <circle cx={0} cy={-(bh / 2 + r + 1)} r={r} fill={WHITE} />
                <rect x={-bw / 2} y={-bh / 2} width={bw} height={bh} rx={4} fill={WHITE} />
              </g>
            );
          })}
        </g>

        {/* Pastors: 2 person silhouettes with small cross above each */}
        <g opacity={pastorsOp} transform={`translate(${PAS_X}, ${PAS_Y}) scale(${pastorsScale})`}>
          {[-34, 34].map((dx, i) => (
            <g key={i} transform={`translate(${dx}, 0)`}>
              {/* Cross above */}
              <rect x={-4} y={-66} width={8}  height={24} rx={2.5} fill={GOLD} />
              <rect x={-12} y={-56} width={24} height={8}  rx={2.5} fill={GOLD} />
              {/* Head */}
              <circle cx={0} cy={-27} r={10} fill={GOLD} />
              {/* Body */}
              <rect x={-8} y={-16} width={16} height={20} rx={4} fill={GOLD} />
            </g>
          ))}
        </g>

      </svg>

      {/* Top header */}
      <div
        style={{
          position: "absolute",
          top: 44,
          width: "100%",
          textAlign: "center",
          opacity: headerOp,
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 11,
            letterSpacing: 7,
            textTransform: "uppercase",
            color: JAPAN_RED,
            fontWeight: 700,
          }}
        >
          To advance the church planting work in Japan
        </span>
      </div>

      {/* "Church Members" label */}
      <div
        style={{
          position: "absolute",
          top: 516,
          left: MEM_X - 120,
          width: 240,
          textAlign: "center",
          opacity: memberLabelOp,
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 12,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: WHITE,
            fontWeight: 600,
          }}
        >
          Church Members
        </span>
      </div>

      {/* "Pastors" label */}
      <div
        style={{
          position: "absolute",
          top: 516,
          left: PAS_X - 90,
          width: 180,
          textAlign: "center",
          opacity: pastorLabelOp,
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 12,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: GOLD,
            fontWeight: 700,
          }}
        >
          Pastors
        </span>
      </div>

      {/* "Training is Essential" */}
      <div
        style={{
          position: "absolute",
          bottom: 44,
          width: "100%",
          textAlign: "center",
          opacity: essentialOp,
          transform: `scale(${essentialScale})`,
          transformOrigin: "center",
        }}
      >
        <span
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 46,
            fontWeight: 700,
            color: GOLD,
            letterSpacing: 3,
            textShadow: `0 0 40px ${GOLD}55`,
          }}
        >
          Training is Essential
        </span>
      </div>

    </AbsoluteFill>
  );
}
