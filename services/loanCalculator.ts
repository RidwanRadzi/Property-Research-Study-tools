import { Property, GlobalSettings, PropertyCalculations, LoanScenario, ProjectionMode, AirbnbCalculations, StandardCalculations, AirbnbScenarioCalculations } from '../types';

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
  
  // Calculate all possible loan installments first
  const nettLoanInstallment = calculateMonthlyInstallment(netPrice, settings.interestRate, settings.loanTenure).monthlyPayment;
  const loan1Installment = calculateMonthlyInstallment(priceAsPerValuation * (loanPercentage1 / 100), settings.interestRate, settings.loanTenure).monthlyPayment;
  const loan2Installment = calculateMonthlyInstallment(priceAsPerValuation * (loanPercentage2 / 100), settings.interestRate, settings.loanTenure).monthlyPayment;
  const LPPSA_LOAN_CAP = 750000;
  const lppsaLoanAmount = Math.min(property.spaPrice, LPPSA_LOAN_CAP);
  const lppsaInstallment = calculateMonthlyInstallment(lppsaLoanAmount, settings.lppsaInterestRate, settings.loanTenure).monthlyPayment;

  if (projectionMode === 'airbnb') {
    const calculateScenario = (occupancyPercent: number): AirbnbScenarioCalculations => {
        const rentalPerNight = property.airbnbRentalPerNight;
        const daysInMonth = 30;
        const occupancyRate = occupancyPercent / 100;

        const totalIncome = rentalPerNight * daysInMonth * occupancyRate;
        const operatorFee = totalIncome * (settings.airbnbOperatorFee / 100);
        
        const monthlyExpenses = property.maintenanceSinking + property.wifi;

        const calculateCashflow = (monthlyInstallment: number) => {
            return totalIncome - monthlyInstallment - monthlyExpenses - operatorFee;
        };
        
        return {
            totalIncome,
            operatorFee,
            cashflowNett: calculateCashflow(nettLoanInstallment),
            cashflowLoan1: calculateCashflow(loan1Installment),
            cashflowLoan2: calculateCashflow(loan2Installment),
            cashflowLppsa: calculateCashflow(lppsaInstallment),
        };
    };

    const totalCommitmentAtNett = nettLoanInstallment + property.maintenanceSinking + property.wifi;

    const airbnbCalculations: AirbnbCalculations = {
        isAirbnb: true,
        priceAsPerValuation,
        netPrice,
        monthlyInstallmentNett: nettLoanInstallment,
        monthlyInstallmentLoan1: loan1Installment,
        monthlyInstallmentLoan2: loan2Installment,
        monthlyInstallmentLppsa: lppsaInstallment,
        totalCommitmentAtNett,
        currentCase: calculateScenario(settings.airbnbCurrentOccupancy),
        bestCase: calculateScenario(settings.airbnbBestOccupancy),
        worstCase: calculateScenario(settings.airbnbWorstOccupancy),
    };
    return airbnbCalculations;
  }

  // --- Standard Calculations (Whole Unit, Co-Living, Self Manage) ---
  let rentalIncome: number;
  let managementFee: number;
  let otherExpenses: number;

  switch (projectionMode) {
    case 'coLiving':
      rentalIncome = property.coLivingRental;
      managementFee = rentalIncome * (settings.managementFeePercent / 100);
      otherExpenses = property.wifi;
      break;
    case 'selfManage':
      rentalIncome = property.coLivingRental;
      managementFee = 0; // Exclude management fee for self-managed scenarios
      otherExpenses = property.wifi;
      break;
    case 'wholeUnit':
    default:
      rentalIncome = property.wholeUnitRental;
      managementFee = 0;
      otherExpenses = 0;
      break;
  }

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
  const lppsa = calculateScenario(lppsaLoanAmount, settings.lppsaInterestRate);

  const standardCalculations: StandardCalculations = {
    isAirbnb: false,
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
  
  return standardCalculations;
};