export type SidebarTab = 'project-overview' | 'wbs-tree' | 'material-library';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside className="hidden lg:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant z-40">
      <div className="p-lg border-b border-outline-variant/30">
        <span className="text-title-sm font-title-sm font-black text-on-surface tracking-wider uppercase">Project Workspace</span>
      </div>
      <nav className="flex-1 px-sm space-y-xs mt-lg">
        {/* Project Overview Tab */}
        <button 
          onClick={() => onTabChange('project-overview')}
          className={`w-full flex items-center gap-md px-md py-sm transition-all duration-200 rounded-lg text-left ${
            activeTab === 'project-overview'
              ? 'bg-surface-container-highest text-on-secondary-container border-l-4 border-secondary font-bold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
          <span className="text-label-md font-label-md">Project Overview</span>
        </button>

        {/* WBS Tree Tab */}
        <button 
          onClick={() => onTabChange('wbs-tree')}
          className={`w-full flex items-center gap-md px-md py-sm transition-all duration-200 rounded-lg text-left ${
            activeTab === 'wbs-tree'
              ? 'bg-surface-container-highest text-on-secondary-container border-l-4 border-secondary font-bold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="account_tree">account_tree</span>
          <span className="text-label-md font-label-md">WBS Tree</span>
        </button>

        {/* Material Library Tab */}
        <button 
          onClick={() => onTabChange('material-library')}
          className={`w-full flex items-center gap-md px-md py-sm transition-all duration-200 rounded-lg text-left ${
            activeTab === 'material-library'
              ? 'bg-surface-container-highest text-on-secondary-container border-l-4 border-secondary font-bold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="inventory_2">inventory_2</span>
          <span className="text-label-md font-label-md">Material Library (ACAE)</span>
        </button>
      </nav>
      
      <div className="p-lg border-t border-outline-variant mt-auto bg-surface-container">
        <div className="flex items-center gap-md">
          <div className="w-sm h-sm bg-secondary rounded-full animate-pulse"></div>
          <span className="text-label-sm font-label-sm text-on-surface-variant">V. 2.5.0 (Production)</span>
        </div>
      </div>
    </aside>
  );
};
