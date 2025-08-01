import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark as DarkCodeStyle } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CopyButton } from "@/components";
import Image from "next/image";
import React from "react";
import { slugify } from "@/lib/utils";
import { DualMedia } from "./DualMedio";

const baseTextStyle = {
  fontSize: "1rem",
  lineHeight: "1.7",
  fontWeight: 600,
};

export const MarkdownRenderer = {
  img: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & { slug?: string }
  ) => {
    const alt = props.alt || "";
    const src = props.src || "";
    const slug = props.slug || "";

    if (typeof src === "string" && src.includes(",")) {
      return <DualMedia src={src} alt={alt} slug={slug} />;
    }

    const isGif = typeof src === "string" && src.endsWith(".gif");
    const isVideo =
      typeof src === "string" &&
      (src.endsWith(".webm") || src.endsWith(".mov") || src.endsWith(".mp4"));

    if (isVideo) {
      return (
        <div
          style={{
            display: "block",
            margin: "1.5rem 0",
            textAlign: "center",
          }}
        >
          <video
            src={src}
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            width={800}
            height={500}
            style={{
              maxWidth: "100%",
              borderRadius: "6px",
              border: "1px solid rgba(128, 128, 128, 0.2)",
              objectFit: "cover",
            }}
          />
          {alt && (
            <div
              style={{
                display: "block",
                fontSize: "0.8rem",
                marginTop: "0.75rem",
                opacity: 0.6,
              }}
            >
              {alt}
            </div>
          )}
        </div>
      );
    }

    if (isGif) {
      return (
        <span
          style={{ display: "block", margin: "1.5rem 0", textAlign: "center" }}
        >
          <Image
            src={src}
            alt={alt}
            width={800}
            height={500}
            style={{
              maxWidth: "100%",
              borderRadius: "6px",
              border: "1px solid rgba(128, 128, 128, 0.2)",
              objectFit: "cover",
            }}
          />
          {alt && (
            <span
              style={{
                display: "block",
                fontSize: "0.8rem",
                marginTop: "0.75rem",
                opacity: 0.6,
              }}
            >
              {alt}
            </span>
          )}
        </span>
      );
    }

    return (
      <span
        style={{
          display: "block",
          margin: "1.5rem 0",
          textAlign: "center",
        }}
      >
        <Image
          alt={alt}
          src={typeof src === "string" ? src : ""}
          width={800}
          height={500}
          style={{
            maxWidth: "100%",
            height: "auto",
            borderRadius: "6px",
            border: "1px solid rgba(128, 128, 128, 0.2)",
            objectFit: "cover",
          }}
        />
        {alt && (
          <span
            style={{
              display: "block",
              fontSize: "0.8rem",
              marginTop: "0.75rem",
              opacity: 0.6,
            }}
          >
            {alt}
          </span>
        )}
      </span>
    );
  },

  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      style={{ fontSize: "2rem", fontWeight: "bold", margin: "2rem 0 1rem" }}
      {...props}
    />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id =
      typeof props.children === "string" ? slugify(props.children) : undefined;

    return (
      <h2
        id={id}
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          margin: "1.5rem 0 1rem",
          marginTop: "3rem",
        }}
        {...props}
      />
    );
  },
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id =
      typeof props.children === "string" ? slugify(props.children) : undefined;

    return (
      <h3
        id={id}
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          margin: "1.25rem 0 0.75rem",
          marginTop: "2rem",
        }}
        {...props}
      />
    );
  },

  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id =
      typeof props.children === "string" ? slugify(props.children) : undefined;

    return (
      <h4
        id={id}
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          margin: "1rem 0 0.75rem",
          marginTop: "2rem",
          marginBottom: "0",
        }}
        {...props}
      />
    );
  },

  // 핵심 수정: p 내부 block 요소 감지 시 div로 변경
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => {
    const children = React.Children.toArray(props.children).map((child) => {
      if (typeof child === "string") {
        return child.replace(/->/g, "→");
      }
      return child;
    });

    const hasBlockLevel = children.some((child) => {
      if (!React.isValidElement(child)) return false;
      const tag = typeof child.type === "string" ? child.type : "";
      return ["div", "pre", "figure", "Image", "video", "img"].includes(tag);
    });

    const Tag = hasBlockLevel ? "div" : "p";

    return (
      <Tag
        style={{ fontSize: "1rem", lineHeight: "1.7", margin: "1rem 0" }}
        {...props}
      >
        {children}
      </Tag>
    );
  },

  Red: (props: React.HTMLAttributes<HTMLElement>) => (
    <span style={{ ...baseTextStyle, color: "#e53e3e" }} {...props} />
  ),
  Blue: (props: React.HTMLAttributes<HTMLElement>) => (
    <span style={{ ...baseTextStyle, color: "#3182ce" }} {...props} />
  ),
  Green: (props: React.HTMLAttributes<HTMLElement>) => (
    <span style={{ ...baseTextStyle, color: "#38a169" }} {...props} />
  ),

  code: ({
    className,
    children,
  }: {
    className?: string;
    children?: React.ReactNode;
  }) => {
    const match = /language-(\w+)/.exec(className || "");

    if (!match) {
      return (
        <code className="inline-code" style={{ fontWeight: 600 }}>
          {children}
        </code>
      );
    }

    return (
      <div style={{ position: "relative", margin: "1.5rem 0" }}>
        <CopyButton content={String(children).trim()} />
        <SyntaxHighlighter
          language={match[1]}
          style={DarkCodeStyle}
          customStyle={{
            padding: "1rem",
            fontSize: "14px",
            borderRadius: "6px",
            backgroundColor: "#0d1117",
            overflowX: "auto",
          }}
          wrapLongLines
          showLineNumbers
        >
          {String(children).trim()}
        </SyntaxHighlighter>
      </div>
    );
  },

  hr: () => (
    <hr
      style={{
        margin: "2rem 0",
        borderColor: "#e2e8f0",
      }}
    />
  ),

  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul style={{ marginLeft: "1.5rem", marginBottom: "1rem" }} {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol style={{ marginLeft: "1.5rem", marginBottom: "1rem" }} {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li style={{ fontSize: "1rem", marginBottom: "0.5rem" }} {...props} />
  ),

  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "#3182ce",
        textDecoration: "underline",
      }}
      {...props}
    />
  ),

  // 테이블
  // MarkdownRenderer 내부
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          minWidth: "600px", // 모바일 대응
          borderCollapse: "collapse",
          margin: "1.5rem 0",
          fontSize: "0.95rem",
          color: "var(--chakra-colors-chakra-body-text)",
        }}
        {...props}
      />
    </div>
  ),

  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead
      style={{
        // backgroundColor: "var(--chakra-colors-gray-100)",
        borderBottom: "2px solid var(--chakra-colors-gray-300)",
      }}
      {...props}
    />
  ),

  tbody: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody {...props} />
  ),

  tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
      style={{
        borderBottom: "1px solid var(--chakra-colors-gray-200)",
      }}
      {...props}
    />
  ),

  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
      style={{
        textAlign: "left",
        padding: "0.75rem 1rem",
        fontWeight: "bold",
        whiteSpace: "nowrap",
        color: "var(--chakra-colors-chakra-body-text)",
      }}
      {...props}
    />
  ),

  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td
      style={{
        padding: "0.75rem 1rem",
        verticalAlign: "top",
        color: "var(--chakra-colors-chakra-body-text)",
      }}
      {...props}
    />
  ),
};
