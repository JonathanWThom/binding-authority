#!/usr/bin/env node
/**
 * Automated test suite for The Binding Authority.
 * Tests game logic invariants, data integrity, and balance.
 * Run: node test.mjs
 */

import { readFileSync } from 'fs';

// ====== Extract game data from index.html ======
const html = readFileSync('index.html', 'utf8');
const css = readFileSync('css/style.css', 'utf8');
const htmlAndCss = html + '\n' + css; // combined for class checks
const jsMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
if (!jsMatch) { console.error('No script found in index.html'); process.exit(1); }

// Validate JS syntax
// Strip import/export statements for syntax check (new Function doesn't support modules)
const jsForSyntax = jsMatch[1].replace(/^import .*/gm, '').replace(/^export /gm, '');
try { new Function(jsForSyntax); } catch(e) {
  console.error('JS SYNTAX ERROR:', e.message);
  process.exit(1);
}

// Extract data by evaluating in a sandbox
const sandbox = {};
const extractCode = jsMatch[1]
  .replace(/document\./g, '({classList:{add(){},remove(){},contains(){return false},toggle(){}},textContent:"",innerHTML:"",style:{},addEventListener(){},dispatchEvent(){},querySelector(){return null},querySelectorAll(){return[]},getElementById(){return{classList:{add(){},remove(){},contains(){return false}},textContent:"",innerHTML:"",style:{},disabled:false,value:"0",focus(){},dispatchEvent(){}}},onclick:null,getElementsByClassName(){return[]}}).')
  .replace(/navigator\./g, '({share:null,clipboard:{writeText(){return Promise.resolve()},canShare(){return false}},userAgent:""}).')
  .replace(/localStorage\./g, '({getItem(){return null},setItem(){},removeItem(){}}).')
  .replace(/new \(window\.AudioContext[^)]*\)\(\)/g, 'null')
  .replace(/URL\.createObjectURL[^;]*/g, '""')
  .replace(/URL\.revokeObjectURL[^;]*/g, '""');

// We can't fully eval the game code due to DOM deps, so let's extract the data constants directly
// Read all JS sources: inline script + data modules
const allDataSources = [jsMatch[1]];
import { readdirSync } from 'fs';
for (const f of readdirSync('js/data')) {
  if (f.endsWith('.js')) allDataSources.push(readFileSync('js/data/' + f, 'utf8'));
}
const allJS = allDataSources.join('\n');

function extractArray(name) {
  const re = new RegExp(`(?:export )?const ${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
  const m = allJS.match(re);
  if (!m) return null;
  try { return eval(m[1]); } catch(e) { return null; }
}

function extractObject(name) {
  const startRe = new RegExp(`(?:export )?const ${name}\\s*=\\s*\\{`);
  const startMatch = startRe.exec(allJS);
  if (!startMatch) return null;
  let depth = 1;
  let i = startMatch.index + startMatch[0].length;
  while (depth > 0 && i < allJS.length) {
    if (allJS[i] === '{') depth++;
    if (allJS[i] === '}') depth--;
    i++;
  }
  const objStr = allJS.slice(startMatch.index + startMatch[0].length - 1, i);
  try { return eval('(' + objStr + ')'); } catch(e) { return null; }
}

const INSURED_NAMES = extractArray('INSURED_NAMES');
const COVERAGE_TYPES = extractArray('COVERAGE_TYPES');
const INDUSTRIES = extractArray('INDUSTRIES');
const STATES = extractArray('STATES');
const CARRIERS = extractArray('CARRIERS');
const NONSTANDARD_CARRIERS = extractArray('NONSTANDARD_CARRIERS');
const RED_FLAGS = extractArray('RED_FLAGS');
const GREEN_FLAGS = extractArray('GREEN_FLAGS');
const CAT_EVENTS = extractArray('CAT_EVENTS');
const RETAIL_BROKER_NAMES = extractArray('RETAIL_BROKER_NAMES');
const LIMIT_OPTIONS = extractArray('LIMIT_OPTIONS');
const RETENTION_OPTIONS = extractArray('RETENTION_OPTIONS');
const DIFFICULTY = extractObject('DIFFICULTY');
const SL_TAX_RATES = extractObject('SL_TAX_RATES');

// ====== Test framework ======
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(msg);
    console.log(`  FAIL: ${msg}`);
  }
}

function section(name) { console.log(`\n--- ${name} ---`); }

// ====== DATA INTEGRITY TESTS ======

section('Data Extraction');
assert(INSURED_NAMES, 'INSURED_NAMES extracted');
assert(COVERAGE_TYPES, 'COVERAGE_TYPES extracted');
assert(INDUSTRIES, 'INDUSTRIES extracted');
assert(STATES, 'STATES extracted');
assert(CARRIERS, 'CARRIERS extracted');
assert(NONSTANDARD_CARRIERS, 'NONSTANDARD_CARRIERS extracted');
assert(RED_FLAGS, 'RED_FLAGS extracted');
assert(GREEN_FLAGS, 'GREEN_FLAGS extracted');
assert(CAT_EVENTS, 'CAT_EVENTS extracted');
assert(RETAIL_BROKER_NAMES, 'RETAIL_BROKER_NAMES extracted');
assert(DIFFICULTY, 'DIFFICULTY extracted');
assert(SL_TAX_RATES, 'SL_TAX_RATES extracted');

section('Variety Minimums');
assert(INSURED_NAMES.length >= 40, `Insured names >= 40 (got ${INSURED_NAMES.length})`);
assert(COVERAGE_TYPES.length >= 10, `Coverage types >= 10 (got ${COVERAGE_TYPES.length})`);
assert(INDUSTRIES.length >= 15, `Industries >= 15 (got ${INDUSTRIES.length})`);
assert(STATES.length >= 25, `States >= 25 (got ${STATES.length})`);
assert(CARRIERS.length >= 8, `Standard carriers >= 8 (got ${CARRIERS.length})`);
assert(NONSTANDARD_CARRIERS.length >= 8, `Non-standard carriers >= 8 (got ${NONSTANDARD_CARRIERS.length})`);
assert(RED_FLAGS.length >= 20, `Red flags >= 20 (got ${RED_FLAGS.length})`);
assert(GREEN_FLAGS.length >= 20, `Green flags >= 20 (got ${GREEN_FLAGS.length})`);
assert(CAT_EVENTS.length >= 7, `Cat events >= 7 (got ${CAT_EVENTS.length})`);
assert(RETAIL_BROKER_NAMES.length >= 12, `Retail brokers >= 12 (got ${RETAIL_BROKER_NAMES.length})`);

section('No Duplicates');
assert(new Set(INSURED_NAMES).size === INSURED_NAMES.length, 'No duplicate insured names');
assert(new Set(STATES.map(s => s.name)).size === STATES.length, 'No duplicate state codes');
assert(new Set(CARRIERS.map(c => c.name)).size === CARRIERS.length, 'No duplicate carrier names');
assert(new Set(NONSTANDARD_CARRIERS.map(c => c.name)).size === NONSTANDARD_CARRIERS.length, 'No duplicate non-standard carriers');
assert(new Set(RED_FLAGS).size === RED_FLAGS.length, 'No duplicate red flags');
assert(new Set(GREEN_FLAGS).size === GREEN_FLAGS.length, 'No duplicate green flags');
assert(new Set(RETAIL_BROKER_NAMES).size === RETAIL_BROKER_NAMES.length, 'No duplicate retail brokers');

section('Coverage Type Structure');
for (const c of COVERAGE_TYPES) {
  assert(c.name && c.baseRate > 0 && c.abbr && c.exposureLabel, `${c.name}: has name, baseRate, abbr, exposureLabel`);
  assert(c.baseRate >= 0.001 && c.baseRate <= 0.05, `${c.name}: baseRate ${c.baseRate} in range [0.001, 0.05]`);
  if (c.industries) {
    for (const ind of c.industries) {
      assert(INDUSTRIES.find(i => i.name === ind), `${c.name}: industry "${ind}" exists in INDUSTRIES`);
    }
  }
}

section('Industry Structure');
for (const ind of INDUSTRIES) {
  assert(ind.name && ind.riskMod > 0 && ind.class, `${ind.name}: has name, riskMod, class`);
  assert(ind.riskMod >= 0.5 && ind.riskMod <= 2.0, `${ind.name}: riskMod ${ind.riskMod} in range [0.5, 2.0]`);
  // Verify at least one coverage type accepts this industry
  const compatCoverage = COVERAGE_TYPES.filter(c => !c.industries || c.industries.includes(ind.name));
  assert(compatCoverage.length >= 2, `${ind.name}: has >= 2 compatible coverage types (got ${compatCoverage.length})`);
}

section('State Structure');
for (const s of STATES) {
  assert(s.name && s.catRisk > 0 && s.label, `${s.label}: has name, catRisk, label`);
  assert(s.catRisk >= 0.5 && s.catRisk <= 2.0, `${s.label}: catRisk ${s.catRisk} in range [0.5, 2.0]`);
  assert(typeof s.surplus === 'boolean', `${s.label}: surplus is boolean`);
}
// Surplus states must have SL tax rates
const surplusStates = STATES.filter(s => s.surplus);
for (const s of surplusStates) {
  assert(SL_TAX_RATES[s.name], `${s.label}: surplus state has SL tax rate`);
  assert(SL_TAX_RATES[s.name] >= 0.01 && SL_TAX_RATES[s.name] <= 0.10, `${s.label}: SL tax ${SL_TAX_RATES[s.name]} in range [1%, 10%]`);
}

section('Carrier Structure');
for (const c of CARRIERS) {
  assert(c.name && c.rating && c.commission > 0, `${c.name}: has name, rating, commission`);
  assert(c.commission >= 0.05 && c.commission <= 0.25, `${c.name}: commission ${c.commission} in range [5%, 25%]`);
  assert(c.maxTIV > 0, `${c.name}: has maxTIV`);
  assert(c.minPremium > 0, `${c.name}: has minPremium`);
  assert(c.appetite && typeof c.appetite === 'object', `${c.name}: has appetite object`);
  // Every industry class should appear in at least one carrier's appetite
}
const allClasses = new Set(INDUSTRIES.map(i => i.class));
for (const cls of allClasses) {
  const hasCarrier = CARRIERS.some(c => (c.appetite[cls] || 0) > 0);
  assert(hasCarrier, `Industry class "${cls}" has at least one carrier with appetite`);
}

for (const c of NONSTANDARD_CARRIERS) {
  assert(c.name && c.rating && c.commission > 0, `NS ${c.name}: has name, rating, commission`);
  assert(c.commission < 0.12, `NS ${c.name}: commission ${c.commission} lower than standard (non-standard market)`);
}

section('Cat Events Structure');
for (const e of CAT_EVENTS) {
  assert(e.name && e.lines && e.premiumMod > 1 && e.lossChanceMod > 1, `${e.name}: has required fields`);
  // Lines must reference real coverage types
  for (const line of e.lines) {
    assert(COVERAGE_TYPES.find(c => c.name === line), `${e.name}: line "${line}" exists in COVERAGE_TYPES`);
  }
  // States (if specified) must reference real states
  if (e.states) {
    for (const st of e.states) {
      assert(STATES.find(s => s.name === st), `${e.name}: state "${st}" exists in STATES`);
    }
  }
}

section('Difficulty Config');
for (const [name, diff] of Object.entries(DIFFICULTY)) {
  assert(diff.time > 0, `${name}: has time`);
  assert(diff.timeFloor > 0 && diff.timeFloor < diff.time, `${name}: timeFloor ${diff.timeFloor} < time ${diff.time}`);
  assert(diff.rounds > 0, `${name}: has rounds`);
  assert(diff.lossChance > 0 && diff.lossChance < 1, `${name}: lossChance in (0,1)`);
  assert(diff.overpriceThreshold > 1, `${name}: overpriceThreshold > 1`);
  assert(diff.fireThreshold > 0 && diff.fireThreshold <= 1, `${name}: fireThreshold in (0,1]`);
  assert(diff.prodTarget > 0, `${name}: has prodTarget`);
}
// Difficulty should get harder
assert(DIFFICULTY.easy.time > DIFFICULTY.medium.time, 'Easy has more time than medium');
assert(DIFFICULTY.medium.time > DIFFICULTY.hard.time, 'Medium has more time than hard');
assert(DIFFICULTY.easy.lossChance < DIFFICULTY.medium.lossChance, 'Easy has lower loss chance than medium');
assert(DIFFICULTY.medium.lossChance < DIFFICULTY.hard.lossChance, 'Medium has lower loss chance than hard');
assert(DIFFICULTY.easy.fireThreshold >= DIFFICULTY.medium.fireThreshold, 'Easy has higher fire threshold');
assert(DIFFICULTY.medium.fireThreshold >= DIFFICULTY.hard.fireThreshold, 'Medium has higher fire threshold');
assert(DIFFICULTY.easy.rounds < DIFFICULTY.medium.rounds, 'Easy has fewer rounds than medium');
assert(DIFFICULTY.medium.rounds < DIFFICULTY.hard.rounds, 'Medium has fewer rounds than hard');

section('Coverage/Industry Filtering');
// Builders Risk should only be available for Construction and Real Estate
const br = COVERAGE_TYPES.find(c => c.name === 'Builders Risk');
assert(br.industries, 'Builders Risk has industry filter');
assert(br.industries.includes('Construction'), 'Builders Risk available for Construction');
assert(br.industries.includes('Real Estate'), 'Builders Risk available for Real Estate');
assert(!br.industries.includes('Technology'), 'Builders Risk NOT available for Technology');
assert(!br.industries.includes('Aviation'), 'Builders Risk NOT available for Aviation');

// Environmental should not include tech/professional/retail
const enviro = COVERAGE_TYPES.find(c => c.name === 'Environmental Liability');
assert(enviro.industries, 'Environmental has industry filter');
assert(!enviro.industries.includes('Technology'), 'Environmental NOT available for Technology');
assert(!enviro.industries.includes('Professional Services'), 'Environmental NOT available for Professional Services');
assert(!enviro.industries.includes('Retail'), 'Environmental NOT available for Retail');

// GL and WC should be available for all industries (null filter)
const gl = COVERAGE_TYPES.find(c => c.name === 'General Liability');
assert(gl.industries === null, 'GL available for all industries');
const wc = COVERAGE_TYPES.find(c => c.name === "Workers' Compensation");
assert(wc.industries === null, 'WC available for all industries');

section('Timer Compression');
// Verify timer compression math
function getTimeForRound(round, diff) {
  const progress = (round - 1) / (diff.rounds - 1);
  if (progress < 0.6) return diff.time;
  const c = (progress - 0.6) / 0.4;
  return Math.round(diff.time - c * (diff.time - diff.timeFloor));
}
for (const [name, diff] of Object.entries(DIFFICULTY)) {
  const firstRound = getTimeForRound(1, diff);
  const lastRound = getTimeForRound(diff.rounds, diff);
  assert(firstRound === diff.time, `${name}: first round = base time (${firstRound}s)`);
  assert(lastRound === diff.timeFloor, `${name}: last round = floor (${lastRound}s)`);
  // All intermediate rounds should be monotonically decreasing or equal
  let prev = diff.time;
  for (let r = 1; r <= diff.rounds; r++) {
    const t = getTimeForRound(r, diff);
    assert(t <= prev, `${name}: round ${r} time (${t}s) <= round ${r-1} (${prev}s)`);
    assert(t >= diff.timeFloor, `${name}: round ${r} time (${t}s) >= floor (${diff.timeFloor}s)`);
    prev = t;
  }
}

section('Retention/Premium Scaling');
// Test the retention calculation logic
function calcRetention(fairPremium) {
  const rawRetention = fairPremium * 0.15;
  return rawRetention < 5000 ? Math.round(rawRetention / 1000) * 1000 || 1000
    : rawRetention < 25000 ? Math.round(rawRetention / 5000) * 5000
    : Math.round(rawRetention / 10000) * 10000;
}
// Small premium
const retSmall = calcRetention(10000);
assert(retSmall >= 1000 && retSmall <= 5000, `$10K premium: retention ${retSmall} in [$1K, $5K]`);
// Medium premium
const retMed = calcRetention(100000);
assert(retMed >= 10000 && retMed <= 25000, `$100K premium: retention ${retMed} in [$10K, $25K]`);
// Large premium
const retLarge = calcRetention(500000);
assert(retLarge >= 50000 && retLarge <= 100000, `$500K premium: retention ${retLarge} in [$50K, $100K]`);
// Ratio check
for (const prem of [5000, 20000, 50000, 100000, 200000, 500000]) {
  const ret = calcRetention(prem);
  const ratio = ret / prem;
  assert(ratio >= 0.05 && ratio <= 0.30, `$${prem} premium: retention ratio ${(ratio*100).toFixed(0)}% in [5%, 30%]`);
}

section('Grading Formula');
// Simulate grade calculations
function computeGrade(revenue, accuracy, lr, cr, totalBinds, totalRounds, totalRefers, totalPremium, prodTarget, fired) {
  if (fired) return 'F';
  const referPenalty = Math.max(0, totalRefers - Math.round(totalRounds * 0.25)) * 5;
  const bindRate = totalBinds / totalRounds;
  const bindPenalty = bindRate < 0.3 ? 40 : (bindRate < 0.5 ? 20 : 0);
  const revPoints = Math.min(30, revenue / 1000) + (revenue > 30000 ? Math.min(15, (revenue - 30000) / 5000) : 0);
  const score = revPoints + (accuracy * 50) - (lr * 120) - (cr > 1 ? 30 : 0) - referPenalty - bindPenalty;
  const prodPenalty = totalPremium >= prodTarget ? 0 : 15;
  const finalScore = score - prodPenalty;
  if (finalScore > 75) return 'A+';
  if (finalScore > 55) return 'A';
  if (finalScore > 35) return 'B+';
  if (finalScore > 15) return 'B';
  if (finalScore > 0) return 'C';
  if (finalScore > -15) return 'D';
  return 'F';
}

// Fired always F
assert(computeGrade(100000, 1.0, 0, 0, 15, 15, 0, 1000000, 400000, true) === 'F', 'Fired player gets F regardless of stats');

// Decline everything: should be D or F
const declineGrade = computeGrade(-15000, 0.5, 0, 0, 0, 15, 0, 0, 550000, false);
assert(declineGrade === 'D' || declineGrade === 'F', `Decline everything: ${declineGrade} should be D or F`);

// Refer everything: should be F (massive refer penalty + bind penalty + prod penalty)
const referGrade = computeGrade(-50000, 0, 0, 0, 0, 15, 15, 0, 550000, false);
assert(referGrade === 'F', `Refer everything: ${referGrade} should be F`);

// Perfect game: high revenue, good accuracy, low LR, hit production
const perfectGrade = computeGrade(80000, 0.9, 0.1, 0.18, 10, 15, 0, 800000, 550000, false);
assert(perfectGrade === 'A+' || perfectGrade === 'A', `Perfect game: ${perfectGrade} should be A+ or A`);

// Good game but missed production target
const missedProd = computeGrade(40000, 0.8, 0.15, 0.23, 4, 15, 0, 400000, 550000, false);
const hitProd = computeGrade(40000, 0.8, 0.15, 0.23, 4, 15, 0, 600000, 550000, false);
assert(hitProd === missedProd || 'ABCDF'.indexOf(hitProd[0]) <= 'ABCDF'.indexOf(missedProd[0]),
  `Missing prod target hurts grade: hit=${hitProd}, missed=${missedProd}`);

// High loss ratio should tank grade even with high revenue
const highLR = computeGrade(60000, 0.5, 0.8, 0.88, 10, 15, 0, 800000, 550000, false);
assert(highLR === 'D' || highLR === 'F', `80% loss ratio: ${highLR} should be D or F`);

section('Production Target Reachability');
// A player who binds ~35% of rounds at avg $115K premium should hit the target
for (const [name, diff] of Object.entries(DIFFICULTY)) {
  const expectedPremium = Math.round(diff.rounds * 0.35 * 115000);
  const ratio = expectedPremium / diff.prodTarget;
  assert(ratio >= 0.7 && ratio <= 1.5, `${name}: expected premium $${expectedPremium} vs target $${diff.prodTarget} (ratio ${ratio.toFixed(2)}) — reachable`);
}

section('HTML Structure');
// Check required DOM elements exist
const requiredIds = [
  'title-screen', 'game-screen', 'gameover-screen',
  'hud-revenue', 'hud-loss-ratio', 'hud-combined', 'hud-round', 'hud-timer', 'hud-production',
  'timer-bar', 'lr-warning', 'submission-card',
  'feedback-overlay', 'feedback-card',
  'event-banner', 'sound-toggle',
  'carrier-call-overlay', 'carrier-call-card'
];
for (const id of requiredIds) {
  assert(html.includes(`id="${id}"`), `DOM element #${id} exists`);
}

section('Keyboard Shortcuts');
// All documented keys should have handlers
const keyHandlers = ['e.key === \'b\'', 'e.key === \'d\'', 'e.key === \'r\'', 'e.key === \'l\'', 'e.key === \'m\'',
  'e.key === \'1\'', 'e.key === \'2\'', 'e.key === \'3\'', 'e.key === \'Tab\'', 'e.key === \'ArrowLeft\''];
for (const handler of keyHandlers) {
  assert(jsMatch[1].includes(handler), `Keyboard handler for ${handler}`);
}

section('CSS Classes');
// Check critical CSS classes exist
const requiredClasses = [
  '.badge-coverage', '.badge-surplus', '.badge-renewal', '.badge-financing', '.badge-broker',
  '.bind-btn', '.decline-btn', '.refer-btn', '.lossruns-btn', '.market-btn',
  '.carrier-card', '.carrier-card.selected', '.carrier-card.unavailable',
  '.risk-hint', '.renewal-history', '.sound-toggle',
  '.event-banner.active', '.lr-warning.active', '.banner-active'
];
for (const cls of requiredClasses) {
  assert(htmlAndCss.includes(cls), `CSS class ${cls} defined`);
}

// ====== SUMMARY ======
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log(`\nFailures:`);
  for (const f of failures) console.log(`  - ${f}`);
}
console.log('='.repeat(60));
process.exit(failed > 0 ? 1 : 0);
