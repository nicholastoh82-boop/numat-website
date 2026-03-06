"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type ProductVariant = {
  id: string;
  sku: string | null;
  thickness_mm: number | null;
  ply_count: number | null;
  dimensions: string | null;
  unit_price: number | null;
  currency: string | null;
  unit: string | null;
  min_order_qty: number | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  sku?: string | null;
  thickness_mm?: number | null;
  ply_count?: number | null;
  dimensions?: string | null;
  unit_price?: number | null;
  currency?: string | null;
  unit?: string | null;
  min_order_qty?: number | null;
  variants: ProductVariant[];
};

type NuBamConfigRow = {
  productId: string;
  productName: string;
  coreType: string;
  variantId: string;
  sku: string | null;
  thickness_mm: number | null;
  ply_count: number | null;
  dimensions: string | null;
  unit_price: number | null;
  currency: string | null;
  unit: string | null;
  min_order_qty: number | null;
};

function formatCurrency(value: number | null | undefined, currency = "PHP") {
  if (value == null) return "—";

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function getCoreTypeFromProductName(name: string) {
  const lower = name.toLowerCase();

  if (lower.includes("horizontal")) return "Horizontal Core";
  if (lower.includes("vertical")) return "Vertical Core";

  return name.replace(/^NuBam\s*/i, "").trim() || "NuBam";
}

function isNuBamConfiguratorProduct(product: Product | null) {
  if (!product) return false;

  const lower = product.name.toLowerCase();

  return lower.includes("nubam") && !lower.includes("board");
}

function formatDescriptionParagraphs(description: string | null) {
  if (!description) return [];

  const normalized = description.replace(/\r\n/g, "\n").trim();

  if (!normalized) return [];

  if (normalized.includes("\n\n")) {
    return normalized
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

  const labelBreaks = normalized
    .replace(/\s+(Specifications:)/gi, "\n\n$1")
    .replace(/\s+(Applications:)/gi, "\n\n$1")
    .replace(/\s+(Key Benefits)/gi, "\n\n$1")
    .replace(/\s+(Standard Size:)/gi, "\n\n$1")
    .replace(/\s+(Custom sizing available)/gi, "\n\n$1")
    .replace(/Key Benefits\s*[•:]\s*/gi, "Key Benefits\n")
    .replace(/\s*•\s*/g, "\n");

  return labelBreaks
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function getPlaceholderLabel(productName: string) {
  if (productName.toLowerCase().includes("nubam")) return "NuBam Product Image";
  if (productName.toLowerCase().includes("nudoor")) return "NuDoor Product Image";
  if (productName.toLowerCase().includes("nufloor")) return "NuFloor Product Image";
  if (productName.toLowerCase().includes("nuslat")) return "NuSlat Product Image";

  return "Product Image";
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  const [selectedCoreType, setSelectedCoreType] = useState<string>("");
  const [selectedThickness, setSelectedThickness] = useState<string>("");
  const [selectedPly, setSelectedPly] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (!productId) return;

    let isMounted = true;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const [productRes, productsRes] = await Promise.all([
          fetch(`/api/products/${productId}`, { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
        ]);

        if (!productRes.ok) {
          throw new Error("Failed to load product.");
        }

        if (!productsRes.ok) {
          throw new Error("Failed to load products.");
        }

        const productData: Product = await productRes.json();
        const productsData: Product[] = await productsRes.json();

        if (!isMounted) return;

        setProduct(productData);
        setAllProducts(productsData);

        if (productData.variants?.length) {
          setSelectedVariantId(productData.variants[0].id);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";

        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const isNuBam = isNuBamConfiguratorProduct(product);

  const nuBamProducts = useMemo(() => {
    return allProducts.filter((item) => {
      const lower = item.name.toLowerCase();

      return (
        lower.includes("nubam") &&
        !lower.includes("board") &&
        (lower.includes("horizontal") || lower.includes("vertical")) &&
        Array.isArray(item.variants) &&
        item.variants.length > 0
      );
    });
  }, [allProducts]);

  const nuBamConfigs = useMemo<NuBamConfigRow[]>(() => {
    return nuBamProducts.flatMap((item) =>
      item.variants.map((variant) => ({
        productId: item.id,
        productName: item.name,
        coreType: getCoreTypeFromProductName(item.name),
        variantId: variant.id,
        sku: variant.sku ?? null,
        thickness_mm: variant.thickness_mm ?? null,
        ply_count: variant.ply_count ?? null,
        dimensions: variant.dimensions ?? null,
        unit_price: variant.unit_price ?? null,
        currency: variant.currency ?? "PHP",
        unit: variant.unit ?? null,
        min_order_qty: variant.min_order_qty ?? null,
      }))
    );
  }, [nuBamProducts]);

  const coreTypeOptions = useMemo(() => {
    return Array.from(new Set(nuBamConfigs.map((item) => item.coreType)));
  }, [nuBamConfigs]);

  useEffect(() => {
    if (!isNuBam || !product) return;
    if (coreTypeOptions.length === 0) return;

    const currentProductCore = getCoreTypeFromProductName(product.name);

    if (coreTypeOptions.includes(currentProductCore)) {
      setSelectedCoreType(currentProductCore);
      return;
    }

    if (!selectedCoreType) {
      setSelectedCoreType(coreTypeOptions[0]);
    }
  }, [isNuBam, product, coreTypeOptions, selectedCoreType]);

  const thicknessOptions = useMemo(() => {
    if (!selectedCoreType) return [];

    return Array.from(
      new Set(
        nuBamConfigs
          .filter((item) => item.coreType === selectedCoreType)
          .map((item) => String(item.thickness_mm ?? ""))
          .filter(Boolean)
      )
    ).sort((a, b) => Number(a) - Number(b));
  }, [nuBamConfigs, selectedCoreType]);

  useEffect(() => {
    if (!isNuBam) return;
    if (thicknessOptions.length === 0) return;

    if (!thicknessOptions.includes(selectedThickness)) {
      setSelectedThickness(thicknessOptions[0]);
    }
  }, [isNuBam, thicknessOptions, selectedThickness]);

  const plyOptions = useMemo(() => {
    if (!selectedCoreType || !selectedThickness) return [];

    return Array.from(
      new Set(
        nuBamConfigs
          .filter(
            (item) =>
              item.coreType === selectedCoreType &&
              String(item.thickness_mm ?? "") === selectedThickness
          )
          .map((item) => String(item.ply_count ?? ""))
          .filter(Boolean)
      )
    ).sort((a, b) => Number(a) - Number(b));
  }, [nuBamConfigs, selectedCoreType, selectedThickness]);

  useEffect(() => {
    if (!isNuBam) return;
    if (plyOptions.length === 0) return;

    if (!plyOptions.includes(selectedPly)) {
      setSelectedPly(plyOptions[0]);
    }
  }, [isNuBam, plyOptions, selectedPly]);

  const selectedNuBamConfig = useMemo(() => {
    if (!isNuBam) return null;

    return (
      nuBamConfigs.find(
        (item) =>
          item.coreType === selectedCoreType &&
          String(item.thickness_mm ?? "") === selectedThickness &&
          String(item.ply_count ?? "") === selectedPly
      ) ?? null
    );
  }, [isNuBam, nuBamConfigs, selectedCoreType, selectedThickness, selectedPly]);

  const selectedStandardVariant = useMemo(() => {
    if (!product?.variants?.length) return null;

    return (
      product.variants.find((variant) => variant.id === selectedVariantId) ??
      product.variants[0]
    );
  }, [product, selectedVariantId]);

  const descriptionParagraphs = useMemo(() => {
    return formatDescriptionParagraphs(product?.description ?? null);
  }, [product?.description]);

  const displaySku = isNuBam
    ? selectedNuBamConfig?.sku ?? "—"
    : selectedStandardVariant?.sku ?? product?.sku ?? "—";

  const displayPrice = isNuBam
    ? selectedNuBamConfig?.unit_price ?? null
    : selectedStandardVariant?.unit_price ?? product?.unit_price ?? null;

  const displayCurrency = isNuBam
    ? selectedNuBamConfig?.currency ?? "PHP"
    : selectedStandardVariant?.currency ?? product?.currency ?? "PHP";

  const displayDimensions = isNuBam
    ? selectedNuBamConfig?.dimensions ?? product?.dimensions ?? "—"
    : selectedStandardVariant?.dimensions ?? product?.dimensions ?? "—";

  const displayMOQ = isNuBam
    ? selectedNuBamConfig?.min_order_qty ?? product?.min_order_qty ?? null
    : selectedStandardVariant?.min_order_qty ?? product?.min_order_qty ?? null;

  const displayUnit = isNuBam
    ? selectedNuBamConfig?.unit ?? product?.unit ?? "pc"
    : selectedStandardVariant?.unit ?? product?.unit ?? "pc";

  const totalPrice =
    displayPrice != null && quantity > 0 ? displayPrice * quantity : null;

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.10),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.10),_transparent_28%),linear-gradient(to_bottom,_#fafaf9,_#f5f5f4)]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur">
            <p className="text-sm text-neutral-500">Loading product...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.10),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.10),_transparent_28%),linear-gradient(to_bottom,_#fafaf9,_#f5f5f4)]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-3xl border border-red-200 bg-white/90 p-6 shadow-lg backdrop-blur">
            <p className="text-sm font-medium text-red-700">
              {error || "Product not found."}
            </p>
            <div className="mt-4">
              <Link
                href="/products"
                className="inline-flex rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Back to products
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.10),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.10),_transparent_28%),linear-gradient(to_bottom,_#fafaf9,_#f5f5f4)]">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <Link
            href="/products"
            className="inline-flex rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm backdrop-blur hover:text-neutral-950"
          >
            ← Back to products
          </Link>
        </div>

        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-xl backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative overflow-hidden border-b border-neutral-200/70 bg-[linear-gradient(135deg,_rgba(245,158,11,0.12),_rgba(34,197,94,0.08),_rgba(255,255,255,0.90))] p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(245,158,11,0.18),_transparent_25%),radial-gradient(circle_at_80%_30%,_rgba(34,197,94,0.14),_transparent_22%)]" />

              <div className="relative z-10">
                <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
                  {product.category || "Product"}
                </p>

                <h1 className="text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
                  {product.name}
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-700">
                  Premium engineered bamboo solutions by Numat for sustainable
                  construction, interiors, furniture, and architectural
                  applications.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
                    Sustainable Material
                  </div>
                  <div className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
                    Manufacturing Grade
                  </div>
                  <div className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700">
                    Customizable Options
                  </div>
                </div>
              </div>
            </div>

            <div className="relative bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(250,250,249,0.96))] p-6 sm:p-8">
              <div className="mx-auto flex h-full min-h-[320px] w-full max-w-xl items-center justify-center rounded-[1.75rem] border border-dashed border-neutral-300 bg-[linear-gradient(135deg,_rgba(255,255,255,1),_rgba(245,245,244,1))] p-8 shadow-inner">
                {product.image_url ? (
                  <div className="flex h-full w-full items-center justify-center rounded-[1.5rem] border border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500">
                    Image URL detected. You can replace this placeholder later
                    with a real image component.
                  </div>
                ) : (
                  <div className="w-full text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-200 bg-amber-50 text-3xl">
                      📷
                    </div>

                    <h2 className="mt-5 text-xl font-semibold text-neutral-900">
                      {getPlaceholderLabel(product.name)}
                    </h2>

                    <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-neutral-600">
                      Placeholder area for your future product photo, render,
                      catalog shot, or installation image.
                    </p>

                    <div className="mt-5 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-500">
                      Later, replace this block with your product image source in{" "}
                      <span className="font-semibold text-neutral-700">
                        product.image_url
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-xl backdrop-blur">
            {descriptionParagraphs.length > 0 ? (
              <div className="space-y-8">
                {descriptionParagraphs.map((paragraph, index) => {
                  let lines = paragraph
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean);

                  if (lines.length && product?.name) {
                    const first = lines[0].toLowerCase();
                    const productName = product.name.toLowerCase();

                    if (
                      first === productName ||
                      first === productName.replace(" composite", "") ||
                      first === productName.replace(" premium", "") ||
                      first === productName.replace(" light", "")
                    ) {
                      lines = lines.slice(1);
                    }
                  }

                  if (lines.length === 0) return null;

                  const firstLine = lines[0].toLowerCase();
                  const isKeyBenefitsBlock = firstLine === "key benefits";
                  const isSpecificationsBlock = firstLine === "specifications";
                  const remainingLines = lines.slice(1);

                  if (isKeyBenefitsBlock) {
                    return (
                      <div
                        key={`${product.id}-paragraph-${index}`}
                        className="rounded-3xl border border-green-200 bg-green-50/80 p-6"
                      >
                        <div className="mb-5 flex items-center gap-3">
                          <div className="h-9 w-1.5 rounded-full bg-green-600" />
                          <h3 className="text-lg font-semibold text-green-900">
                            Key Benefits
                          </h3>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          {remainingLines.map((line, lineIndex) => (
                            <div
                              key={`${product.id}-paragraph-${index}-line-${lineIndex}`}
                              className="rounded-2xl border border-green-200 bg-white px-4 py-4 text-sm leading-7 text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                              {line.replace(/^[•\-]\s*/, "")}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (isSpecificationsBlock) {
                    return (
                      <div
                        key={`${product.id}-paragraph-${index}`}
                        className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6"
                      >
                        <div className="mb-5 flex items-center gap-3">
                          <div className="h-9 w-1.5 rounded-full bg-amber-600" />
                          <h3 className="text-lg font-semibold text-amber-900">
                            Specifications
                          </h3>
                        </div>

                        <div className="space-y-3">
                          {remainingLines.map((line, lineIndex) => {
                            const parts = line.split(":");
                            const hasLabel = parts.length > 1;
                            const label = hasLabel ? parts[0].trim() : "";
                            const value = hasLabel
                              ? parts.slice(1).join(":").trim()
                              : line;

                            return (
                              <div
                                key={`${product.id}-paragraph-${index}-line-${lineIndex}`}
                                className="flex flex-col gap-1 rounded-2xl border border-amber-200 bg-white px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                              >
                                {hasLabel ? (
                                  <>
                                    <span className="text-sm font-medium text-amber-700">
                                      {label}
                                    </span>
                                    <span className="text-sm font-semibold text-neutral-900 sm:text-right">
                                      {value}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-sm font-medium text-neutral-900">
                                    {value}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (lines.length === 1) {
                    return (
                      <p
                        key={`${product.id}-paragraph-${index}`}
                        className="max-w-3xl text-lg leading-8 text-neutral-700"
                      >
                        {lines[0]}
                      </p>
                    );
                  }

                  return (
                    <div
                      key={`${product.id}-paragraph-${index}`}
                      className="space-y-3"
                    >
                      {lines.map((line, lineIndex) => (
                        <p
                          key={`${product.id}-paragraph-${index}-line-${lineIndex}`}
                          className="max-w-3xl text-base leading-8 text-neutral-700"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-8">
              {isNuBam ? (
                <div className="space-y-6">
                  <div className="rounded-3xl border border-neutral-200 bg-[linear-gradient(180deg,_rgba(255,255,255,1),_rgba(250,250,249,1))] p-6 shadow-sm">
                    <div className="mb-5">
                      <h2 className="text-lg font-semibold text-neutral-950">
                        Product Configurator
                      </h2>
                      <p className="mt-1 text-sm text-neutral-600">
                        Configure your engineered bamboo board by core type,
                        thickness, ply, and quantity.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label
                          htmlFor="coreType"
                          className="mb-2 block text-sm font-medium text-neutral-700"
                        >
                          Core Type
                        </label>
                        <select
                          id="coreType"
                          value={selectedCoreType}
                          onChange={(e) => setSelectedCoreType(e.target.value)}
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-green-600"
                        >
                          {coreTypeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="thickness"
                          className="mb-2 block text-sm font-medium text-neutral-700"
                        >
                          Thickness
                        </label>
                        <select
                          id="thickness"
                          value={selectedThickness}
                          onChange={(e) => setSelectedThickness(e.target.value)}
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-green-600"
                        >
                          {thicknessOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}mm
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="ply"
                          className="mb-2 block text-sm font-medium text-neutral-700"
                        >
                          Ply
                        </label>
                        <select
                          id="ply"
                          value={selectedPly}
                          onChange={(e) => setSelectedPly(e.target.value)}
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-green-600"
                        >
                          {plyOptions.map((option) => (
                            <option key={option} value={option}>
                              {option} Ply
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="quantity"
                          className="mb-2 block text-sm font-medium text-neutral-700"
                        >
                          Quantity
                        </label>
                        <input
                          id="quantity"
                          type="number"
                          min={1}
                          step={1}
                          value={quantity}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            setQuantity(
                              Number.isNaN(value) || value < 1 ? 1 : value
                            );
                          }}
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-green-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                        Dimensions
                      </p>
                      <p className="mt-2 text-base font-medium text-neutral-900">
                        {displayDimensions}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                        Minimum Order Quantity
                      </p>
                      <p className="mt-2 text-base font-medium text-neutral-900">
                        {displayMOQ != null ? `${displayMOQ} ${displayUnit}` : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {product.variants?.length > 0 ? (
                    <div className="rounded-3xl border border-neutral-200 bg-[linear-gradient(180deg,_rgba(255,255,255,1),_rgba(250,250,249,1))] p-6 shadow-sm">
                      <label
                        htmlFor="variant"
                        className="mb-2 block text-sm font-medium text-neutral-700"
                      >
                        Variant
                      </label>
                      <select
                        id="variant"
                        value={selectedVariantId}
                        onChange={(e) => setSelectedVariantId(e.target.value)}
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-green-600"
                      >
                        {product.variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {[
                              variant.thickness_mm
                                ? `${variant.thickness_mm}mm`
                                : null,
                              variant.ply_count
                                ? `${variant.ply_count} Ply`
                                : null,
                              formatCurrency(
                                variant.unit_price,
                                variant.currency ?? "PHP"
                              ),
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                        Thickness
                      </p>
                      <p className="mt-2 text-base font-medium text-neutral-900">
                        {selectedStandardVariant?.thickness_mm ??
                          product.thickness_mm ??
                          "—"}
                        {selectedStandardVariant?.thickness_mm ||
                        product.thickness_mm
                          ? "mm"
                          : ""}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                        Ply
                      </p>
                      <p className="mt-2 text-base font-medium text-neutral-900">
                        {selectedStandardVariant?.ply_count ??
                          product.ply_count ??
                          "—"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                        Dimensions
                      </p>
                      <p className="mt-2 text-base font-medium text-neutral-900">
                        {displayDimensions}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                        MOQ
                      </p>
                      <p className="mt-2 text-base font-medium text-neutral-900">
                        {displayMOQ != null ? `${displayMOQ} ${displayUnit}` : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-[2rem] border border-neutral-900/10 bg-[linear-gradient(180deg,_#1f2937,_#111827)] p-6 text-white shadow-xl">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
              Configuration Summary
            </p>

            <div className="mt-5 space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-neutral-400">SKU</p>
                <p className="mt-1 text-lg font-semibold">{displaySku}</p>
              </div>

              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                <p className="text-sm text-amber-100/80">Unit Price</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-white">
                  {formatCurrency(displayPrice, displayCurrency)}
                </p>
              </div>

              {isNuBam ? (
                <div className="rounded-2xl border border-green-400/20 bg-green-400/10 p-4">
                  <p className="text-sm text-green-100/80">Estimated Total</p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {formatCurrency(totalPrice, displayCurrency)}
                  </p>
                  <p className="mt-1 text-xs text-green-100/70">
                    Based on {quantity} {displayUnit}
                    {quantity > 1 ? "s" : ""}
                  </p>
                </div>
              ) : null}

              <div className="h-px bg-white/10" />

              <div className="space-y-3 rounded-3xl bg-white/5 p-4">
                <p className="text-sm font-medium text-white">
                  Selected configuration
                </p>

                {isNuBam ? (
                  <>
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-neutral-400">Core Type</span>
                      <span className="text-right font-medium text-white">
                        {selectedCoreType || "—"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-neutral-400">Thickness</span>
                      <span className="text-right font-medium text-white">
                        {selectedThickness ? `${selectedThickness}mm` : "—"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-neutral-400">Ply</span>
                      <span className="text-right font-medium text-white">
                        {selectedPly ? `${selectedPly} Ply` : "—"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-neutral-400">Quantity</span>
                      <span className="text-right font-medium text-white">
                        {quantity} {displayUnit}
                        {quantity > 1 ? "s" : ""}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-neutral-400">Thickness</span>
                      <span className="text-right font-medium text-white">
                        {selectedStandardVariant?.thickness_mm ??
                          product.thickness_mm ??
                          "—"}
                        {selectedStandardVariant?.thickness_mm ||
                        product.thickness_mm
                          ? "mm"
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-neutral-400">Ply</span>
                      <span className="text-right font-medium text-white">
                        {selectedStandardVariant?.ply_count ??
                          product.ply_count ??
                          "—"}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-neutral-400">MOQ</span>
                  <span className="text-right font-medium text-white">
                    {displayMOQ != null ? `${displayMOQ} ${displayUnit}` : "—"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-neutral-400">Dimensions</span>
                  <span className="text-right font-medium text-white">
                    {displayDimensions}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-white">
                  Product image placeholder
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  This page is ready for future individual product images. When
                  your files are available, connect them to{" "}
                  <span className="font-semibold text-white">image_url</span>.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}