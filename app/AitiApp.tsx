"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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

const imagePath = (profile: Profile) => `${import.meta.env.BASE_URL}profiles/${profile.image.split("/").pop()?.replace(/\.png$/i, ".jpg")}`;
const subscribeToHash = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
const getHash = () => window.location.hash;
const getServerHash = () => "";

export default function AitiApp({ profiles, spec }: { profiles: Profile[]; spec: TestSpec }) {
  const hash = useSyncExternalStore(subscribeToHash, getHash, getServerHash);
  const [screen, setScreen] = useState<Screen>("home");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const topRef = useRef<HTMLElement | null>(null);

  const mainProfiles = profiles.filter((profile) => profile.type === "main");
  const specialProfiles = profiles.filter((profile) => profile.type !== "main");
  const question = spec.questions[questionIndex];
  const progress = ((questionIndex + 1) / spec.questions.length) * 100;
  const linkedProfile = hash.startsWith("#profile=")
    ? profiles.find((candidate) => candidate.code === decodeURIComponent(hash.slice(9))) ?? null
    : null;
  const activeProfile = selectedProfile ?? linkedProfile;
  const activeScreen: Screen = linkedProfile && screen === "home" ? "atlas" : screen;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen, questionIndex]);

  const goHome = () => {
    setScreen("home");
    setSelectedProfile(null);
    window.history.replaceState(null, "", window.location.pathname);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const beginTest = () => {
    setAnswers({});
    setResult(null);
    setSelectedProfile(null);
    setQuestionIndex(0);
    setScreen("test");
    window.history.replaceState(null, "", window.location.pathname);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
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
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const closeProfile = () => {
    setSelectedProfile(null);
    window.history.replaceState(null, "", window.location.pathname);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  return (
    <main ref={topRef} className={`site-shell screen-${activeScreen}`}>
      <Header screen={activeScreen} onHome={goHome} onAtlas={() => setScreen("atlas")} />
      {activeScreen === "home" && <Home profiles={mainProfiles} onStart={beginTest} />}
      {activeScreen === "test" && question && (
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
      {activeScreen === "result" && result && (
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
      {activeScreen === "atlas" && (
        <Atlas main={mainProfiles} special={specialProfiles} onOpen={openProfile} onStart={beginTest} />
      )}
      {activeProfile && <ProfileModal profile={activeProfile} onClose={closeProfile} />}
      <Footer />
    </main>
  );
}

function Header({ screen, onHome, onAtlas }: { screen: Screen; onHome: () => void; onAtlas: () => void }) {
  return (
    <header className="topbar">
      <button className="wordmark" onClick={onHome} aria-label="返回首页">
        <span className="wordmark-main">AITI</span><span className="wordmark-dot">.test</span>
      </button>
      <nav aria-label="主导航">
        <button className={screen === "atlas" ? "active" : ""} onClick={onAtlas}>人格图鉴</button>
      </nav>
    </header>
  );
}

const PIXEL_GLYPHS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
};

function PixelAI() {
  return (
    <span className="hero-ai" aria-label="AI">
      {Object.entries(PIXEL_GLYPHS).map(([letter, rows]) => (
        <span className="pixel-letter" aria-hidden="true" key={letter}>
          {rows.flatMap((row, rowIndex) => [...row].map((pixel, columnIndex) => (
            <i className={pixel === "1" ? "pixel-on" : ""} key={`${rowIndex}-${columnIndex}`} />
          )))}
        </span>
      ))}
    </span>
  );
}

function Home({ profiles, onStart }: { profiles: Profile[]; onStart: () => void }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">AI INTERACTION TYPE INDICATOR / V1.0</span>
          <h1>
            <strong>测测你的</strong>
            <strong className="hero-title-second"><PixelAI /><span className="hero-title-word">人格</span></strong>
          </h1>
          <p className="hero-lede">MBTI 测你是什么人，AITI 看你一打开 AI 就会变成什么人。24 道题，都是你可能真干过的事。</p>
          <div className="hero-meta"><span>24 题</span><span>约 5 分钟</span><span>19 种人格</span></div>
          <div className="hero-actions">
            <button className="primary-button" onClick={onStart}>开始测试 <span>→</span></button>
          </div>
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
          <h2>这不考你懂不懂 AI。<br />只看你一用 AI，<em>会暴露什么习惯。</em></h2>
          <p>有人额度一重置就开蹬，有人看完一个 Demo 就宣布 AGI 降临。有人每次都对模型说谢谢，也有人守着旧窗口不肯走，坚信它比新模型更懂自己。AITI 测的就是这些事。</p>
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
        <span>按数字 1-4 快速选择</span>
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
          <span>鉴定完了，你是</span>
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
          <span className="section-label">PROFILE / 这说的是你吗</span>
          <p>{result.result.description}</p>
          <div className="strength-grid">
            <div><span>顺手的事</span>{result.result.strengths.map((item) => <b key={item}>+ {item}</b>)}</div>
            <div><span>翻车现场</span>{result.result.blindSpots.map((item) => <b key={item}>− {item}</b>)}</div>
          </div>
        </article>
        <aside className="result-analysis">
          <span className="section-label">SIGNAL / 你是怎么暴露的</span>
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
          <span className="section-label">NEARBY / 你差点就是他们</span>
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
        <p>15 种常见症状，3 个隐藏彩蛋。还有一种：系统看完你的答案，沉默了。</p>
        <button className="primary-button" onClick={onStart}>看看我是哪种 →</button>
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
        <div className="modal-visual">
          <div className="modal-portrait"><img src={imagePath(profile)} alt={profile.name} /></div>
          <div className="modal-stamp"><strong>{profile.code}</strong><span>{profile.type === "main" ? "MAIN TYPE" : profile.type === "hidden" ? "HIDDEN TYPE" : "RARE TYPE"}</span></div>
        </div>
        <div className="modal-content">
          <span className="eyebrow">AITI PERSONALITY PROFILE</span>
          <h1 className={profile.name.length >= 5 ? "long-name" : undefined}>{profile.name}</h1>
          <span className="modal-mbti">MBTI 近似 / {profile.mbtiAnalogy}</span>
          <p className="modal-description">{profile.description}</p>
          <div className="modal-lists">
            <div><span>顺手的事</span>{profile.strengths.map((item) => <b key={item}>+ {item}</b>)}</div>
            <div><span>翻车现场</span>{profile.blindSpots.map((item) => <b key={item}>− {item}</b>)}</div>
          </div>
        </div>
      </article>
    </div>
  );
}

function Footer() {
  return <footer><span>AITI © 2026</span><span>MADE WITH TOO MANY TOKENS</span></footer>;
}

async function copyResult(result: ScoreResult) {
  const text = `测完 AITI，我居然是「${result.result.name}」${result.matchPercent ? `，有 ${result.matchPercent}% 像` : ""}。\n${result.result.tagline}\n顺便测出一个 ${result.mbti.code} 路数。\n你也来看看自己一用 AI 会变成谁：${window.location.origin}`;
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
