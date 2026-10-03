export type Series = {
  slug: string;
  title: string;
  label: string;
  description: string;
  audience: string;
  prerequisite: string;
};

/** Series metadata lives here; chapter membership and order live in post frontmatter. */
export const SERIES: readonly Series[] = [
  {
    slug: "sensors-coordinates",
    title: "센서와 좌표계 이해하기",
    label: "FOUNDATIONS",
    description: "센서가 기록한 값에 시간과 좌표를 붙여, 같은 장면으로 정렬하는 법.",
    audience: "자율주행 데이터를 처음 다루거나, 센서 정합 문제를 디버깅하는 개발자",
    prerequisite: "기초 벡터·행렬 연산. 좌표 변환은 시리즈 안에서 설명합니다.",
  },
  {
    slug: "perception-prediction",
    title: "인지와 예측 이해하기",
    label: "PERCEPTION",
    description: "점군과 영상이 객체·차선·점유·미래 궤적으로 바뀌는 과정을 읽습니다.",
    audience: "모델의 입출력과 라벨 구조를 이해하려는 데이터·플랫폼 개발자",
    prerequisite: "씬·캘리브레이션·좌표계의 기본 개념. 센서와 좌표계 시리즈를 먼저 권합니다.",
  },
  {
    slug: "driving-validation",
    title: "주행 모델과 검증",
    label: "DRIVING & EVALUATION",
    description: "인지 이후의 판단과 제어, VLA, 시뮬레이션이 검증하는 것과 놓치는 것.",
    audience: "데이터·모델의 변화가 실제 주행에 어떤 영향을 주는지 알고 싶은 개발자",
    prerequisite: "인지와 궤적 예측의 역할. 각 글에서 필요한 앞선 글을 연결합니다.",
  },
  {
    slug: "data-platform",
    title: "자율주행 데이터 플랫폼",
    label: "DATA FLYWHEEL",
    description: "실차의 실패를 다음 학습으로 잇는 구조. 로그·MCAP·카탈로그·학습 I/O까지.",
    audience: "Data Flywheel, Data Portal, Data Pipeline을 설계하고 운영하는 개발자",
    prerequisite: "기본적인 데이터 파이프라인 경험. 첫 글에서 전체 흐름을 잡습니다.",
  },
  {
    slug: "annotation-quality",
    title: "어노테이션과 데이터 품질",
    label: "LABELING & QUALITY",
    description: "라벨의 정의부터 에디터·백엔드·자동 라벨링 루프까지, 정답을 관리하는 법.",
    audience: "어노테이션 도구와 라벨 파이프라인을 만드는 개발자",
    prerequisite: "씬과 좌표계, 3D 박스의 기본 구조. 도구 구현은 에디터부터 순서대로 읽습니다.",
  },
  {
    slug: "visualization",
    title: "시각화와 뷰어 개발",
    label: "VISUALIZATION",
    description: "대용량 주행 데이터를 눈으로 확인하는 도구와 WebGL2 구현의 선택지.",
    audience: "데이터 포털의 재생·디버깅 화면과 3D 뷰어를 만드는 개발자",
    prerequisite: "JavaScript와 3D 좌표계. WebGL 글은 버퍼·셰이더 개념부터 이어집니다.",
  },
];

type Chapter = {
  slug: string;
  series?: string;
  seriesOrder?: number;
};

export function getSeries(slug: string): Series | undefined {
  return SERIES.find(series => series.slug === slug);
}

export function getSeriesPosts<T extends Chapter>(posts: readonly T[], slug: string): T[] {
  return posts.filter(post => post.series === slug).sort((a, b) =>
    (a.seriesOrder ?? Infinity) - (b.seriesOrder ?? Infinity) || a.slug.localeCompare(b.slug)
  );
}

export function getPostSeries<T extends Chapter>(posts: readonly T[], postSlug: string) {
  const post = posts.find(item => item.slug === postSlug);
  const series = post?.series ? getSeries(post.series) : undefined;
  if (!series) return undefined;
  const chapters = getSeriesPosts(posts, series.slug);
  const index = chapters.findIndex(chapter => chapter.slug === postSlug);
  return { series, chapters, index, previous: chapters[index - 1], next: chapters[index + 1] };
}
