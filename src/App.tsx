import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "./components/Navbar";
import LottieLoader from "./components/LottieLoader";
import ScrollToTop from "./components/ScrollToTop";

// Lazy load pages asynchronously for code splitting
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateRoom = lazy(() => import("./pages/CreateRoom"));
const RoomDetails = lazy(() => import("./pages/RoomDetails"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Profile = lazy(() => import("./pages/Profile"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Faq = lazy(() => import("./pages/Faq"));
const Contact = lazy(() => import("./pages/Contact"));

/**
 * Root Application Component
 *
 * Configures the primary single-page application router, layout structure, and monitoring:
 * - BrowserRouter setup with automatic window scroll reset via ScrollToTop.
 * - Performance and visitor tracking powered by Vercel Speed Insights and Web Analytics.
 * - Code-split route management with lazy loading and fallback Lottie loader animation.
 * - Persistent navigation header (Navbar) and footer across all view states.
 */
export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <SpeedInsights />
      <Analytics />
      <div className="bg-background min-h-dvh flex flex-col justify-center items-center">
        <Navbar />
        <main className="flex-1 w-full">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                <LottieLoader className="w-24 h-24" />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/create-room" element={<CreateRoom />} />
              <Route path="/room/:id" element={<RoomDetails />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="mt-8 mb-2 text-center text-xs text-slate-400">
          © 2026 - Made by Adrián Ivány
        </footer>
      </div>
    </Router>
  );
}
