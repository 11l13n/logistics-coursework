const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const auth = require("../middleware/auth");
const requireRoles = require("../middleware/roles");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(auth, requireRoles("ADMIN"));

const includeDriver = { driver: true };
const selectSafe = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  driver: true
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = req.query.role ? { role: req.query.role } : {};
    const users = await prisma.user.findMany({
      where,
      select: selectSafe,
      orderBy: { createdAt: "desc" }
    });
    res.json(users);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { fullName, email, password, role } = req.body;
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: "Заполните ФИО, email, пароль и роль" });
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role
      },
      include: includeDriver
    });
    const { passwordHash, ...safe } = user;
    void passwordHash;
    res.status(201).json(safe);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { fullName, email, password, role } = req.body;
    const data = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data,
      select: selectSafe
    });
    res.json(user);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: "Нельзя удалить текущего пользователя" });
    }

    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

module.exports = router;
