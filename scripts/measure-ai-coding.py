#!/usr/bin/env python3
"""
AI 코딩 실측 하네스 v1.

v0 에서 네 개의 지표가 전부 틀렸다. 그 교정 내역을 코드에 남긴다 —
이 프로젝트의 결론은 숫자가 아니라 "순진한 지표는 거짓말을 한다" 쪽이기 때문이다.

  [1] 세션 시간 = last - first  →  34일에 2,324시간(물리 상한 816시간).
      세션을 열어두고 자리를 비운 시간이 전부 들어갔다.
      → 인접 메시지 간격이 IDLE_CAP 을 넘으면 쉬는 시간으로 보고 빼는 '활성 시간'으로 교체.

  [2] 사람이 친 글자 = user 역할 텍스트  →  34일에 330만 자(하루 9.7만 자).
      user 역할에는 사람 타이핑 말고도 스킬 본문(최대 784KB), 컨텍스트 요약,
      task-notification, 서브에이전트 리포트, system-reminder 가 함께 들어온다.
      → 주입 마커로 제외하고, 길이 상한을 넘는 것은 '붙여넣기'로 따로 센다.

  [3] 프로젝트 귀속: cwd 가 ~/projects 루트면 어느 프로젝트인지 알 수 없다. (root)로 분리 표기.

  [4] sdk-cli 진입점(백그라운드 SDK 호출)은 출력 토큰이 0이라 사람의 작업 세션과 섞이면
      '툴 0회 세션 80%' 같은 허수를 만든다. → 진입점으로 분리.
"""
import json, os, glob, collections, datetime, subprocess

ROOT = os.path.expanduser("~/.claude/projects")
PROJ = os.path.expanduser("~/projects")

IDLE_CAP = 15 * 60          # 초. 이보다 긴 침묵은 활성 시간에서 제외
TYPED_MAX = 4000            # 자. 이 이상은 사람 타이핑이 아니라 붙여넣기로 간주

# user 역할로 들어오지만 사람이 친 게 아닌 것들
INJECT = (
    "<system-reminder>", "<task-notification>", "<command-name>",
    "This session is being continued from a previous conversation",
    "Base directory for this skill", "## Synthesis:",
    "Caveat: The messages below were generated",
)

sessions = {}
tool_counts = collections.Counter()
models = collections.Counter()
efforts = collections.Counter()
typed_len_hist = []
paste_chars = 0
inject_chars = 0


def text_of(msg):
    c = msg.get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "".join(b.get("text", "") for b in c
                       if isinstance(b, dict) and b.get("type") == "text")
    return ""


for path in glob.glob(os.path.join(ROOT, "**", "*.jsonl"), recursive=True):
    for line in open(path, errors="replace"):
        line = line.strip()
        if not line:
            continue
        try:
            d = json.loads(line)
        except Exception:
            continue
        if d.get("type") not in ("user", "assistant"):
            continue
        sid = d.get("sessionId") or d.get("session_id")
        if not sid:
            continue

        s = sessions.setdefault(sid, {
            "cwd": d.get("cwd"), "entry": d.get("entrypoint", "cli"),
            "stamps": [], "out": 0, "cache_r": 0, "cache_w": 0, "in": 0,
            "typed_msgs": 0, "typed_chars": 0, "tools": 0, "asst": 0,
            "sidechain_asst": 0,
        })
        if d.get("cwd"):
            s["cwd"] = d["cwd"]
        if d.get("entrypoint"):
            s["entry"] = d["entrypoint"]

        ts = d.get("timestamp")
        if ts:
            s["stamps"].append(ts)

        msg = d.get("message") or {}

        if d.get("type") == "user":
            t = text_of(msg)
            if not t:
                continue
            if any(m in t[:400] for m in INJECT):
                inject_chars += len(t)
            elif len(t) > TYPED_MAX:
                paste_chars += len(t)
            else:
                s["typed_msgs"] += 1
                s["typed_chars"] += len(t)
                typed_len_hist.append(len(t))
        else:
            s["asst"] += 1
            if d.get("isSidechain"):
                s["sidechain_asst"] += 1
            if msg.get("model"):
                models[msg["model"]] += 1
            if d.get("effort"):
                efforts[d["effort"]] += 1
            u = msg.get("usage") or {}
            s["out"] += u.get("output_tokens", 0) or 0
            s["in"] += u.get("input_tokens", 0) or 0
            s["cache_r"] += u.get("cache_read_input_tokens", 0) or 0
            s["cache_w"] += u.get("cache_creation_input_tokens", 0) or 0
            for b in (msg.get("content") or []):
                if isinstance(b, dict) and b.get("type") == "tool_use":
                    tool_counts[b.get("name", "?")] += 1
                    s["tools"] += 1


def active_seconds(stamps):
    """인접 메시지 간격의 합. IDLE_CAP 넘는 침묵은 뺀다."""
    if len(stamps) < 2:
        return 0.0
    xs = sorted(datetime.datetime.fromisoformat(x.replace("Z", "+00:00")) for x in stamps)
    tot = 0.0
    for a, b in zip(xs, xs[1:]):
        gap = (b - a).total_seconds()
        if gap <= IDLE_CAP:
            tot += gap
    return tot


def proj_of(cwd):
    if not cwd:
        return "(unknown)"
    p = os.path.realpath(cwd)
    base = os.path.realpath(PROJ)
    if p == base:
        return "(projects 루트 — 귀속 불가)"
    if p.startswith(base + "/"):
        return p[len(base) + 1:].split("/")[0]
    return os.path.basename(p) or "(unknown)"


cli = {k: v for k, v in sessions.items() if v["entry"] != "sdk-cli" and v["asst"] > 0}
sdk = {k: v for k, v in sessions.items() if v["entry"] == "sdk-cli"}
for v in sessions.values():
    v["active"] = active_seconds(v["stamps"])

days = sorted({min(v["stamps"])[:10] for v in cli.values() if v["stamps"]})
T = lambda f: sum(f(v) for v in cli.values())
out, tools = T(lambda v: v["out"]), T(lambda v: v["tools"])
typed_c, typed_m = T(lambda v: v["typed_chars"]), T(lambda v: v["typed_msgs"])
active_h = T(lambda v: v["active"]) / 3600
cr, cw, ind = T(lambda v: v["cache_r"]), T(lambda v: v["cache_w"]), T(lambda v: v["in"])

P = print
P("=" * 64)
P(f"측정 범위   {days[0]} ~ {days[-1]}  ·  {len(days)}일")
P("=" * 64)
P(f"  대화형 세션(cli)        {len(cli):>7,}")
P(f"  백그라운드(sdk-cli)     {len(sdk):>7,}   ← 사람 작업 아님, 분리")
P(f"  활성 시간               {active_h:>7,.0f}시간   (침묵 {IDLE_CAP//60}분 초과 제외)")
P(f"  하루 평균 활성          {active_h/len(days):>7,.1f}시간")
P()
P("=" * 64)
P("사람이 넣은 것 vs 에이전트가 낸 것")
P("=" * 64)
P(f"  사람이 친 메시지        {typed_m:>10,}개")
P(f"  사람이 친 글자          {typed_c:>10,}자   (하루 {typed_c/len(days):,.0f}자)")
if typed_len_hist:
    h = sorted(typed_len_hist)
    P(f"  메시지 길이 중앙값      {h[len(h)//2]:>10,}자")
P(f"  ├ 붙여넣기로 분류       {paste_chars:>10,}자   ({TYPED_MAX:,}자 초과, 제외)")
P(f"  └ 시스템 주입           {inject_chars:>10,}자   (스킬·요약·알림, 제외)")
P()
P(f"  에이전트 출력 토큰      {out:>10,}")
P(f"  툴 호출                 {tools:>10,}회")
P()
P(f"  ▶ 사람 1자당 에이전트 출력   {out/max(1,typed_c):>8,.1f} 토큰")
P(f"  ▶ 사람 메시지 1개당 툴 호출  {tools/max(1,typed_m):>8,.1f}회")
P(f"  ▶ 활성 1시간당 툴 호출       {tools/max(1,active_h):>8,.1f}회")
P()
P(f"  캐시 적중 비중          {cr/max(1,(cr+cw+ind))*100:>9.1f}%   (읽기 {cr:,} / 생성 {cw:,})")
P()
P("=" * 64)
P("툴 사용 분포 (상위 12)")
P("=" * 64)
mx = max(tool_counts.values()) if tool_counts else 1
for name, n in tool_counts.most_common(12):
    P(f"  {name:<30} {n:>6,}  {'█' * max(1, round(n/mx*30))}")
P()
P("  모델: " + " · ".join(f"{m.replace('claude-','')} {n:,}" for m, n in models.most_common(4)))
if efforts:
    P("  effort: " + " · ".join(f"{k} {v:,}" for k, v in efforts.most_common()))
P()

# ---------- git 산출 ----------
since = days[0]
commits = {}
for name in sorted(os.listdir(PROJ)):
    d = os.path.join(PROJ, name)
    if not os.path.isdir(os.path.join(d, ".git")):
        continue
    try:
        n = int(subprocess.run(["git", "-C", d, "rev-list", "--all", "--count", f"--since={since}"],
                               capture_output=True, text=True, timeout=25).stdout.strip() or 0)
        raw = subprocess.run(["git", "-C", d, "log", "--all", f"--since={since}",
                              "--pretty=tformat:", "--numstat"],
                             capture_output=True, text=True, timeout=40).stdout
        a = sum(int(x.split("\t")[0]) for x in raw.splitlines()
                if len(x.split("\t")) == 3 and x.split("\t")[0].isdigit())
        commits[name] = {"commits": n, "added": a}
    except Exception:
        pass

by_proj = collections.defaultdict(lambda: {"s": 0, "out": 0, "tools": 0, "h": 0.0, "typed": 0})
for v in cli.values():
    k = by_proj[proj_of(v["cwd"])]
    k["s"] += 1; k["out"] += v["out"]; k["tools"] += v["tools"]
    k["h"] += v["active"] / 3600; k["typed"] += v["typed_chars"]

P("=" * 64)
P(f"프로젝트별 투입 대비 산출  (git {since} 이후)")
P("=" * 64)
P(f"  {'프로젝트':<24}{'세션':>4}{'활성h':>7}{'출력토큰':>11}{'커밋':>6}{'추가줄':>9}")
for name, v in sorted(by_proj.items(), key=lambda x: -x[1]["out"])[:12]:
    c = commits.get(name)
    cc = f"{c['commits']:>6}" if c else f"{'-':>6}"
    aa = f"{c['added']:>9,}" if c else f"{'-':>9}"
    P(f"  {name:<24}{v['s']:>4}{v['h']:>7,.1f}{v['out']:>11,}{cc}{aa}")

allc = sum(c["commits"] for c in commits.values())
alla = sum(c["added"] for c in commits.values())
P()
P(f"  기간 내 전체 커밋       {allc:>10,}")
P(f"  기간 내 추가 줄         {alla:>10,}")
if allc:
    P(f"  ▶ 커밋 1건당 출력 토큰       {out/allc:>10,.0f}")
    P(f"  ▶ 커밋 1건당 사람이 친 글자  {typed_c/allc:>10,.0f}자")
    P(f"  ▶ 활성 1시간당 커밋          {allc/max(1,active_h):>10,.2f}건")
P()

work = [v for v in cli.values() if v["tools"] > 2]
P("=" * 64)
P("세션 분포")
P("=" * 64)
P(f"  실작업 세션(툴 3회+)    {len(work):>4} / {len(cli)}  ({len(work)/max(1,len(cli))*100:.0f}%)")
if work:
    ws = sorted(v["out"] for v in work)
    top = sorted(work, key=lambda v: -v["out"])[:max(1, len(work)//10)]
    P(f"  출력 중앙값             {ws[len(ws)//2]:>10,} 토큰")
    P(f"  ▶ 상위 10% 세션이 전체 출력의 {sum(v['out'] for v in top)/max(1,out)*100:.0f}%")
P()

json.dump({
    "span": [days[0], days[-1]], "days": len(days),
    "sessions_cli": len(cli), "sessions_sdk": len(sdk),
    "active_hours": round(active_h, 1),
    "typed_msgs": typed_m, "typed_chars": typed_c,
    "excluded_paste_chars": paste_chars, "excluded_inject_chars": inject_chars,
    "out_tokens": out, "tools": tools,
    "cache_read": cr, "cache_write": cw, "input_new": ind,
    "tool_counts": dict(tool_counts.most_common(30)),
    "models": dict(models), "efforts": dict(efforts),
    "commits": allc, "added_lines": alla,
    "by_project": {k: {kk: (round(vv, 1) if isinstance(vv, float) else vv)
                       for kk, vv in v.items()}
                   for k, v in sorted(by_proj.items(), key=lambda x: -x[1]["out"])[:15]},
    "work_sessions": len(work),
    "method": {
        "idle_cap_sec": IDLE_CAP, "typed_max_chars": TYPED_MAX,
        "excluded": "sdk-cli entrypoint, system injections, pastes over cap",
    },
}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "measure.json"), "w"),
    ensure_ascii=False, indent=1)
P("→ measure.json")
