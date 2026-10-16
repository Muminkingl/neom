"use client";

import React, { useState, useMemo } from 'react';
import { useStore, StorePurchase } from '@/app/context/StoreContext';
import { useAuth } from '@/app/context/AuthContext';
import {
  Package,
  Boxes,
  Plus,
  Download,
  Search,
  X,
  DollarSign,
  Calendar,
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Receipt,
  Edit2,
  Trash2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

const CATEGORIES = [
  'All Categories',
  'Dental Materials',
  'Consumables & Disposables',
  'Instruments & Equipment',
  'Pharmaceuticals & Anesthetics',
  'Hygiene & Office Supplies',
  'Lab Services & Materials',
  'Other'
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Dental Materials': {
    bg: 'bg-teal-500/10 dark:bg-teal-500/20',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-500/20 dark:border-teal-500/30',
  },
  'Consumables & Disposables': {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/20 dark:border-amber-500/30',
  },
  'Instruments & Equipment': {
    bg: 'bg-sky-500/10 dark:bg-sky-500/20',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-500/20 dark:border-sky-500/30',
  },
  'Pharmaceuticals & Anesthetics': {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/20 dark:border-rose-500/30',
  },
  'Hygiene & Office Supplies': {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/20 dark:border-emerald-500/30',
  },
  'Lab Services & Materials': {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-500/20 dark:border-purple-500/30',
  },
  'Other': {
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/20 dark:border-slate-500/30',
  },
};

const PRESET_ITEMS = [
  { name: 'Dental Composite Resin', category: 'Dental Materials', unit: 'kit' },
  { name: 'Anesthetic Cartridges (Articaine/Lidocaine)', category: 'Pharmaceuticals & Anesthetics', unit: 'box' },
  { name: 'Dental Bonding Agent', category: 'Dental Materials', unit: 'bottle' },
  { name: 'Latex / Nitrile Exam Gloves', category: 'Consumables & Disposables', unit: 'box' },
  { name: 'Sterilization Pouches', category: 'Consumables & Disposables', unit: 'box' },
  { name: 'Dental Alginate Impression Material', category: 'Dental Materials', unit: 'pack' },
  { name: 'Dental Diamond Burs Set', category: 'Instruments & Equipment', unit: 'set' },
  { name: 'Dental Curing Light Unit', category: 'Instruments & Equipment', unit: 'piece' },
  { name: 'Cotton Rolls & Gauze', category: 'Consumables & Disposables', unit: 'pack' },
  { name: 'Prophylaxis Polishing Paste', category: 'Dental Materials', unit: 'tube' },
  { name: 'Dental Implants Titanium Fixture', category: 'Dental Materials', unit: 'piece' },
  { name: 'Surface Disinfectant Spray', category: 'Hygiene & Office Supplies', unit: 'bottle' },
];

export default function StorePage() {
  const {
    purchases,
    isLoading,
    addPurchase,
    editPurchase,
    deletePurchase,
    totalExpenses,
    monthlyExpenses,
    totalItemsCount,
    pendingExpenses,
  } = useStore();
  const { isStaffAuth } = useAuth();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'month' | 'year' | '30d'>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StorePurchase | null>(null);
  const [itemToDelete, setItemToDelete] = useState<StorePurchase | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add form state
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Dental Materials',
    quantity: 1,
    unit: 'box',
    unitPrice: 0,
    totalPrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    supplier: '',
    invoiceNumber: '',
    paymentStatus: 'Paid' as 'Paid' | 'Pending' | 'Partial',
    paymentMethod: 'Cash' as 'Cash' | 'Card' | 'Bank Transfer' | 'Due',
    expiryDate: '',
    notes: '',
  });

  // Calculate total automatically when qty or unit price changes
  const handleQtyPriceChange = (qty: number, price: number) => {
    const total = Math.round(qty * price * 100) / 100;
    setFormData((prev) => ({
      ...prev,
      quantity: qty,
      unitPrice: price,
      totalPrice: total,
    }));
  };

  const handleEditQtyPriceChange = (qty: number, price: number) => {
    const total = Math.round(qty * price * 100) / 100;
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        quantity: qty,
        unitPrice: price,
        totalPrice: total,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      itemName: '',
      category: 'Dental Materials',
      quantity: 1,
      unit: 'box',
      unitPrice: 0,
      totalPrice: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      supplier: '',
      invoiceNumber: '',
      paymentStatus: 'Paid',
      paymentMethod: 'Cash',
      expiryDate: '',
      notes: '',
    });
    setFormError(null);
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName.trim()) {
      setFormError('Item name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await addPurchase({
        itemName: formData.itemName.trim(),
        category: formData.category,
        quantity: Number(formData.quantity) || 1,
        unit: formData.unit,
        unitPrice: Number(formData.unitPrice) || 0,
        totalPrice:
          Number(formData.totalPrice) ||
          Number(formData.quantity) * Number(formData.unitPrice),
        purchaseDate:
          formData.purchaseDate || new Date().toISOString().split('T')[0],
        supplier: formData.supplier.trim(),
        invoiceNumber: formData.invoiceNumber.trim(),
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod,
        expiryDate: formData.expiryDate || undefined,
        notes: formData.notes.trim(),
      });
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.itemName.trim()) return;

    try {
      setIsSubmitting(true);
      await editPurchase(editingItem.id, {
        itemName: editingItem.itemName.trim(),
        category: editingItem.category,
        quantity: Number(editingItem.quantity) || 1,
        unit: editingItem.unit,
        unitPrice: Number(editingItem.unitPrice) || 0,
        totalPrice:
          Number(editingItem.totalPrice) ||
          Number(editingItem.quantity) * Number(editingItem.unitPrice),
        purchaseDate: editingItem.purchaseDate,
        supplier: editingItem.supplier.trim(),
        invoiceNumber: editingItem.invoiceNumber.trim(),
        paymentStatus: editingItem.paymentStatus,
        paymentMethod: editingItem.paymentMethod,
        expiryDate: editingItem.expiryDate || undefined,
        notes: editingItem.notes?.trim(),
      });
      setEditingItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setIsSubmitting(true);
      await deletePurchase(itemToDelete.id);
      setItemToDelete(null);
    } catch (err) {
      alert('Failed to delete item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Categories': purchases.length };
    CATEGORIES.slice(1).forEach((cat) => {
      counts[cat] = purchases.filter((p) => p.category === cat).length;
    });
    return counts;
  }, [purchases]);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const currentYear = now.getFullYear().toString();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return purchases.filter((item) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.itemName.toLowerCase().includes(query);
        const matchesSupplier = item.supplier.toLowerCase().includes(query);
        const matchesInvoice = item.invoiceNumber.toLowerCase().includes(query);
        if (!matchesName && !matchesSupplier && !matchesInvoice) return false;
      }

      // Category
      if (selectedCategory !== 'All Categories' && item.category !== selectedCategory) {
        return false;
      }

      // Status
      if (selectedStatus !== 'All' && item.paymentStatus !== selectedStatus) {
        return false;
      }

      // Date Range
      if (selectedDateRange === 'month' && !item.purchaseDate.startsWith(currentMonth)) {
        return false;
      }
      if (selectedDateRange === 'year' && !item.purchaseDate.startsWith(currentYear)) {
        return false;
      }
      if (selectedDateRange === '30d') {
        const itemDate = new Date(item.purchaseDate);
        if (itemDate < thirtyDaysAgo) return false;
      }

      return true;
    });
  }, [purchases, searchQuery, selectedCategory, selectedStatus, selectedDateRange]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredPurchases.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = [
      'Item Name',
      'Category',
      'Quantity',
      'Unit',
      'Unit Price (USD)',
      'Total Price (USD)',
      'Purchase Date',
      'Supplier',
      'Invoice #',
      'Payment Status',
      'Payment Method',
      'Expiry Date',
      'Notes',
    ];

    const rows = filteredPurchases.map((p) => [
      `"${p.itemName.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.quantity,
      `"${p.unit}"`,
      p.unitPrice,
      p.totalPrice,
      p.purchaseDate,
      `"${(p.supplier || '').replace(/"/g, '""')}"`,
      `"${(p.invoiceNumber || '').replace(/"/g, '""')}"`,
      p.paymentStatus,
      p.paymentMethod,
      p.expiryDate || '',
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `neom_clinic_purchases_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to check expiry status
  const getExpiryBadge = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
          <ShieldAlert className="w-2.5 h-2.5" />
          Expired ({expiryDate})
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <Clock className="w-2.5 h-2.5" />
          Expiring in {diffDays}d
        </span>
      );
    }
    return (
      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
        Exp: {expiryDate}
      </span>
    );
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0c1214] py-6 px-4 sm:px-6 lg:px-8 text-gray-900 dark:text-white transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── TOP HEADER ──────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-[#008294] dark:text-teal-400 flex items-center justify-center shadow-xs shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Clinic Store & Supplies
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/10 text-[#008294] dark:text-teal-300 border border-teal-500/20">
                  Procurement
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Manage dental materials, equipment inventory, consumables, and supplier invoices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#111719] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#161d20] text-gray-700 dark:text-gray-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Download procurement records as CSV"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export CSV</span>
            </button>

            {!isStaffAuth && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#008294] hover:bg-[#006e7d] text-white text-xs font-bold shadow-md shadow-teal-500/20 hover:shadow-teal-500/30 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Record New Purchase</span>
              </button>
            )}
          </div>
        </div>

        {/* ── METRIC STAT CARDS ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: All-Time Expense */}
          <div className="bg-white dark:bg-[#111719] rounded-[24px] p-5 border border-gray-100 dark:border-gray-800 shadow-xs hover:border-teal-500/30 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total Purchases
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <DollarSign className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-bold text-gray-400">USD</span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>All-time clinic supplies cost</span>
            </p>
          </div>

          {/* Card 2: This Month */}
          <div className="bg-white dark:bg-[#111719] rounded-[24px] p-5 border border-gray-100 dark:border-gray-800 shadow-xs hover:border-teal-500/30 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                This Month
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-[#008294] dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
                <Calendar className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#008294] dark:text-teal-400 font-mono tracking-tight">
                ${monthlyExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-bold text-gray-400">USD</span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Purchased in {new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}
            </p>
          </div>

          {/* Card 3: Total Items */}
          <div className="bg-white dark:bg-[#111719] rounded-[24px] p-5 border border-gray-100 dark:border-gray-800 shadow-xs hover:border-teal-500/30 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total Transactions
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20">
                <Boxes className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {totalItemsCount}
              </span>
              <span className="text-[11px] font-semibold text-gray-400">records</span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Recorded inventory purchases
            </p>
          </div>

          {/* Card 4: Pending Invoices */}
          <div className="bg-white dark:bg-[#111719] rounded-[24px] p-5 border border-gray-100 dark:border-gray-800 shadow-xs hover:border-teal-500/30 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Pending Balance
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Clock className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
                ${pendingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-bold text-gray-400">USD</span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Due / credit payment amount
            </p>
          </div>
        </div>

        {/* ── CATEGORY QUICK-PILL BAR ─────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#008294] text-white border-[#008294] shadow-xs'
                    : 'bg-white dark:bg-[#111719] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#161d20]'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── FILTER & SEARCH CONTROL BAR ─────────────────────────────── */}
        <div className="bg-white dark:bg-[#111719] p-3.5 sm:p-4 rounded-[20px] shadow-xs border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-3.5 my-auto w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by item name, vendor, or invoice #..."
              className="pl-10 pr-9 w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 my-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Payment:
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full bg-gray-50/70 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending / Unpaid</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          {/* Timeframe Filter Pills */}
          <div className="flex items-center gap-1 bg-gray-100/70 dark:bg-[#161d20] p-1 rounded-full border border-gray-200/50 dark:border-gray-800">
            {[
              { id: 'all', label: 'All' },
              { id: 'month', label: 'Month' },
              { id: '30d', label: '30 Days' },
              { id: 'year', label: 'Year' },
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setSelectedDateRange(tf.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedDateRange === tf.id
                    ? 'bg-[#008294] text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── PURCHASES TABLE CARD ────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#111719] rounded-[24px] shadow-xs border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-4 bg-gray-50/60 dark:bg-[#141b1e] border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse" />
              Purchase & Supply Records
            </h2>
            <span className="text-[11px] bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 px-2.5 py-0.5 rounded-full font-bold">
              {filteredPurchases.length} Total
            </span>
          </div>

          {isLoading ? (
            <div className="p-16 text-center">
              <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Loading clinic procurement records...
              </p>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-[#008294] dark:text-teal-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Boxes className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                No purchases found
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                {purchases.length === 0
                  ? 'Start by recording your first purchase of dental supplies or equipment.'
                  : 'No purchase records match your search and filter criteria.'}
              </p>
              {purchases.length === 0 && !isStaffAuth && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white bg-[#008294] hover:bg-[#006e7d] shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Record First Purchase</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800/80">
                <thead className="bg-gray-50/70 dark:bg-[#141b1e]">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Item & Category
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Qty & Unit
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Unit Cost
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Supplier / Invoice
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Payment
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-[#111719] divide-y divide-gray-100 dark:divide-gray-800/60 font-medium text-xs">
                  {filteredPurchases.map((item) => {
                    const catStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.Other;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-teal-500/[0.02] dark:hover:bg-teal-500/[0.04] transition-colors"
                      >
                        {/* Item Name & Category */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 dark:text-white text-xs">
                            {item.itemName}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                            >
                              {item.category}
                            </span>
                            {getExpiryBadge(item.expiryDate)}
                          </div>
                          {item.notes && (
                            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 italic line-clamp-1" title={item.notes}>
                              &quot;{item.notes}&quot;
                            </p>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-extrabold text-gray-900 dark:text-white font-mono text-xs">
                            {item.quantity}
                          </span>{' '}
                          <span className="text-gray-500 dark:text-gray-400 font-medium">
                            {item.unit}
                          </span>
                        </td>

                        {/* Unit Price */}
                        <td className="px-5 py-4 whitespace-nowrap font-mono text-gray-700 dark:text-gray-300">
                          ${Number(item.unitPrice).toFixed(2)}
                        </td>

                        {/* Total Amount */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            ${Number(item.totalPrice).toFixed(2)}
                          </div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                            USD
                          </span>
                        </td>

                        {/* Supplier / Invoice */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-gray-900 dark:text-white font-bold flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{item.supplier || <span className="text-gray-400 italic font-normal">Direct Purchase</span>}</span>
                          </div>
                          {item.invoiceNumber && (
                            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-mono">
                              <Receipt className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>{item.invoiceNumber}</span>
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 text-[11px]">
                          {formatDateLabel(item.purchaseDate)}
                        </td>

                        {/* Payment Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              item.paymentStatus === 'Paid'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                : item.paymentStatus === 'Pending'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                                : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.paymentStatus === 'Paid'
                                  ? 'bg-emerald-500'
                                  : item.paymentStatus === 'Pending'
                                  ? 'bg-amber-500'
                                  : 'bg-sky-500'
                              }`}
                            />
                            {item.paymentStatus}
                          </span>
                          <span className="text-[10px] text-gray-400 block mt-0.5 pl-0.5">
                            {item.paymentMethod}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                          {!isStaffAuth && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingItem({ ...item })}
                                className="p-1.5 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-500/10 rounded-full transition cursor-pointer"
                                title="Edit Purchase Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemToDelete(item)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── RECORD NEW PURCHASE MODAL ───────────────────────── */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-[#111719] border border-gray-100 dark:border-gray-800 rounded-[28px] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 sm:px-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-[#141b1e]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-[#008294] dark:text-teal-400 flex items-center justify-center shadow-xs">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Record Clinic Purchase
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Add a supply, material, or equipment invoice to inventory
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Quick Presets */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#008294]" />
                    <span>Quick Dental Presets (Click to autofill)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                    {PRESET_ITEMS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            itemName: preset.name,
                            category: preset.category,
                            unit: preset.unit,
                          }));
                        }}
                        className="text-[11px] px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-[#008294] dark:text-teal-300 rounded-lg border border-teal-500/20 transition-all cursor-pointer font-semibold"
                      >
                        + {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Item Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Item Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.itemName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, itemName: e.target.value }))
                      }
                      placeholder="e.g. Dental Composite Resin Kit A2/A3"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, category: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none font-semibold cursor-pointer"
                    >
                      {CATEGORIES.filter((c) => c !== 'All Categories').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Packaging Unit
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, unit: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none font-semibold cursor-pointer"
                    >
                      <option value="box">Box</option>
                      <option value="pack">Pack</option>
                      <option value="piece">Piece</option>
                      <option value="bottle">Bottle</option>
                      <option value="vial">Vial</option>
                      <option value="kit">Kit</option>
                      <option value="set">Set</option>
                      <option value="tube">Tube</option>
                      <option value="carton">Carton</option>
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.quantity}
                      onChange={(e) =>
                        handleQtyPriceChange(
                          Number(e.target.value) || 1,
                          formData.unitPrice
                        )
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none font-bold"
                    />
                  </div>

                  {/* Unit Price (USD) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Unit Price (USD)
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 font-bold text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.unitPrice}
                        onChange={(e) =>
                          handleQtyPriceChange(
                            formData.quantity,
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full pl-7 pr-12 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-teal-500 text-xs outline-none"
                        placeholder="0.00"
                      />
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] font-bold text-gray-400">
                        USD
                      </span>
                    </div>
                  </div>

                  {/* Auto-Calculated Total Amount Banner */}
                  <div className="md:col-span-2 p-3.5 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                        Total Invoice Cost
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        Auto-calculated: {formData.quantity} × ${Number(formData.unitPrice).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                        ${Number(formData.totalPrice).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">
                        USD
                      </span>
                    </div>
                  </div>

                  {/* Purchase Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, purchaseDate: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none cursor-pointer"
                    />
                  </div>

                  {/* Expiry Date (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none cursor-pointer"
                    />
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Supplier / Vendor
                    </label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, supplier: e.target.value }))
                      }
                      placeholder="e.g. 3M ESPE, Dentsply Sirona"
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none"
                    />
                  </div>

                  {/* Invoice # */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Invoice / Bill #
                    </label>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))
                      }
                      placeholder="e.g. INV-2026-091"
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none"
                    />
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paymentStatus: e.target.value as any,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none font-semibold cursor-pointer"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending / Unpaid</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paymentMethod: e.target.value as any,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none font-semibold cursor-pointer"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Due">Due / Credit</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Notes / Remarks (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder="e.g. Purchased for endodontic surgeries; stored in Cabinet B..."
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#161d20] hover:bg-gray-200 dark:hover:bg-gray-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#008294] hover:bg-[#006e7d] shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Purchase Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── EDIT PURCHASE MODAL ───────────────────────── */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-[#111719] border border-gray-100 dark:border-gray-800 rounded-[28px] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
              <div className="p-5 sm:px-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-[#141b1e]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-[#008294] dark:text-teal-400 flex items-center justify-center shadow-xs">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Edit Purchase Record
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Update details for {editingItem.itemName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Item Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Item Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingItem.itemName}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, itemName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={editingItem.category}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, category: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none font-semibold cursor-pointer"
                    >
                      {CATEGORIES.filter((c) => c !== 'All Categories').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Packaging Unit
                    </label>
                    <input
                      type="text"
                      value={editingItem.unit}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, unit: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={editingItem.quantity}
                      onChange={(e) =>
                        handleEditQtyPriceChange(
                          Number(e.target.value) || 1,
                          editingItem.unitPrice
                        )
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none font-bold"
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Unit Price (USD)
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 font-bold text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingItem.unitPrice}
                        onChange={(e) =>
                          handleEditQtyPriceChange(
                            editingItem.quantity,
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full pl-7 pr-12 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-teal-500 text-xs outline-none"
                      />
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] font-bold text-gray-400">
                        USD
                      </span>
                    </div>
                  </div>

                  {/* Total banner */}
                  <div className="md:col-span-2 p-3.5 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                        Total Invoice Cost
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {editingItem.quantity} × ${Number(editingItem.unitPrice).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                        ${Number(editingItem.totalPrice).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">
                        USD
                      </span>
                    </div>
                  </div>

                  {/* Purchase Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={editingItem.purchaseDate}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, purchaseDate: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none cursor-pointer"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={editingItem.expiryDate || ''}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, expiryDate: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none cursor-pointer"
                    />
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Supplier / Vendor
                    </label>
                    <input
                      type="text"
                      value={editingItem.supplier}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, supplier: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none"
                    />
                  </div>

                  {/* Invoice # */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Invoice #
                    </label>
                    <input
                      type="text"
                      value={editingItem.invoiceNumber}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, invoiceNumber: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none"
                    />
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={editingItem.paymentStatus}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          paymentStatus: e.target.value as any,
                        })
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none font-semibold cursor-pointer"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending / Unpaid</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={editingItem.paymentMethod}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          paymentMethod: e.target.value as any,
                        })
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none font-semibold cursor-pointer"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Due">Due / Credit</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={2}
                      value={editingItem.notes || ''}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, notes: e.target.value })
                      }
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#161d20] hover:bg-gray-200 dark:hover:bg-gray-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#008294] hover:bg-[#006e7d] shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── DELETE CONFIRMATION DIALOG ───────────────────────── */}
        {itemToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-[#111719] border border-gray-100 dark:border-gray-800 rounded-[28px] shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Delete Purchase Record?
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Are you sure you want to remove <span className="font-bold text-gray-800 dark:text-gray-200">&quot;{itemToDelete.itemName}&quot;</span>? This action cannot be undone.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#161d20] hover:bg-gray-200 dark:hover:bg-gray-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition cursor-pointer"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Record'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
