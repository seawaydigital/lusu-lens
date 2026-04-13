'use client'

import { useEffect, useState } from 'react'
import { Trash2, Upload } from 'lucide-react'
import { initDB, getUploads, deleteUploadData } from '@/lib/db'
import type { UploadRecord } from '@/types'
import Link from 'next/link'

export default function ManagePage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    initDB().then(() => getUploads().then(setUploads))
  }, [])

  async function handleDelete(upload: UploadRecord) {
    await deleteUploadData(upload.venue, upload.year, upload.month)
    const updated = await getUploads()
    setUploads(updated)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-lusu-navy">Manage Uploads</h1>
        <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-lusu-cyan text-white rounded-lg text-sm font-medium hover:bg-lusu-cyan/90">
          <Upload size={16} />
          Upload new files
        </Link>
      </div>

      {uploads.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No data uploaded yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm divide-y">
          {uploads
            .sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))
            .map(upload => {
              const monthName = new Date(upload.year, upload.month - 1)
                .toLocaleString('default', { month: 'long' })
              const venueLabel = upload.venue === 'study' ? 'The Study' : 'The Outpost'

              return (
                <div key={upload.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{venueLabel} — {monthName} {upload.year}</p>
                    <p className="text-sm text-gray-500">
                      {upload.operatingDayCount} days · Uploaded {new Date(upload.uploadedAt).toLocaleDateString()}
                      {upload.fileTypes.length < 2 && ' · Partial upload'}
                    </p>
                    {upload.dataQualityFlags.length > 0 && (
                      <div className="flex gap-2 mt-1">
                        {upload.dataQualityFlags.map(flag => (
                          <span
                            key={flag.type}
                            className={`text-xs px-2 py-0.5 rounded ${
                              flag.severity === 'warning'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {flag.type.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    {confirmDelete === upload.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-red-600">Delete?</span>
                        <button
                          onClick={() => handleDelete(upload)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1 bg-gray-200 rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(upload.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
