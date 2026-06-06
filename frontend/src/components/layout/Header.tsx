

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 flex justify-between items-center px-lg py-sm w-full bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-md">
        <span className="material-symbols-outlined text-primary" data-icon="construction">construction</span>
        <h1 className="text-headline-md font-headline-md font-bold text-on-surface">107m2 Renovation Project</h1>
      </div>
      <div className="flex items-center gap-lg">
        <div className="hidden md:flex gap-md">
          <button className="text-secondary font-bold border-b-2 border-secondary px-xs py-base text-body-md font-body-md">Estado Actual</button>
          <button className="text-on-surface-variant hover:bg-surface-container-low transition-colors px-xs py-base text-body-md font-body-md">Planificación</button>
          <button className="text-on-surface-variant hover:bg-surface-container-low transition-colors px-xs py-base text-body-md font-body-md">Ejecución</button>
        </div>
        <span className="material-symbols-outlined text-primary" data-icon="account_circle">account_circle</span>
      </div>
    </header>
  );
};
