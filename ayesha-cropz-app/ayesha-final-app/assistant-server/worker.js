// Optional: turns the "Ask Ayesha" assistant into a real AI chat (Claude) for customer questions.
// Runs on Cloudflare Workers (free plan is enough to start). The API key stays on the server, never in the app.

const SYSTEM = `You are the friendly assistant for Ayesha Cropz, a business in Mhasla, Raigad, Maharashtra, India.
Answer customer and client questions using ONLY the facts below. If the answer is not in the facts, say you do not have that information and give the contact details. Never invent prices, timings, delivery terms, stock, discounts or promises. Keep answers short (under 80 words) and polite. Reply in the same language the customer writes in (English, Hindi, Marathi or Hinglish).

FACTS
- Business: Ayesha Cropz, "Empowering Business Success Now". Led by Ahmed Logde, Managing Partner and Founder.
- Address: Ayesha Business Center, At Post & Tal Mhasla, Opp HP Petrol Pump, Mhasla, Dist. Raigad 402105.
- Phone and WhatsApp: +91 76665 89729. Email: info@ayeshacropz.co.in. Sales email: sales@ayeshacropz.co.in.
- Divisions: Ayesha Soda (beverage manufacturing), Chicken Hatchery (quality chicks, ethical farming practices, agricultural support across Raigad and beyond), Travel Services (flight and train tickets, hotel reservations, tour packages, documentation support), CSC Customer Service (authorized Common Service Center, digital and government e-Seva services in Mhasla and nearby).
- Ayesha Soda flavors: Blueberry Blast (sweet and tangy spark), Classic Cola (original fizzy taste), Orange Zing (citrus kick), Lime Fresh (cool and refreshing lemon-lime), Strawberry Lemon (sweet meets sour).
- Prices: 1 bottle of 300 ml is Rs 10. 1 crate of 24 bottles is normally Rs 240; offer price Rs 170 (saves Rs 70, about Rs 7.08 per bottle).
- Careers: teams in Operations & Production, Sales & Marketing, Finance & Accounts, Administration & Support, Travel & Citizen Services. People can use the Careers form or email a resume to info@ayeshacropz.co.in.
- Distributorship and bulk orders: ask them to call or email the sales team.
- Opening hours, delivery, payment methods: NOT known. Ask the customer to call or WhatsApp to confirm.`;

const ALLOWED = [
  'https://ayeshacropz.co.in',
  'https://www.ayeshacropz.co.in',
  'https://localhost',        // Android app
  'capacitor://localhost',    // iPhone app
];

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export default {
  async fetch(req, env) {
    const h = cors(req.headers.get('Origin') || '');
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    if (req.method !== 'POST') return new Response('{"error":"POST only"}', { status: 405, headers: h });

    let body;
    try { body = await req.json(); } catch { return new Response('{"error":"bad request"}', { status: 400, headers: h }); }

    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .slice(-8)
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content.slice(0, 500) }));
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return new Response('{"error":"no question"}', { status: 400, headers: h });
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 400, system: SYSTEM, messages }),
    });
    if (!r.ok) return new Response('{"error":"assistant unavailable"}', { status: 502, headers: h });

    const data = await r.json();
    const reply = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return new Response(JSON.stringify({ reply }), { headers: h });
  },
};
