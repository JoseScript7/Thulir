import { useState, type Dispatch, type SetStateAction } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Radio, Menu, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';

// NavItem component for numbered links
const NavItem = ({ number, label, delay }: { number: string; label: string; delay: number }) => (
  <a
    href="#"
    className="flex items-center gap-[3px] text-[#AFDDFF]/80 hover:text-[#AFDDFF] transition-colors"
    style={{ animationDelay: `${delay}ms` }}
  >
    <span className="text-[#AFDDFF]/80 text-[13px] leading-[15.6px] font-manrope">{number}.</span>
    <span className="text-white text-[13px] leading-[15.6px] font-manrope">{label}</span>
  </a>
);

const Nav = ({
  menuOpen,
  setMenuOpen,
}: {
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
}) => (
  <nav className="absolute top-0 left-0 w-full flex items-center px-5 md:px-[35px] py-5 md:py-[27px]">
    {/* Left group */}
    <div className="flex items-center gap-[40px]">
      <div
        className="font-graphik text-white text-[18px] md:text-[21px] leading-[21px] whitespace-nowrap anim-fade-up"
        style={{ animationDelay: '200ms' }}
      >
        THULIR // INDEX
      </div>
      <div className="hidden lg:flex items-center gap-[40px]">
        <NavItem number="01" label="CATCHMENTS" delay={350} />
        <NavItem number="02" label="RECHARGE_STRUCTURES" delay={450} />
        <NavItem number="03" label="THULIR_INDEX" delay={550} />
        <NavItem number="04" label="FIELD_PARTNERS" delay={650} />
      </div>
    </div>
    {/* Right group */}
    <div className="hidden lg:flex items-center gap-[12px] ml-auto anim-slide-right" style={{ animationDelay: '600ms' }}>
      <Radio className="w-[15px] h-[15px] stroke-[1.5]" />
      <span className="font-manrope text-white text-[13px] leading-[15.6px]">NODE // STR-004</span>
      <span className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">[ LIVE ]</span>
      <span className="font-manrope text-white text-[13px] leading-[15.6px] ml-[20px]">STATUS:</span>
      <span className="bg-[#AFDDFF] rounded-[3px] px-[5px] py-[2px] text-black text-[13px] leading-[15.6px]">FIELD_VERIFIED</span>
    </div>
    {/* Hamburger for mobile */}
    <button
      className="lg:hidden ml-auto relative w-[40px] h-[40px] flex items-center justify-center anim-fade-in"
      style={{ animationDelay: '400ms' }}
      aria-label="Toggle menu"
      onClick={() => setMenuOpen(!menuOpen)}
    >
      <span
        className={`absolute transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
          menuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
        }`}
      >
        <Menu className="w-[22px] h-[22px] text-white stroke-[1.5]" />
      </span>
      <span
        className={`absolute transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
          menuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        }`}
      >
        <X className="w-[22px] h-[22px] text-white stroke-[1.5]" />
      </span>
    </button>
  </nav>
);

const MobileMenu = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => (
  <div
    className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    aria-hidden={!open}
  >
    {/* Backdrop */}
    <div
      className={`absolute inset-0 bg-black/90 backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${open ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    />
    {/* Panel */}
    <div
      className={`relative h-full flex flex-col px-5 pt-24 pb-10 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
    >
      {/* Close button */}
      <button
        className="absolute top-5 right-5 w-[40px] h-[40px] flex items-center justify-center"
        aria-label="Close menu"
        onClick={onClose}
      >
        <X className="w-[22px] h-[22px] text-white stroke-[1.5]" />
      </button>

      {/* Nav list */}
      <nav className="flex flex-col gap-8">
        {['CATCHMENTS', 'RECHARGE_STRUCTURES', 'THULIR_INDEX', 'FIELD_PARTNERS'].map((label, i) => (
          <div
            key={label}
            className={`flex items-center gap-3 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${open ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}
            style={{ transitionDelay: open ? `${150 + i * 75}ms` : '0ms' }}
          >
            <span className="font-manrope text-[#AFDDFF]/80 text-[14px] leading-[1]">{`${String(i + 1).padStart(2, '0')}.`}</span>
            <span className="font-manrope text-white text-[28px] leading-[1.2] tracking-tight">{label}</span>
          </div>
        ))}
      </nav>

      {/* Bottom status block */}
      <div
        className={`mt-auto pt-10 border-t border-white/10 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ transitionDelay: open ? '450ms' : '0ms' }}
      >
        <div className="flex items-center gap-[10px] mb-3">
          <Radio className="w-[15px] h-[15px] stroke-[1.5]" />
          <span className="font-manrope text-white text-[13px] leading-[15.6px]">NODE // STR-004</span>
          <span className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">[ LIVE ]</span>
        </div>
        <div className="flex items-center gap-[8px]">
          <span className="font-manrope text-white text-[13px] leading-[15.6px]">STATUS:</span>
          <span className="bg-[#AFDDFF] rounded-[3px] px-[5px] py-[2px] text-black text-[13px] leading-[15.6px]">FIELD_VERIFIED</span>
        </div>
      </div>
    </div>
  </div>
);

const Hero = () => (
  <h1
    className="font-graphik text-white font-normal leading-[1em] absolute anim-fade-up text-[32px] top-[140px] left-5 max-w-[300px] sm:text-[48px] sm:top-[160px] sm:max-w-[420px] md:text-[68px] md:top-[178px] md:left-[35px] md:max-w-[554px]"
    style={{ animationDelay: '400ms' }}
  >
    Every Drop Tracked. Every Sprout Restored.
  </h1>
);
const GridLines = () => (
  <div className="absolute inset-0 pointer-events-none">
    {/* Vertical lines */}
    {['12.6%', '37.5%', '61.9%', '86.2%'].map((left, i) => (
      <div
        key={`v${i}`}
        className="absolute top-0 h-full w-px bg-white/[0.04] anim-grid-v"
        style={{ left, animationDelay: `${600 + i * 100}ms` }}
      />
    ))}
    {/* Horizontal lines */}
    {['32.7%', '71.4%'].map((top, i) => (
      <div
        key={`h${i}`}
        className="absolute left-0 w-full h-px bg-white/[0.04] anim-grid-h"
        style={{ top, animationDelay: `${800 + i * 150}ms` }}
      />
    ))}
    {/* Plus marks at intersections */}
    {['12.6%', '37.5%', '61.9%', '86.2%'].map((left, vi) =>
      ['32.7%', '71.4%'].map((top, hi) => {
        const delay = 1000 + (hi * 4 + vi) * 80;
        return (
          <div
            key={`plus-${hi}-${vi}`}
            className="absolute anim-scale-in"
            style={{ top, left, animationDelay: `${delay}ms` }}
          >
            <div className="absolute w-[10px] h-px bg-white/70 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute w-px h-[10px] bg-white/70 -translate-x-1/2 -translate-y-1/2" />
          </div>
        );
      })
    )}
  </div>
);
const ConnectorLine = ({ x1, y1, x2, y2, delay }: { x1: string; y1: string; x2: string; y2: string; delay: number }) => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none anim-fade-in" style={{ animationDelay: `${delay}ms` }}>
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="rgba(255,255,255,0.25)"
      strokeWidth="1"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

const CentralNodes = () => (
  <div className="absolute inset-0 pointer-events-none hidden md:block">
    {/* Squares */}
    <div
      className="absolute w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border border-white/80 anim-scale-in"
      style={{ top: '27%', left: '60%', animationDelay: '1500ms' }}
    />
    <div
      className="absolute w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border border-white/80 anim-scale-in"
      style={{ top: '58%', left: '32%', animationDelay: '1800ms' }}
    />
    <div
      className="absolute w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border border-white/80 anim-scale-in"
      style={{ top: '63%', left: '50%', animationDelay: '2100ms' }}
    />
    {/* Labels */}
    <div
      className="absolute anim-slide-left"
      style={{ top: '11%', left: '26%', animationDelay: '1100ms' }}
    >
      <span className="font-manrope text-white text-[13px] leading-[15.6px] whitespace-nowrap">
        [ TELEMETRY_NODE ]
      </span>
      <p className="font-manrope text-white/50 text-[11px] leading-[14px] mt-[4px] max-w-[160px]">
        Edge sensors streaming live depth and silt readings.
      </p>
    </div>
    <div
      className="absolute anim-slide-left"
      style={{ top: '76%', left: '3%', animationDelay: '1400ms' }}
    >
      <span className="font-manrope text-white text-[13px] leading-[15.6px] whitespace-nowrap">
        [ THULIR_ENGINE ]
      </span>
      <p className="font-manrope text-white/50 text-[11px] leading-[14px] mt-[4px] max-w-[160px]">
        Infiltration Efficiency Index computed from live catchment data.
      </p>
    </div>
    <div
      className="absolute anim-slide-right"
      style={{ top: '50%', left: '78%', animationDelay: '1700ms' }}
    >
      <span className="font-manrope text-white text-[13px] leading-[15.6px] whitespace-nowrap">
        [ FIELD_NETWORK ]
      </span>
      <p className="font-manrope text-white/50 text-[11px] leading-[14px] mt-[4px] max-w-[180px]">
        Low-latency alerts reaching panchayats before monsoon.
      </p>
    </div>
    {/* Connector lines */}
    <ConnectorLine x1="38%" y1="14%" x2="52%" y2="14%" delay={1200} />
    <ConnectorLine x1="52%" y1="14%" x2="60%" y2="27%" delay={1400} />
    <ConnectorLine x1="32%" y1="58%" x2="20%" y2="74%" delay={1500} />
    <ConnectorLine x1="20%" y1="74%" x2="6%" y2="74%" delay={1700} />
    <ConnectorLine x1="78%" y1="53%" x2="63%" y2="53%" delay={1800} />
    <ConnectorLine x1="63%" y1="53%" x2="50%" y2="63%" delay={2000} />
  </div>
);
const BottomRow = () => (
  <div className="absolute bottom-5 md:bottom-[35px] left-5 md:left-[35px] right-5 md:right-[35px] flex flex-col md:flex-row items-start md:items-end justify-between gap-5 md:gap-0">
    {/* Left — CTA button wrapped in Link for navigation */}
    <Link
      to="/dashboard"
      className="bg-[#AFDDFF] px-[16px] md:px-[20px] py-[10px] md:py-[12px] flex items-center gap-[10px] hover:bg-[#c8e8ff] transition-colors anim-fade-up"
      style={{ animationDelay: '900ms' }}
    >
      <span className="text-black text-[16px] leading-none">&#10022;</span>
      <span className="font-manrope text-black text-[12px] md:text-[13px] leading-[15.6px] uppercase tracking-wide">
        View Live Catchment Map
      </span>
    </Link>
    {/* Right — info card */}
    <div className="relative max-w-[280px] hidden sm:block anim-slide-right" style={{ animationDelay: '1100ms' }}>
      {/* Badge */}
      <span className="font-manrope text-black text-[13px] leading-[15.6px] bg-[#AFDDFF] px-[6px] py-[2px] inline-block mb-[10px]">
        NOT A DASHBOARD — AN REVIVAL NETWORK
      </span>
      {/* Card body */}
      <div className="relative p-[20px]">
        {/* Chamfered border SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 280 168"
          preserveAspectRatio="none"
        >
          <polygon
            points="0.5,0.5 279.5,0.5 279.5,167.5 30,167.5 0.5,137.5"
            fill="none"
            stroke="#AFDDFF"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <p className="relative font-manrope text-white text-[13px] leading-[18px] mb-[18px]">
          Maps the health of check dams and percolation ponds with data that brings clarity and timely revival to every catchment.
        </p>
        <a className="relative font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px] cursor-pointer hover:underline">
          VIEW_INFILTRATION_REPORT
        </a>
      </div>
    </div>
  </div>
);

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <section className="relative w-full h-screen overflow-hidden bg-black">
            <video
              className="absolute inset-0 w-full h-full object-cover anim-fade-in"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4"
              autoPlay
              muted
              loop
              playsInline
            />
            <div className="relative z-10 w-full h-full">
              <Nav menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
              <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
              <Hero />
              <GridLines />
              <CentralNodes />
              <BottomRow />
            </div>
          </section>
        }
      />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}
