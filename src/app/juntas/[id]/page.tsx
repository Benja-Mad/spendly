"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { requestJson } from "@/lib/api";
import { formatClp } from "@/lib/utils";
import type { JuntaDetail, JuntaCategory, JuntaProduct, JuntaMember } from "@/lib/types";

type Tab = "productos" | "balances" | "miembros";

export default function JuntaDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<JuntaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("productos");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await requestJson<JuntaDetail>(`/api/juntas/${id}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar junta");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const copyCode = () => {
    if (data?.junta.inviteCode) {
      navigator.clipboard.writeText(data.junta.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-center dark:bg-red-950/30">
        <p className="text-sm text-red-700 dark:text-red-400">{error || "Junta no encontrada"}</p>
      </div>
    );
  }

  const { junta, members, categories, products, balances } = data;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{junta.name}</h1>
        {junta.description && (
          <p className="mt-1 text-sm text-zinc-500">{junta.description}</p>
        )}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={copyCode}
            className="cursor-pointer flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-mono text-zinc-700 transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
          </button>
          <span className="text-xs text-zinc-400">Comparte este código para invitar</span>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {([["productos", "Productos"], ["balances", "Balances"], ["miembros", "Miembros"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`cursor-pointer flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === key
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {tab === "productos" && (
        <ProductosTab
          categories={categories}
          products={products}
          members={members}
          juntaId={id}
          reload={load}
          setError={setError}
        />
      )}

      {tab === "balances" && (
        <BalancesTab balances={balances} totalPool={products.reduce((s, p) => s + p.amount * p.quantity, 0)} />
      )}

      {tab === "miembros" && (
        <MiembrosTab members={members} />
      )}
    </div>
  );
}

function ProductosTab({
  categories,
  products,
  members,
  juntaId,
  reload,
  setError,
}: {
  categories: JuntaCategory[];
  products: JuntaProduct[];
  members: JuntaMember[];
  juntaId: string;
  reload: () => void;
  setError: (e: string | null) => void;
}) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [catName, setCatName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<JuntaProduct | null>(null);
  const [showGlobalAdd, setShowGlobalAdd] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestJson(`/api/juntas/${juntaId}/categories`, {
        method: "POST",
        body: JSON.stringify({ name: catName }),
      });
      setCatName("");
      setShowAddCategory(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear categoría");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("¿Eliminar esta categoría? Los productos quedarán sin categoría.")) return;
    try {
      await requestJson(`/api/juntas/${juntaId}/categories?catId=${catId}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar categoría");
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await requestJson(`/api/juntas/${juntaId}/products?prodId=${prodId}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar producto");
    }
  };

  const getCategoryTotal = (catId: string) =>
    products
      .filter((p) => p.categoryId === catId)
      .reduce((sum, p) => sum + p.amount * p.quantity, 0);

  const totalAll = products.reduce((s, p) => s + p.amount * p.quantity, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Total: {formatClp(totalAll)}</p>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowGlobalAdd(true); setShowAddCategory(false); setEditingProduct(null); }}
            className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
          >
            + Producto
          </button>
          <button
            onClick={() => { setShowAddCategory(true); setShowGlobalAdd(false); setEditingProduct(null); }}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            + Categoría
          </button>
        </div>
      </div>

      {editingProduct && (
        <EditProductForm
          product={editingProduct}
          juntaId={juntaId}
          categories={categories}
          members={members}
          onClose={() => setEditingProduct(null)}
          onSuccess={async () => { setEditingProduct(null); await reload(); }}
          setError={setError}
        />
      )}

      {showGlobalAdd && (
        <AddProductGlobalForm
          juntaId={juntaId}
          categories={categories}
          members={members}
          onClose={() => setShowGlobalAdd(false)}
          onSuccess={async () => { setShowGlobalAdd(false); await reload(); }}
          setError={setError}
        />
      )}

      {showAddCategory && (
        <form onSubmit={handleAddCategory} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex gap-2">
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
              className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="Nombre de la categoría"
            />
            <button type="submit" disabled={submitting} className="cursor-pointer rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {submitting ? "..." : "Crear"}
            </button>
            <button type="button" onClick={() => setShowAddCategory(false)} className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {categories.map((cat) => {
        const catProducts = products.filter((p) => p.categoryId === cat.id);
        const isExpanded = expandedCat === cat.id;
        const catTotal = getCategoryTotal(cat.id);

        return (
          <div key={cat.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <button
              onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
              className="cursor-pointer flex w-full items-center justify-between px-5 py-4 text-left transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-zinc-900 dark:text-white">{cat.name}</h3>
                <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {catProducts.length} {catProducts.length === 1 ? "producto" : "productos"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-zinc-900 dark:text-white">{formatClp(catTotal)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                  className="cursor-pointer rounded-lg p-1 text-zinc-400 transition-all hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <svg
                  className={`h-5 w-5 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-zinc-100 px-5 pb-4 dark:border-zinc-800">
                {catProducts.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-400">Sin productos aún</p>
                ) : (
                  <div className="space-y-2 pt-3">
                    {catProducts.map((product) => (
                      <ProductRow key={product.id} product={product} onEdit={() => { setEditingProduct(product); setShowGlobalAdd(false); }} onDelete={() => handleDeleteProduct(product.id)} />
                    ))}
                  </div>
                )}
                <AddInlineProduct
                  juntaId={juntaId}
                  categoryId={cat.id}
                  members={members}
                  onSuccess={reload}
                  setError={setError}
                />
              </div>
            )}
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
              className="cursor-pointer flex w-full items-center justify-between px-5 py-4 text-left transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-zinc-900 dark:text-white">Sin categoría</h3>
                <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {uncategorized.length} productos
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-zinc-900 dark:text-white">
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
            {expandedCat === "none" && (
              <div className="border-t border-zinc-100 px-5 pb-4 dark:border-zinc-800">
                <div className="space-y-2 pt-3">
                  {uncategorized.map((product) => (
                    <ProductRow key={product.id} product={product} onEdit={() => { setEditingProduct(product); setShowGlobalAdd(false); }} onDelete={() => handleDeleteProduct(product.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {categories.length === 0 && products.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">Aún no hay categorías ni productos</p>
          <p className="mt-1 text-xs text-zinc-400">Crea una categoría para empezar</p>
        </div>
      )}
    </div>
  );
}

function ProductRow({ product, onEdit, onDelete }: { product: JuntaProduct; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
      {product.imageUrl && (
        <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
      )}
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
      <button
        onClick={onEdit}
        className="shrink-0 cursor-pointer rounded-lg p-1.5 text-zinc-400 transition-all hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      {product.link && (
        <a
          href={product.link}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-zinc-400 hover:text-emerald-500"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
      <button
        onClick={onDelete}
        className="shrink-0 cursor-pointer rounded-lg p-1.5 text-zinc-400 transition-all hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

function AddInlineProduct({
  juntaId,
  categoryId,
  members,
  onSuccess,
  setError,
}: {
  juntaId: string;
  categoryId: string;
  members: JuntaMember[];
  onSuccess: () => void;
  setError: (e: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestJson(`/api/juntas/${juntaId}/products`, {
        method: "POST",
        body: JSON.stringify({
          name,
          categoryId,
          assignedTo: assignedTo || undefined,
          amount: parseInt(amount, 10),
          quantity: parseInt(quantity, 10) || 1,
          link: link || undefined,
        }),
      });
      setName("");
      setAssignedTo("");
      setAmount("");
      setQuantity("1");
      setLink("");
      setOpen(false);
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar producto");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="cursor-pointer mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 py-2.5 text-sm text-zinc-500 transition-all hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-700 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Agregar producto
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          placeholder="Nombre del producto"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Precio"
          />
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Cant."
          />
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Responsable</option>
            {members.map((m) => (
              <option key={m.userId || m.id} value={m.userId}>
                {m.profile?.username || "Sin username"}
              </option>
            ))}
          </select>
        </div>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          placeholder="Link (opcional)"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={submitting} className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? "..." : "Agregar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function BalancesTab({
  balances,
  totalPool,
}: {
  balances: { userId: string; username: string | null; totalSpent: number; net: number }[];
  totalPool: number;
}) {
  const perPerson = balances.length > 0 ? totalPool / balances.length : 0;

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Resumen de la pool</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-zinc-500">Total</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white">{formatClp(totalPool)}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Por persona</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white">{formatClp(Math.round(perPerson))}</p>
          </div>
        </div>
      </div>

      <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">Balances individuales</h3>
      <div className="space-y-2">
        {balances.map((b) => (
          <div
            key={b.userId}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">{b.username || "Anónimo"}</p>
              <p className="text-xs text-zinc-500">Aportó: {formatClp(b.totalSpent)}</p>
            </div>
            <div className="text-right">
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

function EditProductForm({
  product,
  juntaId,
  categories,
  members,
  onClose,
  onSuccess,
  setError,
}: {
  product: JuntaProduct;
  juntaId: string;
  categories: JuntaCategory[];
  members: JuntaMember[];
  onClose: () => void;
  onSuccess: () => void;
  setError: (e: string | null) => void;
}) {
  const [name, setName] = useState(product.name);
  const [categoryId, setCategoryId] = useState(product.categoryId || "");
  const [assignedTo, setAssignedTo] = useState(product.assignedTo || "");
  const [amount, setAmount] = useState(String(product.amount));
  const [quantity, setQuantity] = useState(String(product.quantity));
  const [link, setLink] = useState(product.link || "");
  const [imageUrl, setImageUrl] = useState(product.imageUrl || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestJson(`/api/juntas/${juntaId}/products?prodId=${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          categoryId: categoryId || null,
          assignedTo: assignedTo || null,
          amount: parseInt(amount, 10),
          quantity: parseInt(quantity, 10) || 1,
          link: link || null,
          imageUrl: imageUrl || null,
        }),
      });
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al editar producto");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <p className="mb-3 text-sm font-medium text-amber-700 dark:text-amber-400">Editando producto</p>
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          placeholder="Nombre del producto"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Precio"
          />
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Cant."
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Sin categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Responsable</option>
            {members.map((m) => (
              <option key={m.userId || m.id} value={m.userId}>{m.profile?.username || "Sin username"}</option>
            ))}
          </select>
        </div>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          placeholder="Link (opcional)"
        />
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          placeholder="URL de imagen (opcional)"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={submitting} className="cursor-pointer rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? "Guardando..." : "Guardar cambios"}
        </button>
        <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function AddProductGlobalForm({
  juntaId,
  categories,
  members,
  onClose,
  onSuccess,
  setError,
}: {
  juntaId: string;
  categories: JuntaCategory[];
  members: JuntaMember[];
  onClose: () => void;
  onSuccess: () => void;
  setError: (e: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestJson(`/api/juntas/${juntaId}/products`, {
        method: "POST",
        body: JSON.stringify({
          name,
          categoryId: categoryId || undefined,
          assignedTo: assignedTo || undefined,
          amount: parseInt(amount, 10),
          quantity: parseInt(quantity, 10) || 1,
          link: link || undefined,
          imageUrl: imageUrl || undefined,
        }),
      });
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar producto");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <p className="mb-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">Nuevo producto</p>
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          placeholder="Nombre del producto"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Precio"
          />
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Cant."
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Sin categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Responsable</option>
            {members.map((m) => (
              <option key={m.userId || m.id} value={m.userId}>{m.profile?.username || "Sin username"}</option>
            ))}
          </select>
        </div>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          placeholder="Link (opcional)"
        />
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          placeholder="URL de imagen (opcional)"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={submitting} className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? "Agregando..." : "Agregar"}
        </button>
        <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}
