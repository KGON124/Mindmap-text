import { useState } from 'react';
import type { Mode } from './types';
import { MandalaView } from './components/Mandala/MandalaView';
import { MindMapView } from './components/MindMap/MindMapCanvas';
import { parseMindMap, parseMandala } from './utils/import';
import { useMindMapData } from './components/MindMap/useMindMapData';
import { useMandalaData } from './components/Mandala/useMandalaData';
import './App.css';

function App() {
  const [mode, setMode] = useState<Mode>('mandala');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Lifted Hooks
  const mandalaHook = useMandalaData();
  const mindMapHook = useMindMapData();

  const handleImport = () => {
    if (!importText.trim()) return;

    // Detection Heuristic
    if (importText.includes('## Center Grid') || importText.includes('## Main Grid')) {
      // It's a Mandala
      try {
        const data = parseMandala(importText);
        mandalaHook.setFullData(data); // Need to expose this in hook
        setMode('mandala');
        setIsImportOpen(false);
        setImportText('');
      } catch (e) {
        alert('Failed to parse Mandala Chart');
        console.error(e);
      }
    } else {
      // Assume Mind Map
      try {
        const root = parseMindMap(importText);
        mindMapHook.setRoot(root); // Need to expose this in hook
        setMode('mindmap');
        setIsImportOpen(false);
        setImportText('');
      } catch (e) {
        alert('Failed to parse Mind Map');
        console.error(e);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans">
      {/* Header with Floating Island Style */}
      <div className="p-4 z-10 shrink-0 flex justify-center w-full pointer-events-none">
        <header className="pointer-events-auto pop-card px-6 py-3 flex flex-col md:flex-row justify-between items-center w-full max-w-6xl shadow-xl shadow-slate-300/40 gap-4 md:gap-0">
          <h1 className="text-2xl font-black text-pop-text tracking-tight flex items-center gap-2">
            <span className="text-3xl">🧩</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pop-blue to-pop-orange">
              MindMap & Mandala
            </span>
          </h1>
          <div className="flex gap-3 w-full md:w-auto justify-center">
            <button
              onClick={() => setIsImportOpen(true)}
              className="pop-btn pop-btn-neutral font-bold text-sm"
            >
              📥 Import
            </button>

            <div className="h-8 w-px bg-slate-200 mx-2 self-center"></div>

            <button
              className={`pop-btn transition-all duration-300 ${mode === 'mandala'
                ? 'pop-btn-orange shadow-lg shadow-orange-200 scale-105'
                : 'pop-btn-neutral text-slate-400 border-transparent hover:border-slate-200'}`}
              onClick={() => setMode('mandala')}
            >
              Mandala
            </button>
            <button
              className={`pop-btn transition-all duration-300 ${mode === 'mindmap'
                ? 'pop-btn-blue shadow-lg shadow-blue-200 scale-105'
                : 'pop-btn-neutral text-slate-400 border-transparent hover:border-slate-200'}`}
              onClick={() => setMode('mindmap')}
            >
              Mind Map
            </button>
          </div>
        </header>
      </div>

      <main className="flex-1 overflow-hidden relative p-4 container mx-auto flex flex-col items-center">
        <div className="w-full max-w-7xl h-full flex flex-col">
          {mode === 'mandala' ? (
            <MandalaView
              data={mandalaHook.data}
              updateCell={mandalaHook.updateCell}
            />
          ) : (
            <MindMapView
              root={mindMapHook.root}
              updateNodeText={mindMapHook.updateNodeText}
              addSibling={mindMapHook.addSibling}
              addChild={mindMapHook.addChild}
              removeNodes={mindMapHook.removeNodes}
            />
          )}
        </div>
      </main>

      {/* Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn p-4">
          <div className="pop-card p-8 w-full max-w-2xl flex flex-col gap-6 transform transition-all scale-100">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-pop-text mb-1">Import / Restore</h2>
                <p className="text-slate-500 font-medium">
                  Paste your exported text to checkoint restore your progress.
                </p>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="text-2xl font-bold">×</span>
              </button>
            </div>

            <textarea
              className="w-full h-64 pop-input font-mono text-sm text-slate-700 resize-none leading-relaxed"
              placeholder={`- Root Node\n  - Child 1\n\nOR\n\n# Mandala Title\n## Center Grid\n- [0] ...`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                    if (mode === 'mandala') mandalaHook.resetData();
                    else mindMapHook.resetData();
                    setIsImportOpen(false);
                  }
                }}
                className="text-xs font-bold text-red-400 hover:text-red-500 hover:underline px-2"
              >
                🗑 Clear All Data
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsImportOpen(false)}
                  className="pop-btn pop-btn-neutral"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="pop-btn pop-btn-blue px-8 hover:shadow-lg hover:shadow-blue-200/50"
                >
                  RESTORE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
