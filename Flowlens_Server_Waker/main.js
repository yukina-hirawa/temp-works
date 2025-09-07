const { chromium } = require('playwright');
const fs = require('fs-extra');
const axios = require('axios');

const services = [
  {
    name: "API Service",
    url: "https://flowlens-api-service.onrender.com/health"
  },
  {
    name: "Ingestion Service",
    url: "https://devbyzero-mission-control.onrender.com/health"
  }
];

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];

  for (const service of services) {
    const start = Date.now();
    let responseJson = null;
    let statusText = "Failed";

    try {
      await page.goto(service.url, { waitUntil: 'networkidle', timeout: 60000 });

      // Wait until JSON appears or timeout after 60s
      const bodyHandle = await page.waitForSelector('body', { timeout: 60000 });
      const bodyText = await bodyHandle.innerText();
      try {
        responseJson = JSON.parse(bodyText);
        statusText = "Okay";
      } catch {
        responseJson = bodyText;
        statusText = "Invalid JSON";
      }
    } catch (err) {
      responseJson = err.message;
    }

    const timeTaken = ((Date.now() - start) / 1000).toFixed(2) + 's';
    results.push({ name: service.name, status: statusText, response: responseJson, timeTaken });
  }

  await browser.close();

  // Save report as JSON artifact
  await fs.outputJson('Flowlens_Server_Waker/output/report.json', results, { spaces: 2 });

  // Format message for Telegram
  const message = [
    "🚀 *Flowlens Server Waker Service*",
    ...results.map(r => `*${r.name}*: ${r.status}\n_Response_: \`\`\`${JSON.stringify(r.response)}\`\`\`\n_Time taken_: ${r.timeTaken}`)
  ].join("\n\n");

  // Send to Telegram
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "Markdown"
    });
  } catch (err) {
    console.error("Failed to send Telegram message:", err.message);
  }

})();
