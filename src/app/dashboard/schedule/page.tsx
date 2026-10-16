"use client";

import { useState, useEffect } from 'react';
import { usePatients, Appointment } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { ScheduleStatusBadge } from '@/components/ScheduleStatusBadge';
import {
  Calendar,
  Clock,
  Phone,
  User,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  UserCheck,
  CalendarCheck,
  CalendarX,
  Filter
} from 'lucide-react';

export default function SchedulePage() {
  const { appointments, isLoadingAppointments, addAppointment, editAppointment, deleteAppointment } = usePatients();
  const { isStaffAuth, isReceptionAuth } = useAuth();
  const router = useRouter();

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('Today'); // Today, Tomorrow, All, Custom
  const [customDate, setCustomDate] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    patientName: '',
    phoneNumber: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '10:00',
    notes: '',
    status: 'Scheduled' as Appointment['status'],
    gender: '',
    age: ''
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default custom date to today
  useEffect(() => {
    setCustomDate(new Date().toISOString().split('T')[0]);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({
      patientName: '',
      phoneNumber: '',
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: '10:00',
      notes: '',
      status: 'Scheduled',
      gender: '',
      age: ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (appt: Appointment) => {
    setModalMode('edit');
    setSelectedApptId(appt.id);
    setFormData({
      patientName: appt.patientName,
      phoneNumber: appt.phoneNumber,
      appointmentDate: appt.appointmentDate,
      appointmentTime: appt.appointmentTime,
      notes: appt.notes,
      status: appt.status,
      gender: appt.gender || '',
      age: appt.age || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.patientName.trim()) {
      setFormError('Patient Name is required');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setFormError('Phone Number is required');
      return;
    }
    if (!formData.gender) {
      setFormError('Gender is required');
      return;
    }
    if (!formData.appointmentDate) {
      setFormError('Appointment Date is required');
      return;
    }
    if (!formData.appointmentTime) {
      setFormError('Appointment Time is required');
      return;
    }

    try {
      setIsSubmitting(true);
      if (modalMode === 'create') {
        await addAppointment(formData);
      } else if (modalMode === 'edit' && selectedApptId) {
        await editAppointment(selectedApptId, formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Appointment['status']) => {
    try {
      await editAppointment(id, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleRegisterPatient = async (appt: Appointment) => {
    try {
      // Mark status as "Arrived" - PatientContext automatically creates the patient record in Supabase
      await editAppointment(appt.id, { status: 'Arrived' });
    } catch (err) {
      console.error('Failed to register arrived patient:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this appointment?')) {
      try {
        await deleteAppointment(id);
      } catch (err) {
        console.error('Failed to delete appointment:', err);
      }
    }
  };

  // Helper date conversions
  const getTodayDateString = () => new Date().toISOString().split('T')[0];
  const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter and sort appointments
  const filteredAppointments = appointments.filter(appt => {
    // 1. Search filter
    const matchesSearch = 
      appt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.phoneNumber.includes(searchQuery);

    // 2. Status filter
    const matchesStatus = statusFilter === 'All' || appt.status === statusFilter;

    // 3. Date filter
    let matchesDate = true;
    const todayStr = getTodayDateString();
    const tomorrowStr = getTomorrowDateString();

    if (dateFilter === 'Today') {
      matchesDate = appt.appointmentDate === todayStr;
    } else if (dateFilter === 'Tomorrow') {
      matchesDate = appt.appointmentDate === tomorrowStr;
    } else if (dateFilter === 'Custom' && customDate) {
      matchesDate = appt.appointmentDate === customDate;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Split into Today's versus Upcoming (if viewing all, otherwise just list)
  const todayStr = getTodayDateString();
  const todayAppointments = filteredAppointments.filter(a => a.appointmentDate === todayStr);
  const futureAppointments = filteredAppointments.filter(a => a.appointmentDate > todayStr);
  const pastAppointments = filteredAppointments.filter(a => a.appointmentDate < todayStr);

  // Stat calculations for today
  const todayTotal = appointments.filter(a => a.appointmentDate === todayStr);
  const scheduledCount = todayTotal.filter(a => a.status === 'Scheduled').length;
  const arrivedCount = todayTotal.filter(a => a.status === 'Arrived').length;
  const completedCount = todayTotal.filter(a => a.status === 'Completed').length;
  const cancelledCount = todayTotal.filter(a => a.status === 'Cancelled').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 min-h-screen bg-[#F8FAFB] dark:bg-[#0A0E0F]">
      
      {/* Header section with Medical Teal Neom styling */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#111719] p-6 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Appointment Schedule
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Organize patient visits, check-ins, and doctor schedule with instant status updates.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#008294] hover:bg-[#006e7d] text-white font-semibold text-sm shadow-md shadow-teal-500/20 transition-all hover:scale-102 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Appointment
        </button>
      </div>

      {/* Analytics counter cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Scheduled */}
        <div className="bg-white dark:bg-[#111719] p-4 sm:p-5 rounded-[20px] shadow-xs border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Scheduled Today</p>
            <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#008294] dark:text-teal-400">{scheduledCount}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-[#008294] dark:text-teal-400 border border-teal-500/20">
              Pending
            </span>
          </div>
        </div>

        {/* Arrived */}
        <div className="bg-white dark:bg-[#111719] p-4 sm:p-5 rounded-[20px] shadow-xs border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Arrived Today</p>
            <UserCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-500 dark:text-amber-400">{arrivedCount}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              In Clinic
            </span>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-[#111719] p-4 sm:p-5 rounded-[20px] shadow-xs border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Completed Today</p>
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{completedCount}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Finished
            </span>
          </div>
        </div>

        {/* Cancelled */}
        <div className="bg-white dark:bg-[#111719] p-4 sm:p-5 rounded-[20px] shadow-xs border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cancelled Today</p>
            <CalendarX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">{cancelledCount}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Cancelled
            </span>
          </div>
        </div>
      </div>

      {/* Filter and search control bar */}
      <div className="bg-white dark:bg-[#111719] p-3.5 sm:p-4 rounded-[20px] shadow-xs border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute inset-y-0 left-3.5 my-auto w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search appointments by patient name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-full focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs sm:text-sm outline-none transition-all"
          />
        </div>

        {/* Date Filter selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['Today', 'Tomorrow', 'All', 'Custom'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setDateFilter(opt)}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                dateFilter === opt
                  ? 'bg-[#008294] text-white shadow-sm'
                  : 'bg-gray-100/70 dark:bg-[#161d20] text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800 border border-transparent'
              }`}
            >
              {opt}
            </button>
          ))}
          
          {dateFilter === 'Custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full bg-gray-50 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs"
            />
          )}
        </div>

        {/* Status Dropdown Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-full bg-gray-50/70 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="All">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Arrived">Arrived</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoadingAppointments ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111719] rounded-[24px] border border-gray-100 dark:border-gray-800">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-600"></div>
          <p className="text-gray-500 mt-4 text-xs font-medium">Fetching appointment details...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#111719] rounded-[24px] shadow-xs border border-gray-100 dark:border-gray-800 p-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No appointments found</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">There are no appointments matching the current filter criteria.</p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-5 inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#008294] hover:bg-[#006e7d] shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create New Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Main conditional display for different date options */}
          {dateFilter !== 'All' ? (
            <div className="bg-white dark:bg-[#111719] rounded-[24px] shadow-xs border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/60 dark:bg-[#141b1e] border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-teal-500 rounded-full"></span>
                  {dateFilter === 'Today' ? "Today's Schedule" : dateFilter === 'Tomorrow' ? "Tomorrow's Schedule" : `Appointments for ${formatDateLabel(customDate)}`}
                </h2>
                <span className="text-[11px] bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 px-2.5 py-0.5 rounded-full font-bold">
                  {filteredAppointments.length} Total
                </span>
              </div>
              <AppointmentTable 
                list={filteredAppointments} 
                onStatusChange={handleStatusChange} 
                onRegister={handleRegisterPatient} 
                onEdit={handleOpenEditModal} 
                onDelete={handleDelete}
                isDoctor={!isStaffAuth && !isReceptionAuth}
              />
            </div>
          ) : (
            <>
              {/* If dateFilter is "All", split into chunks: Today, Upcoming, and Past */}
              {todayAppointments.length > 0 && (
                <div className="bg-white dark:bg-[#111719] rounded-[24px] shadow-xs border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 bg-teal-500/5 dark:bg-teal-950/20 border-b border-teal-500/15 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-teal-900 dark:text-teal-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-teal-500 rounded-full"></span>
                      Today's Appointments
                    </h2>
                    <span className="text-[11px] bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/20 px-2.5 py-0.5 rounded-full font-bold">
                      {todayAppointments.length}
                    </span>
                  </div>
                  <AppointmentTable 
                    list={todayAppointments} 
                    onStatusChange={handleStatusChange} 
                    onRegister={handleRegisterPatient} 
                    onEdit={handleOpenEditModal} 
                    onDelete={handleDelete}
                    isDoctor={!isStaffAuth && !isReceptionAuth}
                  />
                </div>
              )}

              {futureAppointments.length > 0 && (
                <div className="bg-white dark:bg-[#111719] rounded-[24px] shadow-xs border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50/60 dark:bg-[#141b1e] border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                      Upcoming Appointments
                    </h2>
                    <span className="text-[11px] bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full text-gray-600 dark:text-gray-300 font-bold">
                      {futureAppointments.length}
                    </span>
                  </div>
                  <AppointmentTable 
                    list={futureAppointments} 
                    onStatusChange={handleStatusChange} 
                    onRegister={handleRegisterPatient} 
                    onEdit={handleOpenEditModal} 
                    onDelete={handleDelete}
                    isDoctor={!isStaffAuth && !isReceptionAuth}
                  />
                </div>
              )}

              {pastAppointments.length > 0 && (
                <div className="bg-white dark:bg-[#111719] rounded-[24px] shadow-xs border border-gray-100 dark:border-gray-800 overflow-hidden opacity-85">
                  <div className="px-6 py-4 bg-gray-50/60 dark:bg-[#141b1e] border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-gray-500 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-gray-400 rounded-full"></span>
                      Past Appointments
                    </h2>
                    <span className="text-[11px] bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full text-gray-500 font-bold">
                      {pastAppointments.length}
                    </span>
                  </div>
                  <AppointmentTable 
                    list={pastAppointments} 
                    onStatusChange={handleStatusChange} 
                    onRegister={handleRegisterPatient} 
                    onEdit={handleOpenEditModal} 
                    onDelete={handleDelete}
                    isDoctor={!isStaffAuth && !isReceptionAuth}
                  />
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* Appointment Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#111719] rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {modalMode === 'create' ? 'Schedule Patient Appointment' : 'Edit Appointment'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-5">
              Enter patient contact details and select appointment slot.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleInputChange}
                  placeholder="e.g. Sara Ali"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-teal-500 bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. 07501234567"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-teal-500 bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-teal-500 bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs outline-none"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Age</label>
                  <input
                    type="text"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="e.g. 28"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-teal-500 bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Appointment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="appointmentDate"
                    value={formData.appointmentDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-teal-500 bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Appointment Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="appointmentTime"
                    value={formData.appointmentTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-teal-500 bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-teal-500 bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs outline-none font-semibold"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Arrived">Arrived</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="e.g. Routine checkup, crown fitting, toothache..."
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-teal-500 bg-gray-50/50 dark:bg-[#161d20] text-gray-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1a2327] hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-full text-xs font-semibold text-white bg-[#008294] hover:bg-[#006e7d] shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Book Appointment' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

interface AppointmentTableProps {
  list: Appointment[];
  onStatusChange: (id: string, status: Appointment['status']) => void;
  onRegister: (appt: Appointment) => void;
  onEdit: (appt: Appointment) => void;
  onDelete: (id: string) => void;
  isDoctor: boolean;
}

function AppointmentTable({ list, onStatusChange, onRegister, onEdit, onDelete, isDoctor }: AppointmentTableProps) {
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime12h = (time24: string) => {
    if (!time24) return '';
    const [hourStr, minStr] = time24.split(':');
    const hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);
    if (isNaN(hour) || isNaN(min)) return time24;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const minFormatted = String(min).padStart(2, '0');
    return `${hour12}:${minFormatted} ${ampm}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800/80">
        <thead className="bg-gray-50/70 dark:bg-[#141b1e]">
          <tr>
            <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Patient Details
            </th>
            <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Slot Time
            </th>
            <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Clinical Notes
            </th>
            <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Status (Interactive)
            </th>
            <th scope="col" className="px-6 py-3.5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-[#111719] divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
          {list.map((appt) => (
            <tr key={appt.id} className="hover:bg-teal-500/[0.02] dark:hover:bg-teal-500/[0.04] transition-colors">
              {/* Patient */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#008294] to-[#0d9488] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {appt.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <div className="text-xs font-bold text-gray-900 dark:text-white">{appt.patientName}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span>{appt.phoneNumber}</span>
                    </div>
                    {(appt.gender || appt.age) && (
                      <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-0.5">
                        {appt.gender ? appt.gender : ''}
                        {appt.gender && appt.age ? ' • ' : ''}
                        {appt.age ? `Age ${appt.age}` : ''}
                      </div>
                    )}
                  </div>
                </div>
              </td>

              {/* Slot */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-xs text-gray-900 dark:text-white flex items-center font-bold">
                  <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 mr-1.5" />
                  {formatTime12h(appt.appointmentTime)}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">{formatDateLabel(appt.appointmentDate)}</div>
              </td>

              {/* Notes */}
              <td className="px-6 py-4 max-w-xs truncate">
                <p className="text-xs text-gray-600 dark:text-gray-300 truncate" title={appt.notes}>
                  {appt.notes || <span className="text-gray-400 italic font-normal">None</span>}
                </p>
              </td>

              {/* Status with animated Edit Badge */}
              <td className="px-6 py-4 whitespace-nowrap">
                <ScheduleStatusBadge
                  status={appt.status}
                  onChange={(newStatus) => onStatusChange(appt.id, newStatus)}
                />
              </td>

              {/* Actions */}
              <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                <div className="flex items-center justify-end gap-2">
                  {/* Mark Arrived quick button */}
                  {appt.status === 'Scheduled' && (
                    <button
                      onClick={() => onRegister(appt)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-full hover:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                      title="Patient is here: check-in & register"
                    >
                      <UserCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Arrived</span>
                    </button>
                  )}

                  {/* Edit button */}
                  <button
                    onClick={() => onEdit(appt)}
                    className="p-1.5 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition cursor-pointer"
                    title="Edit Appointment"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete button (Doctor/Admin only) */}
                  {isDoctor && (
                    <button
                      onClick={() => onDelete(appt.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
