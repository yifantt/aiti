import { DIMENSIONS, type Dimension, type Profile, type ScoreResult, type TestSpec } from "./types";

const WEIGHTS: Record<Dimension, number> = {
  EI: 0.8, SN: 1, TF: 1, JP: 1, NV: 1.2, TR: 1.2, AG: 1.2, ID: 1.2, IN: 1,
};

const emptyVector = () => Object.fromEntries(DIMENSIONS.map((key) => [key, 0])) as Record<Dimension, number>;

function centeredScore(question: TestSpec["questions"][number], option: TestSpec["questions"][number]["options"][number], dimension: Dimension) {
  const mean = question.options.reduce((sum, candidate) => sum + (candidate.score?.[dimension] ?? 0), 0) / question.options.length;
  return (option.score?.[dimension] ?? 0) - mean;
}

function boundsFor(spec: TestSpec) {
  const positive = emptyVector();
  const negative = emptyVector();
  for (const question of spec.questions) {
    for (const dimension of DIMENSIONS) {
      const scores = question.options.map((option) => centeredScore(question, option, dimension));
      positive[dimension] += Math.max(...scores, 0);
      negative[dimension] += Math.min(...scores, 0);
    }
  }
  return { positive, negative };
}

function cosine(user: Record<Dimension, number>, profile: NonNullable<Profile["vector"]>) {
  let dot = 0;
  let userLength = 0;
  let profileLength = 0;
  for (const dimension of DIMENSIONS) {
    const weight = WEIGHTS[dimension];
    const u = user[dimension];
    const p = profile[dimension] ?? 0;
    dot += weight * u * p;
    userLength += weight * u * u;
    profileLength += weight * p * p;
  }
  return userLength && profileLength ? dot / (Math.sqrt(userLength) * Math.sqrt(profileLength)) : 0;
}

function compare(value: number, op: ">=" | "<=", threshold: number) {
  return op === ">=" ? value >= threshold : value <= threshold;
}

export function scoreAnswers(answers: Record<string, string>, spec: TestSpec, profiles: Profile[]): ScoreResult {
  const raw = emptyVector();
  const centeredRaw = emptyVector();
  const flags = new Set<string>();

  for (const question of spec.questions) {
    const option = question.options.find((candidate) => candidate.id === answers[question.id]);
    if (!option) throw new Error(`Missing or invalid answer for ${question.id}`);
    for (const dimension of DIMENSIONS) {
      raw[dimension] += option.score?.[dimension] ?? 0;
      centeredRaw[dimension] += centeredScore(question, option, dimension);
    }
    if (option.flag) flags.add(option.flag);
  }

  const bounds = boundsFor(spec);
  const normalized = emptyVector();
  for (const dimension of DIMENSIONS) {
    const denominator = centeredRaw[dimension] >= 0 ? bounds.positive[dimension] : Math.abs(bounds.negative[dimension]);
    normalized[dimension] = denominator ? centeredRaw[dimension] / denominator : 0;
  }

  const mbtiPairs = [
    ["EI", "I", "E"], ["SN", "S", "N"], ["TF", "T", "F"], ["JP", "J", "P"],
  ] as const;
  const threshold = spec.mbtiUncertaintyThreshold ?? 0.08;
  const preferences = mbtiPairs.map(([dimension, negative, positive]) => ({
    dimension,
    letter: Math.abs(normalized[dimension]) < threshold ? "X" : normalized[dimension] > 0 ? positive : negative,
    score: normalized[dimension],
    clarity: Math.round(Math.abs(normalized[dimension]) * 100),
  }));
  const mbti = { code: preferences.map((item) => item.letter).join(""), preferences };
  const profileMap = new Map(profiles.map((profile) => [profile.code, profile]));

  const hiddenCandidates = Object.entries(spec.hiddenRules).flatMap(([code, rule]) => {
    if (!(rule.requiredFlags ?? []).every((flag) => flags.has(flag))) return [];
    if (!rule.conditions.every((condition) => compare(raw[condition.dimension], condition.op, condition.value))) return [];
    const strengths = rule.conditions.map((condition) => {
      const denominator = condition.op === ">=" ? bounds.positive[condition.dimension] : Math.abs(bounds.negative[condition.dimension]);
      const directional = condition.op === ">=" ? raw[condition.dimension] : -raw[condition.dimension];
      return denominator ? Math.max(0, Math.min(1, directional / denominator)) : 0;
    });
    const confidence = (1 + strengths.reduce((sum, value) => sum + value, 0)) / (1 + strengths.length);
    return confidence >= rule.minimumConfidence ? [{ code, confidence }] : [];
  }).sort((a, b) => b.confidence - a.confidence);

  if (hiddenCandidates[0]) {
    return {
      result: profileMap.get(hiddenCandidates[0].code)!, resultType: "hidden", matchPercent: null,
      mbti, raw, normalized, ranking: [],
    };
  }

  const ranking = profiles.filter((profile) => profile.type === "main" && profile.vector).map((profile) => ({
    code: profile.code, name: profile.name, similarity: cosine(normalized, profile.vector!),
  })).sort((a, b) => b.similarity - a.similarity);
  const top = ranking[0];
  const second = ranking[1];
  const flatDimensions = DIMENSIONS.filter((dimension) => Math.abs(normalized[dimension]) < spec.fallbackRule.flatThreshold).length;
  const ambiguous = top.similarity - second.similarity < spec.fallbackRule.orTopMarginBelow
    && flatDimensions >= spec.fallbackRule.andFlatDimensionsAtLeast;
  const fallback = top.similarity < spec.fallbackRule.maxSimilarityBelow || ambiguous;

  return {
    result: profileMap.get(fallback ? spec.fallbackRule.code : top.code)!,
    resultType: fallback ? "fallback" : "main",
    matchPercent: fallback ? null : Math.max(55, Math.min(95, Math.round(50 + top.similarity * 45))),
    mbti, raw, normalized, ranking: ranking.slice(0, 3),
  };
}
