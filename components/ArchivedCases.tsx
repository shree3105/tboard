'use client';

import { Case } from '@/lib/types';
import { Trash2 } from 'lucide-react';

interface ArchivedCasesProps {
  cases: Case[];
  onDeleteCase: (caseId: string) => Promise<void>;
  loading?: boolean;
}

export default function ArchivedCases({ cases, onDeleteCase, loading = false }: ArchivedCasesProps) {
  const archivedCases = cases.filter(caseItem => caseItem.archived);

  const handleDelete = async (caseId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this archived case?')) {
      await onDeleteCase(caseId);
    }
  };

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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <div className="text-gray-500">Loading archived cases...</div>
      </div>
    );
  }

  if (archivedCases.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No archived cases found</div>
        <div className="text-gray-400 text-sm mt-2">Archived cases will appear here</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Archived Cases ({archivedCases.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Diagnosis</th>
                <th className="table-header">Outcome</th>
                <th className="table-header">Section</th>
                <th className="table-header">Surgery Date</th>
                <th className="table-header">Archived Date</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {archivedCases.map((caseItem) => (
                <tr key={caseItem.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{caseItem.name}</td>
                  <td className="table-cell">{caseItem.diagnosis}</td>
                  <td className="table-cell">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      caseItem.outcome === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                      caseItem.outcome === 'Completed' ? 'bg-green-100 text-green-800' :
                      caseItem.outcome === 'Cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {caseItem.outcome}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSectionColor(caseItem.section)}`}>
                      {getSectionTitle(caseItem.section)}
                    </span>
                  </td>
                  <td className="table-cell">
                    {caseItem.surgery_date ? new Date(caseItem.surgery_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="table-cell">
                    {caseItem.updated_at ? new Date(caseItem.updated_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="table-cell">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDelete(caseItem.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Permanently Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
