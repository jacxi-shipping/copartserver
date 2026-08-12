'use client'

import { useState } from 'react'
import { Check, Clipboard, Code2, FileDown, Search, Upload, Warehouse } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="relative overflow-hidden rounded-md border bg-zinc-950 p-3 pr-12 font-mono text-xs leading-relaxed text-zinc-100">
      <pre className="overflow-x-auto whitespace-pre-wrap">{children}</pre>
      <Button variant="ghost" size="icon" className="absolute right-1 top-1 size-8 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={copy} aria-label="Copy code example">
        {copied ? <Check className="size-3.5 text-emerald-400" /> : <Clipboard className="size-3.5" />}
      </Button>
    </div>
  )
}

function Endpoint({ method, path, description, children }: { method: 'GET' | 'POST'; path: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="border-b py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={method === 'GET' ? 'bg-sky-600 text-white' : 'bg-emerald-600 text-white'}>{method}</Badge>
        <code className="text-sm font-semibold">{path}</code>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}

export function ApiDocsTab() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">API Documentation</h2>
        <p className="mt-1 text-sm text-muted-foreground">Integrate auction events, lots, imports, analytics, and reports into another application.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Code2 className="size-4 text-emerald-500" />Getting Started</CardTitle>
          <CardDescription>All active endpoints are served by this Next.js application and return JSON unless noted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Set <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">BASE_URL</code> to your deployed application origin, for example <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">https://auctions.example.com</code>.</p>
          <CodeBlock>{`curl "$BASE_URL/api/stats"`}</CodeBlock>
          <p>Authentication is not configured in this deployment. Put the app behind your gateway or add an identity provider before exposing write endpoints publicly.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Warehouse className="size-4 text-emerald-500" />Auction Events</CardTitle><CardDescription>Parent auction events are grouped by yard, sale date, time, and timezone.</CardDescription></CardHeader>
          <CardContent>
            <Endpoint method="GET" path="/api/auction-dashboard" description="List sale events. Supports page, pageSize, q, saleDate, and state." />
            <Endpoint method="GET" path="/api/auction-dashboard/{auctionId}" description="Get a parent auction and its lots ordered by lane/grid then lot number." />
            <Endpoint method="GET" path="/api/auctions/yard/{yardNumber}/lane/{lane}" description="Return every current/future sale event at an exact yard and lane, each with all full lot records. Add saleDate=YYYY-MM-DD to select one sale or includePast=true for history." />
            <CodeBlock>{`curl "$BASE_URL/api/auctions/yard/1/lane/SG010"
# Add ?saleDate=2026-08-14 to select one event.`}</CodeBlock>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Search className="size-4 text-sky-500" />Lot Search</CardTitle><CardDescription>Search individual lots using database-side filters and pagination.</CardDescription></CardHeader>
          <CardContent>
            <Endpoint method="GET" path="/api/search?q=4runner&all=true" description="Search all current/future matching lots and return full JSON records. Results are capped at 5,000; pagination metadata reports truncation." />
            <CodeBlock>{`curl "$BASE_URL/api/search?q=4runner&all=true"
# Returns only lots dated today or later by default.
# Add &includeUnscheduled=true to include lots without a sale date.`}</CodeBlock>
            <Endpoint method="POST" path="/api/search" description="Use advanced filters such as makes, states, yearMin/yearMax, priceMin/priceMax, and odometer ranges.">
              <CodeBlock>{`{
  "query": "4runner",
  "states": ["CA", "NV"],
  "yearMin": 2018,
  "priceMax": 30000,
  "page": 1,
  "pageSize": 25
}`}</CodeBlock>
            </Endpoint>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Upload className="size-4 text-amber-500" />CSV Import Workflow</CardTitle><CardDescription>Uploads are asynchronous: upload the file, create a job, then poll the job until completed or failed.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Endpoint method="POST" path="/api/import/upload" description="Multipart upload: send form-data with a CSV file. Returns blob URL and storage key." />
          <Endpoint method="POST" path="/api/import" description="Create a queued import with filename, fileSize, storageUrl, and storageKey." />
          <Endpoint method="GET" path="/api/import/{jobId}" description="Poll job status and row counters. A deployed import worker must run npm run import:worker." />
          <Endpoint method="POST" path="/api/import/{jobId}/retry" description="Re-queue a failed job using its original uploaded CSV." />
          <Endpoint method="POST" path="/api/import/{jobId}/cancel" description="Cancel a queued job before a worker claims it." />
          <CodeBlock>{`const upload = await fetch('/api/import/upload', {
  method: 'POST', body: new FormData()
})

const job = await fetch('/api/import', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ filename, fileSize, storageUrl, storageKey })
})`}</CodeBlock>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileDown className="size-4 text-violet-500" />Exports & Reports</CardTitle></CardHeader>
          <CardContent>
            <Endpoint method="GET" path="/api/export?auctionId={auctionId}" description="Download a lane-ordered auction run list as CSV." />
            <Endpoint method="GET" path="/api/compare/report?ids=12,34&format=csv" description="Export two or three compared lots with parent auction context. Use format=json for JSON." />
            <Endpoint method="GET" path="/api/lots/{lotNumber}/enrichment" description="NHTSA VIN decoding, recall summary, and local title-risk signals." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Code2 className="size-4 text-teal-500" />Analytics & Supporting APIs</CardTitle></CardHeader>
          <CardContent>
            <Endpoint method="GET" path="/api/stats" description="Platform totals and import timestamps." />
            <Endpoint method="GET" path="/api/analytics/location-analysis" description="State, city, and yard performance metrics." />
            <Endpoint method="GET" path="/api/search/facets" description="Filter values and counts for search UIs." />
            <Endpoint method="GET" path="/api/lots/{lotNumber}/images" description="Full Copart image gallery URLs for a lot." />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Response Conventions</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <CodeBlock>{`{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 250,
    "totalPages": 10,
    "hasNext": true,
    "hasPrevious": false
  }
}`}</CodeBlock>
          <p>Errors use <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">success: false</code> with a stable error code and message. Consumers should handle <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">404</code>, <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">409</code>, and <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">500</code> responses.</p>
        </CardContent>
      </Card>
    </div>
  )
}
