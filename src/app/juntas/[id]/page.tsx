"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { requestJson } from "@/lib/api";
import { useJunta } from "@/lib/swr";
import { notify } from "@/lib/toast";
import { collapseVariants, itemVariants, listVariants } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { TransitionSwap } from "@/components/ui/transition-swap";
import { JuntaProductForm } from "@/components/junta-product-form";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { Button, IconButton } from "@/components/ui/button";
import { CreateJuntaCategoryModal } from "@/components/junta-modals";
import { formatClp } from "@/lib/utils";
import type { JuntaBalance, JuntaCategory, JuntaProduct, JuntaMember } from "@/lib/types";

type Tab = "productos" | "balances" | "miembros";

const TABS: readonly (readonly [Tab, string])[] = [
  ["productos", "Productos"],
  ["balances", "Balances"],
  ["miembros", "Miembros"],
] as const;

export default function JuntaDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, error, isLoading, mutate } = useJunta(id);
  const [tab, setTab] = useState<Tab>("productos");
  const [copied, setCopied] = useState(false);
  const load = mutate;

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const copyCode = async () => {
    const code = data?.junta.inviteCode;
    if (!code) return;
    try {
      // clipboard falla en contextos no seguros (http fuera de localhost).
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error(new Error("No se pudo copiar. Selecciona el código manualmente."));
    }
  };

  if (!isLoading && !data) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-center dark:bg-red-950/30">
        <p className="text-sm text-red-700 dark:text-red-400">
          {error ? "No se pudo cargar la junta." : "Junta no encontrada"}
        </p>
      </div>
    );
  }

  const loading = isLoading && !data;
  const junta = data?.junta;

  return (
    <div>
      <Link href="/juntas" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver a juntas
      </Link>
      <TransitionSwap
        showSkeleton={loading}
        skeleton={
          <div className="mb-6">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-72" />
            <div className="mt-3 flex items-center gap-3">
              <Skeleton className="h-8 w-28 rounded-xl" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        }
      >
        {junta && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{junta.name}</h1>
            {junta.description && (
              <p className="mt-1 text-sm text-zinc-500">{junta.description}</p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                onClick={copyCode}
                aria-label={copied ? "Código copiado" : "Copiar código de invitación"}
                title="Copiar código de invitación"
                className="font-mono"
              >
                <span>{junta.inviteCode}</span>
                {copied ? (
                  <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </Button>
              <span className="text-xs text-zinc-400">Comparte este código para invitar</span>
            </div>
          </div>
        )}
      </TransitionSwap>

      <div role="tablist" aria-label="Secciones de la junta" className="mb-6 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map(([key, label], index) => (
          <button
            key={key}
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={(event) => {
              // Flechas para moverse entre tabs, como espera un lector de pantalla.
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              event.preventDefault();
              const delta = event.key === "ArrowRight" ? 1 : -1;
              const next = TABS[(index + delta + TABS.length) % TABS.length][0];
              setTab(next);
              document.getElementById(`tab-${next}`)?.focus();
            }}
            className={`flex-1 cursor-pointer rounded-lg px-2 py-2 text-sm font-medium transition-all sm:px-4 ${
              tab === key
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "text-zinc-600 hover:text-zinc-900 dark:hover:text-white dark:text-zinc-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <TransitionSwap
        showSkeleton={loading}
        skeleton={
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        }
      >
        {data && (
          <>
            <div role="tabpanel" id="panel-productos" aria-labelledby="tab-productos" hidden={tab !== "productos"}>
              <ProductosTab
                categories={data.categories}
                products={data.products}
                members={data.members}
                juntaId={id}
                reload={load}
              />
            </div>

            <div role="tabpanel" id="panel-balances" aria-labelledby="tab-balances" hidden={tab !== "balances"}>
              <BalancesTab balances={data.balances} memberCount={data.members.length} />
            </div>

            <div role="tabpanel" id="panel-miembros" aria-labelledby="tab-miembros" hidden={tab !== "miembros"}>
              <MiembrosTab members={data.members} />
            </div>
          </>
        )}
      </TransitionSwap>
    </div>
  );
}

function ProductosTab({
  categories,
  products,
  members,
  juntaId,
  reload,
}: {
  categories: JuntaCategory[];
  products: JuntaProduct[];
  members: JuntaMember[];
  juntaId: string;
  reload: () => void;
}) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingProduct, setEditingProduct] = useState<JuntaProduct | null>(null);
  // null = cerrado; string = modal abierto con esa categoría preseleccionada
  const [addingProductIn, setAddingProductIn] = useState<string | null | undefined>(undefined);
  const confirm = useConfirm();

  const handleDeleteCategory = async (catId: string, catNameLabel: string) => {
    const ok = await confirm({
      title: `¿Eliminar la categoría "${catNameLabel}"?`,
      description: "Sus productos quedarán en «Sin categoría». No se borra ningún producto.",
    });
    if (!ok) return;
    await notify.promise(
      (async () => {
        await requestJson(`/api/juntas/${juntaId}/categories?catId=${catId}`, { method: "DELETE" });
        await reload();
      })(),
      { loading: "Eliminando categoría...", success: "Categoría eliminada" },
    );
  };

  const handleDeleteProduct = async (product: JuntaProduct) => {
    const ok = await confirm({
      title: `¿Eliminar "${product.name}"?`,
      description: `${formatClp(product.amount * product.quantity)} · se recalcularán los balances.`,
    });
    if (!ok) return;
    await notify.promise(
      (async () => {
        await requestJson(`/api/juntas/${juntaId}/products?prodId=${product.id}`, { method: "DELETE" });
        await reload();
      })(),
      { loading: "Eliminando producto...", success: "Producto eliminado" },
    );
  };

  const getCategoryTotal = (catId: string) =>
    products
      .filter((p) => p.categoryId === catId)
      .reduce((sum, p) => sum + p.amount * p.quantity, 0);

  const totalAll = products.reduce((s, p) => s + p.amount * p.quantity, 0);

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        Total del pozo: <strong className="tabular-nums text-zinc-900 dark:text-white">{formatClp(totalAll)}</strong>
      </p>

      {categories.map((cat) => {
        const catProducts = products.filter((p) => p.categoryId === cat.id);
        const isExpanded = expandedCat === cat.id;
        const catTotal = getCategoryTotal(cat.id);

        return (
          <div key={cat.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {/* El boton de eliminar es hermano del de expandir: anidar un <button>
                dentro de otro es HTML invalido y rompe el teclado. */}
            <div className="flex items-center transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <button
                type="button"
                onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                aria-expanded={isExpanded}
                aria-controls={`cat-panel-${cat.id}`}
                /* min-w-0: sin él este flex-1 no bajaba de su ancho mínimo y
                   empujaba el botón de eliminar fuera de la fila, que en
                   pantalla de teléfono quedaba cortado por el borde. */
                className="cursor-pointer flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <h3 className="truncate font-semibold text-zinc-900 dark:text-white">{cat.name}</h3>
                  {/*
                    En angosto desaparece: el recuento es dato secundario y el
                    nombre de la categoría no. Con la píldora puesta, el título
                    se quedaba con ~120 px y se truncaba; sin ella tiene el doble.
                  */}
                  <span className="hidden shrink-0 rounded-lg bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 sm:inline dark:bg-zinc-800 dark:text-zinc-400">
                    {catProducts.length} {catProducts.length === 1 ? "producto" : "productos"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold tabular-nums text-zinc-900 dark:text-white">{formatClp(catTotal)}</span>
                  <svg
                    className={`h-5 w-5 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                aria-label={`Eliminar categoría ${cat.name}`}
                title={`Eliminar categoría ${cat.name}`}
                className="cursor-pointer mr-4 rounded-lg p-1 text-zinc-400 transition-all hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                variants={collapseVariants} initial="hidden" animate="visible" exit="exit"
                id={`cat-panel-${cat.id}`}
                className="overflow-hidden"
              >
                <div className="border-t border-zinc-100 px-5 pb-4 dark:border-zinc-800">
                {catProducts.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-400">Sin productos aún</p>
                ) : (
                  <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-2 pt-3">
                    <AnimatePresence initial={false}>
                      {catProducts.map((product) => (
                        <motion.div key={product.id} variants={itemVariants} exit="exit" layout className="overflow-hidden">
                          <ProductRow product={product} onEdit={() => setEditingProduct(product)} onDelete={() => handleDeleteProduct(product)} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
                <Button variant="dashed" block className="mt-3" onClick={() => setAddingProductIn(cat.id)}>
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar producto a {cat.name}
                </Button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        );
      })}

      {(() => {
        const uncategorized = products.filter((p) => !p.categoryId);
        if (uncategorized.length === 0) return null;
        return (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <button
              onClick={() => setExpandedCat(expandedCat === "none" ? null : "none")}
              className="cursor-pointer flex w-full min-w-0 items-center justify-between gap-3 px-5 py-4 text-left transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <h3 className="truncate font-semibold text-zinc-900 dark:text-white">Sin categoría</h3>
                <span className="hidden shrink-0 rounded-lg bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 sm:inline dark:bg-zinc-800 dark:text-zinc-400">
                  {uncategorized.length} {uncategorized.length === 1 ? "producto" : "productos"}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-white">
                  {formatClp(uncategorized.reduce((s, p) => s + p.amount * p.quantity, 0))}
                </span>
                <svg
                  className={`h-5 w-5 text-zinc-400 transition-transform ${expandedCat === "none" ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            <AnimatePresence initial={false}>
            {expandedCat === "none" && (
              <motion.div
                variants={collapseVariants} initial="hidden" animate="visible" exit="exit"
                className="overflow-hidden"
              >
                <div className="border-t border-zinc-100 px-5 pb-4 dark:border-zinc-800">
                <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-2 pt-3">
                  <AnimatePresence initial={false}>
                    {uncategorized.map((product) => (
                      <motion.div key={product.id} variants={itemVariants} exit="exit" layout className="overflow-hidden">
                        <ProductRow product={product} onEdit={() => setEditingProduct(product)} onDelete={() => handleDeleteProduct(product)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        );
      })()}

      {categories.length === 0 && products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">Aún no hay nada en esta junta</p>
          <p className="mt-1 text-xs text-zinc-400">Empieza creando una categoría, o agrega un producto suelto</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="primary" onClick={() => setShowAddCategory(true)}>+ Categoría</Button>
            <Button onClick={() => setAddingProductIn(null)}>+ Producto</Button>
          </div>
        </div>
      ) : (
        // Extender la lista desde el final de la lista, con el mismo lenguaje
        // que "Agregar producto a X". Antes esto era un par de botones sueltos
        // arriba, duplicando acciones que ya existían dentro de cada categoría.
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="dashed" size="sm" onClick={() => setShowAddCategory(true)}>
            + Nueva categoría
          </Button>
          <Button variant="dashed" size="sm" onClick={() => setAddingProductIn(null)}>
            + Producto sin categoría
          </Button>
        </div>
      )}

      <AnimatePresence>
        {showAddCategory && (
          <CreateJuntaCategoryModal
            key="add-cat"
            juntaId={juntaId}
            onClose={() => setShowAddCategory(false)}
            onCreated={async () => { await reload(); }}
          />
        )}
        {addingProductIn !== undefined && (
          <Modal key="add-product" title="Nuevo producto" onClose={() => setAddingProductIn(undefined)}>
            <JuntaProductForm
                juntaId={juntaId}
                categories={categories}
                members={members}
                lockedCategoryId={addingProductIn ?? undefined}
                onClose={() => setAddingProductIn(undefined)}
                onSuccess={async () => { setAddingProductIn(undefined); await reload(); }}
              />
          </Modal>
        )}
        {editingProduct && (
          <Modal key="edit-product" title="Editar producto" onClose={() => setEditingProduct(null)}>
            <JuntaProductForm
                product={editingProduct}
                juntaId={juntaId}
                categories={categories}
                members={members}
                onClose={() => setEditingProduct(null)}
                onSuccess={async () => { setEditingProduct(null); await reload(); }}
              />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductThumb({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      src={src}
      alt={name}
      width={40}
      height={40}
      unoptimized
      onError={() => setFailed(true)}
      className="h-10 w-10 shrink-0 rounded-lg object-cover"
    />
  );
}

function ProductRow({ product, onEdit, onDelete }: { product: JuntaProduct; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
      {product.imageUrl && <ProductThumb src={product.imageUrl} name={product.name} />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-900 dark:text-white truncate">{product.name}</span>
          {product.quantity > 1 && (
            <span className="shrink-0 rounded-md bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
              x{product.quantity}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate">
          {product.assignedUser?.username
            ? `${product.assignedUser.username}`
            : product.user?.username || "Sin responsable"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold text-zinc-900 dark:text-white">{formatClp(product.amount * product.quantity)}</p>
        {product.quantity > 1 && (
          <p className="text-xs text-zinc-500">{formatClp(product.amount)} c/u</p>
        )}
      </div>
      <IconButton label={`Editar ${product.name}`} onClick={onEdit}>
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </IconButton>
      {product.link && (
        <a
          href={product.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir enlace de ${product.name} en una pestaña nueva`}
          title={`Abrir enlace de ${product.name}`}
          className="shrink-0 text-zinc-400 hover:text-emerald-500"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
      <IconButton label={`Eliminar ${product.name}`} tone="danger" onClick={onDelete}>
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </IconButton>
    </div>
  );
}


function BalancesTab({
  balances,
  memberCount,
}: {
  balances: JuntaBalance[];
  memberCount: number;
}) {
  // El total se deriva de los mismos balances que manda la API. Antes la UI lo
  // recalculaba por su cuenta desde `products`, asi que "Total" y "Por persona"
  // podian no cuadrar con los "net" de abajo.
  const totalPool = balances.reduce((sum, b) => sum + b.totalSpent, 0);
  const perPerson = memberCount > 0 ? totalPool / memberCount : 0;

  if (balances.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
        <p className="text-sm text-zinc-500">Todavía no hay gastos que repartir</p>
        <p className="mt-1 text-xs text-zinc-400">Agrega productos para ver los balances</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Resumen del pozo</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-zinc-500">Total</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white">{formatClp(totalPool)}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Por persona</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white">{formatClp(Math.round(perPerson))}</p>
            <p className="text-xs text-zinc-400">entre {memberCount} {memberCount === 1 ? "miembro" : "miembros"}</p>
          </div>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">Balances individuales</h2>
      <div className="space-y-2">
        {balances.map((b) => (
          <div
            key={b.userId}
            className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-900 dark:text-white">{b.username || "Anónimo"}</p>
              <p className="text-xs text-zinc-500">Aportó: {formatClp(b.totalSpent)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={`font-semibold ${
                  b.net > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : b.net < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-500"
                }`}
              >
                {b.net > 0 ? "+" : ""}{formatClp(Math.round(b.net))}
              </p>
              <p className="text-xs text-zinc-500">
                {b.net > 0 ? "Le deben" : b.net < 0 ? "Debe" : "Cuadra"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiembrosTab({
  members,
}: {
  members: { userId: string; role: string; profile?: { username: string | null; email: string } | null }[];
}) {
  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">Miembros ({members.length})</h3>
      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.userId}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
                {(m.profile?.username || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {m.profile?.username || "Sin username"}
                </p>
              </div>
            </div>
            {m.role === "owner" && (
              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Creador
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


