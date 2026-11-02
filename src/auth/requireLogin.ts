import { Request, Response, NextFunction } from "express";

// ใช้คลุมหน้าที่ต้อง login ก่อนถึงจะเข้าได้ เช่น dashboard, profile
// วิธีใช้: app.get('/pages/dashboard.html', requireLogin, (req, res) => { ... })
export function requireLogin(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.user) {
    return res.redirect("/pages/login.html");
  }
  next();
}

export default requireLogin;
module.exports = requireLogin;
module.exports.default = requireLogin;
