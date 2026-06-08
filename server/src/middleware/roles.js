const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Недостаточно прав" });
  }

  next();
};

module.exports = requireRoles;
