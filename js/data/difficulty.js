export const DIFFICULTY = {
  easy:   { time: 60, timeFloor: 50, rounds: 12, lossChance: 0.45, overpriceThreshold: 1.6, fireThreshold: 0.80, prodTarget: 400000 },
  medium: { time: 50, timeFloor: 40, rounds: 15, lossChance: 0.60, overpriceThreshold: 1.35, fireThreshold: 0.70, prodTarget: 550000 },
  hard:   { time: 40, timeFloor: 30, rounds: 20, lossChance: 0.75, overpriceThreshold: 1.2, fireThreshold: 0.60, prodTarget: 800000 }
};

export const LIMIT_OPTIONS = [500000, 1000000, 2000000, 5000000, 10000000];

export const RETENTION_OPTIONS = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000];
