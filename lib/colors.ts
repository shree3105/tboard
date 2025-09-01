import { CaseStatus } from './types';

// Consistent color scheme for case statuses
export const getCaseStatusColor = (status: CaseStatus) => {
  switch (status) {
    case 'new_referral':
      return {
        background: 'bg-blue-50',
        hover: 'hover:bg-blue-100',
        border: 'border-blue-200',
        text: 'text-blue-800',
        badge: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    case 'awaiting_review':
      return {
        background: 'bg-yellow-50',
        hover: 'hover:bg-yellow-100',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      };
    case 'awaiting_surgery':
      return {
        background: 'bg-orange-50',
        hover: 'hover:bg-orange-100',
        border: 'border-orange-200',
        text: 'text-orange-800',
        badge: 'bg-orange-100 text-orange-800 border-orange-200'
      };
    case 'scheduled':
      return {
        background: 'bg-green-50',
        hover: 'hover:bg-green-100',
        border: 'border-green-200',
        text: 'text-green-800',
        badge: 'bg-green-100 text-green-800 border-green-200'
      };
    case 'in_progress':
      return {
        background: 'bg-purple-50',
        hover: 'hover:bg-purple-100',
        border: 'border-purple-200',
        text: 'text-purple-800',
        badge: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    case 'completed':
      return {
        background: 'bg-gray-50',
        hover: 'hover:bg-gray-100',
        border: 'border-gray-200',
        text: 'text-gray-800',
        badge: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    case 'archived':
      return {
        background: 'bg-gray-25',
        hover: 'hover:bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-600',
        badge: 'bg-gray-100 text-gray-600 border-gray-200'
      };
    case 'onward_referral':
      return {
        background: 'bg-indigo-50',
        hover: 'hover:bg-indigo-100',
        border: 'border-indigo-200',
        text: 'text-indigo-800',
        badge: 'bg-indigo-100 text-indigo-800 border-indigo-200'
      };
    case 'cancelled':
      return {
        background: 'bg-red-50',
        hover: 'hover:bg-red-100',
        border: 'border-red-200',
        text: 'text-red-800',
        badge: 'bg-red-100 text-red-800 border-red-200'
      };
    default:
      return {
        background: 'bg-gray-50',
        hover: 'hover:bg-gray-100',
        border: 'border-gray-200',
        text: 'text-gray-800',
        badge: 'bg-gray-100 text-gray-800 border-gray-200'
      };
  }
};

// Subspecialty colors
export const getSubspecialtyColor = (subspecialty: string | null) => {
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
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Main section colors
export const getMainSectionColor = (mainSection: string) => {
  switch (mainSection) {
    case 'new_referral':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'awaiting_surgery':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'onward_referral':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
