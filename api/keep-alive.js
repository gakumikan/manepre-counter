// Supabase auto-pause prevention - pings DB daily
export default async function handler(req, res) {
    const SUPABASE_URL = 'https://yfixzwuwmoiysgtqwjcl.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmaXh6d3V3bW9peXNndHF3amNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTI4NDksImV4cCI6MjA5MDk4ODg0OX0.p8SSO1bO7fvDnbtwbscqeC04x7ck8RMjpu_VpZBkYx4';

  try {
        const response = await fetch(SUPABASE_URL + '/rest/v1/entries?select=id&limit=1', {
                headers: {
                          'apikey': SUPABASE_ANON_KEY,
                          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
                }
        });
        const data = await response.json();
        res.status(200).json({ ok: true, time: new Date().toISOString(), rows: data.length });
  } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
  }
}
