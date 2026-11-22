import { buildHuntPrompt, buildRepoPrompt, firstUrl, normalizeGeneratedHunt } from '../core/huntgen.js';

let sampler = null;

export async function getSampler() {
  if (sampler) return sampler;
  const host = typeof window !== 'undefined' ? window.claude : null;
  if (!host || typeof host.use !== 'function') return null;
  try {
    sampler = await host.use('sample');
  } catch (error) {
    sampler = null;
  }
  return sampler;
}

async function ask(prompt, tier) {
  const sample = await getSampler();
  if (!sample) throw new Error('AI generation is not available here.');
  try {
    return await sample.json(prompt, { modelTier: tier, cache: false });
  } catch (error) {
    if (error && error.code === 'rate_limited') throw new Error('Rate limited. Wait a minute and try again.');
    if (error && error.code === 'not_granted') throw new Error('Permission to ask Claude was not granted.');
    throw new Error('Claude did not return a usable answer. Try again.');
  }
}

export async function generateHunt(language, focus) {
  const hunt = normalizeGeneratedHunt(await ask(buildHuntPrompt(language, focus), 'default'), language);
  if (!hunt) throw new Error('The generated hunt had no clearly marked bug. Try again.');
  return hunt;
}

export async function generateRepoFromReport(report, language) {
  const raw = await ask(buildRepoPrompt(report, language), 'complex');
  const hunt = normalizeGeneratedHunt(raw, language, { repo: true, sourceUrl: firstUrl(report) });
  if (!hunt) throw new Error('The generated repo was too small or had no clearly marked bug. Try again.');
  return hunt;
}
