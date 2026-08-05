import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '../types';

export const AI_CREDIT_COSTS = {
  STUDY_GENERATION: 20,
  QUIZ_GENERATION: 15,
  ASK_AI: 5,
  CHAT_MESSAGE: 3,
} as const;

export const AI_DAILY_LIMITS = {
  FREE: 50,
  PRO: 200,
} as const;

export function getDailyLimit(user: UserProfile | null): number {
  return user?.is_pro ? AI_DAILY_LIMITS.PRO : AI_DAILY_LIMITS.FREE;
}

export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCreditsUsedToday(user: UserProfile | null): number {
  const today = getTodayStr();
  return user?.ai_credits_used?.[today] ?? 0;
}

export function getCreditsRemaining(user: UserProfile | null): number {
  return Math.max(0, getDailyLimit(user) - getCreditsUsedToday(user));
}

export function canAffordCredits(user: UserProfile | null, cost: number): boolean {
  return getCreditsRemaining(user) >= cost;
}

export async function spendCredits(userId: string, user: UserProfile, cost: number): Promise<void> {
  const today = getTodayStr();
  const currentUsed = user.ai_credits_used?.[today] ?? 0;
  await updateDoc(doc(db, 'users', userId), {
    [`ai_credits_used.${today}`]: currentUsed + cost,
  });
}
