# Pulse AI — Ce qu'il vous reste à finaliser

Le prototype est **prêt à déployer** sur Vercel. Voici les éléments à compléter de votre côté.

---

## 1. Fichiers GeoJSON hôpitaux (priorité haute)

**Dossier :** `public/data/`

| Fichier | Statut |
|---------|--------|
| `hospitals_togo.geojson` | ✅ Fourni (5 hôpitaux démo Lomé) |
| `hospitals_nigeria.geojson` | ❌ À ajouter |
| `hospitals_ghana.geojson` | ❌ À ajouter |
| `hospitals_benin.geojson` | ❌ À ajouter |
| `hospitals_cote_divoire.geojson` | ❌ À ajouter |

**Comment les générer :**

```bash
pip install requests
python scripts/extract_hospitals.py
```

Cela interroge OpenStreetMap (Overpass API) et crée les 5 fichiers. Peut prendre plusieurs minutes par pays.

---

## 2. Supabase (priorité haute)

1. Ouvrir [Supabase Dashboard](https://supabase.com/dashboard) → projet `oodmfyesvusvuphycfrh`
2. **SQL Editor** → exécuter tout le fichier `supabase/schema.sql`
3. **Storage** → créer un bucket public nommé `medication-scans`
4. **Authentication** → activer Google OAuth si souhaité (URL callback : `https://votre-domaine.vercel.app/auth/callback`)
5. **Authentication** → désactiver « Confirm email » pour la démo hackathon (optionnel)

---

## 3. Clé HuggingFace (Lyra RAG amélioré)

Dans `.env.local` :

```
HUGGINGFACE_API_KEY=hf_votre_cle
```

Sans cette clé, Lyra fonctionne avec un contexte de secours intégré.

**Corpus mental health :**

1. Ajoutez des fichiers `.txt` ou `.md` dans `public/corpus/`
2. Exécutez : `npm run ingest`

Un échantillon `sample-anxiety.txt` est déjà inclus.

---

## 4. Variables Vercel (déploiement)

Dans le dashboard Vercel → Settings → Environment Variables :

| Variable | Valeur |
|----------|--------|
| `GROQ_API_KEY` | Depuis `.env` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://oodmfyesvusvuphycfrh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Depuis `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Depuis `.env` (secret) |
| `HUGGINGFACE_API_KEY` | Optionnel |
| `NEXT_PUBLIC_APP_URL` | `https://votre-app.vercel.app` |

---

## 5. Assets optionnels

| Fichier | Emplacement | Statut |
|---------|-------------|--------|
| `logo.png` | `public/logo.png` | ✅ Copié |
| `og-image.png` | `public/og-image.png` | ❌ Créer 1200×630 pour réseaux sociaux |

---

## 6. Détails hackathon / démo

- [ ] Tester diagnostic en français (paludisme, typhoïde)
- [ ] Tester Lyra avec un message d'anxiété
- [ ] Scanner une photo de Paracétamol / Artéméther
- [ ] Vérifier carte hôpitaux Lomé (Togo)
- [ ] Compte démo pour les juges (optionnel)
- [ ] QR code WhatsApp (si intégration prévue)

---

## 7. Commandes utiles

```bash
npm run dev      # Développement local
npm run build    # Vérifier build production
npm run ingest   # Ingérer corpus Lyra
```

---

## Structure des dossiers créés pour vous

```
public/
├── logo.png              ✅
├── data/
│   ├── hospitals_togo.geojson  ✅ (démo)
│   ├── README.md
│   └── (4 autres pays à ajouter)
└── corpus/
    ├── sample-anxiety.txt    ✅
    └── README.md

supabase/
└── schema.sql            ✅ À exécuter

scripts/
├── extract_hospitals.py  ✅
└── ingest-corpus.ts      ✅
```

---

**Support :** En cas d'erreur `next build`, vérifiez que toutes les variables d'environnement sont définies et que le schéma Supabase est appliqué.
