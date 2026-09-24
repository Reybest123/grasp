// The home-screen icon for iPhones and iPads, which ignore the SVG favicon.
// Full-bleed with no rounded corners: iOS applies its own mask.

import { ImageResponse } from "next/og";
import { Mark, TILE_BACKGROUND } from "@/components/ShareImage";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: TILE_BACKGROUND,
        }}
      >
        <Mark size={112} color="#0b2340" />
      </div>
    ),
    size,
  );
}
