"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useJuntas } from "@/lib/swr";
import { itemVariants, listVariants } from "@/lib/motion";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TransitionSwap } from "@/components/ui/transition-swap";
import { CreateJuntaModal, JoinJuntaModal } from "@/components/junta-modals";

export default function JuntasPage() {
  const { data, isLoading, mutate } = useJuntas();
  const juntas = data?.juntas ?? [];
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const loading = isLoading && juntas.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Juntas"
        description="Gastos compartidos con amigos: cada uno aporta, la app reparte."
        actions={
          juntas.length > 0 ? (
            <>
              <Button onClick={() => setShowJoin(true)}>Unirse con código</Button>
              <Button variant="primary" onClick={() => setShowCreate(true)}>+ Crear junta</Button>
            </>
          ) : undefined
        }
      />

      <TransitionSwap
        showSkeleton={loading}
        skeleton={
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-[148px] rounded-2xl" />)}
          </div>
        }
      >
        {juntas.length === 0 ? (
          /*
            Con la lista vacía, un estado que explica qué es una junta y ofrece
            los dos caminos. Antes era un recuadro punteado y los botones vivían
            arriba, lejos de donde estaba la atención.
          */
          <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-700">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <h2 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">Todavía no tienes juntas</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
              Una junta reparte los gastos de un asado, un viaje o un regalo entre varias personas y
              te dice quién le debe a quién.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={() => setShowCreate(true)}>+ Crear junta</Button>
              <Button onClick={() => setShowJoin(true)}>Unirse con código</Button>
            </div>
          </div>
        ) : (
          /*
            Dos columnas y una tarjeta con contenido real. Con una sola junta,
            una lista de filas anchas dejaba una franja enorme vacía a la
            derecha y parecía que faltaba algo.
          */
          <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2">
            {juntas.map((junta) => (
              <motion.div key={junta.id} variants={itemVariants} layout>
                <Link
                  href={`/juntas/${junta.id}`}
                  prefetch
                  className="group flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold text-zinc-900 dark:text-white">{junta.name}</h2>
                      <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-emerald-500 dark:text-zinc-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                      {junta.description || "Sin descripción"}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    <span className="text-xs text-zinc-400">Código</span>
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {junta.inviteCode}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* Crear otra junta vive al final de la lista que extiende. */}
            <motion.div variants={itemVariants} layout>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex h-full min-h-[148px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-500 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-700 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Crear otra junta
              </button>
            </motion.div>
          </motion.div>
        )}
      </TransitionSwap>

      <AnimatePresence>
        {showCreate && (
          <CreateJuntaModal key="create-junta" onClose={() => setShowCreate(false)} onCreated={async () => { await mutate(); }} />
        )}
        {showJoin && (
          <JoinJuntaModal key="join-junta" onClose={() => setShowJoin(false)} onJoined={async () => { await mutate(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
