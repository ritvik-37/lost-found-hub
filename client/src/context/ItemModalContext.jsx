import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { ItemModal } from '../components/items/ItemModal.jsx';

const ItemModalContext = createContext({ openItem: () => {}, closeItem: () => {} });

/**
 * The item detail modal is driven by the URL (?item=<id>), so it works on every page,
 * can be linked to, and the browser/phone Back button closes it.
 */
export function ItemModalProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const itemId = searchParams.get('item');

  const openItem = useCallback(
    (id, { replace = false } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('item', id);
          return next;
        },
        // Opening from a card pushes a history entry; switching to a match inside the modal replaces it.
        { replace, preventScrollReset: true, state: replace ? location.state : { itemModal: true } },
      );
    },
    [setSearchParams, location.state],
  );

  const closeItem = useCallback(() => {
    if (location.state?.itemModal) {
      navigate(-1);
      return;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('item');
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }, [location.state, navigate, setSearchParams]);

  const value = useMemo(() => ({ openItem, closeItem, itemId }), [openItem, closeItem, itemId]);

  return (
    <ItemModalContext value={value}>
      {children}
      {itemId && <ItemModal id={itemId} onClose={closeItem} />}
    </ItemModalContext>
  );
}

export const useItemModal = () => useContext(ItemModalContext);
