import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  random,
} from "remotion";

import PHOTO_FILES from "./photoFiles.json";

const ANIMATION_DURATION = 60; // frames each image takes to fly through
const STAGGER = 2; // frames between each image entering

export const IMAGE_VORTEX_DURATION =
  PHOTO_FILES.length * STAGGER + ANIMATION_DURATION;

type ImageData = {
  file: string;
  startFrame: number;
  offsetX: number; // random lateral drift
  offsetY: number;
};

const IMAGE_DATA: ImageData[] = PHOTO_FILES.map((file, i) => ({
  file,
  startFrame: i * STAGGER,
  offsetX: (random(`vortex-x-${i}`) - 0.5) * 120, // ±60 px base offset
  offsetY: (random(`vortex-y-${i}`) - 0.5) * 90,  // ±45 px base offset
}));

function VortexImage({ data, frame }: { data: ImageData; frame: number }) {
  const localFrame = frame - data.startFrame;

  if (localFrame < 0 || localFrame >= ANIMATION_DURATION) return null;

  // Scale: 0 → 10, accelerating toward the camera
  const scale = interpolate(localFrame, [0, ANIMATION_DURATION], [0, 10], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Opacity: fade in quickly, hold, then fade out before filling the frame
  const opacity = interpolate(
    localFrame,
    [0, 8, ANIMATION_DURATION * 0.45, ANIMATION_DURATION],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // X/Y drift grows with scale to create the spiral vortex feel
  const translateX = data.offsetX * (scale / 2);
  const translateY = data.offsetY * (scale / 2);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 240,
        height: 180,
        transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`,
        opacity,
        borderRadius: 4,
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.8)",
      }}
    >
      {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
      <img
        src={staticFile(`img/HouseGroupPictures/${data.file}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        alt=""
      />
    </div>
  );
}

export function ImageVortex() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps; // used by parent composition

  return (
    <AbsoluteFill
      style={{
        background: "#0a0a14",
        perspective: "800px",
        transformStyle: "preserve-3d",
      }}
    >
      {IMAGE_DATA.map((data) => (
        <VortexImage key={data.file} data={data} frame={frame} />
      ))}
    </AbsoluteFill>
  );
}
