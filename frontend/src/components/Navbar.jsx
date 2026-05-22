import React, { useState } from 'react';
import { Wind, LayoutDashboard, BrainCircuit, BarChart3, Map, FileSpreadsheet, Menu, X } from 'lucide-react';

const CYBER = '#F5E642';
const CYBER_DIM = 'rgba(245,230,66,0.45)';
const CYBER_GLOW = 'rgba(245,230,66,0.6)';
const CYBER_ACTIVE_BG = 'rgba(245,230,66,0.12)';
const CYBER_ACTIVE_BORDER = 'rgba(245,230,66,0.35)';
const CYBER_ACTIVE_SHADOW = '0 0 12px rgba(245,230,66,0.25), inset 0 0 8px rgba(245,230,66,0.06)';
const ONYX_96 = 'rgba(8,8,10,0.96)';

const navItems = [
  { id: 'dashboard',  label: 'Live Dashboard',     icon: LayoutDashboard },
  { id: 'prediction', label: 'AI Prediction',      icon: BrainCircuit    },
  { id: 'analytics',  label: 'Pollution Analytics', icon: BarChart3       },
  { id: 'map',        label: 'Interactive Map',    icon: Map             },
  { id: 'report',     label: 'HSE Reports',        icon: FileSpreadsheet },
];

const Navbar = ({ activeTab, setActiveTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <nav
      style={{
        background: 'rgba(8,8,10,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(245,230,66,0.10)',
      }}
      className="sticky top-0 z-50 px-6 py-4 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* ── Brand Logo ── */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => handleNavClick('dashboard')}
        >
          {/* Pulsing Wind icon */}
          <div
            style={{
              padding: '10px',
              borderRadius: '14px',
              background: 'rgba(245,230,66,0.08)',
              border: '1px solid rgba(245,230,66,0.22)',
              lineHeight: 0,
            }}
          >
            <Wind
              size={22}
              className="animate-pulse"
              style={{
                color: CYBER,
                filter: 'drop-shadow(0 0 8px rgba(245,230,66,0.6))',
              }}
            />
          </div>

          {/* Wordmark + tagline */}
          <div>
            <span
              className="font-display font-bold text-lg tracking-tight text-white block leading-none"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              AERO
              <span style={{ color: CYBER }}>SHIELD</span>
            </span>
            <span
              className="block text-[10px] font-semibold uppercase tracking-widest mt-0.5"
              style={{ color: CYBER_DIM, letterSpacing: '0.18em' }}
            >
              HSE AI Platform
            </span>
          </div>
        </div>

        {/* ── Desktop Nav Items ── */}
        <div className="hidden lg:flex items-center gap-1.5">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleNavClick(id)}
                className={`cy-nav-item${isActive ? ' active' : ''}`}
                style={
                  isActive
                    ? {
                        background: CYBER_ACTIVE_BG,
                        border: `1px solid ${CYBER_ACTIVE_BORDER}`,
                        color: CYBER,
                        boxShadow: CYBER_ACTIVE_SHADOW,
                        borderRadius: '999px',
                        padding: '8px 18px',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        whiteSpace: 'nowrap',
                      }
                    : {
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: 'rgba(232,232,236,0.5)',
                        borderRadius: '999px',
                        padding: '8px 18px',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        whiteSpace: 'nowrap',
                      }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'rgba(232,232,236,0.85)';
                    e.currentTarget.style.background = 'rgba(245,230,66,0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'rgba(232,232,236,0.5)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>



        {/* ── Mobile Hamburger ── */}
        <div className="lg:hidden flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="cursor-pointer transition-all duration-200"
            style={{
              padding: '8px',
              borderRadius: '999px',
              border: '1px solid rgba(245,230,66,0.18)',
              background: 'rgba(245,230,66,0.06)',
              color: 'rgba(232,232,236,0.75)',
            }}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

      </div>

      {/* ── Mobile Drawer ── */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden mt-4 p-4 space-y-1.5 animate-fadeIn"
          style={{
            background: ONYX_96,
            borderRadius: '16px',
            border: '1px solid rgba(245,230,66,0.12)',
          }}
        >
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleNavClick(id)}
                className={`cy-nav-item${isActive ? ' active' : ''} w-full`}
                style={
                  isActive
                    ? {
                        width: '100%',
                        background: CYBER_ACTIVE_BG,
                        border: `1px solid ${CYBER_ACTIVE_BORDER}`,
                        color: CYBER,
                        boxShadow: CYBER_ACTIVE_SHADOW,
                        borderRadius: '999px',
                        padding: '10px 18px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.25s ease',
                      }
                    : {
                        width: '100%',
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: 'rgba(232,232,236,0.5)',
                        borderRadius: '999px',
                        padding: '10px 18px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.25s ease',
                      }
                }
              >
                <Icon size={17} />
                {label}
              </button>
            );
          })}


        </div>
      )}
    </nav>
  );
};

export default Navbar;
