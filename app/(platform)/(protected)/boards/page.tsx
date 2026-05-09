"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppAuth } from "@/hooks/auth/useAppAuth";
import BoardsList from "@/components/boards/BoardsList";
import AppHeader from "@/components/layout/AppHeader";
import ToastLayer from "@/components/common/ToastLayer";
import { consumeRedirectToast } from "@/utils/redirectToast";

export default function Home() {
  const { user, logout } = useAppAuth();
  const [isClosedBoardsOpen, setClosedBoardsOpen] = useState(false);
  const [closedBoardsOpenedByKeyboard, setClosedBoardsOpenedByKeyboard] = useState(false);
  const toastIdRef = useRef(0);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    note?: string;
  } | null>(null);

  const showToast = useCallback((message: string, note?: string) => {
    toastIdRef.current += 1;
    setToast({
      id: toastIdRef.current,
      message,
      note,
    });
  }, []);

  useEffect(() => {
    const payload = consumeRedirectToast();
    if (payload) {
      showToast(payload.message, payload.note);
    }
  }, [showToast]);

  return (
    <main className="min-h-screen flex flex-col px-6 sm:px-12 py-4 sm:py-8">
      <div className="flex items-center justify-end gap-[25px] shrink-0">
        <button
          type="button"
          onClick={(e) => {
            const openedByKeyboard = e.detail === 0;
            setClosedBoardsOpenedByKeyboard(openedByKeyboard);
            setClosedBoardsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setClosedBoardsOpenedByKeyboard(true);
            }
          }}
           className="px-4 py-2 rounded-xl focus-ring
          bg-[var(--bg-panel)] text-xs 
          border border-[var(--border-soft)] 
          shadow-sm 
          flex items-center justify-center"
        >
          Closed boards
        </button>
        {user && (
          <AppHeader
            user={{ username: user.username, email: user.email }}
            onLogout={logout}
          />
        )}
      </div>
      <div>
        <BoardsList
          isClosedBoardsOpen={isClosedBoardsOpen}
          onCloseClosedBoards={() => setClosedBoardsOpen(false)}
          returnFocusOnClosedBoardsClose={closedBoardsOpenedByKeyboard}
          onToast={showToast}
        />
      </div>
      {toast && (
        <ToastLayer
          key={toast.id}
          message={toast.message}
          note={toast.note}
          onDismiss={() =>
            setToast((current) => (current?.id === toast.id ? null : current))
          }
        />
      )}
    </main>
  );
}
