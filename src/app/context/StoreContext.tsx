"use client";

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { supabase, ensureStorePurchasesTableExists } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export interface StorePurchase {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  purchaseDate: string; // YYYY-MM-DD
  supplier: string;
  invoiceNumber: string;
  paymentStatus: 'Paid' | 'Pending' | 'Partial';
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Due';
  expiryDate?: string;
  notes?: string;
  createdAt: string;
  userId?: string;
}

interface StorePurchaseDB {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  purchase_date: string;
  supplier: string;
  invoice_number: string;
  payment_status: 'Paid' | 'Pending' | 'Partial';
  payment_method: 'Cash' | 'Card' | 'Bank Transfer' | 'Due';
  expiry_date?: string | null;
  notes?: string | null;
  created_at: string;
  user_id?: string;
}

interface StoreContextType {
  purchases: StorePurchase[];
  isLoading: boolean;
  error: string | null;
  addPurchase: (purchase: Omit<StorePurchase, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  editPurchase: (id: string, purchaseData: Partial<Omit<StorePurchase, 'id' | 'createdAt' | 'userId'>>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  refreshPurchases: () => Promise<void>;
  totalExpenses: number;
  monthlyExpenses: number;
  totalItemsCount: number;
  pendingExpenses: number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'neom_clinic_store_purchases';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [purchases, setPurchases] = useState<StorePurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, userId } = useAuth();

  const mapDBToPurchase = (item: StorePurchaseDB): StorePurchase => ({
    id: item.id,
    itemName: item.item_name,
    category: item.category || 'Dental Materials',
    quantity: Number(item.quantity) || 1,
    unit: item.unit || 'piece',
    unitPrice: Number(item.unit_price) || 0,
    totalPrice: Number(item.total_price) || 0,
    purchaseDate: item.purchase_date || new Date().toISOString().split('T')[0],
    supplier: item.supplier || '',
    invoiceNumber: item.invoice_number || '',
    paymentStatus: (item.payment_status as any) || 'Paid',
    paymentMethod: (item.payment_method as any) || 'Cash',
    expiryDate: item.expiry_date || undefined,
    notes: item.notes || '',
    createdAt: item.created_at,
    userId: item.user_id
  });

  const fetchPurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if table exists
      const exists = await ensureStorePurchasesTableExists();

      if (!exists) {
        // Fallback to local storage if DB table not yet created
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (cached) {
            try {
              setPurchases(JSON.parse(cached));
            } catch (e) {
              setPurchases([]);
            }
          }
        }
        setIsLoading(false);
        return;
      }

      let query = supabase
        .from('store_purchases')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
        query = query.eq('user_id', userId);
      }

      const { data, error: dbError } = await query;

      if (dbError) {
        console.warn('Could not fetch from store_purchases:', dbError.message);
        // Load fallback from localStorage
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (cached) {
            setPurchases(JSON.parse(cached));
          }
        }
      } else if (data) {
        const formatted = data.map((d: any) => mapDBToPurchase(d));
        setPurchases(formatted);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formatted));
        }
      }
    } catch (err) {
      console.error('Error in fetchPurchases:', err);
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) setPurchases(JSON.parse(cached));
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPurchases();
    } else {
      setPurchases([]);
    }
  }, [isAuthenticated, fetchPurchases]);

  const addPurchase = async (purchaseData: Omit<StorePurchase, 'id' | 'createdAt' | 'userId'>) => {
    try {
      setIsLoading(true);
      setError(null);

      const effectiveUserId = userId || '00000000-0000-0000-0000-000000000000';
      const calculatedTotal = Number(purchaseData.totalPrice) || (Number(purchaseData.quantity) * Number(purchaseData.unitPrice)) || 0;

      const newDbRecord = {
        item_name: purchaseData.itemName,
        category: purchaseData.category || 'Dental Materials',
        quantity: Number(purchaseData.quantity) || 1,
        unit: purchaseData.unit || 'piece',
        unit_price: Number(purchaseData.unitPrice) || 0,
        total_price: calculatedTotal,
        purchase_date: purchaseData.purchaseDate || new Date().toISOString().split('T')[0],
        supplier: purchaseData.supplier || '',
        invoice_number: purchaseData.invoiceNumber || '',
        payment_status: purchaseData.paymentStatus || 'Paid',
        payment_method: purchaseData.paymentMethod || 'Cash',
        expiry_date: purchaseData.expiryDate || null,
        notes: purchaseData.notes || '',
        user_id: effectiveUserId
      };

      const { data, error: insertError } = await supabase
        .from('store_purchases')
        .insert(newDbRecord)
        .select();

      let createdItem: StorePurchase;

      if (insertError) {
        console.warn('Supabase insert failed, using local item:', insertError.message);
        // Create local item with UUID
        createdItem = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,
          ...purchaseData,
          totalPrice: calculatedTotal,
          createdAt: new Date().toISOString(),
          userId: effectiveUserId
        };
      } else if (data && data[0]) {
        createdItem = mapDBToPurchase(data[0]);
      } else {
        createdItem = {
          id: `local-${Date.now()}`,
          ...purchaseData,
          totalPrice: calculatedTotal,
          createdAt: new Date().toISOString(),
          userId: effectiveUserId
        };
      }

      setPurchases(prev => {
        const next = [createdItem, ...prev].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    } catch (err) {
      console.error('Error adding store purchase:', err);
      setError(err instanceof Error ? err.message : 'Failed to add purchase');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const editPurchase = async (id: string, purchaseData: Partial<Omit<StorePurchase, 'id' | 'createdAt' | 'userId'>>) => {
    try {
      setIsLoading(true);
      setError(null);

      const dbUpdates: any = {};
      if (purchaseData.itemName !== undefined) dbUpdates.item_name = purchaseData.itemName;
      if (purchaseData.category !== undefined) dbUpdates.category = purchaseData.category;
      if (purchaseData.quantity !== undefined) dbUpdates.quantity = Number(purchaseData.quantity);
      if (purchaseData.unit !== undefined) dbUpdates.unit = purchaseData.unit;
      if (purchaseData.unitPrice !== undefined) dbUpdates.unit_price = Number(purchaseData.unitPrice);
      if (purchaseData.totalPrice !== undefined) dbUpdates.total_price = Number(purchaseData.totalPrice);
      if (purchaseData.purchaseDate !== undefined) dbUpdates.purchase_date = purchaseData.purchaseDate;
      if (purchaseData.supplier !== undefined) dbUpdates.supplier = purchaseData.supplier;
      if (purchaseData.invoiceNumber !== undefined) dbUpdates.invoice_number = purchaseData.invoiceNumber;
      if (purchaseData.paymentStatus !== undefined) dbUpdates.payment_status = purchaseData.paymentStatus;
      if (purchaseData.paymentMethod !== undefined) dbUpdates.payment_method = purchaseData.paymentMethod;
      if (purchaseData.expiryDate !== undefined) dbUpdates.expiry_date = purchaseData.expiryDate || null;
      if (purchaseData.notes !== undefined) dbUpdates.notes = purchaseData.notes;

      if (purchaseData.quantity !== undefined || purchaseData.unitPrice !== undefined) {
        const item = purchases.find(p => p.id === id);
        const qty = purchaseData.quantity !== undefined ? Number(purchaseData.quantity) : (item?.quantity || 1);
        const price = purchaseData.unitPrice !== undefined ? Number(purchaseData.unitPrice) : (item?.unitPrice || 0);
        if (purchaseData.totalPrice === undefined) {
          dbUpdates.total_price = qty * price;
        }
      }

      await supabase
        .from('store_purchases')
        .update(dbUpdates)
        .eq('id', id);

      setPurchases(prev => {
        const next = prev.map(p => {
          if (p.id !== id) return p;
          const updated = { ...p, ...purchaseData };
          if (dbUpdates.total_price !== undefined) {
            updated.totalPrice = dbUpdates.total_price;
          }
          return updated;
        }).sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));

        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    } catch (err) {
      console.error('Error editing store purchase:', err);
      setError(err instanceof Error ? err.message : 'Failed to edit purchase');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await supabase
        .from('store_purchases')
        .delete()
        .eq('id', id);

      setPurchases(prev => {
        const next = prev.filter(p => p.id !== id);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    } catch (err) {
      console.error('Error deleting purchase:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete purchase');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPurchases = async () => {
    await fetchPurchases();
  };

  // Computed metrics
  const { totalExpenses, monthlyExpenses, totalItemsCount, pendingExpenses } = useMemo(() => {
    const currentYearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    let total = 0;
    let month = 0;
    let pending = 0;

    purchases.forEach(p => {
      const amt = Number(p.totalPrice) || 0;
      total += amt;
      if (p.purchaseDate && p.purchaseDate.startsWith(currentYearMonth)) {
        month += amt;
      }
      if (p.paymentStatus === 'Pending' || p.paymentStatus === 'Partial') {
        pending += amt;
      }
    });

    return {
      totalExpenses: total,
      monthlyExpenses: month,
      totalItemsCount: purchases.length,
      pendingExpenses: pending
    };
  }, [purchases]);

  return (
    <StoreContext.Provider value={{
      purchases,
      isLoading,
      error,
      addPurchase,
      editPurchase,
      deletePurchase,
      refreshPurchases,
      totalExpenses,
      monthlyExpenses,
      totalItemsCount,
      pendingExpenses
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
