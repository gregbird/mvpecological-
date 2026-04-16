/**
 * Centralised OpenAI model selection.
 *
 * Every AI endpoint in the app imports from here so a model bump is a single
 * two-line change instead of a codebase-wide find-and-replace. Keep this file
 * tiny on purpose — no logic, just named tiers.
 *
 * Two tiers:
 *   - SYNTHESIS_MODEL: cross-document reasoning, report writing, long-form
 *     analysis where quality matters (Step 3 desk insights, Step 6 report
 *     sections, Company Reports comparative answer).
 *   - CHEAP_MODEL: short summaries, structured extraction, reranking,
 *     conversational agents — tasks where mini quality is plenty and the
 *     volume of calls makes cost per call matter.
 *
 * IMPORTANT — gpt-5 API differences:
 *   - `temperature` is NOT supported (reasoning models reject it). Do not send.
 *   - `max_tokens` is replaced by `max_completion_tokens` in the chat
 *     completions payload.
 *   - `response_format: { type: 'json_object' }` still works.
 *
 * gpt-5 is both cheaper and higher quality than gpt-4o ($1.25/$10 vs
 * $2.50/$10 per million tokens). gpt-5-mini at $0.25 input is the workhorse
 * for volume.
 */

export const SYNTHESIS_MODEL = 'gpt-5'
export const CHEAP_MODEL = 'gpt-5-mini'
