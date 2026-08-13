"use client";

export default function OgImage() {
  return <meta property="og:image" content={`${window.location.origin}/og.png`} />;
}
