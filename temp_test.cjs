const http = require("http");

function post(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: "127.0.0.1",
      port: 3000,
      path: "/api/drafts",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, (res) => {
      let buf = "";
      res.on("data", c => buf += c);
      res.on("end", () => {
        console.log(`  -> Status ${res.statusCode}`);
        resolve({ status: res.statusCode, json: () => JSON.parse(buf) });
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log("Step 1: Repurpose request...");
  const r1 = await post({
    action: "repurpose",
    draftId: "cmsmx8bz7000104l8ys1b49iv",
    toPlatform: "website",
  });
  if (r1.status !== 200) { console.log("Step 1 FAILED"); return; }
  const aiData = await r1.json();
  console.log("  title:", aiData.title?.substring(0, 60));
  console.log("  body length:", aiData.body?.length);
  console.log("  hook:", aiData.hook?.substring(0, 60));

  console.log("\nStep 2: Save new draft...");
  const r2 = await post({
    ideaId: "cmsmx6zsl000004l8bcxpezt5",
    platform: "website",
    pillar: "lifestyle",
    title: aiData.title,
    hook: aiData.hook,
    body: aiData.body,
    outline: aiData.body?.slice(0, 100),
    styleScore: aiData.styleScore,
    styleDeltas: aiData.styleDeltas,
  });
  if (r2.status !== 200) { console.log("Step 2 FAILED - status:", r2.status); return; }
  const newDraft = await r2.json();
  console.log("  id:", newDraft.id);
  console.log("  platform:", newDraft.platform);
  console.log("  title:", newDraft.title?.substring(0, 60));
  console.log("  status:", newDraft.status);
  console.log("  originalityRisk:", newDraft.originalityRisk);
  console.log("  isStyleReference:", newDraft.isStyleReference);
  console.log("  version:", newDraft.version);
  console.log("  keys:", Object.keys(newDraft).sort().join(", "));
  
  // Verify the drafts list now includes this new draft
  console.log("\nStep 3: Fetch drafts list...");
  const draftsList = await new Promise((resolve, reject) => {
    http.get("http://127.0.0.1:3000/api/drafts", res => {
      let buf = "";
      res.on("data", c => buf += c);
      res.on("end", () => resolve(JSON.parse(buf)));
    }).on("error", reject);
  });
  const found = draftsList.find(d => d.id === newDraft.id);
  console.log("  Total drafts:", draftsList.length);
  console.log("  New draft found:", !!found);
  if (found) {
    console.log("  Found platform:", found.platform);
    console.log("  Found title:", found.title?.substring(0, 60));
  }
}

main().catch(e => console.error(e));
