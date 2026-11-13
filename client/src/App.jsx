import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Coaches from './pages/Coaches';
import CoachDetails from './pages/CoachDetails';
import HealthAssessment from './pages/HealthAssessment';
import Login from './pages/Login';
import Register from './pages/Register';
import Payment from './pages/Payment';
import Chat from './pages/Chat';
import Contact from './pages/Contact';
import AdminDashboard from './pages/AdminDashboard';
import CoachDashboard from './pages/CoachDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import { useScrollReveal } from './hooks/useScrollReveal';

function MainRouter() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState('home');
  const [selectedCoachId, setSelectedCoachId] = useState(null);
  const [activeConsultationId, setActiveConsultationId] = useState(null);

  // Initialize scroll reveal observer whenever the page view updates
  useScrollReveal([activePage]);

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      const [route, param] = hash.split('/');

      if (route === 'coach-details' && param) {
        setSelectedCoachId(param);
        setActivePage('coach-details');
      } else if (route === 'payment' && param) {
        setSelectedCoachId(param);
        setActivePage('payment');
      } else if (route === 'chat' && param) {
        setActiveConsultationId(param);
        setActivePage('chat');
      } else if (route) {
        setActivePage(route);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    if (window.location.hash) {
      handleHashChange();
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page, param = null) => {
    setActivePage(page);
    if (param) {
      window.location.hash = `${page}/${param}`;
    } else {
      window.location.hash = page;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurrentPage = () => {
    switch (activePage) {
      case 'home':
        return (
          <Home
            setActivePage={navigateTo}
            setSelectedCoachId={setSelectedCoachId}
          />
        );

      case 'services':
        return (
          <Services
            setActivePage={navigateTo}
            setSelectedCoachId={setSelectedCoachId}
          />
        );

      case 'about':
        return <About setActivePage={navigateTo} />;

      case 'coaches':
        return (
          <Coaches
            setActivePage={navigateTo}
            setSelectedCoachId={setSelectedCoachId}
          />
        );

      case 'coach-details':
        return (
          <CoachDetails
            coachId={selectedCoachId}
            setActivePage={navigateTo}
            setSelectedCoachId={setSelectedCoachId}
            setActiveConsultationId={setActiveConsultationId}
          />
        );

      case 'health-assessment':
        return <HealthAssessment setActivePage={navigateTo} />;

      case 'login':
        return (
          <Login
            setActivePage={navigateTo}
            selectedCoachId={selectedCoachId}
          />
        );

      case 'register':
        return (
          <Register
            setActivePage={navigateTo}
            selectedCoachId={selectedCoachId}
          />
        );

      case 'payment':
        return (
          <Payment
            coachId={selectedCoachId}
            setActivePage={navigateTo}
            setActiveConsultationId={setActiveConsultationId}
          />
        );

      case 'chat':
        return (
          <Chat
            consultationId={activeConsultationId}
            setActivePage={navigateTo}
            setSelectedCoachId={setSelectedCoachId}
          />
        );

      case 'contact':
        return <Contact setActivePage={navigateTo} />;

      case 'admin-dashboard':
        return <AdminDashboard setActivePage={navigateTo} />;

      case 'coach-dashboard':
        return (
          <CoachDashboard
            setActivePage={navigateTo}
            setActiveConsultationId={setActiveConsultationId}
          />
        );

      case 'customer-dashboard':
        return (
          <CustomerDashboard
            setActivePage={navigateTo}
            setSelectedCoachId={setSelectedCoachId}
            setActiveConsultationId={setActiveConsultationId}
          />
        );

      default:
        return (
          <Home
            setActivePage={navigateTo}
            setSelectedCoachId={setSelectedCoachId}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <Navbar activePage={activePage} setActivePage={navigateTo} />
      <main className="main-content">
        <div key={activePage} className="page-transition">
          {renderCurrentPage()}
        </div>
      </main>
      <Footer setActivePage={navigateTo} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
