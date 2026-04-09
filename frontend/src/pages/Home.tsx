import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/home.css';

const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1>SOA Tourism App</h1>
          <nav>
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn btn-primary">Login</Link>
                <Link to="/register" className="btn btn-secondary">Register</Link>
              </>
            ) : (
              <>
                <span className="welcome">Welcome, {user?.username}!</span>
                <Link to="/profile" className="btn btn-primary">My Profile</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="home-main">
        <section className="hero">
          <h2>Discover Amazing Tours</h2>
          <p>Explore the world with our professional guides</p>
        </section>

        {isAuthenticated && (
          <section className="user-info">
            <h3>Your Account</h3>
            <p>Role: {user?.role}</p>
            <p>Email: {user?.email}</p>
          </section>
        )}
      </main>
    </div>
  );
};

export default Home;
