'use client';

import { Case, SessionType, TheatreSession } from '@/lib/types';
import { getCaseStatusColor } from '@/lib/colors';

interface SessionSlotProps {
  session: TheatreSession;
  cases: Case[];
  onDrop: (caseId: string, sessionId: string) => void;
  onCompleteCase: (caseId: string) => void;
  onDragBackToMain: (caseId: string) => void;
}

export default function SessionSlot({
  session,
  cases,
  onDrop,
  onCompleteCase,
  onDragBackToMain
}: SessionSlotProps) {
  const getSessionTypeColor = (type: SessionType) => {
    switch (type) {
      case 'morning': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'afternoon': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'evening': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      case 'weekend': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCaseColor = (status: string) => {
    const colors = getCaseStatusColor(status as any);
    return `${colors.background} ${colors.border} ${colors.text}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const caseId = e.dataTransfer.getData('text/plain');
    if (caseId) {
      onDrop(caseId, session.id);
    }
  };

  const handleDragStart = (e: React.DragEvent, caseData: Case) => {
    e.dataTransfer.setData('text/plain', caseData.id);
  };

  // Filter cases for this session (temporary logic - should use case_schedules)
  const sessionCases = cases.filter(c => c.surgery_date === session.session_date);

  return (
    <div 
      className="p-2 rounded border text-xs cursor-pointer hover:bg-gray-50"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`p-1 rounded border ${getSessionTypeColor(session.session_type)}`}>
        <div className="font-medium truncate">
          {session.session_type} - {session.start_time}
        </div>
        <div className="text-xs opacity-75">
          Status: {session.status}
        </div>
      </div>
      
      {/* Cases in this session */}
      {sessionCases.map((caseItem) => (
        <div
          key={caseItem.id}
          draggable={caseItem.status !== 'completed'}
          onDragStart={(e) => handleDragStart(e, caseItem)}
          className={`p-1 rounded border text-xs cursor-move mt-1 ${
            getCaseColor(caseItem.status)
          } ${caseItem.status === 'completed' ? 'cursor-default' : ''}`}
        >
          <div className="font-medium truncate">{caseItem.name}</div>
          <div className="text-xs opacity-75">
            {caseItem.subspecialty?.replace(/_/g, ' ') || 'Unassigned'}
          </div>
          <div className="flex space-x-1 mt-1">
            {caseItem.status !== 'completed' && (
              <>
                <button
                  onClick={() => onCompleteCase(caseItem.id)}
                  className="px-1 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  ✓
                </button>
                {caseItem.status === 'scheduled' && (
                  <button
                    onClick={() => onDragBackToMain(caseItem.id)}
                    className="px-1 py-0.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    title="Move back to main table"
                  >
                    ←
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
