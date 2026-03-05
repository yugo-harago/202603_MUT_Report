import "./index.css";
import { Composition } from "remotion";
import { JapanAdventistStats } from "./JapanStats";

// Total: 23.5 s × 24 fps = 564 frames
// Matches transcript subtitles 3–10
// Scene1      0–72    (3 s,  subs 3 start)
// Scene2      60–132  (3 s,  subs 3–4)
// Scene3      120–192 (3 s,  subs 4–5)
// TokyoScene  180–564 (16 s, subs 6–10)

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="JapanAdventistStats"
        component={JapanAdventistStats}
        durationInFrames={564}
        fps={24}
        width={1280}
        height={720}
      />
    </>
  );
};
