import React, { useState, useEffect } from 'react';
import { predictionService, CITY_STATIONS } from '../services/api';
import { BrainCircuit, Calendar, Cpu, ArrowUpRight, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const PredictionPage = () => {
  const [activeCity, setActiveCity] = useState('Bengaluru');
  const [city, setCity] = useState('Bengaluru - Silk Board');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrediction = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await predictionService.getPrediction(city);
        setPrediction(data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch ML predictions. Ensure the backend server is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, [city]);

  const getAqiClass = (val) => {
    if (val <= 50) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (val <= 100) return 'text-[#F5E642] border-amber-500/20 bg-amber-500/5';
    if (val <= 200) return 'text-red-400 border-red-500/20 bg-red-500/5';
    if (val <= 300) return 'text-purple-400 border-purple-500/20 bg-purple-500/5';
    return 'text-rose-600 border-rose-900/40 bg-rose-950/10';
  };

  const getCategoryColor = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'good': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'unhealthy': return '#ef4444';
      case 'very unhealthy': return '#8b5cf6';
      default: return '#b91c1c';
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Title Header */}
      <div
        className="cy-glass p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        style={{ borderColor: 'rgba(245,230,66,0.25)', borderWidth: 1, borderStyle: 'solid' }}
      >
        <div>
          <h1 className="text-5xl font-display font-black cy-gradient-text tracking-tight flex items-center gap-2.5">
            <BrainCircuit style={{ color: '#F5E642' }} size={36} />
            AI AQI Prediction Module
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Machine Learning forecasting leveraging autoregressive time-series models (Linear Regression).
          </p>
        </div>

        {/* City & Station Switchers */}
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

      {loading && !prediction ? (
        <div className="flex justify-center items-center py-20">
          <div
            className="w-10 h-10 border-4 rounded-full animate-spin"
            style={{
              borderColor: 'rgba(245,230,66,0.30)',
              borderTopColor: '#F5E642',
            }}
          ></div>
        </div>
      ) : prediction ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Short-Term Forecasts */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Next Hour Forecast */}
              <div
                className="cy-glass p-6 rounded-3xl shadow-md flex flex-col justify-between h-64 relative overflow-hidden"
                style={{ borderColor: 'rgba(245,230,66,0.25)', borderWidth: 1, borderStyle: 'solid' }}
              >
                <div
                  className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-xl"
                  style={{ background: 'rgba(245,230,66,0.07)' }}
                ></div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Next Hour Forecast</span>
                    <Sparkles size={16} style={{ color: '#F5E642' }} />
                  </div>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className={`text-7xl font-display font-black tracking-tight ${getAqiClass(prediction.next_hour.aqi).split(' ')[0]}`}>
                      {prediction.next_hour.aqi}
                    </span>
                    <span className="text-slate-400 text-xs">AQI</span>
                  </div>
                  <span className={`inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border mt-2 ${getAqiClass(prediction.next_hour.aqi)}`}>
                    {prediction.next_hour.recommendation.status}
                  </span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-2.5">
                  <ShieldCheck size={16} style={{ color: '#F5E642' }} className="shrink-0 mt-0.5" />
                  <p className="text-slate-300 text-xs leading-normal">
                    {prediction.next_hour.recommendation.guidelines[0]}
                  </p>
                </div>
              </div>

              {/* Tomorrow Forecast */}
              <div
                className="cy-glass p-6 rounded-3xl shadow-md flex flex-col justify-between h-64 relative overflow-hidden"
                style={{ borderColor: 'rgba(245,230,66,0.25)', borderWidth: 1, borderStyle: 'solid' }}
              >
                <div
                  className="absolute -top-10 -right-10 w-24 h-24 bg-violet-500/10 rounded-full blur-xl"
                ></div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tomorrow Average</span>
                    <Calendar size={16} style={{ color: '#c084fc' }} />
                  </div>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className={`text-7xl font-display font-black tracking-tight ${getAqiClass(prediction.tomorrow.aqi).split(' ')[0]}`}>
                      {prediction.tomorrow.aqi}
                    </span>
                    <span className="text-slate-400 text-xs">AQI</span>
                  </div>
                  <span className={`inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border mt-2 ${getAqiClass(prediction.tomorrow.aqi)}`}>
                    {prediction.tomorrow.recommendation.status}
                  </span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-2.5">
                  <ShieldCheck size={16} style={{ color: '#c084fc' }} className="shrink-0 mt-0.5" />
                  <p className="text-slate-300 text-xs leading-normal">
                    {prediction.tomorrow.recommendation.guidelines[0]}
                  </p>
                </div>
              </div>

            </div>

            {/* Weekly Forecast Chart */}
            <div
              className="cy-glass p-6 rounded-3xl shadow-lg space-y-4"
              style={{ borderColor: 'rgba(245,230,66,0.25)', borderWidth: 1, borderStyle: 'solid' }}
            >
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                7-Day Weekly AQI Forecast
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prediction.weekly_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: 'rgba(245,230,66,0.2)',
                        borderRadius: 8,
                        color: '#f8fafc'
                      }} 
                    />
                    <ReferenceLine y={100} label={{ value: 'Unsafe Limit (100)', fill: '#ef4444', fontSize: 10, position: 'top' }} stroke="#ef4444" strokeDasharray="3 3" />
                    <Line 
                      type="monotone" 
                      dataKey="aqi" 
                      name="Predicted AQI"
                      stroke="#F5E642" 
                      strokeWidth={3}
                      activeDot={{ r: 8 }}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        return (
                          <circle 
                            key={payload.date} 
                            cx={cx} 
                            cy={cy} 
                            r={4} 
                            fill={getCategoryColor(payload.category)} 
                            stroke="none" 
                          />
                        );
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Right Column: Model Calibration and HSE Actions */}
          <div className="space-y-6">
            
            {/* Model Metadata */}
            <div
              className="cy-glass p-6 rounded-3xl shadow-lg space-y-4"
              style={{ borderColor: 'rgba(245,230,66,0.25)', borderWidth: 1, borderStyle: 'solid' }}
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu size={14} style={{ color: '#F5E642' }} />
                Model Specifications
              </h3>

              <div className="space-y-3.5">
                <div
                  className="flex justify-between items-center p-3 rounded-xl border border-white/5"
                  style={{ background: 'rgba(245,230,66,0.08)' }}
                >
                  <span className="text-xs text-slate-400">Regression Accuracy (R²)</span>
                  <span className="text-sm font-bold" style={{ color: '#F5E642' }}>{prediction.r2_score}</span>
                </div>
                <div
                  className="flex justify-between items-center p-3 rounded-xl border border-white/5"
                  style={{ background: 'rgba(245,230,66,0.08)' }}
                >
                  <span className="text-xs text-slate-400">Last Calibrated</span>
                  <span className="text-[10px] font-semibold text-slate-300">{prediction.last_trained}</span>
                </div>
                <div
                  className="flex justify-between items-center p-3 rounded-xl border border-white/5"
                  style={{ background: 'rgba(245,230,66,0.08)' }}
                >
                  <span className="text-xs text-slate-400">Model Type</span>
                  <span className="text-xs font-semibold text-white">Linear Regression</span>
                </div>
              </div>

              <div
                className="p-4 rounded-xl border space-y-2"
                style={{ background: 'rgba(245,230,66,0.04)', borderColor: 'rgba(245,230,66,0.15)' }}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Input Parameters (X-vector)</span>
                <div className="flex flex-wrap gap-1.5">
                  {['hour', 'day_of_week', 'lag_1', 'lag_2', 'lag_24', 'temperature', 'humidity', 'wind_speed'].map(f => (
                    <span
                      key={f}
                      className="text-[9px] px-2 py-0.5 rounded-full font-mono border"
                      style={{
                        background: 'rgba(245,230,66,0.07)',
                        color: '#F5E642',
                        borderColor: 'rgba(245,230,66,0.15)',
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly Construction Schedule Impact */}
            <div
              className="cy-glass p-6 rounded-3xl shadow-lg space-y-4"
              style={{ borderColor: 'rgba(245,230,66,0.25)', borderWidth: 1, borderStyle: 'solid' }}
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar size={14} style={{ color: '#F5E642' }} />
                Weekly Safety Outlook
              </h3>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {prediction.weekly_trend.map((day, idx) => {
                  const isUnsafe = day.aqi > 100;
                  return (
                    <div 
                      key={day.date} 
                      className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-colors ${
                        isUnsafe 
                          ? 'bg-red-950/20 border-red-500/20 text-red-200' 
                          : 'text-slate-200'
                      }`}
                      style={!isUnsafe ? {
                        background: 'rgba(245,230,66,0.04)',
                        borderColor: 'rgba(245,230,66,0.15)',
                      } : {}}
                    >
                      <div>
                        <span className="text-xs font-semibold block">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {day.temp}°C | {day.humidity}% Humidity
                        </span>
                      </div>
                      
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <span className="text-xs font-bold block">{day.aqi} AQI</span>
                          <span className="text-[9px] uppercase font-bold text-slate-400">{day.category}</span>
                        </div>
                        {isUnsafe ? (
                          <ShieldAlert size={16} className="text-red-400 shrink-0" />
                        ) : (
                          <ShieldCheck size={16} style={{ color: '#F5E642' }} className="shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      ) : null}

    </div>
  );
};

export default PredictionPage;
