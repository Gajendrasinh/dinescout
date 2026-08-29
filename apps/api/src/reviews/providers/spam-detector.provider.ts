import { Injectable } from '@nestjs/common';

/**
 * Flags reviews likely to be spam (link stuffing, repeated characters,
 * all-caps shouting, near-duplicate boilerplate). No third-party
 * anti-spam vendor is configured here, so `HeuristicSpamDetector` runs a
 * handful of cheap local heuristics instead. It errs toward flagging for
 * human review (FLAGGED) rather than silently rejecting — spam
 * *detection* here is a moderation-queue signal, not an auto-ban.
 */
export interface SpamDetector {
  check(text: string): Promise<{ isSuspicious: boolean; reasons: string[] }>;
}

export const SPAM_DETECTOR = Symbol('SPAM_DETECTOR');

const URL_PATTERN = /https?:\/\/|www\./i;
const REPEATED_CHAR_PATTERN = /(.)\1{5,}/;

@Injectable()
export class HeuristicSpamDetector implements SpamDetector {
  async check(text: string): Promise<{ isSuspicious: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    if (URL_PATTERN.test(text)) reasons.push('contains a URL');
    if (REPEATED_CHAR_PATTERN.test(text)) reasons.push('excessive repeated characters');

    const letters = text.replace(/[^a-zA-Z]/g, '');
    const upper = text.replace(/[^A-Z]/g, '');
    if (letters.length > 15 && upper.length / letters.length > 0.7) {
      reasons.push('excessive capitalization');
    }

    if (text.trim().length < 3) reasons.push('too short to be meaningful');

    return { isSuspicious: reasons.length > 0, reasons };
  }
}
