
import { Property, GlobalSettings, PropertyCalculations, LoanScenario, ProjectionMode } from '../types';

const calculateMonthlyInstallment = (principal: number, annualRate: number, years: number): { monthlyPayment: number; firstMonthPrincipal: number; firstMonthInterest: number } => {
  if (principal <= 0 || annualRate < 0 || years <= 0) {
    return { monthlyPayment: 0, firstMonthPrincipal: 0, firstMonthInterest: 0 };
  }
  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = years * 12;

  if (monthlyRate === 0) {
      const monthlyPayment = principal / numberOfPayments;
      return { monthlyPayment, firstMonthPrincipal: monthlyPayment, firstMonthInterest: 0 };
  }

  const monthlyPayment =
    principal *
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  
  const firstMonthInterest = principal * monthlyRate;
  const firstMonthPrincipal = monthlyPayment - firstMonthInterest;

  return { monthlyPayment, firstMonthPrincipal, firstMonthInterest };
};


export const calculateAllMetrics = (property: Property, settings: GlobalSettings, projectionMode: ProjectionMode, loanPercentage1: number, loanPercentage2: number): PropertyCalculations => {
  const priceAsPerValuation = property.size * property.valuationPsf;
  const netPrice = property.size * property.netPsf;
  
  const isCoLiving = projectionMode === 'coLiving';

  const rentalIncome = isCoLiving ? property.coLivingRental : property.wholeUnitRental;
  const managementFee = isCoLiving ? rentalIncome * (settings.managementFeePercent / 100) : 0;
  const otherExpenses = isCoLiving ? property.cleaning + property.wifi : 0;

  const totalExpenses = property.maintenanceSinking + managementFee + otherExpenses;

  const nettLoan = calculateMonthlyInstallment(netPrice, settings.interestRate, settings.loanTenure);
  
  const calculateScenario = (loanAmount: number, interestRate: number): LoanScenario => {
    const { monthlyPayment, firstMonthPrincipal } = calculateMonthlyInstallment(loanAmount, interestRate, settings.loanTenure);
    const totalCommitmentMonthly = monthlyPayment + totalExpenses;
    const cashflow = rentalIncome - totalCommitmentMonthly;
    const cashflowExcludingPrincipal = cashflow + firstMonthPrincipal;
    const cashback = loanAmount - netPrice;

    return {
      totalCommitmentMonthly,
      commitment: monthlyPayment,
      cashflow,
      cashflowExcludingPrincipal,
      cashback,
    };
  };

  const normalMortgageCommitment = nettLoan.monthlyPayment + totalExpenses;
  const normalMortgage: LoanScenario = {
      totalCommitmentMonthly: normalMortgageCommitment,
      commitment: nettLoan.monthlyPayment,
      cashflow: rentalIncome - normalMortgageCommitment,
      cashflowExcludingPrincipal: (rentalIncome - normalMortgageCommitment) + nettLoan.firstMonthPrincipal,
      cashback: 0
  }
  
  const loanScenario1 = calculateScenario(priceAsPerValuation * (loanPercentage1 / 100), settings.interestRate);
  const loanScenario2 = calculateScenario(priceAsPerValuation * (loanPercentage2 / 100), settings.interestRate);
  
  const LPPSA_LOAN_CAP = 750000;
  const lppsaLoanAmount = Math.min(property.spaPrice, LPPSA_LOAN_CAP);
  const lppsa = calculateScenario(lppsaLoanAmount, settings.lppsaInterestRate);

  return {
    priceAsPerValuation,
    netPrice,
    managementFee,
    nettLoan: {
      monthlyInstallment: nettLoan.monthlyPayment,
      principal: nettLoan.firstMonthPrincipal,
      interest: nettLoan.firstMonthInterest,
    },
    normalMortgage,
    loanScenario1,
    loanScenario2,
    lppsa
  };
};