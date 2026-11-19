import React, { useMemo, useState } from 'react';
import {
  Edit2,
  Plus,
  Search,
  Star,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { CATEGORY_IMAGES } from '../../data/seedData';
import {
  AvailabilityStatus,
  FOOD_CATEGORIES,
  FoodCategory,
  MenuItem,
} from '../../types/campus';
import {
  createMenuItemApi,
  deleteMenuItemApi,
  updateMenuItemApi,
} from '../../services/api';

interface MenuManagementViewProps {
  menuItems: MenuItem[];
  onMenuChanged: (nextItems: MenuItem[]) => void;
}

type SortOption = 'rating-desc' | 'price-asc' | 'price-desc' | 'name-asc';

interface MenuFormState {
  id?: string;
  name: string;
  category: FoodCategory;
  price: string;
  availability: AvailabilityStatus;
  rating: string;
  isVeg: boolean;
  imageUrl: string;
  description: string;
  prepTimeMins: string;
}

const EMPTY_FORM: MenuFormState = {
  name: '',
  category: 'South Indian',
  price: '65',
  availability: 'Available',
  rating: '4.4',
  isVeg: true,
  imageUrl: CATEGORY_IMAGES['South Indian'],
  description: '',
  prepTimeMins: '8',
};

export const MenuManagementView: React.FC<MenuManagementViewProps> = ({
  menuItems,
  onMenuChanged,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | FoodCategory>('All');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('rating-desc');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MenuFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems
      .filter((item) => {
        if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
        if (vegFilter === 'veg' && !item.isVeg) return false;
        if (vegFilter === 'nonveg' && item.isVeg) return false;
        if (
          q &&
          !item.name.toLowerCase().includes(q) &&
          !item.category.toLowerCase().includes(q) &&
          !item.description.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating-desc') return b.rating - a.rating;
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        return a.name.localeCompare(b.name);
      });
  }, [menuItems, search, selectedCategory, vegFilter, sortBy]);

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setForm({
      id: item.id,
      name: item.name,
      category: item.category,
      price: String(item.price),
      availability: item.availability,
      rating: String(item.rating),
      isVeg: item.isVeg,
      imageUrl: item.imageUrl,
      description: item.description,
      prepTimeMins: String(item.prepTimeMins),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const priceNum = Number(form.price);
    const ratingNum = Number(form.rating);
    const prepNum = Number(form.prepTimeMins);

    if (!form.name.trim()) {
      setFormError('Food item name is required.');
      return;
    }
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setFormError('Please enter a valid positive price in ₹.');
      return;
    }
    if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      setFormError('Rating must be between 1.0 and 5.0.');
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        const res = await updateMenuItemApi(form.id, {
          name: form.name.trim(),
          category: form.category,
          price: priceNum,
          availability: form.availability,
          rating: ratingNum,
          isVeg: form.isVeg,
          imageUrl: form.imageUrl.trim() || CATEGORY_IMAGES[form.category],
          description: form.description.trim(),
          prepTimeMins: Number.isNaN(prepNum) ? 8 : prepNum,
        });
        onMenuChanged(menuItems.map((m) => (m.id === form.id ? res.item : m)));
      } else {
        const res = await createMenuItemApi({
          name: form.name.trim(),
          category: form.category,
          price: priceNum,
          availability: form.availability,
          rating: ratingNum,
          isVeg: form.isVeg,
          imageUrl: form.imageUrl.trim() || CATEGORY_IMAGES[form.category],
          description: form.description.trim(),
          prepTimeMins: Number.isNaN(prepNum) ? 8 : prepNum,
        });
        onMenuChanged([res.item, ...menuItems]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save menu item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMenuItemApi(id);
      onMenuChanged(menuItems.filter((m) => m.id !== id));
    } catch {
      // ignore
    }
  };

  const handleQuickToggleAvailability = async (item: MenuItem) => {
    const nextStatus: AvailabilityStatus =
      item.availability === 'Available' ? 'Sold Out' : 'Available';
    try {
      const res = await updateMenuItemApi(item.id, { availability: nextStatus });
      onMenuChanged(menuItems.map((m) => (m.id === item.id ? res.item : m)));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Canteen Menu Management ({filteredItems.length} items)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add, edit, price-tune, and manage availability across all campus food counters
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Food Item</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', ...FOOD_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes..."
                className="pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 w-48"
              />
            </div>

            <select
              value={vegFilter}
              onChange={(e) => setVegFilter(e.target.value as 'all' | 'veg' | 'nonveg')}
              aria-label="Filter by dietary preference"
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">All Dietary</option>
              <option value="veg">Veg Only</option>
              <option value="nonveg">Non-Veg Only</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort menu items"
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="rating-desc">Sort: Highest Rated</option>
              <option value="price-asc">Sort: Price Low–High</option>
              <option value="price-desc">Sort: Price High–Low</option>
              <option value="name-asc">Sort: Name A–Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No matching menu items</h3>
          <p className="text-sm text-slate-500 mt-1">
            Adjust your category or search filters, or add a new campus dish.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const imgBroken = failedImages[item.id];
            return (
              <article
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    {!imgBroken && item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4 text-center">
                        <Utensils className="w-7 h-7 text-orange-400 mb-2" />
                        <span className="text-sm font-semibold">{item.name}</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end justify-between p-3 text-white">
                      <span className="text-xs font-medium">
                        {item.category} · {item.isVeg ? 'Pure Veg' : 'Non-Veg'}
                      </span>
                      <span className="text-sm font-bold tabular-nums font-mono-tabular">
                        ₹{item.price}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {item.name}
                      </h3>
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 tabular-nums shrink-0">
                        <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                        <span>{item.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-100">
                      <span className="text-slate-500 tabular-nums">
                        {item.prepTimeMins} mins prep · {item.reviewCount} reviews
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuickToggleAvailability(item)}
                        className={`font-semibold cursor-pointer ${
                          item.availability === 'Available'
                            ? 'text-emerald-700 hover:text-emerald-800'
                            : item.availability === 'Sold Out'
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-amber-600 hover:text-amber-700'
                        }`}
                      >
                        {item.availability}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-white hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {form.id ? 'Edit Food Item' : 'Add New Campus Menu Item'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Iced Cold Coffee"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => {
                      const nextCat = e.target.value as FoodCategory;
                      setForm({
                        ...form,
                        category: nextCat,
                        imageUrl: CATEGORY_IMAGES[nextCat],
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {FOOD_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Availability
                  </label>
                  <select
                    value={form.availability}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        availability: e.target.value as AvailabilityStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="Available">Available</option>
                    <option value="Sold Out">Sold Out</option>
                    <option value="Seasonal">Seasonal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rating (1–5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prep (mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={form.prepTimeMins}
                    onChange={(e) => setForm({ ...form, prepTimeMins: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dietary Type
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isVeg: true })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                      form.isVeg
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Vegetarian
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isVeg: false })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                      !form.isVeg
                        ? 'bg-red-700 text-white border-red-700'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Non-Vegetarian
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Image URL (defaults to category studio photo)
                </label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono-tabular border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ingredients, portion details, or counter notes..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg cursor-pointer"
                >
                  {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Add to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
