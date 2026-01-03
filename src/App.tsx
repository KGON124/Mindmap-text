import { useState } from 'react';
import type { Mode } from './types';
import { MandalaView } from './components/Mandala/MandalaView';
import { MindMapView } from './components/MindMap/MindMapCanvas';
import './App.css';

function App() {
  const [mode, setMode] = useState<Mode>('mandala');

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-gray-100 font-sans">
      <header className="glass flex justify-between items-center p-4 z-10 shrink-0">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          MindMap & Mandala
        </h1>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium ${mode === 'mandala'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
            onClick={() => setMode('mandala')}
          >
            Mandala
          </button>
          <button
            className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium ${mode === 'mindmap'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
            onClick={() => setMode('mindmap')}
          >
            Mind Map
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden relative p-4 container mx-auto">
        {mode === 'mandala' ? (
          <MandalaView />
        ) : (
          <MindMapView />
        )}
      </main>
    </div>
  );
}

export default App;
