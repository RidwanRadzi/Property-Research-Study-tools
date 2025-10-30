import React, { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { SavedSession } from '../types';

interface HomePageProps {
  savedSessions: SavedSession[];
  onLoadSession: (id: number) => void;
  onDeleteSession: (id: number) => void;
  onRenameSession: (id: number, newName: string) => void;
  onCreateNewStudy: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ 
  savedSessions,
  onLoadSession,
  onDeleteSession,
  onRenameSession,
  onCreateNewStudy,
}) => {
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [newSessionName, setNewSessionName] = useState('');

  const handleStartRename = (session: SavedSession) => {
    setEditingSessionId(session.id);
    setNewSessionName(session.name);
  };

  const handleCancelRename = () => {
    setEditingSessionId(null);
    setNewSessionName('');
  };

  const handleSaveRename = () => {
    if (editingSessionId && newSessionName.trim()) {
      onRenameSession(editingSessionId, newSessionName.trim());
    }
    handleCancelRename();
  };


  return (
    <div className="flex flex-col items-center w-full">
      <header className="text-center mb-10 w-full">
        <h1 className="text-5xl font-bold text-[#700d1d] tracking-tight">
          New / Load Study
        </h1>
        <p className="text-gray-600 mt-4 text-lg max-w-2xl mx-auto">
          Continue a previous analysis or start a new one from scratch.
        </p>
      </header>

      <main className="w-full max-w-4xl">
        {savedSessions.length > 0 ? (
          <div className="w-full mb-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">My Saved Studies</h2>
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 space-y-3">
                  {savedSessions.map(session => (
                      <div key={session.id} className="flex flex-wrap justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors gap-4">
                          <div className="flex-grow">
                            {editingSessionId === session.id ? (
                                <Input
                                    type="text"
                                    value={newSessionName}
                                    onChange={(e) => setNewSessionName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveRename();
                                        if (e.key === 'Escape') handleCancelRename();
                                    }}
                                    autoFocus
                                    className="py-1"
                                />
                            ) : (
                                <div>
                                    <p className="font-semibold text-gray-900">{session.name}</p>
                                    <p className="text-sm text-gray-500">Saved on: {new Date(session.date).toLocaleString()}</p>
                                </div>
                            )}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                               {editingSessionId === session.id ? (
                                    <>
                                        <Button onClick={handleSaveRename} size="sm">Save</Button>
                                        <Button onClick={handleCancelRename} size="sm" className="bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400">Cancel</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button onClick={() => handleStartRename(session)} size="sm" className="bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500">Rename</Button>
                                        <Button onClick={() => onLoadSession(session.id)} size="sm">Load</Button>
                                        <Button onClick={() => onDeleteSession(session.id)} variant="danger" size="sm">Delete</Button>
                                    </>
                                )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg mb-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-xl font-semibold text-gray-700">No Saved Studies Found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new study below.</p>
          </div>
        )}

        <div className="text-center border-t border-gray-200 pt-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Or Start Fresh</h2>
            <Button onClick={onCreateNewStudy} size="md">
                Create New Study
            </Button>
        </div>
      </main>
    </div>
  );
};

export default HomePage;