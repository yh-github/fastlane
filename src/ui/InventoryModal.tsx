import type { PlayerState } from '../engine/gameState';

interface InventoryModalProps {
  player: PlayerState;
  onAction?: (payload: any) => void;
  onClose: () => void;
}

export function InventoryModal({ player, onAction, onClose }: InventoryModalProps) {
  const { inventory } = player;

  return (
    <div className="building-modal-overlay" style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
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
            position: 'absolute', top: '10px', right: '10px',
            background: 'none', border: 'none', color: '#aaa', cursor: 'pointer',
            fontSize: '1.2em'
          }}
        >
          ✖
        </button>
        
        <h2 style={{ marginTop: 0, borderBottom: '1px solid #555', paddingBottom: '10px' }}>Your Inventory</h2>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>Food</h3>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Fresh Food: {inventory.freshFoodUnits} units</li>
            <li>Fast Food: {inventory.fastFoodItems.length} meals</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>Clothes</h3>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ marginRight: '10px' }}>Wearing:</label>
            <select 
              value={inventory.selectedClothes || 'none'} 
              onChange={(e) => onAction && onAction({ type: 'change_clothes', clothes: e.target.value })}
              style={{ padding: '4px' }}
            >
              <option value="none">None</option>
              <option value="casual" disabled={inventory.casualClothesWeeks <= 0}>Casual</option>
              <option value="dress" disabled={inventory.dressClothesWeeks <= 0}>Dress</option>
              <option value="business" disabled={inventory.businessClothesWeeks <= 0}>Business</option>
            </select>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Casual Clothes: {inventory.casualClothesWeeks > 0 ? `${inventory.casualClothesWeeks} weeks left` : 'None'}</li>
            <li>Dress Clothes: {inventory.dressClothesWeeks > 0 ? `${inventory.dressClothesWeeks} weeks left` : 'None'}</li>
            <li>Business Suit: {inventory.businessClothesWeeks > 0 ? `${inventory.businessClothesWeeks} weeks left` : 'None'}</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>Appliances</h3>
          {inventory.appliances.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {inventory.appliances.map((a, i) => <li key={`${a.id}-${i}`}>{a.id.replaceAll('_', ' ')}</li>)}
            </ul>
          ) : <p style={{ margin: 0, fontStyle: 'italic', color: '#888' }}>None</p>}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>Books</h3>
          {inventory.books.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {inventory.books.map((b, i) => <li key={`${b}-${i}`}>{b.replaceAll('_', ' ')}</li>)}
            </ul>
          ) : <p style={{ margin: 0, fontStyle: 'italic', color: '#888' }}>None</p>}
        </div>

        <div>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>Entertainment</h3>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Baseball Tickets: {inventory.tickets.baseball}</li>
            <li>Theatre Tickets: {inventory.tickets.theatre}</li>
            <li>Concert Tickets: {inventory.tickets.concert}</li>
            <li>Lottery Tickets: {inventory.lotteryTickets}</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
