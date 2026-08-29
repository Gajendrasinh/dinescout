import { Injectable } from '@nestjs/common';

/**
 * Blocks reviews containing clearly disallowed language before they are
 * ever persisted. No third-party moderation vendor (e.g. Perspective API,
 * AWS Comprehend) is configured in this environment, so
 * `LocalWordListProfanityFilter` is the only implementation wired up — a
 * small local word list, intentionally conservative (it flags obvious
 * cases, not borderline ones). Swap in a real vendor behind this same
 * interface without touching ReviewsService.
 */
export interface ProfanityFilter {
  check(text: string): Promise<{ isProfane: boolean; matchedTerms: string[] }>;
}

export const PROFANITY_FILTER = Symbol('PROFANITY_FILTER');

// Deliberately mild example list — real deployments should load a
// maintained blocklist rather than hardcoding one.
const BLOCKED_TERMS = ['fuck', 'shit', 'bitch', 'asshole', 'bastard'];

@Injectable()
export class LocalWordListProfanityFilter implements ProfanityFilter {
  async check(text: string): Promise<{ isProfane: boolean; matchedTerms: string[] }> {
    const lower = text.toLowerCase();
    const matchedTerms = BLOCKED_TERMS.filter((term) => lower.includes(term));
    return { isProfane: matchedTerms.length > 0, matchedTerms };
  }
}
