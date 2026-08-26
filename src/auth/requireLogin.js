// ใช้คลุมหน้าที่ต้อง login ก่อนถึงจะเข้าได้ เช่น dashboard, profile
// วิธีใช้: app.get('/pages/dashboard.html', requireLogin, (req, res) => { ... })
function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect("/pages/login.html");
  }
  next();
}

module.exports = requireLogin;
