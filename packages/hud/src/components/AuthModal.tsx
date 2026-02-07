"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const { signIn, signUp, signInWithOAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onClose();
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setSuccess("Check your email to confirm your account!");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github" | "discord") => {
    setError(null);
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setError(error.message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-b from-gray-900 to-black p-8 shadow-2xl shadow-cyan-400/10">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-cyan-100">
                  {mode === "signin" ? "Welcome Back" : "Create Account"}
                </h2>
                <button
                  onClick={onClose}
                  className="text-cyan-100/50 hover:text-cyan-100 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleOAuth("github")}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-cyan-400/30 bg-black/50 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-400/10 transition-all"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Continue with GitHub
                </button>
                <button
                  onClick={() => handleOAuth("google")}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-cyan-400/30 bg-black/50 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-400/10 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>
                <button
                  onClick={() => handleOAuth("discord")}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-cyan-400/30 bg-black/50 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-400/10 transition-all"
                >
                  <svg className="w-5 h-5" fill="#5865F2" viewBox="0 0 24 24">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                  </svg>
                  Continue with Discord
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-cyan-400/20"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-gray-900 px-4 text-cyan-100/50">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-cyan-100/70 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-cyan-400/30 bg-black/50 px-4 py-3 text-sm text-cyan-100 placeholder-cyan-100/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-100/70 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-cyan-400/30 bg-black/50 px-4 py-3 text-sm text-cyan-100 placeholder-cyan-100/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-400/50 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-xl border border-green-400/50 bg-green-400/10 px-4 py-3 text-sm text-green-300">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-medium text-white hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 transition-all"
                >
                  {loading
                    ? "Processing..."
                    : mode === "signin"
                    ? "Sign In"
                    : "Create Account"}
                </button>
              </form>

              {/* Toggle Mode */}
              <p className="mt-6 text-center text-sm text-cyan-100/50">
                {mode === "signin"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// User menu component for when logged in
export function UserMenu() {
  const { user, signOut, isConfigured } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!isConfigured || !user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-cyan-400/40 bg-black/40 px-4 py-2 text-xs text-cyan-100 hover:bg-cyan-400/10 transition-all"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-medium">
          {user.email?.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:inline">{user.email?.split("@")[0]}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-cyan-400/30 bg-gray-900 p-2 shadow-xl"
          >
            <div className="px-3 py-2 border-b border-cyan-400/20 mb-2">
              <p className="text-xs text-cyan-100/50">Signed in as</p>
              <p className="text-sm text-cyan-100 truncate">{user.email}</p>
            </div>
            <button
              onClick={async () => {
                await signOut();
                setIsOpen(false);
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-400/10 transition-colors"
            >
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Auth button for header
export function AuthButton() {
  const { user, isLoading, isConfigured } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (!isConfigured) {
    return (
      <div className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-xs text-yellow-300">
        Offline Mode
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-full border border-cyan-400/40 px-4 py-2 text-xs text-cyan-100/50 animate-pulse">
        Loading...
      </div>
    );
  }

  if (user) {
    return <UserMenu />;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="rounded-full border border-cyan-400/60 bg-cyan-400/10 px-4 py-2 text-xs text-cyan-100 hover:bg-cyan-400/20 transition-all"
      >
        Sign In
      </button>
      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
