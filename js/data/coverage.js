export const COVERAGE_TYPES = [
  { name: "General Liability", baseRate: 0.005, abbr: "GL", exposureLabel: "Revenue", industries: null },
  { name: "Professional Liability (E&O)", baseRate: 0.008, abbr: "E&O", exposureLabel: "Revenue", industries: ["Healthcare", "Technology", "Professional Services", "Real Estate"] },
  { name: "Commercial Property", baseRate: 0.004, abbr: "CPP", exposureLabel: "TIV", industries: null },
  { name: "Excess/Umbrella", baseRate: 0.003, abbr: "XS", exposureLabel: "Underlying Premium", industries: null },
  { name: "Commercial Auto", baseRate: 0.006, abbr: "CA", exposureLabel: "Fleet Value", industries: ["Construction", "Manufacturing", "Transportation", "Energy / Oil & Gas", "Agriculture", "Food & Beverage", "Mining", "Retail"] },
  { name: "Workers' Compensation", baseRate: 0.007, abbr: "WC", exposureLabel: "Annual Payroll", industries: null },
  { name: "Cyber Liability", baseRate: 0.01, abbr: "Cyber", exposureLabel: "Revenue", industries: ["Technology", "Healthcare", "Professional Services", "Real Estate", "Retail", "Hospitality", "Food & Beverage", "Entertainment / Events"] },
  { name: "Directors & Officers (D&O)", baseRate: 0.009, abbr: "D&O", exposureLabel: "Total Assets", industries: ["Technology", "Healthcare", "Professional Services", "Cannabis", "Energy / Oil & Gas", "Real Estate"] },
  { name: "Environmental Liability", baseRate: 0.012, abbr: "Enviro", exposureLabel: "TIV", industries: ["Construction", "Manufacturing", "Energy / Oil & Gas", "Mining", "Agriculture", "Transportation"] },
  { name: "Product Liability", baseRate: 0.008, abbr: "PL", exposureLabel: "Revenue", industries: ["Manufacturing", "Food & Beverage", "Cannabis", "Agriculture", "Retail"] },
  { name: "Inland Marine", baseRate: 0.005, abbr: "IM", exposureLabel: "TIV", industries: ["Construction", "Manufacturing", "Transportation", "Marine", "Energy / Oil & Gas", "Mining", "Agriculture"] },
  { name: "Builders Risk", baseRate: 0.006, abbr: "BR", exposureLabel: "Project Value", industries: ["Construction", "Real Estate"] }
];
