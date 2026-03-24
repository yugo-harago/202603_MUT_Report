import { useState, useEffect } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
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

const PHOTO_FILES = [
  "1704520325791.jpg",
  "1712476093407.jpg",
  "1713009269224.jpg",
  "1713009278051.jpg",
  "1713017120174.jpg",
  "1716618248416.jpg",
  "1718942316691.jpg",
  "1719064184953.jpg",
  "1723630134209.jpg",
  "1734167115464.jpg",
  "1738157453771.jpg",
  "1738472500681.jpg",
  "1749364405147.jpg",
  "1760044308203-0.jpg",
  "1765791957460.jpg",
  "1765791961369.jpg",
  "1765791963769.jpg",
  "1765802127247.jpg",
  "640849261_1639611160569892_9034527185628649193_n.jpg",
  "642086702_1249096547188816_6468049546870117497_n.jpg",
  "IMG-20251213-WA0002.jpg",
  "IMG_0022_original.JPG",
  "IMG_5033.JPG",
  "PXL_20250727_070508425.jpg",
  "PXL_20251108_075145285.MP.jpg",
  "PXL_20251213_051619949.jpg",
  "S__83468291_0.jpg",
  "S__83468293_0.jpg",
  "S__83468294_0.jpg",
  "S__83468295_0.jpg",
  "S__83468296_0.jpg",
  "S__83468298_0.jpg",
  "S__83468301_0.jpg",
  "S__83468302_0.jpg",
  "S__83468303_0.jpg",
  "S__83468304_0.jpg",
  "S__83468305_0.jpg",
  "S__83468307_0.jpg",
  "S__83468309_0.jpg",
  "S__83468310_0.jpg",
  "S__83468311_0.jpg",
  "S__83468312_0.jpg",
  "S__83468313_0.jpg",
  "S__83468314_0.jpg",
  "S__83468320_0.jpg",
  "S__83468321_0.jpg",
  "S__83468322_0.jpg",
  "S__83468325_0.jpg",
  "S__83468337_0.jpg",
  "S__83468338_0.jpg",
  "S__83468339_0.jpg",
  "S__83468353_0.jpg",
  "S__83468354_0.jpg",
  "S__83468355.jpg",
  "S__83468356.jpg",
  "S__83468357.jpg",
  "S__83468360.jpg",
  "S__83468361.jpg",
  "S__83468364.jpg",
  "S__83468367.jpg",
  "S__83468369.jpg",
  "S__83468371.jpg",
  "S__83468372.jpg",
  "S__83468378.jpg",
];


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
      {/* Plain <img> — all images are preloaded by the parent before rendering */}
      <img
        src={staticFile(`img/HouseGroupPictures/Thumbnails/${p.file}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

export function HouseGroupPhotos() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Preload all images once before any frame is captured.
  // A single delayRender handle blocks the renderer until every image is in
  // the browser cache, so individual <img> tags never block per-frame.
  const [handle] = useState(() =>
    delayRender("Preloading house-group photos", {
      timeoutInMilliseconds: 120_000,
    })
  );

  useEffect(() => {
    Promise.all(
      PHOTO_FILES.map(
        (file) =>
          new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // skip broken files, don't stall
            img.src = staticFile(`img/HouseGroupPictures/Thumbnails/${file}`);
          })
      )
    ).then(() => continueRender(handle));
  }, [handle]);

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
