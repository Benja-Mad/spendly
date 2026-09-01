"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { requestJson } from "@/lib/api";
import type { Junta } from "@/lib/types";

export default function JuntasPage() {
  const [juntas, setJuntas] = useState<Junta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [creatingName, setCreatingName] = useState("");
  const [creatingDesc, setCreatingDesc] = useState("");
  const [joiningCode, setJoiningCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await requestJson<{ juntas: Junta[] }>("/api/juntas");
      setJuntas(data.juntas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar juntas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestJson("/api/juntas", {
        method: "POST",
        body: JSON.stringify({ name: creatingName, description: creatingDesc || undefined }),
      });
      setCreatingName("");
      setCreatingDesc("");
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear junta");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestJson("/api/juntas/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode: joiningCode }),
      });
      setJoiningCode("");
      setShowJoin(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al unirse");
    } finally {
      setSubmitting(false);
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
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Juntas</h1>
          <p className="mt-1 text-sm text-zinc-500">Gestiona finanzas de juntadas con amigos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false); }}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Unirse con código
          </button>
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false); }}
            className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
          >
            + Crear junta
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Crear nueva junta</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nombre</label>
              <input
                type="text"
                value={creatingName}
                onChange={(e) => setCreatingName(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="Ej: Asado del viernes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Descripción (opcional)</label>
              <input
                type="text"
                value={creatingDesc}
                onChange={(e) => setCreatingDesc(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="Ej: Asado en casa de Juan"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
              >
                {submitting ? "Creando..." : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {showJoin && (
        <form onSubmit={handleJoin} className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Unirse a una junta</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Código de invitación</label>
              <input
                type="text"
                value={joiningCode}
                onChange={(e) => setJoiningCode(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="Ej: a1b2c3d4"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
              >
                {submitting ? "Uniéndose..." : "Unirse"}
              </button>
              <button
                type="button"
                onClick={() => setShowJoin(false)}
                className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {juntas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="mt-4 text-sm text-zinc-500">No tienes juntas ainda</p>
          <p className="mt-1 text-xs text-zinc-400">Crea una junta o únete con un código</p>
        </div>
      ) : (
        <div className="space-y-3">
          {juntas.map((junta) => (
            <Link
              key={junta.id}
              href={`/juntas/${junta.id}`}
              className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">{junta.name}</h3>
                  {junta.description && (
                    <p className="mt-1 text-sm text-zinc-500">{junta.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-zinc-100 px-2.5 py-1 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {junta.inviteCode}
                  </span>
                  <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
