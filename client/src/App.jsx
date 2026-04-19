import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { initSocket } from './socket';
import Home from './pages/Home';
import Room from './pages/Room';
import ForYouCreate from './components/ForYouCreate';
import ForYouView from './components/ForYouView';
import Toast from './components/Toast';

export default function App() {
  useEffect(() => {
    initSocket();
  }, []);

  return (
    <Router>
      <Toast />
      <div className="min-h-screen bg-[#0a0a0f]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/for-you/create" element={<ForYouCreate />} />
          <Route path="/for-you/:giftId" element={<ForYouView />} />
        </Routes>
      </div>
    </Router>
  );
}