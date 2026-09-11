import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "K歌 +1",
    short_name: "K歌+1",
    description: "一個人想唱 KTV？找另一個一個人，兩個人剛剛好。",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ee",
    theme_color: "#7c3aed",
    lang: "zh-Hant",
    icons: [
      { src: "/icon.jpg", sizes: "512x512", type: "image/jpeg", purpose: "any" },
      { src: "/brand/ktv-plus-1.jpg", sizes: "1024x1024", type: "image/jpeg", purpose: "any" },
    ],
  };
}
