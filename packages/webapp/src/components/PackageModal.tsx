'use client'

import { useState } from 'react'

// Minimal package interface for modal display
interface ModalPackage {
  id: string
  name: string
  description?: string
  format: string
  subtype: string
  total_downloads: number
  weekly_downloads: number
  tags: string[]
}

interface PackageModalProps {
  package: ModalPackage
  isOpen: boolean
  onClose: () => void
}

export default function PackageModal({ package: pkg, isOpen, onClose }: PackageModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopyInstall = () => {
    navigator.clipboard.writeText(`prpm install ${pkg.name}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-prpm-dark-card border border-prpm-border rounded-xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">{pkg.name}</h2>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-prpm-dark rounded text-sm text-prpm-accent">
                {pkg.format}
              </span>
              <span className="px-3 py-1 bg-prpm-dark rounded text-sm text-gray-400">
                {pkg.subtype}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <p className="text-gray-300 mb-6">{pkg.description || 'No description available'}</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-prpm-dark p-4 rounded-lg">
            <div className="text-2xl font-bold text-prpm-accent">
              {pkg.total_downloads.toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Total Downloads</div>
          </div>
          <div className="bg-prpm-dark p-4 rounded-lg">
            <div className="text-2xl font-bold text-prpm-accent">
              {pkg.weekly_downloads.toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Weekly Downloads</div>
          </div>
        </div>

        {pkg.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {pkg.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-prpm-dark border border-prpm-border rounded text-sm text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleCopyInstall}
          className="w-full px-4 py-2 bg-prpm-accent hover:bg-prpm-accent-dark rounded-lg font-medium"
        >
          {copied ? '✓ Copied!' : 'Copy Install Command'}
        </button>
      </div>
    </div>
  )
}
