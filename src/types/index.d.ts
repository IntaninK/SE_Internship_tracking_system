import "express-session";
import { Role, Staff } from "@prisma/client";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      email: string;
      role: Role | string;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      staff?: Staff;
    }
  }
}
