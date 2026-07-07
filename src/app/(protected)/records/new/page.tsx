"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/image";
import { CARE_TAGS } from "@/lib/tags";
import type { Plant } from "@/lib/types";

type Kind = "care" | "cooking";

export default function NewRecordPage() {
  const router = useRouter();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [kind, setKind] = useState<Kind>("care");
  const [recordedAt, setRecordedAt] = useState("");
  const [plantId, setPlantId] = useState<string>(""); // 世話用：単一
  const [cookingPlants, setCookingPlants] = useState<string[]>([]); // 料理用：複数
  const [tags, setTags] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("plants")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setPlants(data ?? []);
        if (data?.length) setPlantId(data[0].id);
      });
  }, []);

  useEffect(() => {
    // 現在の日本時間を datetime-local 形式（YYYY-MM-DDTHH:mm）で初期値に
    const now = new Date();
    const jst = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now); // "2026-06-30 22:15" の形
    setRecordedAt(jst.replace(" ", "T"));
  }, []);

  const toggleTag = (key: string) => setTags((t) => ({ ...t, [key]: !t[key] }));
  const toggleCookingPlant = (id: string) =>
    setCookingPlants((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : [...c, id],
    );

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, 5)); // 最大5枚
  };
  const removeFile = (i: number) =>
    setFiles((f) => f.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setError("");
    if (kind === "care" && !plantId) {
      setError("植物を選んでください");
      return;
    }
    setSaving(true);

    // 1. records を作成
    const { data: rec, error: recErr } = await supabase
      .from("records")
      .insert({
        kind,
        recorded_at: recordedAt
          ? new Date(recordedAt).toISOString()
          : undefined,
        plant_id: kind === "care" ? plantId : null,
        comment: comment.trim() || null,
        water_changed: !!tags.water_changed,
        nutrient_added: !!tags.nutrient_added,
        harvested: !!tags.harvested,
        repotted: !!tags.repotted,
        pinched: !!tags.pinched,
        thinned: !!tags.thinned,
      })
      .select()
      .single();

    if (recErr || !rec) {
      setSaving(false);
      setError("保存に失敗しました: " + recErr?.message);
      return;
    }

    // 2. 料理なら植物の紐付け
    if (kind === "cooking" && cookingPlants.length) {
      await supabase
        .from("record_plants")
        .insert(
          cookingPlants.map((pid) => ({ record_id: rec.id, plant_id: pid })),
        );
    }

    // 3. 写真をアップロード
    for (let i = 0; i < files.length; i++) {
      const blob = await compressImage(files[i]);
      const path = `${kind === "care" ? plantId : "cooking"}/${rec.id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, blob, {
          contentType: "image/jpeg",
        });
      if (!upErr) {
        await supabase.from("record_photos").insert({
          record_id: rec.id,
          photo_path: path,
          sort_order: i,
        });
      }
    }

    setSaving(false);
    router.push("/");
  };

  return (
    <main className="mx-auto max-w-md pb-24">
      <div className="flex justify-end p-4">
        <BackButton />
      </div>

      <div className="space-y-2 px-4">
        {/* 世話/料理 切替 */}
        <div className="flex gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {(["care", "cooking"] as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${
                kind === k
                  ? "bg-white text-green-800 shadow dark:bg-gray-700 dark:text-green-300"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {k === "care" ? "🌿 世話" : "🍳 料理"}
            </button>
          ))}
        </div>

        {/* 記録日時 */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">記録日時</p>
          <input
            type="datetime-local"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            className="block w-full box-border rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        {/* 植物選択 */}
        {kind === "care" ? (
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">植物</p>
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
            <p className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
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
                      : "border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 写真 */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
            写真（最大5枚・任意）
          </p>
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative">
                <img
                  src={URL.createObjectURL(f)}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-black/70 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
            {files.length < 5 && (
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

        {/* 世話タグ（careのみ） */}
        {kind === "care" && (
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
              お世話したこと
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CARE_TAGS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => toggleTag(t.key)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${
                    tags[t.key]
                      ? "border-green-700 bg-green-50 text-green-800 dark:border-green-500 dark:bg-green-950 dark:text-green-300"
                      : "border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
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
          <p className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">コメント</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="気づいたこと、成長の様子など…"
            className="h-24 w-full resize-none rounded-lg border p-3"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-green-700 p-3 font-bold text-white disabled:opacity-50"
        >
          {saving ? "保存中..." : "記録する"}
        </button>
      </div>
    </main>
  );
}
