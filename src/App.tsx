import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import EventDetail from "./pages/EventDetail";
import CircleSwipe from "./pages/CircleSwipe";
import LocationSwipe from "./pages/LocationSwipe";
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
import { BetaFeedback } from "@/components/BetaFeedback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/venue/:venueName" element={<VenueDetail />} />
            <Route path="/circle-swipe/:eventId" element={<CircleSwipe />} />
            <Route path="/circle-swipe" element={<LocationSwipe />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/venue-dashboard" element={<VenueDashboard />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/heatmap" element={<HeatMap />} />
            <Route path="/u/:userId" element={<PublicProfile />} />
            <Route path="/quests" element={<Quests />} />
            <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
            {/* Out-of-focus → redirect to the 5-screen core */}
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
);

export default App;
