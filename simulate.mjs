#!/usr/bin/env node
/**
 * Headless simulation of The Binding Authority game logic.
 * Runs hundreds of playthroughs with different strategies and reports
 * bugs, edge cases, and insurance realism issues.
 */

// ====== GAME DATA (copied from index.html) ======
const COVERAGE_TYPES = [
  { name: "General Liability", baseRate: 0.005, abbr: "GL", industries: null },
  { name: "Professional Liability (E&O)", baseRate: 0.008, abbr: "E&O", industries: ["Healthcare", "Technology", "Professional Services", "Real Estate"] },
  { name: "Commercial Property", baseRate: 0.004, abbr: "CPP", industries: null },
  { name: "Excess/Umbrella", baseRate: 0.003, abbr: "XS", industries: null },
  { name: "Commercial Auto", baseRate: 0.006, abbr: "CA", industries: ["Construction", "Manufacturing", "Transportation", "Energy / Oil & Gas", "Agriculture", "Food & Beverage", "Mining", "Retail"] },
  { name: "Workers' Compensation", baseRate: 0.007, abbr: "WC", industries: null },
  { name: "Cyber Liability", baseRate: 0.01, abbr: "Cyber", industries: ["Technology", "Healthcare", "Professional Services", "Real Estate", "Retail", "Hospitality", "Food & Beverage", "Entertainment / Events"] },
  { name: "Directors & Officers (D&O)", baseRate: 0.009, abbr: "D&O", industries: ["Technology", "Healthcare", "Professional Services", "Cannabis", "Energy / Oil & Gas", "Real Estate"] },
  { name: "Environmental Liability", baseRate: 0.012, abbr: "Enviro", industries: ["Construction", "Manufacturing", "Energy / Oil & Gas", "Mining", "Agriculture", "Transportation"] },
  { name: "Product Liability", baseRate: 0.008, abbr: "PL", industries: ["Manufacturing", "Food & Beverage", "Cannabis", "Agriculture", "Retail"] },
  { name: "Inland Marine", baseRate: 0.005, abbr: "IM", industries: ["Construction", "Manufacturing", "Transportation", "Marine", "Energy / Oil & Gas", "Mining", "Agriculture"] },
  { name: "Builders Risk", baseRate: 0.006, abbr: "BR", industries: ["Construction", "Real Estate"] }
];

const INDUSTRIES = [
  { name: "Construction", riskMod: 1.4, class: "artisan" },
  { name: "Manufacturing", riskMod: 1.2, class: "industrial" },
  { name: "Hospitality", riskMod: 1.1, class: "service" },
  { name: "Healthcare", riskMod: 1.3, class: "professional" },
  { name: "Technology", riskMod: 0.8, class: "professional" },
  { name: "Real Estate", riskMod: 0.9, class: "property" },
  { name: "Transportation", riskMod: 1.5, class: "fleet" },
  { name: "Energy / Oil & Gas", riskMod: 1.6, class: "industrial" },
  { name: "Cannabis", riskMod: 1.8, class: "specialty" },
  { name: "Agriculture", riskMod: 1.2, class: "specialty" },
  { name: "Entertainment / Events", riskMod: 1.3, class: "service" },
  { name: "Marine", riskMod: 1.4, class: "specialty" },
  { name: "Aviation", riskMod: 1.7, class: "specialty" },
  { name: "Mining", riskMod: 1.6, class: "industrial" },
  { name: "Food & Beverage", riskMod: 1.0, class: "service" },
  { name: "Retail", riskMod: 0.7, class: "service" },
  { name: "Professional Services", riskMod: 0.6, class: "professional" }
];

const STATES = [
  { name: "FL", catRisk: 1.5, label: "Florida", surplus: true },
  { name: "CA", catRisk: 1.3, label: "California", surplus: true },
  { name: "TX", catRisk: 1.2, label: "Texas", surplus: false },
  { name: "LA", catRisk: 1.4, label: "Louisiana", surplus: true },
  { name: "NY", catRisk: 0.8, label: "New York", surplus: true },
  { name: "IL", catRisk: 0.9, label: "Illinois", surplus: false },
  { name: "OH", catRisk: 0.7, label: "Ohio", surplus: false },
  { name: "CO", catRisk: 0.8, label: "Colorado", surplus: false },
  { name: "WA", catRisk: 0.7, label: "Washington", surplus: false },
  { name: "NC", catRisk: 1.1, label: "North Carolina", surplus: false },
  { name: "OK", catRisk: 1.3, label: "Oklahoma", surplus: false },
  { name: "AZ", catRisk: 0.9, label: "Arizona", surplus: false }
];

const CARRIERS = [
  { name: "Markel Specialty", rating: "A", commission: 0.15, appetite: { specialty: 2, industrial: 1, professional: 1, service: 1, property: 0, fleet: 0, artisan: 1 }, maxTIV: 15000000, minPremium: 10000 },
  { name: "Lexington (AIG)", rating: "A+", commission: 0.12, appetite: { specialty: 1, industrial: 2, professional: 2, service: 2, property: 2, fleet: 1, artisan: 1 }, maxTIV: 50000000, minPremium: 25000 },
  { name: "Scottsdale (Nationwide)", rating: "A+", commission: 0.14, appetite: { specialty: 0, industrial: 1, professional: 1, service: 2, property: 1, fleet: 1, artisan: 2 }, maxTIV: 20000000, minPremium: 5000 },
  { name: "Lloyd's Syndicate 2003", rating: "A", commission: 0.10, appetite: { specialty: 2, industrial: 2, professional: 1, service: 0, property: 2, fleet: 2, artisan: 0 }, maxTIV: 100000000, minPremium: 50000 },
  { name: "Kinsale Capital", rating: "A", commission: 0.16, appetite: { specialty: 1, industrial: 1, professional: 0, service: 2, property: 1, fleet: 0, artisan: 2 }, maxTIV: 10000000, minPremium: 5000 },
  { name: "USLI (Berkshire)", rating: "A++", commission: 0.11, appetite: { specialty: 0, industrial: 0, professional: 2, service: 2, property: 1, fleet: 0, artisan: 1 }, maxTIV: 8000000, minPremium: 3000 },
  { name: "Colony (Argo)", rating: "A-", commission: 0.17, appetite: { specialty: 1, industrial: 2, professional: 0, service: 1, property: 2, fleet: 2, artisan: 1 }, maxTIV: 25000000, minPremium: 15000 },
  { name: "Nautilus (Berkley)", rating: "A+", commission: 0.13, appetite: { specialty: 2, industrial: 1, professional: 2, service: 1, property: 0, fleet: 1, artisan: 0 }, maxTIV: 30000000, minPremium: 20000 },
  { name: "Evanston (Markel)", rating: "A", commission: 0.15, appetite: { specialty: 1, industrial: 0, professional: 1, service: 2, property: 2, fleet: 0, artisan: 2 }, maxTIV: 12000000, minPremium: 5000 },
  { name: "StarStone (Enstar)", rating: "A-", commission: 0.18, appetite: { specialty: 2, industrial: 2, professional: 0, service: 0, property: 1, fleet: 2, artisan: 1 }, maxTIV: 40000000, minPremium: 30000 }
];

const RED_FLAGS = [
  "Prior carrier non-renewed for frequency", "3 large claims in last 5 years",
  "Ongoing litigation against the insured", "OSHA violations last 12 months",
  "Failed last fire inspection", "CEO under federal investigation",
  "Operating without required permits", "Previous arson investigation (inconclusive)",
  "Significant accounts receivable aging >90 days", "Key employee turnover >40% annually",
  "No formal safety program in place", "Located in flood zone, no flood policy",
  "Material misrepresentation on prior application", "Retroactive date gap in E&O coverage",
  "Unlicensed subcontractors on projects", "Multiple DOT violations",
  "Delinquent premium payments with prior carrier", "Cyber breach in last 24 months, no remediation plan",
  "Product recall in last 3 years", "Environmental cleanup order pending",
  "Bankruptcy filing in last 7 years", "Owner has personal liens exceeding $500K",
  "Declined by 3+ carriers this cycle", "Incomplete loss runs provided",
  "Prior fraud allegation (unresolved)"
];

const GREEN_FLAGS = [
  "Loss-free for 5+ years", "Dedicated risk management team", "ISO 9001 certified",
  "Long-standing carrier relationships", "Strong financials (A+ Dun & Bradstreet)",
  "Comprehensive safety training program", "Sprinklered building with central alarm",
  "No prior claims in this line of coverage", "SOC 2 Type II certified",
  "Board-level risk committee", "Formal incident response plan in place",
  "Unionized workforce with low turnover", "Recently upgraded all electrical/plumbing systems",
  "Multi-year retention with current carrier", "Fleet equipped with telematics and dashcams"
];

const CAT_EVENTS = [
  { name: "Hurricane Warning", states: ["FL", "LA", "TX", "NC"], lines: ["Commercial Property", "Builders Risk"], premiumMod: 1.5, lossChanceMod: 2.0 },
  { name: "Wildfire Season", states: ["CA", "CO", "WA", "AZ"], lines: ["Commercial Property", "Inland Marine"], premiumMod: 1.4, lossChanceMod: 1.8 },
  { name: "Cyber Attack Wave", states: null, lines: ["Cyber Liability", "Professional Liability (E&O)"], premiumMod: 1.3, lossChanceMod: 1.6 },
  { name: "Tort Reform Reversal", states: null, lines: ["General Liability", "Product Liability", "Professional Liability (E&O)"], premiumMod: 1.2, lossChanceMod: 1.4 },
  { name: "Tornado Outbreak", states: ["OK", "TX", "IL", "OH"], lines: ["Commercial Property"], premiumMod: 1.6, lossChanceMod: 2.2 },
  { name: "Nuclear Verdict Trend", states: null, lines: ["Commercial Auto", "General Liability", "Excess/Umbrella"], premiumMod: 1.3, lossChanceMod: 1.5 },
  { name: "Pandemic Resurgence", states: null, lines: ["Workers' Compensation", "Directors & Officers (D&O)"], premiumMod: 1.2, lossChanceMod: 1.3 },
  { name: "Social Inflation Spike", states: null, lines: ["General Liability", "Commercial Auto", "Product Liability"], premiumMod: 1.25, lossChanceMod: 1.4 },
  { name: "Reinsurance Treaty Collapse", states: null, lines: ["Excess/Umbrella", "Commercial Property"], premiumMod: 1.7, lossChanceMod: 1.3 }
];

const LIMIT_OPTIONS = [500000, 1000000, 2000000, 5000000, 10000000];
const RETENTION_OPTIONS = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000];

const DIFFICULTY = {
  easy:   { time: 60, timeFloor: 50, rounds: 12, lossChance: 0.45, overpriceThreshold: 1.6, fireThreshold: 0.80, prodTarget: 400000 },
  medium: { time: 50, timeFloor: 40, rounds: 15, lossChance: 0.60, overpriceThreshold: 1.35, fireThreshold: 0.70, prodTarget: 550000 },
  hard:   { time: 40, timeFloor: 30, rounds: 20, lossChance: 0.75, overpriceThreshold: 1.2, fireThreshold: 0.60, prodTarget: 800000 }
};

const PRIOR_CARRIERS = ["Zurich", "Hartford", "CNA", "Travelers", "Liberty Mutual", "None — new venture", "Declined to disclose", "None — non-renewed"];

// ====== UTILITY ======
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const pool = [...arr];
  const result = [];
  for (let i = 0; i < Math.min(n, pool.length); i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randf(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function fmt(n) { return '$' + Math.round(n).toLocaleString(); }
function fmtShort(n) {
  if (n >= 1000000) return '$' + (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + Math.round(n/1000) + 'K';
  return '$' + n.toLocaleString();
}
function pct(n) { return (n * 100).toFixed(1) + '%'; }

// ====== CORE GAME LOGIC (extracted from index.html) ======

function generateSubmission(activeCatEvent, difficulty) {
  const industry = pick(INDUSTRIES);
  const compatibleCoverage = COVERAGE_TYPES.filter(c => !c.industries || c.industries.includes(industry.name));
  const coverage = pick(compatibleCoverage);
  const loc = pick(STATES);
  const tiv = rand(500000, 25000000);
  const yearsInBusiness = rand(1, 50);
  const employees = rand(5, 2000);
  const priorLosses = rand(0, 8);
  const claimsFiveYear = rand(0, 10);
  const currentCarrier = Math.random() > 0.3 ? pick(PRIOR_CARRIERS.slice(0, 5)) : pick(PRIOR_CARRIERS.slice(5));

  let riskScore = 0;
  riskScore += (industry.riskMod - 0.6) / 1.4 * 0.25;
  riskScore += (loc.catRisk - 0.7) / 0.9 * 0.15;
  riskScore += clamp(claimsFiveYear / 6, 0, 1) * 0.2;
  riskScore += clamp((50 - yearsInBusiness) / 50, 0, 1) * 0.1;
  riskScore += (priorLosses > 4 ? 0.18 : priorLosses > 2 ? 0.1 : priorLosses > 0 ? 0.04 : 0);
  if (currentCarrier === "None — non-renewed") riskScore += 0.15;
  if (currentCarrier === "Declined to disclose") riskScore += 0.1;
  if (currentCarrier === "None — new venture") riskScore += 0.05;

  const numRedFlags = riskScore > 0.5 ? rand(1, 3) : (riskScore > 0.3 ? rand(0, 2) : rand(0, 1));
  const numGreenFlags = riskScore < 0.3 ? rand(2, 3) : (riskScore < 0.5 ? rand(0, 2) : rand(0, 1));
  riskScore += numRedFlags * 0.06;
  riskScore -= numGreenFlags * 0.06;
  riskScore = clamp(riskScore, 0.05, 0.95);

  const selectedRedFlags = pickN(RED_FLAGS, numRedFlags);
  const selectedGreenFlags = pickN(GREEN_FLAGS, numGreenFlags);

  let fairPremium = tiv * coverage.baseRate * industry.riskMod * loc.catRisk;
  fairPremium *= (1 + (claimsFiveYear * 0.1));
  fairPremium *= (1 + numRedFlags * 0.12);
  fairPremium *= (1 - numGreenFlags * 0.05);

  let catMod = 1.0;
  if (activeCatEvent) {
    const ce = activeCatEvent;
    const lineMatch = ce.lines.includes(coverage.name);
    const stateMatch = !ce.states || ce.states.includes(loc.name);
    if (lineMatch && stateMatch) catMod = ce.premiumMod;
    else if (lineMatch || stateMatch) catMod = 1 + (ce.premiumMod - 1) * 0.4;
  }
  fairPremium *= catMod;
  fairPremium = Math.round(fairPremium / 100) * 100;

  let lossChance = riskScore * DIFFICULTY[difficulty].lossChance;
  if (activeCatEvent) {
    const ce = activeCatEvent;
    const lineMatch = ce.lines.includes(coverage.name);
    const stateMatch = !ce.states || ce.states.includes(loc.name);
    if (lineMatch && stateMatch) lossChance *= ce.lossChanceMod;
    else if (lineMatch || stateMatch) lossChance *= 1 + (ce.lossChanceMod - 1) * 0.3;
  }
  lossChance = clamp(lossChance, 0.05, 0.90);

  const suggestedLimit = Math.min(tiv, tiv < 2000000 ? 1000000 : (tiv < 10000000 ? 2000000 : 5000000));
  const rawRetention = fairPremium * 0.15;
  const suggestedRetention = rawRetention < 5000 ? Math.round(rawRetention / 1000) * 1000 || 1000
    : rawRetention < 25000 ? Math.round(rawRetention / 5000) * 5000
    : Math.round(rawRetention / 10000) * 10000;

  return {
    industry, coverage, state: loc,
    tiv, yearsInBusiness, employees,
    priorLosses, claimsFiveYear, currentCarrier,
    redFlags: selectedRedFlags,
    greenFlags: selectedGreenFlags,
    riskScore, fairPremium, lossChance, catMod,
    suggestedLimit, suggestedRetention,
    isSurplus: loc.surplus || industry.riskMod > 1.3 || numRedFlags > 1,
    numRedFlags, numGreenFlags
  };
}

function selectCarriersForSubmission(industry, coverage, tiv, fairPremium, carrierRelationships) {
  const scored = CARRIERS.map(c => {
    const appetiteScore = c.appetite[industry.class] || 0;
    const rel = carrierRelationships[c.name] || { score: 50 };
    const tivOk = tiv <= c.maxTIV;
    const premOk = fairPremium >= c.minPremium;
    const suspended = rel.score < 20;

    let available = appetiteScore > 0 && tivOk && premOk && !suspended;
    if (available && appetiteScore === 1 && Math.random() < 0.3) available = false;

    return { carrier: c, appetiteScore, available, suspended, tivOk, premOk };
  });

  const available = scored.filter(s => s.available).sort((a, b) => b.appetiteScore - a.appetiteScore);
  const unavailable = scored.filter(s => !s.available);

  let selected = [];
  const numAvail = Math.min(available.length, rand(1, 3));
  selected = available.slice(0, numAvail);
  while (selected.length < 3 && unavailable.length > 0) {
    selected.push(unavailable.splice(rand(0, unavailable.length - 1), 1)[0]);
  }
  selected.sort(() => Math.random() - 0.5);
  return selected;
}

// ====== SIMULATION ENGINE ======

function simulateGame(difficulty, strategy) {
  const diff = DIFFICULTY[difficulty];
  const carrierRelationships = {};
  CARRIERS.forEach(c => { carrierRelationships[c.name] = { score: 50, binds: 0, losses: 0 }; });

  let gs = {
    round: 0, totalRounds: diff.rounds, revenue: 0,
    totalPremium: 0, totalLosses: 0, totalExpenses: 0,
    totalBinds: 0, totalDeclines: 0, totalRefers: 0,
    goodBinds: 0, badBinds: 0, goodDeclines: 0, badDeclines: 0,
    activeCatEvent: null, catEventRoundsLeft: 0,
    firedReason: null
  };

  const issues = []; // collect bugs/oddities
  const roundLog = [];

  for (let r = 1; r <= diff.rounds; r++) {
    if (gs.firedReason) break;
    gs.round = r;

    // Cat events
    if (gs.catEventRoundsLeft > 0) {
      gs.catEventRoundsLeft--;
      if (gs.catEventRoundsLeft === 0) gs.activeCatEvent = null;
    } else if (Math.random() < 0.18 && r > 2) {
      gs.activeCatEvent = pick(CAT_EVENTS);
      gs.catEventRoundsLeft = rand(2, 5);
    }

    const sub = generateSubmission(gs.activeCatEvent, difficulty);
    const carriers = selectCarriersForSubmission(sub.industry, sub.coverage, sub.tiv, sub.fairPremium, carrierRelationships);
    const availableCarriers = carriers.filter(c => c.available);

    // ---- VALIDATION CHECKS ----

    // Check: fairPremium should be positive
    if (sub.fairPremium <= 0) {
      issues.push({ type: 'BUG', round: r, msg: `fairPremium is ${sub.fairPremium} (<=0)`, sub });
    }

    // Check: riskScore should be in [0.05, 0.95]
    if (sub.riskScore < 0.05 || sub.riskScore > 0.95) {
      issues.push({ type: 'BUG', round: r, msg: `riskScore out of bounds: ${sub.riskScore}`, sub });
    }

    // Check: lossChance should be in [0.05, 0.90]
    if (sub.lossChance < 0.05 || sub.lossChance > 0.90) {
      issues.push({ type: 'BUG', round: r, msg: `lossChance out of bounds: ${sub.lossChance}`, sub });
    }

    // Check: should always have at least 1 carrier in the list (even if unavailable)
    if (carriers.length === 0) {
      issues.push({ type: 'BUG', round: r, msg: 'No carriers returned at all', sub });
    }

    // Check: limit options
    const limitOpts = LIMIT_OPTIONS.filter(l => l <= sub.tiv * 2);
    if (limitOpts.length === 0) {
      issues.push({ type: 'BUG', round: r, msg: `No limit options for TIV ${fmt(sub.tiv)}`, sub });
    }

    // Check: retention options
    const retentionOpts = RETENTION_OPTIONS.filter(rr => rr <= sub.fairPremium * 2);
    if (retentionOpts.length === 0) {
      issues.push({ type: 'BUG', round: r, msg: `No retention options for fairPremium ${fmt(sub.fairPremium)}`, sub });
    }

    // Check: suggested limit shouldn't exceed TIV
    if (sub.suggestedLimit > sub.tiv) {
      issues.push({ type: 'REALISM', round: r, msg: `Suggested limit ${fmtShort(sub.suggestedLimit)} > TIV ${fmtShort(sub.tiv)}`, sub });
    }

    // (TIV realism checks removed — exposure label now varies by line)

    // Check: retention should not exceed suggested limit
    if (sub.suggestedRetention > sub.suggestedLimit) {
      issues.push({ type: 'BUG', round: r, msg: `Suggested retention ${fmtShort(sub.suggestedRetention)} > suggested limit ${fmtShort(sub.suggestedLimit)}` });
    }

    // Check: no available carriers means player MUST decline
    if (availableCarriers.length === 0) {
      // Not necessarily a bug, but track frequency
      roundLog.push({ round: r, action: 'forced_decline', reason: 'no carriers available', sub });
    }

    // ---- STRATEGY EXECUTION ----
    let action, chosenCarrier, premium, limit, retention;

    if (availableCarriers.length === 0) {
      action = 'decline';
    } else {
      chosenCarrier = availableCarriers[0]; // pick first available

      // Set terms based on strategy
      switch (strategy.name) {
        case 'always_bind':
          action = 'bind';
          premium = sub.fairPremium; // price at market
          limit = sub.suggestedLimit;
          retention = sub.suggestedRetention;
          break;

        case 'always_decline':
          action = 'decline';
          break;

        case 'always_refer':
          action = 'refer';
          break;

        case 'smart':
          // Decline high risk, bind low risk at market, refer borderline
          if (sub.riskScore > 0.6) {
            action = 'decline';
          } else if (sub.riskScore > 0.45) {
            action = 'refer';
          } else {
            action = 'bind';
            premium = Math.round(sub.fairPremium * 1.05); // slight markup
            limit = sub.suggestedLimit;
            retention = sub.suggestedRetention;
          }
          break;

        case 'aggressive_pricer':
          // Always bind, price 40% above market
          action = 'bind';
          premium = Math.round(sub.fairPremium * 1.4);
          limit = sub.suggestedLimit;
          retention = sub.suggestedRetention;
          break;

        case 'underpricer':
          // Always bind, price 40% below market
          action = 'bind';
          premium = Math.round(sub.fairPremium * 0.6);
          limit = sub.suggestedLimit;
          retention = sub.suggestedRetention;
          break;

        case 'high_limit_low_retention':
          // Bind everything with max limit and min retention
          action = 'bind';
          premium = sub.fairPremium;
          limit = limitOpts[limitOpts.length - 1] || sub.suggestedLimit;
          retention = retentionOpts[0] || sub.suggestedRetention;
          break;

        case 'conservative_terms':
          // Bind with lowest limit and highest retention
          action = 'bind';
          premium = Math.round(sub.fairPremium * 1.1);
          limit = limitOpts[0] || sub.suggestedLimit;
          retention = retentionOpts[retentionOpts.length - 1] || sub.suggestedRetention;
          break;

        case 'random':
          action = pick(['bind', 'decline', 'refer']);
          premium = Math.round(sub.fairPremium * randf(0.5, 1.8));
          limit = pick(limitOpts) || sub.suggestedLimit;
          retention = pick(retentionOpts) || sub.suggestedRetention;
          break;
      }
    }

    // ---- EXECUTE ACTION ----
    if (action === 'bind' && chosenCarrier) {
      const selectedCarrier = chosenCarrier.carrier;
      const commission = Math.round(premium * selectedCarrier.commission);

      // Adjust fair premium for limit/retention choices (mirrors game logic)
      const limitFactor = clamp(limit / sub.suggestedLimit, 0.3, 2.0);
      const retentionFactor = clamp(1 - (retention - sub.suggestedRetention) / (sub.fairPremium * 2), 0.7, 1.1);
      const adjustedFairPremium = Math.round(sub.fairPremium * limitFactor * retentionFactor);
      const premiumRatio = premium / adjustedFairPremium;

      // Overpricing check
      if (premiumRatio > diff.overpriceThreshold && Math.random() < (premiumRatio - diff.overpriceThreshold) * 2) {
        const penalty = -Math.round(premium * 0.02);
        gs.revenue += penalty;
        gs.totalDeclines++;
        gs.badDeclines++;
        roundLog.push({ round: r, action: 'shopped', premium, fairPremium: sub.fairPremium, premiumRatio });
        continue;
      }

      // Min premium check
      if (premium < selectedCarrier.minPremium) {
        // In real game this bounces back — here we just note it
        issues.push({ type: 'GAMEPLAY', round: r, msg: `Strategy tried to bind at ${fmt(premium)} but carrier min is ${fmtShort(selectedCarrier.minPremium)}. Player would be stuck in a loop.` });
        // Fall back to decline
        gs.totalDeclines++;
        continue;
      }

      // Loss calc
      let adjLossChance = sub.lossChance;
      const limitRatio = limit / sub.tiv;
      adjLossChance *= (0.7 + limitRatio * 0.6);
      const retentionEffect = retention / (sub.fairPremium * 0.5);
      adjLossChance *= (1.2 - retentionEffect * 0.4);
      adjLossChance = clamp(adjLossChance, 0.05, 0.92);

      const lossOccurred = Math.random() < adjLossChance;
      let lossAmount = 0;

      if (lossOccurred) {
        const roll = Math.random();
        let severityMult;
        if (roll < 0.55) severityMult = randf(0.05, 0.4);
        else if (roll < 0.80) severityMult = randf(0.4, 1.0);
        else if (roll < 0.95) severityMult = randf(1.0, 2.5);
        else severityMult = randf(2.5, 5.0);
        const rawLoss = premium * severityMult * (0.5 + sub.riskScore);
        lossAmount = Math.max(0, Math.round((rawLoss - retention) / 100) * 100);
      }

      // Check: loss amount sanity
      if (lossAmount > limit) {
        issues.push({ type: 'BUG', round: r, msg: `Loss ${fmt(lossAmount)} exceeds limit ${fmtShort(limit)}` });
      }
      if (lossAmount < 0) {
        issues.push({ type: 'BUG', round: r, msg: `Negative loss amount: ${lossAmount}` });
      }

      const expenses = Math.round(premium * 0.08);
      const lossHit = lossOccurred && lossAmount > 0 ? Math.round(Math.min(commission + lossAmount * 0.15, lossAmount * 0.35)) : 0;
      const netResult = commission - lossHit;
      gs.revenue += netResult;
      gs.totalPremium += premium;
      gs.totalLosses += lossAmount;
      gs.totalExpenses += expenses;
      gs.totalBinds++;
      if (lossOccurred && lossAmount > 0) gs.badBinds++; else gs.goodBinds++;

      // Update carrier relationship
      const rel = carrierRelationships[selectedCarrier.name];
      rel.binds++;
      if (lossOccurred && lossAmount > 0) {
        rel.losses++;
        rel.score -= Math.round((lossAmount / premium) * 15 + 5);
      } else {
        rel.score += 3;
      }
      rel.score = clamp(rel.score, 0, 100);

      roundLog.push({
        round: r, action: 'bind',
        carrier: selectedCarrier.name,
        premium, fairPremium: sub.fairPremium, premiumRatio,
        limit, retention, lossOccurred, lossAmount,
        commission, netResult, riskScore: sub.riskScore,
        industry: sub.industry.name, coverage: sub.coverage.name,
        state: sub.state.name, adjLossChance
      });

      // Check for firing
      const lr = gs.totalPremium > 0 ? gs.totalLosses / gs.totalPremium : 0;
      if (lr > diff.fireThreshold && gs.totalBinds > 3) {
        gs.firedReason = `Loss ratio hit ${pct(lr)}`;
      }

    } else if (action === 'refer') {
      gs.totalRefers++;
      const adminCost = -Math.round(sub.fairPremium * 0.02);
      const wouldBind = sub.riskScore < 0.6 && Math.random() > sub.riskScore;
      const override = wouldBind ? Math.round(sub.fairPremium * 0.005) : 0;
      gs.revenue += adminCost + override;
      roundLog.push({ round: r, action: 'refer', riskScore: sub.riskScore, wouldBind, cost: adminCost + override });

    } else {
      // decline
      const wouldHaveLost = Math.random() < sub.lossChance;
      let scoreImpact = 0;
      if (sub.riskScore > 0.55) {
        scoreImpact = 0;
        gs.goodDeclines++;
      } else if (sub.riskScore > 0.3) {
        if (wouldHaveLost) { scoreImpact = 0; gs.goodDeclines++; }
        else { scoreImpact = -Math.round(sub.fairPremium * 0.02); gs.badDeclines++; }
      } else {
        scoreImpact = -Math.round(sub.fairPremium * 0.04);
        gs.badDeclines++;
      }
      gs.revenue += scoreImpact;
      gs.totalDeclines++;
      roundLog.push({ round: r, action: 'decline', riskScore: sub.riskScore, wouldHaveLost, scoreImpact });
    }
  }

  const lr = gs.totalPremium > 0 ? gs.totalLosses / gs.totalPremium : 0;
  const cr = gs.totalPremium > 0 ? (gs.totalLosses + gs.totalExpenses) / gs.totalPremium : 0;

  return { gs, issues, roundLog, lr, cr, carrierRelationships };
}

// ====== RUN SIMULATIONS ======

const STRATEGIES = [
  { name: 'always_bind' },
  { name: 'always_decline' },
  { name: 'always_refer' },
  { name: 'smart' },
  { name: 'aggressive_pricer' },
  { name: 'underpricer' },
  { name: 'high_limit_low_retention' },
  { name: 'conservative_terms' },
  { name: 'random' }
];

const RUNS_PER_COMBO = 200;
const allIssues = new Map(); // dedup
const results = {};

console.log('='.repeat(80));
console.log('THE BINDING AUTHORITY — Simulation Report');
console.log('='.repeat(80));
console.log(`Running ${RUNS_PER_COMBO} games per strategy x difficulty...\n`);

for (const difficulty of ['easy', 'medium', 'hard']) {
  for (const strategy of STRATEGIES) {
    const key = `${difficulty}/${strategy.name}`;
    const runs = [];

    for (let i = 0; i < RUNS_PER_COMBO; i++) {
      const result = simulateGame(difficulty, strategy);
      runs.push(result);

      // Collect unique issues
      for (const issue of result.issues) {
        const dedup = `${issue.type}:${issue.msg}`;
        if (!allIssues.has(dedup)) {
          allIssues.set(dedup, { ...issue, count: 1 });
        } else {
          allIssues.get(dedup).count++;
        }
      }
    }

    // Aggregate stats
    const revenues = runs.map(r => r.gs.revenue);
    const lrs = runs.filter(r => r.gs.totalPremium > 0).map(r => r.lr);
    const crs = runs.filter(r => r.gs.totalPremium > 0).map(r => r.cr);
    const binds = runs.map(r => r.gs.totalBinds);
    const fired = runs.filter(r => r.gs.firedReason).length;
    const noCarrierRounds = runs.flatMap(r => r.roundLog.filter(l => l.action === 'forced_decline')).length;
    const shoppedRounds = runs.flatMap(r => r.roundLog.filter(l => l.action === 'shopped')).length;

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const med = arr => { const s = [...arr].sort((a,b) => a - b); return s[Math.floor(s.length/2)] || 0; };
    const min = arr => arr.length ? Math.min(...arr) : 0;
    const max = arr => arr.length ? Math.max(...arr) : 0;

    results[key] = {
      revenue: { avg: avg(revenues), med: med(revenues), min: min(revenues), max: max(revenues) },
      lr: { avg: avg(lrs), med: med(lrs) },
      cr: { avg: avg(crs), med: med(crs) },
      binds: { avg: avg(binds) },
      fired: fired,
      firedPct: (fired / RUNS_PER_COMBO * 100).toFixed(0) + '%',
      noCarrierRounds,
      shoppedRounds
    };
  }
}

// ====== REPORT: STRATEGY COMPARISON ======

for (const difficulty of ['easy', 'medium', 'hard']) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`DIFFICULTY: ${difficulty.toUpperCase()}`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`${'Strategy'.padEnd(25)} ${'Avg Rev'.padEnd(12)} ${'Med Rev'.padEnd(12)} ${'Avg LR'.padEnd(10)} ${'Avg CR'.padEnd(10)} ${'Binds'.padEnd(8)} ${'Fired'.padEnd(8)} Shopped`);

  for (const strategy of STRATEGIES) {
    const key = `${difficulty}/${strategy.name}`;
    const r = results[key];
    console.log(
      `${strategy.name.padEnd(25)} ` +
      `${fmt(Math.round(r.revenue.avg)).padEnd(12)} ` +
      `${fmt(Math.round(r.revenue.med)).padEnd(12)} ` +
      `${pct(r.lr.avg).padEnd(10)} ` +
      `${pct(r.cr.avg).padEnd(10)} ` +
      `${r.binds.avg.toFixed(1).padEnd(8)} ` +
      `${r.firedPct.padEnd(8)} ` +
      `${r.shoppedRounds}`
    );
  }
}

// ====== REPORT: ISSUES ======

console.log(`\n${'='.repeat(80)}`);
console.log('ISSUES FOUND');
console.log(`${'='.repeat(80)}`);

const issuesByType = { BUG: [], REALISM: [], GAMEPLAY: [] };
for (const [_, issue] of allIssues) {
  (issuesByType[issue.type] || []).push(issue);
}

for (const type of ['BUG', 'REALISM', 'GAMEPLAY']) {
  const list = issuesByType[type];
  if (list.length === 0) continue;
  console.log(`\n--- ${type} (${list.length} unique) ---`);
  for (const issue of list) {
    console.log(`  [x${issue.count}] ${issue.msg}`);
  }
}

// ====== REPORT: EDGE CASES ======

console.log(`\n${'='.repeat(80)}`);
console.log('EDGE CASE ANALYSIS');
console.log(`${'='.repeat(80)}`);

// Check premium ranges
console.log('\nPremium distribution across 5000 submissions:');
const premiums = [];
const lossChances = [];
const riskScores = [];
for (let i = 0; i < 5000; i++) {
  const sub = generateSubmission(null, 'medium');
  premiums.push(sub.fairPremium);
  lossChances.push(sub.lossChance);
  riskScores.push(sub.riskScore);
}

const buckets = { '<$1K': 0, '$1K-$5K': 0, '$5K-$25K': 0, '$25K-$100K': 0, '$100K-$500K': 0, '$500K+': 0 };
for (const p of premiums) {
  if (p < 1000) buckets['<$1K']++;
  else if (p < 5000) buckets['$1K-$5K']++;
  else if (p < 25000) buckets['$5K-$25K']++;
  else if (p < 100000) buckets['$25K-$100K']++;
  else if (p < 500000) buckets['$100K-$500K']++;
  else buckets['$500K+']++;
}
for (const [k, v] of Object.entries(buckets)) {
  console.log(`  ${k.padEnd(15)} ${v} (${(v/50).toFixed(1)}%)`);
}

console.log('\nRisk score distribution:');
const rsBuckets = { 'Very Low (0-0.2)': 0, 'Low (0.2-0.4)': 0, 'Medium (0.4-0.6)': 0, 'High (0.6-0.8)': 0, 'Very High (0.8+)': 0 };
for (const rs of riskScores) {
  if (rs < 0.2) rsBuckets['Very Low (0-0.2)']++;
  else if (rs < 0.4) rsBuckets['Low (0.2-0.4)']++;
  else if (rs < 0.6) rsBuckets['Medium (0.4-0.6)']++;
  else if (rs < 0.8) rsBuckets['High (0.6-0.8)']++;
  else rsBuckets['Very High (0.8+)']++;
}
for (const [k, v] of Object.entries(rsBuckets)) {
  console.log(`  ${k.padEnd(22)} ${v} (${(v/50).toFixed(1)}%)`);
}

console.log('\nLoss chance distribution (medium difficulty):');
const lcBuckets = { '<10%': 0, '10-20%': 0, '20-35%': 0, '35-50%': 0, '50-70%': 0, '70%+': 0 };
for (const lc of lossChances) {
  if (lc < 0.1) lcBuckets['<10%']++;
  else if (lc < 0.2) lcBuckets['10-20%']++;
  else if (lc < 0.35) lcBuckets['20-35%']++;
  else if (lc < 0.5) lcBuckets['35-50%']++;
  else if (lc < 0.7) lcBuckets['50-70%']++;
  else lcBuckets['70%+']++;
}
for (const [k, v] of Object.entries(lcBuckets)) {
  console.log(`  ${k.padEnd(15)} ${v} (${(v/50).toFixed(1)}%)`);
}

// Check: carrier availability
console.log('\nCarrier availability (% of rounds with 0, 1, 2, 3 available):');
const carrierCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
const carrierRels = {};
CARRIERS.forEach(c => { carrierRels[c.name] = { score: 50, binds: 0, losses: 0 }; });
for (let i = 0; i < 5000; i++) {
  const sub = generateSubmission(null, 'medium');
  const cs = selectCarriersForSubmission(sub.industry, sub.coverage, sub.tiv, sub.fairPremium, carrierRels);
  const avail = cs.filter(c => c.available).length;
  carrierCounts[avail]++;
}
for (const [k, v] of Object.entries(carrierCounts)) {
  console.log(`  ${k} available:  ${v} (${(v/50).toFixed(1)}%)`);
}

// Check: smart strategy should outperform always_bind
console.log('\n--- BALANCE CHECK ---');
for (const diff of ['easy', 'medium', 'hard']) {
  const smart = results[`${diff}/smart`];
  const bind = results[`${diff}/always_bind`];
  const decline = results[`${diff}/always_decline`];
  const refer = results[`${diff}/always_refer`];
  console.log(`${diff}: smart avg=${fmt(Math.round(smart.revenue.avg))}, always_bind avg=${fmt(Math.round(bind.revenue.avg))}, always_decline avg=${fmt(Math.round(decline.revenue.avg))}, always_refer avg=${fmt(Math.round(refer.revenue.avg))}`);
  if (bind.revenue.avg > smart.revenue.avg) {
    console.log(`  ⚠ BALANCE: always_bind beats smart on ${diff} by avg revenue (but ${bind.firedPct} get fired vs ${smart.firedPct}).`);
  }
  if (decline.revenue.avg > smart.revenue.avg) {
    console.log(`  ⚠ BALANCE: always_decline beats smart on ${diff}!`);
  }
  if (decline.revenue.avg > 0) {
    console.log(`  ⚠ BALANCE: always_decline has positive revenue on ${diff}!`);
  }
  if (refer.revenue.avg > decline.revenue.avg) {
    console.log(`  ⚠ BALANCE: always_refer beats always_decline on ${diff} — referring should be worse than declining.`);
  }
}

// ====== GRADING AUDIT ======

console.log(`\n${'='.repeat(80)}`);
console.log('GRADING AUDIT');
console.log(`${'='.repeat(80)}`);

function computeGrade(gs, totalRounds) {
  const lr = gs.totalPremium > 0 ? gs.totalLosses / gs.totalPremium : 0;
  const cr = gs.totalPremium > 0 ? (gs.totalLosses + gs.totalExpenses) / gs.totalPremium : 0;
  const accuracy = totalRounds > 0 ? (gs.goodBinds + gs.goodDeclines) / Math.max(1, gs.totalBinds + gs.totalDeclines) : 0;

  if (gs.firedReason) return 'F';

  const referPenalty = Math.max(0, (gs.totalRefers || 0) - Math.round(totalRounds * 0.25)) * 5;
  const bindRate = gs.totalBinds / totalRounds;
  const bindPenalty = bindRate < 0.3 ? 40 : (bindRate < 0.5 ? 20 : 0);
  const revPoints = Math.min(30, gs.revenue / 1000) + (gs.revenue > 30000 ? Math.min(15, (gs.revenue - 30000) / 5000) : 0);
  const score = revPoints + (accuracy * 50) - (lr * 120) - (cr > 1 ? 30 : 0) - referPenalty - bindPenalty;

  // Production target penalty
  const prodTarget = DIFFICULTY[Object.keys(DIFFICULTY).find(k => DIFFICULTY[k].rounds === totalRounds) || 'medium'].prodTarget;
  const prodPenalty = gs.totalPremium >= prodTarget ? 0 : 15;
  const finalScore = score - prodPenalty;

  if (finalScore > 75) return 'A+';
  if (finalScore > 55) return 'A';
  if (finalScore > 35) return 'B+';
  if (finalScore > 15) return 'B';
  if (finalScore > 0) return 'C';
  if (finalScore > -15) return 'D';
  return 'F';
}

for (const diff of ['easy', 'medium', 'hard']) {
  console.log(`\n--- ${diff.toUpperCase()} ---`);
  for (const strat of STRATEGIES) {
    const key = `${diff}/${strat.name}`;
    const runs = [];
    for (let i = 0; i < 200; i++) runs.push(simulateGame(diff, strat));
    const gradeCounts = {};
    for (const r of runs) {
      const g = computeGrade(r.gs, DIFFICULTY[diff].rounds);
      gradeCounts[g] = (gradeCounts[g] || 0) + 1;
    }
    const gradeStr = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'].map(g => `${g}:${gradeCounts[g]||0}`).join(' ');
    console.log(`  ${strat.name.padEnd(25)} ${gradeStr}`);
  }
}

// Grade sanity checks
console.log('\n--- GRADE SANITY CHECKS ---');
const gradeChecks = [];

// always_decline should never get above C
for (const diff of ['easy', 'medium', 'hard']) {
  const runs = [];
  for (let i = 0; i < 500; i++) runs.push(simulateGame(diff, { name: 'always_decline' }));
  const goodGrades = runs.filter(r => {
    const g = computeGrade(r.gs, DIFFICULTY[diff].rounds);
    return g === 'A+' || g === 'A' || g === 'B+' || g === 'B';
  }).length;
  if (goodGrades > 0) {
    gradeChecks.push(`⚠ always_decline got B or better ${goodGrades}/500 times on ${diff}`);
  } else {
    gradeChecks.push(`✓ always_decline never gets B or better on ${diff}`);
  }
}

// always_refer should never get above C
for (const diff of ['easy', 'medium', 'hard']) {
  const runs = [];
  for (let i = 0; i < 500; i++) runs.push(simulateGame(diff, { name: 'always_refer' }));
  const goodGrades = runs.filter(r => {
    const g = computeGrade(r.gs, DIFFICULTY[diff].rounds);
    return g === 'A+' || g === 'A' || g === 'B+' || g === 'B';
  }).length;
  if (goodGrades > 0) {
    gradeChecks.push(`⚠ always_refer got B or better ${goodGrades}/500 times on ${diff}`);
  } else {
    gradeChecks.push(`✓ always_refer never gets B or better on ${diff}`);
  }
}

// smart should get A+ or A at least sometimes
for (const diff of ['easy', 'medium', 'hard']) {
  const runs = [];
  for (let i = 0; i < 500; i++) runs.push(simulateGame(diff, { name: 'smart' }));
  const aGrades = runs.filter(r => {
    const g = computeGrade(r.gs, DIFFICULTY[diff].rounds);
    return g === 'A+' || g === 'A';
  }).length;
  const fGrades = runs.filter(r => computeGrade(r.gs, DIFFICULTY[diff].rounds) === 'F').length;
  gradeChecks.push(`${aGrades > 50 ? '✓' : '⚠'} smart gets A+/A ${aGrades}/500 times on ${diff} (F: ${fGrades}/500)`);
}

// fired players should always get F
for (const diff of ['easy', 'medium', 'hard']) {
  const runs = [];
  for (let i = 0; i < 500; i++) runs.push(simulateGame(diff, { name: 'always_bind' }));
  const firedNotF = runs.filter(r => r.gs.firedReason && computeGrade(r.gs, DIFFICULTY[diff].rounds) !== 'F').length;
  if (firedNotF > 0) {
    gradeChecks.push(`⚠ ${firedNotF}/500 fired players did NOT get F on ${diff}`);
  } else {
    gradeChecks.push(`✓ All fired players get F on ${diff}`);
  }
}

for (const check of gradeChecks) console.log(`  ${check}`);

// ====== ECONOMIC REALISM ======

console.log(`\n${'='.repeat(80)}`);
console.log('ECONOMIC REALISM CHECKS');
console.log(`${'='.repeat(80)}`);

// Run 500 smart games on medium to get realistic averages
const econRuns = [];
for (let i = 0; i < 500; i++) econRuns.push(simulateGame('medium', { name: 'smart' }));
const completedRuns = econRuns.filter(r => !r.gs.firedReason);
const firedRuns = econRuns.filter(r => r.gs.firedReason);

console.log(`\nSmart strategy, medium difficulty (500 games, ${completedRuns.length} completed, ${firedRuns.length} fired):`);

// Average premium per bind
const allSmartBinds = completedRuns.flatMap(r => r.roundLog.filter(l => l.action === 'bind'));
const avgPremPerBind = avg(allSmartBinds.map(b => b.premium));
console.log(`  Avg premium per bind: ${fmtShort(avgPremPerBind)}`);

// Commission per bind
const avgCommPerBind = avg(allSmartBinds.map(b => b.commission));
console.log(`  Avg commission per bind: ${fmtShort(avgCommPerBind)}`);

// Commission as % of premium
console.log(`  Avg commission rate: ${(avgCommPerBind/avgPremPerBind*100).toFixed(1)}%`);

// Total premium per completed game
const avgTotalPrem = avg(completedRuns.map(r => r.gs.totalPremium));
console.log(`  Avg total premium per game: ${fmtShort(avgTotalPrem)}`);

// Revenue per completed game
const avgRevCompleted = avg(completedRuns.map(r => r.gs.revenue));
console.log(`  Avg revenue (completed games): ${fmtShort(avgRevCompleted)}`);

// Loss ratio for completed games
const avgLR = avg(completedRuns.filter(r => r.gs.totalPremium > 0).map(r => r.gs.totalLosses / r.gs.totalPremium));
console.log(`  Avg loss ratio (completed): ${(avgLR * 100).toFixed(1)}%`);

// Combined ratio
const avgCR = avg(completedRuns.filter(r => r.gs.totalPremium > 0).map(r => (r.gs.totalLosses + r.gs.totalExpenses) / r.gs.totalPremium));
console.log(`  Avg combined ratio (completed): ${(avgCR * 100).toFixed(1)}%`);

// Binds per game
const avgBindsCompleted = avg(completedRuns.map(r => r.gs.totalBinds));
console.log(`  Avg binds per game: ${avgBindsCompleted.toFixed(1)} / ${DIFFICULTY.medium.rounds}`);

// Largest single loss
const maxSingleLoss = Math.max(...allSmartBinds.filter(b => b.lossAmount > 0).map(b => b.lossAmount));
console.log(`  Largest single loss: ${fmtShort(maxSingleLoss)}`);

// Realism checks
console.log('\n--- REALISM VERDICTS ---');
const verdicts = [];

if (avgPremPerBind > 10000 && avgPremPerBind < 500000) verdicts.push(`✓ Avg premium ${fmtShort(avgPremPerBind)} is realistic for middle-market E&S`);
else verdicts.push(`⚠ Avg premium ${fmtShort(avgPremPerBind)} outside typical middle-market range ($10K-$500K)`);

if (avgCommPerBind/avgPremPerBind > 0.08 && avgCommPerBind/avgPremPerBind < 0.20) verdicts.push(`✓ Commission rate ${(avgCommPerBind/avgPremPerBind*100).toFixed(1)}% is in normal E&S range (8-20%)`);
else verdicts.push(`⚠ Commission rate ${(avgCommPerBind/avgPremPerBind*100).toFixed(1)}% outside normal E&S range`);

if (avgLR > 0.05 && avgLR < 0.70) verdicts.push(`✓ Loss ratio ${(avgLR*100).toFixed(0)}% is realistic for a selective book`);
else verdicts.push(`⚠ Loss ratio ${(avgLR*100).toFixed(0)}% seems ${avgLR < 0.05 ? 'too low' : 'too high'} for a selective strategy`);

if (avgCR > 0.15 && avgCR < 0.80) verdicts.push(`✓ Combined ratio ${(avgCR*100).toFixed(0)}% is realistic`);
else verdicts.push(`⚠ Combined ratio ${(avgCR*100).toFixed(0)}% seems off`);

if (avgBindsCompleted > 3 && avgBindsCompleted < 15) verdicts.push(`✓ Bind rate ${avgBindsCompleted.toFixed(1)}/20 is reasonable for selective placement`);
else verdicts.push(`⚠ Bind rate ${avgBindsCompleted.toFixed(1)}/20 seems ${avgBindsCompleted < 3 ? 'too selective' : 'too aggressive'}`);

const fireRate = firedRuns.length / econRuns.length;
if (fireRate > 0.01 && fireRate < 0.15) verdicts.push(`✓ Smart fire rate ${(fireRate*100).toFixed(0)}% adds tension without being unfair`);
else if (fireRate > 0.15) verdicts.push(`⚠ Smart fire rate ${(fireRate*100).toFixed(0)}% may be frustrating`);
else verdicts.push(`⚠ Smart fire rate ${(fireRate*100).toFixed(0)}% — no real risk of losing`);

if (maxSingleLoss < 10000000) verdicts.push(`✓ Max single loss ${fmtShort(maxSingleLoss)} within realistic bounds`);
else verdicts.push(`⚠ Max single loss ${fmtShort(maxSingleLoss)} seems extreme`);

// Check retention/premium ratio
const retPremRatios = [];
for (let i = 0; i < 2000; i++) {
  const sub = generateSubmission(null, 'medium');
  retPremRatios.push(sub.suggestedRetention / sub.fairPremium);
}
const avgRetPrem = avg(retPremRatios);
if (avgRetPrem > 0.08 && avgRetPrem < 0.30) verdicts.push(`✓ Avg retention/premium ratio ${(avgRetPrem*100).toFixed(0)}% is realistic (target: 10-25%)`);
else verdicts.push(`⚠ Avg retention/premium ratio ${(avgRetPrem*100).toFixed(0)}% outside realistic range`);

for (const v of verdicts) console.log(`  ${v}`);

// ====== REALISM ANALYSIS ======

console.log(`\n${'='.repeat(80)}`);
console.log('INSURANCE REALISM ANALYSIS');
console.log(`${'='.repeat(80)}`);

// 1. Premium ranges by line of business
console.log('\nAvg fair premium by coverage (5000 submissions):');
const premByLine = {};
const tivByLine = {};
for (let i = 0; i < 5000; i++) {
  const sub = generateSubmission(null, 'medium');
  if (!premByLine[sub.coverage.abbr]) { premByLine[sub.coverage.abbr] = []; tivByLine[sub.coverage.abbr] = []; }
  premByLine[sub.coverage.abbr].push(sub.fairPremium);
  tivByLine[sub.coverage.abbr].push(sub.tiv);
}
for (const [line, prems] of Object.entries(premByLine).sort((a,b) => avg(b[1]) - avg(a[1]))) {
  const avgPrem = avg(prems);
  const avgTiv = avg(tivByLine[line]);
  const impliedRate = avgPrem / avgTiv;
  console.log(`  ${line.padEnd(8)} avg prem: ${fmtShort(avgPrem).padEnd(10)} avg exposure: ${fmtShort(avgTiv).padEnd(10)} implied rate: ${(impliedRate * 100).toFixed(2)}%`);
}

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

// 2. Check for nonsensical combinations
console.log('\nCoverage/Industry combination sanity (5000 submissions):');
const weirdCombos = {};
for (let i = 0; i < 5000; i++) {
  const sub = generateSubmission(null, 'medium');
  // Flag odd combos that a real broker would never see
  const combo = `${sub.coverage.name} + ${sub.industry.name}`;
  if (
    (sub.coverage.name === "Builders Risk" && !["Construction", "Real Estate"].includes(sub.industry.name)) ||
    (sub.coverage.name === "Inland Marine" && ["Technology", "Professional Services", "Healthcare"].includes(sub.industry.name)) ||
    (sub.coverage.name === "Commercial Auto" && sub.industry.name === "Technology" && sub.employees < 20) ||
    (sub.coverage.name === "Environmental Liability" && ["Technology", "Professional Services", "Retail"].includes(sub.industry.name)) ||
    (sub.coverage.name === "Product Liability" && ["Professional Services", "Real Estate"].includes(sub.industry.name)) ||
    (sub.coverage.name === "Workers' Compensation" && sub.employees < 3)
  ) {
    weirdCombos[combo] = (weirdCombos[combo] || 0) + 1;
  }
}
if (Object.keys(weirdCombos).length > 0) {
  console.log('  Unlikely combos found:');
  for (const [combo, count] of Object.entries(weirdCombos).sort((a,b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`    [x${count}] ${combo}`);
  }
} else {
  console.log('  No obviously wrong combos detected.');
}

// 3. Check loss severity vs. real-world patterns
console.log('\nLoss severity analysis (smart strategy, medium, binds only):');
const smartRuns = [];
for (let i = 0; i < 500; i++) {
  smartRuns.push(simulateGame('medium', { name: 'smart' }));
}
const allLosses = smartRuns.flatMap(r => r.roundLog.filter(l => l.action === 'bind' && l.lossOccurred && l.lossAmount > 0));
const allBinds = smartRuns.flatMap(r => r.roundLog.filter(l => l.action === 'bind'));
if (allLosses.length > 0) {
  const lossToPremRatios = allLosses.map(l => l.lossAmount / l.premium);
  const avgRatio = avg(lossToPremRatios);
  const maxRatio = Math.max(...lossToPremRatios);
  const lossFreq = allLosses.length / allBinds.length;
  console.log(`  Total binds: ${allBinds.length}, Claims: ${allLosses.length} (${(lossFreq * 100).toFixed(1)}% frequency)`);
  console.log(`  Avg loss/premium ratio: ${avgRatio.toFixed(2)}x`);
  console.log(`  Max loss/premium ratio: ${maxRatio.toFixed(1)}x`);
  console.log(`  Avg loss amount: ${fmtShort(avg(allLosses.map(l => l.lossAmount)))}`);
  console.log(`  Max loss amount: ${fmtShort(Math.max(...allLosses.map(l => l.lossAmount)))}`);

  // Severity buckets
  const sevBuckets = { 'Attritional (<0.5x prem)': 0, 'Moderate (0.5-2x)': 0, 'Significant (2-5x)': 0, 'Catastrophic (>5x)': 0 };
  for (const r of lossToPremRatios) {
    if (r < 0.5) sevBuckets['Attritional (<0.5x prem)']++;
    else if (r < 2) sevBuckets['Moderate (0.5-2x)']++;
    else if (r < 5) sevBuckets['Significant (2-5x)']++;
    else sevBuckets['Catastrophic (>5x)']++;
  }
  for (const [k, v] of Object.entries(sevBuckets)) {
    console.log(`    ${k.padEnd(30)} ${v} (${(v/allLosses.length*100).toFixed(1)}%)`);
  }
}

// 4. Commission analysis
console.log('\nCommission analysis:');
const commissions = allBinds.map(b => b.commission);
const commissionRates = allBinds.map(b => b.commission / b.premium);
console.log(`  Avg commission: ${fmtShort(avg(commissions))}`);
console.log(`  Avg commission rate: ${(avg(commissionRates) * 100).toFixed(1)}%`);
console.log(`  Range: ${(Math.min(...commissionRates) * 100).toFixed(0)}% — ${(Math.max(...commissionRates) * 100).toFixed(0)}%`);

// 5. Cat event impact
console.log('\nCat event frequency (across all smart runs):');
const catEvents = smartRuns.flatMap(r => r.roundLog.filter(l => l.catEvent));
// Can't track this from current roundLog, but we can check the distribution
console.log(`  (Cat events are ~18% chance per round after round 2, lasting 2-5 rounds)`);
console.log(`  This means ~50-60% of games should see at least one event.`);

// 6. Key observations
console.log('\n--- STATUS ---');
console.log('  Implemented: SL tax, renewals, loss runs, carrier declination context, retail broker tracking, market-it, financing flag');
console.log('  Not yet implemented: subjectivities, layered programs, commission negotiation, premium financing mechanics');

console.log('\n' + '='.repeat(80));
console.log('Simulation complete.');
