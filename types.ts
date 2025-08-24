export type ProjectionMode = 'wholeUnit' | 'coLiving';

export interface Property {
  id: number;
  type: string;
  bedroomsType: string;
  size: number;
  spaPrice: number;
  valuationPsf: number;
  netPsf: number;
  wholeUnitRental: number;
  coLivingRental: number;
  maintenanceSinking: number;
  cleaning: number;
  wifi: number;
}

export interface Layout {
  id: string;
  layoutType: string; // e.g., "2 Bedrooms", "Studio"
  sizeSqft: number;
  askingPrice: number;
  rentalPrice: number;
}

export interface ComparableProperty {
  id: string;
  name: string;
  distanceKm: number;
  yearOfCompletion: string; // Can be "n/a"
  totalUnits: number;
  tenure: string; // e.g., "Freehold", "Leasehold"
  layouts: Layout[];
  isCustom?: boolean;
}

export interface GlobalSettings {
  interestRate: number;
  loanTenure: number;
  managementFeePercent: number;
}

export interface LoanScenario {
  totalCommitmentMonthly: number;
  commitment: number;
  cashflow: number;
  cashflowExcludingPrincipal: number;
  cashback: number;
}

export interface PropertyCalculations {
  priceAsPerValuation: number;
  netPrice: number;
  managementFee: number;
  nettLoan: {
    monthlyInstallment: number;
    principal: number;
    interest: number;
  };
  normalMortgage: LoanScenario;
  loan90: LoanScenario;
  loan70: LoanScenario;
  lppsa: LoanScenario;
}

export interface LayoutSummary {
  priceRange: string;
  avgPrice: number;
  rentalRange: string;
  avgRental: number;
  count: number;
}

export interface SummaryData {
  [layoutType: string]: LayoutSummary;
}

// Types for Transaction Filter Page
export interface Transaction {
  [key: string]: any; // Allow any string keys
  Development: string;
  'Seller Name': string;
  Price: number;
  'Year of Completion': number;
}

export interface TransactionSummary {
  development: string;
  medianPrice: number;
  transactionCount: number;
}

export interface SortedTransactionSummary {
  newDevelopments: TransactionSummary[];
  oldDevelopments: TransactionSummary[];
}