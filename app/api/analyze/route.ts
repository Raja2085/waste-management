import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PYTHON_AI_URL = process.env.PYTHON_AI_SERVICE_URL || "http://localhost:8000";

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

    // Call Python FastAPI service
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
      console.error("AI service error:", errText);
      return NextResponse.json(
        { error: "AI service failed", details: errText },
        { status: 502 }
      );
    }

    const aiResult = await aiResponse.json();

    // Update the product in Supabase with AI results
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
      console.error("Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update product with AI results", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product_id,
      ...aiResult,
    });
  } catch (error: any) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
