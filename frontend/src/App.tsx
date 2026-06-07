import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { PlanningView } from './components/dashboard/PlanningView';
import { ExecutionView } from './components/dashboard/ExecutionView';
import './index.css';

export type AppView = 'estado-actual' | 'planificacion' | 'ejecucion';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('estado-actual');

  return (
    <div className="bg-surface font-body-md text-on-surface flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        {currentView === 'estado-actual' && <Dashboard />}
        {currentView === 'planificacion' && <PlanningView />}
        {currentView === 'ejecucion' && <ExecutionView />}
      </main>
    </div>
  );
}

export default App;
