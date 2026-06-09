import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Corpus mental health Afrique de l'Ouest ────────────────────────────────
// Auto-seedé au démarrage si table vide

export const LYRA_CORPUS: Array<{ content: string; category: string; source: string }> = [
  {
    category: "anxiety",
    source: "WHO Mental Health Africa",
    content: "L'anxiété est une réaction normale face à des situations stressantes. En Afrique de l'Ouest, la pression familiale, la précarité économique et les responsabilités communautaires sont des sources d'anxiété fréquentes. Des techniques comme la respiration profonde (inspirer 4 secondes, retenir 4 secondes, expirer 4 secondes) peuvent aider immédiatement.",
  },
  {
    category: "anxiety",
    source: "CBT Africa Guide",
    content: "La thérapie cognitivo-comportementale (TCC) enseigne à identifier les pensées négatives automatiques. Quand vous ressentez de l'anxiété, posez-vous : 'Cette pensée est-elle basée sur des faits ou sur des suppositions ?' La restructuration cognitive est efficace même sans thérapeute professionnel.",
  },
  {
    category: "depression",
    source: "WHO Depression Guide",
    content: "La dépression est une maladie réelle, pas une faiblesse de caractère. Les symptômes incluent : tristesse persistante, perte d'énergie, troubles du sommeil, isolement social. En Afrique, la stigmatisation empêche souvent les personnes de chercher de l'aide. Il est important de normaliser le fait de parler de sa santé mentale.",
  },
  {
    category: "depression",
    source: "Mental Health Africa",
    content: "Les activités physiques légères comme la marche 30 minutes par jour ont démontré des effets antidépresseurs comparables à certains médicaments. La connexion sociale, même brève, réduit significativement les symptômes dépressifs. Parler à un ami de confiance est un premier pas important.",
  },
  {
    category: "stress",
    source: "Burnout Prevention Guide",
    content: "Le burnout professionnel touche de plus en plus de travailleurs africains, notamment dans les grandes villes comme Lagos, Abidjan et Lomé. Les signes : épuisement chronique, cynisme, sentiment d'inefficacité. La prévention passe par des limites claires entre travail et vie personnelle, et des temps de récupération réguliers.",
  },
  {
    category: "stress",
    source: "Mindfulness Africa",
    content: "La pleine conscience (mindfulness) consiste à observer ses pensées sans les juger. Une pratique simple : chaque matin, prenez 5 minutes pour noter 3 choses pour lesquelles vous êtes reconnaissant(e). Cette pratique renforce la résilience émotionnelle et réduit le stress chronique.",
  },
  {
    category: "sleep",
    source: "Sleep Hygiene Guide",
    content: "L'insomnie affecte la santé mentale et physique. Conseils pour mieux dormir : maintenir des horaires réguliers de coucher et de lever, éviter les écrans 1 heure avant le sommeil, créer un environnement frais et sombre, éviter la caféine après 14h. Si l'insomnie persiste plus de 3 semaines, consultez un médecin.",
  },
  {
    category: "grief",
    source: "Grief Support Africa",
    content: "Le deuil est un processus naturel mais douloureux. Les étapes du deuil (déni, colère, marchandage, dépression, acceptation) ne sont pas linéaires. En Afrique de l'Ouest, les rites funéraires collectifs jouent un rôle thérapeutique important. Permettez-vous de pleurer, de parler du défunt, et cherchez le soutien de votre communauté.",
  },
  {
    category: "relationships",
    source: "Communication Guide",
    content: "Les conflits relationnels sont une source majeure de détresse. La communication non-violente (CNV) propose : observer sans juger, exprimer ses sentiments, identifier ses besoins, formuler une demande claire. Exemple : 'Quand tu rentres tard sans prévenir (observation), je me sens inquiet(e) (sentiment) car j'ai besoin de sécurité (besoin). Pourrais-tu m'envoyer un message ? (demande)'",
  },
  {
    category: "stigma",
    source: "Mental Health Stigma Africa",
    content: "En Afrique de l'Ouest, la santé mentale est souvent mal comprise ou attribuée à des causes spirituelles ou surnaturelles. Cette stigmatisation empêche des milliers de personnes de chercher de l'aide. Il est important de comprendre que les troubles mentaux sont des conditions médicales réelles, traitables, comme le diabète ou l'hypertension.",
  },
  {
    category: "trauma",
    source: "Trauma Recovery Guide",
    content: "Le traumatisme peut résulter d'expériences comme la violence, les accidents, la perte, ou les conflits. Les symptômes du PTSD incluent : cauchemars, flashbacks, évitement, hypervigilance. Des techniques comme l'EMDR et la thérapie par exposition sont efficaces. Parler d'un traumatisme à un professionnel est essentiel pour guérir.",
  },
  {
    category: "self_care",
    source: "Wellbeing Guide Africa",
    content: "Les soins personnels (self-care) ne sont pas un luxe mais une nécessité. Ils incluent : alimentation équilibrée, exercice régulier, temps dans la nature, connexions sociales positives, activités créatives ou spirituelles. Identifier ce qui vous ressource personnellement est la première étape. Accordez-vous la permission de prendre soin de vous.",
  },
  {
    category: "crisis",
    source: "Crisis Intervention Guide",
    content: "En cas de pensées suicidaires ou de crise grave, il est crucial d'agir immédiatement. Contactez une personne de confiance, rendez-vous aux urgences ou appelez un service d'aide. En attendant : éloignez-vous des moyens dangereux, restez dans un lieu sûr avec quelqu'un, et rappelez-vous que les crises sont temporaires même si elles semblent permanentes.",
  },
  {
    category: "anxiety",
    source: "Breathing Techniques",
    content: "La technique de respiration 4-7-8 est efficace contre l'anxiété aiguë : inspirez 4 secondes, retenez votre souffle 7 secondes, expirez lentement 8 secondes. Répétez 4 fois. Cette technique active le système nerveux parasympathique et calme la réponse au stress en moins de 2 minutes.",
  },
  {
    category: "depression",
    source: "Behavioral Activation Guide",
    content: "L'activation comportementale est une technique anti-dépressive efficace : même sans motivation, planifiez de petites activités agréables chaque jour. Commencez petit (5 minutes de marche, un repas avec un ami). La motivation suit l'action, pas l'inverse. Notez vos activités et leur impact sur votre humeur.",
  },
  {
    category: "stress",
    source: "Work-Life Balance Africa",
    content: "Le stress chronique augmente le risque de maladies cardiovasculaires, de diabète et d'affaiblissement immunitaire. Des pauses régulières au travail (5 minutes toutes les heures) améliorent la productivité et réduisent le stress. Apprendre à dire non est une compétence essentielle pour protéger sa santé mentale.",
  },
  {
    category: "relationships",
    source: "Family Dynamics Africa",
    content: "Les relations familiales en Afrique de l'Ouest sont souvent source de soutien mais aussi de pression. Les attentes communautaires et familiales peuvent générer des conflits internes. Il est possible de respecter ses valeurs culturelles tout en établissant des limites saines pour préserver sa santé mentale.",
  },
  {
    category: "self_esteem",
    source: "Confidence Building Guide",
    content: "Une faible estime de soi peut alimenter la dépression et l'anxiété. Pour la renforcer : identifiez vos forces et accomplissements, défiez les pensées négatives sur vous-même, fixez-vous des objectifs réalisables et célébrez vos petites victoires. L'auto-compassion — se traiter comme on traiterait un ami — est fondamentale.",
  },
  {
    category: "anger",
    source: "Anger Management Guide",
    content: "La colère est une émotion normale mais peut devenir destructrice. Techniques de gestion : temps de pause (quittez la situation 10 minutes), respiration profonde, écriture de ce que vous ressentez. La colère signale souvent un besoin non satisfait — identifier ce besoin aide à le communiquer constructivement.",
  },
  {
    category: "loneliness",
    source: "Social Connection Guide",
    content: "La solitude est un facteur de risque majeur pour la dépression et les maladies chroniques. Même en ville, de nombreuses personnes se sentent isolées. Des actions simples : rejoindre un groupe (sportif, religieux, associatif), planifier des contacts réguliers avec des proches, faire du bénévolat. La qualité des relations prime sur la quantité.",
  },
];

// ─── HuggingFace embedding ───────────────────────────────────────────────────

// Remplacer la fonction generateEmbedding dans les 3 fichiers par celle-ci :

async function generateEmbedding(text: string): Promise<number[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(
        "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY!}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: text,
            options: { wait_for_model: true },
          }),
        }
      );
      if (!res.ok) throw new Error(`HF ${res.status}: ${await res.text()}`);

      // Cast explicite — HuggingFace retourne number[] ou number[][]
      const raw = await res.json() as number[] | number[][];
      return Array.isArray(raw[0]) ? (raw[0] as number[]) : (raw as number[]);

    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error("Embedding failed after 3 attempts");
}

// ─── Auto-seed au démarrage ───────────────────────────────────────────────────

export async function seedLyraCorpusIfEmpty(): Promise<void> {
  try {
    const { count } = await supabase
      .from("lyra_knowledge")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      console.log(`✅ Lyra corpus already seeded (${count} chunks)`);
      return;
    }

    console.log("🌱 Seeding Lyra RAG corpus...");
    let seeded = 0;

    for (const doc of LYRA_CORPUS) {
      try {
        const embedding = await generateEmbedding(doc.content);
        await supabase.from("lyra_knowledge").insert({
          content: doc.content,
          source: doc.source,
          category: doc.category,
          embedding,
        });
        seeded++;
        await new Promise(r => setTimeout(r, 800));
      } catch (err: any) {
        console.error(`  ✗ Seed error for "${doc.category}": ${err.message}`);
      }
    }
    console.log(`✅ Lyra corpus seeded: ${seeded}/${LYRA_CORPUS.length} chunks`);
  } catch (err) {
    console.error("Lyra seed error:", err);
  }
}

// ─── RAG retrieval ────────────────────────────────────────────────────────────

async function retrieveLyraContext(message: string): Promise<string> {
  try {
    const embedding = await generateEmbedding(message);
    const { data, error } = await supabase.rpc("match_lyra_knowledge", {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 4,
    });
    if (error || !data?.length) return "";
    return data
      .map((d: any) => d.content)
      .join("\n\n---\n\n");
  } catch {
    return "";
  }
}

// ─── POST /lyra ───────────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const { message, history = [], language = "fr" } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: "Message vide" });
  }

  try {
    // 1. RAG context
    const ragContext = await retrieveLyraContext(message);

    // 2. System prompt
    const systemPrompt = `Tu es Lyra, thérapeute virtuelle de Pulse AI, spécialisée dans le soutien émotionnel en Afrique de l'Ouest.
Tu es chaleureuse, empathique, non-jugeante et culturellement sensible au contexte ouest-africain (Togo, Bénin, Nigeria, Ghana, Côte d'Ivoire).

${ragContext ? `CONTEXTE DE CONNAISSANCE (RAG) :\n${ragContext}\n` : ""}

RÈGLES ABSOLUES :
- Ne jamais diagnostiquer une maladie mentale
- Toujours valider les émotions avant de donner une perspective
- Si l'utilisateur mentionne des idées suicidaires ou d'automutilation : répondre avec compassion ET fournir immédiatement :
  "SOS Togo : +228 22 22 22 22 | Nigeria : 0800-SAFELINE | Ghana : 0800-111-888"
  Encourager à contacter un proche ou aller aux urgences
- Langage simple, humain, jamais clinique
- Réponses en ${language === "fr" ? "français" : "anglais"}
- Maximum 120 mots sauf besoin étendu
- Toujours terminer par une question douce ou une affirmation bienveillante
- Ne jamais prescrire de médicaments
- Personnalité : douce, présente, comme une amie sage`;

    // 3. Construire l'historique
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8).map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // 4. Streaming Mistral
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY!}`,
      },
      body: JSON.stringify({
        model: "mistral-medium-latest",
        temperature: 0.7,
        max_tokens: 300,
        stream: true,
        messages,
      }),
    });

    if (!mistralRes.ok) {
      const err = await mistralRes.text();
      res.write(`data: ${JSON.stringify({ error: "Mistral error" })}\n\n`);
      return res.end();
    }

    const reader = mistralRes.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            res.write("data: [DONE]\n\n");
          } else {
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                res.write(`data: ${JSON.stringify({ token: delta })}\n\n`);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    }

    res.end();
  } catch (err: any) {
    console.error("Lyra error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur du serveur Lyra" });
    }
  }
});

// ─── GET /lyra/status ─────────────────────────────────────────────────────────

router.get("/status", async (_req: Request, res: Response) => {
  const { count } = await supabase
    .from("lyra_knowledge")
    .select("*", { count: "exact", head: true });
  res.json({ corpus_count: count, ready: (count || 0) > 0 });
});

export default router;