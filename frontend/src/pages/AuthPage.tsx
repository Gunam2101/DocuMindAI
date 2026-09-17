import React, { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Sparkles,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Shield,
  BookOpen,
  HelpCircle,
  FileText,
  GraduationCap,
  Info,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../services/apiClient";
import DocuMindLogo from "../components/DocuMindLogo";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const { login, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [accountLinkRequired, setAccountLinkRequired] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleGoogleCredentialResponse = async (response: { credential?: string }) => {
    if (!response?.credential) {
      setError("Google sign-in was cancelled.");
      return;
    }

    setError(null);
    setAccountLinkRequired(false);
    setGoogleLoading(true);

    try {
      await loginWithGoogle(response.credential);
      const rawFrom = (location.state as any)?.from?.pathname;
      const target = !rawFrom || rawFrom === "/app" || rawFrom === "/app/" ? "/app/home" : rawFrom;
      navigate(target, { replace: true });
    } catch (err: any) {
      const errDetail = err?.response?.data?.detail;
      const errCode = err?.response?.data?.error_code;
      if (errCode === "GOOGLE_ACCOUNT_LINK_REQUIRED" || err?.response?.status === 409) {
        setAccountLinkRequired(true);
        setError("This Google email is already registered with DocuMind. Sign in with your existing email and password first.");
      } else if (err?.response?.status === 401) {
        setError(errDetail || "Google sign-in could not be verified.");
      } else {
        setError("Google sign-in could not be completed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId) return;

    let checkInterval: any = null;
    const initGis = () => {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnContainerRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: "filled_black",
            size: "large",
            width: googleBtnContainerRef.current.offsetWidth || 340,
            text: isLogin ? "signin_with" : "signup_with",
            shape: "rectangular",
            logo_alignment: "left",
          });
          setGisReady(true);
          return true;
        } catch (e) {
          console.warn("[GIS] initialization error:", e);
        }
      }
      return false;
    };

    if (!initGis()) {
      checkInterval = setInterval(() => {
        if (initGis()) {
          clearInterval(checkInterval);
        }
      }, 200);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [googleClientId, isLogin]);

  const handleManualGoogleClick = () => {
    setError(null);
    setAccountLinkRequired(false);
    if (!googleClientId) {
      setError("Google Sign-In is not configured. Missing Client ID.");
      return;
    }
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification?.isNotDisplayed?.()) {
            setError("Google sign-in could not be displayed. Please check popup permissions.");
          }
        });
      } catch {
        setError("Google sign-in could not be completed.");
      }
    } else {
      setError("Google services are loading. Please try again in a few moments.");
    }
  };

  const handleForgotPassword = () => {
    setNoticeMessage("Password reset instructions will be sent if the email exists.");
    setTimeout(() => setNoticeMessage(null), 3500);
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (!isLogin && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(trimmedEmail, password);
      } else {
        await register(name.trim(), trimmedEmail, password);
      }
      const from = (location.state as any)?.from?.pathname || "/app/home";
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          isLogin
            ? "Invalid email or password. Please check your credentials."
            : "Could not create your account. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full bg-base-950 font-sans text-ink-100 lg:h-screen lg:overflow-hidden select-none">
      {/* ==================================================================== */}
      {/* LEFT SIDE — LEARNER STUDY SCENE (~58% Desktop)                      */}
      {/* ==================================================================== */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-base-950 lg:flex lg:w-[58%] xl:w-[60%] border-r border-base-750/50">
        {/* Background Visual Scene: Student studying with DocuMind AI on laptop */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/learner-study-scene.jpg"
            alt="Student actively studying with DocuMind AI on laptop"
            className="h-full w-full object-cover object-center filter brightness-[0.92] contrast-[1.05]"
          />
          {/* Subtle Dark Navy / Violet Atmospheric Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-base-950 via-base-950/20 to-base-950/75" />
          <div className="absolute inset-0 bg-gradient-to-r from-base-950/60 via-transparent to-base-950/80" />
        </div>

        {/* Top Left Branding */}
        <div className="relative z-10 p-8 xl:p-10">
          <Link
            to="/"
            className="inline-flex items-center gap-3 rounded-2xl bg-base-950/60 px-4 py-2.5 backdrop-blur-md border border-base-750/60 shadow-glass focus-ring hover:border-accent-500/40 transition-all"
          >
            <DocuMindLogo variant="full" size="md" showSubtitle={true} />
          </Link>
        </div>

        {/* Floating Interactive Learning Elements around the scene */}
        <div className="relative z-10 pointer-events-none px-8 xl:px-12">
          {/* Floating Chip 1: Understand (Top Right of Scene) */}
          <div className="absolute right-12 top-6 animate-pulse-soft">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-accent-500/40 bg-base-900/80 px-3.5 py-2 text-xs font-semibold text-accent-300 shadow-glow backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-accent-400 animate-ping" />
              <span>Understand Concepts</span>
            </div>
          </div>

          {/* Floating Chip 2: Smart Summarize (Mid Left) */}
          <div className="absolute left-8 bottom-36 hidden xl:block">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-base-950/80 px-3.5 py-2 text-xs font-semibold text-sky-300 shadow-card backdrop-blur-md">
              <BookOpen size={14} className="text-sky-400" />
              <span>Smart Summaries</span>
            </div>
          </div>

          {/* Floating Chip 3: Practice & Quiz (Mid Right) */}
          <div className="absolute right-16 bottom-28">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-base-950/80 px-3.5 py-2 text-xs font-semibold text-emerald-300 shadow-card backdrop-blur-md">
              <GraduationCap size={14} className="text-emerald-400" />
              <span>Practice & Quiz</span>
            </div>
          </div>
        </div>

        {/* Bottom Ambient Caption Card */}
        <div className="relative z-10 p-8 xl:p-10">
          <div className="max-w-md rounded-2xl border border-base-750/70 bg-base-950/80 p-4.5 backdrop-blur-xl shadow-glass space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent-300">
                Active Study Workspace
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-ink-200 leading-relaxed">
              Read documents, ask doubts in any language, and test comprehension with your personal AI teacher.
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* RIGHT SIDE — AUTHENTICATION PANEL (~42% Desktop)                    */}
      {/* ==================================================================== */}
      <div className="relative flex flex-1 flex-col justify-between overflow-y-auto bg-base-950 p-6 sm:p-10 lg:p-12 xl:p-14">
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-accent-600/10 blur-3xl" />

        {/* Mobile Header (Shown only on small screens < lg) */}
        <div className="flex items-center justify-between lg:hidden mb-6">
          <Link to="/" className="flex items-center gap-2.5">
            <DocuMindLogo variant="full" size="sm" showSubtitle={true} />
          </Link>
          <Link to="/" className="text-xs text-ink-400 hover:text-ink-100">
            Home →
          </Link>
        </div>

        {/* Mobile Visual Banner Preview (< lg only) */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-base-750/60 lg:hidden max-h-36">
          <img
            src="/assets/learner-study-scene.jpg"
            alt="DocuMind AI study scene"
            className="h-36 w-full object-cover object-top filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-base-950 via-base-950/40 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-600/20 border border-accent-500/40 px-2.5 py-0.5 text-[10px] font-semibold text-accent-300">
              <Sparkles size={10} />
              AI Learning Platform
            </span>
          </div>
        </div>

        {/* Centered Login Card */}
        <div className="my-auto mx-auto w-full max-w-sm sm:max-w-md space-y-6 animate-fade-in">
          {/* Logo & Welcome Header */}
          <div className="space-y-3 text-left">
            <div className="hidden lg:flex items-center gap-2.5">
              <DocuMindLogo variant="full" size="md" showSubtitle={true} />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-50">
                {isLogin ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-xs sm:text-sm text-ink-400">
                {isLogin
                  ? "Continue your learning journey."
                  : "Start learning from your documents with AI."}
              </p>
            </div>
          </div>

          {/* Notice Toast (e.g. for Google Auth or Password Reset) */}
          {noticeMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-accent-500/30 bg-accent-600/10 px-4 py-3 text-xs sm:text-sm text-accent-200 animate-fade-in">
              <Info size={16} className="shrink-0 text-accent-400" />
              <span>{noticeMessage}</span>
            </div>
          )}

          {/* Account Link Notice */}
          {accountLinkRequired && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5 animate-fade-in">
              <Info size={16} className="shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300">Account Already Exists</p>
                <p className="mt-0.5 text-amber-200/90 leading-relaxed">
                  This Google email is already registered with DocuMind. Sign in with your existing email and password first.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && !accountLinkRequired && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs sm:text-sm text-rose-300 animate-fade-in flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Login / Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name field (Register only) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label htmlFor="auth-name" className="block text-xs font-semibold text-ink-300">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
                  />
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    autoComplete="name"
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-base-750 bg-base-900/90 py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-ink-100 placeholder:text-ink-500 focus-ring hover:border-base-700 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="block text-xs font-semibold text-ink-300">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
                />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-base-750 bg-base-900/90 py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-ink-100 placeholder:text-ink-500 focus-ring hover:border-base-700 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="auth-password" className="block text-xs font-semibold text-ink-300">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors focus-ring rounded"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
                />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-base-750 bg-base-900/90 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-ink-100 placeholder:text-ink-500 focus-ring hover:border-base-700 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-200 transition-colors focus-ring rounded p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-[11px] text-ink-500">
                  Must be at least 8 characters.
                </p>
              )}
            </div>

            {/* Sign In / Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 via-accent-600 to-accent-700 py-3 text-xs sm:text-sm font-semibold text-white shadow-glow hover:from-accent-500 hover:to-accent-600 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 focus-ring"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>{isLogin ? "Signing in..." : "Creating account..."}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? "Sign In" : "Create Account"}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-base-750/70" />
            </div>
            <div className="relative bg-base-950 px-4 text-xs text-ink-500 font-medium">
              or
            </div>
          </div>

          {/* Google Sign-In Container */}
          <div className="w-full flex flex-col items-center">
            {googleLoading && (
              <div className="w-full flex items-center justify-center gap-3 rounded-xl border border-base-750 bg-base-900/80 py-3 px-4 text-xs sm:text-sm font-medium text-ink-300">
                <div className="h-4 w-4 rounded-full border-2 border-accent-400 border-t-transparent animate-spin" />
                <span>Signing in with Google...</span>
              </div>
            )}

            {/* Official Google Identity Services Render Target (must stay empty of React children) */}
            <div
              ref={googleBtnContainerRef}
              className={`w-full flex justify-center min-h-[44px] overflow-hidden rounded-xl ${
                googleLoading || !gisReady ? "hidden" : ""
              }`}
            />

            {/* Fallback button when GIS is not yet ready or loading */}
            {!gisReady && !googleLoading && (
              <button
                type="button"
                onClick={handleManualGoogleClick}
                aria-label="Sign in with Google"
                className="group flex w-full items-center justify-center gap-3 rounded-xl border border-base-750 bg-base-900/80 py-2.5 px-4 text-xs sm:text-sm font-medium text-ink-200 shadow-sm hover:border-base-700 hover:bg-base-850 hover:text-white transition-all focus-ring"
              >
                {/* Google 4-Color SVG Icon */}
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>

          {/* Create Account Link */}
          <div className="pt-2 text-center text-xs sm:text-sm text-ink-400">
            <span>{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
            <Link
              to={isLogin ? "/register" : "/login"}
              className="font-semibold text-accent-400 hover:text-accent-300 transition-colors underline-offset-4 hover:underline"
            >
              {isLogin ? "Create account" : "Sign in"}
            </Link>
          </div>
        </div>

        {/* Trust Footer */}
        <div className="mt-8 text-center">
          <p className="inline-flex items-center justify-center gap-1.5 text-[11px] text-ink-500">
            <Shield size={12} className="text-accent-400" />
            <span>Your documents stay private and are protected by secure authentication.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
