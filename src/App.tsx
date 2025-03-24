import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/layouts/Home.tsx";
import Settings from "./pages/Settings.tsx";
import HomeTab from "./pages/tabs/HomeTab.tsx";
import WorksTab from "./pages/tabs/WorksTab.tsx";
import AgendaTab from "./pages/tabs/AgendaTab.tsx";
import RoutineTab from "./pages/tabs/RoutineTab.tsx";
import BucketTab from "./pages/tabs/BucketTab.tsx";
import Profile from "./pages/Profile.tsx";
import Report from "./pages/Report.tsx";
import AudioPlayer from "./components/AudioPlayer.tsx";
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { StopwatchProvider } from './contexts/StopwatchContext.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ToastProvider } from './contexts/ToastContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { PlayerProvider } from './contexts/PlayerContext.tsx';
import { QueueProvider } from './contexts/QueueContext.tsx';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <PlayerProvider>
            <QueueProvider>
              <StopwatchProvider>
                <BrowserRouter>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Home />}>
                        <Route index element={<HomeTab />} />
                        <Route path="works" element={<WorksTab />} />
                        <Route path="agenda" element={<AgendaTab />} />
                        <Route path="routine" element={<RoutineTab />} />
                        <Route path="bucket" element={<BucketTab />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="report" element={<Report />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="player" element={<AudioPlayer />} />
                      </Route>
                    </Routes>
                  </ErrorBoundary>
                </BrowserRouter>
              </StopwatchProvider>
            </QueueProvider>
          </PlayerProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
