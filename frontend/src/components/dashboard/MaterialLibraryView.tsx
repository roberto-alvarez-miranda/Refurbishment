import { useState } from 'react';
import { auth } from '../../services/firebase';

interface AcaeItem {
  code: string;
  description: string;
  unit: string;
  source: string;
}

export const MaterialLibraryView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<AcaeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      const headers: Record<string, string> = {};
      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Query the live BigQuery search endpoint
      const response = await fetch(
        `https://refurbishment-backend-21328141426.europe-southwest1.run.app/api/ai/acae-search?q=${encodeURIComponent(searchQuery)}`,
        { headers }
      );
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        console.error("Failed to query materials");
      }
    } catch (error) {
      console.error("Error searching ACAE library:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-sm sm:p-md md:p-lg space-y-md sm:space-y-lg max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div>
        <h2 className="text-headline-sm sm:text-headline-lg font-headline-lg text-on-surface">Biblioteca de Materiales (ACAE)</h2>
        <p className="text-body-xs sm:text-body-md font-body-md text-on-surface-variant">
          Consulta y busca en tiempo real en la base de datos oficial de ACAE. Más de 213,000 partidas y descompuestos indexados en Google Cloud BigQuery.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white border border-outline-variant rounded-xl p-md sm:p-lg shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-sm">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar material o partida (ej. Pladur, Inodoro, Porcelánico, Aislamiento)..."
            className="flex-1 border border-outline-variant rounded-lg p-sm text-body-md focus:outline-none focus:ring-2 focus:ring-secondary select-all"
          />
          <button
            type="submit"
            disabled={isLoading || !searchQuery.trim()}
            className="bg-primary text-on-primary px-lg py-sm rounded-lg hover:opacity-90 transition-all font-bold flex items-center justify-center gap-xs disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="search">search</span>
            <span>{isLoading ? 'BUSCANDO...' : 'BUSCAR EN BIGQUERY'}</span>
          </button>
        </form>
      </div>

      {/* Results Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-xl">
          <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mb-md animate-pulse">
            <span className="material-symbols-outlined text-[32px] text-secondary animate-spin" data-icon="sync">sync</span>
          </div>
          <p className="text-body-lg font-bold text-primary animate-pulse">Ejecutando consulta SQL en Google Cloud BigQuery...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-sm" data-icon="manage_search">manage_search</span>
          <h3 className="text-title-sm font-title-sm text-on-surface">Consulta la base de datos de precios</h3>
          <p className="text-body-md font-body-md text-on-surface-variant mt-xs max-w-md mx-auto">
            Introduce una palabra clave en el cuadro de búsqueda superior para encontrar códigos y especificaciones técnicas oficiales de fabricantes.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider w-16 text-center">Nº</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider w-44">Código ACAE</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Descripción Oficial del Fabricante</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider w-20 text-center">Unidad</th>
                  <th className="px-md py-sm text-label-md font-label-md text-on-surface-variant uppercase tracking-wider w-44">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-body-md">
                {results.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-md py-sm text-center text-on-surface-variant font-numeric-data">{idx + 1}</td>
                    <td className="px-md py-sm font-numeric-data text-secondary font-bold truncate max-w-[170px]" title={item.code}>{item.code}</td>
                    <td className="px-md py-sm text-on-surface">{item.description}</td>
                    <td className="px-md py-sm text-center text-on-surface-variant font-numeric-data">{item.unit}</td>
                    <td className="px-md py-sm text-body-sm text-green-700 font-bold">{item.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
