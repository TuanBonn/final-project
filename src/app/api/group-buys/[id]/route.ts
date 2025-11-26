// src/app/api/group-buys/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const { data: groupBuy, error } = await supabase
      .from("group_buys")
      .select(
        `
        id, product_name, product_description, product_images,
        price_per_unit, target_quantity, join_deadline, status,
        host:users!host_id ( id, username, avatar_url, reputation_score ),
        participants:group_buy_participants (
           quantity, status, joined_at,
           user:users ( id, username, avatar_url, shipping_info ) 
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !groupBuy) {
      return NextResponse.json({ error: "Kèo không tồn tại" }, { status: 404 });
    }

    const totalQuantity =
      groupBuy.participants?.reduce(
        (acc: number, p: any) => acc + p.quantity,
        0
      ) || 0;

    return NextResponse.json(
      {
        groupBuy: {
          ...groupBuy,
          currentQuantity: totalQuantity,
          participants: groupBuy.participants || [],
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
