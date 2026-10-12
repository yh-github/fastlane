import { useState, useEffect, useRef } from 'react';

export interface UseDraggableModalOptions {
  storagePrefix?: string;
  defaultMargin?: number;
  minWidth?: number;
  minHeight?: number;
}

export function useDraggableModal(options: UseDraggableModalOptions = {}) {
  const {
    storagePrefix = 'fastlane_building_modal',
    defaultMargin = 3,
    minWidth = 420,
    minHeight = 360
  } = options;

  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [customSize, setCustomSize] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [, setIsResizing] = useState(false);
  const [modalMargin, setModalMargin] = useState<number>(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(`${storagePrefix}_margin`) : null;
      if (saved !== null) return parseInt(saved, 10);
    } catch {
      // ignore
    }
    return defaultMargin;
  });
  const [measuredRect, setMeasuredRect] = useState<{ width: number; height: number; left: number; top: number }>({
    width: 728,
    height: 516,
    left: 236,
    top: 160
  });
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Clear any legacy dragged coords from sessionStorage so starting position is always correct
  useEffect(() => {
    try {
      sessionStorage.removeItem(`${storagePrefix}_pos`);
      sessionStorage.removeItem(`${storagePrefix}_size`);
    } catch {}
  }, [storagePrefix]);

  const handleMarginChange = (delta: number) => {
    setPosition(null);
    setCustomSize(null);
    setModalMargin(prev => {
      const next = Math.max(-20, Math.min(50, prev + delta));
      try {
        localStorage.setItem(`${storagePrefix}_margin`, next.toString());
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Measure rect on mount and resize
  useEffect(() => {
    if (!modalRef.current) return;
    const updateRect = () => {
      if (!modalRef.current) return;
      const rect = modalRef.current.getBoundingClientRect();
      const parent = modalRef.current.parentElement;
      const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 };
      setMeasuredRect({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left - parentRect.left),
        top: Math.round(rect.top - parentRect.top)
      });
    };
    updateRect();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateRect);
      observer.observe(modalRef.current);
      window.addEventListener('resize', updateRect);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', updateRect);
      };
    }
  }, [position, customSize, modalMargin]);

  // Handle Dragging
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, textarea, .speech-bubble, [data-no-drag]')) {
      return;
    }
    if (!modalRef.current) return;
    e.preventDefault();
    setIsDragging(true);

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const rect = modalRef.current.getBoundingClientRect();
    const parent = (modalRef.current.offsetParent as HTMLElement) || modalRef.current.parentElement;
    const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const startLeft = rect.left - parentRect.left;
    const startTop = rect.top - parentRect.top;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startPointerX;
      const deltaY = moveEvent.clientY - startPointerY;
      const maxLeft = parentRect.width - rect.width - 10;
      const maxTop = parentRect.height - rect.height - 10;
      const clampedX = Math.max(10, Math.min(maxLeft, startLeft + deltaX));
      const clampedY = Math.max(10, Math.min(maxTop, startTop + deltaY));
      setPosition({ x: Math.round(clampedX), y: Math.round(clampedY) });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Handle Resizing
  const handleResizePointerDown = (e: React.PointerEvent) => {
    if (!modalRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const rect = modalRef.current.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startPointerX;
      const deltaY = moveEvent.clientY - startPointerY;
      const newW = Math.max(minWidth, Math.min(window.innerWidth - 20, startWidth + deltaX));
      const newH = Math.max(minHeight, Math.min(window.innerHeight - 20, startHeight + deltaY));
      setCustomSize({ width: Math.round(newW), height: Math.round(newH) });
    };

    const onPointerUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleResetLayout = () => {
    setPosition(null);
    setCustomSize(null);
    setModalMargin(defaultMargin);
    try {
      sessionStorage.removeItem(`${storagePrefix}_pos`);
      sessionStorage.removeItem(`${storagePrefix}_size`);
      localStorage.setItem(`${storagePrefix}_margin`, defaultMargin.toString());
    } catch {}
  };

  const handleCopyLayoutSpec = () => {
    const spec = `width: ${measuredRect.width}px; height: ${measuredRect.height}px; left: ${measuredRect.left}px; top: ${measuredRect.top}px;`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(spec).then(() => {
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2000);
      });
    }
  };

  return {
    modalRef,
    position,
    customSize,
    isDragging,
    modalMargin,
    measuredRect,
    copiedNotification,
    handleMarginChange,
    handleHeaderPointerDown,
    handleResizePointerDown,
    handleResetLayout,
    handleCopyLayoutSpec
  };
}
