import { openDB, type IDBPDatabase } from 'idb'
import type { ProductRecord, DailySummary, UploadRecord, Venue } from '@/types'

const DB_NAME = 'lusu_lens_db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<any>> | null = null

export async function resetDB() {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
  }
  dbPromise = null
}

export async function initDB() {
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('uploads')) {
        db.createObjectStore('uploads', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('products')) {
        const store = db.createObjectStore('products', {
          keyPath: 'id',
          autoIncrement: true,
        })
        store.createIndex('venue_date', ['venue', 'date'])
      }
      if (!db.objectStoreNames.contains('summaries')) {
        const store = db.createObjectStore('summaries', {
          keyPath: 'id',
          autoIncrement: true,
        })
        store.createIndex('venue_date', ['venue', 'date'])
      }
    },
  })
  return dbPromise
}

async function getDB() {
  if (!dbPromise) await initDB()
  return dbPromise!
}

export async function saveProducts(records: ProductRecord[]) {
  const db = await getDB()
  const tx = db.transaction('products', 'readwrite')
  for (const record of records) {
    await tx.store.add(record)
  }
  await tx.done
}

export async function saveSummaries(records: DailySummary[]) {
  const db = await getDB()
  const tx = db.transaction('summaries', 'readwrite')
  for (const record of records) {
    await tx.store.add(record)
  }
  await tx.done
}

export async function saveUpload(record: UploadRecord) {
  const db = await getDB()
  await db.put('uploads', record)
}

export async function getProducts(
  venue: Venue,
  year: number,
  month: number
): Promise<ProductRecord[]> {
  const db = await getDB()
  const all = await db.getAll('products')
  return all.filter(
    (p: ProductRecord) =>
      p.venue === venue &&
      p.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)
  )
}

export async function getSummaries(
  venue: Venue,
  year: number,
  month: number
): Promise<DailySummary[]> {
  const db = await getDB()
  const all = await db.getAll('summaries')
  return all.filter(
    (s: DailySummary) =>
      s.venue === venue &&
      s.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)
  )
}

export async function getUpload(id: string): Promise<UploadRecord | undefined> {
  const db = await getDB()
  return db.get('uploads', id)
}

export async function getUploads(): Promise<UploadRecord[]> {
  const db = await getDB()
  return db.getAll('uploads')
}

export async function deleteUploadData(
  venue: Venue,
  year: number,
  month: number
) {
  const db = await getDB()
  const uploadId = `${venue}_${year}_${month}`
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`

  const products = await db.getAll('products')
  const ptx = db.transaction('products', 'readwrite')
  for (const p of products) {
    if (p.venue === venue && p.date.startsWith(monthPrefix)) {
      await ptx.store.delete(p.id)
    }
  }
  await ptx.done

  const summaries = await db.getAll('summaries')
  const stx = db.transaction('summaries', 'readwrite')
  for (const s of summaries) {
    if (s.venue === venue && s.date.startsWith(monthPrefix)) {
      await stx.store.delete(s.id)
    }
  }
  await stx.done

  await db.delete('uploads', uploadId)
}
