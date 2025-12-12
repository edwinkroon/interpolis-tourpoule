import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Welcome1Page } from './pages/Welcome1Page';
import { Welcome2Page } from './pages/Welcome2Page';
import { Welcome3Page } from './pages/Welcome3Page';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { LogoutPage } from './pages/LogoutPage';
import { HomePage } from './pages/HomePage';
import { StandPage } from './pages/StandPage';
import { TeamOverviewPage } from './pages/TeamOverviewPage';
import { TeamComparePage } from './pages/TeamComparePage';
import { RulesPage } from './pages/RulesPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { StagesOverviewPage } from './pages/StagesOverviewPage';
import { AddStagePage } from './pages/AddStagePage';
import { AdminPage } from './pages/AdminPage';
import { DagUitslagPage } from './pages/DagUitslagPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Keep legacy URLs as routes for compatibility */}
        <Route path="/" element={<Navigate to="/index.html" replace />} />
        <Route path="/index.html" element={<Welcome1Page />} />
        <Route path="/welcome2.html" element={<Welcome2Page />} />
        <Route path="/welcome3.html" element={<Welcome3Page />} />

        <Route path="/login.html" element={<LoginPage />} />
        <Route path="/auth-callback.html" element={<AuthCallbackPage />} />
        <Route path="/logout.html" element={<LogoutPage />} />

        <Route
          path="/rules.html"
          element={
            <ProtectedRoute>
              <RulesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home.html"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/statistieken.html"
          element={
            <ProtectedRoute>
              <StatisticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/etappeoverzicht.html"
          element={
            <ProtectedRoute>
              <StagesOverviewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/daguitslag.html"
          element={
            <ProtectedRoute>
              <DagUitslagPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stand.html"
          element={
            <ProtectedRoute>
              <StandPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teamoverzicht.html"
          element={
            <ProtectedRoute>
              <TeamOverviewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teamvergelijken.html"
          element={
            <ProtectedRoute>
              <TeamComparePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/etappetoevoegen.html"
          element={
            <ProtectedRoute>
              <AddStagePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin.html"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
