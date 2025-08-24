import React, { useState, useCallback } from 'react';
import { Property, GlobalSettings as GlobalSettingsType, ProjectionMode } from '../types';
import ProjectionTable from './ProjectionTable';
import GlobalSettings from './GlobalSettings';
import { calculateAllMetrics } from '../services/loanCalculator';
import Button from './ui/Button';
import Toggle from './ui/Toggle';

interface ProjectionPageProps {
  properties: Property[];
  onUpdateProperty: (id: number, field: keyof Property, value: string | number) => void;
  onAddProperty: () => void;
  onRemoveProperty: (id: number) => void;
  onNavigateBack: () => void;
}

const ProjectionPage: React.FC<ProjectionPageProps> = ({
  properties,
  onUpdateProperty,
  onAddProperty,
  onRemoveProperty,
  onNavigateBack,
}) => {
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('wholeUnit');
  const [globalSettings, setGlobalSettings] = useState<GlobalSettingsType>({
    interestRate: 4.5,
    loanTenure: 35,
    managementFeePercent: 12,
  });

  const updateProperty = useCallback((id: number, field: keyof Property, value: string | number) => {
    onUpdateProperty(id, field, value);
  }, [onUpdateProperty]);

  const calculatedData = properties.map(p => calculateAllMetrics(p, globalSettings, projectionMode));

  return (
    <>
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-[#700d1d] tracking-tight">Property Cash Flow Projection</h1>
        <p className="text-gray-600 mt-2">Analyze and compare property investments with detailed financial projections.</p>
      </header>

      <main>
        <div className="my-8 flex flex-col sm:flex-row justify-between items-center gap-6">
          <GlobalSettings settings={globalSettings} onSettingsChange={setGlobalSettings} />
           <div className="flex-shrink-0">
             <Toggle
              labelLeft="Whole Unit Rental"
              labelRight="Co-living Rental"
              optionLeft="wholeUnit"
              optionRight="coLiving"
              value={projectionMode}
              onChange={(newMode) => setProjectionMode(newMode as ProjectionMode)}
            />
           </div>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <Button onClick={onNavigateBack} variant="primary" className="bg-gray-600 hover:bg-gray-500 focus:ring-gray-500">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Transaction Analysis
          </Button>
          <Button onClick={onAddProperty}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Property Column
          </Button>
        </div>

        <div className="overflow-x-auto bg-white rounded-lg shadow-2xl ring-1 ring-gray-200">
          {properties.length > 0 ? (
            <ProjectionTable 
              properties={properties} 
              calculatedData={calculatedData}
              onUpdateProperty={updateProperty} 
              onRemoveProperty={onRemoveProperty}
              projectionMode={projectionMode}
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
    </>
  );
};

export default ProjectionPage;