export const DIMENSIONS = ["EI", "SN", "TF", "JP", "NV", "TR", "AG", "ID", "IN"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type Vector = Partial<Record<Dimension, number>>;

export type Profile = {
  code: string;
  name: string;
  type: "main" | "hidden" | "fallback";
  mbtiAnalogy: string;
  tagline: string;
  description: string;
  strengths: string[];
  blindSpots: string[];
  image: string;
  vector?: Vector;
};

export type Option = {
  id: string;
  text: string;
  score?: Vector;
  flag?: string;
};

export type Question = {
  id: string;
  dimension: string;
  text: string;
  options: Option[];
};

export type TestSpec = {
  version: string;
  mbtiUncertaintyThreshold?: number;
  scale: Record<Dimension, { negative: string; positive: string }>;
  questions: Question[];
  hiddenRules: Record<string, {
    requiredFlags?: string[];
    conditions: { dimension: Dimension; op: ">=" | "<="; value: number }[];
    minimumConfidence: number;
  }>;
  fallbackRule: {
    code: string;
    maxSimilarityBelow: number;
    orTopMarginBelow: number;
    andFlatDimensionsAtLeast: number;
    flatThreshold: number;
  };
};

export type MbtiPreference = {
  dimension: Dimension;
  letter: string;
  score: number;
  clarity: number;
};

export type ScoreResult = {
  result: Profile;
  resultType: "main" | "hidden" | "fallback";
  matchPercent: number | null;
  mbti: { code: string; preferences: MbtiPreference[] };
  raw: Record<Dimension, number>;
  normalized: Record<Dimension, number>;
  ranking: { code: string; name: string; similarity: number }[];
};
