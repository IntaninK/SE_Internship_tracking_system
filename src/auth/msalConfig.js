require("dotenv").config();
const { ConfidentialClientApplication, LogLevel } = require("@azure/msal-node");

const msalConfig = {
  auth: {
    clientId: process.env.MS_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}`,
    clientSecret: process.env.MS_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(logLevel, message) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Warning,
    },
  },
};

const msalClient = new ConfidentialClientApplication(msalConfig);

const REDIRECT_URI =
  process.env.MS_REDIRECT_URI || "http://localhost:3000/auth/redirect";

// scope พื้นฐานพอสำหรับได้ชื่อ + อีเมล ไม่ต้องขอสิทธิ์เพิ่มจนกว่าจะต้องเรียก Graph API จริงๆ
const SCOPES = ["openid", "profile", "email", "User.Read"];

module.exports = { msalClient, REDIRECT_URI, SCOPES };
