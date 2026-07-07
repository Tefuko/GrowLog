"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/lib/supabase";
import { formatJST } from "@/lib/date";
import { CARE_TAGS } from "@/lib/tags";
import type { Plant, RecordRow } from "@/lib/types";

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [record, setRecord] = useState<RecordRow | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: rec }, { data: pl }] = await Promise.all([
        supabase
          .from("records")
          .select(
            "*, record_photos(photo_path, sort_order), record_plants(plant_id)",
          )
          .eq("id", id)
          .single(),
        supabase.from("plants").select("*"),
      ]);

      setPlants(pl ?? []);
      const row = rec as RecordRow | null;
      setRecord(row);

      if (row) {
        const paths = [...row.record_photos]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((p) => p.photo_path);
        if (paths.length) {
          const { data: signed } = await supabase.storage
            .from("photos")
            .createSignedUrls(paths, 3600);
          setPhotoUrls(
            (signed ?? []).map((s) => s.signedUrl).filter(Boolean) as string[],
          );
        }
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!record) return;
    if (!confirm("この記録を削除しますか？元に戻せません。")) return;
    setDeleting(true);

    // 1. Storageの写真ファイルを削除
    const paths = record.record_photos.map((p) => p.photo_path);
    if (paths.length) {
      await supabase.storage.from("photos").remove(paths);
    }

    // 2. records を削除（record_photos / record_plants は cascade で自動削除）
    const { error } = await supabase
      .from("records")
      .delete()
      .eq("id", record.id);

    setDeleting(false);
    if (error) {
      alert("削除に失敗しました: " + error.message);
      return;
    }
    router.push("/");
  };

  if (loading) {
    return <main className="p-6 text-gray-400 dark:text-gray-500">読み込み中...</main>;
  }
  if (!record) {
    return (
      <main className="p-6 text-gray-400 dark:text-gray-500">記録が見つかりません。</main>
    );
  }

  const plantName = (pid: string | null) =>
    plants.find((p) => p.id === pid)?.name ?? "";
  const names =
    record.kind === "cooking"
      ? record.record_plants
          .map((rp) => plantName(rp.plant_id))
          .filter(Boolean)
          .join("・")
      : plantName(record.plant_id);

  return (
    <main className="mx-auto max-w-md pb-24">
      {/* 戻る */}
      <div className="flex justify-end p-4">
        <BackButton />
      </div>

      {/* 写真スワイプ */}
      {photoUrls.length > 0 && (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4">
          {photoUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              onClick={() => setLightboxIndex(i)}
              className="h-72 w-full flex-none snap-center rounded-2xl object-cover"
              style={{ width: photoUrls.length > 1 ? "90%" : "100%" }}
            />
          ))}
        </div>
      )}

      {/* 本文 */}
      <div className="p-5">
        <p className="text-lg font-bold">{formatJST(record.recorded_at)}</p>
        {names && (
          <p className="mt-1 text-sm text-green-800 font-semibold dark:text-green-300">
            {names}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {record.kind === "cooking" ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-orange-700 dark:bg-gray-800 dark:text-orange-400">
              🍳 料理
            </span>
          ) : (
            CARE_TAGS.filter((t) => record[t.key as keyof RecordRow]).map(
              (t) => (
                <span
                  key={t.key}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {t.emoji}
                  {t.label}
                </span>
              ),
            )
          )}
        </div>

        {record.comment && (
          <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white p-4 shadow text-sm leading-relaxed dark:bg-gray-900">
            {record.comment}
          </p>
        )}

        <button
          onClick={() => router.push(`/records/${record.id}/edit`)}
          className="mt-6 w-full rounded-lg bg-green-700 p-3 text-sm font-bold text-white"
        >
          この記録を編集
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="mt-6 w-full rounded-lg border border-red-300 p-3 text-sm font-bold text-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
        >
          {deleting ? "削除中..." : "この記録を削除"}
        </button>
      </div>

      {/* 全画面表示 */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 z-10 text-3xl text-white"
          >
            ×
          </button>
          <div
            className="flex h-full w-full snap-x snap-mandatory items-center overflow-x-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {photoUrls.map((url, i) => (
              <div
                key={i}
                className="flex h-full w-full flex-none snap-center items-center justify-center p-2"
              >
                <img
                  src={url}
                  alt=""
                  onClick={() => setLightboxIndex(null)}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
