import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PYTHON_AI_URL = process.env.PYTHON_AI_SERVICE_URL || "https://waste-ai-service.onrender.com";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product_id, image_url, description, quantity } = body;

    if (!product_id) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 });
    }

    console.log(`[AI Analyze] Calling ${PYTHON_AI_URL}/analyze-waste for product ${product_id}`);

    // Call Python FastAPI service
    let aiResult;
    try {
      const aiResponse = await fetch(`${PYTHON_AI_URL}/analyze-waste`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: image_url || "",
          description: description || "",
          quantity: quantity || 0,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("[AI Analyze] AI service error:", errText);
        return NextResponse.json(
          { error: "AI service failed", details: errText },
          { status: 502 }
        );
      }

      aiResult = await aiResponse.json();
      console.log("[AI Analyze] AI result:", JSON.stringify(aiResult));
    } catch (fetchError: any) {
      console.error("[AI Analyze] Failed to reach AI service:", fetchError.message);
      return NextResponse.json(
        { error: "Cannot reach AI service", details: fetchError.message },
        { status: 502 }
      );
    }

    // Try to update the product in Supabase with AI results (non-blocking if columns don't exist)
    try {
      const { error: updateError } = await supabaseAdmin
        .from("products")
        .update({
          material_type: aiResult.material_type,
          quality: aiResult.quality,
          recyclability_score: aiResult.recyclability_score,
          ai_keywords: aiResult.keywords,
          ai_confidence: aiResult.confidence,
          ai_processed_at: new Date().toISOString(),
        })
        .eq("id", product_id);

      if (updateError) {
        console.warn("[AI Analyze] Supabase update warning (AI columns may not exist yet):", updateError.message);
        // Don't fail the request — still return AI results to the frontend
      }
    } catch (dbError: any) {
      console.warn("[AI Analyze] Supabase update skipped:", dbError.message);
    }

    return NextResponse.json({
      success: true,
      product_id,
      ...aiResult,
    });
  } catch (error: any) {
    console.error("[AI Analyze] Unexpected error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
