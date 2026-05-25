"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Film,
  FolderPlus,
  ImagePlus,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Tag,
  Trash2,
  X
} from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { ErrorPanel, LoadingPanel } from "@/components/StatusPanels";
import { useCatalogData } from "@/hooks/useCatalogData";
import { supabase } from "@/lib/supabase/client";
import type { Availability, ProductWithRelations } from "@/lib/types";
import { createSlug, formatCurrency, splitLines, splitTags } from "@/lib/utils";

type ProductFormState = {
  name: string;
  sku: string;
  description: string;
  highlights: string;
  mrp_price: string;
  offered_price: string;
  pack_size: string;
  availability: Availability;
  tags: string;
  is_active: boolean;
};

const emptyForm: ProductFormState = {
  name: "",
  sku: "",
  description: "",
  highlights: "",
  mrp_price: "",
  offered_price: "",
  pack_size: "",
  availability: "In Stock",
  tags: "",
  is_active: true
};

const availabilityOptions: Availability[] = ["In Stock", "Limited", "On Order", "Unavailable"];

export function AdminListingManager() {
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();
  const { data, loading, error, refresh } = useCatalogData(accessToken);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [selectedSecondSubcategoryId, setSelectedSecondSubcategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSecondSubcategoryName, setNewSecondSubcategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const editId = searchParams.get("edit");

  const brandOptions = useMemo(
    () => data?.brands.filter((brand) => brand.main_category_id === selectedCategoryId) ?? [],
    [data, selectedCategoryId]
  );

  const subcategoryOptions = useMemo(
    () => data?.subcategories.filter((subcategory) => subcategory.brand_id === selectedBrandId) ?? [],
    [data, selectedBrandId]
  );

  const secondSubcategoryOptions = useMemo(
    () =>
      data?.secondSubcategories.filter((subcategory) => subcategory.subcategory_id === selectedSubcategoryId) ?? [],
    [data, selectedSubcategoryId]
  );

  function updateForm<Key extends keyof ProductFormState>(key: Key, value: ProductFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setImageUrls([]);
    setVideoUrls([]);
    setMessage(null);
    setFormError(null);
    setMediaError(null);
  }

  function startEdit(product: ProductWithRelations) {
    setEditingId(product.id);
    setSelectedCategoryId(product.main_category_id);
    setSelectedBrandId(product.brand_id);
    setSelectedSubcategoryId(product.subcategory_id);
    setSelectedSecondSubcategoryId(product.second_subcategory_id ?? "");
    setImageUrls(product.image_urls);
    setVideoUrls(product.video_urls);
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      description: product.description,
      highlights: product.highlights.join("\n"),
      mrp_price: String(product.mrp_price),
      offered_price: product.offered_price ? String(product.offered_price) : "",
      pack_size: product.pack_size ?? "",
      availability: product.availability,
      tags: product.tags.join(", "),
      is_active: product.is_active
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (!data || !editId) return;
    const product = data.products.find((item) => item.id === editId);
    if (product) startEdit(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, editId]);

  async function createCategory() {
    if (!supabase || !data || !newCategoryName.trim()) return;

    setSaving(true);
    setFormError(null);
    const { data: inserted, error: createError } = await supabase
      .from("main_categories")
      .insert({
        name: newCategoryName.trim(),
        slug: createSlug(newCategoryName),
        sort_order: data.categories.length + 1
      })
      .select("id")
      .single();

    setSaving(false);
    if (createError) {
      setFormError(createError.message);
      return;
    }

    setSelectedCategoryId(inserted.id);
    setNewCategoryName("");
    await refresh();
  }

  async function createBrand() {
    if (!supabase || !data || !selectedCategoryId || !newBrandName.trim()) return;

    setSaving(true);
    setFormError(null);
    const existingCount = data.brands.filter((brand) => brand.main_category_id === selectedCategoryId).length;
    const { data: inserted, error: createError } = await supabase
      .from("brands")
      .insert({
        main_category_id: selectedCategoryId,
        name: newBrandName.trim(),
        slug: createSlug(newBrandName),
        sort_order: existingCount + 1
      })
      .select("id")
      .single();

    setSaving(false);
    if (createError) {
      setFormError(createError.message);
      return;
    }

    setSelectedBrandId(inserted.id);
    setNewBrandName("");
    await refresh();
  }

  async function createSubcategory() {
    if (!supabase || !data || !selectedBrandId || !newSubcategoryName.trim()) return;

    setSaving(true);
    setFormError(null);
    const existingCount = data.subcategories.filter((subcategory) => subcategory.brand_id === selectedBrandId).length;
    const { data: inserted, error: createError } = await supabase
      .from("subcategories")
      .insert({
        brand_id: selectedBrandId,
        name: newSubcategoryName.trim(),
        slug: createSlug(newSubcategoryName),
        sort_order: existingCount + 1
      })
      .select("id")
      .single();

    setSaving(false);
    if (createError) {
      setFormError(createError.message);
      return;
    }

    setSelectedSubcategoryId(inserted.id);
    setSelectedSecondSubcategoryId("");
    setNewSubcategoryName("");
    await refresh();
  }

  async function createSecondSubcategory() {
    if (!supabase || !data || !selectedSubcategoryId || !newSecondSubcategoryName.trim()) return;

    setSaving(true);
    setFormError(null);
    const existingCount = data.secondSubcategories.filter(
      (subcategory) => subcategory.subcategory_id === selectedSubcategoryId
    ).length;
    const { data: inserted, error: createError } = await supabase
      .from("second_subcategories")
      .insert({
        subcategory_id: selectedSubcategoryId,
        name: newSecondSubcategoryName.trim(),
        slug: createSlug(newSecondSubcategoryName),
        sort_order: existingCount + 1
      })
      .select("id")
      .single();

    setSaving(false);
    if (createError) {
      setFormError(createError.message);
      return;
    }

    setSelectedSecondSubcategoryId(inserted.id);
    setNewSecondSubcategoryName("");
    await refresh();
  }

  async function handleMediaUpload(files: FileList | null, kind: "image" | "video") {
    if (!files?.length) return;

    if (!accessToken) {
      setMediaError("Admin session is required before uploading media.");
      return;
    }

    setMediaError(null);
    const setUploading = kind === "image" ? setUploadingImage : setUploadingVideo;
    const setUrls = kind === "image" ? setImageUrls : setVideoUrls;
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        body.append("kind", kind);

        const response = await fetch("/api/admin/upload-media", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          body
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Media upload failed.");
        }

        uploadedUrls.push(payload.url);
      }

      setUrls((current) => [...current, ...uploadedUrls]);
    } catch (cause) {
      setMediaError(cause instanceof Error ? cause.message : "Media upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setFormError(null);

    if (!supabase) {
      setFormError("Connect Supabase in .env.local before saving listings.");
      return;
    }

    if (!selectedCategoryId || !selectedBrandId || !selectedSubcategoryId || !selectedSecondSubcategoryId) {
      setFormError("Select a main category, brand, subcategory, and second subcategory.");
      return;
    }

    const mrp = Number(form.mrp_price);
    const offered = form.offered_price ? Number(form.offered_price) : null;
    if (!Number.isFinite(mrp) || mrp < 0 || (offered !== null && (!Number.isFinite(offered) || offered < 0))) {
      setFormError("Enter valid MRP and offered prices.");
      return;
    }

    const payload = {
      main_category_id: selectedCategoryId,
      brand_id: selectedBrandId,
      subcategory_id: selectedSubcategoryId,
      second_subcategory_id: selectedSecondSubcategoryId,
      name: form.name.trim(),
      slug: createSlug(form.name),
      sku: form.sku.trim() || null,
      description: form.description.trim(),
      highlights: splitLines(form.highlights),
      image_urls: imageUrls,
      video_urls: videoUrls,
      mrp_price: mrp,
      offered_price: offered,
      pack_size: form.pack_size.trim() || null,
      availability: form.availability,
      tags: splitTags(form.tags),
      is_active: form.is_active
    };

    setSaving(true);
    const result = editingId
      ? await supabase.from("products").update(payload).eq("id", editingId)
      : await supabase.from("products").insert(payload);

    setSaving(false);
    if (result.error) {
      setFormError(result.error.message);
      return;
    }

    setMessage(editingId ? "Listing updated." : "Listing created.");
    resetForm();
    await refresh();
  }

  async function deleteProduct(productId: string) {
    if (!supabase) {
      setFormError("Connect Supabase before deleting listings.");
      return;
    }

    const confirmed = window.confirm("Delete this listing?");
    if (!confirmed) return;

    setSaving(true);
    const { error: deleteError } = await supabase.from("products").delete().eq("id", productId);
    setSaving(false);

    if (deleteError) {
      setFormError(deleteError.message);
      return;
    }

    await refresh();
  }

  if (loading) return <LoadingPanel label="Loading listing manager" />;
  if (error) return <ErrorPanel message={error} />;
  if (!data) return null;

  return (
    <div className="admin-workspace">
      {!supabase ? (
        <div className="admin-banner">
          Supabase is not connected yet. Add `.env.local` values and run the SQL schema to enable saving.
        </div>
      ) : null}

      <section className="admin-panel hierarchy-panel">
        <div className="admin-panel-heading">
          <span className="eyebrow">Catalog Structure</span>
          <h2>Categories, Brands, Subcategories</h2>
        </div>

        {data.schemaWarning ? <p className="form-error">{data.schemaWarning}</p> : null}

        <div className="hierarchy-grid">
          <div className="field-stack">
            <label>
              <span>Main Category</span>
              <select
                value={selectedCategoryId}
                onChange={(event) => {
                  setSelectedCategoryId(event.target.value);
                  setSelectedBrandId("");
                  setSelectedSubcategoryId("");
                  setSelectedSecondSubcategoryId("");
                }}
              >
                <option value="">Select main category</option>
                {data.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-create">
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="New main category"
              />
              <button type="button" className="icon-button" onClick={() => void createCategory()} disabled={saving}>
                <FolderPlus size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="field-stack">
            <label>
              <span>Brand</span>
              <select
                value={selectedBrandId}
                onChange={(event) => {
                  setSelectedBrandId(event.target.value);
                  setSelectedSubcategoryId("");
                  setSelectedSecondSubcategoryId("");
                }}
                disabled={!selectedCategoryId}
              >
                <option value="">Select brand</option>
                {brandOptions.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-create">
              <input
                value={newBrandName}
                onChange={(event) => setNewBrandName(event.target.value)}
                placeholder="New brand"
                disabled={!selectedCategoryId}
              />
              <button type="button" className="icon-button" onClick={() => void createBrand()} disabled={saving}>
                <Layers3 size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="field-stack">
            <label>
              <span>Subcategory</span>
              <select
                value={selectedSubcategoryId}
                onChange={(event) => {
                  setSelectedSubcategoryId(event.target.value);
                  setSelectedSecondSubcategoryId("");
                }}
                disabled={!selectedBrandId}
              >
                <option value="">Select subcategory</option>
                {subcategoryOptions.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-create">
              <input
                value={newSubcategoryName}
                onChange={(event) => setNewSubcategoryName(event.target.value)}
                placeholder="New subcategory"
                disabled={!selectedBrandId}
              />
              <button type="button" className="icon-button" onClick={() => void createSubcategory()} disabled={saving}>
                <Tag size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="field-stack">
            <label>
              <span>Second Subcategory</span>
              <select
                value={selectedSecondSubcategoryId}
                onChange={(event) => setSelectedSecondSubcategoryId(event.target.value)}
                disabled={!selectedSubcategoryId}
              >
                <option value="">Select second subcategory</option>
                {secondSubcategoryOptions.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-create">
              <input
                value={newSecondSubcategoryName}
                onChange={(event) => setNewSecondSubcategoryName(event.target.value)}
                placeholder="New second subcategory"
                disabled={!selectedSubcategoryId}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => void createSecondSubcategory()}
                disabled={saving}
              >
                <Tag size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <span className="eyebrow">{editingId ? "Edit Listing" : "Add Listing"}</span>
          <h2>{editingId ? "Update Product" : "Create Product"}</h2>
        </div>

        <form className="listing-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              <span>Product Name</span>
              <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
            </label>
            <label>
              <span>SKU / Model</span>
              <input value={form.sku} onChange={(event) => updateForm("sku", event.target.value)} />
            </label>
            <label>
              <span>MRP Price</span>
              <input
                type="number"
                min="0"
                value={form.mrp_price}
                onChange={(event) => updateForm("mrp_price", event.target.value)}
                required
              />
            </label>
            <label>
              <span>Offered Price</span>
              <input
                type="number"
                min="0"
                value={form.offered_price}
                onChange={(event) => updateForm("offered_price", event.target.value)}
              />
            </label>
            <label>
              <span>Pack Size / Unit</span>
              <input value={form.pack_size} onChange={(event) => updateForm("pack_size", event.target.value)} />
            </label>
            <label>
              <span>Availability</span>
              <select
                value={form.availability}
                onChange={(event) => updateForm("availability", event.target.value as Availability)}
              >
                {availabilityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              rows={5}
              required
            />
          </label>

          <div className="form-grid form-grid-textareas">
            <label>
              <span>Highlight Features</span>
              <textarea
                value={form.highlights}
                onChange={(event) => updateForm("highlights", event.target.value)}
                rows={5}
                placeholder="One feature per line"
              />
            </label>
            <label>
              <span>Tags</span>
              <textarea
                value={form.tags}
                onChange={(event) => updateForm("tags", event.target.value)}
                rows={5}
                placeholder="Comma separated tags"
              />
            </label>
          </div>

          <div className="media-upload-grid">
            <div className="media-upload-card">
              <div>
                <span className="eyebrow">Images</span>
                <h3>Upload Product Photos</h3>
              </div>
              <label className="media-dropzone">
                <ImagePlus size={22} aria-hidden="true" />
                <span>{uploadingImage ? "Uploading images" : "Choose image files"}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingImage || saving}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    void handleMediaUpload(event.currentTarget.files, "image");
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {imageUrls.length > 0 ? (
                <div className="media-preview-grid">
                  {imageUrls.map((url) => (
                    <div key={url} className="media-preview media-preview-image">
                      <img src={url} alt="Uploaded product" />
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setImageUrls((current) => current.filter((item) => item !== url))}
                        aria-label="Remove image"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="media-upload-card">
              <div>
                <span className="eyebrow">Videos</span>
                <h3>Upload Product Videos</h3>
              </div>
              <label className="media-dropzone">
                <Film size={22} aria-hidden="true" />
                <span>{uploadingVideo ? "Uploading videos" : "Choose video files"}</span>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  disabled={uploadingVideo || saving}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    void handleMediaUpload(event.currentTarget.files, "video");
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {videoUrls.length > 0 ? (
                <div className="media-preview-grid">
                  {videoUrls.map((url) => (
                    <div key={url} className="media-preview">
                      <video src={url} controls />
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setVideoUrls((current) => current.filter((item) => item !== url))}
                        aria-label="Remove video"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {mediaError ? <p className="form-error">{mediaError}</p> : null}

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => updateForm("is_active", event.target.checked)}
            />
            <span>Active listing</span>
          </label>

          {formError ? <p className="form-error">{formError}</p> : null}
          {message ? <p className="form-success">{message}</p> : null}

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={saving}>
              <Save size={17} aria-hidden="true" />
              {saving ? "Saving" : editingId ? "Update Listing" : "Save Listing"}
            </button>
            {editingId ? (
              <button type="button" className="button button-soft" onClick={resetForm}>
                Cancel Edit
              </button>
            ) : null}
            <button type="button" className="icon-button" onClick={() => void refresh()} aria-label="Refresh catalog">
              <RefreshCw size={18} aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <span className="eyebrow">Listings</span>
          <h2>Manage Products</h2>
        </div>
        <div className="listing-table">
          {data.products.map((product) => (
            <div key={product.id} className="listing-row">
              <div>
                <strong>{product.name}</strong>
                <span>
                  {product.main_category?.name} / {product.brand?.name} / {product.subcategory?.name}
                  {product.second_subcategory?.name ? ` / ${product.second_subcategory.name}` : ""}
                </span>
              </div>
              <div className="listing-price">
                <span>MRP {formatCurrency(product.mrp_price)}</span>
                <span>Offer {formatCurrency(product.offered_price)}</span>
              </div>
              <div className="row-actions">
                <button type="button" className="icon-button" onClick={() => startEdit(product)} aria-label="Edit listing">
                  <Pencil size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={() => void deleteProduct(product.id)}
                  aria-label="Delete listing"
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}

          {data.products.length === 0 ? (
            <div className="empty-state">
              <Plus size={24} aria-hidden="true" />
              <h3>No listings yet</h3>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
