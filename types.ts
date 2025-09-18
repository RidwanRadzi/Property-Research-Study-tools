
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

export interface RentalAssumption {
  id: string;
  type: string;
  rent: number;
}

export interface GlobalSettings {
  interestRate: number;
  loanTenure: number;
  managementFeePercent: number;
  maintenanceFeePsf: number;
  lppsaInterestRate: number;
  rentalAssumptions: RentalAssumption[];
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
  loanScenario1: LoanScenario;
  loanScenario2: LoanScenario;
  lppsa: LoanScenario;
}

export interface LayoutRentalSummary {
  layoutType: string;
  rentalRange: string;
  sizeRange: string;
  avgRentalPsf: number;
  askingPriceRange: string;
  avgAskingPricePsf: number;
  count: number;
}

export interface DevelopmentSummary {
  priceRange: string;
  avgPrice: number;
  sizeRange: string;
  avgPricePsf: number;
  rentalBreakdown: LayoutRentalSummary[];
  count: number;
  yearOfCompletion: string;
  totalUnits: number;
  tenure: string;
}

export interface SummaryData {
  [developmentName: string]: DevelopmentSummary;
}

// Types for Transaction Filter Page
export interface Transaction {
  [key: string]: any; // Allow any string keys
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

export interface Floorplan {
  id: string;
  src: string; // base64 data URL
  name: string;
}

export interface UnitListing {
  name: string;
  headers: string[];
  rows: { [key: string]: string | number }[];
}

export interface RoomRentalListing {
  id: string;
  propertyName: string;
  roomType: string;
  rentalPrice: number;
  furnishing: string;
  source: string;
}

// Types for Area Analysis Page
export interface AmenityCategory {
  category: string;
  items: string[];
}

export interface MarketSentiments {
  overallSentiment: string;
  growthPotential: string;
  rentalDemand: string;
  keyDrivers: string[];
  potentialRisks: string[];
}

export interface InvestmentPOV {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface NewsArticle {
  title: string;
  source: string;
  summary: string;
  link: string;
}

export interface AreaAnalysisData {
  amenities: AmenityCategory[];
  marketSentiments: MarketSentiments;
  investmentPOV: InvestmentPOV;
  news: NewsArticle[];
}

export interface SavedSession {
  id: number; // timestamp
  name: string; // e.g., "Vybe - Cyberjaya"
  date: string; // ISO string date
  // State from App.tsx
  subjectPropertyName: string;
  area: string;
  properties: Property[];
  summary: SummaryData | null;
  floorplans: Floorplan[];
  unitListing: UnitListing | null;
  // State from ProjectionPage.tsx
  globalSettings: GlobalSettings;
  projectionMode: ProjectionMode;
  loanPercentage1: number;
  loanPercentage2: number;
}
