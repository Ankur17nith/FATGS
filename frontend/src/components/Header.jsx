import React from 'react';

export default function Header() {
  return (
    <header className="institutional-header">
      {/* Top Tier: Institutional Identity */}
      <div className="header-top-tier">
        <div className="header-top-content">
          <div className="nith-brand-container">
            <div className="nith-logo-wrapper">
              <img
                src="/nith-logo.png"
                alt="National Institute of Technology Hamirpur"
                className="nith-logo-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="nith-logo-fallback" style={{ display: 'none' }}>
                NITH
              </div>
            </div>
            <div className="nith-titles-stack">
              <div className="nith-hindi-title">राष्ट्रीय प्रौद्योगिकी संस्थान हमीरपुर</div>
              <div className="nith-english-title">National Institute of Technology, Hamirpur</div>
              <div className="nith-tagline">Department of Computer Science &amp; Engineering</div>
            </div>
          </div>

          <div className="header-right-meta">
            <span className="app-title-badge">FATGS — Timetable Studio</span>
          </div>
        </div>
      </div>

      {/* Sub Tier: Module Context and Status */}
      <div className="header-nav-tier">
        <div className="header-nav-content">
          <div className="nav-links">
            <span className="nav-item active">
              Academic Schedule Builder
            </span>
          </div>
          <div className="nav-status">
            <span className="badge-status badge-local">
              Live Generation Engine
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
