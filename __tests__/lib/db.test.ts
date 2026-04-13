import {
  initDB,
  resetDB,
  saveProducts,
  saveSummaries,
  saveUpload,
  getProducts,
  getSummaries,
  getUploads,
  getUpload,
  deleteUploadData,
} from '@/lib/db'
import type { ProductRecord, DailySummary, UploadRecord } from '@/types'

const mockProduct: ProductRecord = {
  date: '2024-09-03',
  venue: 'study',
  item: 'Coffee',
  size: 'Medium',
  category: 'Coffee',
  quantity: 3,
  net: 7.50,
  gross: 7.50,
}

const mockSummary: DailySummary = {
  date: '2024-09-03',
  venue: 'study',
  grossSales: 1500,
  autoPricingDiscounts: 0,
  discounts: -18,
  netSales: 1482,
  taxes: 192.66,
  tips: 110,
  grossReceipts: 1784.66,
  totalTransactions: 286,
  transactions: [{ type: 'Cash', count: 40, amount: 300, tip: 10, total: 310 }],
}

const mockUpload: UploadRecord = {
  id: 'study_2024_9',
  venue: 'study',
  year: 2024,
  month: 9,
  uploadedAt: '2024-10-01T00:00:00Z',
  fileTypes: ['products', 'summary'],
  operatingDayCount: 19,
  dataQualityFlags: [],
}

beforeEach(async () => {
  await resetDB()
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('lusu_lens_db')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  await initDB()
}, 15000)

describe('db service', () => {
  it('saves and retrieves products', async () => {
    await saveProducts([mockProduct, { ...mockProduct, item: 'Tea' }])
    const products = await getProducts('study', 2024, 9)
    expect(products).toHaveLength(2)
    expect(products[0].item).toBe('Coffee')
  })

  it('saves and retrieves summaries', async () => {
    await saveSummaries([mockSummary])
    const summaries = await getSummaries('study', 2024, 9)
    expect(summaries).toHaveLength(1)
    expect(summaries[0].grossSales).toBe(1500)
    expect(summaries[0].transactions).toHaveLength(1)
  })

  it('saves and retrieves upload manifest', async () => {
    await saveUpload(mockUpload)
    const upload = await getUpload('study_2024_9')
    expect(upload).toBeDefined()
    expect(upload!.venue).toBe('study')
  })

  it('lists all uploads', async () => {
    await saveUpload(mockUpload)
    await saveUpload({ ...mockUpload, id: 'outpost_2024_9', venue: 'outpost' })
    const uploads = await getUploads()
    expect(uploads).toHaveLength(2)
  })

  it('does not delete products for a different venue', async () => {
    const outpostProduct = { ...mockProduct, venue: 'outpost' as const }
    await saveProducts([mockProduct, outpostProduct])
    await deleteUploadData('study', 2024, 9)
    const outpostProducts = await getProducts('outpost', 2024, 9)
    expect(outpostProducts).toHaveLength(1)
  })

  it('does not delete products for a different month', async () => {
    const octProduct = { ...mockProduct, date: '2024-10-03' }
    await saveProducts([mockProduct, octProduct])
    await deleteUploadData('study', 2024, 9)
    const octProducts = await getProducts('study', 2024, 10)
    expect(octProducts).toHaveLength(1)
  })

  it('deletes upload data completely', async () => {
    await saveProducts([mockProduct])
    await saveSummaries([mockSummary])
    await saveUpload(mockUpload)

    await deleteUploadData('study', 2024, 9)

    const products = await getProducts('study', 2024, 9)
    const summaries = await getSummaries('study', 2024, 9)
    const upload = await getUpload('study_2024_9')

    expect(products).toHaveLength(0)
    expect(summaries).toHaveLength(0)
    expect(upload).toBeUndefined()
  })
})
