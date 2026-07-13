import type { PlayerState } from '../engine/gameState';
import { useTranslation } from 'react-i18next';

interface InventoryModalProps {
  player: PlayerState;
  onAction?: (payload: any) => void;
  onClose: () => void;
}

export function InventoryModal({ player, onAction, onClose }: InventoryModalProps) {
  const { t } = useTranslation();
  const { inventory } = player;

  return (
    <div className="building-modal-overlay" style={{
      position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 900,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="building-modal-content" style={{
        backgroundColor: '#2c3e50', padding: '20px', borderRadius: '8px',
        width: '400px', maxWidth: '90%', maxHeight: '80%', overflowY: 'auto',
        color: '#fff', border: '2px solid #34495e', position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '10px', insetInlineEnd: '10px',
            background: 'none', border: 'none', color: '#aaa', cursor: 'pointer',
            fontSize: '1.2em'
          }}
        >
          ✖
        </button>
        
        <h2 style={{ marginTop: 0, borderBottom: '1px solid #555', paddingBottom: '10px' }}>{t('inventoryModal.title', 'Your Inventory')}</h2>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>{t('inventoryModal.food', 'Food')}</h3>
          <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
            <li>{t('inventoryModal.freshFood', 'Fresh Food')}: {inventory.freshFoodUnits} {t('inventoryModal.units', 'units')}</li>
            <li>{t('inventoryModal.fastFood', 'Fast Food')}: {inventory.fastFoodItems.length} {t('inventoryModal.meals', 'meals')}</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>{t('inventoryModal.clothes', 'Clothes')}</h3>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ marginInlineEnd: '10px' }}>{t('inventoryModal.wearing', 'Wearing:')}</label>
            <select 
              value={inventory.selectedClothes || 'none'} 
              onChange={(e) => onAction && onAction({ type: 'change_clothes', clothes: e.target.value })}
              style={{ padding: '4px' }}
            >
              <option value="none">{t('inventoryModal.none', 'None')}</option>
              <option value="casual" disabled={inventory.casualClothesWeeks <= 0}>{t('inventoryModal.casual', 'Casual')}</option>
              <option value="dress" disabled={inventory.dressClothesWeeks <= 0}>{t('inventoryModal.dress', 'Dress')}</option>
              <option value="business" disabled={inventory.businessClothesWeeks <= 0}>{t('inventoryModal.business', 'Business')}</option>
            </select>
          </div>
          <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
            <li>{t('inventoryModal.casualClothes', 'Casual Clothes')}: {inventory.casualClothesWeeks > 0 ? t('inventoryModal.weeksLeft', `${inventory.casualClothesWeeks} weeks left`, { count: inventory.casualClothesWeeks }) : t('inventoryModal.none')}</li>
            <li>{t('inventoryModal.dressClothes', 'Dress Clothes')}: {inventory.dressClothesWeeks > 0 ? t('inventoryModal.weeksLeft', `${inventory.dressClothesWeeks} weeks left`, { count: inventory.dressClothesWeeks }) : t('inventoryModal.none')}</li>
            <li>{t('inventoryModal.businessSuit', 'Business Suit')}: {inventory.businessClothesWeeks > 0 ? t('inventoryModal.weeksLeft', `${inventory.businessClothesWeeks} weeks left`, { count: inventory.businessClothesWeeks }) : t('inventoryModal.none')}</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>{t('inventoryModal.appliances', 'Appliances')}</h3>
          {inventory.appliances.length > 0 ? (
            <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
              {inventory.appliances.map((a, i) => <li key={`${a.id}-${i}`}>{t(`item.${a.id}`, { defaultValue: a.id.replaceAll('_', ' ') })}</li>)}
            </ul>
          ) : <p style={{ margin: 0, fontStyle: 'italic', color: '#888' }}>{t('inventoryModal.none')}</p>}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>{t('inventoryModal.books', 'Books')}</h3>
          {inventory.books.length > 0 ? (
            <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
              {inventory.books.map((b, i) => <li key={`${b}-${i}`}>{t(`item.${b}`, { defaultValue: b.replaceAll('_', ' ') })}</li>)}
            </ul>
          ) : <p style={{ margin: 0, fontStyle: 'italic', color: '#888' }}>{t('inventoryModal.none')}</p>}
        </div>

        <div>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>{t('inventoryModal.entertainment', 'Entertainment')}</h3>
          <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
            <li>{t('inventoryModal.baseballTickets', 'Baseball Tickets')}: {inventory.tickets.baseball}</li>
            <li>{t('inventoryModal.theatreTickets', 'Theatre Tickets')}: {inventory.tickets.theatre}</li>
            <li>{t('inventoryModal.concertTickets', 'Concert Tickets')}: {inventory.tickets.concert}</li>
            <li>{t('inventoryModal.lotteryTickets', 'Lottery Tickets')}: {inventory.lotteryTickets}</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
