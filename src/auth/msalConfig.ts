import "dotenv/config";
import { ConfidentialClientApplication, Configuration, LogLevel } from "@azure/msal-node";

const msalConfig: Configuration = {
  auth: {
    clientId: process.env.MS_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}`,
    clientSecret: process.env.MS_CLIENT_SECRET || "",
  },
  system: {
    loggerOptions: {
      loggerCallback(logLevel: LogLevel, message: string) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Warning,
    },
  },
};

export const msalClient = new ConfidentialClientApplication(msalConfig);

export const REDIRECT_URI: string =
  process.env.MS_REDIRECT_URI || "http://localhost:3000/auth/redirect";

// scope พื้นฐานพอสำหรับได้ชื่อ + อีเมล ไม่ต้องขอสิทธิ์เพิ่มจนกว่าจะต้องเรียก Graph API จริงๆ
export const SCOPES: string[] = ["openid", "profile", "email", "User.Read"];

