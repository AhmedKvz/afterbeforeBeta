import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OSApp } from "./os/OSApp";
import { BetaFeedback } from "@/components/BetaFeedback";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

// Ultra-review perf A1: only the OS shell is eager. Every legacy page is a
// lazy chunk — they're deep-link targets, not the primary flow, and they carry
// framer-motion + shadcn weight that must not sit in the entry bundle.
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Matches = lazy(() => import("./pages/Matches"));
const Profile = lazy(() => import("./pages/Profile"));
const VenueDashboard = lazy(() => import("./pages/VenueDashboard"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Quests = lazy(() => import("./pages/Quests"));
const InstagramCallback = lazy(() => import("./pages/InstagramCallback"));
const VenueDetail = lazy(() => import("./pages/VenueDetail"));
const HeatMap = lazy(() => import("./pages/HeatMap"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MetricsDashboard = lazy(() => import("./pages/MetricsDashboard"));
const WarRoom = lazy(() => import("./pages/WarRoom"));

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

// Branded route-loading moment (matches the OSApp auth loader).
const RouteFallback = () => (
  <div style={{ minHeight: '100vh', background: '#0B0B0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ width: 54, height: 54, borderRadius: '50%', background: 'conic-gradient(from 200deg,#a64dff,#3b6fe6,#56d6e6,#34d399,#a64dff)', animation: 'os-pulse 1.6s ease-in-out infinite' }} />
  </div>
);

const App = () => (
  <AppErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
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
          </Suspense>
          <BetaFeedback />
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
