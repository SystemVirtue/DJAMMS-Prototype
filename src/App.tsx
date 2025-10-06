import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppwriteProvider } from './contexts/AppwriteContext';
import Player from './components/Player';
import AdminConsole from './components/AdminConsole';
import KioskEmbed from './components/KioskEmbed';
import AuthCallback from './components/AuthCallback';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <AppwriteProvider>
      <Router>
        <div className="min-h-screen bg-gray-900 text-white">
          <Routes>
            <Route path="/" element={<Player />} />
            <Route path="/player" element={<Player />} />
            <Route path="/admin" element={<AdminConsole />} />
            <Route path="/kiosk" element={<KioskEmbed />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AppwriteProvider>
  );
}

export default App;
