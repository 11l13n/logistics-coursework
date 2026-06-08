const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");

const auth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Необходима авторизация" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "development-secret");
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { driver: true }
    });

    if (!user) {
      return res.status(401).json({ message: "Пользователь не найден" });
    }

    const { passwordHash, ...safeUser } = user;
    void passwordHash;
    req.user = safeUser;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Недействительный токен" });
  }
});

module.exports = auth;
