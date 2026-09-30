export class AppError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function reject(status, code, message) { throw new AppError(status, code, message); }
export function object(value, name = '请求') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) reject(400, 'INVALID_INPUT', `${name}必须是对象`);
  return value;
}
export function keys(value, allowed) {
  object(value);
  if (Object.keys(value).some(key => !allowed.includes(key))) reject(400, 'INVALID_INPUT', '请求包含不支持的字段');
}
export function text(value, name, max, required = false) {
  if (typeof value !== 'string' || value.length > max || /\u0000/.test(value)) reject(400, 'INVALID_INPUT', `${name}格式或长度无效`);
  const result = value.replace(/\r\n?/g, '\n').trim();
  if (required && !result) reject(400, 'INVALID_INPUT', `${name}不能为空`);
  return result;
}
export function identifier(value, name) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) reject(400, 'INVALID_INPUT', `${name}无效`);
  return value;
}
