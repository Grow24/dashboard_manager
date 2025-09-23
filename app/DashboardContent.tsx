import React, { useState, useRef } from 'react';
import HoverCard from './HoverCard'; // Adjust path if HoverCard is in a different file
import { FiMove, FiTrash2, FiEdit, FiScissors, FiMoreVertical } from 'react-icons/fi';

const DashboardContent = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Store size and position for each card
  const [cards, setCards] = useState({
    totalSales: { width: 250, height: 140, top: 0, left: 0 },
    newCustomers: { width: 250, height: 140, top: 0, left: 270 },
    openTickets: { width: 250, height: 140, top: 160, left: 0 },
    pendingOrders: { width: 250, height: 140, top: 160, left: 270 },
  });

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const draggingCard = useRef<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cardStartPos = useRef<{ top: number; left: number }>({ top: 0, left: 0 });

  const handleResize = (key: keyof typeof cards, newWidth: number, newHeight: number) => {
    setCards(prev => ({
      ...prev,
      [key]: { ...prev[key], width: newWidth, height: newHeight },
    }));
  };

  const onMouseDown = (key: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    draggingCard.current = key;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    cardStartPos.current = { top: cards[key].top, left: cards[key].left };
    setSelectedCard(key);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!draggingCard.current) return;

    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    setCards(prev => {
      const card = prev[draggingCard.current!];
      const containerRect = containerRef.current?.getBoundingClientRect();

      if (!containerRect || !card) {
        return prev;
      }

      let newLeft = cardStartPos.current.left + dx;
      let newTop = cardStartPos.current.top + dy;

      // Constrain within container bounds
      newLeft = Math.min(
        Math.max(0, newLeft),
        containerRect.width - card.width
      );
      newTop = Math.min(
        Math.max(0, newTop),
        containerRect.height - card.height
      );

      return {
        ...prev,
        [draggingCard.current!]: {
          ...card,
          left: newLeft,
          top: newTop,
        },
      };
    });
  };

  const onMouseUp = () => {
    draggingCard.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  // Clear selection if click outside cards
  const onContainerClickCapture = (e: React.MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setSelectedCard(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onClickCapture={onContainerClickCapture}
      style={{ userSelect: 'none', position: 'relative', height: '500px' }}
      className="border bg-white"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h2>
        <p className="text-gray-600">Welcome back, User!</p>
      </div>

      <div className="mb-8 max-w-md">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {Object.entries(cards).map(([key, { width, height, top, left }]) => (
        <div
          key={key}
          onMouseDown={onMouseDown(key)}
          style={{
            position: 'absolute',
            top,
            left,
            width,
            height,
            cursor: selectedCard === key ? 'grabbing' : 'grab',
            zIndex: selectedCard === key ? 1000 : 1,
          }}
        >
          <HoverCard
            title={{
              totalSales: 'Total Sales',
              newCustomers: 'New Customers',
              openTickets: 'Open Tickets',
              pendingOrders: 'Pending Orders',
            }[key]}
            value={{
              totalSales: '$25,000',
              newCustomers: '1,200',
              openTickets: '35',
              pendingOrders: '12',
            }[key]}
            width={width}
            height={height}
            onResize={(w, h) => handleResize(key as keyof typeof cards, w, h)}
            selected={selectedCard === key}
            onSelect={() => setSelectedCard(key)}
          />
        </div>
      ))}
    </div>
  );
};

export default DashboardContent;