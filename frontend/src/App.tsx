import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Blogs from "./pages/Blogs";
import CreateBlog from "./pages/CreateBlog";
import Navbar from "./components/Navbar";

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function AppContent() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl px-4 py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/blogs" replace />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route
              path="/blogs/new"
              element={
                <PrivateRoute>
                  <CreateBlog />
                </PrivateRoute>
              }
            />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
