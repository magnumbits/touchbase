import React from 'react';

interface ProgressStepsProps {
  step: number;
}

const steps = ['Record Voice', 'Friend Details', 'Trigger Call', 'Results & Calendar'];

export default function ProgressSteps({ step }: ProgressStepsProps) {
  return (
    <div className="flex justify-center gap-2 my-4">
      {steps.map((label, idx) => (
        <div key={label} className={`px-3 py-1 rounded-full text-sm ${idx === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{label}</div>
      ))}
    </div>
  );
}
