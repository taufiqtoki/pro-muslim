/* eslint-disable */
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/layouts/Home";
import Settings from "./pages/Settings";
import HomeTab from "./pages/tabs/HomeTab";
import WorksTab from "./pages/tabs/WorksTab";
import AgendaTab from "./pages/tabs/AgendaTab";
import RoutineTab from "./pages/tabs/RoutineTab";
import BucketTab from "./pages/tabs/BucketTab";
import Profile from "./pages/Profile";
import Report from "./pages/Report";
import AudioPlayer from "./components/AudioPlayer";
import { ThemeProvider } from './contexts/ThemeContext';
import { StopwatchProvider } from './contexts/StopwatchContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import { PlayerProvider } from './contexts/PlayerContext';
import { QueueProvider } from './contexts/QueueContext';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <PlayerProvider>
            <QueueProvider>
              <StopwatchProvider>
                <DndProvider backend={HTML5Backend}>
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
                </DndProvider>
              </StopwatchProvider>
            </QueueProvider>
          </PlayerProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
