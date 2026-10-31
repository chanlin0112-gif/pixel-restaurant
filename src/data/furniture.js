// 家具清單：w×h 是佔用的格子數，zones 是可以擺放的區域（K 廚房、C 櫃檯區、. 用餐區）
export const FURNITURE = {
  table: { name: '木頭餐桌', price: 800, w: 1, h: 1, zones: ['.'], icon: '🟫', desc: '顧客用餐的桌子' },
  chair: { name: '木頭椅子', price: 300, w: 1, h: 1, zones: ['.'], icon: '🪑', desc: '顧客的座位，建議放在餐桌旁' },
  counter: { name: '結帳櫃檯', price: 1500, w: 2, h: 1, zones: ['C', '.'], icon: '🧾', desc: '顧客在這裡結帳（佔 2 格）' },
  stove: { name: '瓦斯爐台', price: 2000, w: 1, h: 1, zones: ['K'], icon: '🔥', desc: '煮料理用，只能放在廚房' },
  fridge: { name: '冰箱', price: 1800, w: 1, h: 1, zones: ['K'], icon: '🧊', desc: '存放食材，只能放在廚房' },
  plant: { name: '盆栽', price: 200, w: 1, h: 1, zones: ['.', 'C'], icon: '🪴', desc: '讓餐廳更溫馨' }
};

export const SHOP_ORDER = ['table', 'chair', 'counter', 'stove', 'fridge', 'plant'];

// 拆除時退還的比例
export const REFUND_RATE = 0.5;
