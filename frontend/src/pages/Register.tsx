import React, { useState, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/api";

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "TOURIST" as const,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      login(response.user, response.token);
      navigate("/blogs");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-96px)] max-w-md items-center">
      <div className="w-full rounded-xl border bg-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Register</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Create an account to post blogs and comments.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter your username"
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter password"
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Confirm password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="TOURIST">Tourist</option>
              <option value="GUIDE">Guide</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary-hover disabled:opacity-60"
          >
            {loading ? "Registering…" : "Register"}
          </button>
        </form>

        <p className="mt-4 text-sm text-text-secondary">
          Already have an account?{" "}
          <a className="text-primary hover:text-primary-hover" href="/login">
            Login here
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
