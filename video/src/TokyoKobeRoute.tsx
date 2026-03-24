import { useEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.REMOTION_MAPBOX_TOKEN as string;

// ── Coordinates ──────────────────────────────────────────────────────────────
const TOKYO: [number, number] = [139.6917, 35.6895];
const KOBE: [number, number] = [135.1955, 34.6901];

// ── Animation timing (seconds) ───────────────────────────────────────────────
// Phase 1 (0 → T1):          Establishing close-up of Tokyo   zoom 11
// Phase 2 (T1 → T2):         Zoom out, centered on Tokyo      zoom 11 → 7
// Phase 3 (T2 → T2+ZOOM_IN): Zoom in as line begins           zoom 7 → 9
// Phase 4 (T2 → T4):         Line draws, camera follows       zoom 9
// Phase 5 (T4 → T_END):      Hold at Kobe                     zoom 9
const T1 = 2;
const T2 = 5;
const ZOOM_IN_DUR = 1.5; // seconds to transition zoom for follow
const T4 = 17;
const T_END = 19;

const ZOOM_CLOSE = 11;
const ZOOM_OUT = 7;
const ZOOM_FOLLOW = 6;

export const TOKYO_KOBE_DURATION = T_END * 24; // 456 frames

const HIDE_FEATURES = [
  "showRoadsAndTransit",
  "showRoads",
  "showTransit",
  "showPedestrianRoads",
  "showRoadLabels",
  "showTransitLabels",
  "showPlaceLabels",
  "showPointOfInterestLabels",
  "showPointsOfInterest",
  "showAdminBoundaries",
  "showLandmarkIcons",
  "showLandmarkIconLabels",
  "show3dObjects",
  "show3dBuildings",
  "show3dTrees",
  "show3dLandmarks",
  "show3dFacades",
];

// ── Composition ──────────────────────────────────────────────────────────────
export function TokyoKobeRoute() {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const { delayRender, continueRender } = useDelayRender();

  const [mapLoadHandle] = useState(() => delayRender("Loading map..."));
  const [map, setMap] = useState<Map | null>(null);

  // ── Initialize the map once ─────────────────────────────────────────────
  useEffect(() => {
    const _map = new Map({
      container: ref.current!,
      zoom: ZOOM_CLOSE,
      center: TOKYO,
      pitch: 0,
      bearing: 0,
      style: "mapbox://styles/mapbox/standard",
      interactive: false,
      fadeDuration: 0,
    });

    _map.on("style.load", () => {
      // Remove all map features for a clean look
      for (const feature of HIDE_FEATURES) {
        _map.setConfigProperty("basemap", feature, false);
      }
      _map.setConfigProperty("basemap", "colorMotorways", "transparent");
      _map.setConfigProperty("basemap", "colorRoads", "transparent");
      _map.setConfigProperty("basemap", "colorTrunks", "transparent");

      // City marker source
      _map.addSource("markers", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { name: "Tokyo" },
              geometry: { type: "Point", coordinates: TOKYO },
            },
            {
              type: "Feature",
              properties: { name: "Kobe" },
              geometry: { type: "Point", coordinates: KOBE },
            },
          ],
        },
      });

      // Route line source — starts as a zero-length stub
      _map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [TOKYO, TOKYO] },
        },
      });

      // Animated head-of-line dot source
      _map.addSource("current-point", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: TOKYO },
        },
      });

      // Route line layer
      _map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#FF4444",
          "line-width": 5,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // City circles
      _map.addLayer({
        id: "city-circles",
        type: "circle",
        source: "markers",
        paint: {
          "circle-radius": 10,
          "circle-color": "#FF4444",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#FFFFFF",
        },
      });

      // City name labels
      _map.addLayer({
        id: "city-labels",
        type: "symbol",
        source: "markers",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-size": 36,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#FFFFFF",
          "text-halo-color": "#000000",
          "text-halo-width": 2,
        },
      });

      // Animated head dot (rendered on top)
      _map.addLayer({
        id: "current-dot",
        type: "circle",
        source: "current-point",
        paint: {
          "circle-radius": 7,
          "circle-color": "#FFFFFF",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FF4444",
        },
      });
    });

    _map.on("load", () => {
      continueRender(mapLoadHandle);
      setMap(_map);
    });
  }, [mapLoadHandle, continueRender]);

  // ── Per-frame animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return;

    const animHandle = delayRender("Animating map frame...");
    const t = frame / fps;

    // Line progress: 0 until T2, draws 0→1 from T2 to T4
    const lineProgress = interpolate(t, [T2, T4], [0, 1], {
      easing: Easing.inOut(Easing.sin),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    // Linear interpolation for the line endpoint (straight on Mercator)
    const currentLng = TOKYO[0] + (KOBE[0] - TOKYO[0]) * lineProgress;
    const currentLat = TOKYO[1] + (KOBE[1] - TOKYO[1]) * lineProgress;

    // Update route line
    const routeSource = map.getSource("route") as mapboxgl.GeoJSONSource;
    if (routeSource) {
      routeSource.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [TOKYO, [currentLng, currentLat]],
        },
      });
    }

    // Update moving dot
    const dotSource = map.getSource("current-point") as mapboxgl.GeoJSONSource;
    if (dotSource) {
      dotSource.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [currentLng, currentLat] },
      });
    }

    // Zoom: close-up → zoom-out → zoom-in for follow → hold
    let zoom: number;
    if (t <= T1) {
      zoom = ZOOM_CLOSE;
    } else if (t <= T2) {
      zoom = interpolate(t, [T1, T2], [ZOOM_CLOSE, ZOOM_OUT], {
        easing: Easing.inOut(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (t <= T2 + ZOOM_IN_DUR) {
      zoom = interpolate(t, [T2, T2 + ZOOM_IN_DUR], [ZOOM_OUT, ZOOM_FOLLOW], {
        easing: Easing.inOut(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else {
      zoom = ZOOM_FOLLOW;
    }

    // Camera center: Tokyo until T2, then follows line endpoint
    let centerLng: number;
    let centerLat: number;
    if (t <= T2) {
      centerLng = TOKYO[0];
      centerLat = TOKYO[1];
    } else {
      centerLng = currentLng;
      centerLat = currentLat;
    }

    map.setZoom(zoom);
    map.setCenter([centerLng, centerLat]);

    map.once("idle", () => continueRender(animHandle));
  }, [frame, fps, map, delayRender, continueRender]);

  const style = useMemo<React.CSSProperties>(
    () => ({ width, height, position: "absolute" }),
    [width, height]
  );

  return <AbsoluteFill ref={ref} style={style} />;
}
