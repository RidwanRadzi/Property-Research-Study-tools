
import React from 'react';
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
  onNavigateToFloorplans: () => void;
  onNavigateToRoomRentals: () => void;
  subjectPropertyName: string;
  globalSettings: GlobalSettingsType;
  setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettingsType>>;
  projectionMode: ProjectionMode;
  setProjectionMode: (mode: ProjectionMode) => void;
  loanPercentage1: number;
  setLoanPercentage1: (value: number) => void;
  loanPercentage2: number;
  setLoanPercentage2: (value: number) => void;
  onSaveSession: () => void;
}

const ProjectionPage: React.FC<ProjectionPageProps> = ({
  properties,
  onUpdateProperty,
  onAddProperty,
  onRemoveProperty,
  onNavigateBack,
  onNavigateToFloorplans,
  onNavigateToRoomRentals,
  subjectPropertyName,
  globalSettings,
  setGlobalSettings,
  projectionMode,
  setProjectionMode,
  loanPercentage1,
  setLoanPercentage1,
  loanPercentage2,
  setLoanPercentage2,
  onSaveSession,
}) => {

  const calculatedData = properties.map(p => calculateAllMetrics(p, globalSettings, projectionMode, loanPercentage1, loanPercentage2));

  return (
    <>
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-[#700d1d] tracking-tight">{subjectPropertyName} Cash Flow Projection</h1>
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
        
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <Button onClick={onNavigateBack} variant="primary" className="bg-gray-600 hover:bg-gray-500 focus:ring-gray-500">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Unit Listing
          </Button>
          <div className="flex gap-4">
            <Button onClick={onSaveSession} variant="primary" className="bg-green-600 hover:bg-green-500 focus:ring-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Session
            </Button>
            <Button onClick={onNavigateToFloorplans} variant="primary" className="bg-blue-600 hover:bg-blue-500 focus:ring-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" />
                </svg>
                Floor Plan Reference
            </Button>
            <Button onClick={onNavigateToRoomRentals} variant="primary" className="bg-purple-600 hover:bg-purple-500 focus:ring-purple-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Room Rental Reference
            </Button>
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
    </>
  );
};

export default ProjectionPage;
