# ShipHero SKU Priority Analyzer

A web application that analyzes ShipHero pending shipments reports to identify which SKUs, when stocked, would unlock the most orders for fulfillment.

## Features

- **CSV Upload**: Upload ShipHero pending shipments and inventory reports
- **Smart Filtering**: Filter by order status, exclude allocated/toted orders
- **Dual Analysis Views**:
  - **Unconstrained**: Shows SKU demand regardless of inventory
  - **Inventory Constrained**: Shows which SKUs are blocking orders due to insufficient stock
- **Visual Dashboard**: Charts showing top SKUs and priority distribution
- **Priority Tiers**: Critical (>10 orders), High (5-10), Medium (2-4), Low (1)
- **Export**: CSV export and print-friendly views
- **History Tracking**: Save and compare past analyses (requires Supabase)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Database**: Supabase PostgreSQL (optional)
- **Testing**: Vitest + Playwright
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd pending_shipments_app
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp env.example .env.local
```

4. (Optional) Configure Supabase for data persistence:
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `supabase/schema.sql`
   - Add your Supabase URL and anon key to `.env.local`

5. (Optional) Set a password for team access:
   - Add `APP_PASSWORD=your-password` to `.env.local`

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Testing

```bash
# Unit & Integration tests
npm test

# E2E tests
npm run test:e2e
```

### Build

```bash
npm run build
```

## Usage

1. **Upload Pending Shipments Report**
   - Export "Pending Shipments" report from ShipHero
   - Upload the CSV file

2. **Upload Inventory Report** (Optional)
   - Export "Item Locations" report from ShipHero
   - Upload to enable inventory-constrained analysis

3. **Configure Filters**
   - Select which statuses to include
   - Choose whether to exclude orders with allocated locations or totes

4. **Run Analysis**
   - Click "Run Analysis" to process
   - View results in the dashboard
   - Export to CSV or print

## CSV Format

### Pending Shipments
Required columns:
- Order Number
- SKU
- Quantity
- Status
- Tote
- Allocated in locations

### Inventory (Item Locations)
Required columns:
- Sku
- Units
- Sellable

## Deployment to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `APP_PASSWORD`
4. Deploy!

## License

MIT
