"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  usePatients,
  Patient,
  Visit,
  ToothSchedule,
  extractToothSchedulesFromTableData,
} from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import PatientEditForm from '../../components/PatientEditForm';
import InvestigationModal from '../../components/InvestigationModal';
import ToothSchedulerModal from '../../components/ToothSchedulerModal';
import { generatePatientPDF } from '@/lib/pdfGenerator';
import { exportToExcel } from '@/lib/excelExport';
import { supabase } from '@/lib/supabase';
import { Trash2 } from 'lucide-react';

// High-fidelity Clean Components matching user screenshot
import DentalChartCard from './components/DentalChartCard';
import DentalRecordsCard, { DentalRecordItem } from './components/DentalRecordsCard';
import PatientNavTabs, { PatientTab } from './components/PatientNavTabs';
import PatientHeader from './components/PatientHeader';
import DentalRecordModal from './components/DentalRecordModal';
import PatientProfileTab from './components/PatientProfileTab';
import PatientMedicalTab from './components/PatientMedicalTab';
import PatientAppointmentsTab from './components/PatientAppointmentsTab';
import PatientInvoicesTab from './components/PatientInvoicesTab';
import PatientDocumentsTab from './components/PatientDocumentsTab';
import PatientNotesTab from './components/PatientNotesTab';
import PatientDirectoryView from './components/PatientDirectoryView';
import { ToothRecord } from '@/app/components/DentitionChart';

function PatientsContent() {
  const {
    patients,
    deletePatient,
    editPatient,
    isLoading,
    refreshPatients,
    getPatientVisits,
  } = usePatients();
  const { isStaffAuth, isReceptionAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redirect reception/staff appropriately
  useEffect(() => {
    if (isReceptionAuth) {
      router.push('/dashboard');
    } else if (isStaffAuth) {
      router.push('/dashboard/patient-form');
    }
  }, [isReceptionAuth, isStaffAuth, router]);

  // Selected Patient State
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PatientTab>('dental');
  const [showDirectory, setShowDirectory] = useState(false);

  // Modals & Forms
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [showInvestigationModal, setShowInvestigationModal] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [schedulerInitialToothId, setSchedulerInitialToothId] = useState<string | undefined>(undefined);

  // Dental Record Modal
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DentalRecordItem | null>(null);

  // Visits State
  const [patientVisits, setPatientVisits] = useState<Visit[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);

  // Delete Patient state
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);

  const handleConfirmDeletePatient = async () => {
    if (!patientToDelete) return;
    try {
      setIsDeletingPatient(true);
      await deletePatient(patientToDelete.id);
      if (selectedPatientId === patientToDelete.id) {
        setSelectedPatientId(null);
        setShowDirectory(true);
        router.replace('/dashboard/patients');
      }
      setPatientToDelete(null);
      await refreshPatients();
    } catch (err) {
      console.error('Failed to delete patient:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete patient');
    } finally {
      setIsDeletingPatient(false);
    }
  };

  // Sync with URL query parameter ?id=...
  useEffect(() => {
    const queryId = searchParams.get('id');
    if (queryId && patients.some((p) => p.id === queryId)) {
      setSelectedPatientId(queryId);
      setShowDirectory(false);
    } else if (!queryId) {
      // Direct access to /dashboard/patients without query -> show Patients Directory
      setSelectedPatientId(null);
      setShowDirectory(true);
    }
  }, [searchParams, patients]);

  // Active patient object
  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

  // Fetch visits whenever selected patient changes
  useEffect(() => {
    if (selectedPatient?.id) {
      setIsLoadingVisits(true);
      getPatientVisits(selectedPatient.id)
        .then((v) => setPatientVisits(v || []))
        .catch(() => setPatientVisits([]))
        .finally(() => setIsLoadingVisits(false));
    } else {
      setPatientVisits([]);
    }
  }, [selectedPatient?.id, getPatientVisits]);

  // Parse patient's dentition chart data
  const { chartData, teethData, dentalRecords } = useMemo(() => {
    if (!selectedPatient?.tableData) {
      return { chartData: null, teethData: {}, dentalRecords: [] };
    }
    try {
      const parsed = JSON.parse(selectedPatient.tableData);
      const teeth = parsed?.teeth || {};
      const records: DentalRecordItem[] = Object.entries(teeth)
        .filter(([, data]: any) => data && data.condition && data.condition !== 'sound')
        .map(([toothId, data]: any) => {
          let toothTreatment = data.treatment || data.procedure || '';
          if (!toothTreatment && selectedPatient?.treatment) {
            const match = selectedPatient.treatment.match(new RegExp(`Tooth #${toothId}[^:]*:\\s*([^;]+)`, 'i'));
            if (match) toothTreatment = match[1].trim();
          }
          if (!toothTreatment && patientVisits.length > 0) {
            for (const v of patientVisits) {
              if (v.treatment) {
                const match = v.treatment.match(new RegExp(`Tooth #${toothId}[^:]*:\\s*([^;]+)`, 'i'));
                if (match) {
                  toothTreatment = match[1].trim();
                  break;
                }
              }
            }
          }
          return {
            toothId,
            condition: data.condition,
            surfaces: data.surfaces || [],
            treatment: toothTreatment,
            price: data.price || undefined,
            status: data.status || 'In Progress',
            notes: data.notes || '',
          };
        });

      return { chartData: parsed, teethData: teeth, dentalRecords: records };
    } catch {
      return { chartData: null, teethData: {}, dentalRecords: [] };
    }
  }, [selectedPatient?.tableData, selectedPatient?.treatment, patientVisits]);

  // Extract scheduled procedures
  const toothSchedules = useMemo(() => {
    if (!selectedPatient) return [];
    return extractToothSchedulesFromTableData(selectedPatient.tableData);
  }, [selectedPatient]);

  // Save changes to patient's tableData
  const handleSaveTeethData = async (updatedTeeth: typeof teethData) => {
    if (!selectedPatient) return;
    const newChartData = {
      type: 'dentition_chart',
      version: 5,
      lastUpdated: new Date().toISOString(),
      patientAge: selectedPatient.dob,
      teeth: updatedTeeth,
      scheduledProcedures: chartData?.scheduledProcedures || [],
    };
    const jsonStr = JSON.stringify(newChartData);
    await editPatient(selectedPatient.id, { tableData: jsonStr });
  };

  // Save/Update a single dental record
  const handleSaveRecord = async (record: DentalRecordItem) => {
    const updated = {
      ...teethData,
      [record.toothId]: {
        condition: record.condition,
        surfaces: record.surfaces,
        treatment: record.treatment,
        price: record.price,
        status: record.status,
        notes: record.notes,
      },
    };
    await handleSaveTeethData(updated);
  };

  // Delete a dental record (reset tooth to sound)
  const handleDeleteRecord = async (toothId: string) => {
    const updated = { ...teethData };
    delete updated[toothId];
    await handleSaveTeethData(updated);
  };

  // Clear entire chart
  const handleClearChart = async () => {
    if (!confirm('Are you sure you want to reset all teeth findings in this chart?')) return;
    await handleSaveTeethData({});
  };

  // Tooth selection in DentalChartCard
  const handleSelectToothFromChart = (tooth: ToothRecord) => {
    const existing = dentalRecords.find((r) => r.toothId === tooth.id);
    if (existing) {
      setEditingRecord(existing);
    } else {
      setEditingRecord({
        toothId: tooth.id,
        condition: tooth.condition || 'caries',
        surfaces: tooth.surfaces || ['O'],
        treatment: '',
        price: undefined,
        status: 'In Progress',
        notes: '',
      });
    }
    setRecordModalOpen(true);
  };

  // Update medical, notes, or profile fields
  const handleUpdatePatientFields = async (updates: Partial<Patient>) => {
    if (!selectedPatient) return;
    await editPatient(selectedPatient.id, updates);
  };

  // Record a return visit
  const handleLogVisit = async () => {
    if (!selectedPatient) return;
    try {
      const { error } = await supabase.from('visits').insert({ patient_id: selectedPatient.id });
      if (error) throw error;
      alert('Return visit logged successfully.');
      const v = await getPatientVisits(selectedPatient.id);
      setPatientVisits(v || []);
    } catch (err) {
      console.error(err);
      alert('Failed to log visit.');
    }
  };

  // PDF & Print helpers
  const handlePrintTreatmentCard = () => {
    if (!selectedPatient) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Treatment Card - ${selectedPatient.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
          .header { border-bottom: 2px solid #008294; padding-bottom: 12px; margin-bottom: 20px; }
          h1 { color: #008294; margin: 0 0 6px 0; font-size: 22px; }
          .meta { font-size: 13px; color: #64748b; }
          .section { margin-top: 18px; }
          .label { font-weight: bold; font-size: 13px; color: #475569; }
          .value { font-size: 14px; margin-top: 4px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Neom Dental Clinic — Treatment Record</h1>
          <div class="meta">Patient: <strong>${selectedPatient.name}</strong> • File #: ${selectedPatient.hospitalFileNumber || 'N/A'} • Clinic ID: ${selectedPatient.clinicId || 'N/A'}</div>
        </div>
        <div class="section">
          <div class="label">Primary Diagnosis:</div>
          <div class="value">${selectedPatient.diagnosis || 'None specified'}</div>
        </div>
        <div class="section">
          <div class="label">Current Treatment Plan:</div>
          <div class="value">${selectedPatient.currentTreatment || selectedPatient.treatment || 'None specified'}</div>
        </div>
        <div class="section">
          <div class="label">Medical History:</div>
          <div class="value">${selectedPatient.history || 'No significant history'}</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleGeneratePDF = async () => {
    if (!selectedPatient) return;
    try {
      await generatePatientPDF(selectedPatient);
    } catch (err) {
      console.error('PDF error', err);
      alert('Failed to generate PDF');
    }
  };

  const handleGenerateVisitReport = async (visit: Visit) => {
    if (!selectedPatient) return;
    try {
      const vPatient: Patient = {
        ...selectedPatient,
        diagnosis: visit.diagnosis || selectedPatient.diagnosis,
        treatment: visit.treatment || selectedPatient.treatment,
        currentTreatment: visit.current_treatment || selectedPatient.currentTreatment,
        history: visit.history || selectedPatient.history,
        examination: visit.examination || selectedPatient.examination,
        note: visit.note || selectedPatient.note,
      };
      await generatePatientPDF(vPatient);
    } catch (err) {
      console.error('Visit report error', err);
      alert('Failed to generate visit report');
    }
  };

  const handleExportExcel = () => {
    exportToExcel(patients);
  };

  // If in directory mode or no patient selected, render clean directory view
  if (showDirectory || !selectedPatient) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <PatientDirectoryView
          patients={patients}
          onSelectPatient={(p) => {
            setSelectedPatientId(p.id);
            setShowDirectory(false);
          }}
          onDeletePatient={(id) => {
            const p = patients.find((x) => x.id === id);
            if (p) setPatientToDelete(p);
          }}
          onExportExcel={handleExportExcel}
        />

        {/* Delete Patient Confirmation Modal (in Directory Mode) */}
        {patientToDelete && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 text-center">
              <div className="w-13 h-13 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 shadow-xs">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Delete Patient Record?
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Are you sure you want to permanently delete{' '}
                <span className="font-bold text-slate-900 dark:text-white">
                  &quot;{patientToDelete.name}&quot;
                </span>
                {patientToDelete.clinicId ? ` (ID: ${patientToDelete.clinicId})` : ''}?
              </p>
              <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                ⚠️ Warning: This will permanently remove all dental charts, diagnosis history, scheduled procedures, and billing invoices. This action cannot be undone.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPatientToDelete(null)}
                  disabled={isDeletingPatient}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeletePatient}
                  disabled={isDeletingPatient}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isDeletingPatient ? 'Deleting...' : 'Yes, Delete Patient'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Section title for breadcrumbs
  const sectionTitleMap: Record<PatientTab, string> = {
    profile: 'Profile details',
    dental: 'Dental history',
    medical: 'Medical history',
    appointments: 'Appointments schedule',
    invoices: 'Financial invoices',
    documents: 'Clinical documents',
    notes: 'Clinical notes',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Patient Header matching user screenshot */}
      <PatientHeader
        patient={selectedPatient}
        allPatients={patients}
        onSelectPatient={(p) => setSelectedPatientId(p.id)}
        onOpenDirectory={() => {
          setSelectedPatientId(null);
          setShowDirectory(true);
        }}
        onEditPatient={() => setIsEditingPatient(true)}
        onPrintPatient={handlePrintTreatmentCard}
        onDeletePatient={() => setPatientToDelete(selectedPatient)}
        currentSectionTitle={sectionTitleMap[activeTab]}
      />

      {/* Horizontal Pill Navigation Tabs matching user screenshot */}
      <PatientNavTabs
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        badgeCounts={{
          dental: dentalRecords.length,
          appointments: toothSchedules.length,
        }}
      />

      {/* Tab Panels */}
      {activeTab === 'dental' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Card 1: Dental Chart Card matching screenshot */}
          <DentalChartCard
            teethData={teethData}
            onSelectTooth={handleSelectToothFromChart}
            onClearChart={handleClearChart}
          />

          {/* Card 2: Dental Records Card matching screenshot */}
          <DentalRecordsCard
            records={dentalRecords}
            onAddRecord={() => {
              setEditingRecord(null);
              setRecordModalOpen(true);
            }}
            onEditRecord={(rec) => {
              setEditingRecord(rec);
              setRecordModalOpen(true);
            }}
            onDeleteRecord={handleDeleteRecord}
            onScheduleTooth={(toothId) => {
              setSchedulerInitialToothId(toothId);
              setShowSchedulerModal(true);
            }}
          />
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="animate-in fade-in duration-200">
          <PatientProfileTab
            patient={selectedPatient}
            onEdit={() => setIsEditingPatient(true)}
            onDelete={() => setPatientToDelete(selectedPatient)}
          />
        </div>
      )}

      {activeTab === 'medical' && (
        <div className="animate-in fade-in duration-200">
          <PatientMedicalTab
            patient={selectedPatient}
            onSaveMedical={handleUpdatePatientFields}
          />
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="animate-in fade-in duration-200">
          <PatientAppointmentsTab
            patient={selectedPatient}
            visits={patientVisits}
            schedules={toothSchedules}
            onOpenScheduler={(tId) => {
              setSchedulerInitialToothId(tId);
              setShowSchedulerModal(true);
            }}
            onLogVisit={handleLogVisit}
            onGenerateVisitReport={handleGenerateVisitReport}
          />
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="animate-in fade-in duration-200">
          <PatientInvoicesTab
            patient={selectedPatient}
            visits={patientVisits}
          />
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="animate-in fade-in duration-200">
          <PatientDocumentsTab
            patient={selectedPatient}
            onOpenInvestigations={() => setShowInvestigationModal(true)}
            onPrintTreatmentCard={handlePrintTreatmentCard}
            onGeneratePDF={handleGeneratePDF}
          />
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="animate-in fade-in duration-200">
          <PatientNotesTab
            patient={selectedPatient}
            onSaveNotes={handleUpdatePatientFields}
          />
        </div>
      )}

      {/* Dental Record Modal */}
      <DentalRecordModal
        isOpen={recordModalOpen}
        initialRecord={editingRecord}
        onClose={() => {
          setRecordModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        onDelete={handleDeleteRecord}
      />

      {/* Edit Patient Core Details Modal */}
      {isEditingPatient && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <PatientEditForm
              patient={selectedPatient}
              onSubmit={async (updated: Partial<Patient>) => {
                await editPatient(selectedPatient.id, updated);
                setIsEditingPatient(false);
              }}
              onCancel={() => setIsEditingPatient(false)}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Tooth Scheduler Modal */}
      {showSchedulerModal && (
        <ToothSchedulerModal
          isOpen={showSchedulerModal}
          onClose={() => {
            setShowSchedulerModal(false);
            setSchedulerInitialToothId(undefined);
          }}
          patient={selectedPatient}
          initialToothId={schedulerInitialToothId}
          onScheduled={async () => {
            await refreshPatients();
          }}
        />
      )}

      {/* Investigations Modal */}
      {showInvestigationModal && (
        <InvestigationModal
          patient={selectedPatient}
          visit={patientVisits[0] || ({ id: 'default', patient_id: selectedPatient.id, visited_at: new Date().toISOString() } as Visit)}
          onClose={() => setShowInvestigationModal(false)}
        />
      )}

      {/* Delete Patient Confirmation Modal (in Patient Record Mode) */}
      {patientToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 text-center">
            <div className="w-13 h-13 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Delete Patient Record?
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                &quot;{patientToDelete.name}&quot;
              </span>
              {patientToDelete.clinicId ? ` (ID: ${patientToDelete.clinicId})` : ''}?
            </p>
            <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
              ⚠️ Warning: This will permanently remove all dental charts, diagnosis history, scheduled procedures, and billing invoices. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setPatientToDelete(null)}
                disabled={isDeletingPatient}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePatient}
                disabled={isDeletingPatient}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {isDeletingPatient ? 'Deleting...' : 'Yes, Delete Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin size-8 border-3 border-[#008294] border-t-transparent rounded-full" />
        </div>
      }
    >
      <PatientsContent />
    </Suspense>
  );
}
