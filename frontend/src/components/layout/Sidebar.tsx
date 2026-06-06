

export const Sidebar: React.FC = () => {
  return (
    <aside className="hidden lg:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant z-40">
      <div className="p-lg">
        <span className="text-title-sm font-title-sm font-black text-on-surface">Project Workspace</span>
      </div>
      <nav className="flex-1 px-sm space-y-xs">
        <a className="flex items-center gap-md px-md py-sm text-on-surface-variant hover:bg-surface-container transition-all duration-200 rounded-lg" href="#">
          <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
          <span className="text-label-md font-label-md">Project Overview</span>
        </a>
        <a className="flex items-center gap-md px-md py-sm bg-surface-container-highest text-on-secondary-container border-l-4 border-secondary font-bold rounded-lg" href="#">
          <span className="material-symbols-outlined" data-icon="account_tree">account_tree</span>
          <span className="text-label-md font-label-md">WBS Tree</span>
        </a>
        <a className="flex items-center gap-md px-md py-sm text-on-surface-variant hover:bg-surface-container transition-all duration-200 rounded-lg" href="#">
          <span className="material-symbols-outlined" data-icon="inventory_2">inventory_2</span>
          <span className="text-label-md font-label-md">Material Library</span>
        </a>
      </nav>
      <div className="p-lg border-t border-outline-variant mt-auto">
        <div className="flex items-center gap-md">
          <div className="w-sm h-sm bg-secondary rounded-full"></div>
          <span className="text-label-md font-label-md text-on-surface-variant">V. 2.4.0 (Alpha)</span>
        </div>
      </div>
    </aside>
  );
};
