import { MDXRemoteSerializeResult } from "next-mdx-remote";

export type Post = {
  slug: string;
  title: string;
  date: string;
  description: string;
  category: string;
  subcategory: string;
  thumbnail: string;
  tags: string[];
  content: MDXRemoteSerializeResult<
    Record<string, unknown>,
    Record<string, unknown>
  >;
};

export type DevLog = {
  slug: string;
  title: string;
  date: string;
};
