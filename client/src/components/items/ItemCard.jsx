import { Calendar, MapPin } from 'lucide-react';
import { useItemModal } from '../../context/ItemModalContext.jsx';
import { formatDate } from '../../lib/format.js';
import { Badge } from '../ui/Badge.jsx';
import { ItemThumb } from './ItemThumb.jsx';

export function ItemCard({ item }) {
  const { openItem } = useItemModal();
  return (
    <button
      type="button"
      className="card item-card"
      onClick={() => openItem(item.id)}
      aria-label={`${item.title}, ${item.type.toLowerCase()} at ${item.location}, ${formatDate(item.date)}, ${item.status.toLowerCase()}`}
    >
      <ItemThumb item={item}>
        <Badge value={item.type} />
      </ItemThumb>
      <div className="item-body">
        <h3>{item.title}</h3>
        <div className="meta">
          <span>
            <MapPin className="icon" aria-hidden="true" />
            {item.location}
          </span>
          <span>
            <Calendar className="icon" aria-hidden="true" />
            {formatDate(item.date)}
          </span>
        </div>
        <div className="item-foot">
          <span className="muted text-[.82rem]">{item.category}</span>
          <Badge value={item.status} />
        </div>
      </div>
    </button>
  );
}
