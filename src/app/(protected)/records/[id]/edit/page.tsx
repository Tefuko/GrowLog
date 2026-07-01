"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/image";
import { CARE_TAGS } from "@/lib/tags";
import type { Plant, RecordRow } from "@/lib/types";

type ExistingPhoto = { photo_path: string; url: string };

export default function EditRecordPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [kind, setKind] = useState<"care" | "cooking">("care");
  const [plantId, setPlantId] = useState("");
  const [cookingPlants, setCookingPlants] = useState<string[]>([]);
  const [tags, setTags] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState("");

  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]); // 削除する既存写真
  const [newFiles, setNewFiles] = useState<File[]>([]); // 追加する写真

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 初期読み込み
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
        supabase
          .from("plants")
          .select("*")
          .eq("archived", false)
          .order("created_at"),
      ]);
      setPlants(pl ?? []);
      const row = rec as RecordRow | null;
      if (row) {
        setKind(row.kind);
        setPlantId(row.plant_id ?? "");
        setCookingPlants(row.record_plants.map((rp) => rp.plant_id));
        setComment(row.comment ?? "");
        setTags({
          water_changed: row.water_changed,
          nutrient_added: row.nutrient_added,
          harvested: row.harvested,
          repotted: row.repotted,
          pinched: row.pinched,
          thinned: row.thinned,
        });
        const paths = [...row.record_photos]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((p) => p.photo_path);
        if (paths.length) {
          const { data: signed } = await supabase.storage
            .from("photos")
            .createSignedUrls(paths, 3600);
          setExistingPhotos(
            (signed ?? [])
              .filter((s) => s.signedUrl && s.path)
              .map((s) => ({ photo_path: s.path!, url: s.signedUrl! })),
          );
        }
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const toggleTag = (key: string) => setTags((t) => ({ ...t, [key]: !t[key] }));
  const toggleCookingPlant = (pid: string) =>
    setCookingPlants((c) =>
      c.includes(pid) ? c.filter((x) => x !== pid) : [...c, pid],
    );

  const remainingCount =
    existingPhotos.length - removedPaths.length + newFiles.length;

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    const room =
      5 - (existingPhotos.length - removedPaths.length) - newFiles.length;
    setNewFiles((prev) =>
      [...prev, ...picked].slice(0, prev.length + Math.max(0, room)),
    );
  };

  const handleSave = async () => {
    setError("");
    if (kind === "care" && !plantId) {
      setError("植物を選んでください");
      return;
    }
    setSaving(true);

    // 1. records 本体を更新（kind は変更しない）
    const { error: upErr } = await supabase
      .from("records")
      .update({
        plant_id: kind === "care" ? plantId : null,
        comment: comment.trim() || null,
        water_changed: !!tags.water_changed,
        nutrient_added: !!tags.nutrient_added,
        harvested: !!tags.harvested,
        repotted: !!tags.repotted,
        pinched: !!tags.pinched,
        thinned: !!tags.thinned,
      })
      .eq("id", id);
    if (upErr) {
      setSaving(false);
      setError("更新に失敗しました: " + upErr.message);
      return;
    }

    // 2. 料理の植物紐付けを作り直し（全削除→再挿入）
    if (kind === "cooking") {
      await supabase.from("record_plants").delete().eq("record_id", id);
      if (cookingPlants.length) {
        await supabase
          .from("record_plants")
          .insert(
            cookingPlants.map((pid) => ({ record_id: id, plant_id: pid })),
          );
      }
    }

    // 3. 削除した既存写真を Storage と DB から消す
    if (removedPaths.length) {
      await supabase.storage.from("photos").remove(removedPaths);
      await supabase
        .from("record_photos")
        .delete()
        .in("photo_path", removedPaths);
    }

    // 4. 既存写真の sort_order を振り直し
    const keep = existingPhotos.filter(
      (p) => !removedPaths.includes(p.photo_path),
    );
    for (let i = 0; i < keep.length; i++) {
      await supabase
        .from("record_photos")
        .update({ sort_order: i })
        .eq("photo_path", keep[i].photo_path);
    }

    // 5. 新規写真をアップロード（続きの sort_order で）
    for (let i = 0; i < newFiles.length; i++) {
      const blob = await compressImage(newFiles[i]);
      const path = `${kind === "care" ? plantId : "cooking"}/${id}/${crypto.randomUUID()}.jpg`;
      const { error: upPhotoErr } = await supabase.storage
        .from("photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (!upPhotoErr) {
        await supabase.from("record_photos").insert({
          record_id: id,
          photo_path: path,
          sort_order: keep.length + i,
        });
      }
    }

    setSaving(false);
    router.replace(`/records/${id}`);
  };

  if (loading) return <main className="p-6 text-gray-400">読み込み中...</main>;

  return (
    <main className="mx-auto max-w-md p-4 pb-24">
      <div className="flex items-center justify-between p-4">
        <p className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-600">
          {kind === "care" ? "🌿 世話の記録" : "🍳 料理の記録"}
        </p>
        <BackButton />
      </div>

      <div className="space-y-2 px-4">
        {/* 植物選択 */}
        {kind === "care" ? (
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-600">植物</p>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className="w-full rounded-lg border p-3"
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-600">
              使った植物（複数可・任意）
            </p>
            <div className="flex flex-wrap gap-2">
              {plants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleCookingPlant(p.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-bold ${
                    cookingPlants.includes(p.id)
                      ? "border-green-700 bg-green-700 text-white"
                      : "border-gray-200 text-gray-500"
                  }`}
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 写真：既存＋新規 */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-600">
            写真（最大5枚・現在{remainingCount}枚）
          </p>
          <div className="flex flex-wrap gap-2">
            {/* 既存（削除マークが付いていないもの） */}
            {existingPhotos
              .filter((p) => !removedPaths.includes(p.photo_path))
              .map((p) => (
                <div key={p.photo_path} className="relative">
                  <img
                    src={p.url}
                    alt=""
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => setRemovedPaths((r) => [...r, p.photo_path])}
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-black/70 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            {/* 新規 */}
            {newFiles.map((f, i) => (
              <div key={i} className="relative">
                <img
                  src={URL.createObjectURL(f)}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <button
                  onClick={() =>
                    setNewFiles((arr) => arr.filter((_, idx) => idx !== i))
                  }
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-black/70 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
            {/* 追加ボタン */}
            {remainingCount < 5 && (
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-green-700 text-2xl text-green-700">
                ＋
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onPickFiles}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* タグ（careのみ） */}
        {kind === "care" && (
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-600">
              お世話したこと
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CARE_TAGS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => toggleTag(t.key)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${
                    tags[t.key]
                      ? "border-green-700 bg-green-50 text-green-800"
                      : "border-gray-200 text-gray-500"
                  }`}
                >
                  <span className="text-lg">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* コメント */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-600">コメント</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="h-24 w-full resize-none rounded-lg border p-3"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-green-700 p-3 font-bold text-white disabled:opacity-50"
        >
          {saving ? "保存中..." : "更新する"}
        </button>
      </div>
    </main>
  );
}
