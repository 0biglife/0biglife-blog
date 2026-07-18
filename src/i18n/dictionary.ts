// i18n 사전 — UI 텍스트 전용 (블로그 글 본문은 원문 유지)
// 키는 네임스페이스 점 표기. ko를 원본으로 두고 en/ja는 동일 키셋을 타입으로 강제.

export type Lang = "ko" | "en" | "ja";

export const DEFAULT_LANG: Lang = "ko";

// 헤더 언어 스위처 메뉴에 노출되는 순서/라벨
export const LANGS: ReadonlyArray<{ code: Lang; label: string }> = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
];

const ko = {
  "nav.log": "Log",
  "nav.lab": "Lab",
  "home.featured": "Recently Featured",
  "home.devLogs": "Dev Logs",
  "posts.category": "Category",
  "posts.all": "전체보기",
  "posts.empty": "게시글이 없습니다.",
  "post.toc": "Index",
  "post.updated": "Updated:",
  "log.lastUpdated": "Last updated on",
  "pagination.prev": "이전 페이지",
  "pagination.next": "다음 페이지",
  "notFound.code": "404",
  "notFound.message": "페이지를 찾을 수 없습니다.",
  "notFound.helpBefore": "혹시 문제가 발생하였다면",
  "notFound.helpAfter": "로 이메일로 요청해주세요.",
  "notFound.home": "홈으로 돌아가기",
  "footer.rights": "0biglife. All rights reserved.",
  "code.heading": "코드",
  // 랜딩 히어로 — 커밋 스카이라인
  "hero.eyebrow": "0biglife · 커밋 스카이라인",
  "hero.title": "보이지 않는 것들의 형태",
  "hero.lead":
    "기둥 하나가 무언가를 출시한 하루입니다. 대부분은 당신이 열어볼 수 없는 저장소 안에 있고, 여기엔 그 부피만 남았습니다.",
  "hero.statContrib": "지난 1년 기여",
  "hero.statPrivate": "그중 비공개",
  "hero.commits": "커밋",
  "hero.hover": "하루를 가리켜 보세요",
  "hero.scroll": "스크롤해서 둘러보기",
  "hero.ctaWorks": "인터랙티브 작업 보기",
  // 랜딩 히어로 — 자율주행 퍼셉션 씬
  "scene.eyebrow": "자율주행 인지 · LIVE",
  "scene.title": "자율주행의 데이터를 다룹니다",
  "scene.sub":
    "센서·주행 로그를 쓸 만한 데이터로 만들고, 사람들이 들여다보는 화면을 짓는 데이터 엔지니어예요. 위 화면은 그 데이터를 눈으로 본 모습이고요 — 드래그해서 돌려볼 수 있어요.",
  "scene.ctaWorks": "작업 보기",
  "scene.ctaLinkedin": "LinkedIn",
  "scene.hintOrbit": "드래그 · 궤도   /   스크롤 · 확대",
  "scene.driveHint": "방향키 또는 WASD로 주행",
  "scene.take": "직접 운전하기",
  "scene.exit": "리플레이로 복귀",
  "scene.hudTitle": "인지 스택",
  "scene.modeReplay": "리플레이",
  "scene.modeDrive": "수동 주행",
  "scene.legendCar": "차량",
  "scene.legendTruck": "트럭",
  "scene.legendPed": "보행자",
  "scene.legendCyc": "자전거",
  "scene.a11y":
    "자율주행 라이다 포인트 클라우드 뷰어입니다. 자차를 중심으로 스캔 링과 주변 물체(주황 바운딩 박스)가 실시간으로 표시되고, 오른쪽에는 속도·조향·가속도·인지 지연 같은 차량 텔레메트리 그래프가 실시간으로 그려집니다. 드래그로 시점을 돌릴 수 있습니다.",
  "scene.scrollCue": "실험 보기",
  // 실험 섹션
  "experiments.eyebrow": "실험 · EXPERIMENTS",
  "experiments.title": "작게 만들어보는 자율주행 실험들",
  "experiments.subtitle":
    "인지·센서·계획을 작은 인터랙티브 실험으로 하나씩 풀어봅니다. 카드를 누르면 크게 볼 수 있어요.",
  "experiments.close": "닫기",
} as const;

// ko의 키 집합이 곧 전체 번역 키. en/ja는 이 타입으로 누락/오타가 컴파일 타임에 차단됨.
export type TranslationKey = keyof typeof ko;

const en: Record<TranslationKey, string> = {
  "nav.log": "Log",
  "nav.lab": "Lab",
  "home.featured": "Recently Featured",
  "home.devLogs": "Dev Logs",
  "posts.category": "Category",
  "posts.all": "All",
  "posts.empty": "No posts yet.",
  "post.toc": "Index",
  "post.updated": "Updated:",
  "log.lastUpdated": "Last updated on",
  "pagination.prev": "Previous page",
  "pagination.next": "Next page",
  "notFound.code": "404",
  "notFound.message": "Page not found.",
  "notFound.helpBefore": "If something went wrong, email",
  "notFound.helpAfter": "and let me know.",
  "notFound.home": "Back to home",
  "footer.rights": "0biglife. All rights reserved.",
  "code.heading": "Code",
  "hero.eyebrow": "0biglife · commit skyline",
  "hero.title": "The shape of unseen work",
  "hero.lead":
    "Each pillar is a day I shipped something. Most of it lives in repos you'll never open — what's left here is its volume.",
  "hero.statContrib": "contributions · last year",
  "hero.statPrivate": "of them private",
  "hero.commits": "commits",
  "hero.hover": "point at a day",
  "hero.scroll": "scroll to explore",
  "hero.ctaWorks": "See interactive works",
  "scene.eyebrow": "AUTONOMOUS PERCEPTION · LIVE",
  "scene.title": "I work with autonomous-driving data.",
  "scene.sub":
    "A data engineer turning sensor and driving logs into usable data — and building the screens people look at. Above is what that data looks like. Drag to look around.",
  "scene.ctaWorks": "See works",
  "scene.ctaLinkedin": "LinkedIn",
  "scene.hintOrbit": "drag · orbit   /   scroll · zoom",
  "scene.driveHint": "drive with arrow keys or WASD",
  "scene.take": "Take control",
  "scene.exit": "Back to replay",
  "scene.hudTitle": "perception stack",
  "scene.modeReplay": "replay",
  "scene.modeDrive": "manual",
  "scene.legendCar": "car",
  "scene.legendTruck": "truck",
  "scene.legendPed": "pedestrian",
  "scene.legendCyc": "cyclist",
  "scene.a11y":
    "An autonomous-driving lidar point-cloud viewer. Concentric scan rings and surrounding objects (orange bounding boxes) render live around the ego vehicle, with real-time vehicle telemetry — velocity, steering, acceleration and perception latency — graphed on the right. Drag to orbit the view.",
  "scene.scrollCue": "experiments",
  "experiments.eyebrow": "EXPERIMENTS",
  "experiments.title": "Autonomous-driving experiments, in miniature",
  "experiments.subtitle":
    "Perception, sensors and planning, taken apart into small interactive experiments. Click a card to open it larger.",
  "experiments.close": "Close",
};

const ja: Record<TranslationKey, string> = {
  "nav.log": "Log",
  "nav.lab": "Lab",
  "home.featured": "最近のおすすめ",
  "home.devLogs": "開発ログ",
  "posts.category": "カテゴリー",
  "posts.all": "すべて表示",
  "posts.empty": "投稿がありません。",
  "post.toc": "目次",
  "post.updated": "更新:",
  "log.lastUpdated": "最終更新日",
  "pagination.prev": "前のページ",
  "pagination.next": "次のページ",
  "notFound.code": "404",
  "notFound.message": "ページが見つかりません。",
  "notFound.helpBefore": "問題が発生した場合は",
  "notFound.helpAfter": "までメールでお知らせください。",
  "notFound.home": "ホームに戻る",
  "footer.rights": "0biglife. All rights reserved.",
  "code.heading": "コード",
  "hero.eyebrow": "0biglife · コミットスカイライン",
  "hero.title": "見えない仕事のかたち",
  "hero.lead":
    "柱の一本一本が、何かを世に出した一日です。その多くはあなたが開くことのない非公開リポジトリの中にあり、ここに残るのはその総量だけです。",
  "hero.statContrib": "直近1年の貢献",
  "hero.statPrivate": "うち非公開",
  "hero.commits": "コミット",
  "hero.hover": "ある日を指してみて",
  "hero.scroll": "スクロールして見る",
  "hero.ctaWorks": "インタラクティブ作品を見る",
  "scene.eyebrow": "自動運転パーセプション · LIVE",
  "scene.title": "自動運転のデータを扱います。",
  "scene.sub":
    "センサーや走行ログを使えるデータに整え、人が見る画面をつくるデータエンジニアです。上はそのデータを可視化したもの — ドラッグして見回せます。",
  "scene.ctaWorks": "作品を見る",
  "scene.ctaLinkedin": "LinkedIn",
  "scene.hintOrbit": "ドラッグ · 回転   /   スクロール · ズーム",
  "scene.driveHint": "矢印キーまたはWASDで走行",
  "scene.take": "自分で運転",
  "scene.exit": "リプレイに戻る",
  "scene.hudTitle": "認識スタック",
  "scene.modeReplay": "リプレイ",
  "scene.modeDrive": "手動走行",
  "scene.legendCar": "車両",
  "scene.legendTruck": "トラック",
  "scene.legendPed": "歩行者",
  "scene.legendCyc": "自転車",
  "scene.a11y":
    "自動運転のライダー点群ビューアです。自車を中心にスキャンリングと周囲の物体（オレンジのバウンディングボックス）がリアルタイムに表示され、右側には速度・操舵・加速度・認識遅延などの車両テレメトリがリアルタイムに描画されます。ドラッグで視点を回転できます。",
  "scene.scrollCue": "実験を見る",
  "experiments.eyebrow": "実験 · EXPERIMENTS",
  "experiments.title": "小さくつくる自動運転の実験",
  "experiments.subtitle":
    "認識・センサー・計画を、小さなインタラクティブ実験として一つずつ解いてみます。カードを押すと大きく見られます。",
  "experiments.close": "閉じる",
};

export const dictionary: Record<Lang, Record<TranslationKey, string>> = {
  ko,
  en,
  ja,
};
