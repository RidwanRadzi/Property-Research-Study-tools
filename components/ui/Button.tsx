import React, { ReactNode } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'danger';
  size?: 'sm' | 'md';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className, ...props }) => {
  const baseClasses = `
    inline-flex items-center justify-center font-semibold rounded-md 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white
    transition ease-in-out duration-150 disabled:opacity-50
  `;

  const variantClasses = {
    primary: 'bg-[#700d1d] text-white hover:bg-[#5a0a17] focus:ring-[#700d1d]',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500',
  };

  const sizeClasses = {
      md: 'px-4 py-2 text-sm',
      sm: 'px-2 py-1 text-xs'
  }

  return (
    <button
      {...props}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
    >
      {children}
    </button>
  );
};

export default Button;