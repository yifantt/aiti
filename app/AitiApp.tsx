"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scoreAnswers } from "./scoring";
import { DIMENSIONS, type Profile, type ScoreResult, type TestSpec } from "./types";

type Screen = "home" | "test" | "result" | "atlas";

const AI_LABELS: Record<string, { label: string; negative: string; positive: string }> = {
  NV: { label: "模型迁徙", negative: "稳定沿用", positive: "逢新必试" },
  TR: { label: "信任阈值", negative: "先查再说", positive: "先信再说" },
  AG: { label: "控制权", negative: "亲自盯场", positive: "全权委托" },
  ID: { label: "人机边界", negative: "纯工具", positive: "有点像人" },
  IN: { label: "使用强度", negative: "够用就停", positive: "额度榨干" },
};

const imagePath = (profile: Profile) => `/profiles/${profile.image.split("/").pop()?.replace(/\.png$/i, ".jpg")}`;

export default function AitiApp({ profiles, spec }: { profiles: Profile[]; spec: TestSpec }) {
  const initialProfile = typeof window === "undefined" || !window.location.hash.startsWith("#profile=")
    ? null
    : profiles.find((candidate) => candidate.code === decodeURIComponent(window.location.hash.slice(9))) ?? null;
  const [screen, setScreen] = useState<Screen>(initialProfile ? "atlas" : "home");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(initialProfile);
  const [copied, setCopied] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const topRef = useRef<HTMLElement | null>(null);

  const mainProfiles = profiles.filter((profile) => profile.type === "main");
  const specialProfiles = profiles.filter((profile) => profile.type !== "main");
  const question = spec.questions[questionIndex];
  const progress = ((questionIndex + 1) / spec.questions.length) * 100;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen, questionIndex]);

  const goHome = () => {
    setScreen("home");
    setSelectedProfile(null);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const beginTest = () => {
    setAnswers({});
    setResult(null);
    setQuestionIndex(0);
    setScreen("test");
  };

  const chooseAnswer = (optionId: string) => {
    if (isAdvancing) return;
    const nextAnswers = { ...answers, [question.id]: optionId };
    setAnswers(nextAnswers);
    setIsAdvancing(true);
    window.setTimeout(() => {
      if (questionIndex === spec.questions.length - 1) {
        setResult(scoreAnswers(nextAnswers, spec, profiles));
        setScreen("result");
      } else {
        setQuestionIndex((value) => value + 1);
      }
      setIsAdvancing(false);
    }, 220);
  };

  useEffect(() => {
    if (screen !== "test") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < question.options.length) chooseAnswer(question.options[index].id);
      if (event.key === "ArrowLeft" && questionIndex > 0 && !isAdvancing) setQuestionIndex((value) => value - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const openProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    window.history.replaceState(null, "", `#profile=${encodeURIComponent(profile.code)}`);
  };

  const closeProfile = () => {
    setSelectedProfile(null);
    window.history.replaceState(null, "", window.location.pathname);
  };

  return (
    <main ref={topRef} className={`site-shell screen-${screen}`}>
      <Header screen={screen} onHome={goHome} onAtlas={() => setScreen("atlas")} onTest={beginTest} />
      {screen === "home" && <Home profiles={mainProfiles} onStart={beginTest} onAtlas={() => setScreen("atlas")} />}
      {screen === "test" && question && (
        <TestScreen
          question={question}
          index={questionIndex}
          total={spec.questions.length}
          progress={progress}
          selected={answers[question.id]}
          onChoose={chooseAnswer}
          onBack={() => setQuestionIndex((value) => Math.max(0, value - 1))}
        />
      )}
      {screen === "result" && result && (
        <ResultScreen
          result={result}
          profiles={profiles}
          copied={copied}
          onCopy={async () => {
            await copyResult(result);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          }}
          onDownload={() => downloadResultCard(result)}
          onRetake={beginTest}
          onProfile={openProfile}
        />
      )}
      {screen === "atlas" && (
        <Atlas main={mainProfiles} special={specialProfiles} onOpen={openProfile} onStart={beginTest} />
      )}
      {selectedProfile && <ProfileModal profile={selectedProfile} onClose={closeProfile} />}
      <Footer />
    </main>
  );
}

function Header({ screen, onHome, onAtlas, onTest }: { screen: Screen; onHome: () => void; onAtlas: () => void; onTest: () => void }) {
  return (
    <header className="topbar">
      <button className="wordmark" onClick={onHome} aria-label="返回首页">
        <span className="wordmark-main">AITI</span><span className="wordmark-dot">.test</span>
      </button>
      <nav aria-label="主导航">
        <button className={screen === "atlas" ? "active" : ""} onClick={onAtlas}>人格图鉴</button>
        {screen !== "test" && <button className="nav-cta" onClick={onTest}>开始测试 ↗</button>}
      </nav>
    </header>
  );
}

function Home({ profiles, onStart, onAtlas }: { profiles: Profile[]; onStart: () => void; onAtlas: () => void }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">AI INTERACTION TYPE INDICATOR / V1.0</span>
          <h1>你和 AI<br />到底是什么关系？</h1>
          <p className="hero-lede">MBTI 测你是什么人，AITI 测你如何与 AI 相处。24 个真实情境，识别你的 AI 使用人格。</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={onStart}>开始鉴定 <span>→</span></button>
            <button className="text-button" onClick={onAtlas}>先偷看人格图鉴</button>
          </div>
          <div className="hero-meta"><span>24 题</span><span>约 5 分钟</span><span>19 种人格</span></div>
        </div>
        <div className="hero-stack" aria-label="部分 AITI 人格">
          {profiles.slice(0, 5).map((profile, index) => (
            <div className={`stack-card stack-${index}`} key={profile.code}>
              <img src={imagePath(profile)} alt={profile.name} />
              <div><strong>{profile.code}</strong><span>{profile.name}</span></div>
            </div>
          ))}
          <div className="scanline" />
        </div>
      </section>
      <section className="manifesto">
        <span className="section-number">01 / WHAT IS AITI</span>
        <div>
          <h2>不是测你“懂不懂 AI”。<br />是看你在 AI 面前，<em>变成了谁。</em></h2>
          <p>有人额度重置就开蹬，有人每个 Demo 都预言 AGI，有人对模型说谢谢，有人坚持旧窗口比新模型更懂自己。AITI 把这些真实又荒谬的使用习惯，变成一套属于 AI 时代的人格坐标。</p>
        </div>
      </section>
      <section className="trait-strip" aria-label="测试维度">
        {["如何获取信息", "如何做出判断", "如何组织任务", "是否追逐新模型", "把多少控制权交给 AI"].map((item, index) => (
          <div key={item}><span>0{index + 1}</span>{item}</div>
        ))}
      </section>
    </>
  );
}

function TestScreen({ question, index, total, progress, selected, onChoose, onBack }: {
  question: TestSpec["questions"][number]; index: number; total: number; progress: number;
  selected?: string; onChoose: (id: string) => void; onBack: () => void;
}) {
  return (
    <section className="test-wrap">
      <div className="test-progress-row">
        <span>AITI SCAN IN PROGRESS</span><strong>{String(index + 1).padStart(2, "0")} / {total}</strong>
      </div>
      <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
      <div className="question-stage" key={question.id}>
        <span className="question-id">QUESTION {String(index + 1).padStart(2, "0")}</span>
        <h1>{question.text}</h1>
        <div className="options-grid">
          {question.options.map((option, optionIndex) => (
            <button
              key={option.id}
              className={`option-card ${selected === option.id ? "selected" : ""}`}
              onClick={() => onChoose(option.id)}
            >
              <span className="option-key">{optionIndex + 1}</span>
              <span>{option.text}</span>
              <i>↗</i>
            </button>
          ))}
        </div>
      </div>
      <div className="test-footer">
        <button onClick={onBack} disabled={index === 0}>← 上一题</button>
        <span>按数字 1–4 快速选择</span>
      </div>
    </section>
  );
}

function ResultScreen({ result, profiles, copied, onCopy, onDownload, onRetake, onProfile }: {
  result: ScoreResult; profiles: Profile[]; copied: boolean; onCopy: () => void;
  onDownload: () => void; onRetake: () => void; onProfile: (profile: Profile) => void;
}) {
  const aiTraits = useMemo(() => DIMENSIONS.slice(4).map((dimension) => ({
    dimension,
    value: result.normalized[dimension],
    ...AI_LABELS[dimension],
  })), [result]);
  const neighborProfiles = result.ranking.slice(1, 3).map((item) => profiles.find((profile) => profile.code === item.code)).filter(Boolean) as Profile[];
  return (
    <section className="result-wrap">
      <div className="result-kicker">AITI SCAN COMPLETE <span>{result.resultType === "hidden" ? "RARE TYPE UNLOCKED" : "IDENTITY VERIFIED"}</span></div>
      <div className="result-hero">
        <div className="result-portrait">
          <img src={imagePath(result.result)} alt={result.result.name} />
          <span>{result.result.code}</span>
        </div>
        <div className="result-title">
          <span>你的 AI 人格是</span>
          <h1>{result.result.name}</h1>
          <p>“{result.result.tagline}”</p>
          <div className="result-badges">
            <span>MBTI 式偏好 {result.mbti.code}</span>
            {result.matchPercent && <span>匹配度 {result.matchPercent}%</span>}
          </div>
        </div>
      </div>
      <div className="result-grid">
        <article className="result-description">
          <span className="section-label">PROFILE / 人格判词</span>
          <p>{result.result.description}</p>
          <div className="strength-grid">
            <div><span>你比较擅长</span>{result.result.strengths.map((item) => <b key={item}>+ {item}</b>)}</div>
            <div><span>容易踩的坑</span>{result.result.blindSpots.map((item) => <b key={item}>− {item}</b>)}</div>
          </div>
        </article>
        <aside className="result-analysis">
          <span className="section-label">SIGNAL / 为什么是你</span>
          <div className="mbti-code">{result.mbti.preferences.map((item) => <span key={item.dimension}>{item.letter}</span>)}</div>
          {result.mbti.preferences.map((item) => (
            <div className="axis" key={item.dimension}>
              <div><span>{item.dimension === "EI" ? "内向 I" : item.dimension === "SN" ? "具体 S" : item.dimension === "TF" ? "逻辑 T" : "计划 J"}</span><span>{item.dimension === "EI" ? "外向 E" : item.dimension === "SN" ? "可能 N" : item.dimension === "TF" ? "感受 F" : "即兴 P"}</span></div>
              <i><b style={{ left: `${50 + item.score * 50}%` }} /></i>
            </div>
          ))}
          <div className="ai-traits">
            {aiTraits.map((trait) => (
              <div key={trait.dimension}><span>{trait.label}</span><strong>{trait.value >= 0 ? trait.positive : trait.negative}</strong></div>
            ))}
          </div>
        </aside>
      </div>
      <div className="result-actions">
        <button className="primary-button" onClick={onDownload}>下载结果卡 ↓</button>
        <button className="secondary-button" onClick={onCopy}>{copied ? "已复制 ✓" : "复制分享文案"}</button>
        <button className="text-button" onClick={onRetake}>重新测试</button>
      </div>
      {neighborProfiles.length > 0 && (
        <div className="neighbors">
          <span className="section-label">NEARBY / 你的相邻人格</span>
          <div>{neighborProfiles.map((profile) => <ProfileMini key={profile.code} profile={profile} onClick={() => onProfile(profile)} />)}</div>
        </div>
      )}
    </section>
  );
}

function Atlas({ main, special, onOpen, onStart }: { main: Profile[]; special: Profile[]; onOpen: (profile: Profile) => void; onStart: () => void }) {
  return (
    <section className="atlas-wrap">
      <div className="atlas-heading">
        <div><span className="eyebrow">AITI PERSONALITY INDEX</span><h1>人格图鉴</h1></div>
        <p>15 种常规人格，3 个隐藏彩蛋，以及一个系统实在看不懂你的结果。</p>
        <button className="primary-button" onClick={onStart}>测测我是哪种 →</button>
      </div>
      <div className="atlas-section-title"><span>MAIN TYPES</span><strong>常规人格 / 15</strong></div>
      <div className="atlas-grid">
        {main.map((profile, index) => <ProfileCard key={profile.code} profile={profile} index={index} onClick={() => onOpen(profile)} />)}
      </div>
      <div className="atlas-section-title special-title"><span>UNSTABLE SIGNALS</span><strong>隐藏与稀有结果 / 04</strong></div>
      <div className="atlas-grid special-grid">
        {special.map((profile, index) => <ProfileCard key={profile.code} profile={profile} index={index} onClick={() => onOpen(profile)} />)}
      </div>
    </section>
  );
}

function ProfileCard({ profile, index, onClick }: { profile: Profile; index: number; onClick: () => void }) {
  return (
    <button className="profile-card" onClick={onClick}>
      <div className="profile-image"><img src={imagePath(profile)} alt="" /><span>{String(index + 1).padStart(2, "0")}</span></div>
      <div className="profile-copy"><span>{profile.code} · {profile.mbtiAnalogy}</span><h2>{profile.name}</h2><p>{profile.tagline}</p><i>查看档案 ↗</i></div>
    </button>
  );
}

function ProfileMini({ profile, onClick }: { profile: Profile; onClick: () => void }) {
  return <button className="profile-mini" onClick={onClick}><img src={imagePath(profile)} alt="" /><span><b>{profile.name}</b><small>{profile.tagline}</small></span><i>↗</i></button>;
}

function ProfileModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <article className="profile-modal" role="dialog" aria-modal="true" aria-label={`${profile.name}档案`}>
        <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        <img src={imagePath(profile)} alt={profile.name} />
        <div>
          <span className="eyebrow">{profile.code} / {profile.type.toUpperCase()}</span>
          <h1>{profile.name}</h1>
          <h2>{profile.tagline}</h2>
          <span className="modal-mbti">MBTI 式偏好近似：{profile.mbtiAnalogy}</span>
          <p>{profile.description}</p>
          <div className="modal-lists">
            <div><span>你比较擅长</span>{profile.strengths.map((item) => <b key={item}>+ {item}</b>)}</div>
            <div><span>容易踩的坑</span>{profile.blindSpots.map((item) => <b key={item}>− {item}</b>)}</div>
          </div>
        </div>
      </article>
    </div>
  );
}

function Footer() {
  return <footer><span>AITI © 2026</span><p>互联网娱乐型自我观察测试。不是心理诊断，也别拿去招聘。</p><span>MADE WITH TOO MANY TOKENS</span></footer>;
}

async function copyResult(result: ScoreResult) {
  const text = `我的 AITI 人格是「${result.result.name}」${result.matchPercent ? `，匹配度 ${result.matchPercent}%` : ""}。\n${result.result.tagline}\nMBTI 式偏好：${result.mbti.code}\n你和 AI 到底是什么关系？来测 AITI：${window.location.origin}`;
  await navigator.clipboard.writeText(text);
}

function downloadResultCard(result: ScoreResult) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#f0ff3d";
  ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = "#11110f";
  ctx.fillRect(56, 56, 968, 968);
  const image = new Image();
  image.onload = () => {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 620, 105, 350, 350);
    ctx.fillStyle = "#f0ff3d";
    ctx.font = "700 28px monospace";
    ctx.fillText("AITI / AI INTERACTION TYPE", 105, 130);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 112px Arial, sans-serif";
    ctx.fillText(result.result.name, 100, 350);
    ctx.fillStyle = "#a7a7a0";
    ctx.font = "32px Arial, sans-serif";
    wrapText(ctx, result.result.tagline, 105, 450, 480, 46);
    ctx.strokeStyle = "#45453e";
    ctx.beginPath(); ctx.moveTo(105, 605); ctx.lineTo(975, 605); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 30px monospace";
    ctx.fillText(`TYPE  ${result.result.code}`, 105, 675);
    ctx.fillText(`MBTI  ${result.mbti.code}`, 105, 730);
    if (result.matchPercent) ctx.fillText(`MATCH ${result.matchPercent}%`, 105, 785);
    ctx.fillStyle = "#f0ff3d";
    ctx.font = "700 24px monospace";
    ctx.fillText("你和 AI 到底是什么关系？", 105, 948);
    const link = document.createElement("a");
    link.download = `AITI-${result.result.code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  image.src = imagePath(result.result);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number) {
  let line = "";
  for (const character of text) {
    if (ctx.measureText(line + character).width > width) {
      ctx.fillText(line, x, y);
      line = character;
      y += lineHeight;
    } else line += character;
  }
  if (line) ctx.fillText(line, x, y);
}
