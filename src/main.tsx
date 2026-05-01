import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { AuthProvider } from './lib/auth'
import { captureReferralCode } from './lib/referral'
import App from './App'
import './index.css'
import 'katex/dist/katex.min.css'

// Persist `?ref=CODE` for 90 days BEFORE first render so the cookie is in place
// for the very first auth round-trip the user might make.
captureReferralCode()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  </React.StrictMode>
)
