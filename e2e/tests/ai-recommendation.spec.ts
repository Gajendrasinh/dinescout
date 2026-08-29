import { test, expect } from '@playwright/test';
import { click } from './helpers/click';
import { currentPage } from './helpers/page';

// Critical flow: ask DineScout AI for a recommendation and get back a real
// restaurant — not an invented one. The dev API runs with AI_API_KEY unset
// (see apps/api/.env), so AiModule's factory (apps/api/src/ai/ai.module.ts)
// wires in LocalHeuristicAiProvider rather than the Anthropic provider; that
// provider still goes through the same tool-router (apps/api/src/ai/tools)
// that whitelists real DB-backed lookups, so this exercises the
// "AI never hallucinates facts" architecture end-to-end even without a paid
// LLM key — the whole point of that fallback provider existing.
test('ask the AI for a recommendation and open the restaurant it suggests', async ({ page }) => {
  await page.goto('/ai-chat');

  const chat = currentPage(page);
  await expect(chat.locator('h1')).toHaveText('DineScout AI');

  // One assistant bubble (the welcome message) already exists before we ask
  // anything — count real (non-typing-indicator) assistant bubbles so we can
  // wait specifically for the new reply to land, not the transient "..."
  // typing indicator that briefly has the same row/bubble classes.
  const assistantReplies = chat.locator(
    '.ds-bubble-row:not(.ds-bubble-row--user) .ds-bubble:not(.ds-bubble--typing)',
  );
  const repliesBefore = await assistantReplies.count();

  await click(chat.locator('.ds-prompt-chip', { hasText: 'Vegetarian' }));

  await expect(assistantReplies).toHaveCount(repliesBefore + 1, { timeout: 15_000 });
  const replyText = (await assistantReplies.last().textContent())?.trim();
  expect(replyText).toBeTruthy();
  expect(replyText).not.toMatch(/tap to retry/i);

  // The reply should come with a rich restaurant recommendation card backed
  // by a real restaurant row, not just free text.
  const recommendedCard = chat.locator('.ds-rich-cards app-restaurant-card .ds-card').first();
  await expect(recommendedCard).toBeVisible({ timeout: 15_000 });
  const recommendedName = (await recommendedCard.locator('.ds-card__name').textContent())?.trim();
  expect(recommendedName).toBeTruthy();

  // Prove it's real: opening it must resolve to an actual restaurant details
  // page with that same name, not a 404 / not-found state.
  await click(recommendedCard);
  await expect(page).toHaveURL(/\/restaurants\/[^/]+$/);
  const details = currentPage(page);
  await expect(details.locator('h2', { hasText: 'Restaurant not found' })).toHaveCount(0);
  await expect(details.locator('h1.ds-details-name')).toHaveText(recommendedName!, {
    timeout: 15_000,
  });
});
