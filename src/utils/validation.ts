// Quy tắc kiểm tra dữ liệu nhập dùng chung (Sign Up, Profile). Tách ra để kiểm thử đơn vị.

export const MIN_PASSWORD_LENGTH = 6;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Số điện thoại: có thể có dấu + ở đầu, 8–15 chữ số
export const PHONE_PATTERN = /^\+?[0-9]{8,15}$/;

export const isValidPhone = (phone: string) => PHONE_PATTERN.test(phone);

export type SignUpField = 'name' | 'email' | 'password' | 'confirmPassword';
export type SignUpValues = Record<SignUpField, string>;

// Trả về lỗi theo từng ô; object rỗng nghĩa là dữ liệu hợp lệ
export const validateSignUp = (values: SignUpValues): Partial<Record<SignUpField, string>> => {
  const errors: Partial<Record<SignUpField, string>> = {};
  if (values.name.trim() === '') {
    errors.name = 'Please enter your name.';
  }
  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Please enter a valid email.';
  }
  if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
};
