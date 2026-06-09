import { Router, Request, Response } from "express";
import { loadAllHospitals } from "../lib/hospitalLoader";
import { findNearbyHospitals } from "../lib/routing";

const router = Router();

// Cache des hôpitaux chargé au démarrage
let hospitalsCache: any[] | null = null;

function getHospitals(): any[] {
  if (!hospitalsCache) {
    hospitalsCache = loadAllHospitals();
  }
  return hospitalsCache;
}

/**
 * GET /hospitals/search
 * Params:
 *   lat      - latitude de l'utilisateur (obligatoire)
 *   lon      - longitude de l'utilisateur (obligatoire)
 *   q        - recherche textuelle (optionnel)
 *   services - filtre services, séparé par virgules (optionnel)
 *   limit    - nombre de résultats (défaut: 20)
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        error: "Les paramètres lat et lon sont obligatoires et doivent être des nombres valides.",
      });
    }

    // Validation des coordonnées (Afrique de l'Ouest approximativement)
    if (lat < -5 || lat > 25 || lon < -20 || lon > 20) {
      return res.status(400).json({
        error: "Coordonnées hors zone. Ce service couvre l'Afrique de l'Ouest.",
      });
    }

    const services = (req.query.services as string)?.split(",").filter(Boolean) ?? [];
    const query = (req.query.q as string)?.toLowerCase() ?? "";
    const limit = Math.min(parseInt((req.query.limit as string) ?? "20", 10), 50);

    const hospitals = getHospitals();

    if (hospitals.length === 0) {
      return res.status(503).json({
        error: "Données hospitalières non disponibles. Vérifiez le dossier Hospital_Data/.",
        hospitals: [],
      });
    }

    const results = await findNearbyHospitals(lat, lon, hospitals, {
      services,
      query,
      limit,
      preFilterKm: 200,
    });

    return res.json({
      hospitals: results,
      center: { lat, lon },
      total: results.length,
      meta: {
        osrmUsed: results.filter((h) => h.distanceSource === "osrm").length,
        haversineFallback: results.filter((h) => h.distanceSource === "haversine").length,
      },
    });
  } catch (err) {
    console.error("[/hospitals/search] Erreur:", err);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

/**
 * GET /hospitals/reload
 * Recharge les fichiers GeoJSON sans redémarrer le serveur
 */
router.post("/reload", (req: Request, res: Response) => {
  const secret = req.headers["x-ingest-secret"];
  if (secret !== process.env.INGEST_SECRET) {
    return res.status(403).json({ error: "Non autorisé" });
  }
  hospitalsCache = null;
  const hospitals = getHospitals();
  return res.json({ message: `Rechargé: ${hospitals.length} hôpitaux`, total: hospitals.length });
});

export default router;