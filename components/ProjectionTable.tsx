import React, { memo } from 'react';
import { Property, PropertyCalculations, ProjectionMode } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';

// Define discriminated union for table row types
type SectionRow = {
  isSection: true;
  label: string;
};

type InputRow = {
  isInput: true;
  label: string;
  field: keyof Property;
  inputType?: 'text';
  subLabel?: string;
};

type ValueRow = {
  isInput: false;
  label: string;
  value: (d: PropertyCalculations) => number;
  subLabel?: string;
  highlight?: boolean;
  isNotCurrency?: boolean;
};

type TableRow = SectionRow | InputRow | ValueRow;

interface ProjectionTableProps {
  properties: Property[];
  calculatedData: PropertyCalculations[];
  onUpdateProperty: (id: number, field: keyof Property, value: string | number) => void;
  onRemoveProperty: (id: number) => void;
  projectionMode: ProjectionMode;
}

const formatCurrency = (value: number) => {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const formatted = `RM${absValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return isNegative ? `(${formatted})` : formatted;
};

const formatNumber = (value: number) => {
    return value.toLocaleString('en-US');
}

const renderValue = (value: number, isCurrency = true) => {
  const isNegative = value < 0;
  return (
    <span className={isNegative ? 'text-red-600' : 'text-gray-900'}>
      {isCurrency ? formatCurrency(value) : formatNumber(value)}
    </span>
  );
};

const RowLabel: React.FC<{ label: string; subLabel?: string }> = ({ label, subLabel }) => (
  <div className="p-3 font-semibold text-gray-800 whitespace-nowrap sticky left-0 bg-gray-50 z-10">
    {label}
    {subLabel && <span className="block text-xs font-normal text-gray-500">{subLabel}</span>}
  </div>
);

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <th colSpan={999} className="p-3 text-left font-bold text-lg bg-gray-100 text-[#700d1d] sticky top-0 z-20">
    {label}
  </th>
);

const PropertyHeader: React.FC<{ property: Property; onRemove: (id: number) => void }> = memo(({ property, onRemove }) => (
    <th className="p-3 text-left font-semibold sticky top-0 z-20 bg-white min-w-[200px] border-l border-gray-200">
        <div className="flex justify-between items-start">
            <div>
                <span className="text-[#700d1d]">{property.type}</span>
                <span className="block text-xs font-normal text-gray-600">{property.bedroomsType}</span>
            </div>
            <Button onClick={() => onRemove(property.id)} variant="danger" size="sm" className="opacity-50 hover:opacity-100 transition-opacity !p-1 h-6 w-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </Button>
        </div>
    </th>
));

const getScenarioRows = (title: string, selector: (d: PropertyCalculations) => any, cashflowLabel: string, includeCashback = true): TableRow[] => {
    const rows: TableRow[] = [
        { isSection: true, label: title },
        { isInput: false, label: 'Total Commitment Monthly', value: (d: PropertyCalculations) => selector(d).totalCommitmentMonthly },
        { isInput: false, label: 'Commitment', value: (d: PropertyCalculations) => selector(d).commitment, subLabel: 'Monthly Loan' },
        { isInput: false, label: cashflowLabel, value: (d: PropertyCalculations) => selector(d).cashflow },
        { isInput: false, label: `${cashflowLabel} excluding Principal`, value: (d: PropertyCalculations) => selector(d).cashflowExcludingPrincipal },
    ];
    if (includeCashback) {
        rows.push({ isInput: false, label: 'Cashback', value: (d: PropertyCalculations) => selector(d).cashback, highlight: true });
    }
    return rows;
}

const ProjectionTable: React.FC<ProjectionTableProps> = ({
  properties,
  calculatedData,
  onUpdateProperty,
  onRemoveProperty,
  projectionMode,
}) => {

  const handleInputChange = (id: number, field: keyof Property, value: string) => {
    onUpdateProperty(id, field, value ? parseFloat(value) : 0);
  };
  
  const handleTextChange = (id: number, field: keyof Property, value: string) => {
    onUpdateProperty(id, field, value);
  };

  const incomeAndExpensesSection: TableRow[] = [
    { isSection: true, label: "Income & Expenses (Monthly)" },
    { isInput: false, label: 'Monthly Instalment at Nett', value: (d) => d.nettLoan.monthlyInstallment },
  ];

  if (projectionMode === 'wholeUnit') {
    incomeAndExpensesSection.push(
      { label: 'Whole Unit Rental', isInput: true, field: 'wholeUnitRental' },
      { label: 'Maintenance + sinking', isInput: true, field: 'maintenanceSinking' }
    );
  } else { // coLiving
    incomeAndExpensesSection.push(
      { label: 'Co-living Rental', isInput: true, field: 'coLivingRental' },
      { label: 'Maintenance + sinking', isInput: true, field: 'maintenanceSinking' },
      { isInput: false, label: 'Co-liv management fee', value: (d) => d.managementFee },
      { label: 'Cleaning', isInput: true, field: 'cleaning' },
      { label: 'Wifi', isInput: true, field: 'wifi' }
    );
  }

  incomeAndExpensesSection.push(
      { isInput: false, label: 'Total Commitment at Nett', value: (d) => d.normalMortgage.totalCommitmentMonthly }
  );

  const tableStructure: TableRow[] = [
    { isSection: true, label: "Property Details" },
    { label: 'Type', isInput: true, field: 'type', inputType: 'text' },
    { label: 'Bedrooms Type', isInput: true, field: 'bedroomsType', inputType: 'text' },
    { label: 'Size (sqft)', isInput: true, field: 'size' },
    
    { isSection: true, label: "Pricing & Valuation" },
    { label: 'SPA Price (estimate)', isInput: true, field: 'spaPrice' },
    { label: 'Valuation PSF', isInput: true, field: 'valuationPsf', subLabel: '**ask acquisition' },
    { isInput: false, label: 'Price as per valuation', value: (d) => d.priceAsPerValuation },
    { label: 'Net PSF', isInput: true, field: 'netPsf' },
    { isInput: false, label: 'Net Price', value: (d) => d.netPrice },

    ...incomeAndExpensesSection,
    
    // Normal Mortgage Section
    { isSection: true, label: "Normal Mortgage nett" },
    { isInput: false, label: 'Commitment at Net', value: (d) => d.normalMortgage.commitment },
    { isInput: false, label: 'Net Cashflow (no cashback)', value: (d) => d.normalMortgage.cashflow },
    { isInput: false, label: 'Net Cashflow excluding Principal', value: (d) => d.normalMortgage.cashflowExcludingPrincipal },
    
    ...getScenarioRows("90% loan at valuation", (d) => d.loan90, 'Cashflow (90% loan)'),
    ...getScenarioRows("70% loan at valuation", (d) => d.loan70, 'Cashflow (70% loan)'),
    ...getScenarioRows("LPPSA at SPA", (d) => d.lppsa, 'Cashflow (LPPSA loan)'),
  ];

  return (
    <table className="min-w-full text-sm text-left border-collapse">
      <thead className="sticky top-0 z-20">
        <tr>
          <th className="p-3 text-left font-semibold text-gray-700 sticky top-0 left-0 z-30 bg-white min-w-[250px]">Metric</th>
          {properties.map(p => (
            <PropertyHeader key={p.id} property={p} onRemove={onRemoveProperty} />
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {tableStructure.map((row, rowIndex) => {
          if ('isSection' in row) {
            return <tr key={`section-${rowIndex}`}><SectionHeader label={row.label} /></tr>;
          }

          // By handling the 'isSection' case above and returning, TypeScript now correctly
          // infers that `row` must be of type `InputRow` or `ValueRow` below.
          return (
            <tr key={`${row.label}-${rowIndex}`} className="hover:bg-gray-50">
              <RowLabel label={row.label} subLabel={row.subLabel} />
              {properties.map((p, pIndex) => {
                // Using a more robust type guard ('field' in row) to help TypeScript with type narrowing in closures
                if ('field' in row) {
                  return (
                    <td key={p.id} className="p-1.5 border-l border-gray-200">
                      {row.inputType === 'text' ?
                        <Input
                          type="text"
                          value={p[row.field] as string}
                          onChange={e => handleTextChange(p.id, row.field, e.target.value)}
                          className="bg-transparent focus:bg-white"
                        /> :
                        <Input
                          type="number"
                          value={p[row.field] as number}
                          onChange={e => handleInputChange(p.id, row.field, e.target.value)}
                          className="bg-transparent focus:bg-white"
                        />
                      }
                    </td>
                  );
                } else {
                  return (
                    <td key={p.id} className={`p-1.5 border-l border-gray-200 ${row.highlight ? 'bg-red-50' : ''}`}>
                      <div className="p-2 h-10 flex items-center">
                        {renderValue(row.value(calculatedData[pIndex]), !row.isNotCurrency)}
                      </div>
                    </td>
                  );
                }
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};


export default memo(ProjectionTable);