/**
 * Temporary responsive screenshot helper for mobile/tablet QA.
 * Usage: node scripts/responsive-screenshots.mjs [phase]
 * Requires: npx playwright install chromium
 */
import { chromium } from "playwright"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const outDir = path.join(root, ".screenshots")
const baseUrl = process.env.SCREENSHOT_BASE_URL || "http://localhost:3000"
const phase = process.argv[2] || "all"

const viewports = [
  { name: "phone-414", width: 414, height: 896 },
  { name: "tablet-portrait-768", width: 768, height: 1024 },
  { name: "tablet-landscape-1024", width: 1024, height: 768 },
]

const routesByPhase = {
  phase0: [
    "/",
    "/login",
    "/hundepension",
    "/portal",
  ],
  phase1: [
    "/",
    "/hundepension",
    "/katzenbetreuung",
    "/kundenstimmen",
    "/agb",
    "/impressum",
    "/datenschutz",
    "/login",
    "/login/forgot-password",
    "/rechtliches",
  ],
  phase2: [
    "/portal",
    "/portal/pets",
    "/portal/profile",
    "/portal/documents",
    "/portal/prices",
    "/portal/bookings/new",
  ],
  phase3: [
    "/admin/dashboard",
    "/admin/customers",
    "/admin/leads",
    "/admin/bookings",
    "/admin/prices",
    "/admin/cms",
  ],
}

function slugify(route) {
  return route.replace(/^\//, "").replace(/\//g, "_") || "home"
}

async function main() {
  const routes =
    phase === "all"
      ? [...new Set(Object.values(routesByPhase).flat())]
      : routesByPhase[phase] || routesByPhase.phase0

  await mkdir(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ ignoreHTTPSErrors: true })

  for (const route of routes) {
    for (const vp of viewports) {
      const page = await context.newPage()
      await page.setViewportSize({ width: vp.width, height: vp.height })
      const url = `${baseUrl}${route}`
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 60000 })
        await page.waitForTimeout(800)
        const file = path.join(
          outDir,
          `${phase === "all" ? "all" : phase}__${slugify(route)}__${vp.name}.png`
        )
        await page.screenshot({ path: file, fullPage: true })
        console.log(`OK ${vp.name} ${route}`)
      } catch (err) {
        console.error(`FAIL ${vp.name} ${route}:`, err.message)
      } finally {
        await page.close()
      }
    }
  }

  await browser.close()
  console.log(`Screenshots saved to ${outDir}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
