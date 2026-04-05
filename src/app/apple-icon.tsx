import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

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
          background:
            "linear-gradient(145deg, #075985 0%, #0369a1 36%, #0284c7 72%, #0ea5e9 100%)",
          color: "white",
          fontSize: 64,
          fontWeight: 800,
          fontFamily: "Inter, Arial, sans-serif",
          borderRadius: 40,
        }}
      >
        NS
      </div>
    ),
    {
      ...size,
    }
  );
}
