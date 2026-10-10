# Optional: real AI behind "Ask Ayesha"

Out of the box, the "Ask Ayesha" side assistant answers from a built-in list of business facts. It works offline, costs nothing and never makes things up, but it only understands the topics it was written for.

To make it a real AI chat that understands any wording, deploy `worker.js`:

1. Create a free Cloudflare account and a new Worker. Paste in `worker.js`.
2. Add a secret named `ANTHROPIC_API_KEY` (from console.anthropic.com). Set a monthly spending limit there.
3. Copy the Worker's web address.
4. In `www/index.html`, find `var ASSISTANT_ENDPOINT=''` and paste the address between the quotes.
5. Commit the change. The app rebuilds, and if the server is ever unreachable it falls back to the built-in answers.

Notes
- Each question costs a small amount of API credit. Keep the spending limit on.
- Customer questions then go to your Worker and to Anthropic. Update `www/privacy.html` (the "Assistant" line) before publishing to the stores.
- Update the FACTS text in `worker.js` whenever prices or details change. Also update the built-in answers in `www/index.html`.
