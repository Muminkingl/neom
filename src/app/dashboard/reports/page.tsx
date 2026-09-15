"use client";

import { useMemo, useEffect, useCallback } from 'react';
import { usePatients, Patient } from '@/app/context/PatientContext';
import { useStore } from '@/app/context/StoreContext';
import { supabase, ensureVisitsTableExists } from '@/lib/supabase';
import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { generatePatientPDF } from '@/lib/pdfGenerator';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

export default function ReportsPage() {
  const { patients, isLoading } = usePatients();
  const { purchases, totalExpenses: storeTotalExpenses, monthlyExpenses: storeMonthlyExpenses } = useStore();
  const { isStaffAuth, isReceptionAuth } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'store' | 'pnl'>('overview');
  const [allVisits, setAllVisits] = useState<any[]>([]);
  const [isLoadingVisitsData, setIsLoadingVisitsData] = useState(false);

  useEffect(() => {
    if (isReceptionAuth) {
      router.push('/dashboard');
    } else if (isStaffAuth) {
      router.push('/dashboard/patient-form');
    }
  }, [isReceptionAuth, isStaffAuth, router]);

  const [visitCountToday, setVisitCountToday] = useState<number>(0);
  const [visitPatientsToday, setVisitPatientsToday] = useState<string[]>([]);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [visitsForDate, setVisitsForDate] = useState<any[]>([]);
  const [visitPatients, setVisitPatients] = useState<Record<string, Patient>>({});
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);

  // Load all visits for revenue analytics
  const loadAllVisits = useCallback(async () => {
    try {
      setIsLoadingVisitsData(true);
      const visitsTableExists = await ensureVisitsTableExists();
      if (!visitsTableExists) return;

      const { data, error } = await supabase
        .from('visits')
        .select('id, patient_id, diagnosis, treatment, amount_paid, visited_at, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAllVisits(data);
      }
    } catch (e) {
      console.error('Failed to load all visits for revenue analytics:', e);
    } finally {
      setIsLoadingVisitsData(false);
    }
  }, []);

  useEffect(() => {
    loadAllVisits();
  }, [loadAllVisits]);

  // Function to load visits for a specific date
  const loadVisitsForDate = async (date: Date) => {
    setIsLoadingVisits(true);
    try {
      // First check if visits table exists
      const visitsTableExists = await ensureVisitsTableExists();

      if (!visitsTableExists) {
        console.warn("Visits table doesn't exist yet - showing zero visits for date");
        setVisitsForDate([]);
        setVisitPatients({});
        setIsLoadingVisits(false);
        return;
      }

      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('visits')
        .select('id, patient_id, created_at, amount_paid')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading visits for date:', error);
        setVisitsForDate([]);
        setVisitPatients({});
        return;
      }

      if (data) {
        setVisitsForDate(data);

        // Get patient details for each visit
        const patientIds = Array.from(new Set(data.map(v => v.patient_id)));
        const patientMap: Record<string, Patient> = {};

        if (patientIds.length > 0) {
          const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .in('id', patientIds);

          if (patientError) {
            console.error('Error loading patient details:', patientError);
          } else if (patientData) {
            patientData.forEach((p: any) => {
              patientMap[p.id] = {
                id: p.id,
                name: p.name,
                dob: p.dob,
                hospitalFileNumber: p.hospital_file_number,
                mobileNumber: p.mobile_number,
                sex: p.sex,
                ageOfDiagnosis: p.age_of_diagnosis,
                diagnosis: p.diagnosis,
                treatment: p.treatment,
                currentTreatment: p.current_treatment || '',
                clinicId: p.clinic_id || '',
                note: p.note,
                tableData: p.table_data || '',
                history: p.history || '',
                pastMedicalHistory: p.past_medical_history || '',
                drugHistory: p.drug_history || '',
                pastSurgicalHistory: p.past_surgical_history || '',
                followUpDate: p.follow_up_date || '',
                createdAt: p.created_at,
                userId: p.user_id
              };
            });
          }
        }

        setVisitPatients(patientMap);
      }
    } catch (e) {
      console.error('Failed to load visits:', e);
      setVisitsForDate([]);
      setVisitPatients({});
    } finally {
      setIsLoadingVisits(false);
    }
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Calculate age from DOB
  const calculateAge = (dob: string): number | string => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return 'N/A';

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  // Generic print function to handle all print types
  const handlePrintGeneric = (patient: Patient, content: string, title: string) => {
    // Create a new window for the print document
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website');
      return;
    }

    // Check if patient has necessary fields
    if (!patient.name || !patient.clinicId) {
      alert('Patient information is incomplete. Please ensure name and clinic ID are filled.');
      printWindow.close();
      return;
    }

    // Create content for the print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - ${patient.name}</title>
        <style>
          /* Reset all margins and paddings */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            width: 148mm;
            height: 210mm;
            margin: 0;
            padding: 0;
            background: white;
            font-family: Arial, sans-serif;
            overflow: hidden;
          }
          
          .print-container {
            width: 148mm;
            height: 210mm;
            position: relative;
            border: none;
            display: flex;
            margin: 0 auto;
            background: white;
            page-break-inside: avoid;
            page-break-after: always;
          }
            
          .report-image {
            width: 100%;
            height: 100%;
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            object-fit: contain;
            object-position: top left;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            image-rendering: pixelated;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
            
          /* Treatment data container - positioned at middle left */
          .treatment-data {
            position: absolute;
            top: 315px;  /* Shifted down and right */
            left: 40px;
            width: 90%;
            padding: 10px;
            box-sizing: border-box;
          }
          
          .clinic-container {
            position: absolute;
            top: 276px;  /* Shifted down and to the right */
            right: 72px;
            width: 30%;
            padding: 10px;
            box-sizing: border-box;
            display: flex;
            justify-content: flex-end;
          }
          .clinic-id-label {
            font-size: 10px;
            font-weight: bold;
            margin-right: 6px;
          }
          .clinic-id-value {
            font-size: 10px;
            font-weight: bold;
          }

          .name-arabic-container {
            position: absolute;
            top: 221px;  /* Shifted up tiny bit */
            right: 110px; /* Shifted left to prevent overlap with اسم المريض label */
            width: 40%;
            padding: 10px;
            box-sizing: border-box;
            text-align: left; /* Left aligned to grow leftward naturally and prevent overlap */
            font-size: 10px;
            font-weight: bold;
          }
          
          .age-arabic-container {
            position: absolute;
            top: 247px;  /* Shifted up tiny bit */
            right: 125px; /* Shifted left to be on the dotted line */
            width: 30%;
            padding: 10px;
            box-sizing: border-box;
            text-align: right; /* Right aligned next to العمر label */
            font-size: 10px;
            font-weight: bold;
          }

          .date-container {
            position: absolute;
            top: 241px;  /* Shifted down */
            left: 20px;  /* Shifted left to prevent overlap */
            width: 150px;
            padding: 10px;
            box-sizing: border-box;
            text-align: left; /* Left aligned to print directly on the dotted line */
            font-size: 10px;
            font-weight: bold;
          }
          
          /* Current treatment */
          .treatment-content {
            font-size: 10px;
            line-height: 1.6;
            white-space: pre-wrap;
            padding-top: 10px;
            padding-left: 10px;
            padding-right: 10px;
          }
          
          @media print {
            @page {
              size: 148mm 210mm;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
            }
            
            html, body {
              width: 148mm !important;
              height: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              background: white !important;
            }
            
            .print-container {
              width: 148mm !important;
              height: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
            }
            
            .report-image {
              display: none !important;
            }
            
            .name-arabic-container {
              position: absolute !important;
              top: 221px !important;
              right: 110px !important;
              width: 40% !important;
              text-align: left !important;
            }

            .age-arabic-container {
              position: absolute !important;
              top: 247px !important;
              right: 125px !important;
              width: 30% !important;
              text-align: right !important;
            }

            .date-container {
              position: absolute !important;
              top: 241px !important;
              left: 20px !important;
              width: 150px !important;
              text-align: left !important;
            }

            .clinic-container {
              position: absolute !important;
              top: 276px !important;
              right: 72px !important;
              width: 30% !important;
              padding: 10px !important;
              box-sizing: border-box !important;
              display: flex !important;
              justify-content: flex-end !important;
            }

            .treatment-data {
              position: absolute !important;
              top: 315px !important;
              left: 40px !important;
              width: 90% !important;
            }
            
            .print-button {
              display: none !important;
            }
          }
        
          .print-button {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <img src="/drhawar.jpg" class="report-image" />
          
          <!-- Name next to اسم المريض: -->
          <div class="name-arabic-container">${patient.name}</div>
          
          <!-- Age next to العمر: -->
          <div class="age-arabic-container">${calculateAge(patient.dob)}</div>

          <!-- Today's date next to التاريخ: -->
          <div class="date-container">${new Date().toISOString().split('T')[0]}</div>

          <!-- Clinic ID next to green text -->
          <div class="clinic-container">
            <div class="clinic-id-label">clinic ID:</div>
            <div class="clinic-id-value">${patient.clinicId}</div>
          </div>

          <!-- Treatment data in green area -->
          <div class="treatment-data">
            <!-- Content (without label) -->
            <div class="treatment-content">${content}</div>
          </div>
        </div>
        
        <button class="print-button" onclick="window.print();return false;">Print</button>
        <script>
          // Auto-print with better fit for A5 portrait
          window.onload = function() {
            // Force the window to be exactly A5 portrait size (148mm x 210mm)
            document.documentElement.style.width = '148mm';
            document.documentElement.style.height = '210mm';
            document.body.style.width = '148mm';
            document.body.style.height = '210mm';
            
            // Remove any browser-specific margins and borders
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.border = 'none';
            document.body.style.overflow = 'hidden';
            
            // Apply browser-specific overrides for A5 portrait
            const style = document.createElement('style');
            style.textContent = "@media print { @page { size: 148mm 210mm; margin: 0 !important; } html, body { width: 148mm !important; height: 210mm !important; margin: 0 !important; } }";
            document.head.appendChild(style);
            
            // Trigger print after ensuring layout is complete
            setTimeout(function() {
              window.print();
            }, 800);
          }
        </script>
      </body>
      </html>
    `);

    // Finish writing and close the document
    printWindow.document.close();
  };

  // Print treatment function
  const handlePrintTreatment = (patient: Patient) => {
    const content = patient.currentTreatment || 'No current treatment specified.';
    handlePrintGeneric(patient, content, 'Treatment Card');
  };



  // Handle report generation
  const handleGenerateReport = async (patient: Patient) => {
    try {
      await generatePatientPDF(patient);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    }
  };

  // Handle logging a visit (returning patient)
  const handleLogVisit = async (patient: Patient) => {
    try {
      // Import the function to ensure visits table exists
      const { ensureVisitsTableExists } = await import('@/lib/supabase');

      // Check if visits table exists
      const visitsTableExists = await ensureVisitsTableExists();

      if (!visitsTableExists) {
        alert('Unable to record visit. The visits table does not exist in the database.');
        return;
      }

      // Write a visit record; do not create duplicate patient
      const { error } = await supabase.from('visits').insert({ patient_id: patient.id });

      if (error) {
        console.error('Error inserting visit record:', error);
        alert('Failed to record visit. Database error.');
        return;
      }

      alert('Visit recorded successfully.');

      // Refresh the visits count in reports if possible
      try {
        // This is a simple event to inform other components that visits have changed
        window.dispatchEvent(new CustomEvent('visitsUpdated'));
      } catch (e) {
        // Ignore errors from event dispatch
      }
    } catch (e) {
      console.error('Error logging visit:', e);
      alert('Failed to record visit.');
    }
  };

  // Handle patient selection for details view
  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientDetails(true);
  };

  // Function to load today's visits
  const loadTodaysVisits = useCallback(async () => {
    try {
      // First check if visits table exists
      const visitsTableExists = await ensureVisitsTableExists();

      if (!visitsTableExists) {
        console.warn("Visits table doesn't exist yet - showing zero visits");
        setVisitCountToday(0);
        setVisitPatientsToday([]);
        return;
      }

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('visits')
        .select('id, patient_id, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) {
        console.error('Error loading visits:', error);
        return;
      }

      if (data) {
        setVisitCountToday(data.length);
        setVisitPatientsToday(Array.from(new Set(data.map(v => v.patient_id))));
      }
    } catch (e) {
      console.error('Failed to load visits:', e);
    }
  }, []);

  // Event listener for visit updates
  useEffect(() => {
    // Handler for the custom event
    const handleVisitsUpdated = () => {
      loadTodaysVisits();
    };

    // Add event listener
    window.addEventListener('visitsUpdated', handleVisitsUpdated);

    // Cleanup
    return () => {
      window.removeEventListener('visitsUpdated', handleVisitsUpdated);
    };
  }, [loadTodaysVisits]);

  useEffect(() => {
    document.title = 'Reports & Analytics';

    // Load today's visits count
    loadTodaysVisits();
  }, [loadTodaysVisits]);

  const now = new Date();
  const thisYear = now.getFullYear();

  const metrics = useMemo(() => {
    const byMonth = new Array(12).fill(0);
    const bySex: Record<string, number> = {};
    let thisYearCount = 0;
    let last30d = 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    patients.forEach(p => {
      const created = new Date(p.createdAt);
      if (created.getFullYear() === thisYear) {
        thisYearCount += 1;
        byMonth[created.getMonth()] += 1;
      }
      if (created >= thirtyDaysAgo) last30d += 1;
      const sexKey = (p.sex || 'Unknown').trim();
      bySex[sexKey] = (bySex[sexKey] || 0) + 1;
    });

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return { byMonth, bySex, thisYearCount, last30d, monthLabels };
  }, [patients, thisYear]);

  const barData = useMemo(() => ({
    labels: metrics.monthLabels,
    datasets: [
      {
        label: `New Patients ${thisYear}`,
        data: metrics.byMonth,
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  }), [metrics, thisYear]);

  const lineData = useMemo(() => ({
    labels: metrics.monthLabels,
    datasets: [
      {
        label: 'Cumulative Patients',
        data: metrics.byMonth.reduce<number[]>((acc, val, i) => {
          const sum = (acc[i - 1] ?? 0) + val;
          acc.push(sum);
          return acc;
        }, []),
        fill: true,
        borderColor: 'rgba(34,197,94,1)',
        backgroundColor: 'rgba(34,197,94,0.15)',
        tension: 0.35,
        pointRadius: 2,
      },
    ],
  }), [metrics]);

  const doughnutData = useMemo(() => {
    const labels = Object.keys(metrics.bySex);
    const data = Object.values(metrics.bySex);
    const palette = [
      'rgba(99,102,241,0.8)',
      'rgba(16,185,129,0.8)',
      'rgba(234,179,8,0.8)',
      'rgba(239,68,68,0.8)',
      'rgba(14,165,233,0.8)'
    ];
    return {
      labels,
      datasets: [
        {
          label: 'Sex Distribution',
          data,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
          borderWidth: 0,
        },
      ],
    };
  }, [metrics]);

  // ── REVENUE INTELLIGENCE METRICS ─────────────────────────────────
  const revenueMetrics = useMemo(() => {
    const byMonth = new Array(12).fill(0);
    const byTreatment: Record<string, number> = {};
    let total = 0;
    let thisYearTotal = 0;
    let thisMonthTotal = 0;
    let paidVisitsCount = 0;

    const currentMonthPrefix = now.toISOString().slice(0, 7);

    // Patient lookup map
    const patientMap: Record<string, Patient> = {};
    patients.forEach(p => { patientMap[p.id] = p; });

    // Track transactions list
    const txList: Array<{
      id: string;
      patientName: string;
      clinicId: string;
      date: string;
      diagnosis: string;
      treatment: string;
      amount: number;
    }> = [];

    // Aggregate from visits
    allVisits.forEach(v => {
      const amount = Number(v.amount_paid) || 0;
      if (amount > 0) {
        total += amount;
        paidVisitsCount += 1;

        const dateStr = v.visited_at || v.created_at;
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          if (d.getFullYear() === thisYear) {
            thisYearTotal += amount;
            byMonth[d.getMonth()] += amount;
          }
          if (dateStr.startsWith(currentMonthPrefix)) {
            thisMonthTotal += amount;
          }
        }

        const trtKey = (v.treatment || v.diagnosis || 'General Dental Treatment').trim();
        byTreatment[trtKey] = (byTreatment[trtKey] || 0) + amount;

        const pt = patientMap[v.patient_id];
        txList.push({
          id: v.id,
          patientName: pt?.name || 'Patient',
          clinicId: pt?.clinicId || '—',
          date: (dateStr || '').split('T')[0],
          diagnosis: v.diagnosis || '—',
          treatment: v.treatment || '—',
          amount
        });
      }
    });

    // Also include patient amountPaid if not already captured in visits
    patients.forEach(p => {
      const pAmt = Number(p.amountPaid) || 0;
      const patientVisitsPaid = allVisits
        .filter(v => v.patient_id === p.id)
        .reduce((sum, v) => sum + (Number(v.amount_paid) || 0), 0);

      if (pAmt > patientVisitsPaid) {
        const diff = pAmt - patientVisitsPaid;
        total += diff;
        paidVisitsCount += 1;

        const d = new Date(p.createdAt);
        if (d.getFullYear() === thisYear) {
          thisYearTotal += diff;
          byMonth[d.getMonth()] += diff;
        }
        if (p.createdAt.startsWith(currentMonthPrefix)) {
          thisMonthTotal += diff;
        }

        const trtKey = (p.treatment || p.diagnosis || 'Initial Registration').trim();
        byTreatment[trtKey] = (byTreatment[trtKey] || 0) + diff;

        txList.push({
          id: `pt-${p.id}`,
          patientName: p.name,
          clinicId: p.clinicId || '—',
          date: (p.createdAt || '').split('T')[0],
          diagnosis: p.diagnosis || 'Initial Registration',
          treatment: p.treatment || 'Consultation',
          amount: diff
        });
      }
    });

    const averagePerVisit = paidVisitsCount > 0 ? Math.round((total / paidVisitsCount) * 100) / 100 : 0;

    return {
      total,
      totalRevenue: total,
      thisYearTotal,
      thisYearRevenue: thisYearTotal,
      thisMonthTotal,
      thisMonthRevenue: thisMonthTotal,
      byMonth,
      byTreatment,
      paidVisitsCount,
      averagePerVisit,
      avgPerPaidVisit: averagePerVisit,
      txList: txList.sort((a, b) => b.date.localeCompare(a.date))
    };
  }, [allVisits, patients, thisYear, now]);

  // ── CLINIC STORE EXPENSE METRICS ────────────────────────────────
  const storeMetrics = useMemo(() => {
    const byMonth = new Array(12).fill(0);
    const byCategory: Record<string, number> = {};
    const bySupplier: Record<string, number> = {};
    let total = 0;
    let thisYearTotal = 0;
    let thisMonthTotal = 0;
    let totalItems = 0;
    let pendingCost = 0;
    let pendingNum = 0;

    const currentMonthPrefix = now.toISOString().slice(0, 7);

    purchases.forEach(p => {
      const cost = Number(p.totalPrice) || 0;
      total += cost;
      totalItems += Number(p.quantity) || 1;

      if (p.paymentStatus !== 'Paid') {
        pendingCost += cost;
        pendingNum += 1;
      }

      const d = new Date(p.purchaseDate);
      if (!isNaN(d.getTime())) {
        if (d.getFullYear() === thisYear) {
          thisYearTotal += cost;
          byMonth[d.getMonth()] += cost;
        }
        if (p.purchaseDate.startsWith(currentMonthPrefix)) {
          thisMonthTotal += cost;
        }
      }

      const cat = p.category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + cost;

      if (p.supplier) {
        bySupplier[p.supplier] = (bySupplier[p.supplier] || 0) + cost;
      }
    });

    const topSuppliers = Object.entries(bySupplier)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total,
      totalExpenses: total,
      thisYearTotal,
      thisYearExpenses: thisYearTotal,
      thisMonthTotal,
      thisMonthExpenses: thisMonthTotal,
      totalItemsCount: totalItems,
      totalPurchasesCount: purchases.length,
      pendingExpenses: pendingCost,
      pendingCount: pendingNum,
      byMonth,
      byCategory,
      bySupplier,
      topSuppliers
    };
  }, [purchases, thisYear, now]);

  // ── PROFIT & LOSS METRICS ───────────────────────────────────────
  const profitLossMetrics = useMemo(() => {
    const netProfit = revenueMetrics.total - storeMetrics.total;
    const netProfitThisYear = revenueMetrics.thisYearTotal - storeMetrics.thisYearTotal;
    const margin = revenueMetrics.total > 0
      ? ((netProfit / revenueMetrics.total) * 100).toFixed(1)
      : '0';

    return {
      netProfit,
      netProfitThisYear,
      margin,
      profitMargin: Number(margin) || 0,
      isProfitable: netProfit >= 0
    };
  }, [revenueMetrics, storeMetrics]);

  // ── CHARTS CONFIGURATIONS ──────────────────────────────────────
  const revenueBarData = useMemo(() => ({
    labels: metrics.monthLabels,
    datasets: [
      {
        label: `Treatment Revenue ${thisYear} ($ USD)`,
        data: revenueMetrics.byMonth,
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  }), [metrics, revenueMetrics, thisYear]);

  const revenueTreatmentDoughnutData = useMemo(() => {
    const entries = Object.entries(revenueMetrics.byTreatment)
      .sort((a, b) => b[1] - a[1]);
    const topEntries = entries.slice(0, 5);
    const otherSum = entries.slice(5).reduce((s, e) => s + e[1], 0);

    const labels = topEntries.map(e => e[0]);
    const data = topEntries.map(e => e[1]);
    if (otherSum > 0) {
      labels.push('Other Treatments');
      data.push(otherSum);
    }

    const palette = [
      'rgba(16, 185, 129, 0.85)',
      'rgba(59, 130, 246, 0.85)',
      'rgba(139, 92, 246, 0.85)',
      'rgba(245, 158, 11, 0.85)',
      'rgba(236, 72, 153, 0.85)',
      'rgba(156, 163, 175, 0.85)',
    ];

    return {
      labels: labels.length > 0 ? labels : ['No revenue data'],
      datasets: [
        {
          label: 'Revenue by Procedure ($ USD)',
          data: data.length > 0 ? data : [0],
          backgroundColor: palette.slice(0, Math.max(1, labels.length)),
          borderWidth: 0,
        },
      ],
    };
  }, [revenueMetrics]);

  const storeExpenseBarData = useMemo(() => ({
    labels: metrics.monthLabels,
    datasets: [
      {
        label: `Clinic Purchases ${thisYear} ($ USD)`,
        data: storeMetrics.byMonth,
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  }), [metrics, storeMetrics, thisYear]);

  const storeCategoryDoughnutData = useMemo(() => {
    const labels = Object.keys(storeMetrics.byCategory);
    const data = Object.values(storeMetrics.byCategory);
    const palette = [
      'rgba(99, 102, 241, 0.85)',
      'rgba(236, 72, 153, 0.85)',
      'rgba(245, 158, 11, 0.85)',
      'rgba(14, 165, 233, 0.85)',
      'rgba(168, 85, 247, 0.85)',
      'rgba(34, 197, 94, 0.85)',
      'rgba(156, 163, 175, 0.85)'
    ];
    return {
      labels: labels.length > 0 ? labels : ['No purchases'],
      datasets: [
        {
          label: 'Expenses by Category ($ USD)',
          data: data.length > 0 ? data : [0],
          backgroundColor: palette.slice(0, Math.max(1, labels.length)),
          borderWidth: 0,
        },
      ],
    };
  }, [storeMetrics]);

  const pnlComparisonData = useMemo(() => ({
    labels: metrics.monthLabels,
    datasets: [
      {
        label: `Treatment Revenue ($ USD)`,
        data: revenueMetrics.byMonth,
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 4,
      },
      {
        label: `Store Expenses ($ USD)`,
        data: storeMetrics.byMonth,
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        borderRadius: 4,
      }
    ],
  }), [metrics, revenueMetrics, storeMetrics]);

  const statCard = (title: string, value: string | number, sub?: string) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>Clinic Intelligence & Analytics</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
              Pro
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time financial performance, patient demographics, and clinic supply expense audits
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Patients & Volume
          </button>

          <button
            onClick={() => setActiveTab('revenue')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'revenue'
                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Treatment Revenue (USD)
          </button>

          <button
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'store'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Clinic Store Expenses
          </button>

          <button
            onClick={() => setActiveTab('pnl')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'pnl'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Executive P&L
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: OVERVIEW & DEMOGRAPHICS ===================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {statCard('Total Patients', patients.length, 'All time')}
            {statCard('This Year', metrics.thisYearCount, `${thisYear}`)}
            {statCard('Last 30 Days', metrics.last30d)}
            <div
              className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
              onClick={() => {
                setSelectedDate(new Date());
                loadVisitsForDate(new Date());
                setShowVisitModal(true);
              }}
            >
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Visits Today</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{visitCountToday}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{visitPatientsToday.length} unique patients</p>
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center">
                <span>Click to view details</span>
                <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Monthly New Patients ({thisYear})</h2>
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                }}
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Sex Distribution</h2>
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: 'bottom' } },
                  cutout: '60%',
                }}
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 xl:col-span-3">
              <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Cumulative Growth</h2>
              <Line
                data={lineData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: TREATMENT REVENUE ===================== */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-xl p-4 md:p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-emerald-100 font-semibold">Total Revenue (USD)</p>
              <p className="mt-2 text-2xl md:text-3xl font-bold font-mono">
                ${revenueMetrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-emerald-100">Across all patient treatments & visits</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">This Month (USD)</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white font-mono text-emerald-600 dark:text-emerald-400">
                ${revenueMetrics.thisMonthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Current calendar month</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">This Year ({thisYear})</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white font-mono">
                ${revenueMetrics.thisYearRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Year to date</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Avg / Paid Visit</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white font-mono">
                ${revenueMetrics.avgPerPaidVisit.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{revenueMetrics.paidVisitsCount} billed transactions</p>
            </div>
          </div>

          {/* Revenue Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Monthly Revenue Breakdown ({thisYear})</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Collected treatment fees in USD</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  USD Currency
                </span>
              </div>
              <Bar
                data={revenueBarData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` Revenue: $${Number(ctx.raw || 0).toLocaleString()} USD`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (v) => `$${v}`,
                      },
                    },
                  },
                }}
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Top Treatment Revenue</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Revenue distribution by dental procedure</p>
              {revenueTreatmentDoughnutData.labels.length > 0 ? (
                <Doughnut
                  data={revenueTreatmentDoughnutData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => ` ${ctx.label}: $${Number(ctx.raw || 0).toLocaleString()} USD`,
                        },
                      },
                    },
                    cutout: '60%',
                  }}
                />
              ) : (
                <div className="py-12 text-center text-sm text-gray-400">
                  No treatment revenue recorded yet. Add payments in the Patient Form.
                </div>
              )}
            </div>
          </div>

          {/* Recent Paid Transactions Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Recent Paid Treatment Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-400">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Diagnosis / Procedure</th>
                    <th className="py-2.5 px-3 text-right">Amount (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {allVisits
                    .filter((v) => Number(v.amount_paid) > 0)
                    .slice(0, 10)
                    .map((visit) => {
                      const pat = patients.find((p) => p.id === visit.patient_id);
                      return (
                        <tr key={visit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                            {formatDate(visit.created_at)}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                            {pat?.name || 'Walk-in Patient'}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300 text-xs">
                            {pat?.diagnosis || 'General Consultation & Dental Treatment'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +${Number(visit.amount_paid).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  {allVisits.filter((v) => Number(v.amount_paid) > 0).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400 text-sm">
                        No transactions logged yet. When adding patients or visits, enter the treatment fee in USD.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: CLINIC STORE EXPENSES ===================== */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          {/* Store KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-800 text-white rounded-xl p-4 md:p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-purple-200 font-semibold">Total Store Purchases</p>
              <p className="mt-2 text-2xl md:text-3xl font-bold font-mono">
                ${storeMetrics.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-purple-200">Total clinic supply expenditure</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">This Month Expenses</p>
              <p className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                ${storeMetrics.thisMonthExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Current calendar month</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Items Purchased</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white font-mono">
                {storeMetrics.totalItemsCount}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Across {storeMetrics.totalPurchasesCount} orders</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Pending Payables</p>
              <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                ${storeMetrics.pendingExpenses.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{storeMetrics.pendingCount} unpaid invoice(s)</p>
            </div>
          </div>

          {/* Store Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Store Purchases by Month ({thisYear})</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Consumables, dental instruments, pharmaceuticals, and equipment</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                  USD Expenses
                </span>
              </div>
              <Bar
                data={storeExpenseBarData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` Cost: $${Number(ctx.raw || 0).toLocaleString()} USD`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (v) => `$${v}`,
                      },
                    },
                  },
                }}
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Expenses by Category</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Supply allocation</p>
              {storeCategoryDoughnutData.labels.length > 0 ? (
                <Doughnut
                  data={storeCategoryDoughnutData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => ` ${ctx.label}: $${Number(ctx.raw || 0).toLocaleString()} USD`,
                        },
                      },
                    },
                    cutout: '60%',
                  }}
                />
              ) : (
                <div className="py-12 text-center text-sm text-gray-400">
                  No purchases recorded yet. Add purchases in the Clinic Store module.
                </div>
              )}
            </div>
          </div>

          {/* Top Suppliers and Recent Orders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Top Suppliers by Spend</h3>
              <div className="space-y-3">
                {storeMetrics.topSuppliers.length > 0 ? (
                  storeMetrics.topSuppliers.map(([supplier, amount], idx) => (
                    <div key={supplier} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{supplier}</span>
                      </div>
                      <span className="font-mono font-semibold text-sm text-purple-600 dark:text-purple-400">
                        ${amount.toFixed(2)} USD
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 py-4 text-center">No supplier transactions yet</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Recent Supply Purchases</h3>
              <div className="space-y-2.5 overflow-y-auto max-h-64">
                {purchases.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 text-xs">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{p.itemName}</p>
                      <p className="text-gray-400">{p.category} • {p.supplier || 'Direct purchase'} • {p.purchaseDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-gray-900 dark:text-white">${p.totalPrice.toFixed(2)}</p>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        p.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {p.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))}
                {purchases.length === 0 && (
                  <p className="text-sm text-gray-400 py-6 text-center">No purchases yet. Visit the Store page to add items.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: EXECUTIVE PROFIT & LOSS (P&L) ===================== */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          {/* Executive Net Income Banner */}
          <div className={`rounded-2xl p-6 text-white shadow-lg ${
            profitLossMetrics.isProfitable
              ? 'bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800'
              : 'bg-gradient-to-r from-rose-600 via-pink-700 to-amber-700'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                  Clinic Financial Health Audit
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold mt-3 font-mono">
                  {profitLossMetrics.netProfit >= 0 ? '+' : '-'}${Math.abs(profitLossMetrics.netProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </h2>
                <p className="text-white/90 text-sm mt-1">
                  Net Operating Margin: <span className="font-bold underline">{profitLossMetrics.profitMargin.toFixed(1)}%</span>
                  {profitLossMetrics.isProfitable ? ' (In Profit)' : ' (Deficit)'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div>
                  <p className="text-xs text-white/80 uppercase">Total Collected</p>
                  <p className="text-xl font-bold font-mono mt-0.5">
                    ${revenueMetrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/80 uppercase">Store Expenses</p>
                  <p className="text-xl font-bold font-mono mt-0.5">
                    ${storeMetrics.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue vs Expense Comparison Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Revenue vs. Store Expenses ({thisYear})</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Monthly side-by-side comparison in USD</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold mt-2 md:mt-0">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500"></span> Treatment Revenue
                </span>
                <span className="flex items-center gap-1.5 text-rose-500">
                  <span className="w-3 h-3 rounded-sm bg-rose-500"></span> Store Expenses
                </span>
              </div>
            </div>
            <Bar
              data={pnlComparisonData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => ` ${ctx.dataset.label}: $${Number(ctx.raw || 0).toLocaleString()} USD`,
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (v) => `$${v}`,
                    },
                  },
                },
              }}
            />
          </div>

          {/* Summary table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">P&L Financial Ledger Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-400">
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Value (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-emerald-700 dark:text-emerald-400">Gross Patient Treatment Revenue</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">Total payment received from all visits and initial procedures</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +${revenueMetrics.totalRevenue.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-purple-700 dark:text-purple-400">Clinic Store Purchases (Total Incurred)</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">Consumables, pharmaceuticals, equipment, dental materials</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                      -${storeMetrics.totalExpenses.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-amber-700 dark:text-amber-400">Pending Store Payables</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">Invoices marked as unpaid to suppliers</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                      ${storeMetrics.pendingExpenses.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-700/40 font-bold">
                    <td className="py-3 px-3 text-gray-900 dark:text-white">Net Operating Profit / (Loss)</td>
                    <td className="py-3 px-3 text-gray-500 text-xs">Revenue minus Clinic Store Purchases</td>
                    <td className={`py-3 px-3 text-right font-mono text-base ${
                      profitLossMetrics.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {profitLossMetrics.netProfit >= 0 ? '+' : '-'}${Math.abs(profitLossMetrics.netProfit).toFixed(2)} USD
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Visit Details Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Patient Visits</h2>
              <button
                onClick={() => setShowVisitModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-grow">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      setSelectedDate(newDate);
                      loadVisitsForDate(newDate);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex-shrink-0 mt-6 flex items-center gap-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-3.5 py-2 rounded-lg">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {visitsForDate.length} visits ({Object.keys(visitPatients).length} patients)
                    </p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Day Revenue</span>
                    <span className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      ${visitsForDate.reduce((sum, v) => sum + (Number(v.amount_paid) || 0), 0).toFixed(2)} USD
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingVisits ? (
                <div className="flex justify-center items-center h-40">
                  <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : visitsForDate.length === 0 ? (
                <div className="text-center py-10">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No visits found</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    There are no recorded visits for this date.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visitsForDate.map((visit) => {
                    const patient = visitPatients[visit.patient_id];
                    return (
                      <div key={visit.id} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400" onClick={() => handleViewPatient(patient)}>
                                {patient?.name || 'Unknown Patient'}
                              </h3>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {formatTime(visit.created_at)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Visit Time
                                </p>
                                {visit.amount_paid !== undefined && Number(visit.amount_paid) > 0 && (
                                  <span className="inline-block mt-1 text-xs font-extrabold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                    +${Number(visit.amount_paid).toFixed(2)} USD
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {patient?.clinicId && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                  ID: {patient.clinicId}
                                </span>
                              )}
                              {patient?.dob && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                  Age: {calculateAge(patient.dob)} / DOB: {patient.dob}
                                </span>
                              )}
                              {patient?.sex && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                  {patient.sex}
                                </span>
                              )}
                            </div>
                            {patient?.diagnosis && (
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Diagnosis:</span> {patient.diagnosis}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Patient Details Modal */}
      {showPatientDetails && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Patient Details</h2>
              <button
                onClick={() => {
                  setShowPatientDetails(false);
                  setSelectedPatient(null);
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedPatient.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full font-medium text-sm">
                      Clinic ID: {selectedPatient.clinicId}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                      File #: {selectedPatient.hospitalFileNumber}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Added: {formatDate(selectedPatient.createdAt)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleGenerateReport(selectedPatient)}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-md transition duration-150"
                    title="Generate PDF Report"
                  >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleLogVisit(selectedPatient)}
                    className="p-2 text-amber-600 hover:bg-amber-100 rounded-md transition duration-150"
                    title="Log Visit (Returning Patient)"
                  >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Personal Information</h3>
                  <div className="space-y-3">
                    {selectedPatient.dob && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Age</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{calculateAge(selectedPatient.dob)}</span>
                      </div>
                    )}
                    {selectedPatient.sex && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sex</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.sex}</span>
                      </div>
                    )}
                    {selectedPatient.mobileNumber && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Mobile</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.mobileNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Medical Information</h3>
                  <div className="space-y-3">
                    {selectedPatient.ageOfDiagnosis && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Diagnosis Age</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.ageOfDiagnosis}</span>
                      </div>
                    )}
                    {selectedPatient.diagnosis && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Diagnosis</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.diagnosis}</span>
                      </div>
                    )}
                    {selectedPatient.treatment && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Treatment</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.treatment}</span>
                      </div>
                    )}
                    {selectedPatient.currentTreatment ? (
                      <div className="flex flex-col">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Treatment</span>
                          <button
                            onClick={() => handlePrintTreatment(selectedPatient)}
                            title="Print treatment card for this patient"
                            className="flex items-center px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                          >
                            <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print
                          </button>
                        </div>
                        <div className="mt-1 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
                          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{selectedPatient.currentTreatment}</p>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Clinic ID</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.clinicId}</span>
                    </div>
                    {selectedPatient.history && (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">History</span>
                        <div className="mt-1 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
                          <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{selectedPatient.history}</span>
                        </div>
                      </div>
                    )}
                    {selectedPatient.pastMedicalHistory && (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Past Medical History</span>
                        <div className="mt-1 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
                          <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{selectedPatient.pastMedicalHistory}</span>
                        </div>
                      </div>
                    )}
                    {selectedPatient.drugHistory && (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Drug History</span>
                        <div className="mt-1 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
                          <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{selectedPatient.drugHistory}</span>
                        </div>
                      </div>
                    )}
                    {selectedPatient.pastSurgicalHistory && (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Past Surgical History</span>
                        <div className="mt-1 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
                          <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{selectedPatient.pastSurgicalHistory}</span>
                        </div>
                      </div>
                    )}
                    {selectedPatient.followUpDate && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Follow Up Date</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{selectedPatient.followUpDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {selectedPatient.note && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</h3>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {selectedPatient.note}
                  </p>
                </div>
              )}

              {/* Table Data Section */}
              {selectedPatient.tableData && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Data</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse rounded-lg overflow-hidden">
                      <tbody>
                        {(() => {
                          try {
                            const tableData = JSON.parse(selectedPatient.tableData);
                            if (Array.isArray(tableData) && tableData.length > 0) {
                              return tableData.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {Array.isArray(row) && row.map((cell, colIndex) => (
                                    <td
                                      key={`${rowIndex}-${colIndex}`}
                                      className={`border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs ${cell ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' :
                                        'bg-gray-100 dark:bg-gray-800/50'
                                        }`}
                                    >
                                      {cell || ''}
                                    </td>
                                  ))}
                                </tr>
                              ));
                            }
                          } catch (e) {
                            return (
                              <tr>
                                <td className="text-sm text-red-500 p-2">Error parsing table data</td>
                              </tr>
                            );
                          }
                          return null;
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}