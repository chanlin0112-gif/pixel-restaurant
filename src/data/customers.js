// 顧客外觀：膚色、髮色、上衣、褲子
export const CUSTOMER_LOOKS = [
  { skin: 0xf2c8a0, hair: 0x3b2a20, shirt: 0xd9534f, pants: 0x3d4a6b },
  { skin: 0xe0b08a, hair: 0x1f1a17, shirt: 0x4f8ad9, pants: 0x4a3b30 },
  { skin: 0xf5d6b8, hair: 0xc98a3a, shirt: 0x6aa84f, pants: 0x2f2f2f },
  { skin: 0xc68c62, hair: 0x5a3e2b, shirt: 0xf0c04a, pants: 0x6b4527 },
  { skin: 0xf2c8a0, hair: 0x9a9a9a, shirt: 0x9b6bc9, pants: 0x3d3d55 }
];

// 經營數值（之後想調整難度改這裡就好）
export const ECONOMY = {
  mealPriceMin: 100,        // 每位客人最少付多少
  mealPriceMax: 180,        // 每位客人最多付多少
  eatTimeMin: 6000,         // 用餐時間（毫秒）
  eatTimeMax: 9000,
  payTime: 1200,            // 結帳時間
  walkSpeed: 1.8,           // 每秒走幾格
  spawnBase: 7000,          // 人氣 0 時，多久來一位客人
  spawnMin: 2500,           // 最快多久來一位
  popularityPerCustomer: 1, // 每服務一位增加的人氣
  popularityMax: 100,
  customersPerLevel: 10     // 每服務幾位客人升一級
};
