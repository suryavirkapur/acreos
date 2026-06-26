import assert from 'node:assert/strict';

import { matchBestForProfile } from '@/server/data/best-match';
import { matchMandateToParcels } from '@/server/data/matching';
import {
  extractMandateFromQuestion,
  extractProfileFromQuestion,
  formatBestMatchReply,
  formatMandateReply,
  formatPriceMomentumReply,
  isCapitalSupplyQuestion,
  isMandateDeploymentQuestion,
  isPriceMomentumQuestion,
  isPropertyRecommendationQuestion,
  isServiceDemandQuestion,
  isVacantParcelsQuestion,
  parseBudgetAed,
} from '@/server/data/copilot-profile';
import { priceTrendByDistrict } from '@/server/data/queries';

const SAMPLE_QUESTION =
  'I work in ADGM and have a budget of AED 2M. I want a 2 bedroom apartment near restaurants with good rental yield. Which districts should I consider?';

const MANDATE_QUESTION =
  'Where should a balanced fund with AED 200M-600M deploy capital this quarter?';

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

  assert.match(reply, /## Districts to consider/);
  assert.match(reply, /\| Rank \| District \|/);
  assert.match(reply, /## Top property listings/);
  assert.match(reply, /\| # \| District \| Score \|/);
  assert.match(reply, /## Next action/);
  assert.match(reply, /Sources:/);

  if (matches.length > 0) {
    assert.match(reply, /Why these match/);
  } else {
    assert.match(
      reply,
      /No exact matches found\. Try widening budget, districts, property type, or size requirements\./,
    );
  }
}

function testMandateDetection() {
  assert.equal(isMandateDeploymentQuestion(MANDATE_QUESTION), true);
  assert.equal(isMandateDeploymentQuestion(SAMPLE_QUESTION), false);
}

function testMandateExtraction() {
  const { mandate, limit } = extractMandateFromQuestion(MANDATE_QUESTION);
  assert.equal(mandate.capitalRange, '200M-600M');
  assert.equal(mandate.risk, 'balanced');
  assert.equal(limit, 5);
}

function testMandateReply() {
  const { mandate, limit } = extractMandateFromQuestion(MANDATE_QUESTION);
  const matches = matchMandateToParcels(mandate, limit);
  const reply = formatMandateReply(matches, mandate);

  assert.match(reply, /## Recommended parcels/);
  assert.match(reply, /\| Rank \| Parcel \|/);
  assert.match(reply, /balanced risk/);
  assert.match(reply, /200M-600M/);
  assert.match(reply, /Sources:/);
  assert.ok(matches.length > 0);
}

function testExampleQuestionDetection() {
  assert.equal(isPriceMomentumQuestion('Which districts have the strongest price momentum?'), true);
  assert.equal(
    isVacantParcelsQuestion('What are the top vacant parcels in Saadiyat Island?'),
    true,
  );
  assert.equal(
    isCapitalSupplyQuestion('Where is investor capital concentrated by sector?'),
    true,
  );
  assert.equal(
    isServiceDemandQuestion('Which districts have the highest unmet community service demand?'),
    true,
  );
}

function testPriceMomentumFormatting() {
  const reply = formatPriceMomentumReply(priceTrendByDistrict(20), 5);
  assert.match(reply, /## Strongest price momentum/);
  assert.match(reply, /\| Rank \| District \| Momentum \|/);
}

function run() {
  testRecommendationDetection();
  testBudgetExtraction();
  testProfileExtraction();
  testPreferredDistrictFilter();
  testFormattedReply();
  testMandateDetection();
  testMandateExtraction();
  testMandateReply();
  testExampleQuestionDetection();
  testPriceMomentumFormatting();
  console.log('copilot-profile tests passed');
}

run();
