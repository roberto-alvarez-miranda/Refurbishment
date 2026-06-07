import { useEffect, useState } from 'react';
import { auth, loginWithGoogle, logout } from '../../services/firebase';
import type { User } from 'firebase/auth';
import type { AppView } from '../../App';

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Listen to firebase authentication state changes
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    await loginWithGoogle();
  };

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que deseas cerrar la sesión?')) {
      await logout();
    }
  };

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center px-lg py-sm w-full bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-md">
        <span className="material-symbols-outlined text-primary" data-icon="construction">construction</span>
        <h1 className="text-headline-md font-headline-md font-bold text-on-surface">Reformia — Gestor de Reformas</h1>
      </div>
      <div className="flex items-center gap-lg">
        {/* Navigation Tabs - Connected Dynamically! */}
        <div className="hidden md:flex gap-md">
          <button 
            onClick={() => onViewChange('estado-actual')}
            className={`px-xs py-base text-body-md font-body-md transition-all ${
              currentView === 'estado-actual' 
                ? 'text-secondary font-bold border-b-2 border-secondary' 
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Estado Actual
          </button>
          <button 
            onClick={() => onViewChange('planificacion')}
            className={`px-xs py-base text-body-md font-body-md transition-all ${
              currentView === 'planificacion' 
                ? 'text-secondary font-bold border-b-2 border-secondary' 
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Planificación
          </button>
          <button 
            onClick={() => onViewChange('ejecucion')}
            className={`px-xs py-base text-body-md font-body-md transition-all ${
              currentView === 'ejecucion' 
                ? 'text-secondary font-bold border-b-2 border-secondary' 
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Ejecución
          </button>
        </div>
        
        <div className="flex items-center gap-sm">
          {user ? (
            <div className="flex items-center gap-sm">
              <div className="text-right hidden sm:block">
                <p className="text-body-sm font-bold text-on-surface">{user.displayName}</p>
                <button 
                  onClick={handleLogout}
                  className="text-body-sm text-error hover:underline block"
                >
                  Cerrar sesión
                </button>
              </div>
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="w-8 h-8 rounded-full border border-outline-variant cursor-pointer"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                />
              ) : (
                <span 
                  className="material-symbols-outlined text-primary text-[28px] cursor-pointer" 
                  data-icon="account_circle"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                >
                  account_circle
                </span>
              )}
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-xs border border-secondary text-secondary px-md py-sm rounded-lg hover:bg-secondary/5 transition-colors font-bold shadow-sm"
            >
              {/* Simple Google Colored Icon placeholder via SVG or text */}
              <svg className="w-4 h-4 mr-xs" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 3.827 1.01 4.767 1.91l3.307-3.178C18.15 1.91 15.42 1 12.24 1 5.92 1 1 5.92 1 12s4.92 11 11.24 11c6.59 0 11-4.63 11-11.2 0-.75-.08-1.32-.2-1.8H12.24z"/>
              </svg>
              <span className="text-label-md font-label-md">INICIAR SESIÓN</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
