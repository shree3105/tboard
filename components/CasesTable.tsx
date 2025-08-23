'use client';

import { useState } from 'react';
import { Case } from '@/lib/types';
import { Edit, Trash2, Save, X, GripVertical, CheckCircle, Archive } from 'lucide-react';

interface CasesTableProps {
  cases: Case[];
  onUpdateCase: (caseId: string, updates: Partial<Case>) => Promise<void>;
  onDeleteCase: (caseId: string) => Promise<void>;
  onCompleteCase: (caseId: string) => Promise<void>;
  onArchiveCase: (caseId: string) => Promise<void>;
  onDragStart: (caseItem: Case) => void;
  onDragEnd: () => void;
  onDropOnSection: (caseId: string, newSection: string) => Promise<void>;
}

export default function CasesTable({ 
  cases, 
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
    section?: string;
  }>({});
  const [newCaseData, setNewCaseData] = useState<Partial<Case>>({
    name: '',
    diagnosis: '',
    outcome: 'Pending',
    section: 'new_referral'
  });
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Filter cases for table display and map sections
  const tableCases = cases.filter(caseItem => {
    // Don't show archived cases in the main table
    if (caseItem.archived) {
      return false;
    }
    // Show all cases except those that are on_list with surgery dates (they go to calendar)
    if (caseItem.section === 'on_list' && caseItem.surgery_date) {
      return false;
    }
    return true;
  }).map(caseItem => {
    // Map on_list cases without surgery dates to awaiting_surgery for display
    if (caseItem.section === 'on_list' && !caseItem.surgery_date) {
      return { ...caseItem, section: 'awaiting_surgery' };
    }
    return caseItem;
  });

  // Group cases by section and sort them
  const groupedCases = tableCases.reduce((acc, caseItem) => {
    if (!acc[caseItem.section]) {
      acc[caseItem.section] = [];
    }
    acc[caseItem.section].push(caseItem);
    return acc;
  }, {} as Record<string, Case[]>);

  // Sort cases within each section by order_index
  Object.keys(groupedCases).forEach(section => {
    groupedCases[section].sort((a, b) => a.order_index - b.order_index);
  });

  // Define section order for table
  const sectionOrder = ['new_referral', 'awaiting_surgery', 'completed'];

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'new_referral':
        return 'New Referrals';
      case 'awaiting_surgery':
        return 'Awaiting Surgery';
      case 'completed':
        return 'Completed';
      default:
        return section.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getSectionColor = (section: string) => {
    switch (section) {
      case 'new_referral':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'awaiting_surgery':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleEdit = (caseId: string, caseItem: Case) => {
    setEditingCase(caseId);
    setEditingData({
      name: caseItem.name,
      diagnosis: caseItem.diagnosis,
      outcome: caseItem.outcome,
      section: caseItem.section
    });
  };

  const handleSave = async (caseId: string) => {
    await onUpdateCase(caseId, editingData);
    setEditingCase(null);
    setEditingData({});
  };

  const handleCancel = () => {
    setEditingCase(null);
    setEditingData({});
  };

  const handleDelete = async (caseId: string) => {
    if (window.confirm('Are you sure you want to delete this case?')) {
      await onDeleteCase(caseId);
    }
  };

  const handleComplete = async (caseId: string) => {
    await onCompleteCase(caseId);
  };

  const handleArchive = async (caseId: string) => {
    await onArchiveCase(caseId);
  };

  const handleAddNewCase = () => {
    setIsAddingNew(true);
    setNewCaseData({
      name: '',
      diagnosis: '',
      outcome: 'Pending',
      section: 'new_referral'
    });
  };

  const handleSaveNewCase = async () => {
    if (newCaseData.name && newCaseData.diagnosis) {
      // Create a new case with the current data
      const createData = {
        name: newCaseData.name,
        diagnosis: newCaseData.diagnosis,
        outcome: newCaseData.outcome || 'Pending',
        section: 'new_referral',
        order_index: cases.filter(c => c.section === 'new_referral').length + 1,
        surgery_date: undefined
      };
      
      // Call the parent's create function
      await onUpdateCase('new', createData);
      setIsAddingNew(false);
      setNewCaseData({
        name: '',
        diagnosis: '',
        outcome: 'Pending',
        section: 'new_referral'
      });
    }
  };

  const handleCancelNewCase = () => {
    setIsAddingNew(false);
    setNewCaseData({
      name: '',
      diagnosis: '',
      outcome: 'Pending',
      section: 'new_referral'
    });
  };

  const handleDragStart = (e: React.DragEvent, caseItem: Case) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', caseItem.id);
    onDragStart(caseItem);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    onDragEnd();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnSection = (e: React.DragEvent, section: string) => {
    e.preventDefault();
    const caseId = e.dataTransfer.getData('text/plain');
    if (caseId && section !== 'completed') {
      onDropOnSection(caseId, section);
    }
  };

  const renderEditableCell = (caseItem: Case, field: keyof Case, value: string) => {
    const isEditing = editingCase === caseItem.id;
    const isCompleted = caseItem.section === 'completed';

    if (!isEditing || isCompleted) {
      return <span className="font-medium">{value}</span>;
    }

    if (field === 'outcome') {
      return (
        <input
          type="text"
          value={editingData.outcome || value}
          onChange={(e) => setEditingData({ ...editingData, outcome: e.target.value })}
          className="input-field text-sm"
        />
      );
    }

    if (field === 'section') {
      return (
        <select
          value={editingData.section || value}
          onChange={(e) => setEditingData({ ...editingData, section: e.target.value })}
          className="input-field text-sm"
        >
          <option value="new_referral">New Referrals</option>
          <option value="awaiting_surgery">Awaiting Surgery</option>
        </select>
      );
    }

    if (field === 'name' || field === 'diagnosis') {
      return (
        <input
          type="text"
          value={editingData[field] || value}
          onChange={(e) => setEditingData({ ...editingData, [field]: e.target.value })}
          className="input-field text-sm"
        />
      );
    }

    return <span className="font-medium">{value}</span>;
  };

  const renderNewCaseRow = () => {
    if (!isAddingNew) return null;

    return (
      <tr className="bg-blue-50 border-2 border-blue-200">
        <td className="table-cell">
          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
        </td>
        <td className="table-cell">
          <input
            type="text"
            value={newCaseData.name || ''}
            onChange={(e) => setNewCaseData({ ...newCaseData, name: e.target.value })}
            className="input-field text-sm"
            placeholder="Patient name"
          />
        </td>
        <td className="table-cell">
          <input
            type="text"
            value={newCaseData.diagnosis || ''}
            onChange={(e) => setNewCaseData({ ...newCaseData, diagnosis: e.target.value })}
            className="input-field text-sm"
            placeholder="Diagnosis"
          />
        </td>
        <td className="table-cell">
          <input
            type="text"
            value={newCaseData.outcome || 'Pending'}
            onChange={(e) => setNewCaseData({ ...newCaseData, outcome: e.target.value })}
            className="input-field text-sm"
            placeholder="Outcome"
          />
        </td>

        <td className="table-cell">-</td>
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
      {sectionOrder.map(section => {
        const sectionCases = groupedCases[section] || [];
        // Always show new_referral section, hide others if empty and not adding new
        if (sectionCases.length === 0 && !isAddingNew && section !== 'new_referral') return null;

        return (
          <div key={section} className="mb-6">
            {/* Section Header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getSectionColor(section)}`}>
                  {getSectionTitle(section)} ({sectionCases.length})
                </h3>
                {section === 'new_referral' && (
                  <button
                    onClick={handleAddNewCase}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add Case
                  </button>
                )}
              </div>
            </div>

            {/* Section Table */}
            <div 
              onDragOver={section !== 'completed' ? handleDragOver : undefined}
              onDrop={section !== 'completed' ? (e) => handleDropOnSection(e, section) : undefined}
            >
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header w-8"></th>
                    <th className="table-header">Name</th>
                    <th className="table-header">Diagnosis</th>
                    <th className="table-header">Outcome</th>
                    <th className="table-header">Surgery Date</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* New case row */}
                  {section === 'new_referral' && renderNewCaseRow()}
                  
                  {sectionCases.map((caseItem) => (
                    <tr 
                      key={caseItem.id} 
                      className="hover:bg-gray-50"
                      draggable={section !== 'completed'}
                      onDragStart={(e) => handleDragStart(e, caseItem)}
                      onDragEnd={handleDragEnd}
                    >
                      <td className="table-cell">
                        {section !== 'completed' && (
                          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                        )}
                      </td>
                      <td className="table-cell">
                        {renderEditableCell(caseItem, 'name', caseItem.name)}
                      </td>
                      <td className="table-cell">
                        {renderEditableCell(caseItem, 'diagnosis', caseItem.diagnosis)}
                      </td>
                      <td className="table-cell">
                        {renderEditableCell(caseItem, 'outcome', caseItem.outcome)}
                      </td>

                      <td className="table-cell">
                        {caseItem.surgery_date ? new Date(caseItem.surgery_date).toLocaleDateString() : '-'}
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
                                onClick={handleCancel}
                                className="text-gray-600 hover:text-gray-900"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              {section !== 'completed' && (
                                <button
                                  onClick={() => handleEdit(caseItem.id, caseItem)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                              {section !== 'completed' && (
                                <button
                                  onClick={() => handleComplete(caseItem.id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Complete"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              {section === 'completed' && (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
