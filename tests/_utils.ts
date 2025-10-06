// tests/_utils.ts
// Appwrite REST helper utilities used by Playwright tests.
const APPWRITE_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1';
const APPWRITE_PROJECT = process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE = process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;
const APPWRITE_KEY = process.env.VITE_APPWRITE_API_KEY || process.env.APPWRITE_API_KEY;

export async function createOrUpdateQueueDoc(venueId: string, queueData: any) {
  if (!APPWRITE_KEY || !APPWRITE_PROJECT || !APPWRITE_DATABASE) return null;
  const listUrl = `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE}/collections/queues/documents`;
  const listRes = await fetch(listUrl, { headers: { 'X-Appwrite-Project': APPWRITE_PROJECT, 'X-Appwrite-Key': APPWRITE_KEY } });
  if (!listRes.ok) throw new Error(`Failed to list queues: ${await listRes.text()}`);
  const listJson = await listRes.json();
  const found = (listJson.documents || []).find((d: any) => d.venueId === venueId);
  if (found) {
    const updateUrl = `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE}/collections/queues/documents/${found.$id}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': APPWRITE_PROJECT, 'X-Appwrite-Key': APPWRITE_KEY },
      body: JSON.stringify({ venueId, queue: JSON.stringify(queueData) }),
    });
    if (!updateRes.ok) throw new Error(`Failed to update queue: ${await updateRes.text()}`);
    return (await updateRes.json()).$id;
  }
  const createUrl = `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE}/collections/queues/documents`;
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': APPWRITE_PROJECT, 'X-Appwrite-Key': APPWRITE_KEY },
    body: JSON.stringify({ venueId, queue: JSON.stringify(queueData) }),
  });
  if (!createRes.ok) throw new Error(`Failed to create queue: ${await createRes.text()}`);
  return (await createRes.json()).$id;
}

export async function deleteQueueDocById(docId: string) {
  if (!APPWRITE_KEY || !APPWRITE_PROJECT || !APPWRITE_DATABASE || !docId) return;
  const url = `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE}/collections/queues/documents/${docId}`;
  await fetch(url, { method: 'DELETE', headers: { 'X-Appwrite-Project': APPWRITE_PROJECT, 'X-Appwrite-Key': APPWRITE_KEY } }).catch(() => {});
}

export const hasAppwriteKey = !!APPWRITE_KEY && !!APPWRITE_PROJECT && !!APPWRITE_DATABASE;
