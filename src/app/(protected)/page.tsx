"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { daysSince, formatDateJST, formatJST } from "@/lib/date";
import { supabase } from "@/lib/supabase";
import { CARE_TAGS } from "@/lib/tags";
import { THEME_COLOR, BACKGROUND_COLOR } from "@/lib/theme";
import type { Plant, RecordRow } from "@/lib/types";

type KindFilter = "all" | "care" | "cooking";

export default function Home() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null); // null = すべて
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 植物一覧を取得
  useEffect(() => {
    supabase
      .from("plants")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: true })
      .then(({ data }) => setPlants(data ?? []));
  }, []);

  // 記録を取得
  const loadRecords = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("records")
      .select(
        "*, record_photos(photo_path, sort_order), record_plants(plant_id), profiles!records_created_by_profiles_fkey(display_name, color)",
      )
      .order("recorded_at", { ascending: false });

    if (kindFilter !== "all") query = query.eq("kind", kindFilter);

    const { data } = await query;
    let rows = (data ?? []) as RecordRow[];

    // 植物フィルター（世話は plant_id、料理は record_plants を見る）
    if (selectedPlant) {
      rows = rows.filter((r) =>
        r.kind === "care"
          ? r.plant_id === selectedPlant
          : r.record_plants.some((rp) => rp.plant_id === selectedPlant),
      );
    }
    setRecords(rows);
    setLoading(false);

    // 全写真の署名URLをまとめて取得
    const allPaths = rows.flatMap((r) =>
      [...r.record_photos]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => p.photo_path),
    );
    if (allPaths.length) {
      const { data: signed } = await supabase.storage
        .from("photos")
        .createSignedUrls(allPaths, 3600);
      const map: Record<string, string> = {};
      signed?.forEach((s) => {
        if (s.signedUrl && s.path) map[s.path] = s.signedUrl;
      });
      setPhotoUrls(map);
    }
  }, [kindFilter, selectedPlant]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const plantName = (id: string | null) =>
    plants.find((p) => p.id === id)?.name ?? "";

  return (
    <main className="mx-auto max-w-md pb-24">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4">
        <h1 className="text-lg font-bold" style={{ color: THEME_COLOR }}>
          Grow Log📝
        </h1>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
          className="text-sm"
          style={{ color: THEME_COLOR }}
        >
          ログアウト
        </button>
      </div>

      {/* 植物切り替え */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        <Chip
          active={selectedPlant === null}
          onClick={() => setSelectedPlant(null)}
        >
          すべて
        </Chip>
        {plants.map((p) => (
          <Chip
            key={p.id}
            active={selectedPlant === p.id}
            onClick={() => setSelectedPlant(p.id)}
          >
            {p.icon} {p.name}
          </Chip>
        ))}
        <Link
          href="/plants/new"
          className="flex-none rounded-full border border-dashed px-3 py-1.5 text-sm font-bold whitespace-nowrap"
          style={{ borderColor: THEME_COLOR, color: THEME_COLOR }}
        >
          ＋ 追加
        </Link>
      </div>

      {/* 選択中の植物の経過日数 */}
      {selectedPlant &&
        (() => {
          const p = plants.find((pl) => pl.id === selectedPlant);
          if (!p?.started_at) return null;
          return (
            <p className="px-4 pb-2 text-right text-sm text-green-800">
              {formatDateJST(p.started_at)}~ {daysSince(p.started_at)}日目
            </p>
          );
        })()}

      {/* 世話/料理フィルター */}
      <div className="flex gap-2 border-b px-4 pb-3">
        {(["all", "care", "cooking"] as KindFilter[]).map((k) => (
          <button
            key={k}
            onClick={() => setKindFilter(k)}
            className={`rounded-full px-3 py-1 text-sm font-bold ${
              kindFilter === k ? "bg-green-50 text-green-800" : "text-gray-500"
            }`}
          >
            {k === "all" ? "すべて" : k === "care" ? "🫗 世話" : "🍳 料理"}
          </button>
        ))}
      </div>

      {/* 記録一覧 */}
      <div className="space-y-4 p-4">
        {loading && <p className="text-gray-400">読み込み中...</p>}
        {!loading && records.length === 0 && (
          <p className="text-gray-400">まだ記録がありません。</p>
        )}
        {records.map((r) => {
          const photos = [...r.record_photos].sort(
            (a, b) => a.sort_order - b.sort_order,
          );
          const names =
            r.kind === "cooking"
              ? r.record_plants
                  .map((rp) => plantName(rp.plant_id))
                  .filter(Boolean)
                  .join("・")
              : plantName(r.plant_id);
          return (
            <div
              key={r.id}
              className="overflow-hidden rounded-2xl bg-white shadow"
            >
              {/* 写真スワイプ（リンクの外） */}
              {photos.length > 0 && (
                <div className="relative">
                  <div className="flex snap-x snap-mandatory overflow-x-auto">
                    {photos.map((p, i) => {
                      const url = photoUrls[p.photo_path];
                      return url ? (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="h-40 w-full flex-none snap-center object-cover"
                        />
                      ) : null;
                    })}
                  </div>
                  {names && (
                    <span className="absolute right-2 bottom-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-green-800">
                      {names}
                    </span>
                  )}
                </div>
              )}

              {/* 本文（ここをタップで詳細へ） */}
              <Link href={`/records/${r.id}`} className="block p-3">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {r.kind === "cooking" ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                      🍳 料理
                    </span>
                  ) : (
                    CARE_TAGS.filter((t) => r[t.key as keyof RecordRow]).map(
                      (t) => (
                        <span
                          key={t.key}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold"
                          style={{ color: THEME_COLOR }}
                        >
                          {t.emoji}
                          {t.label}
                        </span>
                      ),
                    )
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {formatJST(r.recorded_at)}
                  </p>
                  {r.profiles && (
                    <span
                      className="flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-bold text-white"
                      style={{ backgroundColor: r.profiles.color }}
                    >
                      {r.profiles.display_name}
                    </span>
                  )}
                </div>
                {r.comment && (
                  <p className="mt-1 line-clamp-3 text-sm">{r.comment}</p>
                )}
              </Link>
            </div>
          );
        })}
      </div>
      <Link
        href="/records/new"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-700 text-3xl text-white shadow-lg"
      >
        ＋
      </Link>
    </main>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-none rounded-full border px-3 py-1.5 text-sm font-bold whitespace-nowrap"
      style={
        active
          ? {
              backgroundColor: THEME_COLOR,
              borderColor: THEME_COLOR,
              color: "#fff",
            }
          : { borderColor: "#d1d5db", color: THEME_COLOR }
      }
    >
      {children}
    </button>
  );
}
