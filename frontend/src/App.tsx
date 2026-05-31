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
import Tours from "./pages/Tours";
import CreateTour from "./pages/CreateTour";
import AddKeyPoint from "./pages/AddKeyPoint";
import Navbar from "./components/Navbar";
import AdminUsers from "./pages/AdminUsers";
import EditKeyPoint from "./pages/EditKeyPoint";
import Simulator from "./pages/Simulator";
import Cart from "./pages/Cart";

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function AppContent() {
  const { user } = useAuth();
  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl px-4 py-6">
          <Routes>
            <Route
              path="/"
              element={
                <Navigate
                  to={
                    user?.role === "ADMIN"
                      ? "/admin-users"
                      : user?.role === "GUIDE" || user?.role === "TOURIST"
                        ? "/tours"
                        : "/blogs"
                  }
                  replace
                />
              }
            />
            <Route path="/" element={<Navigate to={user?.role === 'ADMIN' ? "/admin-users" : "/blogs"} replace />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route
              path="/blogs/new"
              element={
                <PrivateRoute>
                  <CreateBlog />
                </PrivateRoute>
              }
            />
            <Route
              path="/tours"
              element={
                <PrivateRoute>
                  <Tours />
                </PrivateRoute>
              }
            />
            <Route
              path="/tours/new"
              element={
                <PrivateRoute>
                  <CreateTour />
                </PrivateRoute>
              }
            />
            <Route
              path="/tours/:tourId/key-points/new"
              element={
                <PrivateRoute>
                  <AddKeyPoint />
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
            <Route 
              path="/admin-users" 
              element={
                <PrivateRoute>
                  <AdminUsers />
                </PrivateRoute>
              } 
            />
            <Route
  path="/tours/:tourId/key-points/:pointId/edit"
  element={
    <PrivateRoute>
      <EditKeyPoint />
    </PrivateRoute>
  }
/>
            <Route
              path="/simulator"
              element={
                <PrivateRoute>
                  <Simulator />
                </PrivateRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <PrivateRoute>
                  <Cart />
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


