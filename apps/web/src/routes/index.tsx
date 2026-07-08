import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useSession } from '@/lib/auth'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/language-switcher'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { t } = useTranslation()
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')

  useEffect(() => {
    if (!isPending && session) {
      navigate({ to: '/dashboard' })
    }
  }, [session, isPending, navigate])

  if (isPending || session) {
    return <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0a0a0f]' : 'bg-[#f5f7fa]'}`} />
  }

  const isDark = theme === 'dark'
  const bg = isDark ? 'bg-[#0a0a0f]' : 'bg-[#f5f7fa]'
  const text = isDark ? 'text-white' : 'text-gray-900'
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500'
  const textMuted2 = isDark ? 'text-gray-500' : 'text-gray-400'
  const cardBg = isDark ? 'bg-[#12121a]' : 'bg-white'
  const innerBg = isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'
  const cardBorder = isDark ? '' : 'border border-gray-100'
  const navBg = isDark ? 'bg-[#0a0a0f]/80' : 'bg-white/80'
  const logo = isDark ? '/Zadano/Zadano_Logo_Full_Dark.svg' : '/Zadano/Zadano_Logo_Full_Light.svg'
  const hoverText = isDark ? 'hover:text-white' : 'hover:text-gray-900'

  return (
    <div className={`min-h-screen ${bg} ${text} flex flex-col transition-colors duration-300`}>
      {/* Navigation */}
      <nav
        className={`sticky top-0 z-50 ${navBg} border-b backdrop-blur-xl ${isDark ? 'border-white/5' : 'border-gray-200/60'}`}
      >
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Zadano.app" className="h-8" />
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              <a href="#features" className={`text-sm ${textMuted} ${hoverText} transition-colors`}>
                {t('landing.nav.features')}
              </a>
              <a href="#pricing" className={`text-sm ${textMuted} ${hoverText} transition-colors`}>
                {t('landing.nav.pricing')}
              </a>
              <a href="#faq" className={`text-sm ${textMuted} ${hoverText} transition-colors`}>
                {t('landing.nav.faq')}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`rounded-lg p-2 transition-all ${isDark ? 'bg-gray-800 text-amber-400 hover:bg-gray-700' : 'bg-gray-100 text-amber-500 hover:bg-gray-200'}`}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <Link to="/login" className={`text-sm ${textMuted} ${hoverText} transition-colors`}>
              {t('landing.nav.login')}
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-medium text-black shadow-lg shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-amber-500"
            >
              {t('landing.nav.startFree')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 space-y-4 px-4 py-4">
        {/* Hero Section */}
        <section
          className={`rounded-3xl ${cardBg} ${cardBorder} relative flex min-h-[85vh] items-center overflow-hidden`}
        >
          {/* Background Effects */}
          <div
            className={`absolute inset-0 ${isDark ? 'bg-gradient-to-b from-amber-500/5 via-transparent to-transparent' : 'from-amber-500/3 bg-gradient-to-b via-transparent to-transparent'}`}
          />
          <div
            className={`absolute left-1/2 top-20 h-[600px] w-[800px] -translate-x-1/2 ${isDark ? 'bg-amber-500/10' : 'bg-amber-500/5'} rounded-full blur-[120px]`}
          />

          <div className="relative w-full px-8 py-16 md:px-12">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              {/* Left side - Text */}
              <div className="text-left">
                <span
                  className={`mb-8 inline-flex items-center gap-2 rounded-full ${isDark ? 'border-amber-500/20 bg-amber-500/10' : 'border-amber-200 bg-amber-50'} border px-4 py-1.5 text-sm text-amber-500`}
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                  {t('landing.hero.newVersion')}
                </span>

                <h1 className="mb-8 text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
                  {t('landing.hero.title')}{' '}
                  <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                    {t('landing.hero.titleHighlight')}
                  </span>
                  <br />
                  {t('landing.hero.title2')}
                </h1>

                <p className={`mb-10 text-xl ${textMuted} max-w-xl`}>{t('landing.hero.desc')}</p>

                <div className="flex flex-wrap gap-4">
                  <Link
                    to="/register"
                    className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-10 py-5 text-lg font-semibold text-black shadow-2xl shadow-amber-500/30 transition-all hover:from-amber-400 hover:to-amber-500"
                  >
                    {t('landing.hero.start')}
                  </Link>
                  <a
                    href="#features"
                    className={`rounded-xl ${isDark ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} px-10 py-5 text-lg font-semibold transition-all`}
                  >
                    {t('landing.hero.viewFeatures')}
                  </a>
                </div>
              </div>

              {/* Right side - Dashboard Preview */}
              <div className="relative">
                <div
                  className={`rounded-2xl ${isDark ? 'bg-gray-900/80 shadow-2xl shadow-black/20' : 'border border-gray-200/50 bg-white shadow-2xl shadow-gray-300/40'} p-4 backdrop-blur-xl`}
                >
                  <DashboardWireframe t={t} isDark={isDark} />
                </div>
                {/* Floating glow */}
                <div
                  className={`absolute inset-0 -z-10 ${isDark ? 'bg-amber-500/5' : 'bg-amber-400/5'} scale-110 rounded-full blur-3xl`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section id="features" className="grid gap-4 md:grid-cols-3">
          {/* Card 1 - Manage Tasks */}
          <div
            className={`rounded-3xl ${cardBg} ${cardBorder} group p-6 transition-shadow duration-300 hover:shadow-xl`}
          >
            <div className="mb-3 flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'} flex items-center justify-center`}
              >
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M6 6C6 4.895 6.895 4 8 4H20L26 10V26C26 27.105 25.105 28 24 28H8C6.895 28 6 27.105 6 26V6Z"
                    fill="#F2CE88"
                  />
                  <path d="M20 4V10H26" fill="#e0b462" />
                  <rect x="10" y="14" width="12" height="2" rx="1" fill="#e0b462" />
                  <rect x="10" y="18" width="12" height="2" rx="1" fill="#e0b462" />
                  <rect x="10" y="22" width="8" height="2" rx="1" fill="#e0b462" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">{t('landing.features.tasks.title')}</h3>
            </div>
            <p className={`${textMuted} mb-4 text-sm`}>{t('landing.features.tasks.desc')}</p>
            <div className={`${innerBg} space-y-2 rounded-xl p-4`}>
              <div
                className={`flex items-center gap-3 rounded-lg p-3 ${isDark ? 'border border-amber-500/20 bg-amber-500/10' : 'border border-amber-100 bg-amber-50'}`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-bold text-white">
                  ✓
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">{t('landing.features.tasks.item1')}</span>
                  <div className={`text-xs ${textMuted2} mt-0.5`}>3 subtasks</div>
                </div>
                <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-500">
                  Done
                </span>
              </div>
              <div
                className={`flex items-center gap-3 rounded-lg p-3 ${isDark ? 'bg-gray-800/50' : 'border border-gray-100 bg-white'}`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-xs text-white">
                  ⚡
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">{t('landing.features.tasks.item2')}</span>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-gray-700/30">
                    <div className="h-1 rounded-full bg-amber-500" style={{ width: '60%' }} />
                  </div>
                </div>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-500">
                  60%
                </span>
              </div>
              <div
                className={`flex items-center gap-3 rounded-lg p-3 ${isDark ? 'bg-gray-800/50' : 'border border-gray-100 bg-white'}`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 text-xs text-white">
                  ◎
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">{t('landing.features.tasks.item3')}</span>
                  <div className={`text-xs ${textMuted2} mt-0.5`}>Due tomorrow</div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-500'} font-medium`}
                >
                  Pending
                </span>
              </div>
            </div>
          </div>

          {/* Card 2 - Calendar */}
          <div
            className={`rounded-3xl ${cardBg} ${cardBorder} group p-6 transition-shadow duration-300 hover:shadow-xl`}
          >
            <div className="mb-3 flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'} flex items-center justify-center`}
              >
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M6 10C6 7.79 7.79 6 10 6H22C24.21 6 26 7.79 26 10V24C26 26.21 24.21 28 22 28H10C7.79 28 6 26.21 6 24V10Z"
                    fill="#3b82f6"
                  />
                  <path d="M6 12H26" stroke="#60a5fa" strokeWidth="3" />
                  <path d="M11 4V8" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
                  <path d="M21 4V8" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('landing.features.calendar.subtitle')}</h3>
              </div>
            </div>
            <div className="mb-3 flex items-center justify-between">
              <span className={`text-sm font-medium ${textMuted}`}>
                {t('landing.features.calendar.month')}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'} font-medium text-amber-500`}
              >
                {t('landing.features.calendar.projects')}
              </span>
            </div>
            <div className={`${innerBg} rounded-xl p-4`}>
              <div
                className={`grid grid-cols-7 gap-1 text-center text-xs ${textMuted2} mb-2 font-medium`}
              >
                <span>Pn</span>
                <span>Wt</span>
                <span>Śr</span>
                <span>Cz</span>
                <span>Pt</span>
                <span>Sb</span>
                <span>Nd</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {[...Array(31)].map((_, i) => {
                  const isHighlighted = i === 6 || i === 13
                  const hasEvent = i === 4 || i === 11 || i === 20 || i === 25
                  return (
                    <div
                      key={i}
                      className={`relative rounded-lg py-1.5 text-xs font-medium ${
                        isHighlighted
                          ? 'bg-amber-500 font-bold text-black'
                          : isDark
                            ? 'hover:bg-gray-800/80'
                            : 'hover:bg-gray-100'
                      } transition-colors`}
                    >
                      {i + 1}
                      {hasEvent && !isHighlighted && (
                        <div className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-400" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <p className={`${textMuted} mt-4 text-sm`}>{t('landing.features.calendar.desc')}</p>
          </div>

          {/* Card 3 - Analytics */}
          <div
            className={`rounded-3xl ${cardBg} ${cardBorder} group p-6 transition-shadow duration-300 hover:shadow-xl`}
          >
            <div className="mb-3 flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl ${isDark ? 'bg-green-500/10' : 'bg-green-50'} flex items-center justify-center`}
              >
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="6" width="7" height="20" rx="2" fill="#22c55e" />
                  <rect x="13" y="12" width="7" height="14" rx="2" fill="#16a34a" />
                  <rect x="22" y="8" width="7" height="18" rx="2" fill="#22c55e" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">{t('landing.features.analytics.title')}</h3>
            </div>
            <p className={`${textMuted} mb-4 text-sm`}>{t('landing.features.analytics.desc')}</p>
            {/* Stats Row */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className={`${innerBg} rounded-xl p-3 text-center`}>
                <div className="text-lg font-bold text-amber-500">87%</div>
                <div className={`text-[10px] ${textMuted2}`}>Efficiency</div>
              </div>
              <div className={`${innerBg} rounded-xl p-3 text-center`}>
                <div className="text-lg font-bold text-green-500">24</div>
                <div className={`text-[10px] ${textMuted2}`}>Completed</div>
              </div>
              <div className={`${innerBg} rounded-xl p-3 text-center`}>
                <div className="text-lg font-bold text-blue-500">5h</div>
                <div className={`text-[10px] ${textMuted2}`}>Avg. Time</div>
              </div>
            </div>
            {/* Chart */}
            <div className={`${innerBg} rounded-xl p-4`}>
              <div className="flex h-20 items-end gap-1.5">
                {[
                  { h: 40, color: 'from-amber-400/70 to-amber-500/30' },
                  { h: 65, color: 'from-amber-400/70 to-amber-500/30' },
                  { h: 35, color: 'from-amber-400/70 to-amber-500/30' },
                  { h: 80, color: 'from-green-400/70 to-green-500/30' },
                  { h: 50, color: 'from-amber-400/70 to-amber-500/30' },
                  { h: 70, color: 'from-amber-400/70 to-amber-500/30' },
                  { h: 90, color: 'from-green-400/70 to-green-500/30' },
                ].map((bar, i) => (
                  <div
                    key={i}
                    className={`flex-1 bg-gradient-to-t ${bar.color} rounded-t-md transition-all duration-500`}
                    style={{ height: `${bar.h}%` }}
                  />
                ))}
              </div>
              <div className={`mt-2 flex justify-between text-[9px] ${textMuted2}`}>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </section>

        {/* Unleash Efficiency Section */}
        <section className={`rounded-3xl ${cardBg} ${cardBorder} p-8`}>
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              {t('landing.efficiency.title')}
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                {t('landing.efficiency.title2')}
              </span>
            </h2>
            <p className={`${textMuted} mx-auto max-w-2xl`}>{t('landing.efficiency.desc')}</p>
          </div>

          {/* Feature Cards Grid */}
          <div className="mb-4 grid gap-4 md:grid-cols-3">
            <FeatureImageCard
              title={t('landing.efficiency.workflow.title')}
              description={t('landing.efficiency.workflow.desc')}
              gradient="from-purple-500/20 to-blue-500/20"
              isDark={isDark}
              icon={
                <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="4" width="10" height="10" rx="3" fill="#a78bfa" />
                  <rect x="18" y="4" width="10" height="10" rx="3" fill="#7c3aed" />
                  <rect x="4" y="18" width="10" height="10" rx="3" fill="#7c3aed" />
                  <rect x="18" y="18" width="10" height="10" rx="3" fill="#a78bfa" />
                </svg>
              }
              accentColor="purple"
            />
            <FeatureImageCard
              title={t('landing.efficiency.collaboration.title')}
              description={t('landing.efficiency.collaboration.desc')}
              gradient="from-pink-500/20 to-orange-500/20"
              isDark={isDark}
              icon={
                <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="10" r="4" fill="#f472b6" />
                  <path
                    d="M8 24C8 20.134 11.134 17 15 17H17C20.866 17 24 20.134 24 24V26H8V24Z"
                    fill="#f472b6"
                  />
                  <circle cx="24.5" cy="11" r="3" fill="#ec4899" />
                  <path
                    d="M29 22C29 19.5 27 17.5 24.5 17.5"
                    stroke="#ec4899"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="7.5" cy="11" r="3" fill="#ec4899" />
                  <path
                    d="M3 22C3 19.5 5 17.5 7.5 17.5"
                    stroke="#ec4899"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              }
              accentColor="pink"
            />
            <FeatureImageCard
              title={t('landing.efficiency.management.title')}
              description={t('landing.efficiency.management.desc')}
              gradient="from-cyan-500/20 to-green-500/20"
              isDark={isDark}
              icon={
                <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M6 6C6 4.895 6.895 4 8 4H20L26 10V26C26 27.105 25.105 28 24 28H8C6.895 28 6 27.105 6 26V6Z"
                    fill="#22d3ee"
                  />
                  <path d="M20 4V10H26" fill="#06b6d4" />
                  <rect x="10" y="14" width="12" height="2" rx="1" fill="#0891b2" />
                  <rect x="10" y="18" width="12" height="2" rx="1" fill="#0891b2" />
                  <rect x="10" y="22" width="8" height="2" rx="1" fill="#0891b2" />
                </svg>
              }
              accentColor="cyan"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FeatureImageCard
              title={t('landing.efficiency.team.title')}
              description={t('landing.efficiency.team.desc')}
              gradient="from-amber-500/20 to-red-500/20"
              large
              isDark={isDark}
              icon={
                <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="17" r="11" fill="#fbbf24" />
                  <circle cx="16" cy="17" r="8" fill="#f59e0b" />
                  <path
                    d="M16 11V17L20 19"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M16 4V7" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                  <path d="M22 6L20 8.5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                </svg>
              }
              accentColor="amber"
            />
            <FeatureImageCard
              title={t('landing.efficiency.progress.title')}
              description={t('landing.efficiency.progress.desc')}
              gradient="from-green-500/20 to-teal-500/20"
              large
              isDark={isDark}
              icon={
                <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="6" width="7" height="20" rx="2" fill="#34d399" />
                  <rect x="13" y="12" width="7" height="14" rx="2" fill="#10b981" />
                  <rect x="22" y="8" width="7" height="18" rx="2" fill="#34d399" />
                </svg>
              }
              accentColor="green"
            />
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className={`rounded-3xl ${cardBg} ${cardBorder} p-8`}>
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              {t('landing.pricing.title')}
              <br />
              {t('landing.pricing.title2')}
            </h2>
            <p className={`${textMuted} mx-auto max-w-2xl`}>{t('landing.pricing.desc')}</p>

            {/* Billing Period Selector */}
            <div className="mt-8 inline-flex items-center rounded-full bg-[var(--app-bg-elevated)] p-1">
              {(['monthly', 'quarterly', 'yearly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setBillingPeriod(period)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    billingPeriod === period
                      ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-lg shadow-amber-500/10'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
                  }`}
                >
                  {t(`landing.pricing.billing.${period}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <PricingCard
              name={t('landing.pricing.free.name')}
              price={t('landing.pricing.free.price')}
              period={t('landing.pricing.free.period')}
              description={t('landing.pricing.free.desc')}
              features={t('landing.pricing.free.features', { returnObjects: true }) as string[]}
              buttonText={t('landing.hero.start')}
              isDark={isDark}
            />
            <PricingCard
              name={t('landing.pricing.plus.name')}
              price={t(
                `landing.pricing.plus.price${billingPeriod.charAt(0).toUpperCase() + billingPeriod.slice(1)}`
              )}
              period={t('landing.pricing.plus.period')}
              description={t('landing.pricing.plus.desc')}
              features={t('landing.pricing.plus.features', { returnObjects: true }) as string[]}
              buttonText={t('landing.hero.start')}
              isDark={isDark}
              plan="plus"
              periodValue={billingPeriod}
            />
            <PricingCard
              name={t('landing.pricing.pro.name')}
              price={t(
                `landing.pricing.pro.price${billingPeriod.charAt(0).toUpperCase() + billingPeriod.slice(1)}`
              )}
              period={t('landing.pricing.pro.period')}
              description={t('landing.pricing.pro.desc')}
              features={t('landing.pricing.pro.features', { returnObjects: true }) as string[]}
              popular
              popularText={t('landing.pricing.popular')}
              buttonText={t('landing.hero.start')}
              isDark={isDark}
              plan="pro"
              periodValue={billingPeriod}
            />
            <PricingCard
              name={t('landing.pricing.enterprise.name')}
              price={t('landing.pricing.enterprise.price')}
              period={t('landing.pricing.enterprise.period')}
              description={t('landing.pricing.enterprise.desc')}
              features={
                t('landing.pricing.enterprise.features', { returnObjects: true }) as string[]
              }
              buttonText={t('landing.pricing.enterprise.contact')}
              isDark={isDark}
            />
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className={`rounded-3xl ${cardBg} ${cardBorder} p-8`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <div
                className={`mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                FAQ
              </div>
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                {t('landing.faq.title')}
                <br />
                <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  {t('landing.faq.title2')}
                </span>
              </h2>
              <p className={`${textMuted} mb-8 text-lg`}>{t('landing.faq.desc')}</p>
              <a
                href="mailto:support@zadano.app"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-medium text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500"
              >
                {t('landing.faq.contact')}
              </a>
            </div>

            <div className="space-y-3">
              <FAQItem
                question={t('landing.faq.q1.question')}
                answer={t('landing.faq.q1.answer')}
                isDark={isDark}
              />
              <FAQItem
                question={t('landing.faq.q2.question')}
                answer={t('landing.faq.q2.answer')}
                isDark={isDark}
              />
              <FAQItem
                question={t('landing.faq.q3.question')}
                answer={t('landing.faq.q3.answer')}
                isDark={isDark}
              />
              <FAQItem
                question={t('landing.faq.q4.question')}
                answer={t('landing.faq.q4.answer')}
                isDark={isDark}
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section
          className={`rounded-3xl ${cardBg} ${cardBorder} relative overflow-hidden p-12 text-center md:p-16`}
        >
          <div
            className={`absolute inset-0 ${isDark ? 'bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-orange-500/5' : 'from-amber-500/3 to-orange-500/3 bg-gradient-to-r via-amber-500/5'}`}
          />
          <div className="relative">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              {t('landing.cta.title')}
              <br />
              <img src={logo} alt="Zadano.app" className="mt-2 inline-block h-10 md:h-12" />
            </h2>
            <p className={`${textMuted} mx-auto mb-8 max-w-2xl`}>{t('landing.cta.desc')}</p>
            <Link
              to="/register"
              className="inline-flex rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-4 font-semibold text-black shadow-2xl shadow-amber-500/30 transition-all hover:from-amber-400 hover:to-amber-500"
            >
              {t('landing.cta.button')}
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={`${bg} mt-4 ${isDark ? '' : 'border-t border-gray-200/60'}`}>
        <div className="container mx-auto px-6 py-12">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div>
              <img src={logo} alt="Zadano.app" className="mb-4 h-6" />
              <p className={`${textMuted2} text-sm`}>{t('landing.footer.desc')}</p>
            </div>
            <div>
              <h4 className="mb-4 font-medium">{t('landing.footer.overview')}</h4>
              <ul className={`space-y-2 text-sm ${textMuted}`}>
                <li>
                  <a href="#features" className={`${hoverText} transition-colors`}>
                    {t('landing.nav.features')}
                  </a>
                </li>
                <li>
                  <a href="#pricing" className={`${hoverText} transition-colors`}>
                    {t('landing.nav.pricing')}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-medium">{t('landing.footer.resources')}</h4>
              <ul className={`space-y-2 text-sm ${textMuted}`}>
                <li>
                  <a href="#" className={`${hoverText} transition-colors`}>
                    {t('landing.footer.blog')}
                  </a>
                </li>
                <li>
                  <a href="#faq" className={`${hoverText} transition-colors`}>
                    {t('landing.nav.faq')}
                  </a>
                </li>
                <li>
                  <a href="#" className={`${hoverText} transition-colors`}>
                    {t('landing.footer.support')}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-medium">{t('landing.footer.newsletter')}</h4>
              <p className={`${textMuted} mb-4 text-sm`}>{t('landing.footer.newsletterDesc')}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="twoj@email.com"
                  className={`flex-1 rounded-lg px-4 py-2 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'} border text-sm transition-colors focus:border-amber-500 focus:outline-none`}
                />
                <button className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400">
                  {t('landing.footer.subscribe')}
                </button>
              </div>
            </div>
          </div>
          <div
            className={`border-t pt-8 ${isDark ? 'border-gray-800' : 'border-gray-200'} flex flex-col items-center justify-between gap-4 md:flex-row`}
          >
            <p className={`${textMuted2} text-sm`}>{t('landing.footer.rights')}</p>
            <div className="flex items-center gap-6">
              <a href="#" className={`${textMuted} ${hoverText} transition-colors`}>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
              </a>
              <a href="#" className={`${textMuted} ${hoverText} transition-colors`}>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ============================================================================
// Dashboard Wireframe – Matches Real Zadano Dashboard
// ============================================================================

function DashboardWireframe({ t, isDark }: { t: any; isDark: boolean }) {
  const panelBg = isDark ? 'bg-[#12121a]' : 'bg-white'
  const sidebarBg = isDark ? 'bg-[#0d0d14]' : 'bg-[#f8fafc]'
  const labelColor = isDark ? 'text-gray-500' : 'text-gray-400'
  const baseBg = isDark ? 'bg-[#0b0b10]' : 'bg-[#eef2f7]'
  const textPrimary = isDark ? 'text-white' : 'text-gray-900'
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500'
  const elevated = isDark ? 'bg-[#1a1a24]' : 'bg-gray-100'
  const accent = '#F2CE88'
  const accentHover = '#e0b462'

  // Mini sidebar icon (matching SidebarIcons.tsx style)
  const SIcon = ({ type, active }: { type: string; active?: boolean }) => {
    const fill = active ? accent : isDark ? '#64748b' : '#94a3b8'
    const fill2 = active ? accentHover : isDark ? '#475569' : '#cbd5e1'
    const s = 12
    switch (type) {
      case 'dashboard':
        return (
          <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="10" height="10" rx="3" fill={fill} />
            <rect x="18" y="4" width="10" height="10" rx="3" fill={fill2} />
            <rect x="4" y="18" width="10" height="10" rx="3" fill={fill2} />
            <rect x="18" y="18" width="10" height="10" rx="3" fill={fill} />
          </svg>
        )
      case 'team':
        return (
          <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="10" r="4" fill={fill} />
            <path
              d="M8 24C8 20.134 11.134 17 15 17H17C20.866 17 24 20.134 24 24V26H8V24Z"
              fill={fill}
            />
          </svg>
        )
      case 'projects':
        return (
          <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
            <path d="M16 4L26 9V20.5L16 25.5L6 20.5V9L16 4Z" fill={fill2} />
            <path d="M6 9L16 14L26 9L16 4L6 9Z" fill={fill} />
          </svg>
        )
      case 'messages':
        return (
          <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
            <path
              d="M4 12C4 8.686 6.686 6 10 6H22C25.314 6 28 8.686 28 12V18C28 21.314 25.314 24 22 24H12L6 28V24C4 24 4 21.314 4 18V12Z"
              fill={fill2}
            />
            <rect x="10" y="11" width="12" height="3" rx="1.5" fill={fill} />
          </svg>
        )
      case 'calendar':
        return (
          <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
            <path
              d="M6 10C6 7.79 7.79 6 10 6H22C24.21 6 26 7.79 26 10V24C26 26.21 24.21 28 22 28H10C7.79 28 6 26.21 6 24V10Z"
              fill={fill}
            />
            <path d="M6 12H26" stroke={fill2} strokeWidth="3" />
          </svg>
        )
      case 'files':
        return (
          <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
            <rect x="6" y="10" width="20" height="14" rx="3" fill={fill2} />
            <rect x="8" y="13" width="18" height="11" rx="2" fill={fill} />
          </svg>
        )
      case 'resources':
        return (
          <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
            <rect x="4" y="6" width="7" height="20" rx="2" fill={fill} />
            <rect x="13" y="6" width="7" height="14" rx="2" fill={fill2} />
            <rect x="22" y="6" width="7" height="18" rx="2" fill={fill} />
          </svg>
        )
      case 'timetracker':
        return (
          <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="17" r="11" fill={fill2} />
            <circle cx="16" cy="17" r="8" fill={fill} />
            <path d="M16 11V17L20 19" stroke={fill2} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )
      case 'settings':
        return (
          <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="5" fill={fill2} />
            <path
              d="M16 4V8M16 24V28M28 16H24M8 16H4"
              stroke={fill}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className={`overflow-hidden rounded-xl ${baseBg} p-2`}>
      {/* Top bar - mimicking real app header */}
      <div className={`mb-2 flex items-center justify-between px-2 py-1.5 ${panelBg} rounded-lg`}>
        <div className="flex items-center gap-4">
          <img
            src={
              isDark ? '/Zadano/Zadano_Logo_Full_Dark.svg' : '/Zadano/Zadano_Logo_Full_Light.svg'
            }
            alt=""
            className="h-3.5"
          />
          <div
            className={`flex items-center gap-1 rounded px-2 py-0.5 ${elevated} text-[8px] ${labelColor}`}
          >
            <svg
              className="h-2 w-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            Search...
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-[7px] ${elevated} ${labelColor}`}>EN</span>
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/30">
            <span className="text-[6px] text-amber-500">B</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-1.5">
        {/* Sidebar */}
        <div className={`col-span-2 ${sidebarBg} space-y-0.5 rounded-lg p-1.5`}>
          {[
            { type: 'dashboard', label: 'Dashboard', active: true },
            { type: 'team', label: t('dashboard.team'), active: false },
            { type: 'projects', label: t('dashboard.projects'), active: false },
            { type: 'messages', label: t('dashboard.messages'), active: false },
            { type: 'calendar', label: t('dashboard.calendar'), active: false },
            { type: 'files', label: t('dashboard.files'), active: false },
            { type: 'resources', label: t('dashboard.resources'), active: false },
            { type: 'timetracker', label: 'Time Tracker', active: false },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-1 rounded px-1 py-0.5 text-[7px] ${
                item.active ? `${isDark ? 'bg-[#1a1a24]' : 'bg-gray-100'} font-medium` : ''
              } ${item.active ? 'text-[#F2CE88]' : labelColor}`}
            >
              <SIcon type={item.type} active={item.active} />
              <span className="truncate">{item.label}</span>
            </div>
          ))}
          <div className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-200'} my-0.5`} />
          <div className={`flex items-center gap-1 rounded px-1 py-0.5 text-[7px] ${labelColor}`}>
            <SIcon type="settings" />
            <span>Org. Settings</span>
          </div>
        </div>

        {/* Main content area - Left (8 cols) */}
        <div className="col-span-7 space-y-1.5">
          {/* Meetings row */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className={`${panelBg} flex items-center justify-center rounded-lg p-2`}>
              <span className={`text-[7px] ${labelColor}`}>No upcoming meetings</span>
            </div>
            <div
              className={`${panelBg} flex flex-col items-center justify-center gap-1 rounded-lg p-2`}
            >
              <div className={`h-4 w-4 rounded-full ${elevated} flex items-center justify-center`}>
                <span className={`text-[8px] ${labelColor}`}>+</span>
              </div>
              <span className={`text-[7px] ${labelColor}`}>Add New Meeting</span>
            </div>
          </div>

          {/* Projects section */}
          <div className={`${panelBg} rounded-lg p-2`}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className={`text-[8px] font-semibold ${textPrimary}`}>
                {t('dashboard.projects')}
              </span>
              <div className={`flex ${elevated} rounded-full p-0.5`}>
                <span className="rounded-full bg-[#F2CE88] px-2 py-0.5 text-[6px] font-bold text-black">
                  {t('dashboard.ongoing')}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[6px] font-bold ${labelColor}`}>
                  {t('dashboard.pending')}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { name: 'Projekt nr. 2', deadline: null, progress: 0 },
                { name: 'Testowy projekt', deadline: '27.02.2026', progress: 0 },
              ].map((p, i) => (
                <div key={i} className={`${elevated} rounded-lg p-2`}>
                  <div className="mb-1 flex items-center gap-1">
                    <div
                      className={`h-3 w-3 rounded-full ${i === 0 ? 'bg-purple-500' : 'bg-blue-500'} flex items-center justify-center`}
                    >
                      <span className="text-[5px] font-bold text-white">{p.name[0]}</span>
                    </div>
                    <span className={`text-[7px] font-medium ${textPrimary}`}>{p.name}</span>
                  </div>
                  <div className={`text-[6px] ${labelColor} mb-1`}>
                    {p.deadline ? `Until ${p.deadline}` : '● No deadline'}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-1">
                      {[0, 1].map((j) => (
                        <div
                          key={j}
                          className={`h-2.5 w-2.5 rounded-full border ${isDark ? 'border-[#1a1a24]' : 'border-white'} ${j === 0 ? 'bg-amber-500' : 'bg-blue-500'}`}
                        />
                      ))}
                      <span className={`text-[5px] ${labelColor} ml-1`}>+2</span>
                    </div>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[6px] ${isDark ? 'bg-[#12121a]' : 'bg-gray-50'} font-medium text-[#F2CE88]`}
                    >
                      View project
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar section */}
          <div className={`${panelBg} rounded-lg p-2`}>
            <div className="mb-1 flex items-center justify-between">
              <span className={`text-[8px] font-semibold ${textPrimary}`}>April 2026</span>
              <div className="flex items-center gap-1">
                <span className={`text-[6px] ${labelColor}`}>Today</span>
                <div className="flex gap-0.5">
                  <div
                    className={`h-3 w-3 rounded ${elevated} flex items-center justify-center ${labelColor} text-[7px]`}
                  >
                    ‹
                  </div>
                  <div
                    className={`h-3 w-3 rounded ${elevated} flex items-center justify-center ${labelColor} text-[7px]`}
                  >
                    ›
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
                <span key={d} className={`text-[5px] ${labelColor} py-0.5`}>
                  {d}
                </span>
              ))}
              {[...Array(30)].map((_, i) => {
                const isToday = i === 9
                return (
                  <div
                    key={i}
                    className={`rounded py-0.5 text-[6px] ${isToday ? 'bg-[#F2CE88] font-bold text-black' : textSecondary}`}
                  >
                    {i + 1}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right column (3 cols) */}
        <div className="col-span-3 space-y-1.5">
          {/* Task Progress donut */}
          <div className={`${panelBg} rounded-lg p-2`}>
            <div className="mb-1 flex items-center justify-between">
              <span className={`text-[8px] font-semibold ${textPrimary}`}>Task Progress</span>
            </div>
            <div className="flex items-center justify-center py-1">
              <div className="relative h-12 w-12">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke={isDark ? '#1a1a24' : '#e5e7eb'}
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#F2CE88"
                    strokeWidth="3"
                    strokeDasharray="0 88"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-[10px] font-bold ${textPrimary}`}>0%</span>
                </div>
              </div>
            </div>
            <div className={`text-center text-[6px] ${labelColor}`}>Completed: 0 / 0</div>
          </div>

          {/* Chat */}
          <div className={`${panelBg} rounded-lg p-2`}>
            <div className="mb-1 flex items-center justify-between">
              <span className={`text-[8px] font-semibold ${textPrimary}`}>Chat</span>
              <span className="text-[6px] text-[#F2CE88]">See all</span>
            </div>
            <div className="flex gap-1.5">
              {['J', 'W'].map((name, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div
                    className={`h-5 w-5 rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-gray-600'} flex items-center justify-center`}
                  >
                    <span className="text-[6px] font-bold text-white">{name}</span>
                  </div>
                  <span className={`text-[5px] ${labelColor}`}>{i === 0 ? 'Jan' : 'Wacław'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Last resources */}
          <div className={`${panelBg} rounded-lg p-2`}>
            <div className="mb-1 flex items-center justify-between">
              <span className={`text-[8px] font-semibold ${textPrimary}`}>Last resources</span>
              <span className="text-[6px] text-[#F2CE88]">See all</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`h-4 w-4 rounded ${elevated} flex items-center justify-center`}>
                <span className={`text-[6px] ${labelColor}`}>📄</span>
              </div>
              <div>
                <div className={`text-[7px] ${textPrimary}`}>GD_Szczegoly.pdf</div>
                <div className={`text-[5px] ${labelColor}`}>96.8 KB • about 1 month ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Feature Image Card – With Icons & Visual Illustrations
// ============================================================================

function FeatureImageCard({
  title,
  description,
  gradient,
  large = false,
  isDark,
  icon,
  accentColor,
}: {
  title: string
  description: string
  gradient: string
  large?: boolean
  isDark: boolean
  icon: React.ReactNode
  accentColor: string
}) {
  const colorMap: Record<string, string> = {
    purple: isDark ? 'border-purple-500/20' : 'border-purple-200',
    pink: isDark ? 'border-pink-500/20' : 'border-pink-200',
    cyan: isDark ? 'border-cyan-500/20' : 'border-cyan-200',
    amber: isDark ? 'border-amber-500/20' : 'border-amber-200',
    green: isDark ? 'border-green-500/20' : 'border-green-200',
  }

  const bgMap: Record<string, string> = {
    purple: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
    pink: isDark ? 'bg-pink-500/10' : 'bg-pink-50',
    cyan: isDark ? 'bg-cyan-500/10' : 'bg-cyan-50',
    amber: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
    green: isDark ? 'bg-green-500/10' : 'bg-green-50',
  }

  return (
    <div
      className={`rounded-2xl ${isDark ? 'bg-gray-900/80' : 'border border-gray-100 bg-white'} group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
    >
      <div
        className={`bg-gradient-to-br ${gradient} ${large ? 'h-48' : 'h-40'} relative flex items-center justify-center overflow-hidden`}
      >
        {/* Decorative elements */}
        <div
          className={`absolute right-4 top-4 h-16 w-16 rounded-full ${bgMap[accentColor]} opacity-60`}
        />
        <div
          className={`absolute bottom-4 left-4 h-10 w-10 rounded-lg ${bgMap[accentColor]} rotate-12 opacity-40`}
        />
        <div
          className={`absolute left-1/4 top-1/2 h-6 w-6 rounded ${bgMap[accentColor]} -rotate-12 opacity-30`}
        />

        {/* Main icon */}
        <div
          className={`h-20 w-20 rounded-2xl ${bgMap[accentColor]} border backdrop-blur-sm ${colorMap[accentColor]} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>
      <div className="p-5">
        <h3 className="mb-1 font-semibold">{title}</h3>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm`}>{description}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Pricing Card
// ============================================================================

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  popular = false,
  popularText,
  buttonText,
  isDark,
  plan,
  periodValue,
}: {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  popular?: boolean
  popularText?: string
  buttonText: string
  isDark: boolean
  plan?: 'plus' | 'pro' | 'enterprise'
  periodValue?: 'monthly' | 'quarterly' | 'yearly'
}) {
  return (
    <div
      className={`relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        popular
          ? isDark
            ? 'border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-transparent'
            : 'border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-lg'
          : isDark
            ? 'bg-gray-900/80'
            : 'border border-gray-100 bg-white'
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1 text-xs font-bold text-black shadow-lg shadow-amber-500/30">
          {popularText}
        </div>
      )}
      <h3 className="mb-2 text-xl font-bold">{name}</h3>
      <div className="mb-1">
        <span className="text-3xl font-bold">{price}</span>
        {period && (
          <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'} ml-1 text-sm`}>
            /{period}
          </span>
        )}
      </div>
      <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mb-6 text-sm`}>{description}</p>
      <ul className="mb-6 space-y-3">
        {Array.isArray(features) &&
          features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15">
                <span className="text-xs text-amber-500">✓</span>
              </span>
              {feature}
            </li>
          ))}
      </ul>
      <Link
        to="/register"
        search={
          plan && periodValue
            ? {
                plan,
                period:
                  periodValue === 'monthly'
                    ? 'month'
                    : periodValue === 'quarterly'
                      ? 'quarter'
                      : 'year',
              }
            : undefined
        }
        className={`block rounded-xl py-3 text-center font-medium transition-all ${
          popular
            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500'
            : isDark
              ? 'border border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800'
              : 'border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        {buttonText}
      </Link>
    </div>
  )
}

// ============================================================================
// FAQ Item – Animated Accordion
// ============================================================================

function FAQItem({
  question,
  answer,
  isDark,
}: {
  question: string
  answer: string
  isDark: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [answer])

  return (
    <div
      className={`overflow-hidden rounded-xl transition-all duration-200 ${
        isDark
          ? `bg-gray-900/80 ${isOpen ? 'ring-1 ring-amber-500/20' : 'hover:bg-gray-900'}`
          : `border bg-white ${isOpen ? 'border-amber-200 shadow-md' : 'border-gray-100 hover:border-gray-200'}`
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between p-5 text-left transition-colors`}
      >
        <span className="pr-4 font-medium">{question}</span>
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-300 ${
            isOpen
              ? isDark
                ? 'rotate-180 bg-amber-500/20 text-amber-400'
                : 'rotate-180 bg-amber-50 text-amber-600'
              : isDark
                ? 'bg-gray-800 text-gray-400'
                : 'bg-gray-100 text-gray-400'
          }`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <div
        style={{ maxHeight: isOpen ? contentHeight : 0, opacity: isOpen ? 1 : 0 }}
        className="overflow-hidden transition-all duration-300 ease-in-out"
      >
        <div
          ref={contentRef}
          className={`px-5 pb-5 ${isDark ? 'text-gray-400' : 'text-gray-500'} leading-relaxed`}
        >
          {answer}
        </div>
      </div>
    </div>
  )
}
