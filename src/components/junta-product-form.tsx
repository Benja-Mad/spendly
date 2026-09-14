"use client";

import { useState } from "react";
import type { JuntaCategory, JuntaMember, JuntaProduct } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { notify } from "@/lib/toast";
import { Field, inputClass } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { FormBody, FormFooter, FormRow, FormSection } from "@/components/ui/form";
import { Select } from "@/components/ui/select";

interface Props {
  juntaId: string;
  categories: JuntaCategory[];
  members: JuntaMember[];
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  /** Si viene, se edita ese producto; si no, se crea uno nuevo. */
  product?: JuntaProduct;
  /** Fija la categoría y oculta el selector (formulario dentro de una categoría). */
  lockedCategoryId?: string;
}

/**
 * Antes existían tres formularios casi idénticos (AddInlineProduct,
 * AddProductGlobalForm y EditProductForm) con ~90% del código repetido.
 */
export function JuntaProductForm({
  juntaId,
  categories,
  members,
  onClose,
  onSuccess,
  product,
  lockedCategoryId,
}: Props) {
  const isEdit = Boolean(product);
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? lockedCategoryId ?? "");
  const [assignedTo, setAssignedTo] = useState(product?.assignedTo ?? "");
  const [amount, setAmount] = useState(product ? String(product.amount) : "");
  const [quantity, setQuantity] = useState(product ? String(product.quantity) : "1");
  const [link, setLink] = useState(product?.link ?? "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [submitting, setSubmitting] = useState(false);

  const total = (Number(amount) || 0) * (Number(quantity) || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      categoryId: (lockedCategoryId ?? categoryId) || null,
      assignedTo: assignedTo || null,
      amount: parseInt(amount, 10),
      quantity: parseInt(quantity, 10) || 1,
      link: link.trim() || null,
      imageUrl: imageUrl.trim() || null,
    };

    try {
      await notify.promise(
        (async () => {
          await requestJson(
            isEdit
              ? `/api/juntas/${juntaId}/products?prodId=${product!.id}`
              : `/api/juntas/${juntaId}/products`,
            { method: isEdit ? "PATCH" : "POST", body: JSON.stringify(payload) },
          );
          await onSuccess();
        })(),
        {
          loading: isEdit ? "Guardando producto..." : "Agregando producto...",
          success: isEdit ? `"${payload.name}" actualizado` : `"${payload.name}" agregado`,
          error: isEdit ? "No se pudo editar el producto." : "No se pudo agregar el producto.",
        },
      );
    } catch {
      // el toast ya reporta el error
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <FormBody>
        <FormRow columns={1}>
          <Field label="Nombre del producto">
            {(props) => (
              <input {...props} type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="Ej: Carne" />
            )}
          </Field>
        </FormRow>

        <FormRow>
          <Field label="Precio unitario">
            {(props) => <MoneyInput {...props} value={amount} onChange={setAmount} required />}
          </Field>
          <Field label="Cantidad" hint={total > 0 ? `Total: ${formatClp(total)}` : undefined}>
            {(props) => (
              <input
                {...props}
                className={inputClass}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1"
              />
            )}
          </Field>
        </FormRow>

        <FormRow>
          {!lockedCategoryId && (
            <Field label="Categoría">
              {(props) => (
                <Select
                  {...props}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Sin categoría"
                  options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
                />
              )}
            </Field>
          )}
          <Field label="Responsable" hint="Quien lo paga">
            {(props) => (
              <Select
                {...props}
                value={assignedTo}
                onChange={setAssignedTo}
                placeholder="Sin asignar"
                options={members.map((m) => ({ value: m.userId, label: m.profile?.username || "Sin username" }))}
              />
            )}
          </Field>
        </FormRow>

        <FormSection title="Enlaces" description="Ambos opcionales.">
          <FormRow>
            <Field label="Link del producto">
              {(props) => (
                <input {...props} type="url" value={link} onChange={(e) => setLink(e.target.value)} className={inputClass} placeholder="https://..." />
              )}
            </Field>
            <Field label="URL de imagen">
              {(props) => (
                <input {...props} type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputClass} placeholder="https://..." />
              )}
            </Field>
          </FormRow>
        </FormSection>
      </FormBody>

      <FormFooter
        onCancel={onClose}
        submitting={submitting}
        disabled={!name.trim() || !amount}
        label={isEdit ? "Guardar cambios" : "Agregar producto"}
        busyLabel="Guardando..."
      />
    </form>
  );
}
