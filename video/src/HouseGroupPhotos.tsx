import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  random,
} from "remotion";

const W = 1280;
const H = 720;
const STAGGER = 5; // frames between each photo drop

import PHOTO_FILES from "./photoFiles.json";


type PhotoData = {
  file: string;
  finalLeft: number;
  finalTop: number;
  rotation: number;
  width: number;
  height: number;
  startFrame: number;
};

const PHOTO_DATA: PhotoData[] = PHOTO_FILES.map((file, i) => {
  const width = 160 + random(`width-${i}`) * 120; // 160–280px wide
  const height = width * (0.65 + random(`height-${i}`) * 0.35); // varied aspect ratio

  // Ensure at least 50% of the photo is visible on screen
  const minLeft = -width / 2;
  const maxLeft = W - width / 2;
  const finalLeft = minLeft + random(`left-${i}`) * (maxLeft - minLeft);

  const minTop = -height / 2;
  const maxTop = H - height / 2;
  const finalTop = minTop + random(`top-${i}`) * (maxTop - minTop);

  const rotation = (random(`rotation-${i}`) - 0.5) * 40; // -20 to +20 degrees

  return {
    file,
    finalLeft,
    finalTop,
    rotation,
    width,
    height,
    startFrame: i * STAGGER,
  };
});

export const HOUSE_GROUP_PHOTOS_DURATION =
  PHOTO_FILES.length * STAGGER + 60; // 64×5 + 60 = 380 frames ≈ 15.8 s

function Photo({
  p,
  frame,
  fps,
}: {
  p: PhotoData;
  frame: number;
  fps: number;
}) {
  const localFrame = frame - p.startFrame;

  // Drop distance: start just above the top edge regardless of finalTop
  const dropFrom = -(p.finalTop + p.height + 80);

  const translateY = spring({
    frame: localFrame,
    fps,
    from: dropFrom,
    to: 0,
    config: { damping: 20, stiffness: 120, mass: 1 },
  });

  const opacity = interpolate(localFrame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: p.finalLeft,
        top: p.finalTop,
        width: p.width,
        height: p.height,
        transform: `translateY(${translateY}px) rotate(${p.rotation}deg)`,
        opacity,
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: "0 6px 28px rgba(0,0,0,0.75)",
      }}
    >
      {/* Images are preloaded upfront, so plain img tag is safe here */}
      {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
      <img
        src={staticFile(`img/HouseGroupPictures/${p.file}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        alt=""
      />
    </div>
  );
}

export function HouseGroupPhotos() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: "#12121f" }}>
      {PHOTO_DATA.map((p) =>
        frame < p.startFrame ? null : (
          <Photo key={p.file} p={p} frame={frame} fps={fps} />
        )
      )}
    </AbsoluteFill>
  );
}
