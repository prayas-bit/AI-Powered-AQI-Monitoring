import React, { useState, useEffect } from 'react';
import { aqiService, predictionService, reportService, CITY_STATIONS } from '../services/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { FileSpreadsheet, Download, CheckCircle, FileText, CheckCircle2 } from 'lucide-react';

const ReportPage = () => {
  const [activeCity, setActiveCity] = useState('Bengaluru');
  const [city, setCity] = useState('Bengaluru - Silk Board');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Custom sections to include in report
  const [includePredictions, setIncludePredictions] = useState(true);
  const [includeHseDirectives, setIncludeHseDirectives] = useState(true);
  const [includeHistoryTable, setIncludeHistoryTable] = useState(true);
  
  const [currentData, setCurrentData] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [historicalStats, setHistoricalStats] = useState(null);

  useEffect(() => {
    const loadPreviewData = async () => {
      setLoading(true);
      setError('');
      try {
        const cAqi = await aqiService.getCurrentAqi(city);
        setCurrentData(cAqi);
        
        const pAqi = await predictionService.getPrediction(city);
        setPredictionData(pAqi);
        
        const hData = await aqiService.getHistoricalData(city, 7);
        setHistoricalStats(hData);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch data for report preview. Verify backend connection.');
      } finally {
        setLoading(false);
      }
    };
    
    loadPreviewData();
  }, [city]);

  // Client-Side jsPDF Compiler
  const generateClientPdf = () => {
    if (!currentData || !predictionData) {
      alert('Report data is not fully loaded yet. Please wait.');
      return;
    }
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });
    
    // Page Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text("Environmental & Construction Safety Audit", 14, 20);
    
    // Sub-header
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Location: ${city} | Compiled on: ${new Date().toLocaleString()} | Client-Compiled Document`, 14, 26);
    doc.line(14, 28, 200, 28);
    
    // Current Air Quality Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 118, 110); // Teal 700
    doc.text("1. Executive Air Quality Summary", 14, 38);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(`The real-time Air Quality Index (AQI) stands at ${currentData.aqi}, categorized as ${currentData.category}.`, 14, 44);
    
    // Table of Pollutants
    const pollutantRows = [
      ["PM2.5 Concentration", `${currentData.pm25} ug/m3`, currentData.pm25 > 35 ? "Exceeds Limits" : "Within Range"],
      ["PM10 Concentration", `${currentData.pm10} ug/m3`, currentData.pm10 > 150 ? "Exceeds Limits" : "Within Range"],
      ["Nitrogen Dioxide (NO2)", `${currentData.no2} ppb`, "Within Range"],
      ["Sulfur Dioxide (SO2)", `${currentData.so2} ppb`, "Within Range"],
      ["Carbon Monoxide (CO)", `${currentData.co} ppm`, "Within Range"],
      ["Wind Speed", `${currentData.wind_speed} km/h`, "Dispersion factor"],
      ["Relative Humidity", `${currentData.humidity} %`, "Trapping factor"]
    ];
    
    doc.autoTable({
      startY: 48,
      head: [["Measurement Parameter", "Recorded Value", "Compliance Rating"]],
      body: pollutantRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      margin: { left: 14, right: 14 }
    });
    
    let nextY = doc.previousAutoTable.finalY + 12;
    
    // Construction Safety Details
    if (includeHseDirectives) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 118, 110);
      doc.text("2. Construction Site HSE Guidelines", 14, nextY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      
      const safetyStatus = currentData.aqi <= 100 ? "Permitted (Routine)" : currentData.aqi <= 200 ? "Restricted (PPE Required)" : "Suspended (Critical)";
      doc.text(`Safety Status Tag: ${safetyStatus}`, 14, nextY + 6);
      
      const d1 = currentData.aqi <= 100 
        ? "Safe for outdoor construction. Deploy standard water spraying. Check PPE compliance."
        : currentData.aqi <= 200
        ? "Mandate N95 respirator wear. Reduce active excavation. Increase water misting to every 3 hours."
        : "Critical hazard. Suspend all outdoor civil works immediately. Relocate staff to filtered rooms.";
        
      doc.text(`Operational Guideline: ${d1}`, 14, nextY + 12, { maxWidth: 180 });
      
      nextY += 24;
    }
    
    // AI Predictions
    if (includePredictions && predictionData) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 118, 110);
      doc.text("3. Predictive Environmental Intelligence", 14, nextY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`ML Linear Regression accuracy: R2 Score = ${predictionData.r2_score}. Forecasted averages below:`, 14, nextY + 6);
      
      const forecastRows = [
        ["Next Hour Forecast", `${predictionData.next_hour.aqi} AQI`],
        ["Tomorrow Average Forecast", `${predictionData.tomorrow.aqi} AQI`],
        ["Weekly Forecast (7 Days)", `${predictionData.weekly_trend[0].aqi} AQI (Mean Trend)`]
      ];
      
      doc.autoTable({
        startY: nextY + 10,
        head: [["Forecast Horizon", "Predicted AQI Value"]],
        body: forecastRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 118, 110] },
        margin: { left: 14, right: 14 }
      });
      
      nextY = doc.previousAutoTable.finalY + 12;
    }
    
    // Historical Table (Last 7 Days)
    if (includeHistoryTable && historicalStats && historicalStats.records) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 118, 110);
      doc.text("4. Weekly Historical Logs Summary", 14, nextY);
      
      // Calculate daily downsampled table
      const rows = historicalStats.records.slice(-10).map(r => [
        r.timestamp,
        r.aqi,
        r.temperature,
        r.humidity,
        r.wind_speed
      ]);
      
      doc.autoTable({
        startY: nextY + 6,
        head: [["Timestamp", "AQI Index", "Temp (C)", "Humidity (%)", "Wind (km/h)"]],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105] },
        margin: { left: 14, right: 14 }
      });
    }
    
    // Save PDF
    const name = `HSE_Report_${city.replace(' ', '_')}_Client.pdf`;
    doc.save(name);
  };

  // Direct backend report triggering
  const downloadBackendPdf = () => {
    const url = reportService.downloadPdfReport(city);
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Title Header */}
      <div
        className="cy-glass p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        style={{ borderColor: 'rgba(245,230,66,0.25)', borderWidth: '1px', borderStyle: 'solid' }}
      >
        <div>
          <h1 className="text-5xl font-display font-black cy-gradient-text tracking-tight flex items-center gap-3">
            <FileSpreadsheet size={40} style={{ color: '#F5E642' }} />
            Environmental Report Generator
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Export site metrics, predictions, and compliance audit summaries to PDF formats.
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
            className="cy-select px-4 py-2.5 rounded-full text-sm font-semibold cursor-pointer w-full sm:w-auto"
          >
            {Object.keys(CITY_STATIONS).map(c => (
              <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
            ))}
          </select>
          
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="cy-select px-4 py-2.5 rounded-full text-sm font-semibold cursor-pointer w-full sm:w-auto"
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
        <div className="p-4 rounded-full bg-red-950/40 border border-red-500/30 text-red-200 text-sm px-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Customize & Trigger Compile */}
        <div
          className="cy-glass p-6 rounded-3xl shadow-lg space-y-6"
          style={{ borderColor: 'rgba(245,230,66,0.25)', borderWidth: '1px', borderStyle: 'solid' }}
        >
          <div>
            <h3 className="text-lg font-display font-bold text-white">Customize Report</h3>
            <p className="text-slate-400 text-xs mt-1">Select sections to include in the exported audit logs.</p>
          </div>

          <div className="space-y-4">
            {/* HSE Checkbox */}
            <label
              className="flex items-center gap-3 cursor-pointer p-3 rounded-full transition-all"
              style={{
                background: includeHseDirectives ? 'rgba(245,230,66,0.08)' : 'rgba(2,6,23,0.3)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: includeHseDirectives ? 'rgba(245,230,66,0.35)' : 'rgba(255,255,255,0.05)',
                boxShadow: includeHseDirectives ? '0 0 10px rgba(245,230,66,0.12)' : 'none',
              }}
            >
              <input
                type="checkbox"
                checked={includeHseDirectives}
                onChange={(e) => setIncludeHseDirectives(e.target.checked)}
                className="w-4 h-4 rounded-full accent-yellow-400 bg-slate-900 border-white/10 focus:ring-yellow-400"
                style={{ accentColor: '#F5E642' }}
              />
              <div>
                <span className="text-sm font-semibold text-white block">HSE Construction Safety Directives</span>
                <span className="text-[10px] text-slate-400">Includes mandatory PPE, machinery bans, and spray instructions.</span>
              </div>
            </label>

            {/* Predictions Checkbox */}
            <label
              className="flex items-center gap-3 cursor-pointer p-3 rounded-full transition-all"
              style={{
                background: includePredictions ? 'rgba(245,230,66,0.08)' : 'rgba(2,6,23,0.3)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: includePredictions ? 'rgba(245,230,66,0.35)' : 'rgba(255,255,255,0.05)',
                boxShadow: includePredictions ? '0 0 10px rgba(245,230,66,0.12)' : 'none',
              }}
            >
              <input
                type="checkbox"
                checked={includePredictions}
                onChange={(e) => setIncludePredictions(e.target.checked)}
                className="w-4 h-4 rounded-full bg-slate-900 border-white/10 focus:ring-yellow-400"
                style={{ accentColor: '#F5E642' }}
              />
              <div>
                <span className="text-sm font-semibold text-white block">AI / ML Prediction Model Metrics</span>
                <span className="text-[10px] text-slate-400">Includes model performance statistics and 7-day forecast.</span>
              </div>
            </label>

            {/* History Checkbox */}
            <label
              className="flex items-center gap-3 cursor-pointer p-3 rounded-full transition-all"
              style={{
                background: includeHistoryTable ? 'rgba(245,230,66,0.08)' : 'rgba(2,6,23,0.3)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: includeHistoryTable ? 'rgba(245,230,66,0.35)' : 'rgba(255,255,255,0.05)',
                boxShadow: includeHistoryTable ? '0 0 10px rgba(245,230,66,0.12)' : 'none',
              }}
            >
              <input
                type="checkbox"
                checked={includeHistoryTable}
                onChange={(e) => setIncludeHistoryTable(e.target.checked)}
                className="w-4 h-4 rounded-full bg-slate-900 border-white/10 focus:ring-yellow-400"
                style={{ accentColor: '#F5E642' }}
              />
              <div>
                <span className="text-sm font-semibold text-white block">Historical Logs Breakdown Table</span>
                <span className="text-[10px] text-slate-400">Includes raw timestamped records for auditing teams.</span>
              </div>
            </label>
          </div>

          <div className="space-y-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Server-Side Button — Primary CY */}
            <button
              onClick={downloadBackendPdf}
              disabled={loading}
              className="cy-btn-primary w-full py-3 px-6 rounded-full font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              style={{
                background: '#F5E642',
                color: '#080809',
                boxShadow: '0 0 18px rgba(245,230,66,0.30)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(245,230,66,0.55)'; e.currentTarget.style.background = '#f7eb5a'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 18px rgba(245,230,66,0.30)'; e.currentTarget.style.background = '#F5E642'; }}
            >
              <Download size={16} />
              Server PDF Compile (ReportLab)
            </button>

            {/* Client-Side Button — Secondary */}
            <button
              onClick={generateClientPdf}
              disabled={loading}
              className="w-full py-3 px-6 rounded-full font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-white"
              style={{
                background: 'rgba(245,230,66,0.08)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(245,230,66,0.25)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,230,66,0.50)'; e.currentTarget.style.background = 'rgba(245,230,66,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,230,66,0.25)'; e.currentTarget.style.background = 'rgba(245,230,66,0.08)'; }}
            >
              <Download size={16} style={{ color: '#F5E642' }} />
              Client PDF Compile (jsPDF)
            </button>
          </div>
        </div>

        {/* Right Side: Report Data Preview Panel */}
        <div
          className="lg:col-span-2 cy-glass p-6 rounded-3xl shadow-lg space-y-6"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'rgba(245,230,66,0.25)',
          }}
        >
          <div>
            <h3 className="text-lg font-display font-bold text-white">Document Preview</h3>
            <p className="text-slate-400 text-xs mt-1">Live data staging before exporting the PDF document.</p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div
                className="w-10 h-10 border-4 rounded-full animate-spin"
                style={{
                  borderColor: 'rgba(245,230,66,0.20)',
                  borderTopColor: '#F5E642',
                }}
              ></div>
            </div>
          ) : currentData && predictionData ? (
            <div
              className="rounded-2xl p-6 space-y-6 text-sm"
              style={{
                background: 'rgba(8,8,9,0.55)',
                borderLeft: '2px solid rgba(245,230,66,0.40)',
                borderRight: '1px solid rgba(255,255,255,0.04)',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {/* Fake PDF Header */}
              <div className="flex justify-between items-start pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <h4 className="font-display font-extrabold text-white text-base">AEROSHIIELD ENVIRONMENTAL AUDIT</h4>
                  <span className="text-[10px] text-slate-400 font-mono">STATION ID: {currentData.city.toUpperCase()}_MUNI_01</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">REPORT CODE</span>
                  <span className="text-xs font-mono font-bold" style={{ color: '#F5E642' }}>PDF_LOG_2026_X</span>
                </div>
              </div>

              {/* Executive preview info */}
              <div className="space-y-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest block"
                  style={{ color: '#F5E642' }}
                >
                  1. Executive Summary
                </span>
                <p className="text-slate-300 leading-relaxed text-xs">
                  A municipal monitor scan in <b>{currentData.city}</b> records an AQI index of{' '}
                  <b className="text-lg font-black" style={{ color: '#F5E642' }}>{currentData.aqi}</b>, indicating{' '}
                  <b>{currentData.category}</b> levels. Concentrations: PM2.5 ={' '}
                  <b style={{ color: '#F5E642' }}>{currentData.pm25}</b> ug/m³, PM10 ={' '}
                  <b style={{ color: '#F5E642' }}>{currentData.pm10}</b> ug/m³, CO ={' '}
                  <b style={{ color: '#F5E642' }}>{currentData.co}</b> ppm.
                </p>
              </div>

              {/* HSE preview info */}
              {includeHseDirectives && (
                <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest block"
                    style={{ color: '#F5E642' }}
                  >
                    2. Construction Directives
                  </span>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Mandatory Site PPE:</span>
                      <span className="font-bold text-base" style={{ color: '#F5E642' }}>
                        {currentData.aqi > 100 ? 'N95 Mask, Sealed Goggles' : 'Standard Hard Hat, Steel Boots'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Dust Sprinkler Frequency:</span>
                      <span className="font-bold text-base" style={{ color: '#F5E642' }}>
                        {currentData.aqi <= 50 ? 'End of Shift' : currentData.aqi <= 100 ? '2x Daily' : 'Every 3 Hours'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Predictions preview */}
              {includePredictions && (
                <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest block"
                    style={{ color: '#F5E642' }}
                  >
                    3. ML Forecasting Models
                  </span>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Next Hour Forecast:</span>
                      <span className="font-black text-xl" style={{ color: '#F5E642' }}>
                        {predictionData.next_hour.aqi}
                      </span>
                      <span className="text-slate-400 text-[10px] ml-1">AQI</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Tomorrow Mean:</span>
                      <span className="font-black text-xl" style={{ color: '#F5E642' }}>
                        {predictionData.tomorrow.aqi}
                      </span>
                      <span className="text-slate-400 text-[10px] ml-1">AQI</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">R² Score Confidence:</span>
                      <span className="font-black text-xl" style={{ color: '#F5E642' }}>
                        {predictionData.r2_score}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Seeding note */}
              <div
                className="p-3 rounded-full text-[10px] text-slate-400 leading-relaxed flex items-center gap-2 px-5"
                style={{
                  background: 'rgba(245,230,66,0.06)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(245,230,66,0.20)',
                }}
              >
                <CheckCircle2 size={14} className="shrink-0" style={{ color: '#F5E642' }} />
                <span>The compilation processes active records from standard tables, appending appropriate signature stamps automatically.</span>
              </div>

            </div>
          ) : (
            <div className="py-20 text-center text-xs text-slate-500">Staging documents preview...</div>
          )}
        </div>

      </div>

    </div>
  );
};

export default ReportPage;
