// src/pages/AuthPage.tsx

import { useState, FormEvent } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Authentication error:", error.code, error.message);
      setAuthError(error.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google Sign-In error:", error.code, error.message);
      setAuthError(error.message || "Google Sign-In failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-6">{isLogin ? "Login" : "Sign Up"}</h1>
      {authError && <p className="mb-4 text-center text-red-500 bg-red-100 dark:bg-red-900/30 p-3 rounded-md">{authError}</p>}
      
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700"
          required
        />
        <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-md bg-sky-500 text-white font-bold hover:bg-sky-600 disabled:opacity-50">
          {loading ? 'Processing...' : (isLogin ? "Login" : "Sign Up")}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-sky-500 hover:underline">
          {isLogin ? "Need an account? Sign Up" : "Already have an account? Login"}
        </button>
      </div>

      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
        <span className="mx-4 text-slate-500">OR</span>
        <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
      </div>

      <button onClick={handleGoogleSignIn} disabled={loading} className="w-full py-3 px-4 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center justify-center gap-2 disabled:opacity-50">
        <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.9 0 6.9 1.6 9.1 3.7l6.8-6.8C35.9 2.6 30.4 0 24 0 14.5 0 6.5 5.8 2.8 14.2l8.2 6.3C12.7 12.9 17.9 9.5 24 9.5z"></path><path fill="#34A853" d="M46.2 25.4c0-1.7-.2-3.4-.5-5H24v9.5h12.5c-.5 3.1-2.1 5.7-4.5 7.5l7.9 6.1c4.6-4.2 7.3-10.4 7.3-18.1z"></path><path fill="#FBBC05" d="M11 28.5c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-8.2-6.3C.9 16.4 0 20.1 0 24s.9 7.6 2.8 11.2l8.2-6.9z"></path><path fill="#EA4335" d="M24 48c6.4 0 11.9-2.1 15.9-5.7l-7.9-6.1c-2.1 1.4-4.8 2.3-7.9 2.3-6.1 0-11.3-3.4-13.2-8.2l-8.2 6.3C6.5 42.2 14.5 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
        Sign in with Google
      </button>
    </div>
  );
};

export default AuthPage;