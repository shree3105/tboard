'use client';

import React, { useState, useEffect } from 'react';
import { Case, CaseStatus, CaseSubspecialty, GenderType, UserSimple } from '@/lib/types';
import { Edit, Trash2, Save, X, GripVertical, CheckCircle, Archive } from 'lucide-react';
import { getCaseStatusColor, getSubspecialtyColor, getMainSectionColor } from '@/lib/colors';
import apiClient from '@/lib/api';

interface CasesTableProps {
  cases: Case[];
  onCreateCase: (caseData: any) => Promise<void>;
  onUpdateCase: (caseId: string, updates: Partial<Case>) => Promise<void>;
  onDeleteCase: (caseId: string) => Promise<void>;
  onCompleteCase: (caseId: string) => Promise<void>;
  onArchiveCase: (caseId: string) => Promise<void>;
  onDragStart: (caseItem: Case) => void;
  onDragEnd: () => void;
  onDropOnSection: (caseId: string, newSection: string, newSubspecialty?: string) => Promise<void>;
}

export default function CasesTable({ 
  cases, 
  onCreateCase,
  onUpdateCase, 
  onDeleteCase, 
  onCompleteCase,
  onArchiveCase,
  onDragStart, 
  onDragEnd,
  onDropOnSection
}: CasesTableProps) {
  const [editingCase, setEditingCase] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{
    name?: string;
    diagnosis?: string;
    outcome?: string;
    status?: CaseStatus;
    subspecialty?: CaseSubspecialty | null;
    hospital_number?: string | null;
    referral_date?: string | null;
    age?: number | null;
    gender?: GenderType | null;
    consultant_id?: string | null;
    patient_history?: string | null;
  }>({});
  const [newCaseData, setNewCaseData] = useState<Partial<Case>>({
    name: '',
    diagnosis: '',
    outcome: 'Pending',
    status: 'new_referral',
    subspecialty: null,
    priority: 'medium',
    hospital_number: null,
    referral_date: null,
    age: null,
    gender: null,
    consultant_id: null,
    patient_history: null
  });
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Consultant and anaesthetist lists
  const [consultants, setConsultants] = useState<UserSimple[]>([]);
  const [anaesthetists, setAnaesthetists] = useState<UserSimple[]>([]);

  // Load consultants and anaesthetists on component mount
  useEffect(() => {
    const loadConsultantsAndAnaesthetists = async () => {
      try {
        const [consultantsData, anaesthetistsData] = await Promise.all([
          apiClient.getConsultants(),
          apiClient.getAnaesthetists()
        ]);
        setConsultants(consultantsData);
        setAnaesthetists(anaesthetistsData);
      } catch (error) {
        console.error('Failed to load consultants and anaesthetists:', error);
      }
    };

    loadConsultantsAndAnaesthetists();
  }, []);

  // Helper function to get consultant display name
  const getConsultantDisplayName = (caseItem: Case): string => {
    if (caseItem.consultant?.first_name && caseItem.consultant?.last_name) {
      return `${caseItem.consultant.first_name} ${caseItem.consultant.last_name}`;
    }
    if (caseItem.consultant_id) {
      return `Consultant ${caseItem.consultant_id.slice(0, 8)}...`;
    }
    return 'Unassigned';
  };

  // Drag feedback state
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [dragOverSubspecialty, setDragOverSubspecialty] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Filter cases for table display
  // Main table should NOT show: archived, scheduled cases
  // Main table should show: new_referral, awaiting_surgery, awaiting_review, onward_referral, completed
  const tableCases = cases.filter(caseItem => {
    // Exclude archived cases
    if (caseItem.status === 'archived') {
      return false;
    }
    // Exclude scheduled cases (these are shown in the calendar)
    if (caseItem.status === 'scheduled') {
      return false;
    }
    // Include all other statuses
    return true;
  });

  // Group cases by main sections
  const groupedCases = tableCases.reduce((acc, caseItem) => {
    let mainSection: string;
    
    if (caseItem.status === 'new_referral') {
      mainSection = 'new_referral';
    } else if (caseItem.status === 'onward_referral') {
      mainSection = 'onward_referral';
    } else if (caseItem.status === 'completed') {
      mainSection = 'completed';
    } else if (caseItem.status === 'awaiting_surgery' || caseItem.status === 'awaiting_review') {
      mainSection = 'awaiting_surgery';
    } else {
      mainSection = 'awaiting_surgery'; // Default to awaiting surgery
    }
    
    if (!acc[mainSection]) {
      acc[mainSection] = {};
    }
    
    // For awaiting_surgery section, group by subspecialty
    if (mainSection === 'awaiting_surgery') {
      const subspecialty = caseItem.subspecialty || 'unassigned';
      if (!acc[mainSection][subspecialty]) {
        acc[mainSection][subspecialty] = [];
      }
      acc[mainSection][subspecialty].push(caseItem);
    } else {
      // For other sections, group by status
      if (!acc[mainSection][caseItem.status]) {
        acc[mainSection][caseItem.status] = [];
      }
      acc[mainSection][caseItem.status].push(caseItem);
    }
    
    return acc;
  }, {} as Record<string, Record<string, Case[]>>);

  // Sort cases within each status by order_index
  Object.keys(groupedCases).forEach(mainSection => {
    Object.keys(groupedCases[mainSection]).forEach(status => {
      groupedCases[mainSection][status].sort((a, b) => a.order_index - b.order_index);
    });
  });

  // Define main section order and display names
  const mainSectionOrder = ['new_referral', 'awaiting_surgery', 'onward_referral', 'completed'];
  const mainSectionNames = {
    new_referral: 'New Referrals',
    awaiting_surgery: 'Awaiting Surgery',
    onward_referral: 'Onward Referrals',
    completed: 'Completed'
  };

  // Define all subspecialties that should always be visible
  const allSubspecialties = ['hip_and_knee', 'foot_and_ankle', 'shoulder_and_elbow', 'hand', 'spine'];

  // Helper function to check if a case can be dragged to calendar
  const canDragToCalendar = (caseItem: Case) => {
    return caseItem.status !== 'completed' && caseItem.status !== 'archived';
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, caseItem: Case) => {
    if (canDragToCalendar(caseItem)) {
      setIsDragging(true);
      e.dataTransfer.setData('text/plain', caseItem.id);
      e.dataTransfer.effectAllowed = 'move';
      onDragStart(caseItem);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverSection(null);
    setDragOverSubspecialty(null);
    onDragEnd();
  };

  // Handle drag over section
  const handleSectionDragOver = (e: React.DragEvent, section: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSection(section);
    setDragOverSubspecialty(null);
  };

  // Handle drag over subspecialty
  const handleSubspecialtyDragOver = (e: React.DragEvent, section: string, subspecialty: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSection(section);
    setDragOverSubspecialty(subspecialty);
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're leaving the entire section area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverSection(null);
      setDragOverSubspecialty(null);
    }
  };

  // Handle drop on section
  const handleDropOnSectionInternal = async (e: React.DragEvent, section: string, subspecialty?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dragData = e.dataTransfer.getData('text/plain');
    if (dragData) {
      if (dragData.startsWith('schedule:')) {
        // This is a schedule being dragged from calendar - pass the full format
        await onDropOnSection(dragData, section, subspecialty);
      } else {
        // This is a case being dragged from main table
        await onDropOnSection(dragData, section, subspecialty);
      }
    }
    
    setDragOverSection(null);
    setDragOverSubspecialty(null);
  };

  // Helper functions
  const getRowBackgroundColor = (status: CaseStatus) => {
    const colors = getCaseStatusColor(status);
    return `${colors.background} ${colors.hover}`;
  };

  const getSubspecialtyTitle = (subspecialty: string | null) => {
    if (!subspecialty) return 'Unassigned';
    switch (subspecialty) {
      case 'hip_and_knee':
        return 'Hip & Knee';
      case 'foot_and_ankle':
        return 'Foot & Ankle';
      case 'shoulder_and_elbow':
        return 'Shoulder & Elbow';
      case 'hand':
        return 'Hand';
      case 'spine':
        return 'Spine';
      case 'trauma':
        return 'Trauma';
      case 'sports':
        return 'Sports';
      default:
        return subspecialty.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getSubspecialtyColor = (subspecialty: string | null) => {
    if (!subspecialty) return 'bg-gray-100 text-gray-800 border-gray-200';
    switch (subspecialty) {
      case 'hip_and_knee':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'foot_and_ankle':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'shoulder_and_elbow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hand':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'spine':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'trauma':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'sports':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMainSectionTitle = (mainSection: string) => {
    switch (mainSection) {
      case 'new_referral':
        return 'New Referrals';
      case 'awaiting_surgery':
        return 'Awaiting Surgery';
      case 'onward_referral':
        return 'Onward Referrals';
      case 'completed':
        return 'Completed';
      default:
        return mainSection.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getMainSectionColorLocal = (mainSection: string) => {
    return getMainSectionColor(mainSection);
  };

  const getStatusTitle = (status: string) => {
    switch (status) {
      case 'new_referral':
        return 'New Referral';
      case 'awaiting_review':
        return 'Awaiting Review';
      case 'awaiting_surgery':
        return 'Awaiting Surgery';
      case 'on_list':
        return 'On List';
      case 'onward_referrals':
        return 'Onward Referrals';
      case 'completed':
        return 'Completed';
      default:
        return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Event handlers
  const handleEdit = (caseId: string, caseItem: Case) => {
    setEditingCase(caseId);
    setEditingData({
      name: caseItem.name,
      diagnosis: caseItem.diagnosis,
      outcome: caseItem.outcome,
      status: caseItem.status,
      subspecialty: caseItem.subspecialty,
      hospital_number: caseItem.hospital_number,
      referral_date: caseItem.referral_date,
      age: caseItem.age,
      gender: caseItem.gender,
      consultant_id: caseItem.consultant_id,
      patient_history: caseItem.patient_history
    });
  };

  const handleSave = async (caseId: string) => {
    try {
      await onUpdateCase(caseId, editingData);
      setEditingCase(null);
      setEditingData({});
    } catch (error) {
      console.error('Error saving case:', error);
    }
  };

  const handleCancel = () => {
    setEditingCase(null);
    setEditingData({});
  };

  const handleDelete = async (caseId: string) => {
    if (window.confirm('Are you sure you want to delete this case?')) {
      try {
        await onDeleteCase(caseId);
      } catch (error) {
        console.error('Error deleting case:', error);
      }
    }
  };

  const handleComplete = async (caseId: string) => {
    try {
      await onCompleteCase(caseId);
    } catch (error) {
      console.error('Error completing case:', error);
    }
  };

  const handleArchive = async (caseId: string) => {
    try {
      await onArchiveCase(caseId);
    } catch (error) {
      console.error('Error archiving case:', error);
    }
  };

  const handleAddNewCase = () => {
    setIsAddingNew(true);
  };

  const handleSaveNewCase = async () => {
    try {
      await onCreateCase(newCaseData);
      setIsAddingNew(false);
      setNewCaseData({
        name: '',
        diagnosis: '',
        outcome: 'Pending',
        status: 'new_referral',
        subspecialty: null,
        priority: 'medium',
        hospital_number: null,
        referral_date: null,
        age: null,
        gender: null,
        consultant_id: null,
        patient_history: null
      });
    } catch (error) {
      console.error('Error creating new case:', error);
    }
  };

  const handleCancelNewCase = () => {
    setIsAddingNew(false);
    setNewCaseData({
      name: '',
      diagnosis: '',
      outcome: 'Pending',
      status: 'new_referral',
      subspecialty: null,
      priority: 'medium',
      hospital_number: null,
      referral_date: null,
      age: null,
      gender: null,
      consultant_id: null,
      patient_history: null
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnSection = async (e: React.DragEvent, newSection: string, newSubspecialty?: string) => {
    e.preventDefault();
    const caseId = e.dataTransfer.getData('text/plain');
    if (caseId) {
      try {
        await onDropOnSection(caseId, newSection, newSubspecialty);
      } catch (error) {
        console.error('Error dropping case on section:', error);
      }
    }
  };

  const renderEditableCell = (caseItem: Case, field: string, value: string) => {
    if (editingCase === caseItem.id) {
      // Special handling for consultant field
      if (field === 'consultant_id') {
        return (
          <select
            value={editingData.consultant_id || ''}
            onChange={(e) => setEditingData(prev => ({ ...prev, consultant_id: e.target.value || null }))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select Consultant</option>
            {consultants.map(consultant => (
              <option key={consultant.id} value={consultant.id}>
                {consultant.first_name} {consultant.last_name}
              </option>
            ))}
          </select>
        );
      }
      
      return (
        <input
          type="text"
          value={editingData[field as keyof typeof editingData] || ''}
          onChange={(e) => setEditingData(prev => ({ ...prev, [field]: e.target.value }))}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      );
    }
    return <span>{value}</span>;
  };

  const renderNewCaseRow = () => {
    if (!isAddingNew) return null;
    
    return (
      <tr className="bg-blue-50">
        <td className="table-cell"></td>
        <td className="table-cell">
          <input
            type="text"
            value={newCaseData.name || ''}
            onChange={(e) => setNewCaseData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Patient name"
          />
        </td>
        <td className="table-cell">
          <input
            type="text"
            value={newCaseData.hospital_number || ''}
            onChange={(e) => setNewCaseData(prev => ({ ...prev, hospital_number: e.target.value }))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Hospital number"
          />
        </td>
        <td className="table-cell">
          <input
            type="date"
            value={newCaseData.referral_date || ''}
            onChange={(e) => setNewCaseData(prev => ({ ...prev, referral_date: e.target.value }))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </td>
        <td className="table-cell">
          <input
            type="number"
            value={newCaseData.age || ''}
            onChange={(e) => setNewCaseData(prev => ({ ...prev, age: parseInt(e.target.value) || null }))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Age"
          />
        </td>
        <td className="table-cell">
          <select
            value={newCaseData.gender || ''}
            onChange={(e) => setNewCaseData(prev => ({ ...prev, gender: e.target.value }))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </td>
        <td className="table-cell">
          <select
            value={newCaseData.consultant_id || ''}
            onChange={(e) => setNewCaseData(prev => ({ ...prev, consultant_id: e.target.value || null }))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select Consultant</option>
            {consultants.map(consultant => (
              <option key={consultant.id} value={consultant.id}>
                {consultant.first_name} {consultant.last_name}
              </option>
            ))}
          </select>
        </td>
        <td className="table-cell">
          <input
            type="text"
            value={newCaseData.diagnosis || ''}
            onChange={(e) => setNewCaseData(prev => ({ ...prev, diagnosis: e.target.value }))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Diagnosis"
          />
        </td>
        <td className="table-cell">
          <textarea
            value={newCaseData.patient_history || ''}
            onChange={(e) => setNewCaseData(prev => ({ ...prev, patient_history: e.target.value }))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="History"
            rows={2}
          />
        </td>
        <td className="table-cell">
          <input
            type="text"
            value={newCaseData.outcome || 'Pending'}
            onChange={(e) => setNewCaseData(prev => ({ ...prev, outcome: e.target.value }))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Outcome"
          />
        </td>
        <td className="table-cell">
          <div className="flex space-x-2">
            <button
              onClick={handleSaveNewCase}
              className="text-green-600 hover:text-green-900"
              title="Save"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancelNewCase}
              className="text-gray-600 hover:text-gray-900"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto">
      {mainSectionOrder.map(mainSection => {
        const sectionData = groupedCases[mainSection] || {};
        const totalCases = Object.values(sectionData).flat().length;
        
        if (totalCases === 0 && !isAddingNew && mainSection !== 'new_referral' && mainSection !== 'completed' && mainSection !== 'awaiting_surgery') {
          return null;
        }

        return (
          <div key={mainSection} className="mb-3">
            {/* Main Section Header */}
            <div className="px-2 py-1 bg-gray-100 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 
                  className={`inline-flex px-2 py-1 text-xs font-bold rounded border transition-all duration-200 ${
                    dragOverSection === mainSection 
                      ? 'bg-blue-100 text-blue-800 border-blue-400 shadow-lg' 
                      : getMainSectionColorLocal(mainSection)
                  }`}
                  onDragOver={mainSection !== 'completed' ? (e) => handleSectionDragOver(e, mainSection) : undefined}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    e.preventDefault();
                    const caseId = e.dataTransfer.getData('text/plain');
                    if (caseId) {
                      // Determine the correct status based on the section
                      let status = mainSection;
                      let subspecialty = undefined;
                      
                      if (mainSection === 'new_referral') {
                        status = 'new_referral';
                      } else if (mainSection === 'onward_referral') {
                        status = 'onward_referral';
                      } else if (mainSection === 'completed') {
                        status = 'completed';
                      } else if (mainSection === 'awaiting_surgery') {
                        status = 'awaiting_surgery';
                      }
                      
                      handleDropOnSectionInternal(e, status, subspecialty);
                    }
                  }}
                >
                  {getMainSectionTitle(mainSection)} ({totalCases})
                </h3>
                {mainSection === 'new_referral' && (
                  <button
                    onClick={handleAddNewCase}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-1 py-0.5"
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>

            {/* Cases Table */}
            <div className="mb-2">
              <div 
                onDragOver={mainSection !== 'completed' ? handleDragOver : undefined}
                onDrop={mainSection !== 'completed' && mainSection !== 'awaiting_surgery' ? (e) => {
                  // Determine the correct status and subspecialty based on the section
                  let status = mainSection;
                  let subspecialty = undefined;
                  
                  if (mainSection === 'new_referral') {
                    status = 'new_referral';
                  } else if (mainSection === 'onward_referral') {
                    status = 'onward_referral';
                  } else if (mainSection === 'completed') {
                    status = 'completed';
                  }
                  
                  handleDropOnSection(e, status, subspecialty);
                } : mainSection === 'awaiting_surgery' ? (e) => {
                  // For awaiting_surgery section, accept drops from calendar (reset to awaiting_surgery)
                  e.preventDefault();
                  const caseId = e.dataTransfer.getData('text/plain');
                  if (caseId) {
                    handleDropOnSection(e, 'awaiting_surgery');
                  }
                } : undefined}
              >
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header w-4 text-xs px-1 py-1"></th>
                      <th className="table-header text-xs px-1 py-1">Name</th>
                      <th className="table-header text-xs px-1 py-1">Hospital No.</th>
                      <th className="table-header text-xs px-1 py-1">Ref. Date</th>
                      <th className="table-header text-xs px-1 py-1">Age</th>
                      <th className="table-header text-xs px-1 py-1">Gender</th>
                      <th className="table-header text-xs px-1 py-1">Consultant</th>
                      <th className="table-header text-xs px-1 py-1">Diagnosis</th>
                      <th className="table-header text-xs px-1 py-1">History</th>
                      <th className="table-header text-xs px-1 py-1">Outcome</th>
                      <th className="table-header text-xs px-1 py-1">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* New case row - only show in new_referral */}
                    {mainSection === 'new_referral' && renderNewCaseRow()}
                    
                                        {/* Render cases by subspecialty for awaiting_surgery section */}
                    {mainSection === 'awaiting_surgery' ? (
                      allSubspecialties.map(subspecialty => {
                        const casesInSubspecialty = sectionData[subspecialty] || [];
                        
                        return (
                          <React.Fragment key={subspecialty}>
                            {/* Subspecialty header - always visible */}
                            <tr className={`border-t border-gray-200 transition-all duration-200 ${
                              dragOverSubspecialty === subspecialty && dragOverSection === 'awaiting_surgery'
                                ? 'bg-green-50 border-green-300' 
                                : 'bg-gray-50'
                            }`}>
                              <td colSpan={11} className="px-2 py-1">
                                <div 
                                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                                    dragOverSubspecialty === subspecialty && dragOverSection === 'awaiting_surgery'
                                      ? 'bg-green-100 text-green-800 border-green-400 shadow-md' 
                                      : getSubspecialtyColor(subspecialty)
                                  }`}
                                  onDragOver={(e) => handleSubspecialtyDragOver(e, 'awaiting_surgery', subspecialty)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const caseId = e.dataTransfer.getData('text/plain');
                                    if (caseId) {
                                      handleDropOnSectionInternal(e, 'awaiting_surgery', subspecialty);
                                    }
                                  }}
                                >
                                  {getSubspecialtyTitle(subspecialty)} ({casesInSubspecialty.length})
                                </div>
                              </td>
                            </tr>
                            {/* Cases in this subspecialty */}
                            {casesInSubspecialty.length > 0 ? (
                              casesInSubspecialty.map((caseItem) => (
                                <tr 
                                  key={caseItem.id} 
                                  className={`transition-all duration-200 ${
                                    dragOverSubspecialty === subspecialty && dragOverSection === 'awaiting_surgery'
                                      ? 'bg-green-50 border-l-4 border-green-400' 
                                      : getRowBackgroundColor(caseItem.status)
                                  }`}
                                  draggable={canDragToCalendar(caseItem)}
                                  onDragStart={(e) => handleDragStart(e, caseItem)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={(e) => handleSubspecialtyDragOver(e, 'awaiting_surgery', subspecialty)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const caseId = e.dataTransfer.getData('text/plain');
                                    if (caseId) {
                                      handleDropOnSectionInternal(e, 'awaiting_surgery', subspecialty);
                                    }
                                  }}
                                >
                                  <td className="table-cell">
                                    {canDragToCalendar(caseItem) && (
                                      <GripVertical className="h-3 w-3 text-gray-400 cursor-grab" />
                                    )}
                                  </td>
                                  <td className="table-cell">
                                    {renderEditableCell(caseItem, 'name', caseItem.name)}
                                  </td>
                                  <td className="table-cell">
                                    {renderEditableCell(caseItem, 'hospital_number', caseItem.hospital_number || '')}
                                  </td>
                                  <td className="table-cell">
                                    {renderEditableCell(caseItem, 'referral_date', caseItem.referral_date ? new Date(caseItem.referral_date).toLocaleDateString() : '-')}
                                  </td>
                                  <td className="table-cell">
                                    {renderEditableCell(caseItem, 'age', caseItem.age?.toString() || '')}
                                  </td>
                                  <td className="table-cell">
                                    {renderEditableCell(caseItem, 'gender', caseItem.gender || '')}
                                  </td>
                                  <td className="table-cell">
                                    {renderEditableCell(caseItem, 'consultant_id', getConsultantDisplayName(caseItem))}
                                  </td>
                                  <td className="table-cell">
                                    {renderEditableCell(caseItem, 'diagnosis', caseItem.diagnosis)}
                                  </td>
                                  <td className="table-cell">
                                    <div className="max-w-xs truncate" title={caseItem.patient_history || ''}>
                                      {renderEditableCell(caseItem, 'patient_history', caseItem.patient_history || '')}
                                    </div>
                                  </td>
                                  <td className="table-cell">
                                    {renderEditableCell(caseItem, 'outcome', caseItem.outcome)}
                                  </td>
                                  <td className="table-cell">
                                    <div className="flex space-x-2">
                                      {editingCase === caseItem.id ? (
                                        <>
                                          <button
                                            onClick={() => handleSave(caseItem.id)}
                                            className="text-green-600 hover:text-green-900"
                                            title="Save"
                                          >
                                            <Save className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => handleCancel()}
                                            className="text-gray-600 hover:text-gray-900"
                                            title="Cancel"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => handleEdit(caseItem.id, caseItem)}
                                            className="text-blue-600 hover:text-blue-900"
                                            title="Edit"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => onCompleteCase(caseItem.id)}
                                            className="text-green-600 hover:text-green-900"
                                            title="Complete"
                                          >
                                            <CheckCircle className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => onArchiveCase(caseItem.id)}
                                            className="text-gray-600 hover:text-gray-900"
                                            title="Archive"
                                          >
                                            <Archive className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => onDeleteCase(caseItem.id)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Delete"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                                                            /* Empty subspecialty row */
                              <tr className={`transition-all duration-200 ${
                                dragOverSubspecialty === subspecialty && dragOverSection === 'awaiting_surgery'
                                  ? 'bg-green-50 border-l-4 border-green-400' 
                                  : 'bg-gray-25'
                              }`}
                              onDragOver={(e) => handleSubspecialtyDragOver(e, 'awaiting_surgery', subspecialty)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => {
                                e.preventDefault();
                                const caseId = e.dataTransfer.getData('text/plain');
                                if (caseId) {
                                  handleDropOnSectionInternal(e, 'awaiting_surgery', subspecialty);
                                }
                              }}>
                                <td colSpan={11} className="px-4 py-3 text-center text-gray-500 text-xs">
                                  No cases in {getSubspecialtyTitle(subspecialty)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      /* Render cases normally for other sections */
                      Object.values(sectionData).flat().map((caseItem) => (
                        <tr 
                          key={caseItem.id} 
                          className={getRowBackgroundColor(caseItem.status)}
                          draggable={canDragToCalendar(caseItem)}
                          onDragStart={(e) => handleDragStart(e, caseItem)}
                          onDragEnd={handleDragEnd}
                        >
                          <td className="table-cell text-xs py-1">
                            {canDragToCalendar(caseItem) && (
                              <GripVertical className="h-3 w-3 text-gray-400 cursor-grab" />
                            )}
                          </td>
                          <td className="table-cell text-xs py-1">
                            {renderEditableCell(caseItem, 'name', caseItem.name)}
                          </td>
                          <td className="table-cell text-xs py-1">
                            {renderEditableCell(caseItem, 'hospital_number', caseItem.hospital_number || '')}
                          </td>
                          <td className="table-cell text-xs py-1">
                            {renderEditableCell(caseItem, 'referral_date', caseItem.referral_date ? new Date(caseItem.referral_date).toLocaleDateString() : '-')}
                          </td>
                          <td className="table-cell text-xs py-1">
                            {renderEditableCell(caseItem, 'age', caseItem.age?.toString() || '')}
                          </td>
                          <td className="table-cell text-xs py-1">
                            {renderEditableCell(caseItem, 'gender', caseItem.gender || '')}
                          </td>
                          <td className="table-cell text-xs py-1">
                            {renderEditableCell(caseItem, 'consultant_id', getConsultantDisplayName(caseItem))}
                          </td>
                          <td className="table-cell text-xs py-1">
                            {renderEditableCell(caseItem, 'diagnosis', caseItem.diagnosis)}
                          </td>
                          <td className="table-cell text-xs py-1">
                            <div className="max-w-xs truncate" title={caseItem.patient_history || ''}>
                              {renderEditableCell(caseItem, 'patient_history', caseItem.patient_history || '')}
                            </div>
                          </td>
                          <td className="table-cell text-xs py-1">
                            {renderEditableCell(caseItem, 'outcome', caseItem.outcome)}
                          </td>
                          <td className="table-cell text-xs py-1">
                            <div className="flex space-x-2">
                              {editingCase === caseItem.id ? (
                                <>
                                  <button
                                    onClick={() => handleSave(caseItem.id)}
                                    className="text-green-600 hover:text-green-900"
                                    title="Save"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleCancel()}
                                    className="text-gray-600 hover:text-gray-900"
                                    title="Cancel"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(caseItem.id, caseItem)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  {mainSection !== 'completed' && (
                                    <button
                                      onClick={() => handleComplete(caseItem.id)}
                                      className="text-green-600 hover:text-green-900"
                                      title="Complete"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </button>
                                  )}
                                  {mainSection === 'completed' && (
                                    <button
                                      onClick={() => handleArchive(caseItem.id)}
                                      className="text-gray-600 hover:text-gray-900"
                                      title="Archive"
                                    >
                                      <Archive className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDelete(caseItem.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
