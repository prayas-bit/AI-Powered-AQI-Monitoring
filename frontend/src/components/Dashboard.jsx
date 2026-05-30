import React, { useState, useEffect } from 'react';
import { aqiService, CITY_STATIONS } from '../services/api';
import { Search, Thermometer, Droplets, Wind, AlertTriangle, ShieldCheck, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CYBER = '#F5E642';

const Dashboard = () => {
  const [activeCity, setActiveCity] = useState('Bengaluru');
  const [city, setCity] = useState('Bengaluru - Silk Board');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentAqi, setCurrentAqi] = useState(null);
  const [trend24h, setTrend24h] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const aqiData = await aqiService.getCurrentAqi(city);
        setCurrentAqi(aqiData);
        const histData = await aqiService.getHistoricalData(city, 1);
        if (histData.records) {
          const recs = histData.records.slice(-24).map(r => ({
            time: r.timestamp.slice(11, 16),
            aqi: r.aqi,
            pm25: r.pm25,
            pm10: r.pm10
          }));
          setTrend24h(recs);
          setAnalytics(histData.analytics);
        }
      } catch (err) {
        console.error(err);
        setError('Could not connect to AQI database or API. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [city, refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 60000); // Auto-refresh every minute
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      const matchedKey = Object.keys(CITY_STATIONS).find(k => k.toLowerCase() === query.toLowerCase());
      if (matchedKey) {
        setActiveCity(matchedKey);
        setCity(CITY_STATIONS[matchedKey][0]);
      } else {
        setCity(query);
      }
      setSearchQuery('');
    }
  };

  const getAqiCategoryProps = (val) => {
    if (val <= 50) return {
      label: 'Good', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',
      advice: 'Safe for all outdoor construction operations. No restrictions.', color: '#4ade80', icon: ShieldCheck
    };
    if (val <= 100) return {
      label: 'Moderate', text: 'text-[#F5E642]', bg: 'bg-[rgba(245,230,66,0.08)]', border: 'border-[rgba(245,230,66,0.3)]',
      advice: 'Safe for general construction. Active dust suppression in high-wind zones.', color: '#F5E642', icon: ShieldCheck
    };
    if (val <= 200) return {
      label: 'Unhealthy', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30',
      advice: 'Mandatory respirator (N95) wear. Suspend dry plastering and concrete sawing.', color: '#f87171', icon: AlertTriangle
    };
    if (val <= 300) return {
      label: 'Very Unhealthy', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30',
      advice: 'Suspended: Earth excavation, grading, and surface grinding. Deploy mist cannons.', color: '#c084fc', icon: AlertTriangle
    };
    return {
      label: 'Hazardous', text: 'text-rose-500', bg: 'bg-rose-950/20', border: 'border-rose-900/50',
      advice: 'EVACUATION: Suspend all site work. Retreat to filtered indoor shelters.', color: '#f43f5e', icon: AlertTriangle
    };
  };

  const aqiProps = currentAqi ? getAqiCategoryProps(currentAqi.aqi) : null;
  const AqiIcon = aqiProps ? aqiProps.icon : null;

  const pollutantCard = (label, value, unit, safeMax, color = null) => (
    <div style={{ background: 'rgba(12,12,16,0.6)', border: '1px solid rgba(245,230,66,0.08)' }}
      className="p-4 rounded-2xl flex flex-col justify-between">
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(232,232,236,0.45)' }}>{label}</span>
      <div className="flex items-baseline gap-1 mt-1.5">
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className="text-xs" style={{ color: 'rgba(232,232,236,0.45)' }}>{unit}</span>
      </div>
      <div className="w-full h-1 rounded-full mt-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, (value / safeMax) * 100)}%`, background: color || (value > safeMax * 0.7 ? '#f87171' : '#4ade80') }} />
      </div>
    </div>
  );

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 relative">

      {/* Decorative blobs */}
      <div className="cy-blob" style={{ width: 500, height: 400, top: -100, right: -100, animationDelay: '0s' }} />
      <div className="cy-blob" style={{ width: 300, height: 280, bottom: 200, left: -80, animationDelay: '-6s', opacity: 0.05 }} />

      {/* ── Header ── */}
      <div className="cy-glass p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(245,230,66,0.5)' }}>
            Real-Time Monitoring
          </p>
          <h1 className="font-display font-black text-white leading-none" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>
            AQI Prediction<br />
            <span style={{ color: CYBER }}>Safety Dashboard</span>
          </h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(232,232,236,0.4)' }}>
            Real-time pollutant monitoring, meteorological correlations &amp; civil HSE guidelines
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto shrink-0">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="cy-input w-full pl-10 pr-4 py-3 text-sm"
            />
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(245,230,66,0.4)' }} />
          </div>
          <button type="submit" className="cy-btn-primary py-3 px-6 text-sm shrink-0">
            Search
          </button>
        </form>
      </div>

      {/* ── City + Station Selector Bar ── */}
      <div className="cy-glass p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] mr-1" style={{ color: 'rgba(245,230,66,0.4)' }}>City</span>
          {Object.keys(CITY_STATIONS).map((c) => (
            <button
              key={c}
              onClick={() => { setActiveCity(c); setCity(CITY_STATIONS[c][0]); }}
              className={`cy-city-pill ${activeCity === c ? 'active' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto mt-1 sm:mt-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(245,230,66,0.4)' }}>Station</span>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="cy-select px-3 py-2 text-xs font-semibold flex-1 sm:flex-none"
          >
            {CITY_STATIONS[activeCity]?.map((st) => (
              <option key={st} value={st} style={{ background: '#0D0D10' }}>
                {st.split(' - ')[1] || st}
              </option>
            ))}
          </select>

          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="cy-btn-icon"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? 'cy-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="p-4 rounded-2xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* ── Spinner ── */}
      {loading && !currentAqi ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-12 h-12 rounded-full border-4 cy-pulse-glow"
            style={{ borderColor: 'rgba(245,230,66,0.15)', borderTopColor: CYBER, animation: 'cy-spin-slow 1s linear infinite' }} />
        </div>
      ) : currentAqi ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left + Centre: Charts & Stats ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Main AQI Hero Card */}
            <div className="cy-glass p-8 rounded-3xl relative overflow-hidden"
              style={{ borderColor: aqiProps.color + '40', boxShadow: `0 0 60px ${aqiProps.color}18` }}>
              {/* Glow backdrop */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full -z-10 blur-3xl"
                style={{ background: aqiProps.color, opacity: 0.07 }} />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(232,232,236,0.4)' }}>
                    Active Station: {currentAqi.city}
                  </p>
                  <h2 className="font-display font-black text-white mt-1" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
                    Air Quality Index
                  </h2>
                </div>
                <div className="flex items-center gap-2 px-5 py-2 rounded-full font-bold uppercase tracking-widest text-xs shrink-0"
                  style={{ background: aqiProps.color + '18', border: `1.5px solid ${aqiProps.color}50`, color: aqiProps.color }}>
                  <AqiIcon size={13} />
                  {aqiProps.label}
                </div>
              </div>

              <div className="flex items-baseline gap-4 mt-6">
                <span className="font-display font-black leading-none" style={{ fontSize: 'clamp(4rem, 10vw, 7rem)', color: aqiProps.color,
                  textShadow: `0 0 40px ${aqiProps.color}60` }}>
                  {currentAqi.aqi}
                </span>
                <span className="text-sm font-medium" style={{ color: 'rgba(232,232,236,0.4)' }}>AQI · US EPA Standard</span>
              </div>

              {/* HSE Directive banner */}
              <div className="mt-8 pt-6 flex items-start gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="p-3 rounded-xl shrink-0"
                  style={{ background: aqiProps.color + '15', border: `1px solid ${aqiProps.color}40`, color: aqiProps.color }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest block" style={{ color: 'rgba(232,232,236,0.4)' }}>
                    Civil Engineering Directive
                  </span>
                  <p className="text-white font-medium text-sm mt-1 leading-relaxed">{aqiProps.advice}</p>
                </div>
              </div>
            </div>

            {/* Pollutants Grid */}
            <div className="cy-glass p-6 rounded-3xl space-y-4">
              <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                <Layers size={16} style={{ color: CYBER }} />
                Pollutant Concentrations &amp; Weather
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {pollutantCard('PM 2.5', currentAqi.pm25, 'μg/m³', 150)}
                {pollutantCard('PM 10', currentAqi.pm10, 'μg/m³', 250)}
                {pollutantCard('SO₂', currentAqi.so2, 'ppb', 75)}
                {pollutantCard('NO₂', currentAqi.no2, 'ppb', 100)}
                {pollutantCard('CO', currentAqi.co, 'ppm', 9)}

                {/* Temperature */}
                <div style={{ background: 'rgba(12,12,16,0.6)', border: '1px solid rgba(245,230,66,0.08)' }}
                  className="p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'rgba(232,232,236,0.45)' }}>
                    <Thermometer size={11} style={{ color: '#f87171' }} /> Temperature
                  </span>
                  <span className="text-2xl font-bold text-white mt-1">{currentAqi.temperature} °C</span>
                  <span className="text-[10px] mt-1.5 block" style={{ color: 'rgba(232,232,236,0.3)' }}>Thermodynamic state</span>
                </div>

                {/* Humidity */}
                <div style={{ background: 'rgba(12,12,16,0.6)', border: '1px solid rgba(245,230,66,0.08)' }}
                  className="p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'rgba(232,232,236,0.45)' }}>
                    <Droplets size={11} style={{ color: '#60a5fa' }} /> Humidity
                  </span>
                  <span className="text-2xl font-bold text-white mt-1">{currentAqi.humidity}%</span>
                  <span className="text-[10px] mt-1.5 block" style={{ color: 'rgba(232,232,236,0.3)' }}>Relative atmospheric vapor</span>
                </div>

                {/* Wind */}
                <div style={{ background: 'rgba(12,12,16,0.6)', border: '1px solid rgba(245,230,66,0.08)' }}
                  className="p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'rgba(232,232,236,0.45)' }}>
                    <Wind size={11} style={{ color: CYBER }} /> Wind Speed
                  </span>
                  <span className="text-2xl font-bold text-white mt-1">{currentAqi.wind_speed} km/h</span>
                  <span className="text-[10px] mt-1.5 block" style={{ color: 'rgba(232,232,236,0.3)' }}>Particulate dispersion velocity</span>
                </div>
              </div>
            </div>

            {/* 24h Trend Chart */}
            <div className="cy-glass p-6 rounded-3xl space-y-4">
              <h3 className="text-base font-display font-bold text-white">AQI Trend — Past 24 Hours</h3>
              <div className="h-64 w-full">
                {trend24h.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend24h} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={aqiProps.color} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={aqiProps.color} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,230,66,0.05)" />
                      <XAxis dataKey="time" stroke="rgba(232,232,236,0.2)" tickLine={false} style={{ fontSize: 10 }} />
                      <YAxis stroke="rgba(232,232,236,0.2)" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(8,8,10,0.95)',
                          borderColor: 'rgba(245,230,66,0.2)',
                          borderRadius: 12,
                          color: '#E8E8EC',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="aqi"
                        name="AQI Index"
                        stroke={aqiProps.color}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorAqi)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex justify-center items-center text-sm" style={{ color: 'rgba(232,232,236,0.3)' }}>
                    No historical logs currently recorded in the system.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column: Safety Board ── */}
          <div className="space-y-6">

            {/* HSE Compliance Panel */}
            <div className="cy-glass p-6 rounded-3xl space-y-5">
              <div>
                <h3 className="text-xl font-display font-extrabold text-white">
                  Construction Safety<br />
                  <span style={{ color: CYBER }}>Advisory</span>
                </h3>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(232,232,236,0.35)' }}>
                  Compliance checklists derived from OSHA &amp; EPA regulations
                </p>
              </div>

              {/* Mandatory PPE */}
              <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(12,12,16,0.6)', border: '1px solid rgba(245,230,66,0.08)' }}>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] block" style={{ color: 'rgba(245,230,66,0.5)' }}>
                  Mandatory Site PPE
                </span>
                <ul className="space-y-2.5">
                  {currentAqi.aqi <= 100 ? (
                    <>
                      <li className="flex items-center gap-2 text-sm text-white">
                        <CheckCircle2 size={15} style={{ color: CYBER, flexShrink: 0 }} /> Hard Hat &amp; Steel Toe Boots
                      </li>
                      <li className="flex items-center gap-2 text-sm text-white">
                        <CheckCircle2 size={15} style={{ color: CYBER, flexShrink: 0 }} /> High-Visibility Vest
                      </li>
                      <li className="flex items-center gap-2 text-sm" style={{ color: 'rgba(232,232,236,0.35)', textDecoration: 'line-through' }}>
                        N95 Respirators (Recommended only)
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-2 text-sm text-white font-semibold">
                        <CheckCircle2 size={15} style={{ color: '#f87171', flexShrink: 0 }} /> Mandatory N95 Respirator
                      </li>
                      <li className="flex items-center gap-2 text-sm text-white font-semibold">
                        <CheckCircle2 size={15} style={{ color: '#f87171', flexShrink: 0 }} /> Sealed Safety Goggles
                      </li>
                      <li className="flex items-center gap-2 text-sm text-white">
                        <CheckCircle2 size={15} style={{ color: CYBER, flexShrink: 0 }} /> Long-Sleeve Work Uniform
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Dust Suppression */}
              <div className="p-5 rounded-2xl space-y-2" style={{ background: 'rgba(12,12,16,0.6)', border: '1px solid rgba(245,230,66,0.08)' }}>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] block" style={{ color: 'rgba(245,230,66,0.5)' }}>
                  Dust Suppression Spraying
                </span>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold text-white">Target Frequency:</span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{
                    background: currentAqi.aqi <= 100 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                    color: currentAqi.aqi <= 100 ? '#4ade80' : '#f87171',
                    border: `1px solid ${currentAqi.aqi <= 100 ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`
                  }}>
                    {currentAqi.aqi <= 50 ? 'End of Shift' :
                     currentAqi.aqi <= 100 ? '2× Daily' :
                     currentAqi.aqi <= 200 ? 'Every 3 Hours' : 'Hourly / Continuous'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,232,236,0.35)' }}>
                  Wet down soil stockpiles and haul roads to control loose dust particulate emissions.
                </p>
              </div>

              {/* Equipment Restrictions */}
              <div className="p-5 rounded-2xl space-y-2.5" style={{ background: 'rgba(12,12,16,0.6)', border: '1px solid rgba(245,230,66,0.08)' }}>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] block" style={{ color: 'rgba(245,230,66,0.5)' }}>
                  Equipment Restrictions
                </span>
                {[
                  ['Excavators & Earthmovers',
                    currentAqi.aqi <= 100 ? 'Permitted' : currentAqi.aqi <= 200 ? 'Dust-Controlled' : 'Suspended',
                    currentAqi.aqi <= 100],
                  ['Abrasive Blasting/Cutting',
                    currentAqi.aqi <= 100 ? 'Permitted' : 'Banned',
                    currentAqi.aqi <= 100],
                ].map(([label, status, safe]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-white">{label}:</span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{
                      background: safe ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.12)',
                      color: safe ? '#4ade80' : '#f87171',
                      border: `1px solid ${safe ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.3)'}`,
                      whiteSpace: 'nowrap'
                    }}>{status}</span>
                  </div>
                ))}
              </div>

              {/* Medical Notice */}
              <div className="p-4 rounded-xl text-xs space-y-1.5" style={{
                background: 'rgba(245,230,66,0.04)',
                border: '1px solid rgba(245,230,66,0.1)'
              }}>
                <span className="font-bold uppercase tracking-wider block text-[10px]" style={{ color: 'rgba(245,230,66,0.6)' }}>
                  Medical Notice
                </span>
                <p className="leading-relaxed" style={{ color: 'rgba(232,232,236,0.5)' }}>
                  {currentAqi.aqi <= 100
                    ? 'Personnel report normal conditions. First-aid clinics are on routine patrol.'
                    : 'AQI has crossed safe thresholds. HSE supervisors must screen workers for asthma, eye irritation, or hyperventilation.'}
                </p>
              </div>
            </div>

            {/* 24h Analytics Summary */}
            {analytics && (
              <div className="cy-glass p-6 rounded-3xl space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(245,230,66,0.6)' }}>
                  24h Stats Summary
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl" style={{ background: 'rgba(245,230,66,0.06)', border: '1px solid rgba(245,230,66,0.14)' }}>
                    <span className="text-[10px] uppercase tracking-wide block" style={{ color: 'rgba(232,232,236,0.4)' }}>Avg AQI</span>
                    <span className="text-2xl font-black font-display block mt-1" style={{ color: CYBER }}>{analytics.average_aqi}</span>
                  </div>
                  <div className="p-4 rounded-2xl" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <span className="text-[10px] uppercase tracking-wide block" style={{ color: 'rgba(232,232,236,0.4)' }}>Peak Spike</span>
                    <span className="text-2xl font-black font-display block mt-1 text-red-400">{analytics.highest_aqi}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : null}

    </div>
  );
};

export default Dashboard;
