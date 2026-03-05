import "./index.css";
import { Composition } from "remotion";
import { JapanAdventistStats } from "./JapanStats";

// Total: 68 s × 30 fps = 2 040 frames
// Scene1  0–600   (20 s)
// Scene2  540–1200 (22 s, 2 s overlap)
// Scene3  1140–1800 (22 s, 2 s overlap)
// Outro   1740–2040 (10 s, 2 s overlap)

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="JapanAdventistStats"
        component={JapanAdventistStats}
        durationInFrames={68 * 30}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
