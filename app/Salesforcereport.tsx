// App.tsx - Example usage
import React, { useRef } from 'react';
import FilterComponent, { FilterRef, FilterConfig } from './FilterComponent';
import FilterManagement from './FilterManagement';

const App: React.FC = () => {
  const filterRef = useRef<FilterRef>(null);

  const sampleConfig: FilterConfig = {
    fields: [
      {
        id: 'search',
        label: 'Search',
        type: 'text',
        placeholder: 'Search...',
      },
      {
        id: 'category',
        label: 'Category',
        type: 'dropdown',
        placeholder: 'Select category',
        options: [
          { label: 'Electronics', value: 'electronics' },
          { label: 'Clothing', value: 'clothing' },
          { label: 'Books', value: 'books' },
        ],
      },
      {
        id: 'date',
        label: 'Date',
        type: 'date',
      },
    ],
    position: 'mainPanel',
    collapsible: true,
    applyMode: 'manual',
  };

  return (
    <div className="p-8">

      
      {/* Filter Management UI */}
      <FilterManagement />
      
      {/* Filter Component Example */}
      <div className="mt-8">
        <FilterComponent
          ref={filterRef}
          config={sampleConfig}
          onApply={(values) => console.log('Applied:', values)}
          onReset={() => console.log('Reset')}
        />
      </div>
    </div>
  );
};

export default App;