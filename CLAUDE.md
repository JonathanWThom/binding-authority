# The Binding Authority

A browser game for wholesale insurance brokers. Single HTML file, hosted on GitHub Pages.

**Live**: https://jonathanwthom.github.io/binding-authority/
**Repo**: https://github.com/JonathanWThom/binding-authority

## Target Audience

Insurance industry professionals, especially E&S (excess & surplus lines) wholesale brokers. These are people who evaluate submissions daily, place risks with carriers, and manage loss ratios. The game should feel authentic — terminology, carrier names, coverage types, and economics should pass the sniff test of someone who does this for a living.

## Architecture

- **Single file**: `index.html` (~122KB) — all HTML, CSS, and JS inline. No build step, no dependencies.
- **Simulation script**: `simulate.mjs` — Node.js script that runs headless playthroughs to test balance, find bugs, and validate realism. Run with `node simulate.mjs`. Keep this in sync with game logic changes.
- **Hosting**: GitHub Pages, deploys from `main` branch automatically.

## Design Direction: "Paper & Ink"

Warm, editorial aesthetic evoking actual insurance paperwork:
- **Fonts**: Lora (serif, display), DM Sans (body), IBM Plex Mono (financial data)
- **Palette**: Cream paper background (#f0ebe3), deep navy (#1a2744), forest green (#2d6a4f), brick red (#b5242a)
- **Feel**: Submission cards look like forms, not dashboards. Stamp-like buttons. Paper texture.

Do NOT revert to dark theme, gradient backgrounds, Inter font, or blue/purple tech aesthetics.

## Gameplay Rules

The player is a **wholesale broker with binding authority** — NOT an underwriter. They evaluate submissions from retail brokers, pick carriers, set terms (premium, limit, retention), and decide to bind, decline, refer, or request more info.

### Core Loop
1. Submission arrives (insured name, industry, coverage, state, exposure, claims history, flags)
2. Player evaluates risk, selects a carrier, sets premium/limit/retention
3. Player chooses: **Bind** / **Decline** / **Refer** / **Request Loss Runs** / **Market It**
4. Feedback shows outcome (claim or clean, pricing assessment, terms feedback)
5. Next round

### Difficulty Levels
| Level | Timer | Rounds | Loss Chance | Fire Threshold | Overprice Threshold |
|-------|-------|--------|-------------|----------------|---------------------|
| Retail (Easy) | 40s | 15 | 0.45 | 80% LR | 1.6x |
| Wholesale (Normal) | 28s | 20 | 0.60 | 70% LR | 1.35x |
| MGA (Hard) | 18s | 25 | 0.75 | 60% LR | 1.2x |

### Economics
- **Revenue** = commission from binds (10-18% depending on carrier)
- **Losses** hit the broker via commission clawback + contingent profit sharing (capped at 35% of loss amount)
- **Declining** good business costs reputation (negative revenue). Declining bad business is $0.
- **Referring** costs 2% of fair premium (admin cost) plus lost commission opportunity
- **Overpricing** causes the insured to shop elsewhere (lost deal + penalty)
- **Loss ratio firing**: exceed the threshold and the game ends early

### Key Mechanics
- **Carrier selection**: 3 carriers per submission with real E&S names, appetites, AM Best ratings, commission rates, TIV/premium constraints. Relationships degrade with losses.
- **Renewal rounds**: After round 10, ~40% chance a previously-bound risk returns. Lower commission (retention credit), known loss history.
- **Cat events**: ~18% chance per round after round 2, lasting 2-5 rounds. Affect premiums and loss probability for matching states/lines.
- **Coverage/industry filtering**: Each coverage type has an industry whitelist. No Builders Risk for Aviation.
- **Retail broker relationships**: Each submission comes from a named retail broker. Declining hurts the relationship.
- **Market It**: When no carriers available, spend clock time to surface a non-standard carrier (worse terms).
- **Request Loss Runs**: Spend 5-8 seconds to reveal a risk hint (Low/Moderate/High/Very High).
- **Surplus lines tax**: Shown in bind feedback for FL (5%), CA (3%), NY (3.5%), LA (4%).
- **Premium financing**: Badge shown for premiums > $75K.

### Loss Severity Distribution
~55% attritional (<0.5x premium), ~25% moderate (0.5-2x), ~15% significant (1-2.5x), ~5% catastrophic (2.5-5x). Losses are premium-based, not limit-based.

### Carrier Calls
Immersive between-round messages from carriers and brokers (30+ templates). Contextual — reference actual game state. No gameplay impact, purely atmosphere.

### Named Claims
60+ realistic claim descriptions organized by coverage type. Reference insured name, state, and actual loss amount.

## Realism Constraints

These are things that matter to the target audience. Do not break them:

1. **Terminology**: The player is a broker, not an underwriter. They "place" risks, not "underwrite" them. The carrier's underwriter is a separate person.
2. **Exposure labels**: WC = "Annual Payroll", GL = "Revenue", Property = "TIV", D&O = "Total Assets", etc. Never show "TIV" for all lines.
3. **Coverage/industry combos**: Builders Risk only for Construction/Real Estate. Environmental only for industrial classes. E&O only for professional services. Product Liability not for Professional Services.
4. **Carrier names**: Real E&S carrier names are used (Markel, Lexington, Kinsale, etc.). Their appetites are directionally correct. Don't make them look bad.
5. **Surplus lines**: FL, CA, NY, LA are surplus states. Surplus lines tax applies there.
6. **Retention sizing**: Should be ~10-25% of premium for middle market. Not fixed $10K/$25K/$50K brackets.
7. **Commission**: Typically 10-18% for E&S. Renewals get a retention credit (~15% discount on commission rate).
8. **Loss ratios**: Real E&S portfolios run 50-70% combined ratios. The game should feel possible but not easy to stay profitable.

## Sound Effects

Web Audio API, generated programmatically (no external files). Subtle — all gains 0.02-0.08. Persistent mute toggle in bottom-right corner (localStorage). Sounds: stamp (bind), crumple (decline), ascending (clean bind), ominous (claim), tick (last 5 seconds), phone ring (carrier call), descending (game over/fired).

## Sharing

- Canvas-rendered 1200x630 share image with Paper & Ink theme
- Web Share API on mobile, PNG download on desktop
- Plain text copy option
- Personal best leaderboard in localStorage (top 5)

## Mobile Responsiveness

The game must work on phones. Key responsive breakpoint at 700px:
- HUD: 5 columns -> 3 columns
- Risk details: 3 columns -> 2 columns
- Carrier options: 3 columns -> 1 column
- Controls: 3 columns -> 1 column
- Action buttons: flex-wrap as needed

Keyboard shortcuts are for desktop; mobile uses tap.

## Testing Changes

After any logic change:
1. Run `node simulate.mjs` to verify balance and catch bugs
2. Check that `smart` strategy outperforms `always_bind` in terms of survival rate (firing %)
3. Check that `always_decline` and `always_refer` are negative revenue on all difficulties
4. Check that no exploitable strategy dominates (conservative_terms, always_refer)
5. Look for edge cases: empty retention options, suggested limit > TIV, zero-carrier rounds

## What NOT to Change

- Do not add a build system, framework, or external dependencies
- Do not split into multiple files (defeats the GitHub Pages simplicity)
- Do not switch to a dark theme or tech-startup aesthetic
- Do not use real retail brokerage names (Marsh, Gallagher, etc.) — use the fictional ones
- Do not make the game easier by reducing loss frequency — use the simulation to validate
- Do not add features that break the single-playthrough-in-5-minutes format
