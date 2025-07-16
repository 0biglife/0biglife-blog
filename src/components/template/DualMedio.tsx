"use client";

import Image from "next/image";
import React from "react";

interface DualMediaProps {
  src: string;
  alt?: string;
  slug: string;
}

const isVideo = (file: string) =>
  file.endsWith(".webm") || file.endsWith(".mp4") || file.endsWith(".mov");

export const DualMedia = ({ src, alt, slug }: DualMediaProps) => {
  const [left, right] = src.split(",").map((s) => s.trim());

  const toFullPath = (file: string) =>
    file.startsWith("/") ? file : `/assets/posts/${slug}/${file}`;

  const baseStyle: React.CSSProperties = {
    flex: 1,
    maxWidth: "50%",
    borderRadius: "6px",
    border: "1px solid rgba(128, 128, 128, 0.2)",
    objectFit: "cover",
  };

  return (
    <div style={{ margin: "1.5rem 0" }}>
      <div
        style={{
          display: "flex",
          gap: "4px",
          justifyContent: "center",
          maxWidth: "800px",
          marginInline: "auto",
          textAlign: "center",
        }}
      >
        {[left, right].map((file, idx) =>
          isVideo(file) ? (
            <video
              key={idx}
              src={toFullPath(file)}
              autoPlay
              loop
              muted
              playsInline
              controls={false}
              style={baseStyle}
            />
          ) : (
            <Image
              key={idx}
              src={toFullPath(file)}
              alt={`${alt} ${idx === 0 ? "(좌)" : "(우)"}`}
              width={800}
              height={500}
              style={baseStyle}
            />
          )
        )}
      </div>
      {alt && (
        <div
          style={{
            marginTop: "0.75rem",
            fontSize: "0.8rem",
            opacity: 0.6,
            textAlign: "center",
          }}
        >
          {alt}
        </div>
      )}
    </div>
  );
};
