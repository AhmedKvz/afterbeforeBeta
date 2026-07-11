import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import EventDetail from "./pages/EventDetail";
import Matches from "./pages/Matches";
import Profile from "./pages/Profile";
import VenueDashboard from "./pages/VenueDashboard";
import Notifications from "./pages/Notifications";
import Quests from "./pages/Quests";
import InstagramCallback from "./pages/InstagramCallback";
// Out-of-focus pages (kept on disk, routes redirect to Home for the 5-screen core):
// MyEvents, Leaderboard, Gamification, Lucky100Page, ScenePanel, Explore, SecretPartyRequest
import VenueDetail from "./pages/VenueDetail";
import HeatMap from "./pages/HeatMap";
import PublicProfile from "./pages/PublicProfile";
import NotFound from "./pages/NotFound";
import MetricsDashboard from "./pages/MetricsDashboard";
import WarRoom from "./pages/WarRoom";
import { OSApp } from "./os/OSApp";
import { BetaFeedback } from "@/components/BetaFeedback";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

// Ultra-review perf #3: sane cache defaults — without staleTime every orb-tab
// switch and window refocus refires every query on the screen (Supabase free
// tier = 50k reads/day). 60s staleness is fine for nightlife data.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 10 * 60_000, retry: 1 },
  },
});

// Capture ?founder=CODE before HashRouter rewrites the URL.
// Persists through auth flow so onboarding can claim it.
const founderCode = new URLSearchParams(window.location.search).get('founder');
if (founderCode) localStorage.setItem('ab_founder_code', founderCode.toUpperCase());

const App = () => (
  <AppErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AuthProvider>
          <Routes>
            {/* Nightlife OS — primary app (orb nav drives the 5 core screens). */}
            <Route path="/" element={<OSApp />} />
            {/* Legacy Acid/UV screens kept as deep-link targets (not the primary flow). */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/venue/:venueName" element={<VenueDetail />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/venue-dashboard" element={<VenueDashboard />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/heatmap" element={<HeatMap />} />
            <Route path="/u/:userId" element={<PublicProfile />} />
            <Route path="/quests" element={<Quests />} />
            <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
            <Route path="/metrics" element={<MetricsDashboard />} />
            <Route path="/warroom" element={<WarRoom />} />
            {/* Out-of-focus → redirect to the 5-screen core */}
            <Route path="/circle-swipe/:eventId" element={<Navigate to="/heatmap" replace />} />
            <Route path="/circle-swipe" element={<Navigate to="/heatmap" replace />} />
            <Route path="/gamification" element={<Navigate to="/quests" replace />} />
            <Route path="/my-events" element={<Navigate to="/" replace />} />
            <Route path="/leaderboard" element={<Navigate to="/" replace />} />
            <Route path="/lucky100" element={<Navigate to="/" replace />} />
            <Route path="/scene" element={<Navigate to="/" replace />} />
            <Route path="/explore" element={<Navigate to="/" replace />} />
            <Route path="/secret-request/:eventId" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BetaFeedback />
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
