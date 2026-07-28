import PostList from "./PostList";
import SliderContainer from "./SliderContainer";
import LogContainer from "./LogContainer";
import FilteredPostList from "./FilteredPostList";
// MarkdownRenderer 는 의도적으로 재수출하지 않는다 — 배럴에 두면 "use client"
// 모듈이 이 배럴을 건드릴 때 syntax highlighter 가 클라이언트 번들로 딸려간다.
// 서버 전용 소비처(src/lib/posts.ts)에서 파일 경로로 직접 import 할 것.
import TableOfContents from "./TableOfContents";
import Giscus from "./Giscus";
import { DualMedia } from "./DualMedio";

export {
  Giscus,
  DualMedia,
  PostList,
  SliderContainer,
  LogContainer,
  FilteredPostList,
  TableOfContents,
};
