import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const MAKES = ['TOYOTA', 'HONDA', 'FORD', 'CHEVROLET', 'NISSAN', 'BMW', 'MERCEDES-BENZ', 'AUDI', 'HYUNDAI', 'KIA', 'LEXUS', 'DODGE', 'JEEP', 'VOLKSWAGEN', 'SUBARU']
const BODY_STYLES = ['Sedan', 'SUV', 'Truck', 'Coupe', 'Van', 'Convertible', 'Hatchback', 'Wagon']
const FUEL_TYPES = ['Gasoline', 'Diesel', 'Hybrid', 'Electric']
const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT']
const DRIVES = ['FWD', 'RWD', 'AWD', '4WD']
const DAMAGES = ['Front End', 'Rear End', 'Side', 'All Over', 'Undercarriage', 'Water/Flood', 'Fire/Burn', 'Vandalism', 'Hail', 'Mechanical']
const STATES = ['CA', 'TX', 'FL', 'NY', 'PA', 'OH', 'GA', 'NC', 'MI', 'IL', 'AZ', 'WA', 'NJ', 'VA', 'CO', 'TN', 'MA', 'IN', 'MO', 'OR']
const CITIES = ['Los Angeles', 'Houston', 'Miami', 'New York', 'Philadelphia', 'Columbus', 'Atlanta', 'Charlotte', 'Detroit', 'Chicago', 'Phoenix', 'Seattle', 'Newark', 'Richmond', 'Denver', 'Nashville', 'Boston', 'Indianapolis', 'Kansas City', 'Portland']
const STATUSES = ['Pure Sale', 'Run & Drive', 'On Approval', 'Sold', 'High Bid', 'Not Assigned']
const COLORS = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown']

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min: number, max: number, dec = 0): number { const v = Math.random() * (max - min) + min; return dec > 0 ? Math.round(v * 10 ** dec) / 10 ** dec : Math.round(v) }

function getFutureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split('T')[0]
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

function makeVin(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'
  return Array.from({ length: 17 }, () => chars[randInt(0, chars.length - 1)]).join('')
}

async function main() {
  console.log('Seeding 500 lots...')
  const lots: any[] = []

  for (let i = 1; i <= 500; i++) {
    const year = randInt(2005, 2025)
    const make = rand(MAKES)
    const bodyStyle = rand(BODY_STYLES)
    const estValue = randFloat(5000, 250000)
    const highBid = estValue * (Math.random() * 0.5 + 0.2) // 20-70% of retail
    const repairCost = estValue * Math.random() * 0.3 // 0-30% of retail
    const isToday = Math.random() < 0.3
    const saleDate = isToday ? getTodayDate() : getFutureDate(randInt(1, 60))
    const stateIdx = STATES.indexOf(rand(STATES))

    lots.push({
      lotNumber: 4000000 + i,
      yardNumber: randInt(1, 200),
      yardName: `Yard ${randInt(1, 200)}`,
      saleDate,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(saleDate).getDay()],
      saleTime: `${randInt(8, 17)}:${String(randInt(0, 59)).padStart(2, '0')}`,
      timeZone: 'America/New_York',
      itemNumber: `ITM-${randInt(10000, 99999)}`,
      vehicleType: bodyStyle === 'Truck' ? 'Truck' : bodyStyle === 'SUV' ? 'SUV' : 'Passenger',
      year,
      make,
      modelGroup: `${make} ${bodyStyle}`,
      modelDetail: `${make} ${bodyStyle} ${year}`,
      bodyStyle,
      color: rand(COLORS),
      damageDescription: rand(DAMAGES),
      secondaryDamage: Math.random() > 0.5 ? rand(DAMAGES.filter(d => d !== lots[i-1]?.damageDescription)) : null,
      saleTitleState: rand(STATES),
      saleTitleType: Math.random() > 0.3 ? 'Salvage' : 'Clean',
      hasKeys: Math.random() > 0.3,
      vin: makeVin(),
      odometer: randFloat(5000, 200000),
      odometerBrand: Math.random() > 0.8 ? 'NOT ACTUAL' : null,
      estimatedRetailValue: estValue,
      repairCost,
      engine: `${randInt(2, 8)}.${randInt(0, 9)}L`,
      drive: rand(DRIVES),
      transmission: rand(TRANSMISSIONS),
      fuelType: rand(FUEL_TYPES),
      cylinders: [null, 4, 6, 8][randInt(0, 3)],
      runsDrives: Math.random() > 0.4 ? 'Yes' : 'No',
      saleStatus: rand(STATUSES),
      highBid,
      specialNote: Math.random() > 0.7 ? 'See seller notes' : null,
      locationCity: CITIES[stateIdx] || rand(CITIES),
      locationState: STATES[stateIdx] || rand(STATES),
      locationZip: String(randInt(10000, 99999)),
      locationCountry: 'US',
      currencyCode: 'USD',
      buyItNowPrice: Math.random() > 0.6 ? estValue * 0.8 : null,
      autograde: ['A', 'B', 'C', 'D', 'E'][randInt(0, 4)],
    })
  }

  // Batch insert in chunks of 50
  for (let i = 0; i < lots.length; i += 50) {
    const chunk = lots.slice(i, i + 50)
    await db.auction.createMany({ data: chunk })
    process.stdout.write(`\rInserted ${Math.min(i + 50, lots.length)}/500 lots`)
  }
  console.log('\nDone! 500 lots seeded.')

  // Create 4 sample import jobs
  await db.importJob.createMany({
    data: [
      { id: 'ij_1', filename: 'lots_jan_2026.csv', fileSize: 52_400_000, status: 'completed', startedAt: new Date('2026-01-15T10:00:00Z'), completedAt: new Date('2026-01-15T10:12:00Z'), totalRows: 125000, processedRows: 125000, insertedRows: 125000, updatedRows: 0, skippedRows: 0, failedRows: 0 },
      { id: 'ij_2', filename: 'lots_feb_2026.csv', fileSize: 98_700_000, status: 'completed', startedAt: new Date('2026-02-10T08:30:00Z'), completedAt: new Date('2026-02-10T09:05:00Z'), totalRows: 245000, processedRows: 243000, insertedRows: 200000, updatedRows: 43000, skippedRows: 2000, failedRows: 0 },
      { id: 'ij_3', filename: 'partial_upload.csv', fileSize: 15_200_000, status: 'failed', startedAt: new Date('2026-03-01T14:00:00Z'), completedAt: null, totalRows: 38000, processedRows: 15000, insertedRows: 15000, updatedRows: 0, skippedRows: 0, failedRows: 0, errorMessage: 'Connection interrupted by user' },
      { id: 'ij_4', filename: 'march_2026_update.csv', fileSize: 67_800_000, status: 'processing', startedAt: new Date(), completedAt: null, totalRows: 170000, processedRows: 85000, insertedRows: 72000, updatedRows: 13000, skippedRows: 0, failedRows: 0 },
    ],
  })
  console.log('4 import jobs seeded.')

  // Add sample notes and tags for a few lots
  const sampleLotIds = [4000001, 4000005, 4000010, 4000020, 4000050]
  for (const lotId of sampleLotIds) {
    await db.lotNote.create({
      data: { lotId, content: 'Interesting lot — check the repair estimate before bidding.' },
    })
  }
  await db.lotNote.create({ data: { lotId: 4000001, content: 'VIN decoder shows this was a fleet vehicle. Lower resale value expected.' } })

  const tagData = [
    { lotId: 4000001, tag: 'Hot Deal', color: 'rose' },
    { lotId: 4000001, tag: 'Check VIN', color: 'amber' },
    { lotId: 4000005, tag: 'Parts Only', color: 'slate' },
    { lotId: 4000010, tag: 'Hot Deal', color: 'rose' },
    { lotId: 4000020, tag: 'Good Investment', color: 'emerald' },
    { lotId: 4000050, tag: 'Needs Inspection', color: 'sky' },
  ]
  for (const td of tagData) {
    await db.lotTag.create({ data: td })
  }
  console.log('Sample notes and tags seeded.')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
