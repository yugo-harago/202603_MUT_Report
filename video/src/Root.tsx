import "./index.css";
import { Composition } from "remotion";
import { JapanAdventistStats } from "./JapanStats";
import { TimeWarp } from "./TimeWarp";
import { MissionVision } from "./MissionVision";
import { NetworkChurch } from "./NetworkChurch";
import { HouseGroupPhotos, HOUSE_GROUP_PHOTOS_DURATION } from "./HouseGroupPhotos";
import { TokyoKobeRoute, TOKYO_KOBE_DURATION } from "./TokyoKobeRoute";
import { TrainingEssential, TRAINING_ESSENTIAL_DURATION } from "./TrainingEssential";
import { ImageVortex, IMAGE_VORTEX_DURATION } from "./ImageVortex";

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
      <Composition
        id="TimeWarp"
        component={TimeWarp}
        durationInFrames={120}
        fps={24}
        width={1280}
        height={720}
      />
      <Composition
        id="MissionVision"
        component={MissionVision}
        durationInFrames={636}
        fps={24}
        width={1280}
        height={720}
      />
      <Composition
        id="NetworkChurch"
        component={NetworkChurch}
        durationInFrames={366}
        fps={24}
        width={1280}
        height={720}
      />
      <Composition
        id="HouseGroupPhotos"
        component={HouseGroupPhotos}
        durationInFrames={HOUSE_GROUP_PHOTOS_DURATION}
        fps={24}
        width={1280}
        height={720}
      />
      <Composition
        id="TokyoKobeRoute"
        component={TokyoKobeRoute}
        durationInFrames={TOKYO_KOBE_DURATION}
        fps={24}
        width={1280}
        height={720}
      />
      <Composition
        id="TrainingEssential"
        component={TrainingEssential}
        durationInFrames={TRAINING_ESSENTIAL_DURATION}
        fps={24}
        width={1280}
        height={720}
      />
      <Composition
        id="ImageVortex"
        component={ImageVortex}
        durationInFrames={IMAGE_VORTEX_DURATION}
        fps={24}
        width={1280}
        height={720}
      />
    </>
  );
};
