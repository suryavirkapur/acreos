import assert from 'node:assert/strict';

import { matchBestForProfile } from '@/server/data/best-match';
import {
  extractProfileFromQuestion,
  formatBestMatchReply,
  isPropertyRecommendationQuestion,
  parseBudgetAed,
} from '@/server/data/copilot-profile';

const SAMPLE_QUESTION =
  'I work in ADGM and have a budget of AED 2M. I want a 2 bedroom apartment near restaurants with good rental yield. Which districts should I consider?';

function testRecommendationDetection() {
  assert.equal(isPropertyRecommendationQuestion(SAMPLE_QUESTION), true);
  assert.equal(isPropertyRecommendationQuestion('List all districts'), false);
}

function testBudgetExtraction() {
  assert.equal(parseBudgetAed('budget of AED 2M').max, 2_000_000);
  assert.equal(parseBudgetAed('AED 2 million').max, 2_000_000);
}

function testProfileExtraction() {
  const { profile, limit } = extractProfileFromQuestion(SAMPLE_QUESTION);
  assert.equal(profile.workplaceDistrict, 'ADGM');
  assert.equal(profile.budgetMaxAed, 2_000_000);
  assert.equal(profile.propertyType, 'apartment');
  assert.equal(profile.bedrooms, 2);
  assert.equal(profile.purpose, 'live');
  assert.equal(limit, 5);
  assert.ok(profile.lifestylePriorities?.includes('restaurants'));
  assert.ok(profile.lifestylePriorities?.includes('rental yield'));
  assert.ok(profile.lifestylePriorities?.includes('commute'));
}

function testPreferredDistrictFilter() {
  const question =
    'I want a 2 bedroom apartment in Al Reem Island or Yas Island with a budget of AED 2M. Which districts should I consider?';
  const { profile } = extractProfileFromQuestion(question);
  assert.deepEqual([...(profile.preferredDistricts ?? [])].toSorted(), ['Al Reem Island', 'Yas Island']);

  const matches = matchBestForProfile(profile, 5);
  assert.ok(matches.length > 0);
  for (const match of matches) {
    assert.ok(['Al Reem Island', 'Yas Island'].includes(match.district));
  }
}

function testFormattedReply() {
  const { profile } = extractProfileFromQuestion(SAMPLE_QUESTION);
  const matches = matchBestForProfile(profile, 5);
  const reply = formatBestMatchReply(matches, profile);

  assert.match(reply, /## Ranked recommendations/);
  assert.match(reply, /\/100\*\*/);
  assert.match(reply, /## Next action/);
  assert.match(reply, /Sources:/);

  if (matches.length > 0) {
    assert.match(reply, /Why it matches/);
  } else {
    assert.match(
      reply,
      /No exact matches found\. Try widening budget, districts, property type, or size requirements\./,
    );
  }
}

function run() {
  testRecommendationDetection();
  testBudgetExtraction();
  testProfileExtraction();
  testPreferredDistrictFilter();
  testFormattedReply();
  console.log('copilot-profile tests passed');
}

run();
