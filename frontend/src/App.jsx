import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import PredictionPage from './components/PredictionPage';
import AnalyticsPage from './components/AnalyticsPage';
import MapView from './components/MapView';
import ReportPage from './components/ReportPage';
import { Wind, Hammer } from 'lucide-react';


function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':  return <Dashboard />;
      case 'prediction': return <PredictionPage />;
      case 'analytics':  return <AnalyticsPage />;
      case 'map':        return <MapView />;
      case 'report':     return <ReportPage />;
      default:           return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-grow flex flex-col">
        {renderActiveView()}
      </main>

      <footer style={{ borderTop: '1px solid rgba(245,230,66,0.08)', background: 'rgba(8,8,10,0.8)' }}
        className="py-5 px-6 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ color: 'rgba(232,232,236,0.35)' }}>
          <div className="flex items-center gap-2">
            <Wind size={13} style={{ color: '#F5E642' }} />
            <span className="font-semibold" style={{ color: 'rgba(232,232,236,0.55)' }}>AeroShield HSE</span>
            <span>© 2026. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-1">
            <Hammer size={12} />
            <span>Civil Engineering HSE Standards Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
