import { NextResponse } from "next/server";
import { getGroq, GROQ_MODELS } from "@/lib/groq";
import { MEDSCAN_SYSTEM_PROMPT } from "@/lib/prompts/medscan";
import { parseJsonFromLLM } from "@/lib/groq";
import { createClient, createServiceClient, getUserFromToken } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;

    if (!image) {
      return NextResponse.json({ error: "Image required" }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = image.type || "image/jpeg";

    let imageUrl = `data:${mimeType};base64,${base64}`;

    const supabase = await createClient();
    const user = await getUserFromToken();

    if (user && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const service = await createServiceClient();
        const fileName = `${user.id}/${Date.now()}-${image.name}`;
        await service.storage
          .from("medication-scans")
          .upload(fileName, buffer, { contentType: mimeType });
        const { data: urlData } = service.storage
          .from("medication-scans")
          .getPublicUrl(fileName);
        if (urlData?.publicUrl) imageUrl = urlData.publicUrl;
      } catch {
        /* use base64 fallback */
      }
    }

    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODELS.vision,
      messages: [
        { role: "system", content: MEDSCAN_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this medication image and return JSON only.",
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const result = parseJsonFromLLM(raw);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Could not analyze medication. Please try again." },
      { status: 503 }
    );
  }
}
