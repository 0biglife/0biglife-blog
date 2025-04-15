import { ReactNode } from "react";

export type Post = {
  slug: string;
  title: string;
  date: string;
  description: string;
  category: string;
  subcategory: string;
  thumbnail: string;
  tags: string[];
  content: ReactNode;
  toc?: TOCItem[];
};

export type DevLog = {
  slug: string;
  title: string;
  date: string;
  content: ReactNode;
  toc?: TOCItem[];
};

export type TOCItem = {
  id: string;
  text: string;
  level: number;
};
