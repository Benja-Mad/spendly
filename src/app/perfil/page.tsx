"use client";

import { useEffect, useState, useCallback } from "react";
import { requestJson } from "@/lib/api";
import type { Profile } from "@/lib/types";

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await requestJson<{ profile: Profile }>("/api/profile");
      setProfile(data.profile);
      setUsername(data.profile.username || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await requestJson("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ username: username || undefined }),
      });
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">Perfil</h1>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {saved && (
          <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            Perfil actualizado correctamente
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Username
            </label>
            <p className="mb-2 text-xs text-zinc-500">Este es tu nombre público. Los demás usuarios te verán con este nombre.</p>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="mi_username"
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <p className="mt-1 text-sm text-zinc-500">{profile?.email}</p>
            <p className="mt-1 text-xs text-zinc-400">El email es privado y no se muestra a otros usuarios</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Miembro desde
            </label>
            <p className="mt-1 text-sm text-zinc-500">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("es-CL") : "-"}
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
