import { Router, Request, Response } from "express";
import { loadAllHospitals } from "../lib/hospitalLoader";
import { findNearbyHospitals } from "../lib/routing";

const router = Router();

let hospitalsCache: any[] | null = null;

function getHospitals(): any[] {
  if (!hospitalsCache) {
    hospitalsCache = loadAllHospitals();
  }
  return hospitalsCache;
}

router.get("/search", async (req: Request, res: Response) => {
  try {
    const lat     = parseFloat(req.query.lat as string);
    const lon     = parseFloat(req.query.lon as string);
    const country = (req.query.country as string)?.toLowerCase() ?? "";

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        error: "lat et lon sont obligatoires.",
      });
    }

    const services = (req.query.services as string)?.split(",").filter(Boolean) ?? [];
    const query    = (req.query.q as string)?.toLowerCase() ?? "";
    const limit    = Math.min(parseInt((req.query.limit as string) ?? "25", 10), 100);

    let hospitals = getHospitals();

    if (hospitals.length === 0) {
      return res.status(503).json({
        error: "Données hospitalières non disponibles.",
        hospitals: [],
      });
    }

    // Filtre par pays si spécifié
    if (country && country !== "all") {
      hospitals = hospitals.filter((h) =>
        h.country.toLowerCase().includes(country) ||
        h.countryKey?.toLowerCase() === country
      );
    }

    const results = await findNearbyHospitals(lat, lon, hospitals, {
      services,
      query,
      limit,
      preFilterKm: 500,
    });

    return res.json({
      hospitals: results,
      center: { lat, lon },
      total: results.length,
      country: country || "all",
      meta: {
        osrmUsed:          results.filter((h) => h.distanceSource === "osrm").length,
        haversineFallback: results.filter((h) => h.distanceSource === "haversine").length,
      },
    });
  } catch (err) {
    console.error("[/hospitals/search] Erreur:", err);
    return res.status(500).json({ error: "Erreur interne." });
  }
});

router.post("/reload", (req: Request, res: Response) => {
  const secret = req.headers["x-ingest-secret"];
  if (secret !== process.env.INGEST_SECRET) {
    return res.status(403).json({ error: "Non autorisé" });
  }
  hospitalsCache = null;
  const hospitals = getHospitals();
  return res.json({ message: `Rechargé: ${hospitals.length} hôpitaux` });
});

router.get("/status", (_req: Request, res: Response) => {
  const hospitals = getHospitals();
  const byCountry: Record<string, number> = {};
  hospitals.forEach((h) => {
    const c = h.country || "unknown";
    byCountry[c] = (byCountry[c] || 0) + 1;
  });
  res.json({ total: hospitals.length, byCountry });
});

export default router;