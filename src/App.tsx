import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import EventDetail from "./pages/EventDetail";
import CircleSwipe from "./pages/CircleSwipe";
import LocationSwipe from "./pages/LocationSwipe";
import Matches from "./pages/Matches";
import Profile from "./pages/Profile";
import MyEvents from "./pages/MyEvents";
import Leaderboard from "./pages/Leaderboard";
import Gamification from "./pages/Gamification";
import Lucky100Page from "./pages/Lucky100Page";
import VenueDashboard from "./pages/VenueDashboard";
import Notifications from "./pages/Notifications";
import ScenePanel from "./pages/ScenePanel";
import Quests from "./pages/Quests";
import Explore from "./pages/Explore";
import SecretPartyRequest from "./pages/SecretPartyRequest";
import InstagramCallback from "./pages/InstagramCallback";
import YearlyChampionship from "./pages/YearlyChampionship";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/circle-swipe/:eventId" element={<CircleSwipe />} />
            <Route path="/circle-swipe" element={<LocationSwipe />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-events" element={<MyEvents />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/gamification" element={<Gamification />} />
            <Route path="/lucky100" element={<Lucky100Page />} />
            <Route path="/venue-dashboard" element={<VenueDashboard />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/scene" element={<ScenePanel />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/quests" element={<Quests />} />
            <Route path="/secret-request/:eventId" element={<SecretPartyRequest />} />
            <Route path="/yearly-championship" element={<YearlyChampionship />} />
            <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
