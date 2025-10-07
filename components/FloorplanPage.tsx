
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Floorplan } from '../types';
import Button from './ui/Button';

interface FloorplanPageProps {
  floorplans: Floorplan[];
  onAddFloorplan: (floorplan: Floorplan) => void;
  onRemoveFloorplan: (id: string) => void;
}

const FloorplanPage: React.FC<FloorplanPageProps> = ({ floorplans, onAddFloorplan, onRemoveFloorplan }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFloorplan, setSelectedFloorplan] = useState<Floorplan | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      // FIX: Use spread syntax to create a properly typed File[] array, ensuring 'file' is inferred correctly.
      for (const file of [...event.target.files]) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            onAddFloorplan({
              id: crypto.randomUUID(),
              src: e.target?.result as string,
              name: file.name,
            });
          };
          reader.readAsDataURL(file);
        }
      }
      // Reset the input value to allow uploading the same file again
      event.target.value = '';
    }
  };

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              onAddFloorplan({
                id: crypto.randomUUID(),
                src: e.target?.result as string,
                name: `Pasted Image - ${new Date().toLocaleTimeString()}`,
              });
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
  }, [onAddFloorplan]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const triggerFileSelect = () => {
      fileInputRef.current?.click();
  }

  return (
    <div className="-mt-8">
      <header className="mb-8 flex justify-between items-center">
        <div className="text-center flex-grow">
            <h1 className="text-4xl font-bold text-[#700d1d] tracking-tight">Floor Plan Reference</h1>
            <p className="text-gray-600 mt-2">Upload or paste floor plans for quick reference.</p>
        </div>
      </header>
      
      <main>
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 text-center mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Add New Floor Plans</h2>
            <p className="text-gray-600 mb-4">You can paste an image (Ctrl+V) or upload PNG and JPG files from your computer.</p>
            <Button onClick={triggerFileSelect}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Browse & Upload Files
            </Button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                accept="image/png,image/jpeg"
                multiple
            />
        </div>

        {floorplans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {floorplans.map(fp => (
                    <div 
                        key={fp.id} 
                        className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden group relative cursor-pointer hover:shadow-xl hover:scale-105 transition-transform duration-200 flex flex-col"
                        onClick={() => setSelectedFloorplan(fp)}
                    >
                         <div className="w-full h-64 bg-gray-100 flex items-center justify-center p-2">
                            <img src={fp.src} alt={fp.name} className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="p-3 mt-auto">
                            <p className="text-sm font-medium text-gray-800 truncate" title={fp.name}>{fp.name}</p>
                        </div>
                        <Button 
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent modal from opening when deleting
                                onRemoveFloorplan(fp.id);
                            }}
                            variant="danger"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity !p-1.5 h-7 w-7"
                            aria-label="Remove floor plan"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </Button>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                </svg>
                <h3 className="mt-2 text-xl font-semibold text-gray-700">No Floor Plans Yet</h3>
                <p className="mt-1 text-sm text-gray-500">Your uploaded and pasted floor plans will appear here.</p>
            </div>
        )}
      </main>

      {selectedFloorplan && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedFloorplan(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedFloorplan.src} 
              alt={selectedFloorplan.name} 
              className="max-w-[90vw] max-h-[90vh] object-contain bg-white rounded-lg shadow-2xl"
            />
            <Button 
              onClick={() => setSelectedFloorplan(null)}
              variant="danger"
              size="sm"
              className="absolute -top-3 -right-3 !p-2 h-9 w-9 rounded-full shadow-lg"
              aria-label="Close maximized view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorplanPage;
