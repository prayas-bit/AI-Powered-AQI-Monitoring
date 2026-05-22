import React, { useState, useEffect } from 'react';
import { aqiService, CITY_STATIONS } from '../services/api';
import { BarChart3, Wind, Thermometer, Droplets, ArrowRightLeft, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';

const ALL_STATIONS = Object.values(CITY_STATIONS).flat();

const AnalyticsPage = () => {
  const [activeCity, setActiveCity] = useState('Bengaluru');
  const [city, setCity] = useState('Bengaluru - Silk Board');
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // City comparison states
  const [compCity1, setCompCity1] = useState('Bengaluru - Silk Board');
  const [compCity2, setCompCity2] = useState('New Delhi - ITO');
  const [compData, setCompData] = useState([]);
  const [compLoading, setCompLoading] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      setStats(null);
      setHistory([]);
      setCorrelation(null);
      try {
        // Fetch 7 days history
        const data = await aqiService.getHistoricalData(city, 7);
        if (data.records) {
          // Downsample hourly records to daily average points for readable charts
          const dailyMap = {};
          data.records.forEach(r => {
            const date = r.timestamp.slice(5, 10); // MM-DD
            if (!dailyMap[date]) {
              dailyMap[date] = { date, aqiSum: 0, pm25Sum: 0, pm10Sum: 0, count: 0, windSum: 0 };
            }
            dailyMap[date].aqiSum += r.aqi;
            dailyMap[date].pm25Sum += r.pm25;
            dailyMap[date].pm10Sum += r.pm10;
            dailyMap[date].windSum += r.wind_speed;
            dailyMap[date].count += 1;
          });
          
          const dailyData = Object.values(dailyMap).map(d => ({
            date: d.date,
            aqi: Math.round(d.aqiSum / d.count),
            pm25: Math.round(d.pm25Sum / d.count),
            pm10: Math.round(d.pm10Sum / d.count),
            wind: Math.round((d.windSum / d.count) * 10) / 10
          }));
          
          setHistory(dailyData);
          setStats(data.analytics);
        }
        
        // Fetch correlations
        const corrData = await aqiService.getCorrelation(city);
        setCorrelation(corrData);
      } catch (err) {
        console.error(err);
        setError('Failed to load historical analytics. Ensure Flask is active.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [city]);

  // Handle City Comparison
  useEffect(() => {
    const fetchComparison = async () => {
      setCompLoading(true);
      try {
        const data = await aqiService.compareLocations([compCity1, compCity2]);
        setCompData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setCompLoading(false);
      }
    };
    
    fetchComparison();
  }, [compCity1, compCity2]);

  // Calculate unsafe hours (AQI > 100)
  const getUnsafeHoursCount = () => {
    if (!stats || !history.length) return 0;
    return history.filter(h => h.aqi > 100).length;
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header Select */}
      <div className="cy-glass p-6 rounded-2xl border shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        style={{ borderColor: 'rgba(245,230,66,0.25)' }}>
        <div>
          <h1 className="text-5xl font-display font-bold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 style={{ color: '#F5E642' }} size={36} />
            Historical Trends &amp; Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Analyze historical correlations, pollution spikes, and meteorological factors.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select
            value={activeCity}
            onChange={(e) => {
              const c = e.target.value;
              setActiveCity(c);
              setCity(CITY_STATIONS[c][0]);
            }}
            className="px-4 py-2.5 rounded-full cy-select text-sm font-semibold cursor-pointer w-full sm:w-auto"
          >
            {Object.keys(CITY_STATIONS).map(c => (
              <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
            ))}
          </select>
          
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-4 py-2.5 rounded-full cy-select text-sm font-semibold cursor-pointer w-full sm:w-auto"
          >
            {CITY_STATIONS[activeCity]?.map(st => (
              <option key={st} value={st} className="bg-slate-900 text-white">
                {st.split(" - ")[1] || st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-full bg-red-950/40 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 rounded-full animate-spin"
            style={{ borderColor: 'rgba(245,230,66,0.3)', borderTopColor: '#F5E642' }}></div>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          
          {/* KPI Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Avg AQI */}
            <div className="cy-glass p-6 rounded-2xl border shadow-md flex items-center gap-4"
              style={{ borderColor: 'rgba(245,230,66,0.25)' }}>
              <div className="p-3 rounded-xl border"
                style={{ background: 'rgba(245,230,66,0.08)', borderColor: 'rgba(245,230,66,0.2)', color: '#F5E642' }}>
                <BarChart3 size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">7-Day Average AQI</span>
                <span className="text-2xl font-bold text-white block mt-0.5">{stats.average_aqi}</span>
              </div>
            </div>

            {/* Peak Spike */}
            <div className="cy-glass p-6 rounded-2xl border shadow-md flex items-center gap-4"
              style={{ borderColor: 'rgba(245,230,66,0.25)' }}>
              <div className="p-3 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20">
                <ShieldAlert size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">7-Day Peak Spike</span>
                <span className="text-2xl font-bold text-white block mt-0.5">{stats.highest_aqi}</span>
              </div>
            </div>

            {/* Unsafe Days */}
            <div className="cy-glass p-6 rounded-2xl border shadow-md flex items-center gap-4"
              style={{ borderColor: 'rgba(245,230,66,0.25)' }}>
              <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 border border-violet-500/20">
                <FileText size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unsafe Days (AQI &gt; 100)</span>
                <span className="text-2xl font-bold text-white block mt-0.5">{getUnsafeHoursCount()} / 7</span>
              </div>
            </div>

            {/* Wind Impact */}
            <div className="cy-glass p-6 rounded-2xl border shadow-md flex items-center gap-4"
              style={{ borderColor: 'rgba(245,230,66,0.25)' }}>
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                <Wind size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wind Correlation</span>
                <span className="text-2xl font-bold text-white block mt-0.5">
                  {correlation ? correlation.correlation.aqi_vs_wind : '-0.42'}
                </span>
              </div>
            </div>
          </div>

          {/* Graphics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: 7-Day Average AQI */}
            <div className="cy-glass p-6 rounded-3xl border shadow-lg space-y-4"
              style={{ borderColor: 'rgba(245,230,66,0.25)' }}>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Daily Mean AQI Trend
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAqiAnal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(245,230,66,1)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="rgba(245,230,66,1)" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(245,230,66,0.2)', borderRadius: 8, color: '#f8fafc' }} />
                    <Area type="monotone" dataKey="aqi" name="Average AQI" stroke="#F5E642" strokeWidth={2} fillOpacity={1} fill="url(#colorAqiAnal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: PM2.5 vs PM10 Ratios */}
            <div className="cy-glass p-6 rounded-3xl border shadow-lg space-y-4"
              style={{ borderColor: 'rgba(245,230,66,0.25)' }}>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Particulate Matter Concentration Ratio (PM2.5 vs PM10)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(245,230,66,0.2)', borderRadius: 8, color: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="pm25" name="PM 2.5" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pm10" name="PM 10" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Wind vs AQI Dispersion correlation */}
            <div className="cy-glass p-6 rounded-3xl border shadow-lg space-y-4"
              style={{ borderColor: 'rgba(245,230,66,0.25)' }}>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Dispersion Analysis (Wind Speed vs AQI)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" stroke="#64748b" style={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" style={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(245,230,66,0.2)', borderRadius: 8, color: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line yAxisId="left" type="monotone" dataKey="aqi" name="AQI Level" stroke="#F5E642" strokeWidth={2} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="wind" name="Wind (km/h)" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Section 4: Correlation Details */}
            <div className="cy-glass p-6 rounded-3xl border shadow-lg flex flex-col justify-between"
              style={{ borderColor: 'rgba(245,230,66,0.25)' }}>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider mb-2">
                  Meteorological Correlation Coefficients
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Pearson-r values quantify dependencies between weather metrics and air quality. Values approaching -1.0 signify dispersion; +1.0 represent concentration traps.
                </p>
              </div>
              
              {correlation ? (
                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ background: 'rgba(245,230,66,0.08)', borderColor: 'rgba(245,230,66,0.25)' }}>
                    <span className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Thermometer size={14} className="text-red-400" />
                      Temperature vs AQI
                    </span>
                    <span className="text-sm font-bold text-white">{correlation.correlation.aqi_vs_temperature}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ background: 'rgba(245,230,66,0.08)', borderColor: 'rgba(245,230,66,0.25)' }}>
                    <span className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Droplets size={14} className="text-blue-400" />
                      Humidity vs AQI
                    </span>
                    <span className="text-sm font-bold text-white">{correlation.correlation.aqi_vs_humidity}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ background: 'rgba(245,230,66,0.08)', borderColor: 'rgba(245,230,66,0.25)' }}>
                    <span className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Wind size={14} style={{ color: '#F5E642' }} />
                      Wind Speed vs AQI
                    </span>
                    <span className="text-sm font-bold text-white">{correlation.correlation.aqi_vs_wind}</span>
                  </div>
                  <div className="p-3 rounded-xl border text-[11px]"
                    style={{ background: 'rgba(245,230,66,0.05)', borderColor: 'rgba(245,230,66,0.2)', color: '#F5E642' }}>
                    <b>Insight:</b> {correlation.insights.wind_impact}. {correlation.insights.humidity_impact}.
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">Calculating correlations...</div>
              )}
            </div>

          </div>

          {/* Location Comparisons */}
          <div className="cy-glass p-6 rounded-3xl border shadow-lg space-y-5"
            style={{ borderColor: 'rgba(245,230,66,0.25)' }}>
            <div className="flex items-center gap-3">
              <ArrowRightLeft style={{ color: '#F5E642' }} size={20} />
              <div>
                <h3 className="text-lg font-display font-bold text-white">Compare Locations</h3>
                <p className="text-slate-400 text-xs">Run relative side-by-side performance indicators between active stations.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Location 1</label>
                <select
                  value={compCity1}
                  onChange={(e) => setCompCity1(e.target.value)}
                  className="w-full px-3 py-2 rounded-full cy-select text-xs font-semibold"
                >
                  {ALL_STATIONS.map(st => (
                    <option key={st} value={st} className="bg-slate-900 text-white">{st}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Location 2</label>
                <select
                  value={compCity2}
                  onChange={(e) => setCompCity2(e.target.value)}
                  className="w-full px-3 py-2 rounded-full cy-select text-xs font-semibold"
                >
                  {ALL_STATIONS.map(st => (
                    <option key={st} value={st} className="bg-slate-900 text-white">{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {compLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading comparison details...</div>
            ) : compData.length === 2 ? (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-2.5 pr-2">Metric</th>
                      <th className="py-2.5 pr-2 cy-text">{compData[0].city}</th>
                      <th className="py-2.5 pr-2 text-violet-400">{compData[1].city}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                    <tr>
                      <td className="py-2.5 pr-2 text-slate-400">AQI Index</td>
                      <td className="py-2.5 pr-2 font-bold">{compData[0].aqi}</td>
                      <td className="py-2.5 pr-2 font-bold">{compData[1].aqi}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-2 text-slate-400">Category</td>
                      <td className="py-2.5 pr-2 font-semibold">{compData[0].category}</td>
                      <td className="py-2.5 pr-2 font-semibold">{compData[1].category}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-2 text-slate-400">PM2.5 (ug/m³)</td>
                      <td className="py-2.5 pr-2">{compData[0].pm25}</td>
                      <td className="py-2.5 pr-2">{compData[1].pm25}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-2 text-slate-400">PM10 (ug/m³)</td>
                      <td className="py-2.5 pr-2">{compData[0].pm10}</td>
                      <td className="py-2.5 pr-2">{compData[1].pm10}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-2 text-slate-400">Temperature (°C)</td>
                      <td className="py-2.5 pr-2">{compData[0].temperature}</td>
                      <td className="py-2.5 pr-2">{compData[1].temperature}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-2 text-slate-400">Wind Speed (km/h)</td>
                      <td className="py-2.5 pr-2">{compData[0].wind_speed}</td>
                      <td className="py-2.5 pr-2">{compData[1].wind_speed}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

        </div>
      ) : null}

    </div>
  );
};

export default AnalyticsPage;
