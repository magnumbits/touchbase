import React from 'react';

interface CallStatusProps {
  status: 'pending' | 'calling' | 'completed' | 'failed';
}

export default function CallStatus({ status }: CallStatusProps) {
  const statusMap = {
    pending: 'Pending...',
    calling: 'Calling...',
    completed: 'Call Completed!',
    failed: 'Call Failed',
  };

  return (
    <div className="text-center my-4">
      <span className="text-lg font-semibold">{statusMap[status]}</span>
    </div>
  );
}
