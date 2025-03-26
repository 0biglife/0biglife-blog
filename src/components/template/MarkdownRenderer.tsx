import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark as DarkCodeStyle } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CopyButton } from "@/components";
import Image from "next/image";
import React from "react";
import { slugify } from "@/lib/utils";

export const MarkdownRenderer = {
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const alt = props.alt || "image";
    const src = props.src || "";

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
          src={src}
          width={800}
          height={0}
          style={{
            maxWidth: "100%",
            height: "auto",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
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
          marginTop: "2rem",
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
        }}
        {...props}
      />
    );
  },

  // ✅ 핵심 수정: p 내부 block 요소 감지 시 div로 변경
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => {
    const children = React.Children.toArray(props.children);

    const hasBlockLevel = children.some((child) => {
      if (!React.isValidElement(child)) return false;

      const tag = typeof child.type === "string" ? child.type : "";

      // Image 컴포넌트도 block처럼 처리
      return ["div", "pre", "figure", "Image"].includes(tag);
    });

    const Tag = hasBlockLevel ? "div" : "p";

    return (
      <Tag
        style={{ fontSize: "1rem", lineHeight: "1.7", margin: "1rem 0" }}
        {...props}
      />
    );
  },

  gray: (props: React.HTMLAttributes<HTMLElement>) => (
    <span style={{ color: "#718096" }} {...props} />
  ),
  red: (props: React.HTMLAttributes<HTMLElement>) => (
    <span style={{ color: "#e53e3e" }} {...props} />
  ),

  inlineCode: ({ children }: { children?: React.ReactNode }) => (
    <code
      style={{
        background: "#e2e8f0",
        padding: "2px 6px",
        borderRadius: "4px",
        fontSize: "0.875rem",
        fontFamily: "monospace",
      }}
    >
      {children}
    </code>
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
      return <code>{children}</code>;
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
            backgroundColor: "#1e1e1e",
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

  hr: () => <hr style={{ margin: "2rem 0", borderColor: "#e2e8f0" }} />,

  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul style={{ marginLeft: "1.5rem", marginBottom: "1rem" }} {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol style={{ marginLeft: "1.5rem", marginBottom: "1rem" }} {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li style={{ fontSize: "1rem", marginBottom: "0.5rem" }} {...props} />
  ),

  // blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
  //   <blockquote
  //     style={{
  //       borderLeft: "4px solid #cbd5e0",
  //       paddingLeft: "1rem",
  //       margin: "1rem 0",
  //       fontStyle: "italic",
  //       background: "#f7fafc",
  //       color: "#4a5568",
  //     }}
  //     {...props}
  //   />
  // ),

  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      style={{
        color: "#3182ce",
        textDecoration: "underline",
      }}
      {...props}
    />
  ),
};
