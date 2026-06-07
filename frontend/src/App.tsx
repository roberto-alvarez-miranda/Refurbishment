import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { PlanningView } from './components/dashboard/PlanningView';
import { ExecutionView } from './components/dashboard/ExecutionView';
import { ProjectOverviewView } from './components/dashboard/ProjectOverviewView';
import { MaterialLibraryView } from './components/dashboard/MaterialLibraryView';
import type { SidebarTab } from './components/layout/Sidebar';
import './index.css';

export type AppView = 'estado-actual' | 'planificacion' | 'ejecucion';

function App() {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('wbs-tree');
  const [currentView, setCurrentView] = useState<AppView>('estado-actual');

  return (
    <div className="bg-surface font-body-md text-on-surface flex min-h-screen">
      <Sidebar activeTab={sidebarTab} onTabChange={setSidebarTab} />
      
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Render main WBS Tree with Phase Navigation Header */}
        {sidebarTab === 'wbs-tree' && (
          <>
            <Header currentView={currentView} onViewChange={setCurrentView} />
            {currentView === 'estado-actual' && <Dashboard />}
            {currentView === 'planificacion' && <PlanningView />}
            {currentView === 'ejecucion' && <ExecutionView />}
          </>
        )}

        {/* Render Project Overview view */}
        {sidebarTab === 'project-overview' && (
          <ProjectOverviewView />
        )}

        {/* Render Material Library view */}
        {sidebarTab === 'material-library' && (
          <MaterialLibraryView />
        )}
      </main>
    </div>
  );
}

export default App;
