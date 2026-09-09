export type Strength = 'core' | 'strong' | 'typical' | 'weak';
export type TenetKind = 'categorical' | 'ordered';

/** The five Likert positions the user can pick, plus an explicit abstention. */
export const ANSWERS = [-2, -1, 0, 1, 2] as const;
export type Answer = (typeof ANSWERS)[number];
export type Response = Answer | 'skip';

export interface Tenet {
  id: string;
  label: string;
  kind: TenetKind;
  options: string[];
}

export interface Position {
  value: string;
  strength: Strength;
}

export interface Ideology {
  id: string;
  name: string;
  aliases: string[];
  family: string;
  priorWeight: number;
  positions: Record<string, Position>;
  blurb: string;
  reading?: string[];
}

export interface Question {
  id: string;
  tenet: string;
  tier: 1 | 2 | 3;
  prompt: string;
  /** option id -> expected Likert value in [-2, 2]. Unlisted options mean 0. */
  expected: Record<string, number>;
}

export interface Family {
  id: string;
  label: string;
}

export interface CompiledKB {
  tenets: Tenet[];
  ideologies: Ideology[];
  questions: Question[];
  families: Family[];
}
