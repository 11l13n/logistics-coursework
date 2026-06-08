const express = require("express");
const auth = require("../middleware/auth");
const requireRoles = require("../middleware/roles");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(auth, requireRoles("ADMIN", "DISPATCHER"));

const cache = new Map();
let lastRequestAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizePlace = (place) => ({
  id: String(place.place_id || `${place.lat}:${place.lon}`),
  address: place.display_name,
  latitude: Number(place.lat),
  longitude: Number(place.lon),
  type: place.type,
  category: place.category || place.class
});

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const query = String(req.query.q || "").trim();
    if (query.length < 3) {
      return res.status(400).json({ message: "Введите не менее 3 символов адреса" });
    }

    const cacheKey = query.toLowerCase();
    if (cache.has(cacheKey)) {
      return res.json(cache.get(cacheKey));
    }

    const waitMs = Math.max(0, 1100 - (Date.now() - lastRequestAt));
    if (waitMs) await sleep(waitMs);
    lastRequestAt = Date.now();

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "ru");
    url.searchParams.set("accept-language", "ru");
    url.searchParams.set("q", query);

    const response = await fetch(url, {
      headers: {
        "User-Agent": process.env.GEOCODING_USER_AGENT || "logistics-coursework/1.0 (student coursework)"
      }
    });

    if (!response.ok) {
      const error = new Error("Не удалось получить адреса от OpenStreetMap");
      error.status = 502;
      throw error;
    }

    const data = await response.json();
    const result = data
      .map(normalizePlace)
      .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));

    cache.set(cacheKey, result);
    res.json(result);
  })
);

module.exports = router;
