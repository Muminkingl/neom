"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "motion/react";
import { useAuth } from "@/app/context/AuthContext";
import { ToothIcon } from "@/app/components/ToothIcon";
import {
  Calendar,
  Users,
  BarChart3,
  Eye,
  EyeOff,
  User,
  Lock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

type Language = "ku" | "ar" | "en";

interface ContentTranslations {
  brandName: string;
  brandSubtitle: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroDescription: string;
  features: {
    title: string;
    description: string;
  }[];
  loginTitle: string;
  loginSubtitle: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  rememberMe: string;
  forgotPassword: string;
  submitButton: string;
  loadingButton: string;
  footerPrefix: string;
  footerSuffix: string;
  defaultError: string;
}

const translations: Record<Language, ContentTranslations> = {
  ku: {
    brandName: "نیۆم",
    brandSubtitle: "سیستەمی بەڕێوەبردنی کلینیک",
    heroTitleLine1: "هەموو کلینیکەکەت،",
    heroTitleLine2: "لە یەک شوێندا.",
    heroDescription:
      "سیستەمی پێشکەوتووی بەڕێوەبردنی کلینیکی ددانی نیۆم بۆ ڕێکخستنی نۆرەکان، دۆسیەی پزیشکی و ژمێریاری.",
    features: [
      {
        title: "نۆرەگرتن و کاتەکان",
        description: "ڕێکخستنی نۆرەی نەخۆشەکان بە شێوازێکی زیرەک",
      },
      {
        title: "دۆسیەی پزیشکی نەخۆش",
        description: "تۆمارکردنی مێژووی پزیشکی و چارەسەرەکان",
      },
      {
        title: "نەخشەی ددان (Odontogram)",
        description: "پشکنین و چارەسەری وردی ددانەکان",
      },
      {
        title: "ژمێریاری و ڕاپۆرت",
        description: "بەڕێوەبردنی داهات، خەرجی و قەرزەکان",
      },
    ],
    loginTitle: "چوونەژوورەوە",
    loginSubtitle: "تکایە زانیارییەکانت بنووسە بۆ چوونەژوورەوە بۆ ناو سیستەم",
    usernameLabel: "ئیمەیڵ یان ناوی بەکارهێنەر",
    usernamePlaceholder: "ناوی بەکارهێنەر یان ئیمەیڵ بنووسە",
    passwordLabel: "وشەی نهێنی",
    passwordPlaceholder: "وشەی نهێنی بنووسە",
    rememberMe: "من لەبیر بهێڵەرەوە",
    forgotPassword: "وشەی نهێنیت لەبیرکردووە؟",
    submitButton: "چوونەژوورەوە",
    loadingButton: "چاوەڕوانبە...",
    footerPrefix: "ئەم سیستەمە دروستکراوە لەلایەن",
    footerSuffix: "© هەموو مافەکان پارێزراون",
    defaultError: "ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە",
  },
  ar: {
    brandName: "نيوم",
    brandSubtitle: "نظام إدارة العيادة الطبية",
    heroTitleLine1: "كل عيادتك،",
    heroTitleLine2: "في مكان واحد.",
    heroDescription:
      "نظام نيوم لإدارة عيادة الأسنان، تنظيم المواعيد، السجلات الطبية والمحاسبة بدقة.",
    features: [
      {
        title: "المواعيد والجدول الزمني",
        description: "تنظيم مواعيد المرضى بسلاسة ودقة",
      },
      {
        title: "السجل الطبي للمريض",
        description: "حفظ التاريخ الطبي والتشخيصات كاملة",
      },
      {
        title: "مخطط الأسنان (Odontogram)",
        description: "فحص ومتابعة معالجات الأسنان بدقة",
      },
      {
        title: "المحاسبة والتقارير",
        description: "إدارة الإيرادات والمصاريف والديون",
      },
    ],
    loginTitle: "تسجيل الدخول",
    loginSubtitle: "الرجاء إدخال بياناتك لتسجيل الدخول إلى النظام",
    usernameLabel: "البريد الإلكتروني أو اسم المستخدم",
    usernamePlaceholder: "أدخل اسم المستخدم أو البريد الإلكتروني",
    passwordLabel: "كلمة المرور",
    passwordPlaceholder: "أدخل كلمة المرور",
    rememberMe: "تذكرني في هذا الجهاز",
    forgotPassword: "نسيت كلمة المرور؟",
    submitButton: "تسجيل الدخول",
    loadingButton: "جارٍ التحميل...",
    footerPrefix: "تم تطوير هذا النظام بواسطة",
    footerSuffix: "© جميع الحقوق محفوظة",
    defaultError: "اسم المستخدم أو كلمة المرور غير صحيحة",
  },
  en: {
    brandName: "NEOM",
    brandSubtitle: "Clinic Management System",
    heroTitleLine1: "All your clinic,",
    heroTitleLine2: "in one place.",
    heroDescription:
      "NEOM advanced dental clinic management platform for appointments, electronic health records, and finance.",
    features: [
      {
        title: "Appointments & Scheduling",
        description: "Smart and seamless calendar booking system",
      },
      {
        title: "Patient Medical Records",
        description: "Comprehensive medical history & treatments",
      },
      {
        title: "Dental Chart (Odontogram)",
        description: "Detailed interactive dental tooth mapping",
      },
      {
        title: "Accounting & Reports",
        description: "Complete tracking of revenues and expenses",
      },
    ],
    loginTitle: "Sign In",
    loginSubtitle: "Please enter your credentials to access the system",
    usernameLabel: "Email or username",
    usernamePlaceholder: "Enter your username or email",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    rememberMe: "Keep me signed in",
    forgotPassword: "Forgot password?",
    submitButton: "Sign in",
    loadingButton: "Signing in...",
    footerPrefix: "This system was made by",
    footerSuffix: "© All rights reserved",
    defaultError: "Invalid username or password",
  },
};

export default function Auth13() {
  const [lang, setLang] = useState<Language>("ku");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const t = translations[lang];
  const isRTL = lang === "ku" || lang === "ar";

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 280,
        damping: 24,
      },
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await login(username.trim(), password);

      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || t.defaultError);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(t.defaultError);
    } finally {
      setIsLoading(false);
    }
  };

  const featureIcons = [
    <Calendar key="cal" className="size-4.5 text-white/90" />,
    <Users key="users" className="size-4.5 text-white/90" />,
    <ToothIcon key="tooth" className="size-4.5 text-white/90" />,
    <BarChart3 key="chart" className="size-4.5 text-white/90" />,
  ];

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 lg:p-10 bg-[#edf2f7] font-['Vazirmatn',system-ui,sans-serif] selection:bg-[#008294]/20 selection:text-[#008294]"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Outer Card Container:
          On mobile & iPad (< lg): max-w-[480px] and shows only the login form card.
          On desktop (>= lg): max-w-[1040px] and shows both columns side by side. */}
      <div className="w-full max-w-[480px] lg:max-w-[1040px] bg-white rounded-[24px] sm:rounded-[32px] shadow-[0_20px_50px_rgba(0,130,148,0.12),0_4px_16px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden flex flex-col lg:flex-row min-h-auto lg:min-h-[660px]">
        {/* Left Column: Teal Promotional / Branding Panel
            HIDDEN on mobile and iPad (< lg), VISIBLE on desktop (lg:flex) */}
        <div
          dir={isRTL ? "rtl" : "ltr"}
          className="relative hidden lg:flex w-full lg:w-[48%] bg-gradient-to-br from-[#008294] via-[#008b9e] to-[#007383] text-white p-7 sm:p-10 flex-col justify-between overflow-hidden"
        >
          {/* Subtle background decorative shapes */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#005e6b]/30 blur-2xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.08)_0%,transparent_60%)] pointer-events-none" />

          {/* Top: Logo & Brand */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-inner">
              <ToothIcon className="size-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-xl sm:text-2xl tracking-wide leading-none text-white">
                <span>{t.brandName}</span>
                <span className="size-2 rounded-full bg-white/80 inline-block"></span>
              </div>
              <p className="text-[12px] sm:text-[13px] text-white/75 font-normal mt-0.5">
                {t.brandSubtitle}
              </p>
            </div>
          </div>

          {/* Middle: Headline & Features */}
          <div className="relative z-10 my-8 sm:my-10 space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold leading-[1.25] text-white tracking-tight">
                {t.heroTitleLine1}
                <br />
                {t.heroTitleLine2}
              </h2>
              <p className="mt-3 text-[13px] sm:text-[14px] text-white/80 leading-relaxed max-w-[420px]">
                {t.heroDescription}
              </p>
            </div>

            {/* 4 Feature Cards */}
            <div className="space-y-2.5">
              {t.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="group flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-xs border border-white/12 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 border border-white/15">
                      {featureIcons[idx]}
                    </div>
                    <div>
                      <h4 className="text-[13px] sm:text-[14px] font-semibold text-white leading-tight">
                        {feature.title}
                      </h4>
                      <p className="text-[11px] sm:text-[12px] text-white/75 leading-tight mt-0.5">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-white/40 group-hover:text-white/80 transition-colors">
                    {isRTL ? (
                      <ChevronLeft className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Trust Badge & Version */}
          <div className="relative z-10 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] sm:text-[12px] text-white/75">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-white/90" />
              <span>سیستەمی پارێزراو بە ستانداردی پزیشکی</span>
            </span>
            <span className="text-white/60 font-mono text-[10px]">v1.0.2</span>
          </div>
        </div>

        {/* Right Column: Clean White Form Panel
            Takes 100% width on mobile/iPad (< lg), and 52% on desktop (lg:w-[52%]) */}
        <div
          dir={isRTL ? "rtl" : "ltr"}
          className="relative w-full lg:w-[52%] bg-white p-6 sm:p-10 lg:p-14 flex flex-col justify-between"
        >
          {/* Top Bar: Language Switcher and Status Pill */}
          <div className="flex items-center justify-between w-full mb-6 sm:mb-8">
            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer ${
                  lang === "en"
                    ? "bg-[#008294] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang("ku")}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer ${
                  lang === "ku"
                    ? "bg-[#008294] text-white shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                کوردی
              </button>
              <button
                type="button"
                onClick={() => setLang("ar")}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer ${
                  lang === "ar"
                    ? "bg-[#008294] text-white shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                العربية
              </button>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online</span>
            </div>
          </div>

          {/* Form Container */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-[420px] mx-auto my-auto"
          >
            {/* Title Header */}
            <motion.div variants={itemVariants} className="mb-6 sm:mb-7">
              <h1 className="text-2xl sm:text-[32px] font-bold tracking-tight text-slate-900 leading-tight">
                {t.loginTitle}
              </h1>
              <p className="mt-1.5 text-[13px] sm:text-[14px] text-slate-500 font-normal leading-relaxed">
                {t.loginSubtitle}
              </p>
            </motion.div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 bg-red-50/90 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2.5 shadow-xs"
              >
                <div className="size-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span className="font-medium text-[13px]">{error}</span>
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4.5">
              {/* Username / Email Field */}
              <motion.div variants={itemVariants} className="space-y-1.5">
                <label
                  htmlFor="login-username"
                  className="block text-[13px] font-semibold text-slate-700"
                >
                  {t.usernameLabel}
                </label>
                <div className="relative">
                  <div
                    className={`absolute inset-y-0 ${
                      isRTL ? "right-0 pr-3.5" : "left-0 pl-3.5"
                    } flex items-center pointer-events-none text-slate-400`}
                  >
                    <User className="size-4.5" />
                  </div>
                  <input
                    id="login-username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder={t.usernamePlaceholder}
                    autoComplete="username"
                    className={`w-full ${
                      isRTL ? "pr-10 pl-4" : "pl-10 pr-4"
                    } py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-[14px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#008294] focus:outline-none focus:ring-3 focus:ring-[#008294]/15 transition-all`}
                  />
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div variants={itemVariants} className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-[13px] font-semibold text-slate-700"
                >
                  {t.passwordLabel}
                </label>
                <div className="relative">
                  <div
                    className={`absolute inset-y-0 ${
                      isRTL ? "right-0 pr-3.5" : "left-0 pl-3.5"
                    } flex items-center pointer-events-none text-slate-400`}
                  >
                    <Lock className="size-4.5" />
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder={t.passwordPlaceholder}
                    autoComplete="current-password"
                    className={`w-full ${
                      isRTL ? "pr-10 pl-11" : "pl-10 pr-11"
                    } py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-[14px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#008294] focus:outline-none focus:ring-3 focus:ring-[#008294]/15 transition-all font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className={`absolute inset-y-0 ${
                      isRTL ? "left-0 pl-3" : "right-0 pr-3"
                    } flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer`}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4.5" />
                    ) : (
                      <Eye className="size-4.5" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Remember me & Forgot Password */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between pt-1"
              >
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border-slate-300 text-[#008294] focus:ring-[#008294] accent-[#008294] cursor-pointer"
                  />
                  <span className="text-[13px] text-slate-600">
                    {t.rememberMe}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      isRTL
                        ? "تکایە پەیوەندی بە سەرپەرشتیاری کلینیکەوە بکە بۆ گۆڕینی وشەی نهێنی."
                        : "Please contact clinic administrator to reset your password."
                    )
                  }
                  className="text-[13px] font-medium text-[#008294] hover:text-[#006f7e] hover:underline transition-colors cursor-pointer"
                >
                  {t.forgotPassword}
                </button>
              </motion.div>

              {/* Submit Button */}
              <motion.div variants={itemVariants} className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-[#008294] hover:bg-[#007484] active:bg-[#006775] text-white font-semibold text-[15px] shadow-[0_4px_14px_rgba(0,130,148,0.3)] hover:shadow-[0_6px_20px_rgba(0,130,148,0.35)] transition-all duration-200 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4.5 animate-spin" />
                      <span>{t.loadingButton}</span>
                    </>
                  ) : (
                    <span>{t.submitButton}</span>
                  )}
                </button>
              </motion.div>
            </form>
          </motion.div>

          {/* Bottom: Footer with Trx Studio Link */}
          <div className="pt-6 sm:pt-8 text-center border-t border-slate-100 mt-6 sm:mt-8">
            <p className="text-[12px] text-slate-400 font-normal leading-relaxed">
              <span>{t.footerPrefix} </span>
              <a
                href="https://www.trxstudio.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#008294] font-semibold hover:text-[#006f7e] hover:underline transition-colors inline-block"
              >
                Trx Studio
              </a>
              <span> {t.footerSuffix}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
