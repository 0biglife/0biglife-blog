// /lab 에 올릴 모델 목록.
//
// 예전엔 여기에 재질 6종·환경 3종·화면효과 토글과 `?s=` 씬 직렬화까지 들어 있었다.
// 방문자가 조합할 수 있는 경우의 수는 늘었지만 실제로 보는 건 모델 하나였고,
// 이 사이트의 본줄기(자율주행 데이터)와도 멀어졌다. 모델 전환만 남긴다.

export type ModelId = "helmet" | "duck" | "gem";

export const MODELS: { id: ModelId; label: string; url: string }[] = [
  { id: "helmet", label: "HELMET", url: "/models/lab-model.glb" },
  { id: "duck", label: "DUCK", url: "/models/duck.glb" },
  { id: "gem", label: "GEM", url: "" }, // 절차적 생성 — 내려받을 파일 없음
];

export const DEFAULT_MODEL: ModelId = "helmet";

export function modelUrl(id: ModelId): string {
  return MODELS.find((m) => m.id === id)?.url ?? "";
}
