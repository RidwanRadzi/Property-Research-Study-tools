export type ProjectionMode = 'wholeUnit' | 'coLiving' | 'selfManage' | 'airbnb';

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
  airbnbRentalPerNight: number; // New field for Airbnb
  maintenanceSinking: number;
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
  // New fields for Airbnb
  airbnbOperatorFee: number;
  airbnbCurrentOccupancy: number;
  airbnbBestOccupancy: number;
  airbnbWorstOccupancy: number;
}

export interface LoanScenario {
  totalCommitmentMonthly: number;
  commitment: number;
  cashflow: number;
  cashflowExcludingPrincipal: number;
  cashback: number;
}

// Renamed for clarity, represents the standard calculation structure
export interface StandardCalculations {
  isAirbnb: false;
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

// New types for Airbnb projection
export interface AirbnbScenarioCalculations {
    totalIncome: number;
    operatorFee: number;
    cashflowNett: number;
    cashflowLoan1: number;
    cashflowLoan2: number;
    cashflowLppsa: number;
}

export interface AirbnbCalculations {
    isAirbnb: true;
    priceAsPerValuation: number;
    netPrice: number;
    // Pre-calculated monthly installments for display
    monthlyInstallmentNett: number;
    monthlyInstallmentLoan1: number;
    monthlyInstallmentLoan2: number;
    monthlyInstallmentLppsa: number;
    totalCommitmentAtNett: number; // As per image
    // Three scenarios
    currentCase: AirbnbScenarioCalculations;
    bestCase: AirbnbScenarioCalculations;
    worstCase: AirbnbScenarioCalculations;
}


// Discriminated union for type safety
export type PropertyCalculations = StandardCalculations | AirbnbCalculations;


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
  id: string;
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
  // FIX: Changed to Record<string, any>[] for better type safety than any[]
  rows: Record<string, any>[];
}

// New type for AI analysis result
export interface UnitListingAnalysisResult {
  typeKey: string;
  sizeKey: string;
  priceKey: string;
  unitNoKey: string;
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

// New types for Whole Unit Rental Page
export interface WholeUnitRentalRawData {
  [key: string]: string | number;
}

export interface BedroomSummary {
  bedroomType: string;
  count: number;
  minRent: number;
  maxRent: number;
  minPsf: number;
  maxPsf: number;
}

export interface WholeUnitDevelopmentSummary {
  developmentName: string;
  bedrooms: BedroomSummary[];
}

export interface WholeUnitRentalData {
  fileName: string;
  headers: string[];
  rawData: WholeUnitRentalRawData[];
  summary: WholeUnitDevelopmentSummary[];
}

// New types for Asking Price Page
export interface AskingPriceRawData {
  [key: string]: string | number;
}

export interface AskingPriceBedroomSummary {
  bedroomType: string;
  count: number;
  minPrice: number;
  maxPrice: number;
  minPsf: number;
  maxPsf: number;
}

export interface AskingPriceDevelopmentSummary {
  developmentName: string;
  bedrooms: AskingPriceBedroomSummary[];
}

export interface AskingPriceData {
  fileName: string;
  headers: string[];
  rawData: AskingPriceRawData[];
  summary: AskingPriceDevelopmentSummary[];
}

// New types for Airbnb Scraper Page
export interface AirbnbListing {
  id: string;
  title: string;
  url: string;
  pricePerNight: number;
  rating: number;
  numberOfReviews: number;
  propertyType: string;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
}

export interface AirbnbScraperData {
  area: string;
  city: string;
  listings: AirbnbListing[];
  averagePricePerNight?: number;
  estimatedOccupancyRate?: number;
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
  transactionSummaries: TransactionSummary[];
  wholeUnitRentalData: WholeUnitRentalData | null;
  askingPriceData: AskingPriceData | null;
  airbnbScraperData: AirbnbScraperData | null;
  // State from ProjectionPage.tsx
  globalSettings: GlobalSettings;
  projectionMode: ProjectionMode;
  loanPercentage1: number;
  loanPercentage2: number;
}