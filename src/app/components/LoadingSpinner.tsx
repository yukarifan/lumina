import React from 'react';

export const LoadingSpinner = () => {
  return (
    <div className="loading-spinner-container">
      <div className="three-body">
        <div className="three-body__dot"></div>
        <div className="three-body__dot"></div>
        <div className="three-body__dot"></div>
      </div>
    </div>
  );
}; 