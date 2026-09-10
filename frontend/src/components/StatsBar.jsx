import React from 'react';

export default function StatsBar({ totalHours = 0, theoryHours = 0, labHours = 0, facultyCount = 0 }) {
  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-val stat-val-total">{totalHours}</div>
        <div className="stat-lbl">Total Scheduled Hours</div>
      </div>
      <div className="stat-card">
        <div className="stat-val stat-val-theory">{theoryHours}</div>
        <div className="stat-lbl">Theory Lectures</div>
      </div>
      <div className="stat-card">
        <div className="stat-val stat-val-lab">{labHours}</div>
        <div className="stat-lbl">Lab Practicals</div>
      </div>
      <div className="stat-card">
        <div className="stat-val stat-val-fac">{facultyCount}</div>
        <div className="stat-lbl">Active Faculty</div>
      </div>
    </div>
  );
}
