"use client";

import { useState, useMemo } from 'react';
import { useStore, StorePurchase } from '@/app/context/StoreContext';
import { useAuth } from '@/app/context/AuthContext';

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
  const { purchases, isLoading, addPurchase, editPurchase, deletePurchase, totalExpenses, monthlyExpenses, totalItemsCount, pendingExpenses } = useStore();
  const { isStaffAuth } = useAuth();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'month' | 'year' | '30d'>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StorePurchase | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    notes: ''
  });

  // Calculate total automatically when qty or unit price changes
  const handleQtyPriceChange = (qty: number, price: number) => {
    const total = Math.round(qty * price * 100) / 100;
    setFormData(prev => ({
      ...prev,
      quantity: qty,
      unitPrice: price,
      totalPrice: total
    }));
  };

  const handleEditQtyPriceChange = (qty: number, price: number) => {
    const total = Math.round(qty * price * 100) / 100;
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        quantity: qty,
        unitPrice: price,
        totalPrice: total
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
      notes: ''
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
        totalPrice: Number(formData.totalPrice) || (Number(formData.quantity) * Number(formData.unitPrice)),
        purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
        supplier: formData.supplier.trim(),
        invoiceNumber: formData.invoiceNumber.trim(),
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod,
        expiryDate: formData.expiryDate || undefined,
        notes: formData.notes.trim()
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
        totalPrice: Number(editingItem.totalPrice) || (Number(editingItem.quantity) * Number(editingItem.unitPrice)),
        purchaseDate: editingItem.purchaseDate,
        supplier: editingItem.supplier.trim(),
        invoiceNumber: editingItem.invoiceNumber.trim(),
        paymentStatus: editingItem.paymentStatus,
        paymentMethod: editingItem.paymentMethod,
        expiryDate: editingItem.expiryDate || undefined,
        notes: editingItem.notes?.trim()
      });
      setEditingItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async (id: string) => {
    if (confirm('Are you sure you want to delete this purchase record?')) {
      try {
        setDeletingId(id);
        await deletePurchase(id);
      } catch (err) {
        alert('Failed to delete item');
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const currentYear = now.getFullYear().toString();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return purchases.filter(item => {
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
      'Notes'
    ];

    const rows = filteredPurchases.map(p => [
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
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clinic_store_purchases_${new Date().toISOString().split('T')[0]}.csv`);
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
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">Expired ({expiryDate})</span>;
    }
    if (diffDays <= 30) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Expiring in {diffDays}d</span>;
    }
    return <span className="text-xs text-gray-500 dark:text-gray-400">Exp: {expiryDate}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                📦
              </span>
              Clinic Store & Purchases
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage doctor purchases, dental clinic supplies, equipment, and expense receipts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium shadow-sm transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>

            {!isStaffAuth && (
              <button
                onClick={() => { resetForm(); setShowAddModal(true); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Record New Purchase
              </button>
            )}
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Purchases</span>
              <span className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm">💵</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-mono">
              ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-400">USD</span>
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">All-time clinic supplies cost</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">This Month</span>
              <span className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg text-sm">📅</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
              ${monthlyExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-400">USD</span>
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Purchased in {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Items</span>
              <span className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg text-sm">🏷️</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {totalItemsCount}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Recorded purchase transactions</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending Invoices</span>
              <span className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg text-sm">⏳</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              ${pendingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-400">USD</span>
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Due / pending payment balance</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search item, supplier, invoice..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="All">All Payment Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedDateRange('all')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${selectedDateRange === 'all' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateRange('month')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${selectedDateRange === 'month' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateRange('30d')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${selectedDateRange === '30d' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateRange('year')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${selectedDateRange === 'year' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`}
              >
                Year
              </button>
            </div>
          </div>
        </div>

        {/* Purchases Table / List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Purchase Records
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                ({filteredPurchases.length} of {purchases.length} items)
              </span>
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-3 text-sm text-gray-500">Loading clinic store items...</p>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-4xl">🛒</span>
              <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">No purchases found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {purchases.length === 0 
                  ? 'Start by recording your first purchase of dental supplies or equipment.' 
                  : 'No purchase records match your search and filter criteria.'}
              </p>
              {purchases.length === 0 && !isStaffAuth && (
                <button
                  onClick={() => { resetForm(); setShowAddModal(true); }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Record First Purchase
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-700/40 text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold border-b border-gray-100 dark:border-gray-700">
                    <th className="px-5 py-3.5">Item & Category</th>
                    <th className="px-4 py-3.5">Qty & Unit</th>
                    <th className="px-4 py-3.5">Unit Price</th>
                    <th className="px-4 py-3.5">Total (USD)</th>
                    <th className="px-4 py-3.5">Supplier / Invoice</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredPurchases.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{item.itemName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                            {item.category}
                          </span>
                          {getExpiryBadge(item.expiryDate)}
                        </div>
                        {item.notes && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1 italic">
                            &quot;{item.notes}&quot;
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                        <span className="font-bold text-gray-900 dark:text-white">{item.quantity}</span> {item.unit}
                      </td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300 font-mono">
                        ${Number(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                          ${Number(item.totalPrice).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-gray-400 block uppercase">USD</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-gray-900 dark:text-white font-medium">{item.supplier || '—'}</div>
                        {item.invoiceNumber && (
                          <div className="text-xs text-gray-400">Inv: {item.invoiceNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300 text-xs">
                        {item.purchaseDate}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : item.paymentStatus === 'Pending'
                            ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {item.paymentStatus}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{item.paymentMethod}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!isStaffAuth && (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => setEditingItem({ ...item })}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                              title="Edit Purchase"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteConfirm(item.id)}
                              disabled={deletingId === item.id}
                              className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete Purchase"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── RECORD NEW PURCHASE MODAL ───────────────────────── */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-lg">
                    🛒
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Record Clinic Purchase</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Add an item or supply purchased for the clinic</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
                {formError && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm border border-red-200 dark:border-red-800">
                    {formError}
                  </div>
                )}

                {/* Quick Presets for popular dental items */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                    Quick Preset Suggestions (Click to fill)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {PRESET_ITEMS.slice(0, 6).map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            itemName: preset.name,
                            category: preset.category,
                            unit: preset.unit
                          }));
                        }}
                        className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-indigo-50 dark:bg-gray-700 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-lg transition-colors"
                      >
                        + {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.itemName}
                      onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
                      placeholder="e.g. Dental Composite Resin Kit A2/A3"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      {CATEGORIES.filter(c => c !== 'All Categories').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Packaging Unit
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
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
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.quantity}
                      onChange={(e) => handleQtyPriceChange(Number(e.target.value) || 1, formData.unitPrice)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Unit Price (USD) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Unit Price (USD)
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.unitPrice}
                        onChange={(e) => handleQtyPriceChange(formData.quantity, Number(e.target.value) || 0)}
                        className="w-full pl-8 pr-12 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="0.00"
                      />
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-gray-400">USD</span>
                    </div>
                  </div>

                  {/* Total Cost (USD) */}
                  <div className="md:col-span-2 p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Total Amount (USD)</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">Auto-calculated: {formData.quantity} × ${Number(formData.unitPrice).toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                        ${Number(formData.totalPrice).toFixed(2)}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-bold">USD</span>
                    </div>
                  </div>

                  {/* Purchase Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Expiry Date (Optional) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Supplier / Vendor */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Supplier / Vendor
                    </label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                      placeholder="e.g. 3M ESPE, Dentsply, Local Medical"
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Invoice # */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Invoice / Bill #
                    </label>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                      placeholder="e.g. INV-2026-091"
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentStatus: e.target.value as any }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending / Unpaid</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Due">Due / Credit</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Notes / Remarks
                    </label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="e.g. Bought for endodontic surgeries; stored in cabinet B"
                      className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    Save Purchase Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── EDIT PURCHASE MODAL ───────────────────────── */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-lg">
                    ✏️
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Purchase Record</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Update details for {editingItem.itemName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Item Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingItem.itemName}
                      onChange={(e) => setEditingItem({ ...editingItem, itemName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={editingItem.category}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      {CATEGORIES.filter(c => c !== 'All Categories').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Packaging Unit
                    </label>
                    <input
                      type="text"
                      value={editingItem.unit}
                      onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={editingItem.quantity}
                      onChange={(e) => handleEditQtyPriceChange(Number(e.target.value) || 1, editingItem.unitPrice)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Unit Price (USD) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Unit Price (USD)
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingItem.unitPrice}
                        onChange={(e) => handleEditQtyPriceChange(editingItem.quantity, Number(e.target.value) || 0)}
                        className="w-full pl-8 pr-12 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-gray-400">USD</span>
                    </div>
                  </div>

                  {/* Total Cost (USD) */}
                  <div className="md:col-span-2 p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Total Amount (USD)</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">{editingItem.quantity} × ${Number(editingItem.unitPrice).toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                        ${Number(editingItem.totalPrice).toFixed(2)}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-bold">USD</span>
                    </div>
                  </div>

                  {/* Purchase Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={editingItem.purchaseDate}
                      onChange={(e) => setEditingItem({ ...editingItem, purchaseDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={editingItem.expiryDate || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, expiryDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Supplier / Vendor
                    </label>
                    <input
                      type="text"
                      value={editingItem.supplier}
                      onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Invoice # */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Invoice #
                    </label>
                    <input
                      type="text"
                      value={editingItem.invoiceNumber}
                      onChange={(e) => setEditingItem({ ...editingItem, invoiceNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={editingItem.paymentStatus}
                      onChange={(e) => setEditingItem({ ...editingItem, paymentStatus: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending / Unpaid</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={editingItem.paymentMethod}
                      onChange={(e) => setEditingItem({ ...editingItem, paymentMethod: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Due">Due / Credit</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={2}
                      value={editingItem.notes || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
