'use client'

import { useState, useEffect } from 'react'
import { getCreditPackages, purchaseCredits, subscribeToPRPMPlus } from '../../lib/api'
import type { CreditPackage } from '../../lib/api'

interface BuyCreditsModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function BuyCreditsModal({ onClose, onSuccess }: BuyCreditsModalProps) {
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    try {
      const result = await getCreditPackages()
      setPackages(result.packages)
    } catch (err: any) {
      console.error('Failed to load packages:', err)
      setError(err.message || 'Failed to load credit packages')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (packageId: string) => {
    const token = localStorage.getItem('prpm_token')
    if (!token) {
      setError('Not authenticated')
      return
    }

    setPurchasing(true)
    setError(null)
    setSelectedPackage(packageId)

    try {
      const result = await purchaseCredits(token, packageId)

      // For now, show a simple alert. In production, integrate Stripe Elements
      // to handle the payment with result.clientSecret
      alert(`Purchase initiated! Client secret: ${result.clientSecret}\n\nIn production, this would open Stripe payment form.\n\nFor testing: The backend has created a PaymentIntent. You can use Stripe test cards to complete the payment.`)

      // In a real implementation, you would:
      // 1. Load Stripe.js
      // 2. Create a Stripe Elements form
      // 3. Confirm the payment with result.clientSecret
      // 4. Handle the webhook callback for success

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Failed to purchase:', err)
      setError(err.message || 'Failed to purchase credits')
    } finally {
      setPurchasing(false)
      setSelectedPackage(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Buy Credits</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
              {error}
            </div>
          ) : (
            <>
              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Purchase additional credits to continue using the PRPM+ Playground. Credits never expire and can be used anytime.
              </p>

              {/* Packages Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative border-2 rounded-lg p-6 transition cursor-pointer ${
                      pkg.popular
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => !purchasing && handlePurchase(pkg.id)}
                  >
                    {/* Popular Badge */}
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          POPULAR
                        </span>
                      </div>
                    )}

                    {/* Package Name */}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {pkg.name}
                    </h3>

                    {/* Credits */}
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      {pkg.credits}
                      <span className="text-lg text-gray-600 dark:text-gray-400"> credits</span>
                    </div>

                    {/* Price */}
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      ${(pkg.price / 100).toFixed(2)}
                    </div>

                    {/* Value */}
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      ${((pkg.price / 100) / pkg.credits).toFixed(3)} per credit
                    </div>

                    {/* Buy Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePurchase(pkg.id)
                      }}
                      disabled={purchasing}
                      className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
                        purchasing && selectedPackage === pkg.id
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : pkg.popular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                      }`}
                    >
                      {purchasing && selectedPackage === pkg.id ? 'Processing...' : 'Buy Now'}
                    </button>
                  </div>
                ))}
              </div>

              {/* PRPM+ Info */}
              <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <h4 className="font-bold text-yellow-900 dark:text-yellow-300 mb-2">
                  🎁 Best Value: PRPM+ - Just $5/month!
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                  Upgrade to PRPM+ for just $5/month and get 200 credits every month, plus priority support and exclusive features.
                </p>
                <button
                  onClick={async () => {
                    const token = localStorage.getItem('prpm_token')
                    if (!token) {
                      setError('Not authenticated')
                      return
                    }

                    try {
                      const currentUrl = window.location.origin
                      const result = await subscribeToPRPMPlus(
                        token,
                        `${currentUrl}/playground?subscription=success`,
                        `${currentUrl}/playground?subscription=cancelled`
                      )

                      // Redirect to Stripe Checkout
                      if (result.checkoutUrl) {
                        window.location.href = result.checkoutUrl
                      }
                    } catch (err: any) {
                      console.error('Failed to start subscription:', err)
                      setError(err.message || 'Failed to start subscription')
                    }
                  }}
                  disabled={purchasing}
                  className="mt-3 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchasing ? 'Processing...' : 'Upgrade to PRPM+'}
                </button>
              </div>

              {/* Note about Stripe */}
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  ⚠️ <strong>Development Note:</strong> Stripe payment integration is set up on the backend. In production, clicking "Buy Now" will open a secure Stripe payment form to complete the purchase. For now, it shows the PaymentIntent client secret for testing.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
