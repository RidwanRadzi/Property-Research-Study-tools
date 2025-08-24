import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input: React.FC<InputProps> = (props) => {
  return (
    <input
      {...props}
      className={`
        w-full bg-white text-gray-900 placeholder-gray-400 
        border border-gray-300 rounded-md shadow-sm 
        px-3 py-2 text-sm
        focus:outline-none focus:ring-2 focus:ring-[#700d1d] focus:border-[#700d1d]
        transition duration-150 ease-in-out
        ${props.className || ''}
      `}
    />
  );
};

export default Input;