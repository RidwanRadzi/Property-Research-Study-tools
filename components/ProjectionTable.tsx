import React, { memo, useState, useEffect } from 'react';
import { Property, PropertyCalculations, ProjectionMode, RentalAssumption } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';
import Select from './ui/Select';

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

type EditableSectionRow = {
  isEditableSection: true;
  label: string;
  value: number;
  onChange: (newValue: number) => void;
};

type DerivedInputRow = {
  isDerivedInput: true;
  label: string;
  derivedField: 'priceAsPerValuation' | 'netPrice';
  value: (d: PropertyCalculations) => number;
  subLabel?: string;
};

type TableRow = SectionRow | InputRow | ValueRow | EditableSectionRow | DerivedInputRow;


interface ProjectionTableProps {
  properties: Property[];
  calculatedData: PropertyCalculations[];
  onUpdateProperty: (id: number, field: keyof Property, value: string | number) => void;
  onRemoveProperty: (id: number) => void;
  projectionMode: ProjectionMode;
  loanPercentage1: number;
  setLoanPercentage1: (value: number) => void;
  loanPercentage2: number;
  setLoanPercentage2: (value: number) => void;
  rentalAssumptions: RentalAssumption[];
}

// A new component to handle the complex state of a derived, but editable, input field.
// This prevents the user's input from being overridden on every keystroke.
interface DerivedInputCellProps {
  propertyId: number;
  propertySize: number;
  derivedField: 'priceAsPerValuation' | 'netPrice';
  calculatedValue: number;
  onUpdateProperty: (id: number, field: keyof Property, value: string | number) => void;
}
const DerivedInputCell: React.FC<DerivedInputCellProps> = memo(({
  propertyId,
  propertySize,
  derivedField,
  calculatedValue,
  onUpdateProperty
}) => {
  const [inputValue, setInputValue] = useState(String(Math.round(calculatedValue)));

  useEffect(() => {
    // This effect syncs the local input state with the calculated value from props.
    // It's crucial for when an external change (like editing PSF) should update this cell.
    const calculatedString = String(Math.round(calculatedValue));
    if (calculatedString !== inputValue) {
       setInputValue(calculatedString);
    }
  }, [calculatedValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    // On blur, we commit the change. Calculate the new PSF from the user's input
    // and update the global state. The useEffect will then handle snapping the
    // input value to the newly calculated price based on the (potentially rounded) PSF.
    const numValue = inputValue ? parseFloat(inputValue) : 0;
    if (propertySize > 0) {
      const newPsf = numValue / propertySize;
      const psfField = derivedField === 'priceAsPerValuation' ? 'valuationPsf' : 'netPsf';
      onUpdateProperty(propertyId, psfField, Math.round(newPsf));
    }
  };

  return (
    <Input
      type="number"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className="bg-transparent focus:bg-white"
    />
  );
});


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

const getScenarioMetricRows = (selector: (d: PropertyCalculations) => any, cashflowLabel: string, includeCashback = true): TableRow[] => {
    const rows: TableRow[] = [
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
  loanPercentage1,
  setLoanPercentage1,
  loanPercentage2,
  setLoanPercentage2,
  rentalAssumptions,
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
    { isDerivedInput: true, label: 'Price as per valuation', derivedField: 'priceAsPerValuation', value: (d) => d.priceAsPerValuation },
    { label: 'Net PSF', isInput: true, field: 'netPsf' },
    { isDerivedInput: true, label: 'Net Price', derivedField: 'netPrice', value: (d) => d.netPrice },

    ...incomeAndExpensesSection,
    
    // Normal Mortgage Section
    { isSection: true, label: "Normal Mortgage nett" },
    { isInput: false, label: 'Commitment at Net', value: (d) => d.normalMortgage.commitment },
    { isInput: false, label: 'Net Cashflow (no cashback)', value: (d) => d.normalMortgage.cashflow },
    { isInput: false, label: 'Net Cashflow excluding Principal', value: (d) => d.normalMortgage.cashflowExcludingPrincipal },
    
    // Editable Scenario 1
    { isEditableSection: true, label: 'Loan at valuation', value: loanPercentage1, onChange: setLoanPercentage1 },
    ...getScenarioMetricRows((d) => d.loanScenario1, `Cashflow (${loanPercentage1}% loan)`),

    // Editable Scenario 2
    { isEditableSection: true, label: 'Loan at valuation', value: loanPercentage2, onChange: setLoanPercentage2 },
    ...getScenarioMetricRows((d) => d.loanScenario2, `Cashflow (${loanPercentage2}% loan)`),

    // LPPSA
    { isSection: true, label: "LPPSA at SPA" },
    ...getScenarioMetricRows((d) => d.lppsa, 'Cashflow (LPPSA loan)'),
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

          if ('isEditableSection' in row) {
            return (
              <tr key={`section-editable-${rowIndex}`}>
                <th colSpan={999} className="p-3 text-left font-bold text-lg bg-gray-100 text-[#700d1d] sticky top-0 z-20">
                   <div className="flex items-center gap-2">
                    <span>{row.label}</span>
                    <Input 
                      type="number"
                      value={row.value}
                      onChange={e => row.onChange(parseFloat(e.target.value) || 0)}
                      className="w-20 py-1 text-lg font-bold"
                      step="1"
                    />
                    <span className="text-lg font-bold">%</span>
                  </div>
                </th>
              </tr>
            );
          }
          
          if ('isDerivedInput' in row) {
            return (
              <tr key={`${row.label}-${rowIndex}`} className="hover:bg-gray-50">
                <RowLabel label={row.label} subLabel={row.subLabel} />
                {properties.map((p, pIndex) => (
                  <td key={p.id} className="p-1.5 border-l border-gray-200 bg-yellow-50">
                    <DerivedInputCell
                      propertyId={p.id}
                      propertySize={p.size}
                      derivedField={row.derivedField}
                      calculatedValue={row.value(calculatedData[pIndex])}
                      onUpdateProperty={onUpdateProperty}
                    />
                  </td>
                ))}
              </tr>
            );
          }

          // By handling the other cases above, TypeScript infers `row` must be of type `InputRow` or `ValueRow` below.
          return (
            <tr key={`${row.label}-${rowIndex}`} className="hover:bg-gray-50">
              <RowLabel label={row.label} subLabel={row.subLabel} />
              {properties.map((p, pIndex) => {
                if ('field' in row) { // Type guard for InputRow
                    if (row.field === 'bedroomsType') {
                        const currentTypeExists = rentalAssumptions.some(a => a.type === p.bedroomsType);
                        return (
                             <td key={p.id} className="p-1.5 border-l border-gray-200 bg-yellow-50">
                                <Select
                                    value={p.bedroomsType}
                                    onChange={e => handleTextChange(p.id, 'bedroomsType', e.target.value)}
                                    className="bg-transparent focus:bg-white"
                                >
                                    {!currentTypeExists && p.bedroomsType && (
                                        <option key={p.bedroomsType} value={p.bedroomsType}>
                                            {p.bedroomsType}
                                        </option>
                                    )}
                                    {rentalAssumptions.map(assumption => (
                                        <option key={assumption.id} value={assumption.type}>
                                        {assumption.type}
                                        </option>
                                    ))}
                                </Select>
                             </td>
                        );
                    }
                  return (
                    <td key={p.id} className="p-1.5 border-l border-gray-200 bg-yellow-50">
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
                } else { // Type guard for ValueRow
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
