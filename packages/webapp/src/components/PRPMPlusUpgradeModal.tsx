'use client'

import { X, Sparkles, Zap, Shield, Crown } from 'lucide-react'

interface PRPMPlusUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature?: string
  benefits?: string[]
  trialAvailable?: boolean
}

const DEFAULT_BENEFITS = [
  'Unlimited AI semantic search',
  'Natural language package discovery',
  'AI-powered recommendations',
  'Similar packages suggestions',
  '100 monthly playground credits (rollover to 200)',
  'Verified author badge',
  'Priority email support'
]

export function PRPMPlusUpgradeModal({
  isOpen,
  onClose,
  feature = 'AI-Powered Search',
  benefits = DEFAULT_BENEFITS,
  trialAvailable = true
}: PRPMPlusUpgradeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <Crown className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">
              Upgrade to PRPM+
            </h2>
          </div>
          <p className="text-purple-100">
            Unlock {feature} and premium features
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Pricing */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-6 border border-purple-200 dark:border-purple-700">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                $19
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                /month
              </span>
            </div>
            {trialAvailable && (
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                ✨ Start with a 14-day free trial
              </p>
            )}
          </div>

          {/* Features */}
          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Everything included:
            </h3>

            <div className="grid gap-3">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-shrink-0 w-5 h-5 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-purple-600 dark:text-purple-400 text-sm font-bold">✓</span>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial / Social Proof */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Trusted by top developers
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Join hundreds of developers using PRPM+ to discover AI tools faster
              and build better workflows.
            </p>
          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6">
            <Shield className="w-4 h-4" />
            <span>Secure payment powered by Stripe • Cancel anytime</span>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/pricing'}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              {trialAvailable ? 'Start Free Trial' : 'Upgrade Now'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
