import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useClassSlMapping } from "@/hooks/useClassSlMapping";
import { ScoringThresholdsLoader } from "@/hooks/useScoringThresholds";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ApprovalGate } from "./components/auth/ApprovalGate";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import CreateFacility from "./pages/CreateFacility";
import FacilityPage from "./pages/FacilityPage";
import FacilitiesPage from "./pages/FacilitiesPage";
import ExecutivePage from "./pages/ExecutivePage";
import DomainPage from "./pages/DomainPage";
import SystemsPage from "./pages/SystemsPage";
import CreateSystem from "./pages/CreateSystem";
import SystemPage from "./pages/SystemPage";
import ManualPage from "./pages/ManualPage";
import SearchPage from "./pages/SearchPage";
import ImpactAnalysisPage from "./pages/ImpactAnalysisPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import AnalyticsAssistantPage from "./pages/AnalyticsAssistantPage";
import ExportPage from "./pages/ExportPage";
import RequirementsPage from "./pages/RequirementsPage";
import RequirementPrintPage from "./pages/RequirementPrintPage";
import RequirementReviewPage from "./pages/RequirementReviewPage";
import RequirementBatchReviewPage from "./pages/RequirementBatchReviewPage";
import TestModelPage from "./pages/TestModelPage";
import ProjectsPage from "./pages/ProjectsPage";
import CreateProject from "./pages/CreateProject";
import ProjectPage from "./pages/ProjectPage";
import RequirementProfilesPage from "./pages/RequirementProfilesPage";
import RequirementProfilePage from "./pages/RequirementProfilePage";
import AdminPage from "./pages/AdminPage";
import ActivityPage from "./pages/ActivityPage";
import ReviewPage from "./pages/ReviewPage";
import ClassificationPage from "./pages/ClassificationPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, isApproved, loading } = useAuth();

  if (loading) return null;
  if (!user) {
    sessionStorage.setItem('post-login-redirect', window.location.pathname + window.location.search);
    return <Navigate to="/auth" replace />;
  }
  if (!isApproved) return null; // ApprovalGate handles this

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreateFacility />} />
        <Route path="/facility/:id" element={<FacilityPage />} />
        <Route path="/facilities" element={<FacilitiesPage />} />
        <Route path="/executive" element={<ExecutivePage />} />
        <Route path="/domain/:slug" element={<DomainPage />} />
        <Route path="/systems" element={<SystemsPage />} />
        <Route path="/systems/new" element={<CreateSystem />} />
        <Route path="/systems/:id" element={<SystemPage />} />
        <Route path="/manual" element={<ManualPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/impact-analysis" element={<ImpactAnalysisPage />} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/analytics-assistant" element={<AnalyticsAssistantPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/requirements" element={<RequirementsPage />} />
        <Route path="/requirements/print" element={<RequirementPrintPage />} />
        <Route path="/requirements/batch/:batchId" element={<RequirementBatchReviewPage />} />
        <Route path="/requirements/:id/review" element={<RequirementReviewPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/classification" element={<ClassificationPage />} />
        <Route path="/test-model" element={<TestModelPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<CreateProject />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/profiles" element={<RequirementProfilesPage />} />
        <Route path="/profiles/:id" element={<RequirementProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/activity" element={<ActivityPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

function PostLoginRedirect() {
  const target = sessionStorage.getItem('post-login-redirect');
  sessionStorage.removeItem('post-login-redirect');
  const safeTarget = target && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/auth') ? target : '/';
  return <Navigate to={safeTarget} replace />;
}

function AuthRouter() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/auth" element={user ? <PostLoginRedirect /> : <AuthPage />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

/** Loads the classification -> Security Level mapping into the runtime cache. */
function ClassSlMappingLoader() {
  useClassSlMapping();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <ClassSlMappingLoader />
        <ScoringThresholdsLoader />
        <Toaster />
        <Sonner />
        <AuthProvider>
          <ApprovalGate>
            <BrowserRouter>
              <AuthRouter />
            </BrowserRouter>
          </ApprovalGate>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

