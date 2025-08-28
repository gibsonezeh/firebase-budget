import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Calculator, DollarSign } from "lucide-react";

// ---- Default unit prices (USD) ---- 
// Sources: Firebase & Google Cloud official pricing pages (Aug 2025)
// You can tweak any price below if your region or tier differs.
const DEFAULT_PRICES = {
  // Firestore (per 100k ops)
  firestoreReadPer100k: 0.03, 
  firestoreWritePer100k: 0.09, 
  firestoreDeletePer100k: 0.01, 
  firestoreStoragePerGiB: 0.026,
  // per GiB-month (stored) firestoreEgressPerGiB: 0.12,

// Realtime Database 
  rtdbStoragePerGB: 5.0,
  // per GB-month
  rtdbEgressPerGB: 1.0,

// Cloud Storage (Firebase Storage legacy appspot bucket) 
  storageStoredPerGB: 0.026, 
  storageDownloadPerGB: 0.12, 
  // (Ignoring operation costs by default for simplicity)

// Cloud Functions (2nd gen ballpark) 
  functionsInvocationsPerMillion: 0.40, 
  // per 1M invocations beyond free tier
  functionsEgressPerGB: 0.12, 
  // Compute: vCPU-second & GB-second pricing vary by gen; allow a blended per-GBsec & per-vCPUsec entry
  functionsGBSecond: 0.0000025, 
  functionsVCPUSecond: 0.000024,

// Hosting
  hostingStoragePerGB: 0.026,
  hostingTransferPerGB: 0.15,

// Authentication (SMS) — country specific; make editable 
  authSmsPerVerification: 0.06,
  };

const Section = ({ title, children, open, setOpen }: any) => ( 
  <Card className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur rounded-2xl shadow-sm"> 
  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
  <h3 className="text-lg font-semibold">{title}</h3>
  <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
{open ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
  </Button>
  </div> 
{open && <CardContent className="p-4">{children}</CardContent>} 
  </Card>
  );

function NumberInput({ label, value, onChange, hint, step = 1, min = 0 }: any) {
  return (
    <label className="grid gap-1"> 
    <span className="text-sm text-zinc-600 dark:text-zinc-300">{label}</span>
    <input 
    type="number" 
      className="w-full rounded-xl border p-2 bg-white/80 dark:bg-zinc-800/80"
        value={value}
          step={step}
            min={min}
              onChange={(e) => onChange(Number(e.target.value))} 
                /> 
              {hint && <span className="text-xs text-zinc-500">
              {hint}
                </span>}
                </label>
                ); 
}

export default function FirebaseBudgetCalculator() { 
  const [budget, setBudget] = useState(100); 
  const [prices, setPrices] = useState(DEFAULT_PRICES);

// --- Usage inputs (per month) --- 
const [firestore, setFirestore] = useState({
  reads: 2_000_000,
  writes: 1_000_000, deletes: 0,
  storageGiB: 10, 
  egressGiB: 5,
});

const [rtdb, setRtdb] = useState({ 
  storageGB: 0,
  egressGB: 0,
});

const [storage, setStorage] = useState({ 
  storedGB: 50, 
  downloadGB: 20,
});

const [functions, setFunctions] = useState({
  invocations: 5_000_000,
  egressGB: 10,
  gbSeconds: 100_000,
  // memory time consumed
  vcpuSeconds: 50_000, 
  // CPU time consumed 
  });

const [hosting, setHosting] = useState({ 
  storedGB: 10, 
  transferGB: 50,
});

const [auth, setAuth] = useState({
  smsVerifications: 0,
});

// ---- Cost calculations ---- 
  const cost = useMemo(() => { 
    const fsReads = (firestore.reads / 100_000) * prices.firestoreReadPer100k;
    const fsWrites = (firestore.writes / 100_000) * prices.firestoreWritePer100k; 
    const fsDeletes = (firestore.deletes / 100_000) * prices.firestoreDeletePer100k; 
    const fsStorage = firestore.storageGiB * prices.firestoreStoragePerGiB;
    const fsEgress = firestore.egressGiB * prices.firestoreEgressPerGiB; 
    const firestoreTotal = fsReads + fsWrites + fsDeletes + fsStorage + fsEgress;

const rtdbStorage = rtdb.storageGB * prices.rtdbStoragePerGB;
const rtdbEgress = rtdb.egressGB * prices.rtdbEgressPerGB;
const rtdbTotal = rtdbStorage + rtdbEgress;

const stStored = storage.storedGB * prices.storageStoredPerGB;
const stDl = storage.downloadGB * prices.storageDownloadPerGB;
const storageTotal = stStored + stDl;

const fnInvoc = (functions.invocations / 1_000_000) * prices.functionsInvocationsPerMillion;
const fnGbSec = functions.gbSeconds * prices.functionsGBSecond;
const fnCpuSec = functions.vcpuSeconds * prices.functionsVCPUSecond;
const fnEgress = functions.egressGB * prices.functionsEgressPerGB;
const functionsTotal = fnInvoc + fnGbSec + fnCpuSec + fnEgress;

const hostStored = hosting.storedGB * prices.hostingStoragePerGB;
const hostTransfer = hosting.transferGB * prices.hostingTransferPerGB;
const hostingTotal = hostStored + hostTransfer;

const authTotal = auth.smsVerifications * prices.authSmsPerVerification;

const grand = firestoreTotal + rtdbTotal + storageTotal + functionsTotal + hostingTotal + authTotal;

return {
  byProduct: {
    firestore: firestoreTotal,
    realtimeDb: rtdbTotal,
    storage: storageTotal,
    functions: functionsTotal,
    hosting: hostingTotal,
    auth: authTotal,
  },
  total: grand,
};

}, [firestore, rtdb, storage, functions, hosting, auth, prices]);

const monthsCovered = budget > 0 && cost.total > 0 ? budget / cost.total : Infinity;

return (
  <div className="min-h-screen w-full p-6 md:p-10 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
  <div className="max-w-5xl mx-auto grid gap-6">
  <header className="flex items-start justify-between gap-4">
  <div> 
  <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"> 
  <Calculator className="w-7 h-7"/> Firebase Cost Estimator
  </h1>
  <p className="text-zinc-600 dark:text-zinc-300 text-sm md:text-base"> 
  Enter your monthly usage to estimate costs and see how long your budget will last. </p>
  </div> 
  <div className="flex items-end gap-3">
  <NumberInput
label="Budget (USD)"
value={budget}
onChange={setBudget}
step={1}
/>
  <div className="rounded-xl border p-3 min-w-[180px] grid">
  <div className="text-xs text-zinc-500">Est. Monthly Cost</div> 
  <div className="text-2xl font-semibold flex items-center gap-1"> 
  <DollarSign className="w-5 h-5"/>{cost.total.toFixed(2)} </div>
  <div className="text-xs text-zinc-500">Months Covered by Budget</div> 
  <div className="text-xl font-semibold">{Number.isFinite(monthsCovered) ? monthsCovered.toFixed(1) : "∞"}
</div> 
  </div> 
  </div> 
  </header>

{/* Prices override */}
    <Card className="rounded-2xl">
      <CardContent className="p-4 md:p-5 grid gap-4">
        <h2 className="text-lg font-semibold">Unit Prices (override if needed)</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Firestore prices */}
          <NumberInput label="Firestore Read per 100k" value={prices.firestoreReadPer100k} step={0.001} onChange={(v: number)=>setPrices(p=>({...p, firestoreReadPer100k:v}))}/>
          <NumberInput label="Firestore Write per 100k" value={prices.firestoreWritePer100k} step={0.001} onChange={(v: number)=>setPrices(p=>({...p, firestoreWritePer100k:v}))}/>
          <NumberInput label="Firestore Delete per 100k" value={prices.firestoreDeletePer100k} step={0.001} onChange={(v: number)=>setPrices(p=>({...p, firestoreDeletePer100k:v}))}/>
          <NumberInput label="Firestore Storage $/GiB" value={prices.firestoreStoragePerGiB} step={0.001} onChange={(v: number)=>setPrices(p=>({...p, firestoreStoragePerGiB:v}))}/>
          <NumberInput label="Firestore Egress $/GiB" value={prices.firestoreEgressPerGiB} step={0.01} onChange={(v: number)=>setPrices(p=>({...p, firestoreEgressPerGiB:v}))}/>

          {/* RTDB */}
          <NumberInput label="Realtime DB Storage $/GB" value={prices.rtdbStoragePerGB} step={0.1} onChange={(v: number)=>setPrices(p=>({...p, rtdbStoragePerGB:v}))}/>
          <NumberInput label="Realtime DB Egress $/GB" value={prices.rtdbEgressPerGB} step={0.1} onChange={(v: number)=>setPrices(p=>({...p, rtdbEgressPerGB:v}))}/>

          {/* Storage */}
          <NumberInput label="Cloud Storage Stored $/GB" value={prices.storageStoredPerGB} step={0.001} onChange={(v: number)=>setPrices(p=>({...p, storageStoredPerGB:v}))}/>
          <NumberInput label="Cloud Storage Download $/GB" value={prices.storageDownloadPerGB} step={0.01} onChange={(v: number)=>setPrices(p=>({...p, storageDownloadPerGB:v}))}/>

          {/* Functions */}
          <NumberInput label="Functions Invocations $/1M" value={prices.functionsInvocationsPerMillion} step={0.01} onChange={(v: number)=>setPrices(p=>({...p, functionsInvocationsPerMillion:v}))}/>
          <NumberInput label="Functions GB-second $" value={prices.functionsGBSecond} step={0.0000001} onChange={(v: number)=>setPrices(p=>({...p, functionsGBSecond:v}))}/>
          <NumberInput label="Functions vCPU-second $" value={prices.functionsVCPUSecond} step={0.000001} onChange={(v: number)=>setPrices(p=>({...p, functionsVCPUSecond:v}))}/>
          <NumberInput label="Functions Egress $/GB" value={prices.functionsEgressPerGB} step={0.01} onChange={(v: number)=>setPrices(p=>({...p, functionsEgressPerGB:v}))}/>

          {/* Hosting */}
          <NumberInput label="Hosting Storage $/GB" value={prices.hostingStoragePerGB} step={0.001} onChange={(v: number)=>setPrices(p=>({...p, hostingStoragePerGB:v}))}/>
          <NumberInput label="Hosting Transfer $/GB" value={prices.hostingTransferPerGB} step={0.01} onChange={(v: number)=>setPrices(p=>({...p, hostingTransferPerGB:v}))}/>

          {/* Auth */}
          <NumberInput label="Auth SMS $/verification" value={prices.authSmsPerVerification} step={0.01} onChange={(v: number)=>setPrices(p=>({...p, authSmsPerVerification:v}))}/>
        </div>
      </CardContent>
    </Card>

    {/* Usage sections */}
    <div className="grid gap-4">
      {/* Firestore */}
      <Section title="Cloud Firestore" open={true} setOpen={()=>{}}>
        <div className="grid md:grid-cols-3 gap-4">
          <NumberInput label="Reads / month" value={firestore.reads} onChange={(v:number)=>setFirestore(s=>({...s, reads:v}))}/>
          <NumberInput label="Writes / month" value={firestore.writes} onChange={(v:number)=>setFirestore(s=>({...s, writes:v}))}/>
          <NumberInput label="Deletes / month" value={firestore.deletes} onChange={(v:number)=>setFirestore(s=>({...s, deletes:v}))}/>
          <NumberInput label="Stored (GiB)" value={firestore.storageGiB} step={0.1} onChange={(v:number)=>setFirestore(s=>({...s, storageGiB:v}))}/>
          <NumberInput label="Egress (GiB)" value={firestore.egressGiB} step={0.1} onChange={(v:number)=>setFirestore(s=>({...s, egressGiB:v}))}/>
        </div>
      </Section>

      {/* RTDB */}
      <Section title="Realtime Database" open={true} setOpen={()=>{}}>
        <div className="grid md:grid-cols-3 gap-4">
          <NumberInput label="Stored (GB)" value={rtdb.storageGB} step={0.1} onChange={(v:number)=>setRtdb(s=>({...s, storageGB:v}))}/>
          <NumberInput label="Egress (GB)" value={rtdb.egressGB} step={0.1} onChange={(v:number)=>setRtdb(s=>({...s, egressGB:v}))}/>
        </div>
      </Section>

      {/* Storage */}
      <Section title="Cloud Storage (files)" open={true} setOpen={()=>{}}>
        <div className="grid md:grid-cols-3 gap-4">
          <NumberInput label="Stored (GB)" value={storage.storedGB} step={0.1} onChange={(v:number)=>setStorage(s=>({...s, storedGB:v}))}/>
          <NumberInput label="Downloaded (GB)" value={storage.downloadGB} step={0.1} onChange={(v:number)=>setStorage(s=>({...s, downloadGB:v}))}/>
        </div>
      </Section>

      {/* Functions */}
      <Section title="Cloud Functions" open={true} setOpen={()=>{}}>
        <div className="grid md:grid-cols-4 gap-4">
          <NumberInput label="Invocations / month" value={functions.invocations} onChange={(v:number)=>setFunctions(s=>({...s, invocations:v}))}/>
          <NumberInput label="GB-seconds / month" value={functions.gbSeconds} step={1} onChange={(v:number)=>setFunctions(s=>({...s, gbSeconds:v}))}/>
          <NumberInput label="vCPU-seconds / month" value={functions.vcpuSeconds} step={1} onChange={(v:number)=>setFunctions(s=>({...s, vcpuSeconds:v}))}/>
          <NumberInput label="Egress (GB)" value={functions.egressGB} step={0.1} onChange={(v:number)=>setFunctions(s=>({...s, egressGB:v}))}/>
        </div>
      </Section>

      {/* Hosting */}
      <Section title="Hosting" open={true} setOpen={()=>{}}>
        <div className="grid md:grid-cols-3 gap-4">
          <NumberInput label="Stored (GB)" value={hosting.storedGB} step={0.1} onChange={(v:number)=>setHosting(s=>({...s, storedGB:v}))}/>
          <NumberInput label="Transfer (GB)" value={hosting.transferGB} step={0.1} onChange={(v:number)=>setHosting(s=>({...s, transferGB:v}))}/>
        </div>
      </Section>

      {/* Auth */}
      <Section title="Authentication (SMS)" open={true} setOpen={()=>{}}>
        <div className="grid md:grid-cols-3 gap-4">
          <NumberInput label="SMS verifications / month" value={auth.smsVerifications} onChange={(v:number)=>setAuth(s=>({...s, smsVerifications:v}))}/>
        </div>
        <p className="text-xs text-zinc-500 mt-2">SMS pricing varies by country. Edit the price in "Unit Prices" above to match your target market.</p>
      </Section>
    </div>

    {/* Breakdown */}
    <Card className="rounded-2xl">
      <CardContent className="p-4 md:p-6 grid gap-3">
        <h2 className="text-lg font-semibold mb-2">Monthly Cost Breakdown</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(cost.byProduct).map(([k,v])=> (
            <div key={k} className="rounded-xl border p-3 flex items-center justify-between">
              <span className="capitalize text-sm text-zinc-600">{k.replace(/([A-Z])/g,' $1')}</span>
              <span className="font-semibold">${v.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border flex items-center justify-between">
          <div className="text-sm text-zinc-600">Total per month</div>
          <div className="text-xl font-semibold flex items-center gap-1"><DollarSign className="w-5 h-5"/>{cost.total.toFixed(2)}</div>
        </div>
      </CardContent>
    </Card>

    <footer className="text-xs text-zinc-500 text-center mt-4">
      Estimates exclude taxes and region-specific surcharges. Free-tier allowances are NOT auto-deducted here — enter your net billable usage.
    </footer>
  </div>
</div>

); }

