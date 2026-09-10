import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Toast from './components/Toast';
import ScheduleBuilder from './views/ScheduleBuilder';
import TimetableMatrix from './views/TimetableMatrix';
import './styles/index.css';
import './styles/timetable.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('builder');
  const [toastMessage, setToastMessage] = useState('');

  return (
    <div className="fatgs-app-container">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="tab-viewport">
        {activeTab === 'builder' ? (
          <ScheduleBuilder onShowToast={setToastMessage} />
        ) : (
          <TimetableMatrix />
        )}
      </div>

      <Footer />

      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  );
}
