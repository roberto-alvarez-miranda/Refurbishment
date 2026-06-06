
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import './index.css';

function App() {
  return (
    <div className="bg-surface font-body-md text-on-surface flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <Header />
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
