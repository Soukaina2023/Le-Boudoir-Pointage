import { useState, useEffect, useCallback, useRef } from 'react';

interface NotificationItem {
  id: number;
  message: string;
  visible: boolean;
}

let nextId = 0;
let globalShow: ((msg: string) => void) | null = null;

export function showNotification(message: string) {
  globalShow?.(message);
}

export default function NotificationContainer() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const show = useCallback((message: string) => {
    const id = ++nextId;
    setItems((prev) => [...prev, { id, message, visible: false }]);

    const showTimer = setTimeout(() => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, visible: true } : n)));
    }, 50);

    const hideTimer = setTimeout(() => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, visible: false } : n)));
    }, 2500);

    const removeTimer = setTimeout(() => {
      setItems((prev) => prev.filter((n) => n.id !== id));
      timeoutsRef.current.delete(id);
    }, 2900);

    timeoutsRef.current.set(id, showTimer);
    timeoutsRef.current.set(id * 1000, hideTimer);
    timeoutsRef.current.set(id * 1000000, removeTimer);
  }, []);

  useEffect(() => {
    globalShow = show;
    return () => {
      globalShow = null;
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [show]);

  return (
    <>
      {items.map((n) => (
        <div
          key={n.id}
          className={`login-notification${n.visible ? ' visible' : ''}`}
        >
          {n.message}
        </div>
      ))}
    </>
  );
}
