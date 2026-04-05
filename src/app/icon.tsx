import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 172,
          fontWeight: 800,
          fontFamily: "Inter, Arial, sans-serif",
          borderRadius: 110,
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
