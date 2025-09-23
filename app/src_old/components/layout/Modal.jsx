import { forwardRef, useImperativeHandle, useRef } from 'react';
import ReactDOM from 'react-dom';

export const Modal = forwardRef(({ children, onClose }, ref) => {
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => containerRef.current);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={containerRef}
        className="bg-white rounded-lg shadow-lg w-[90vw] h-[90vh] flex flex-col"
      >
        <div className="flex justify-end p-2 border-b">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-xl font-bold"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
});

Modal.displayName = 'Modal';