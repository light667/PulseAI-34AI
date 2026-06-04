import { createServiceClient } from "@/lib/supabase/server";
import { generateEmbedding } from "./embed";

const SEED_CHUNKS = [
  {
    content: "L'anxiété liée à la réussite et à la pression des attentes familiales est courante en Afrique de l'Ouest. Prendre de courtes pauses régulières et respirer profondément aide à apaiser le système nerveux et à s'ancrer dans le moment présent.",
    category: "anxiété",
    source: "seed"
  },
  {
    content: "La dépression est parfois minimisée ou perçue à tort comme un manque de volonté. C'est une souffrance réelle qui nécessite de la bienveillance. Parler dans un cadre sécurisant est une étape essentielle pour commencer à guérir.",
    category: "dépression",
    source: "seed"
  },
  {
    content: "La charge mentale d'assister financièrement la famille élargie peut générer un stress professionnel et personnel majeur. Apprendre à dire non avec respect et à fixer des limites saines est crucial pour préserver son propre équilibre.",
    category: "stress professionnel",
    source: "seed"
  },
  {
    content: "L'insomnie est souvent le reflet d'une hyperactivité mentale nocturne. Établir un rituel calme avant le coucher, loin des écrans, et pratiquer des exercices de respiration favorise un endormissement plus serein.",
    category: "insomnie",
    source: "seed"
  },
  {
    content: "Le deuil est un processus unique et non linéaire. Dans les communautés très unies, la pression de paraître fort peut freiner l'expression de la tristesse. Accueillez vos larmes, elles font partie de votre chemin de reconstruction.",
    category: "deuil",
    source: "seed"
  },
  {
    content: "L'isolement social touche beaucoup de personnes vivant en zone urbaine, loin de leur village d'origine. Recréer un réseau de soutien, même restreint, à travers des activités de groupe ou de quartier est un facteur protecteur pour le moral.",
    category: "isolement social",
    source: "seed"
  },
  {
    content: "La peur du jugement des autres (qu'en-dira-t-on) alimente le stress social. Se concentrer sur ses propres valeurs plutôt que sur le regard extérieur permet de regagner en confiance et de réduire cette anxiété chronique.",
    category: "anxiété",
    source: "seed"
  },
  {
    content: "Les troubles du sommeil liés aux incertitudes quotidiennes peuvent être soulagés en tenant un journal. Écrire ses préoccupations avant de dormir permet de décharger l'esprit et facilite la transition vers le sommeil.",
    category: "insomnie",
    source: "seed"
  },
  {
    content: "Demander de l'aide pour son bien-être mental est un acte de force et de courage, et non une faiblesse. Dépasser la stigmatisation sociétale est nécessaire pour s'accorder le droit d'aller mieux.",
    category: "dépression",
    source: "seed"
  },
  {
    content: "Le surmenage (burnout) guette ceux qui portent trop de responsabilités. Prendre un moment chaque jour pour célébrer ses efforts, et s'octroyer un temps de repos exclusif prévient l'épuisement mental et physique.",
    category: "stress professionnel",
    source: "seed"
  }
];

export async function seedLyraKnowledgeIfNeeded() {
  try {
    const supabase = await createServiceClient();
    
    // Check if table is empty
    const { count, error: countError } = await supabase
      .from("lyra_knowledge")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error checking lyra_knowledge count:", countError);
      return;
    }

    if (count !== null && count > 0) {
      // Already seeded
      return;
    }

    console.log("Seeding lyra_knowledge table with default chunks...");

    for (const chunk of SEED_CHUNKS) {
      const embedding = await generateEmbedding(chunk.content);
      const { error: insertError } = await supabase.from("lyra_knowledge").insert({
        content: chunk.content,
        category: chunk.category,
        source: chunk.source,
        embedding
      });

      if (insertError) {
        console.error("Error inserting seed chunk:", insertError);
      }
    }

    console.log("Seeding lyra_knowledge table completed.");
  } catch (err) {
    console.error("Failed to seed lyra_knowledge:", err);
  }
}
