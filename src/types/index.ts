export interface ProductRecord {
  date: string           // ISO: '2024-09-03'
  venue: 'study' | 'outpost'
  item: string
  size: string | null
  category: string
  quantity: number
  net: number
  gross: number
}

export interface TransactionRecord {
  type: string
  count: number
  amount: number
  tip: number
  total: number
}

export interface DaypartRecord {
  name: string    // e.g. 'BREAKFAST', 'LUNCH', 'DINNER/LATE NIGHT'
  qty: number
  guests: number
  net: number
}

export interface SectionRecord {
  name: string    // e.g. 'COFFEE', 'TEA & HOT BEVERAGES', 'BEER BOTTLES/CANS'
  qty: number
  net: number
  gross: number
}

export interface DailySummary {
  date: string
  venue: 'study' | 'outpost'
  grossSales: number
  autoPricingDiscounts: number
  discounts: number
  netSales: number
  taxes: number
  tips: number
  grossReceipts: number
  totalTransactions: number
  transactions: TransactionRecord[]
  dayparts?: DaypartRecord[]
  sections?: SectionRecord[]
  guestCount?: number
}

export interface UploadRecord {
  id: string             // `${venue}_${year}_${month}`
  venue: 'study' | 'outpost'
  year: number
  month: number
  uploadedAt: string
  fileTypes: Array<'products' | 'summary'>
  operatingDayCount: number
  dataQualityFlags: DataQualityFlag[]
}

export interface DataQualityFlag {
  type: 'incomplete_month' | 'net_gross_divergence' | 'gift_card_present' | 'event_day_detected'
  message: string
  severity: 'info' | 'warning'
}

export type Venue = 'study' | 'outpost'
export type FileType = 'products' | 'summary'

export interface DetectedFile {
  venue: Venue
  type: FileType
  month: number
  year: number
  file: File
}
