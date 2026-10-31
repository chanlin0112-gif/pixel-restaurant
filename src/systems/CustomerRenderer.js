// 畫像素風顧客（腳底在 0,0）
const S = 2;

export function drawCustomer(g, look, frame, front) {
  g.clear();
  // 影子
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 0, 12 * S, 4 * S);
  // 腿（frame 1、3 會抬起一隻腳，看起來像在走路）
  const liftL = frame === 1 ? 1 : 0;
  const liftR = frame === 3 ? 1 : 0;
  g.fillStyle(look.pants, 1);
  g.fillRect(-3 * S, -5 * S, 2 * S, (5 - liftL) * S);
  g.fillRect(1 * S, -5 * S, 2 * S, (5 - liftR) * S);
  // 身體與手
  g.fillStyle(look.shirt, 1);
  g.fillRect(-4 * S, -12 * S, 8 * S, 7 * S);
  g.fillStyle(look.skin, 1);
  g.fillRect(-5 * S, -11 * S, 1 * S, 5 * S);
  g.fillRect(4 * S, -11 * S, 1 * S, 5 * S);
  // 頭
  g.fillRect(-3 * S, -18 * S, 6 * S, 6 * S);
  g.fillStyle(look.hair, 1);
  if (front) {
    g.fillRect(-3 * S, -19 * S, 6 * S, 2 * S);
    g.fillRect(-3 * S, -17 * S, 1 * S, 2 * S);
    g.fillRect(2 * S, -17 * S, 1 * S, 2 * S);
    g.fillStyle(0x2b1d14, 1);
    g.fillRect(-2 * S, -15 * S, 1 * S, 1 * S);
    g.fillRect(1 * S, -15 * S, 1 * S, 1 * S);
  } else {
    g.fillRect(-3 * S, -19 * S, 6 * S, 5 * S);
  }
}
