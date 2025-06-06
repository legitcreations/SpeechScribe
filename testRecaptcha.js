const {RecaptchaEnterpriseServiceClient} = require('@google-cloud/recaptcha-enterprise');

(async () => {
  try {
    const client = new RecaptchaEnterpriseServiceClient();
    const [keys] = await client.listKeys({parent: client.projectPath('speechscribeapp')});
    console.log("✅ Connected. reCAPTCHA keys found:", keys.length);
  } catch (e) {
    console.error("❌ Error connecting to reCAPTCHA:", e.message);
  }
})();
