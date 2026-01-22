import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the dashboard header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('ShipHero Analyzer')
  })

  test('should show the ready to analyze message initially', async ({ page }) => {
    await expect(page.locator('text=Ready to Analyze')).toBeVisible()
  })

  test('should have file upload areas', async ({ page }) => {
    await expect(page.locator('text=Pending Shipments')).toBeVisible()
    await expect(page.locator('text=Inventory Report')).toBeVisible()
  })

  test('should have a disabled Run Analysis button when no data is uploaded', async ({ page }) => {
    const runButton = page.locator('button:has-text("Run Analysis")')
    await expect(runButton).toBeDisabled()
  })

  test('should navigate to history page', async ({ page }) => {
    const historyLink = page.locator('a:has-text("History")')
    await historyLink.click()
    await expect(page).toHaveURL('/history')
  })
})

test.describe('File Upload Flow', () => {
  test('should accept CSV file upload for pending shipments', async ({ page }) => {
    await page.goto('/')

    // Create a test CSV content
    const csvContent = `"Order Number",SKU,"Product Name",Quantity,Status,"Ready To Ship",Tote,"Allocated in locations"
TEST001,sku-1,Test Product 1,2,Wholesale Pick,Yes,,
TEST001,sku-2,Test Product 2,1,Wholesale Pick,Yes,,
TEST002,sku-3,Test Product 3,1,TikTok,Yes,,`

    // Create a file input and upload
    const fileInput = page.locator('input[type="file"]').first()
    
    // Set the file
    await fileInput.setInputFiles({
      name: 'test-pending.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    // Wait for processing
    await page.waitForTimeout(1000)

    // Check that the data loaded message appears
    await expect(page.locator('text=Data Loaded')).toBeVisible()
    
    // Run Analysis button should now be enabled
    const runButton = page.locator('button:has-text("Run Analysis")')
    await expect(runButton).toBeEnabled()
  })

  test('should show status filter after uploading pending shipments', async ({ page }) => {
    await page.goto('/')

    const csvContent = `"Order Number",SKU,"Product Name",Quantity,Status,"Ready To Ship",Tote,"Allocated in locations"
TEST001,sku-1,Test Product 1,2,Wholesale Pick,Yes,,
TEST002,sku-2,Test Product 2,1,TikTok,Yes,,`

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await page.waitForTimeout(1000)

    // Status filter should be visible
    await expect(page.locator('text=Filter by Status')).toBeVisible()
  })
})

test.describe('Analysis Flow', () => {
  test('should run analysis and show results', async ({ page }) => {
    await page.goto('/')

    const csvContent = `"Order Number",SKU,"Product Name",Quantity,Status,"Ready To Ship",Tote,"Allocated in locations"
TEST001,sku-1,Test Product 1,2,Wholesale Pick,Yes,,
TEST001,sku-2,Test Product 2,1,Wholesale Pick,Yes,,
TEST002,sku-1,Test Product 1,1,TikTok,Yes,,
TEST003,sku-3,Test Product 3,3,Batch,Yes,,`

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await page.waitForTimeout(1000)

    // Click Run Analysis
    const runButton = page.locator('button:has-text("Run Analysis")')
    await runButton.click()

    await page.waitForTimeout(500)

    // Should show analysis results
    await expect(page.locator('text=Analysis Results')).toBeVisible()
    
    // Should show summary cards
    await expect(page.locator('text=Total Orders')).toBeVisible()
    await expect(page.locator('text=Ready to Fulfill')).toBeVisible()
  })

  test('should filter orders by status', async ({ page }) => {
    await page.goto('/')

    const csvContent = `"Order Number",SKU,"Product Name",Quantity,Status,"Ready To Ship",Tote,"Allocated in locations"
TEST001,sku-1,Test Product 1,2,Wholesale Pick,Yes,,
TEST002,sku-2,Test Product 2,1,TikTok,Yes,,`

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await page.waitForTimeout(1000)

    // Open status filter dropdown
    const filterButton = page.locator('button:has-text("All Statuses")')
    await filterButton.click()

    // Select only Wholesale Pick
    await page.locator('text=Wholesale Pick').click()

    // Close dropdown
    await page.keyboard.press('Escape')

    // Run analysis
    await page.locator('button:has-text("Run Analysis")').click()

    await page.waitForTimeout(500)

    // Results should be filtered
    await expect(page.locator('text=Analysis Results')).toBeVisible()
  })
})

test.describe('Export Functionality', () => {
  test('should show export buttons after analysis', async ({ page }) => {
    await page.goto('/')

    const csvContent = `"Order Number",SKU,"Product Name",Quantity,Status,"Ready To Ship",Tote,"Allocated in locations"
TEST001,sku-1,Test Product 1,2,Test Status,Yes,,`

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await page.waitForTimeout(1000)

    await page.locator('button:has-text("Run Analysis")').click()
    await page.waitForTimeout(500)

    // Export buttons should be visible
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible()
    await expect(page.locator('button:has-text("Print")')).toBeVisible()
  })
})
