'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NewPlantPage() {
  const router = useRouter();
  const [icon, setIcon] = useState('🌿');
  const [name, setName] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('植物名を入力してください');
      return;
    }
    if (!icon.trim()) {
      setError('アイコンを入力してください');
      return;
    }
    setSaving(true);
    setError('');
    const { error } = await supabase.from('plants').insert({
      name: name.trim(),
      icon: icon.trim(),
      started_at: startedAt || null,
    });
    setSaving(false);
    if (error) {
      setError('保存に失敗しました: ' + error.message);
    } else {
      router.push('/');
    }
  };

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-xl font-bold">植物を追加</h1>

      <div>
        <p className="mb-2 text-sm font-semibold text-gray-600">アイコン（絵文字1文字）</p>
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          maxLength={4}
          placeholder="🌿"
          className="w-20 rounded-lg border p-3 text-center text-3xl"
        />
        <p className="mt-1 text-xs text-gray-500">
          スマホの絵文字キーボードから好きな絵文字を入力できます
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-gray-600">植物名</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="バジル"
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-gray-600">栽培開始日</p>
        <input
          type="date"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          className="w-full rounded-lg border p-3"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-green-700 p-3 font-bold text-white disabled:opacity-50"
      >
        {saving ? '保存中...' : '追加する'}
      </button>
    </main>
  );
}