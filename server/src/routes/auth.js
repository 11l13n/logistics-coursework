const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const auth = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || "development-secret", {
    expiresIn: "7d"
  });

const toSafeUser = (user) => {
  const { passwordHash, ...safe } = user;
  void passwordHash;
  return safe;
};

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { fullName, email, password, role = "DISPATCHER" } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Укажите ФИО, email и пароль" });
    }

    if (role === "ADMIN") {
      return res.status(400).json({ message: "Администратор создается через панель управления" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ message: "Email уже используется" });
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role
      },
      include: { driver: true }
    });

    res.status(201).json({ token: signToken(user), user: toSafeUser(user) });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { driver: true }
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Неверный email или пароль" });
    }

    res.json({ token: signToken(user), user: toSafeUser(user) });
  })
);

router.get("/me", auth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
