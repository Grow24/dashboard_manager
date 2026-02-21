import React from 'react';
import { FilterProvider, FilterManagerShell } from './FilterManagerShell';

const TotalSales = () => (
  <FilterProvider>
    <FilterManagerShell />
  </FilterProvider>
);

export default TotalSales;



