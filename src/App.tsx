import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import CookieConsent from './components/CookieConsent'
import GlobalUpsellModal from './components/GlobalUpsellModal'
import Footer from './components/Footer'
import GeneratePage from './pages/GeneratePage'

// Non-critical pages -- lazy-loaded to reduce the initial bundle.
const GeneratePresentationPage = lazy(() => import('./pages/GeneratePresentationPage'))
const WorksheetPage = lazy(() => import('./pages/WorksheetPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const WorksheetsListPage = lazy(() => import('./pages/WorksheetsListPage'))
const SavedWorksheetPage = lazy(() => import('./pages/SavedWorksheetPage'))
const SavedPresentationPage = lazy(() => import('./pages/SavedPresentationPage'))
const PresentationsListPage = lazy(() => import('./pages/PresentationsListPage'))
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'))
const PaymentCancelPage = lazy(() => import('./pages/PaymentCancelPage'))
const LegalDocPage = lazy(() => import('./pages/LegalDocPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))

// Admin pages -- lazy-loaded into a separate chunk.
// The AdminPage layout itself checks the user role before rendering,
// so even if someone loads the chunk they won't see data without admin rights.
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const AdminOverview = lazy(() => import('./pages/admin/AdminPage').then(m => ({ default: m.AdminOverview })))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminUserDetailPage = lazy(() => import('./pages/admin/AdminUserDetailPage'))
const AdminGenerationsPage = lazy(() => import('./pages/admin/AdminGenerationsPage'))
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'))
const AdminAICostsPage = lazy(() => import('./pages/admin/AdminAICostsPage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'))

/** Scroll to top on route change (React Router v6 does not do this automatically) */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-200 border-t-[#8C52FF]"></div>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <div className="flex-1">
      <Routes>
        <Route path="/" element={<GeneratePage />} />
        <Route path="/presentations/generate" element={<Suspense fallback={<PageFallback />}><GeneratePresentationPage /></Suspense>} />
        <Route path="/login" element={<Suspense fallback={<PageFallback />}><LoginPage /></Suspense>} />
        <Route path="/dashboard" element={<Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>} />
        <Route path="/worksheet/:sessionId" element={<Suspense fallback={<PageFallback />}><WorksheetPage /></Suspense>} />
        <Route path="/worksheets" element={<Suspense fallback={<PageFallback />}><WorksheetsListPage /></Suspense>} />
        <Route path="/worksheets/:id" element={<Suspense fallback={<PageFallback />}><SavedWorksheetPage /></Suspense>} />
        <Route path="/presentations" element={<Suspense fallback={<PageFallback />}><PresentationsListPage /></Suspense>} />
        <Route path="/presentations/:id" element={<Suspense fallback={<PageFallback />}><SavedPresentationPage /></Suspense>} />

        {/* Pricing */}
        <Route path="/pricing" element={<Suspense fallback={<PageFallback />}><PricingPage /></Suspense>} />

        {/* Legal docs */}
        <Route path="/legal/:slug" element={<Suspense fallback={<PageFallback />}><LegalDocPage /></Suspense>} />

        {/* Payment routes */}
        <Route path="/payment/success" element={<Suspense fallback={<PageFallback />}><PaymentSuccessPage /></Suspense>} />
        <Route path="/payment/cancel" element={<Suspense fallback={<PageFallback />}><PaymentCancelPage /></Suspense>} />

        {/* Admin routes -- lazy loaded */}
        <Route path="/admin" element={<Suspense fallback={<PageFallback />}><AdminPage /></Suspense>}>
          <Route index element={<Suspense fallback={<PageFallback />}><AdminOverview /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageFallback />}><AdminUsersPage /></Suspense>} />
          <Route path="users/:id" element={<Suspense fallback={<PageFallback />}><AdminUserDetailPage /></Suspense>} />
          <Route path="generations" element={<Suspense fallback={<PageFallback />}><AdminGenerationsPage /></Suspense>} />
          <Route path="payments" element={<Suspense fallback={<PageFallback />}><AdminPaymentsPage /></Suspense>} />
          <Route path="ai-costs" element={<Suspense fallback={<PageFallback />}><AdminAICostsPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageFallback />}><AdminSettingsPage /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </div>
      {!isAdmin && <Footer />}
      <CookieConsent />
      <GlobalUpsellModal />
    </div>
  )
}
