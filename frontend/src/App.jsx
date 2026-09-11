import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Toast from './components/Toast';
import ScheduleBuilder from './views/ScheduleBuilder';
import './styles/index.css';
import './styles/timetable.css';

export default function App() {
  const [toastMessage, setToastMessage] = useState('');

  return (
    <div className="fatgs-app-container">
      <Header />

      <div className="main-viewport">
        <ScheduleBuilder onShowToast={setToastMessage} />
      </div>

      <Footer />

      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  );
}
