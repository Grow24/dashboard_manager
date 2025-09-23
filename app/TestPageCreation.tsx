
import React, { useState, useEffect } from 'react';


const ContextMenu = ({ items, position, onClose }) => {
  if (!position) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        zIndex: 10000,
        minWidth: 160,
        fontSize: 14,
        userSelect: 'none',
      }}
      onContextMenu={e => e.preventDefault()}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{ padding: '6px 12px', cursor: 'pointer' }}
          onClick={() => {
            if (item.onClick) item.onClick();
            onClose();
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
};


const TotalSalesPersonCount = () => {
  
  const [panelValue1755668134987, setPanelValue1755668134987] = useState(null);
useEffect(() => {
  let canceled = false;
  fetch('https://intelligentsalesman.com/ism1/API/panels_value.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableName: 'sales_data',
      columnName: 'name',
      aggregation: 'count',
      distinctOn: '',
      filters: {},
      window: {"partitionBy":["country"],"orderBy":"createdAt"}
    })
  })
    .then(res => res.json())
    .then(json => { if (!canceled && json.success) setPanelValue1755668134987(json.value); })
    .catch(() => { if (!canceled) setPanelValue1755668134987(null); });
  return () => { canceled = true; };
}, []);
const [panelValue1755668202085, setPanelValue1755668202085] = useState("780");

  const [contextMenuPos, setContextMenuPos] = useState(null);
  const [contextMenuItems, setContextMenuItems] = useState([]);
  const [contextMenuTargetData, setContextMenuTargetData] = useState(null);

  const [stackingMode, setStackingMode] = useState('none');
  const [drillAcross, setDrillAcross] = useState(null);
  const [productDrillAcross, setProductDrillAcross] = useState(null);

  const resetViews = () => {
    setStackingMode('none');
    setDrillAcross(null);
    setProductDrillAcross(null);
  };

  const handleBarContextMenu = (data, index, event) => {
    event.preventDefault();
    setContextMenuPos({ x: event.clientX, y: event.clientY });
    const items = [
      {
        label: 'Stack Bar',
        items: [
          { label: 'None', onClick: () => setStackingMode('none') },
          { label: 'Stack', onClick: () => setStackingMode('stack') },
          { label: 'Stack 100%', onClick: () => setStackingMode('stack100') },
        ],
      },
      {
        label: 'Drill Across',
        items: [
          { label: 'None', onClick: () => setDrillAcross(null) },
          { label: 'Product', onClick: () => setDrillAcross('product') },
          { label: 'Customer', onClick: () => setDrillAcross('customer') },
          { label: 'Region', onClick: () => setDrillAcross('region') },
          { label: 'Salesperson', onClick: () => setDrillAcross('salesperson') },
          { label: 'Date', onClick: () => setDrillAcross('date') },
        ],
      },
      {
        label: 'Product Drill Across',
        items: [
          { label: 'None', onClick: () => setProductDrillAcross(null) },
          { label: 'Product Category', onClick: () => setProductDrillAcross('productCategory') },
          { label: 'Product Subcategory', onClick: () => setProductDrillAcross('productSubcategory') },
          { label: 'Product Name', onClick: () => setProductDrillAcross('productName') },
        ],
      },
      {
        label: 'Reset View',
        onClick: resetViews,
      },
    ];
    setContextMenuItems(items);
    setContextMenuTargetData(data);
  };

  const closeContextMenu = () => {
    setContextMenuPos(null);
    setContextMenuItems([]);
    setContextMenuTargetData(null);
  };

  return (
    <div>
      <h1>TotalSalesPersonCount</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12, margin: 8, backgroundColor: '#f9f9f9', width: 280 }}>
  <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>TotalSalesPersonCount</div>
  <div style={{ fontSize: 24, fontWeight: 'bold' }}>
   {panelValue1755668134987 !== null && !isNaN(Number(panelValue1755668134987))
  ? `${Number(panelValue1755668134987).toFixed(0)}`
  : 'Loading...'}
  </div>
  <div style={{ fontSize: 12, color: '#666' }}>TotalSalesPersonCount</div>
</div>
<div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12, margin: 8, backgroundColor: '#f9f9f9', width: 280 }}>
  <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>TotalSalesQuantity</div>
  <div style={{ fontSize: 24, fontWeight: 'bold' }}>
   {panelValue1755668202085 !== null && !isNaN(Number(panelValue1755668202085))
  ? `${Number(panelValue1755668202085).toFixed(0)}`
  : 'Loading...'}
  </div>
  <div style={{ fontSize: 12, color: '#666' }}>TotalSalesQuantity</div>
</div>
      </div>
      <div>
        
      </div>
      {contextMenuPos && contextMenuItems.length > 0 && (
        <ContextMenu items={contextMenuItems} position={contextMenuPos} onClose={closeContextMenu} />
      )}
    </div>
  );
};

export default TotalSalesPersonCount;
