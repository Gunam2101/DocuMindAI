import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import DocumentsPage from "./pages/DocumentsPage";
import AskAIPage from "./pages/AskAIPage";
import SummaryPage from "./pages/SummaryPage";
import StudyNotesPage from "./pages/StudyNotesPage";
import QuestionGeneratorPage from "./pages/QuestionGeneratorPage";
import PracticeQuizPage from "./pages/PracticeQuizPage";
import SettingsPage from "./pages/SettingsPage";
import WorkspacePage from "./pages/WorkspacePage";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />

          <Route element={<ProtectedRoute />}>
            {/* Unified PDF Learning Workspace Routes */}
            <Route path="/app/workspace/:documentId" element={<WorkspacePage />} />
            <Route path="/app/documents/:documentId" element={<WorkspacePage />} />
            <Route path="/documents/:documentId" element={<WorkspacePage />} />

            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="/app/home" replace />} />
              <Route path="home" element={<HomePage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="ask" element={<AskAIPage />} />
              <Route path="summary" element={<SummaryPage />} />
              <Route path="notes" element={<StudyNotesPage />} />
              <Route path="questions" element={<QuestionGeneratorPage />} />
              <Route path="quiz" element={<PracticeQuizPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ErrorBoundary>
  );
}
