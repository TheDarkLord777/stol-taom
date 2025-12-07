"use client";
import React from "react";
import Combobox from "@/components/ui/combobox";

type Ingredient = {
  id: string;
  name: string;
  mandatory: boolean;
  selected?: boolean;
};
type Item = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  createdAt: number;
  ingredients: Ingredient[];
  restaurantIds: string[];
};
type Restaurant = { id: string; name: string };

export default function IngredientsAdminClient({
  initialItems,
  initialRestaurants,
}: {
  initialItems: Item[];
  initialRestaurants: Restaurant[];
}) {
  const [items, setItems] = React.useState<Item[]>(initialItems);
  const [restaurants] = React.useState<Restaurant[]>(initialRestaurants);
  const [editing, setEditing] = React.useState<Item | null>(null);
  const [localIngredients, setLocalIngredients] = React.useState<Ingredient[]>(
    [],
  );
  const [localRestaurantIds, setLocalRestaurantIds] = React.useState<string[]>(
    [],
  );
  const [saving, setSaving] = React.useState(false);

  // Basic ingredient options for combobox suggestions. You can extend or fetch these from a server.
  const basicIngredientOptions = React.useMemo(() => {
    const list = [
      // meats & proteins
      "Mol go'shti",
      "Go'sht",
      "Tovuq go'shti",
      "Ot go'shti",
      "Qo'y go'shti",
      "Katta Gosht",
      "Gosht",
      "Qazi",

      // staples
      "Un",
      "Guruch",
      "Xamir",
      "Tuxum",
      "Suv",
      "Sariyog'",

      // vegetables
      "Piyoz",
      "Sabzi",
      "Kartoshka",
      "Pomidor",
      "Kokat",

      // liquids / fats / seasoning
      "Yog'",
      "Tuz",
      "Sirka",
      "Bulon",

      // legumes & extras
      "Noxat",

      // spices
      "Zira",
      "Ziravor",
      "Murch",
      "Qora murch",
      "Shirin murch",
      "Paprika",
      "Koriander",
      "Lavrov yaprogi",
      "Sarimsoq",
      "Chisnok",

      // regional / other
      "Droj",
      "Ot go'shti",
    ];
    // dedupe preserving order
    const seen = new Set<string>();
    const uniq = list.filter((s) => {
      const k = s.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    // Use the original name as both value and label to match saved ingredient names
    return uniq.map((v) => ({ value: v, label: v }));
  }, []);

  const openEdit = (item: Item) => {
    setEditing(item);
    // deep copy to local editable state
    setLocalIngredients((item.ingredients ?? []).map((i) => ({ ...i })));
    setLocalRestaurantIds((item.restaurantIds ?? []).slice());
  };
  const closeEdit = () => {
    setEditing(null);
    setLocalIngredients([]);
    setLocalRestaurantIds([]);
  };

  const addIngredient = () => {
    setLocalIngredients((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: "", mandatory: false },
    ]);
  };
  const removeIngredient = (id: string) => {
    setLocalIngredients((prev) => prev.filter((i) => i.id !== id));
  };
  const updateIngredientName = (id: string, name: string) => {
    setLocalIngredients((prev) =>
      prev.map((i) => (i.id === id ? { ...i, name } : i)),
    );
  };
  const toggleIngredientMandatory = (id: string) => {
    setLocalIngredients((prev) =>
      prev.map((i) => (i.id === id ? { ...i, mandatory: !i.mandatory } : i)),
    );
  };

  const toggleRestaurant = (rid: string) => {
    setLocalRestaurantIds((prev) =>
      prev.includes(rid) ? prev.filter((r) => r !== rid) : [...prev, rid],
    );
  };

  const saveAll = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      // Save ingredients via existing API
      const ingPayload = localIngredients.map((i) => ({
        name: i.name,
        mandatory: i.mandatory,
      }));
      const res1 = await fetch(`/api/menu/${editing.id}/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: ingPayload }),
      });
      if (!res1.ok) {
        let txt = "";
        try {
          const j = await res1.json();
          txt = j?.error || JSON.stringify(j);
        } catch (e) {
          txt = await res1.text();
        }
        throw new Error(`Failed saving ingredients: ${txt}`);
      }
      const data1 = await res1.json();
      // Save restaurants via new API
      const res2 = await fetch(`/api/menu/${editing.id}/restaurants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantIds: localRestaurantIds }),
      });
      if (!res2.ok) {
        let txt = "";
        try {
          const j = await res2.json();
          txt = j?.error || JSON.stringify(j);
        } catch (e) {
          txt = await res2.text();
        }
        throw new Error(`Failed saving restaurants: ${txt}`);
      }
      const data2 = await res2.json();

      // Update local items state with returned ingredients and restaurants
      setItems((prev) =>
        prev.map((it) =>
          it.id === editing.id
            ? {
                ...it,
                ingredients: (data1.ingredients ?? []).map((x: any) => ({
                  id: String(x.id),
                  name: x.name,
                  mandatory: Boolean(x.mandatory),
                })),
                restaurantIds: (data2.assigned ?? []).map(
                  (a: any) => a.restaurantId,
                ),
              }
            : it,
        ),
      );

      closeEdit();
    } catch (e) {
      console.error(e);
      alert("Save failed. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-auto border rounded">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Menu item
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Ingredients
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Restaurants
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y bg-white">
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 align-top">
                  <div className="font-semibold">{it.name}</div>
                  <div className="text-xs text-gray-500">{it.slug}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-2">
                    {(it.ingredients ?? []).map((ing) => (
                      <span
                        key={ing.id}
                        className="rounded border px-2 py-1 text-sm"
                      >
                        {ing.name}{" "}
                        {ing.mandatory ? (
                          <span className="text-xs text-red-500">
                            (mandatory)
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-2">
                    {(it.restaurantIds ?? []).length > 0 ? (
                      it.restaurantIds.map((rid) => {
                        const r = restaurants.find((x) => x.id === rid);
                        return (
                          <span
                            key={rid}
                            className="rounded border px-2 py-1 text-sm"
                          >
                            {r ? r.name : rid}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-sm text-gray-500">
                        Not assigned
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <button
                    className="rounded bg-blue-600 text-white px-3 py-1 text-sm hover:bg-blue-700"
                    onClick={() => openEdit(it)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="relative w-full max-w-3xl rounded bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit: {editing.name}</h2>
              <div className="flex items-center gap-2">
                <button
                  className="text-sm text-gray-500"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="rounded bg-green-600 text-white px-3 py-1 text-sm"
                  onClick={saveAll}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="mb-2 font-medium">Ingredients</h3>
                <div className="space-y-2">
                  {localIngredients.map((ing) => (
                    <div key={ing.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!ing.mandatory}
                        onChange={() => toggleIngredientMandatory(ing.id)}
                        className="mr-2"
                      />
                      <div className="flex-1">
                        <Combobox
                          mode="input"
                          options={basicIngredientOptions}
                          value={ing.name}
                          notifyOnSelect={false}
                          onChange={(v) => {
                            // v is the selected option's value (which is now the label)
                            updateIngredientName(ing.id, v);
                          }}
                          onQueryChange={(q) => {
                            // Update ingredient name when user types freely
                            // This allows free-form text input for custom ingredient names
                            updateIngredientName(ing.id, q);
                          }}
                          inputPlaceholder="Ingredient name"
                        />
                      </div>
                      <button
                        className="text-red-600 text-sm ml-2"
                        onClick={() => removeIngredient(ing.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div>
                    <button
                      className="rounded bg-blue-600 text-white px-3 py-1 text-sm"
                      onClick={addIngredient}
                    >
                      Add ingredient
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-medium">Assign Restaurants</h3>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {restaurants.map((r) => (
                    <label key={r.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={localRestaurantIds.includes(r.id)}
                        onChange={() => toggleRestaurant(r.id)}
                      />
                      <span>{r.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
