import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Suspense, lazy } from "react";
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

export default function App() {
  return (
    <Router>
      <ScrollToTop />
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
            </Routes>
          </Suspense>
        </main>
        <footer className="mt-8 mb-2 text-center text-xs text-slate-400">
          © 2026 - Made by Ivány Adrián
        </footer>
      </div>
    </Router>
  );
}
