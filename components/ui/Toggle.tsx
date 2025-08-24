
import React from 'react';

interface ToggleProps {
  labelLeft: string;
  labelRight: string;
  value: string;
  onChange: (newValue: string) => void;
  optionLeft: string;
  optionRight: string;
}

const Toggle: React.FC<ToggleProps> = ({ labelLeft, labelRight, value, onChange, optionLeft, optionRight }) => {
  const isLeft = value === optionLeft;

  return (
    <div className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg" onClick={() => onChange(isLeft ? optionRight : optionLeft)}>
      <span className={`font-semibold text-sm transition-colors ${isLeft ? 'text-[#700d1d]' : 'text-gray-500 hover:text-black'}`}>{labelLeft}</span>
      <div className="relative w-12 h-6 flex items-center bg-gray-200 rounded-full p-1 transition-colors">
        <div
          className={`
            absolute bg-white w-4 h-4 rounded-full shadow-md transform transition-transform
            ${isLeft ? 'translate-x-0' : 'translate-x-6'}
          `}
        />
      </div>
      <span className={`font-semibold text-sm transition-colors ${!isLeft ? 'text-[#700d1d]' : 'text-gray-500 hover:text-black'}`}>{labelRight}</span>
    </div>
  );
};

export default Toggle;