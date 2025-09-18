import React from 'react';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select: React.FC<SelectProps> = (props) => {
  return (
    <select
      {...props}
      className={`
        w-full bg-white text-gray-900 
        border border-gray-300 rounded-md shadow-sm 
        px-3 py-2 text-sm
        focus:outline-none focus:ring-2 focus:ring-[#700d1d] focus:border-[#700d1d]
        transition duration-150 ease-in-out
        ${props.className || ''}
      `}
    >
      {props.children}
    </select>
  );
};

export default Select;
