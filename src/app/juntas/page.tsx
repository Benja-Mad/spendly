"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useJuntas } from "@/lib/swr";
import { itemVariants, listVariants } from "@/lib/motion";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TransitionSwap } from "@/components/ui/transition-swap";
import { CreateJuntaModal, JoinJuntaModal } from "@/components/junta-modals";
import { useTilt } from "@/components/ui/tilt";

export default function JuntasPage() {
  const { data, isLoading, mutate } = useJuntas();
  const juntas = data?.juntas ?? [];
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const loading = isLoading && !data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Juntas"
        description="Cada uno aporta y la app reparte"
      />

      {/*
        Sin juntas, el estado vacío carga las dos acciones: es el único sitio
        donde aparecen, porque no hay sección a la que colgarlas todavía.
      */}
      {!loading && juntas.length === 0 && (
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
      )}

      {(loading || juntas.length > 0) && (
        <section>
          {/*
            Unirse cuelga de la sección, como "+ Tarjeta" en Tarjetas. Crear no
            está aquí a propósito: vive al final de la grilla, en la tarjeta
            punteada que la extiende. Tenerlo en los dos sitios sería la misma
            acción dos veces en la misma pantalla.
          */}
          <SectionHeader
            title="Tus juntas"
            action={<Button size="sm" onClick={() => setShowJoin(true)}>Unirse con código</Button>}
          />
          <TransitionSwap
            showSkeleton={loading}
            skeleton={
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => <JuntaCardSkeleton key={i} />)}
              </div>
            }
          >
            {/*
              Dos columnas y una tarjeta con contenido real. Con una sola junta,
              una lista de filas anchas dejaba una franja enorme vacía a la
              derecha y parecía que faltaba algo.
            */}
            <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2">
              {juntas.map((junta) => (
                <motion.div key={junta.id} variants={itemVariants} layout>
                  <JuntaCard junta={junta} />
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
          </TransitionSwap>
        </section>
      )}

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

/*
 * Color por junta, estable: derivado del id, así la misma junta se ve siempre
 * igual y dos juntas se distinguen de un vistazo. El set es distinto al de las
 * cuentas a propósito: ahí el color significa el tipo de cuenta, aquí solo
 * identifica, y reutilizarlo daría a entender una equivalencia que no existe.
 */
const JUNTA_GRADIENTS = [
  "from-violet-500 to-purple-700",
  "from-sky-500 to-blue-700",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-700",
  "from-cyan-500 to-teal-700",
];

function juntaGradient(id: string): string {
  const seed = id.replace(/[^0-9a-f]/gi, "").slice(0, 8) || "0";
  return JUNTA_GRADIENTS[(parseInt(seed, 16) || 0) % JUNTA_GRADIENTS.length];
}

/**
 * La junta como elemento principal de la página, con el mismo peso visual que
 * una tarjeta en Tarjetas: color propio y la misma inclinación al pasar el
 * cursor. Antes era un recuadro blanco más y la vista entera quedaba sin un
 * punto donde apoyar la vista.
 */
function JuntaCard({ junta }: { junta: { id: string; name: string; description: string | null; inviteCode: string } }) {
  const tilt = useTilt();

  return (
    <Link
      href={`/juntas/${junta.id}`}
      prefetch
      aria-label={`Abrir la junta ${junta.name}`}
      className={`card-tilt group relative flex h-full min-h-[148px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${juntaGradient(junta.id)} p-5 text-white shadow-lg hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-black`}
      {...tilt}
    >
      <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate font-semibold">{junta.name}</h3>
          <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-white/60 transition-colors group-hover:text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-white/75">
          {junta.description || "Sin descripción"}
        </p>
      </div>

      <div className="relative mt-6 flex items-center gap-2 border-t border-white/20 pt-4">
        <span className="text-xs text-white/60">Código</span>
        <span className="rounded-md bg-white/20 px-2 py-0.5 font-mono text-xs backdrop-blur-sm">
          {junta.inviteCode}
        </span>
      </div>
    </Link>
  );
}

/** Misma caja que la tarjeta de junta: p-5, título, descripción y pie con el código. */
function JuntaCardSkeleton() {
  return (
    <div className="flex h-full min-h-[148px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-full" />
      </div>
      <div className="mt-6 flex items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
    </div>
  );
}
