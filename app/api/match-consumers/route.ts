import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ConsumerRequirement = {
  id: string;
  consumer_id: string;
  material_types: string[];
  min_quantity: number;
  max_quantity: number;
  min_quality: string;
  keywords: string[];
};

type MatchedConsumer = {
  consumer_id: string;
  consumer_name: string;
  relevance_score: number;
  match_reasons: string[];
};

const QUALITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3 };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product_id } = body;

    if (!product_id) {
      return NextResponse.json({ error: "product_id required" }, { status: 400 });
    }

    // 1. Fetch product with AI data
    const { data: product, error: productErr } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    if (productErr || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 2. Fetch all consumer requirements
    const { data: requirements, error: reqErr } = await supabaseAdmin
      .from("consumer_requirements")
      .select("*");

    if (reqErr) {
      return NextResponse.json({ error: "Failed to fetch requirements" }, { status: 500 });
    }

    if (!requirements || requirements.length === 0) {
      return NextResponse.json({ matches: [], message: "No consumer requirements found" });
    }

    // 3. Score each consumer requirement against the product
    const matches: MatchedConsumer[] = [];

    for (const req of requirements as ConsumerRequirement[]) {
      let score = 0;
      const reasons: string[] = [];

      // Material match (40 points)
      const productMaterial = (product.material_type || product.category || "").toLowerCase();
      if (req.material_types && req.material_types.length > 0) {
        const materialMatch = req.material_types.some(
          (m: string) => m.toLowerCase() === productMaterial
        );
        if (materialMatch) {
          score += 40;
          reasons.push(`Material match: ${productMaterial}`);
        }
      } else {
        // No material preference = partial match
        score += 15;
        reasons.push("No material preference (open)");
      }

      // Quantity range match (30 points)
      const qty = product.quantity || 0;
      if (qty >= (req.min_quantity || 0) && qty <= (req.max_quantity || 999999)) {
        score += 30;
        reasons.push(`Quantity ${qty}kg within range`);
      } else if (qty >= (req.min_quantity || 0)) {
        score += 15;
        reasons.push("Quantity exceeds max but above minimum");
      }

      // Quality match (15 points)
      const productQuality = (product.quality || "medium").toLowerCase();
      const reqMinQuality = (req.min_quality || "low").toLowerCase();
      if ((QUALITY_RANK[productQuality] || 2) >= (QUALITY_RANK[reqMinQuality] || 1)) {
        score += 15;
        reasons.push(`Quality "${productQuality}" meets minimum "${reqMinQuality}"`);
      }

      // Keyword overlap (15 points)
      const productKeywords: string[] = product.ai_keywords || [];
      const reqKeywords: string[] = req.keywords || [];
      if (reqKeywords.length > 0 && productKeywords.length > 0) {
        const overlap = productKeywords.filter((kw: string) =>
          reqKeywords.some((rk: string) => kw.toLowerCase().includes(rk.toLowerCase()) || rk.toLowerCase().includes(kw.toLowerCase()))
        );
        if (overlap.length > 0) {
          const keywordScore = Math.min(15, (overlap.length / reqKeywords.length) * 15);
          score += Math.round(keywordScore);
          reasons.push(`${overlap.length} keyword match(es)`);
        }
      }

      // Only include if score is above threshold
      if (score >= 20) {
        matches.push({
          consumer_id: req.consumer_id,
          consumer_name: "", // Will be filled below
          relevance_score: Math.min(100, score),
          match_reasons: reasons,
        });
      }
    }

    // 4. Sort by score descending and take top 5
    matches.sort((a, b) => b.relevance_score - a.relevance_score);
    const topMatches = matches.slice(0, 5);

    // 5. Fetch consumer names
    if (topMatches.length > 0) {
      const consumerIds = topMatches.map((m) => m.consumer_id);
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, first_name, last_name")
        .in("id", consumerIds);

      if (users) {
        for (const match of topMatches) {
          const user = users.find((u: any) => u.id === match.consumer_id);
          if (user) {
            match.consumer_name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown";
          }
        }
      }
    }

    return NextResponse.json({ matches: topMatches });
  } catch (error: any) {
    console.error("Match consumers error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
