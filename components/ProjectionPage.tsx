import React from 'react';
import { Property, GlobalSettings as GlobalSettingsType, ProjectionMode, TransactionSummary } from '../types';
import ProjectionTable from './ProjectionTable';
import GlobalSettings from './GlobalSettings';
import { calculateAllMetrics } from '../services/loanCalculator';
import Button from './ui/Button';
import TransactionSummaryDisplay from './TransactionSummaryDisplay';

interface ProjectionPageProps {
  properties: Property[];
  onUpdateProperty: (id: number, field: keyof Property, value: string | number) => void;
  onAddProperty: () => void;
  onRemoveProperty: (id: number) => void;
  subjectPropertyName: string;
  globalSettings: GlobalSettingsType;
  setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettingsType>>;
  projectionMode: ProjectionMode;
  setProjectionMode: (mode: ProjectionMode) => void;
  loanPercentage1: number;
  setLoanPercentage1: (value: number) => void;
  loanPercentage2: number;
  setLoanPercentage2: (value: number) => void;
  transactionSummaries: TransactionSummary[];
  onUpdateTransactionSummary: (id: string, field: keyof Omit<TransactionSummary, 'id'>, value: string | number) => void;
}

const ProjectionPage: React.FC<ProjectionPageProps> = ({
  properties,
  onUpdateProperty,
  onAddProperty,
  onRemoveProperty,
  subjectPropertyName,
  globalSettings,
  setGlobalSettings,
  projectionMode,
  setProjectionMode,
  loanPercentage1,
  setLoanPercentage1,
  loanPercentage2,
  setLoanPercentage2,
  transactionSummaries,
  onUpdateTransactionSummary,
}) => {

  const calculatedData = properties.map(p => calculateAllMetrics(p, globalSettings, projectionMode, loanPercentage1, loanPercentage2));

  return (
    <div className="-mt-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-[#700d1d] tracking-tight">{subjectPropertyName} Cash Flow Projection</h1>
        <p className="text-gray-600 mt-2">Analyze and compare property investments with detailed financial projections.</p>
      </header>

      <main>
        <div className="my-8 flex flex-col sm:flex-row justify-between items-center gap-6">
          <GlobalSettings settings={globalSettings} onSettingsChange={setGlobalSettings} />
           <div className="flex-shrink-0">
             <div className="flex rounded-lg shadow-sm border border-gray-300 bg-gray-100 p-1 space-x-1">
                {(['wholeUnit', 'coLiving', 'selfManage', 'airbnb'] as ProjectionMode[]).map(mode => {
                    const labels = {
                        wholeUnit: 'Whole Unit',
                        coLiving: 'Co-Living',
                        selfManage: 'Self Manage',
                        airbnb: 'Airbnb'
                    };
                    return (
                        <button
                            key={mode}
                            onClick={() => setProjectionMode(mode)}
                            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#700d1d] ${
                                projectionMode === mode
                                ? 'bg-white text-[#700d1d] shadow'
                                : 'bg-transparent text-gray-600 hover:bg-white/60'
                            }`}
                        >
                            {labels[mode]}
                        </button>
                    );
                })}
            </div>
           </div>
        </div>

        <TransactionSummaryDisplay 
            summaries={transactionSummaries}
            onUpdate={onUpdateTransactionSummary}
        />
        
        <div className="flex justify-end items-center mb-4 flex-wrap gap-4">
          <div className="flex gap-4">
            <Button onClick={onAddProperty}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Layout
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-lg shadow-2xl ring-1 ring-gray-200">
          {properties.length > 0 ? (
            <ProjectionTable 
              properties={properties} 
              calculatedData={calculatedData}
              onUpdateProperty={onUpdateProperty} 
              onRemoveProperty={onRemoveProperty}
              projectionMode={projectionMode}
              loanPercentage1={loanPercentage1}
              setLoanPercentage1={setLoanPercentage1}
              loanPercentage2={loanPercentage2}
              setLoanPercentage2={setLoanPercentage2}
              rentalAssumptions={globalSettings.rentalAssumptions}
            />
          ) : (
            <div className="text-center py-20">
                <h3 className="text-xl font-semibold text-gray-700">No Properties to Display</h3>
                <p className="text-gray-500 mt-2">Add a property column to begin your analysis.</p>
            </div>
          )}
        </div>
      </main>
      
      <footer className="text-center mt-12 text-gray-500 text-sm">
        <p>Built for Property Research Teams | Powered by Gemini & React</p>
      </footer>
    </div>
  );
};

export default ProjectionPage;