import React from 'react';
import './Loader.css';

interface LoaderProps {
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className="homi-loader-container">
      <div className="homi-spinner"></div>
      {text && <div className="homi-loader-text">{text}</div>}
    </div>
  );
};

export default Loader;
