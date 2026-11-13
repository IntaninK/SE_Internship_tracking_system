import type { NextApiRequest, NextApiResponse } from "next";
import app from "../../../server";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return app(req as any, res as any);
}

