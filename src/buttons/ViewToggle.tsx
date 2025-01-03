// ViewToggle.js
import React, { useState } from "react";
import "./ViewToggle.css";

const ViewToggle = () => {
  const [activeView, setActiveView] = useState('list');

  return (
    <div className="view-toggle">
      <button 
        className={`view-button ${activeView === 'list' ? 'active' : ''}`}
        onClick={() => setActiveView('list')}
      >
        <span className="list-icon">☰</span>
        List
      </button>
      <button 
        className={`view-button ${activeView === 'kanban' ? 'active' : ''}`}
        onClick={() => setActiveView('kanban')}
      >
        <span className="kanban-icon">⊞</span>
        Kanban
      </button>
    </div>
  );
};

export default ViewToggle;